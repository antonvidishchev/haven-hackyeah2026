import { describe, expect, it } from 'vitest';
import { loadMigrations, migrate, type Migration, type QueryFn } from './migrations.js';

function fakeDb(applied: { name: string; checksum: string }[] | null) {
  const executed: string[] = [];
  const query = (async (sql: string) => {
    executed.push(sql);
    if (sql === 'INFO FOR DB') return [{ tables: applied ? { schema_migration: '' } : {} }];
    if (sql.startsWith('SELECT name, checksum')) return [applied ?? []];
    return [];
  }) as QueryFn;
  return { query, executed };
}

const m = (name: string, checksum = name): Migration => ({ name, sql: `-- ${name}`, checksum });

describe('migrate', () => {
  it('applies every migration on an empty database, in order, inside transactions', async () => {
    const db = fakeDb(null);
    const applied = await migrate(db.query, [m('0001_init'), m('0002_identity')]);
    expect(applied).toEqual(['0001_init', '0002_identity']);
    const writes = db.executed.filter((s) => s.startsWith('BEGIN TRANSACTION'));
    expect(writes).toHaveLength(2);
    expect(writes[0]).toContain('-- 0001_init');
    expect(writes[0]).toContain('COMMIT TRANSACTION');
  });

  it('skips migrations that are already recorded', async () => {
    const db = fakeDb([{ name: '0001_init', checksum: '0001_init' }]);
    expect(await migrate(db.query, [m('0001_init'), m('0002_identity')])).toEqual([
      '0002_identity',
    ]);
  });

  it('refuses to run when an applied migration was edited', async () => {
    const db = fakeDb([{ name: '0001_init', checksum: 'old' }]);
    await expect(migrate(db.query, [m('0001_init', 'new')])).rejects.toThrow(/checksum mismatch/);
  });
});

describe('loadMigrations', () => {
  it('loads the repository migrations sorted with sha256 checksums', async () => {
    const migrations = await loadMigrations();
    expect(migrations[0]?.name).toBe('0001_init');
    expect(migrations.map((x) => x.name)).toEqual([...migrations.map((x) => x.name)].sort());
    for (const x of migrations) expect(x.checksum).toMatch(/^[0-9a-f]{64}$/);
  });
});
