import { existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import express, { type RequestHandler } from 'express';

export function frontendMiddleware(directory: string): RequestHandler {
  const root = resolve(directory);
  const index = resolve(root, 'index.html');
  if (!existsSync(index))
    throw new Error(
      'Build do frontend indisponível. Execute o build antes de iniciar.',
    );
  const serve = express.static(root, {
    index: false,
    redirect: false,
    dotfiles: 'ignore',
    setHeaders: (response, path) => {
      response.setHeader(
        'Cache-Control',
        path.includes(`${root}/assets/`) || path.includes(`${root}\\assets\\`)
          ? 'public, max-age=31536000, immutable'
          : 'no-cache',
      );
    },
  });
  return (request, response, next) => {
    if (request.path === '/api' || request.path.startsWith('/api/'))
      return next();
    if (!['GET', 'HEAD'].includes(request.method)) return next();
    serve(request, response, (error?: unknown) => {
      if (error) return next(error);
      // Missing assets must remain 404; only HTML navigation gets the SPA shell.
      if (
        request.path.startsWith('/assets/') ||
        extname(request.path) ||
        request.path.split('/').some((part) => part.startsWith('.')) ||
        !request.accepts('html')
      )
        return next();
      response.setHeader('Cache-Control', 'no-cache');
      response.sendFile(index, (sendError) => {
        if (sendError) next(sendError);
      });
    });
  };
}
