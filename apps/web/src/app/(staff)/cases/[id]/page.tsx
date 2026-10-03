import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';
import { caseIdSchema, externalActionTypes, type ExternalActionType } from '@haven/shared';

import { SimulationNote } from '@/components/haven/simulation-note';
import { StaffHeader } from '@/components/haven/staff-header';
import { OfficialPanel } from '@/components/official/official-panel';
import { CaseBadges } from '@/components/operator/case-badges';
import { EvidenceList } from '@/components/report/evidence-list';
import { getEnumLabels } from '@/i18n/labels';
import { getOfficialCase } from '@/lib/official';
import { getPrincipal } from '@/lib/session';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('cases'))('caseTitle') };
}

const isActionType = (value: unknown): value is ExternalActionType =>
  (externalActionTypes as readonly unknown[]).includes(value);

export default async function OfficialCasePage({ params }: PageProps<'/cases/[id]'>) {
  const { id } = await params;
  if (!caseIdSchema.safeParse(id).success) notFound();
  const [detail, principal, t, tq, ts, tr, labels, format] = await Promise.all([
    getOfficialCase(id),
    getPrincipal(),
    getTranslations('cases'),
    getTranslations('queue'),
    getTranslations('staff'),
    getTranslations('routing'),
    getEnumLabels(),
    getFormatter(),
  ]);
  if (!detail) notFound();

  const when = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: 'medium', timeStyle: 'short' });
  const { fields } = detail;
  const yesNo = (value: boolean) => (value ? tq('yes') : tq('no'));
  const external = detail.actions.filter((a) => a.type === 'official.external_action');

  return (
    <div className="staff-page">
      <Link
        href="/cases"
        className="inline-flex items-center gap-1 self-start text-sm text-primary hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t('backToCases')}
      </Link>
      <StaffHeader title={tq('caseHeading', { reference: detail.reference })} />
      <CaseBadges summary={detail} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <section className="staff-panel flex flex-col gap-3" aria-labelledby="case-report">
            <h2 id="case-report" className="font-semibold">
              {tq('report')}
            </h2>
            <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-muted-foreground">{ts('reference')}</dt>
              <dd className="resident-reference">{detail.reference}</dd>
              <dt className="text-muted-foreground">{ts('category')}</dt>
              <dd>{labels.category[fields.category]}</dd>
              <dt className="text-muted-foreground">{ts('severity')}</dt>
              <dd>{fields.severity ? labels.severity[fields.severity] : tq('unrated')}</dd>
              <dt className="text-muted-foreground">{tq('weapon')}</dt>
              <dd>{yesNo(fields.weaponOrImmediateThreat)}</dd>
              <dt className="text-muted-foreground">{tq('repeat')}</dt>
              <dd>{yesNo(fields.isRepeatIncident)}</dd>
              <dt className="text-muted-foreground">{tq('eventTime')}</dt>
              <dd>{fields.eventTime ? when(fields.eventTime) : '—'}</dd>
              <dt className="text-muted-foreground">{ts('district')}</dt>
              <dd>{fields.zoneId ? labels.district[fields.zoneId] : '—'}</dd>
              <dt className="text-muted-foreground">{tq('place')}</dt>
              <dd>{fields.locationLabel || '—'}</dd>
              <dt className="text-muted-foreground">{tq('description')}</dt>
              <dd className="whitespace-pre-line">{fields.description || '—'}</dd>
              <dt className="text-muted-foreground">{ts('filed')}</dt>
              <dd>{when(detail.submittedAt)}</dd>
              <dt className="text-muted-foreground">{t('assignedTo')}</dt>
              <dd>{detail.assignedOfficial?.name ?? t('unassigned')}</dd>
            </dl>
          </section>

          <section className="staff-panel flex flex-col gap-3" aria-labelledby="case-evidence">
            <h2 id="case-evidence" className="font-semibold">
              {t('linkedEvidence')}
            </h2>
            {detail.evidence.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tq('noEvidence')}</p>
            ) : (
              <EvidenceList items={detail.evidence} />
            )}
          </section>

          <section className="staff-panel flex flex-col gap-3" aria-labelledby="case-routing">
            <h2 id="case-routing" className="font-semibold">
              {tq('routing')}
            </h2>
            <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-muted-foreground">{tq('routingRule')}</dt>
              <dd>
                {detail.routing.ruleId} ({detail.routing.rulesetVersion})
              </dd>
              <dt className="text-muted-foreground">{tq('routedTo')}</dt>
              <dd>{labels.organization[detail.routing.responder]}</dd>
              <dt className="text-muted-foreground">{ts('priority')}</dt>
              <dd>{labels.queuePriority[detail.routing.queue]}</dd>
            </dl>
            {detail.routing.autoDispatch ? <p className="text-sm">{tr('autoDispatch')}</p> : null}
            {detail.routing.emergency ? (
              <p className="text-sm font-semibold text-destructive">{tr('call112')}</p>
            ) : null}
            <SimulationNote />
          </section>
        </div>

        <div className="flex flex-col gap-4">
          {detail.state === 'cancelled' ? (
            <section className="staff-panel" aria-labelledby="work-title">
              <h2 id="work-title" className="font-semibold">
                {t('workTitle')}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{t('cancelledNote')}</p>
            </section>
          ) : detail.state === 'closed' ? (
            <section className="staff-panel flex flex-col gap-2" aria-labelledby="work-title">
              <h2 id="work-title" className="font-semibold">
                {t('workTitle')}
              </h2>
              <p className="text-sm text-muted-foreground">{t('closedNote')}</p>
              {detail.closureComment ? (
                <p className="text-sm">
                  <span className="font-medium">{t('closeComment')}:</span>{' '}
                  {detail.closureComment}
                </p>
              ) : null}
            </section>
          ) : (
            <OfficialPanel
              caseId={detail.id}
              version={detail.version}
              claimedByMe={detail.assignedOfficial?.id === principal?.id}
            />
          )}

          <section className="staff-panel flex flex-col gap-3" aria-labelledby="case-actions">
            <h2 id="case-actions" className="font-semibold">
              {t('recordedTitle')}
            </h2>
            {external.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noRecorded')}</p>
            ) : (
              <ol className="flex flex-col gap-3 text-sm">
                {external.map((action) => (
                  <li key={action.id} className="flex flex-col gap-0.5">
                    <p className="font-medium">
                      {isActionType(action.payload.type)
                        ? t(`actionTypes.${action.payload.type}`)
                        : t('actionTypes.other')}
                      {' · '}
                      {action.actorName}
                    </p>
                    {typeof action.payload.note === 'string' ? (
                      <p className="whitespace-pre-line">{action.payload.note}</p>
                    ) : null}
                    <time dateTime={action.createdAt} className="text-muted-foreground">
                      {when(action.createdAt)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
            <SimulationNote>{t('externalNote')}</SimulationNote>
          </section>
        </div>
      </div>
    </div>
  );
}
