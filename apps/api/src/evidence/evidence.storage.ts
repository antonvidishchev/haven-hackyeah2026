import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Transform, type Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/env.js';

/** A pass-through stream that hashes and counts what flows through it. */
export class HashingStream extends Transform {
  private readonly hash = createHash('sha256');
  byteSize = 0;

  override _transform(chunk: Buffer, _encoding: BufferEncoding, callback: () => void) {
    this.hash.update(chunk);
    this.byteSize += chunk.length;
    this.push(chunk);
    callback();
  }

  /** Hex SHA-256 of everything seen. Call once, after the stream has finished. */
  digest(): string {
    return this.hash.digest('hex');
  }
}

/**
 * Evidence bytes on local disk. Files are named by evidence id only, never by anything the
 * client sent.
 */
@Injectable()
export class EvidenceStorage {
  private readonly dir: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.dir = resolve(config.EVIDENCE_DIR);
  }

  pathFor(storagePath: string): string {
    return resolve(this.dir, storagePath);
  }

  /** Writes the stream to `storagePath`, returning its size and SHA-256. */
  async write(
    storagePath: string,
    source: Readable,
  ): Promise<{ byteSize: number; sha256: string }> {
    await mkdir(this.dir, { recursive: true });
    const hasher = new HashingStream();
    await pipeline(source, hasher, createWriteStream(this.pathFor(storagePath), { flags: 'wx' }));
    return { byteSize: hasher.byteSize, sha256: hasher.digest() };
  }

  async remove(storagePath: string): Promise<void> {
    await rm(this.pathFor(storagePath), { force: true });
  }

  /** File size on disk, or null when the file is missing. */
  async size(storagePath: string): Promise<number | null> {
    try {
      return (await stat(this.pathFor(storagePath))).size;
    } catch {
      return null;
    }
  }

  read(storagePath: string, range?: { start: number; end: number }): Readable {
    return createReadStream(this.pathFor(storagePath), range);
  }
}
