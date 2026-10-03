import {
  Injectable,
  InternalServerErrorException,
  ForbiddenException,
  Logger,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import type { Request, Response, RequestHandler, CookieOptions } from 'express';

@Injectable()
export class SessionRuntime implements OnModuleDestroy {
  private readonly logger = new Logger(SessionRuntime.name);
  private readonly pool: Pool;
  readonly store: connectPgSimple.PGStore;
  readonly cookieName = 'cubity.sid';
  readonly cookieOptions: CookieOptions;
  private readonly handler: RequestHandler;

  constructor(config: ConfigService) {
    this.pool = new Pool({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
      connectionTimeoutMillis: 5000,
    });
    this.pool.on('error', () =>
      this.logger.error('Falha na conexão do armazenamento de sessões.'),
    );
    const Store = connectPgSimple(session);
    this.store = new Store({
      pool: this.pool,
      tableName: 'session',
      createTableIfMissing: false,
      ttl: config.getOrThrow<number>('SESSION_TTL_SECONDS'),
      pruneSessionInterval: 60,
      errorLog: () => this.logger.error('Falha no armazenamento de sessões.'),
    });
    this.cookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.getOrThrow<string>('NODE_ENV') === 'production',
      path: '/api',
    };
    this.handler = session({
      name: this.cookieName,
      store: this.store,
      secret: config.getOrThrow<string>('SESSION_SECRET'),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        ...this.cookieOptions,
        maxAge: config.getOrThrow<number>('SESSION_TTL_SECONDS') * 1000,
      },
    });
  }

  readonly middleware: RequestHandler = (request, response, next) => {
    if (/^\/api\/(health|docs(?:-json)?)(\/|$)/.test(request.originalUrl))
      return next();
    response.setHeader('Cache-Control', 'no-store');
    if (this.cookieOptions.secure && !request.secure)
      return next(new ForbiddenException());
    this.handler(request, response, (error?: unknown) => {
      if (error) {
        this.clearCookie(response);
        return next(new InternalServerErrorException());
      }
      next();
    });
  };

  private callback(operation: (done: (error?: unknown) => void) => void) {
    return new Promise<void>((resolve, reject) =>
      operation((error) =>
        error ? reject(new InternalServerErrorException()) : resolve(),
      ),
    );
  }
  regenerate(request: Request) {
    return this.callback((done) => request.session.regenerate(done));
  }
  save(request: Request) {
    return this.callback((done) => request.session.save(done));
  }
  destroy(request: Request) {
    return this.callback((done) => request.session.destroy(done));
  }
  refresh(request: Request) {
    request.session.touch();
    return this.callback((done) =>
      this.store.touch(request.sessionID, request.session, done),
    );
  }
  clearCookie(response: Response) {
    response.clearCookie(this.cookieName, this.cookieOptions);
  }
  async onModuleDestroy() {
    await this.store.close();
    await this.pool.end();
  }
}
