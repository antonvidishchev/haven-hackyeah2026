import type { Role } from './enums.js';

/** Which signed-in roles a staff area admits, and which requirement to show when it doesn't. */
export type AccessRequirement = 'operator' | 'official' | 'admin';

export type PathAccess =
  | { kind: 'public' }
  /** Resident reporting: anonymous visitors become guests on first use. Staff are not residents. */
  | { kind: 'resident' }
  | { kind: 'staff'; roles: readonly Role[]; requirement: AccessRequirement };

const staffAreas: { prefix: string; roles: readonly Role[]; requirement: AccessRequirement }[] = [
  { prefix: '/queue', roles: ['operator', 'admin'], requirement: 'operator' },
  { prefix: '/vault', roles: ['operator', 'admin'], requirement: 'operator' },
  { prefix: '/cases', roles: ['official'], requirement: 'official' },
  { prefix: '/admin', roles: ['admin'], requirement: 'admin' },
];

const residentAreas = ['/report', '/my-reports'];

const underPrefix = (path: string, prefix: string) =>
  path === prefix || path.startsWith(`${prefix}/`);

function pathnameOf(path: string): string {
  const end = path.search(/[?#]/);
  return end === -1 ? path : path.slice(0, end);
}

export function pathAccess(path: string): PathAccess {
  const pathname = pathnameOf(path);
  const staff = staffAreas.find((a) => underPrefix(pathname, a.prefix));
  if (staff) return { kind: 'staff', roles: staff.roles, requirement: staff.requirement };
  if (residentAreas.some((prefix) => underPrefix(pathname, prefix))) return { kind: 'resident' };
  return { kind: 'public' };
}

/** `role` is null for an anonymous visitor (no session, no guest token yet). */
export function canAccessPath(role: Role | null, path: string): boolean {
  const access = pathAccess(path);
  switch (access.kind) {
    case 'public':
      return true;
    case 'resident':
      return role === null || role === 'guest' || role === 'resident';
    case 'staff':
      return role !== null && access.roles.includes(role);
  }
}

export function defaultLandingPath(role: Role | null): string {
  switch (role) {
    case 'operator':
    case 'admin':
      return '/queue';
    case 'official':
      return '/cases';
    default:
      return '/';
  }
}

/**
 * True for same-origin relative paths that are safe to redirect to after sign-in:
 * a single leading slash, no scheme or authority, no backslashes or control characters.
 */
export function isSafeReturnPath(path: unknown): path is string {
  if (typeof path !== 'string' || path.length === 0 || path.length > 512) return false;
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  // Backslashes are normalised to slashes by browsers ("/\evil.com"); control chars hide tricks.
  if (path.includes('\\') || [...path].some((c) => c.charCodeAt(0) < 0x20 || c === '\u007f')) {
    return false;
  }
  try {
    const base = 'http://haven.invalid';
    const url = new URL(path, base);
    return url.origin === base && !pathnameOf(path).startsWith('/login');
  } catch {
    return false;
  }
}
