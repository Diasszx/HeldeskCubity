// Prisma Migrate's schema engine accepts require, not pg's verify-full mode.
// Always retain certificate verification when translating a cloud URL.
export function renderMigrationUrl(connection: string) {
  const url = new URL(connection);
  url.searchParams.set('sslmode', 'require');
  url.searchParams.set('sslaccept', 'strict');
  return url.href;
}
