'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { externalActionTypes, MESSAGE_BODY_MAX, type ExternalActionType } from '@haven/shared';

import { claimCase, closeCase, recordExternalAction } from '@/app/actions/official';
import { DecisionFeedback, useCaseDecision } from '@/components/haven/case-decision';
import { ConfirmDialog } from '@/components/haven/confirm-dialog';
import { Field } from '@/components/haven/field';
import { Button } from '@/components/ui/button';

type Props = {
  caseId: string;
  version: number;
  /** The case is assigned to the signed-in official. */
  claimedByMe: boolean;
};

/** An official's work on a case: claim it, record what they did outside Haven, close it. */
export function OfficialPanel({ caseId, version, claimedByMe }: Props) {
  const t = useTranslations('cases');
  const tc = useTranslations('common');
  const { error, done, pending, run, clearError } = useCaseDecision();

  const [actionType, setActionType] = useState<ExternalActionType>('phone_call');
  const [note, setNote] = useState('');
  const [comment, setComment] = useState('');

  const claim = () => run(() => claimCase(caseId, { expectedVersion: version }), t('claimed'));

  const record = () =>
    run(
      () => recordExternalAction(caseId, { type: actionType, note, expectedVersion: version }),
      t('recorded'),
    ).then((ok) => ok && setNote(''));

  const close = () =>
    run(() => closeCase(caseId, { comment, expectedVersion: version }), t('closedDone'));

  return (
    <section aria-labelledby="work-title" className="staff-panel staff-form flex flex-col gap-5">
      <h2 id="work-title" className="font-semibold">
        {t('workTitle')}
      </h2>

      <DecisionFeedback
        error={error}
        done={done}
        onDismiss={clearError}
        backHref="/cases"
        backLabel={t('backToCases')}
      />

      {claimedByMe ? (
        <p className="text-sm text-muted-foreground">{t('claimedByYou')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{t('claimHint')}</p>
          <Button size="lg" className="self-start" disabled={pending} onClick={() => void claim()}>
            {t('claim')}
          </Button>
        </div>
      )}

      <form
        className="flex flex-col gap-3 border-t pt-4"
        aria-labelledby="record-title"
        onSubmit={(e) => {
          e.preventDefault();
          void record();
        }}
      >
        <h3 id="record-title" className="text-sm font-semibold">
          {t('recordTitle')}
        </h3>
        <Field id="action-type" label={t('actionType')}>
          <select
            id="action-type"
            value={actionType}
            onChange={(e) => setActionType(e.target.value as ExternalActionType)}
          >
            {externalActionTypes.map((type) => (
              <option key={type} value={type}>
                {t(`actionTypes.${type}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="action-note" label={t('note')} hint={t('noteHint')}>
          <textarea
            id="action-note"
            rows={3}
            required
            maxLength={MESSAGE_BODY_MAX}
            aria-describedby="action-note-hint"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <Button
          type="submit"
          variant="outline"
          size="lg"
          className="self-start"
          disabled={pending}
        >
          {t('recordAction')}
        </Button>
      </form>

      <div className="flex flex-col gap-3 border-t pt-4" role="group" aria-labelledby="close-title">
        <h3 id="close-title" className="text-sm font-semibold">
          {t('closeTitle')}
        </h3>
        <Field id="close-comment" label={t('closeComment')} hint={t('closeCommentHint')}>
          <textarea
            id="close-comment"
            rows={2}
            maxLength={MESSAGE_BODY_MAX}
            aria-describedby="close-comment-hint"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Field>
        <ConfirmDialog
          trigger={
            <Button
              variant="outline"
              size="lg"
              className="self-start"
              disabled={pending || comment.trim() === ''}
            >
              {t('close')}
            </Button>
          }
          title={t('closeConfirmTitle')}
          description={t('closeConfirmBody')}
          confirmLabel={t('close')}
          cancelLabel={tc('back')}
          onConfirm={async () => {
            await close();
          }}
        />
      </div>
    </section>
  );
}
