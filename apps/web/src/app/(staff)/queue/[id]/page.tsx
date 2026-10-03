import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { caseIdSchema, isTerminal, type CaseActionType } from '@haven/shared';

import { SimulationNote } from '@/components/haven/simulation-note';
import { StaffHeader } from '@/components/haven/staff-header';
import { CaseBadges } from '@/components/operator/case-badges';
import { DecisionPanel } from '@/components/operator/decision-panel';
import { EvidenceList } from '@/components/report/evidence-list';
import { getEnumLabels } from '@/i18n/labels';
import { getOperatorCase } from '@/lib/operator';

const actionKey = {
  'operator.promote': 'operator_promote',
  'operator.cancel': 'operator_cancel',
  'operator.reply': 'operator_reply',
  'official.claim': 'official_claim',
  'official.external_action': 'official_external_action',
  'official.close': 'official_close',
} as const satisfies Record<CaseActionType, string>;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('queue'))('caseTitle') };
}

export default async function QueueCasePage({ params }: PageProps<'/queue/[id]'>) {
  const { id } = await params;
  if (!caseIdSchema.safeParse(id).success) notFound();
  const [detail, t, ts, tr, tm, td, labels, format] = await Promise.all([
    getOperatorCase(id),
    getTranslations('queue'),
    getTranslations('staff'),
    getTranslations('routing'),
    getTranslations('messages'),
    getTranslations('decision'),
    getEnumLabels(),
    getFormatter(),
  ]);
  if (!detail) notFound();

  const when = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: 'medium', timeStyle: 'short' });
  const { fields, recommendation } = detail;
  const yesNo = (value: boolean) => (value ? t('yes') : t('no'));

  return (
    <div className="staff-page">
      <Link
        href="/queue"
        className="inline-flex items-center gap-1 self-start text-sm text-primary hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {td('backToQueue')}
      </Link>
      <StaffHeader title={t('caseHeading', { reference: detail.reference })} />
      <CaseBadges summary={detail} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <section className="staff-panel flex flex-col gap-3" aria-labelledby="case-report">
            <h2 id="case-report" className="font-semibold">
              {t('report')}
            </h2>
            <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-muted-foreground">{ts('reference')}</dt>
              <dd className="resident-reference">{detail.reference}</dd>
              <dt className="text-muted-foreground">{ts('category')}</dt>
              <dd>{labels.category[fields.category]}</dd>
              <dt className="text-muted-foreground">{ts('severity')}</dt>
              <dd>{fields.severity ? labels.severity[fields.severity] : t('unrated')}</dd>
              <dt className="text-muted-foreground">{t('weapon')}</dt>
              <dd>{yesNo(fields.weaponOrImmediateThreat)}</dd>
              <dt className="text-muted-foreground">{t('repeat')}</dt>
              <dd>{yesNo(fields.isRepeatIncident)}</dd>
              <dt className="text-muted-foreground">{t('eventTime')}</dt>
              <dd>{fields.eventTime ? when(fields.eventTime) : '—'}</dd>
              <dt className="text-muted-foreground">{ts('district')}</dt>
              <dd>{fields.zoneId ? labels.district[fields.zoneId] : '—'}</dd>
              <dt className="text-muted-foreground">{t('place')}</dt>
              <dd>{fields.locationLabel || '—'}</dd>
              <dt className="text-muted-foreground">{t('description')}</dt>
              <dd className="whitespace-pre-line">{fields.description || '—'}</dd>
              <dt className="text-muted-foreground">{ts('organisation')}</dt>
              <dd>{labels.organization[detail.organizationId]}</dd>
              <dt className="text-muted-foreground">{ts('triage')}</dt>
              <dd>{labels.triageStatus[detail.triageStatus]}</dd>
              <dt className="text-muted-foreground">{ts('filed')}</dt>
              <dd>{when(detail.submittedAt)}</dd>
              <dt className="text-muted-foreground">{t('revision')}</dt>
              <dd className="tabular-nums">{detail.revision}</dd>
              {detail.cancelReasonCategory ? (
                <>
                  <dt className="text-muted-foreground">{td('cancelReason')}</dt>
                  <dd>
                    {td(`cancelReasons.${detail.cancelReasonCategory}`)}
                    {detail.cancelComment ? ` — ${detail.cancelComment}` : null}
                  </dd>
                </>
              ) : null}
            </dl>
          </section>

          <section className="staff-panel flex flex-col gap-3" aria-labelledby="case-evidence">
            <h2 id="case-evidence" className="font-semibold">
              {t('evidence')}
            </h2>
            {detail.evidence.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noEvidence')}</p>
            ) : (
              <EvidenceList items={detail.evidence} />
            )}
          </section>

          <section className="staff-panel flex flex-col gap-3" aria-labelledby="case-revisions">
            <h2 id="case-revisions" className="font-semibold">
              {t('revisions')}
            </h2>
            <ol className="flex flex-col gap-1 text-sm">
              {detail.revisions.map((revision) => (
                <li key={revision.revision} className="flex flex-wrap gap-x-3">
                  <span className="tabular-nums">#{revision.revision}</span>
                  <span>{t(`revisionNote.${revision.note}`)}</span>
                  <time dateTime={revision.createdAt} className="text-muted-foreground">
                    {when(revision.createdAt)}
                  </time>
                </li>
              ))}
            </ol>
          </section>

          <section className="staff-panel flex flex-col gap-3" aria-labelledby="case-routing">
            <h2 id="case-routing" className="font-semibold">
              {t('routing')}
            </h2>
            <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-muted-foreground">{t('routingRule')}</dt>
              <dd>
                {detail.routing.ruleId} ({detail.routing.rulesetVersion})
              </dd>
              <dt className="text-muted-foreground">{t('routedTo')}</dt>
              <dd>{labels.organization[detail.routing.responder]}</dd>
              <dt className="text-muted-foreground">{t('currentDestination')}</dt>
              <dd className="font-medium">{labels.organization[detail.organizationId]}</dd>
              <dt className="text-muted-foreground">{ts('priority')}</dt>
              <dd>{labels.queuePriority[detail.routing.queue]}</dd>
            </dl>
            {detail.routing.autoDispatch ? <p className="text-sm">{tr('autoDispatch')}</p> : null}
            {detail.routing.confirmationRequired ? (
              <p className="text-sm">{tr('confirmationRequired')}</p>
            ) : null}
            <SimulationNote />
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section className="staff-panel flex flex-col gap-2" aria-labelledby="case-advisory">
            <h2 id="case-advisory" className="flex items-center gap-2 font-semibold">
              <Sparkles aria-hidden className="size-4 text-primary" />
              {t('advisory')}
            </h2>
            <p className="text-xs text-muted-foreground">{t('advisorySource')}</p>
            {recommendation?.status === 'suggested' ? (
              <>
                <p className="text-sm font-medium">
                  {t(`recommendation.${recommendation.action}`)}
                </p>
                <p className="text-sm text-muted-foreground">{recommendation.rationale}</p>
              </>
            ) : (
              <p className="text-sm">{t('noSuggestion')}</p>
            )}
            <p className="text-xs text-muted-foreground">{t('advisoryBody')}</p>
          </section>

          {isTerminal(detail.state) ? (
            <section className="staff-panel" aria-labelledby="decision-title">
              <h2 id="decision-title" className="font-semibold">
                {td('title')}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{td('closedNote')}</p>
            </section>
          ) : (
            <DecisionPanel
              caseId={detail.id}
              version={detail.version}
              organizationId={detail.organizationId}
              recommendation={recommendation}
            />
          )}

          <section className="staff-panel flex flex-col gap-3" aria-labelledby="case-messages">
            <h2 id="case-messages" className="font-semibold">
              {t('messagesTitle')}
            </h2>
            {detail.messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noMessages')}</p>
            ) : (
              <ul className="flex flex-col gap-3 text-sm">
                {detail.messages.map((message) => (
                  <li key={message.id} className="flex flex-col gap-1">
                    <p className="font-medium">{tm(`kind.${message.kind}`)}</p>
                    <p className="whitespace-pre-line">
                      {message.kind === 'cancellation_notice'
                        ? tm('cancellationNotice')
                        : message.body}
                    </p>
                    <time dateTime={message.createdAt} className="text-muted-foreground">
                      {when(message.createdAt)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="staff-panel flex flex-col gap-3" aria-labelledby="case-history">
            <h2 id="case-history" className="font-semibold">
              {t('history')}
            </h2>
            {detail.actions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noHistory')}</p>
            ) : (
              <ol className="flex flex-col gap-3 text-sm">
                {detail.actions.map((action) => (
                  <li key={action.id} className="flex flex-col gap-0.5">
                    <p className="font-medium">
                      {t(`action.${actionKey[action.type]}`, { actor: action.actorName })}
                    </p>
                    {action.disposition ? (
                      <p className="text-muted-foreground">
                        {t(`disposition.${action.disposition}`)}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground">
                      <time dateTime={action.createdAt}>{when(action.createdAt)}</time>
                      {' · '}
                      {t('versionChange', {
                        from: action.priorVersion,
                        to: action.resultingVersion,
                      })}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
