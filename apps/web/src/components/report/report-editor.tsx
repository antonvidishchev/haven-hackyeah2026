'use client';

import { Check, Crosshair, MapPin, RotateCw, Send, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  apiErrorBodySchema,
  enumLabels,
  filingGaps,
  findDistrict,
  LOCKED_AFTER_FILING,
  linkEmergency,
  REPORT_STAGES,
  reportCategories,
  severities,
  districtIds,
  type EvidenceItem,
  type FilingGap,
  type LatLng,
  type ReportDetail,
  type ReportFields,
  type ReportStage,
} from '@haven/shared';

import { fileReport } from '@/app/actions/reports';
import { describedBy, Field } from '@/components/haven/field';
import { fromLocalInput, toLocalInput } from '@/lib/datetime';

import { EvidenceList } from './evidence-list';
import { EvidenceUploader } from './evidence-uploader';
import { MapDialog } from './map-dialog';
import { VaultDisclosure } from './vault-disclosure';

const AUTOSAVE_DELAY_MS = 1500;

type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: Date }
  | { kind: 'failed' }
  | { kind: 'conflict' };

type Locating = 'idle' | 'busy' | 'denied' | 'outside';

type FilingError = 'incomplete' | 'unavailable' | null;

const subscribeNothing = () => () => {};

/** False during server rendering and hydration, true afterwards (time zones differ). */
const useHydrated = () =>
  useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

/**
 * The three-stage report editor. Every change to a draft autosaves; a filed report saves only
 * on "Save changes", since each save is a new revision staff can see. The server keeps a
 * revision per save and refuses a save based on an outdated revision.
 */
