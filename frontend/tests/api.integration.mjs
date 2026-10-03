import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import pg from '../../backend/node_modules/pg/lib/index.js'
import { testDatabaseUrl } from '../../backend/test/support/test-database.ts'
import { createApiServices } from '../src/services/api-services.ts'
import { createHttpClient } from '../src/services/http-client.ts'
import { createSessionServices } from '../src/services/session-services.ts'

const backend = fileURLToPath(new URL('../../backend/', import.meta.url))

test(
  'frontend services integrate with NestJS, PostgreSQL, session cookies and CSRF',
  { timeout: 120_000 },
  async () => {
    // The shared backend guard rejects development/production databases before any write.
    const databaseUrl = testDatabaseUrl()
    const probe = createServer()
    await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve))
    const port = probe.address().port
    await new Promise((resolve) => probe.close(resolve))
    const origin = `http://127.0.0.1:${port}`
    const env = {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: databaseUrl,
      SESSION_SECRET: randomBytes(32).toString('hex'),
      APP_ORIGIN: origin,
      PORT: String(port),
      HOST: '127.0.0.1',
      TRUSTED_PROXY_IPS: '',
      SEED_DEMO: 'true',
    }
    for (const args of [
      ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
      ['dist/prisma/seed.js'],
    ]) {
      const prepared = spawnSync(process.execPath, args, {
        cwd: backend,
        env,
        stdio: 'pipe',
        timeout: 45_000,
      })
      assert.equal(prepared.status, 0, 'Test database preparation must succeed')
    }
    const server = spawn(process.execPath, ['dist/main.js'], {
      cwd: backend,
      env,
      stdio: 'ignore',
    })
    const pool = new pg.Pool({ connectionString: databaseUrl })
    const createdIds = []
    const clients = []
    function browserSession() {
      let cookie = ''
      const services = createApiServices(
        createHttpClient({
          fetch: async (path, init) => {
            const response = await fetch(`${origin}${path}`, {
              ...init,
              headers: {
                ...init.headers,
                Origin: origin,
                ...(cookie ? { Cookie: cookie } : {}),
              },
            })
            for (const header of response.headers.getSetCookie())
              cookie = header.split(';')[0]
            return response
          },
        }),
      )
      const client = { services, cookie: () => cookie }
      clients.push(client)
      return client
    }
    try {
      let ready = false
      for (let attempt = 0; attempt < 100; attempt++) {
        try {
          ready = (await fetch(`${origin}/api/health`)).ok
        } catch {
          /* Server is starting. */
        }
        if (ready) break
        if (server.exitCode !== null)
          assert.fail('Test API exited before becoming ready')
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      assert.equal(ready, true, 'Test API must become ready')
      const ana = browserSession()
      const bruno = browserSession()
      assert.equal(await ana.services.users.current(), null)
      await assert.rejects(
        ana.services.auth.login({ username: 'ana.demo', password: 'wrong' }),
        { code: 'UNAUTHENTICATED' },
      )
      const user = await ana.services.auth.login({
        username: 'ana.demo',
        password: 'demo123',
      })
      assert.equal((await ana.services.users.current()).id, user.id)
      assert.ok((await ana.services.users.list()).length >= 2)
      const categories = await ana.services.categories.list()
      const before = await ana.services.dashboard.indicators()
      const title = `Integração ${randomBytes(6).toString('hex')} % & _`
      const request = await ana.services.requests.create({
        title,
        description: 'Teste frontend e backend',
        categoryId: categories[0].id,
      })
      createdIds.push(request.id)
      assert.equal(request.requesterId, user.id)
      assert.equal(request.status, 'OPEN')
      assert.match(request.code, /^SOL-\d+$/)
      const updated = await ana.services.requests.update(request.id, {
        title,
        description: 'Descrição editada',
        categoryId: categories[1].id,
      })
      assert.equal(updated.description, 'Descrição editada')
      assert.equal(updated.createdAt, request.createdAt)
      const day = request.createdAt.slice(0, 10)
      const filtered = await ana.services.requests.list({
        title: title.toUpperCase(),
        categoryId: categories[1].id,
        status: 'OPEN',
        startDate: day,
        endDate: day,
      })
      assert.deepEqual(
        filtered.map(({ id }) => id),
        [request.id],
      )
      const counts = await ana.services.dashboard.indicators()
      assert.equal(counts.total, before.total + 1)
      assert.equal(counts.open, before.open + 1)
      assert.equal(
        counts.total,
        counts.open + counts.inProgress + counts.completed,
      )
      await bruno.services.auth.login({
        username: 'bruno.demo',
        password: 'demo123',
      })
      await assert.rejects(
        bruno.services.requests.update(request.id, {
          title,
          description: 'Não permitido',
          categoryId: categories[0].id,
        }),
        { code: 'FORBIDDEN' },
      )
      await assert.rejects(bruno.services.requests.remove(request.id), {
        code: 'FORBIDDEN',
      })
      await assert.rejects(
        bruno.services.requests.changeStatus(request.id, 'COMPLETED'),
        { code: 'CONFLICT' },
      )
      await bruno.services.requests.changeStatus(request.id, 'IN_PROGRESS')
      await assert.rejects(
        ana.services.requests.update(request.id, {
          title,
          description: 'Não permitido',
          categoryId: categories[0].id,
        }),
        { code: 'CONFLICT' },
      )
      await bruno.services.requests.changeStatus(request.id, 'COMPLETED')
      assert.equal(
        (await ana.services.requests.get(request.id)).status,
        'COMPLETED',
      )
      const removable = await ana.services.requests.create({
        title: 'Excluir integração',
        description: 'Aberto do próprio usuário',
        categoryId: categories[0].id,
      })
      createdIds.push(removable.id)
      await ana.services.requests.remove(removable.id)
      await assert.rejects(ana.services.requests.get(removable.id), {
        code: 'NOT_FOUND',
      })
      const oldCookie = ana.cookie()
      await ana.services.auth.logout()
      assert.equal(await ana.services.users.current(), null)
      assert.equal(
        (
          await fetch(`${origin}/api/auth/me`, {
            headers: { Cookie: oldCookie },
          })
        ).status,
        401,
      )
      const adapter = createSessionServices(ana.services)
      let expired = false
      adapter.subscribe(() => {
        expired = true
      })
      await assert.rejects(adapter.services.dashboard.indicators(), {
        code: 'UNAUTHENTICATED',
      })
      assert.equal(expired, true)
      // Login after logout obtains a fresh anonymous-session nonce and succeeds.
      await ana.services.auth.login({
        username: 'ana.demo',
        password: 'demo123',
      })
      assert.equal((await ana.services.users.current()).id, user.id)
    } finally {
      try {
        for (const { services } of clients)
          await services.auth.logout().catch(() => {})
        if (createdIds.length)
          await pool.query('DELETE FROM "Request" WHERE id = ANY($1::uuid[])', [
            createdIds,
          ])
      } finally {
        await pool.end()
        server.kill()
        if (server.exitCode === null)
          await new Promise((resolve) => server.once('exit', resolve))
      }
    }
  },
)
