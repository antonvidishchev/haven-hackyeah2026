import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { reportCategories } from '@haven/shared';

import { describedBy, Field } from '@/components/haven/field';
import { ReportStages } from '@/components/haven/report-stages';
import { SimulationNote } from '@/components/haven/simulation-note';
import { getEnumLabels } from '@/i18n/labels';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('reportNew'))('title') };
}

export default async function NewReportPage() {
  const [t, ts, tc, labels] = await Promise.all([
    getTranslations('reportNew'),
    getTranslations('stages'),
    getTranslations('common'),
    getEnumLabels(),
  ]);
  const what = { hint: t('whatHint') };
  const category = { hint: t('categoryHint') };
  return (
    <div className="resident-page">
      <ReportStages
        label={ts('label')}
        steps={[ts('describe'), ts('place'), ts('review')]}
        current={0}
      />
      <div className="flex flex-col gap-2">
        <h1>{t('title')}</h1>
        <p className="text-muted-foreground">{t('lead')}</p>
      </div>
      <form className="flex flex-col gap-6">
        <Field id="what" label={t('whatLabel')} hint={what.hint}>
          <textarea id="what" name="what" rows={6} aria-describedby={describedBy('what', what)} />
        </Field>
        <Field id="category" label={t('categoryLabel')} hint={category.hint}>
          <select
            id="category"
            name="category"
            defaultValue="unclassified"
            aria-describedby={describedBy('category', category)}
          >
            {reportCategories.map((value) => (
              <option key={value} value={value}>
                {labels.category[value]}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex flex-col gap-3">
          <button type="button" className="resident-button" disabled aria-describedby="save-note">
            {t('save')}
          </button>
          <SimulationNote>
            <span id="save-note">{tc('comingSoon')}</span>
          </SimulationNote>
        </div>
      </form>
    </div>
  );
}
