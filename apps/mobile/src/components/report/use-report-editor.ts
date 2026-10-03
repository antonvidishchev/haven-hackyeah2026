import { ApiError } from '@haven/api-client';
import type { ReportDetail, ReportFields } from '@haven/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { api } from '@/lib/api';

const AUTOSAVE_DELAY_MS = 1500;

export type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: Date }
  | { kind: 'failed' }
  | { kind: 'conflict' };

export type FilingError = 'incomplete' | 'unavailable' | 'conflict';

/**
 * Field state and saving for one report, mirroring the web editor: a draft autosaves after
 * each change; a filed report saves only on "Save changes". The server refuses a save based on
 * an outdated revision, which stops autosave until the resident reloads.
 */
export function useReportEditor(
  report: ReportDetail,
  token: string | null,
  onSaved: (report: ReportDetail) => void,
) {
  const [fields, setFields] = useState<ReportFields>(report.fields);
  const [lastSaved, setLastSaved] = useState<ReportFields>(report.fields);
  const [save, setSave] = useState<SaveState>({ kind: 'idle' });

  // Autosave bookkeeping lives in refs so a save in flight always sees the latest edit.
  const latest = useRef(report.fields);
  const savedFields = useRef(report.fields);
  const revision = useRef(report.revision);
  const inFlight = useRef(false);
  const again = useRef(false);
  const stopped = useRef(false);
  const lastSaveFailed = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  });

  const filed = report.state === 'submitted';

  const saveNow = useCallback(async (): Promise<void> => {
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
      const saved = await api.reports.update(
        report.id,
        { expectedRevision: revision.current, fields: sending },
        { token },
      );
      revision.current = saved.revision;
      savedFields.current = sending;
      setLastSaved(sending);
      lastSaveFailed.current = false;
      setSave({ kind: 'saved', at: new Date() });
      onSavedRef.current(saved);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'revision_conflict') {
        stopped.current = true;
        setSave({ kind: 'conflict' });
      } else {
        lastSaveFailed.current = true;
        setSave({ kind: 'failed' });
      }
    } finally {
      inFlight.current = false;
      if (again.current) {
        again.current = false;
        void saveNow();
      }
    }
  }, [report.id, token]);

  /** Saves until the server holds the latest edit. False when that isn't possible now. */
  const settle = useCallback(async (): Promise<boolean> => {
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
  }, [saveNow]);

  const file = useCallback(async (): Promise<FilingError | null> => {
    if (!(await settle())) return 'unavailable';
    try {
      const filedReport = await api.reports.submit(
        report.id,
        { expectedRevision: revision.current },
        { token },
      );
      revision.current = filedReport.revision;
      onSavedRef.current(filedReport);
      return null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        stopped.current = true;
        setSave({ kind: 'conflict' });
        return 'conflict';
      }
      if (error instanceof ApiError && error.status === 422) return 'incomplete';
      return 'unavailable';
    }
  }, [report.id, settle, token]);

  // Adding evidence makes a new revision with the same fields; adopt it so the next save
  // isn't refused as a conflict.
  useEffect(() => {
    if (
      report.revision > revision.current &&
      JSON.stringify(report.fields) === JSON.stringify(savedFields.current)
    ) {
      revision.current = report.revision;
    }
  }, [report.revision, report.fields]);

  // Don't lose the last edit when the app goes to the background before the timer fires.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && !filed) void saveNow();
    });
    return () => {
      subscription.remove();
      clearTimeout(timer.current);
    };
  }, [filed, saveNow]);

  const change = useCallback(
    (next: ReportFields) => {
      latest.current = next;
      setFields(next);
      if (stopped.current || filed) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void saveNow(), AUTOSAVE_DELAY_MS);
    },
    [filed, saveNow],
  );

  const set = <K extends keyof ReportFields>(key: K, value: ReportFields[K]) =>
    change({ ...latest.current, [key]: value });

  return {
    fields,
    latest,
    change,
    set,
    save,
    saveNow,
    file,
    filed,
    dirty: fields !== lastSaved,
  };
}
