import { Injectable } from '@nestjs/common';
import {
  organizationIdSchema,
  roleSchema,
  type OrganizationId,
  type Role,
  type SessionPrincipal,
} from '@haven/shared';
import { RecordId } from 'surrealdb';
import { SurrealService } from '../db/surreal.service.js';

type PrincipalRow = {
  id: RecordId<'principal'>;
  kind: Role;
  username?: string;
  password_hash?: string;
  display_name: string;
  organization_id?: OrganizationId;
};

export type StoredPrincipal = SessionPrincipal & { passwordHash?: string };

export const principalRecord = (id: string) => new RecordId('principal', id);

function toPrincipal(row: PrincipalRow): StoredPrincipal {
  const organizationId = organizationIdSchema.safeParse(row.organization_id);
  return {
    id: String(row.id.id),
    role: roleSchema.parse(row.kind),
    name: row.display_name,
    ...(organizationId.success ? { organizationId: organizationId.data } : {}),
    ...(row.password_hash ? { passwordHash: row.password_hash } : {}),
  };
}

@Injectable()
export class PrincipalRepository {
  constructor(private readonly surreal: SurrealService) {}

  async findByUsername(username: string): Promise<StoredPrincipal | null> {
    const [rows] = await this.surreal.query<[PrincipalRow[]]>(
      'SELECT * FROM principal WHERE username = $username LIMIT 1',
      { username },
    );
    const row = rows[0];
    return row ? toPrincipal(row) : null;
  }

  async findById(id: string): Promise<StoredPrincipal | null> {
    const [rows] = await this.surreal.query<[PrincipalRow[]]>('SELECT * FROM $id', {
      id: principalRecord(id),
    });
    const row = rows[0];
    return row ? toPrincipal(row) : null;
  }

  async createGuest(): Promise<StoredPrincipal> {
    const [rows] = await this.surreal.query<[PrincipalRow[]]>(
      "CREATE principal SET kind = 'guest', display_name = 'Guest'",
    );
    const row = rows[0];
    if (!row) throw new Error('Guest principal was not created');
    return toPrincipal(row);
  }
}
