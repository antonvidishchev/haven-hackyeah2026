import { describe, expect, it } from 'vitest';
import type { Role } from './enums.js';
import {
  canAccessPath,
  defaultLandingPath,
  isSafeReturnPath,
  pathAccess,
} from './navigation-access.js';

describe('canAccessPath', () => {
  const cases: [Role | null, string, boolean][] = [
    [null, '/', true],
    [null, '/area-reports', true],
    [null, '/report/new', true],
    ['guest', '/my-reports', true],
    ['resident', '/report/abc', true],
    ['operator', '/report/new', false],
    [null, '/queue', false],
    ['resident', '/queue', false],
    ['operator', '/queue/123', true],
    ['admin', '/vault', true],
    ['official', '/queue', false],
    ['official', '/cases/1', true],
    ['operator', '/cases', false],
    ['operator', '/admin/audit', false],
    ['admin', '/admin/audit', true],
    ['resident', '/queueing', true],
  ];
  it.each(cases)('%s → %s = %s', (role, path, expected) => {
    expect(canAccessPath(role, path)).toBe(expected);
  });

  it('ignores the query string when matching', () => {
    expect(pathAccess('/queue?x=1')).toMatchObject({ kind: 'staff', requirement: 'operator' });
  });
});

describe('defaultLandingPath', () => {
  it('sends staff to their workspace and everyone else home', () => {
    expect(defaultLandingPath('operator')).toBe('/queue');
    expect(defaultLandingPath('admin')).toBe('/queue');
    expect(defaultLandingPath('official')).toBe('/cases');
    expect(defaultLandingPath('resident')).toBe('/');
    expect(defaultLandingPath('guest')).toBe('/');
    expect(defaultLandingPath(null)).toBe('/');
  });
});

describe('isSafeReturnPath', () => {
  it.each(['/', '/queue', '/report/abc?step=2', '/my-reports#top'])('accepts %s', (path) => {
    expect(isSafeReturnPath(path)).toBe(true);
  });

  it.each([
    '',
    'queue',
    '//evil.example',
    '/\\evil.example',
    'https://evil.example',
    'javascript:alert(1)',
    '/\tevil',
    '/login?next=/queue',
    undefined,
    42,
  ])('rejects %s', (path) => {
    expect(isSafeReturnPath(path)).toBe(false);
  });
});
