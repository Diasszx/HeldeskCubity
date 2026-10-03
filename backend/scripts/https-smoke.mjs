import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import https from 'node:https';
import { URL } from 'node:url';

assert.equal(
  process.env.COMPOSE_SMOKE,
  'validation',
  'Set COMPOSE_SMOKE=validation explicitly',
);
const ca = readFileSync(
  new URL('../../.docker/validation-tls/fullchain.pem', import.meta.url),
);
const origin = 'https://127.0.0.1:8444';
let cookie;
async function request(path, { body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      `${origin}${path}`,
      {
        ca,
        method: body ? 'POST' : 'GET',
        headers: {
          Origin: origin,
          ...(cookie ? { Cookie: cookie } : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
        timeout: 15000,
      },
      (response) => {
        let data = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () =>
          resolve({
            status: response.statusCode,
            headers: response.headers,
            data,
          }),
        );
      },
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('HTTPS request timed out')));
    req.end(body ? JSON.stringify(body) : undefined);
  });
}
assert.equal((await request('/api/health')).status, 200);
assert.equal((await request('/requests')).status, 200);
const csrf = await request('/api/auth/csrf');
assert.equal(csrf.status, 200);
const setCookie = csrf.headers['set-cookie'].find((value) =>
  value.startsWith('cubity.sid='),
);
assert.match(setCookie, /; Secure/);
assert.match(setCookie, /; HttpOnly/);
assert.match(setCookie, /; SameSite=Lax/);
assert.match(setCookie, /; Path=\/api/);
cookie = setCookie.split(';')[0];
const { csrfToken } = JSON.parse(csrf.data);
const body = { username: 'invalid.validation', password: 'invalid-validation' };
assert.equal(
  (
    await request('/api/auth/login', {
      body,
      headers: { 'X-CSRF-Token': csrfToken },
    })
  ).status,
  401,
);
assert.equal(
  (
    await request('/api/auth/login', {
      body,
      headers: { 'X-CSRF-Token': csrfToken, Origin: 'https://invalid.test' },
    })
  ).status,
  403,
);
console.log(
  'HTTPS smoke passou: certificado verificado, proxy confiável, cookie Secure/HttpOnly/SameSite e origem/CSRF.',
);