export function ReportEditor({
  report,
  evidenceMaxBytes,
  disclaimer,
}: {
  report: ReportDetail;
  evidenceMaxBytes: number;
  /** Server-rendered 112 notice, shown on the review stage. */
  disclaimer: React.ReactNode;
}) {
  const t = useTranslations('editor');
  const te = useTranslations('evidence');
  const locale = useLocale();
  const labels = enumLabels[locale as keyof typeof enumLabels];
  const router = useRouter();
  const hydrated = useHydrated();

  const [stage, setStage] = useState<ReportStage>('what');
  const [fields, setFields] = useState<ReportFields>(report.fields);
  const [evidence, setEvidence] = useState<EvidenceItem[]>(report.evidence);
  const [save, setSave] = useState<SaveState>({ kind: 'idle' });
  const [lastSaved, setLastSaved] = useState<ReportFields>(report.fields);
  const [mapOpen, setMapOpen] = useState(false);
  const [locating, setLocating] = useState<Locating>('idle');
  const [filing, startFiling] = useTransition();
  const [filingError, setFilingError] = useState<FilingError>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const mapOpenerRef = useRef<HTMLButtonElement>(null);
  const stageChanged = useRef(false);

  // Autosave bookkeeping lives in refs so a save in flight always sees the latest edit.
  const latest = useRef(fields);
  const savedFields = useRef(report.fields);
  const revision = useRef(report.revision);
  const inFlight = useRef(false);
  const again = useRef(false);
  const stopped = useRef(false);
  const lastSaveFailed = useRef(false);
  const justFiled = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const filed = report.state === 'submitted';
  const locked = new Set<string>(filed ? LOCKED_AFTER_FILING : []);
  const stageIndex = REPORT_STAGES.indexOf(stage);
  const gaps = filingGaps(fields, evidence.length);
  const pinDistrict = fields.location ? findDistrict(fields.location) : null;

  const saveNow = useCallback(async () => {
    clearTimeout(timer.current);
    if (stopped.current) return;
    if (inFlight.current) {
      again.current = true;
      return;
    }
    const sending = latest.current;
    if (sending === savedFields.current) return;
    inFlight.current = true;
    setSave({ kind: 'saving' });
    try {
      const response = await fetch(`/api/proxy/reports/${encodeURIComponent(report.id)}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ expectedRevision: revision.current, fields: sending }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (response.ok) {
        revision.current = (body as ReportDetail).revision;
        savedFields.current = sending;
        setLastSaved(sending);
        lastSaveFailed.current = false;
        setSave({ kind: 'saved', at: new Date() });
        // Refresh the server-rendered header and history; this editor keeps its state.
        router.refresh();
      } else {
        const parsed = apiErrorBodySchema.safeParse(body);
        if (response.status === 409 && parsed.data?.error.code === 'revision_conflict') {
          stopped.current = true;
          setSave({ kind: 'conflict' });
        } else {
          lastSaveFailed.current = true;
          setSave({ kind: 'failed' });
        }
      }
    } catch {
      lastSaveFailed.current = true;
      setSave({ kind: 'failed' });
    } finally {
      inFlight.current = false;
      if (again.current) {
        again.current = false;
        void saveNow();
      }
    }
  }, [report.id, router]);

  /** Saves until the server holds the latest edit. False when that isn't possible now. */
  async function settle(): Promise<boolean> {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (stopped.current) return false;
      if (inFlight.current) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }
      if (latest.current === savedFields.current) return true;
      await saveNow();
      if (lastSaveFailed.current && latest.current !== savedFields.current) return false;
    }
    return false;
  }

  function file() {
    setFilingError(null);
    startFiling(async () => {
      if (!(await settle())) return setFilingError('unavailable');
      const result = await fileReport(report.id, revision.current);
      if (result.ok) {
        revision.current = result.revision;
        justFiled.current = true;
      } else if (result.error === 'conflict') {
        stopped.current = true;
        setSave({ kind: 'conflict' });
      } else {
        setFilingError(result.error);
      }
    });
  }

  // Adding evidence to a filed report makes a new revision with the same fields; adopt it so the
  // next "Save changes" isn't refused as a conflict.
  useEffect(() => {
    if (
      report.revision > revision.current &&
      JSON.stringify(report.fields) === JSON.stringify(savedFields.current)
    ) {
      revision.current = report.revision;
    }
  }, [report.revision, report.fields]);

  // Once the page re-renders as filed, move focus to the confirmation.
  useEffect(() => {
    if (!filed || !justFiled.current) return;
    justFiled.current = false;
    const confirmation = document.getElementById('filed-title');
    confirmation?.scrollIntoView({ block: 'center' });
    confirmation?.focus();
  }, [filed]);

  function change(next: ReportFields) {
    latest.current = next;
    setFields(next);
    if (stopped.current || filed) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveNow(), AUTOSAVE_DELAY_MS);
  }

  const set = <K extends keyof ReportFields>(key: K, value: ReportFields[K]) =>
    change({ ...latest.current, [key]: value });

  // Don't lose the last edit when the tab is hidden or closed before the timer fires.
  useEffect(() => {
    function flush() {
      if (document.visibilityState !== 'hidden' || stopped.current || filed) return;
      if (latest.current === savedFields.current || inFlight.current) return;
      clearTimeout(timer.current);
      void fetch(`/api/proxy/reports/${encodeURIComponent(report.id)}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ expectedRevision: revision.current, fields: latest.current }),
        keepalive: true,
      });
    }
    document.addEventListener('visibilitychange', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      clearTimeout(timer.current);
    };
  }, [report.id, filed]);

  useEffect(() => {
    if (stageChanged.current) headingRef.current?.focus();
  }, [stage]);

  function goTo(next: ReportStage) {
    stageChanged.current = true;
    setStage(next);
    if (!filed) void saveNow();
  }

  function setPin(point: LatLng | null) {
    const zoneId = point ? findDistrict(point) : latest.current.zoneId;
    change({ ...latest.current, location: point, zoneId });
  }

  function closeMap() {
    setMapOpen(false);
    mapOpenerRef.current?.focus();
  }

  function locateMe() {
    if (!('geolocation' in navigator)) return setLocating('denied');
    setLocating('busy');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point = {
          lat: Math.round(coords.latitude * 1e5) / 1e5,
          lng: Math.round(coords.longitude * 1e5) / 1e5,
        };
        if (!findDistrict(point)) return setLocating('outside');
        setLocating('idle');
        setPin(point);
      },
      () => setLocating('denied'),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  async function removeEvidence(id: string) {
    const response = await fetch(`/api/proxy/evidence/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!response.ok && response.status !== 404) throw new Error('remove failed');
    setEvidence((list) => list.filter((item) => item.id !== id));
  }

  const timeFormat = new Intl.DateTimeFormat(locale, { timeStyle: 'short' });
  const stageTitles: Record<ReportStage, string> = {
    what: t('stageWhat'),
    where: t('stageWhere'),
    evidence: t('stageEvidence'),
  };
  const gapLabels: Record<FilingGap, string> = {
    district: t('gapDistrict'),
    place: t('gapPlace'),
    details: t('gapDetails'),
  };
  const lockedHint = filed ? t('lockedHint') : undefined;

  const description = { hint: t('descriptionHint') };
  const category = { hint: t('categoryHint') };
  const eventTime = { hint: t('eventTimeHint') };
  const severity = { hint: lockedHint };
  const district = { hint: fields.location ? t('districtFromPin') : t('districtHint') };
  const place = { hint: t('placeHint') };

  return (
    <div className="flex flex-col gap-6">
      <ol aria-label={t('stagesLabel')} className="report-stages">
        {REPORT_STAGES.map((value, index) => (
          <li
            key={value}
            data-state={index < stageIndex ? 'done' : undefined}
            aria-current={value === stage ? 'step' : undefined}
          >
            <button type="button" onClick={() => goTo(value)}>
              {t('stepLabel', { n: index + 1, title: stageTitles[value] })}
            </button>
          </li>
        ))}
      </ol>

      {save.kind === 'conflict' ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-destructive/40 bg-card p-5"
        >
          <h2 className="text-base font-semibold">{t('conflictTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('conflictBody')}</p>
          <button
            type="button"
            className="resident-button self-start"
            onClick={() => window.location.reload()}
          >
            <RotateCw aria-hidden className="size-4" />
            {t('reload')}
          </button>
        </div>
      ) : null}

      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void saveNow();
        }}
      >
        <h2 ref={headingRef} tabIndex={-1} className="outline-none">
          {stageTitles[stage]}
        </h2>

        {stage === 'what' ? (
          <>
            <Field id="category" label={t('category')} hint={category.hint}>
              <select
                id="category"
                value={fields.category}
                aria-describedby={describedBy('category', category)}
                onChange={(e) => set('category', e.target.value as ReportFields['category'])}
              >
                {reportCategories.map((value) => (
                  <option key={value} value={value}>
                    {labels.category[value]}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="description" label={t('description')} hint={description.hint}>
              <textarea
                id="description"
                rows={6}
                maxLength={10_000}
                value={fields.description}
                aria-describedby={describedBy('description', description)}
                onChange={(e) => set('description', e.target.value)}
              />
            </Field>
            <Field
              id="event-time"
              label={t('eventTime')}
              hint={eventTime.hint}
              optional={t('optional')}
            >
              <input
                id="event-time"
                type="datetime-local"
                value={hydrated ? toLocalInput(fields.eventTime) : ''}
                max={hydrated ? toLocalInput(new Date().toISOString()) : undefined}
                aria-describedby={describedBy('event-time', eventTime)}
                onChange={(e) => set('eventTime', fromLocalInput(e.target.value))}
              />
            </Field>
            <Field id="severity" label={t('severity')} hint={severity.hint}>
              <select
                id="severity"
                value={fields.severity ?? ''}
                disabled={locked.has('severity')}
                aria-describedby={describedBy('severity', severity)}
                onChange={(e) =>
                  change(
                    linkEmergency(latest.current, {
                      severity: (e.target.value || null) as ReportFields['severity'],
                    }),
                  )
                }
              >
                <option value="">{t('severityUnset')}</option>
                {severities.map((value) => (
                  <option key={value} value={value}>
                    {labels.severity[value]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex flex-col gap-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={fields.weaponOrImmediateThreat}
                  disabled={locked.has('weaponOrImmediateThreat')}
                  aria-describedby="weapon-hint"
                  onChange={(e) =>
                    change(
                      linkEmergency(latest.current, {
                        weaponOrImmediateThreat: e.target.checked,
                      }),
                    )
                  }
                />
                <span className="flex flex-col gap-1">
                  <span className="font-medium">{t('weapon')}</span>
                  <span id="weapon-hint" className="text-sm text-muted-foreground">
                    {t('weaponHint')}
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={fields.isRepeatIncident}
                  disabled={locked.has('isRepeatIncident')}
                  onChange={(e) => set('isRepeatIncident', e.target.checked)}
                />
                <span className="font-medium">{t('repeat')}</span>
              </label>
            </div>
          </>
        ) : null}

        {stage === 'where' ? (
          <>
            <Field id="district" label={t('district')} hint={district.hint}>
              <select
                id="district"
                value={fields.zoneId ?? ''}
                disabled={fields.location !== null}
                aria-describedby={describedBy('district', district)}
                onChange={(e) => set('zoneId', (e.target.value || null) as ReportFields['zoneId'])}
              >
                <option value="">{t('districtUnset')}</option>
                {districtIds.map((value) => (
                  <option key={value} value={value}>
                    {labels.district[value]}
                  </option>
                ))}
              </select>
            </Field>

            <div className="flex flex-col gap-3">
              {fields.location && pinDistrict ? (
                <p className="flex items-center gap-2 font-medium">
                  <MapPin aria-hidden className="size-5 text-primary" />
                  {t('pinSet', { district: labels.district[pinDistrict] })}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <button
                  ref={mapOpenerRef}
                  type="button"
                  className="resident-button secondary"
                  onClick={() => setMapOpen(true)}
                >
                  <MapPin aria-hidden className="size-5" />
                  {fields.location ? t('changePin') : t('pickOnMap')}
                </button>
                <button
                  type="button"
                  className="resident-button secondary"
                  disabled={locating === 'busy'}
                  onClick={locateMe}
                >
                  <Crosshair aria-hidden className="size-5" />
                  {t('useLocation')}
                </button>
                {fields.location ? (
                  <button
                    type="button"
                    className="resident-button secondary"
                    onClick={() => setPin(null)}
                  >
                    <X aria-hidden className="size-5" />
                    {t('removePin')}
                  </button>
                ) : null}
              </div>
              <p aria-live="polite" className="text-sm text-muted-foreground empty:hidden">
                {locating === 'busy'
                  ? t('locating')
                  : locating === 'denied'
                    ? t('locationDenied')
                    : locating === 'outside'
                      ? t('locationOutside')
                      : ''}
              </p>
            </div>

            <Field id="place" label={t('place')} hint={place.hint}>
              <input
                id="place"
                type="text"
                maxLength={200}
                value={fields.locationLabel}
                aria-describedby={describedBy('place', place)}
                onChange={(e) => set('locationLabel', e.target.value)}
              />
            </Field>

            <FilingChecklist title={t('required')} gaps={gaps} labels={gapLabels} t={t} />
          </>
        ) : null}

        {stage === 'evidence' ? (
          <>
            <section aria-labelledby="evidence-title" className="flex flex-col gap-4">
              <h3 id="evidence-title" className="font-semibold">
                {te('title')}
              </h3>
              <EvidenceList items={evidence} onRemove={filed ? undefined : removeEvidence} />
              <EvidenceUploader
                reportId={report.id}
                maxBytes={evidenceMaxBytes}
                onUploaded={(item) => {
                  setEvidence((list) => [...list, item]);
                  if (filed) router.refresh();
                }}
              />
              <VaultDisclosure />
            </section>

            <section aria-labelledby="summary-title" className="resident-card">
              <h3 id="summary-title" className="font-semibold">
                {t('summary')}
              </h3>
              <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
                <dt className="text-muted-foreground">{t('category')}</dt>
                <dd>{labels.category[fields.category]}</dd>
                <dt className="text-muted-foreground">{t('severity')}</dt>
                <dd>{fields.severity ? labels.severity[fields.severity] : t('notGiven')}</dd>
                <dt className="text-muted-foreground">{t('eventTime')}</dt>
                <dd>
                  {hydrated && fields.eventTime
                    ? new Intl.DateTimeFormat(locale, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(fields.eventTime))
                    : t('notGiven')}
                </dd>
                <dt className="text-muted-foreground">{t('district')}</dt>
                <dd>{fields.zoneId ? labels.district[fields.zoneId] : t('notGiven')}</dd>
                <dt className="text-muted-foreground">{t('place')}</dt>
                <dd>
                  {[fields.location ? t('pinned') : null, fields.locationLabel.trim() || null]
                    .filter(Boolean)
                    .join(' · ') || t('notGiven')}
                </dd>
                <dt className="text-muted-foreground">{t('description')}</dt>
                <dd className="whitespace-pre-line">
                  {fields.description.trim() || t('notGiven')}
                </dd>
                <dt className="text-muted-foreground">{te('title')}</dt>
                <dd>{t('evidenceCount', { count: evidence.length })}</dd>
              </dl>
            </section>

            {filed ? null : (
              <FilingChecklist title={t('required')} gaps={gaps} labels={gapLabels} t={t} />
            )}
            {disclaimer}
          </>
        ) : null}

        <div className="flex flex-col gap-3 border-t pt-5">
          <div className="flex flex-wrap gap-3">
            {stageIndex > 0 ? (
              <button
                type="button"
                className="resident-button secondary"
                onClick={() => goTo(REPORT_STAGES[stageIndex - 1])}
              >
                {t('back')}
              </button>
            ) : null}
            {stageIndex < REPORT_STAGES.length - 1 ? (
              <button
                type="button"
                className="resident-button"
                onClick={() => goTo(REPORT_STAGES[stageIndex + 1])}
              >
                {t('continue')}
              </button>
            ) : null}
            {filed ? (
              <button
                type="submit"
                className="resident-button"
                disabled={save.kind === 'conflict' || fields === lastSaved}
              >
                {t('saveChanges')}
              </button>
            ) : (
              <button
                type="submit"
                className="resident-button secondary"
                disabled={save.kind === 'conflict'}
              >
                {t('saveDraft')}
              </button>
            )}
            {!filed && stage === 'evidence' ? (
              <button
                type="button"
                className="resident-button"
                disabled={gaps.length > 0 || filing || save.kind === 'conflict'}
                aria-describedby="file-hint"
                onClick={file}
              >
                <Send aria-hidden className="size-5" />
                {filing ? t('filing') : t('file')}
              </button>
            ) : null}
          </div>
          {!filed && stage === 'evidence' ? (
            <p id="file-hint" className="text-sm text-muted-foreground">
              {gaps.length > 0 ? t('fileBlocked') : t('fileHint')}
            </p>
          ) : null}
          {filingError ? (
            <p role="alert" className="text-sm text-destructive">
              {filingError === 'incomplete' ? t('fileIncomplete') : t('fileFailed')}
            </p>
          ) : null}
          <p role="status" className="text-sm text-muted-foreground">
            {save.kind === 'saving'
              ? t('saving')
              : filed && fields !== lastSaved
                ? t('unsaved')
                : save.kind === 'saved'
                  ? t('savedAt', { time: timeFormat.format(save.at) })
                  : save.kind === 'failed'
                    ? t('saveFailed')
                    : ''}
          </p>
        </div>
      </form>

      {mapOpen ? (
        <MapDialog
          initial={fields.location}
          onPick={(point) => {
            setPin(point);
            closeMap();
          }}
          onClose={closeMap}
        />
      ) : null}
    </div>
  );
}

function FilingChecklist({
  title,
  gaps,
  labels,
  t,
}: {
  title: string;
  gaps: FilingGap[];
  labels: Record<FilingGap, string>;
  t: ReturnType<typeof useTranslations<'editor'>>;
}) {
  const items: FilingGap[] = ['district', 'place', 'details'];
  return (
    <section aria-label={title} className="resident-card">
      <h3 className="font-semibold">{title}</h3>
      <ul aria-live="polite" className="flex flex-col gap-2 text-sm">
        {items.map((gap) => {
          const met = !gaps.includes(gap);
          return (
            <li key={gap} className="flex items-center gap-2">
              {met ? (
                <Check aria-hidden className="size-4 text-success" />
              ) : (
                <X aria-hidden className="size-4 text-destructive" />
              )}
              <span>{labels[gap]}</span>
              <span className="sr-only">{met ? t('met') : t('missing')}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
