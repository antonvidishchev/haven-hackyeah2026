import { Injectable } from '@nestjs/common';
import type { DistrictId, ReportCategory, Severity, SupportResource } from '@haven/shared';
import { SurrealService } from '../db/surreal.service.js';

type ResourceRow = {
  slug: string;
  kind: SupportResource['kind'];
  name_en: string;
  name_pl: string;
  description_en: string;
  description_pl: string;
  categories: ReportCategory[];
  districts: DistrictId[];
  languages: string[];
  severities: Severity[];
  keywords_en: string[];
  keywords_pl: string[];
  contact: string;
  available_hours: SupportResource['availableHours'];
};

@Injectable()
export class SupportRepository {
  constructor(private readonly surreal: SurrealService) {}

  /** The description's terms through the same analyzer as the resource indexes. */
  async analyze(text: string): Promise<string[]> {
    if (!text.trim()) return [];
    const [terms] = await this.surreal.query<[string[]]>(
      `RETURN search::analyze('haven_text', $text)`,
      { text },
    );
    return terms;
  }

  async listResources(): Promise<SupportResource[]> {
    const [rows] = await this.surreal.query<[ResourceRow[]]>(
      'SELECT * OMIT id FROM support_resource ORDER BY slug',
    );
    return rows.map((row) => ({
      slug: row.slug,
      kind: row.kind,
      name: { en: row.name_en, pl: row.name_pl },
      description: { en: row.description_en, pl: row.description_pl },
      categories: row.categories,
      districts: row.districts,
      languages: row.languages,
      severities: row.severities,
      keywords: { en: row.keywords_en, pl: row.keywords_pl },
      contact: row.contact,
      availableHours: row.available_hours,
    }));
  }
}
