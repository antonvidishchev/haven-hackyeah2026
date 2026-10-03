/** Position after the last item of a page: newest first, by creation time then id. */
export type ReportCursor = { createdAt: string; id: string };

const ID = /^[a-z0-9]{1,40}$/;

/** Opaque to clients: base64url of `createdAt|id`. `createdAt` keeps SurrealDB's ns precision. */
export function encodeCursor(cursor: ReportCursor): string {
  return Buffer.from(`${cursor.createdAt}|${cursor.id}`, 'utf8').toString('base64url');
}

/** Returns null for anything that isn't a cursor we issued. */
export function decodeCursor(value: string): ReportCursor | null {
  const decoded = Buffer.from(value, 'base64url').toString('utf8');
  const separator = decoded.lastIndexOf('|');
  if (separator < 0) return null;
  const createdAt = decoded.slice(0, separator);
  const id = decoded.slice(separator + 1);
  if (!ID.test(id) || Number.isNaN(Date.parse(createdAt))) return null;
  return { createdAt, id };
}
