import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';
import { afterAll, describe, expect, it } from 'vitest';
import type { AppConfig } from '../config/env.js';
import { EvidenceStorage, HashingStream } from './evidence.storage.js';

const ABC_SHA256 = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

describe('HashingStream', () => {
  it('hashes and counts chunks as they pass through', async () => {
    const hasher = new HashingStream();
    const seen: Buffer[] = [];
    await pipeline(
      Readable.from([Buffer.from('a'), Buffer.from('bc')]),
      hasher,
      new Writable({
        write(chunk: Buffer, _encoding, callback) {
          seen.push(chunk);
          callback();
        },
      }),
    );
    expect(hasher.digest()).toBe(ABC_SHA256);
    expect(hasher.byteSize).toBe(3);
    expect(Buffer.concat(seen).toString()).toBe('abc');
  });
});

describe('EvidenceStorage', () => {
  const dirs: string[] = [];
  afterAll(() => Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true }))));

  it('writes, measures, reads ranges and removes files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'haven-evidence-'));
    dirs.push(dir);
    const storage = new EvidenceStorage({ EVIDENCE_DIR: join(dir, 'nested') } as AppConfig);

    expect(await storage.write('one', Readable.from([Buffer.from('abc')]))).toEqual({
      byteSize: 3,
      sha256: ABC_SHA256,
    });
    expect(await readFile(storage.pathFor('one'), 'utf8')).toBe('abc');
    expect(await storage.size('one')).toBe(3);

    const chunks: Buffer[] = [];
    for await (const chunk of storage.read('one', { start: 1, end: 2 })) chunks.push(chunk);
    expect(Buffer.concat(chunks).toString()).toBe('bc');

    await storage.remove('one');
    expect(await storage.size('one')).toBeNull();
  });
});
