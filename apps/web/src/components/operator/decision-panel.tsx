'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  cancelReasons,
  enumLabels,
  MESSAGE_BODY_MAX,
  organizationIds,
  replyKinds,
  type CancelReason,
  type CaseRecommendation,
  type OrganizationId,
  type ReplyKind,
} from '@haven/shared';

import {
  cancelCase,
  promoteCase,
  replyToResident,
  type DecisionError,
  type DecisionResult,
} from '@/app/actions/operator';
import { ConfirmDialog } from '@/components/haven/confirm-dialog';
import { Field } from '@/components/haven/field';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Props = {
  caseId: string;
  version: number;
  organizationId: OrganizationId;
  recommendation: CaseRecommendation | null;
};

/** The operator's decisions on a case. Each one carries the version the operator saw. */
export function DecisionPanel({ caseId, version, organizationId, recommendation }: Props) {
  const t = useTranslations('decision');
  const tc = useTranslations('common');
  const labels = enumLabels[useLocale() as keyof typeof enumLabels];
  const router = useRouter();

  const [error, setError] = useState<DecisionError | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [replyKind, setReplyKind] = useState<ReplyKind>('request_information');
  const [replyBody, setReplyBody] = useState('');
  const [target, setTarget] = useState<OrganizationId>(
    organizationIds.find((id) => id !== organizationId) ?? organizationId,
  );
  const [reason, setReason] = useState('');
  const [cancelReason, setCancelReason] = useState<CancelReason>('not_actionable');
  const [cancelComment, setCancelComment] = useState('');

  async function run(action: () => Promise<DecisionResult>, doneMessage: string) {
    setPending(true);
    setError(null);
    setDone(null);
    try {
      const result = await action();
      if (result.ok) {
        setDone(doneMessage);
        return true;
      }
      setError(result.error);
      return false;
    } finally {
      setPending(false);
    }
  }

  const reply = (followed = false, kind = replyKind, body = replyBody) =>
    run(
      () =>
        replyToResident(caseId, {
          kind,
          body,
          expectedVersion: version,
          followedRecommendation: followed,
        }),
      t('replied'),
    ).then((ok) => ok && setReplyBody(''));

  const promote = (followed = false, to = target, why = reason) =>
    run(
      () =>
        promoteCase(caseId, {
          targetOrganization: to,
          reason: why,
          expectedVersion: version,
          followedRecommendation: followed,
        }),
      t('promoted', { organisation: labels.organization[to] }),
    ).then((ok) => ok && setReason(''));

  const cancel = () =>
    run(
      () =>
        cancelCase(caseId, {
          reasonCategory: cancelReason,
          comment: cancelComment,
          expectedVersion: version,
        }),
      t('cancelled'),
    );

  return (
    <section
      aria-labelledby="decision-title"
      className="staff-panel staff-form flex flex-col gap-5"
    >
      <h2 id="decision-title" className="font-semibold">
        {t('title')}
      </h2>

      {error ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-3"
        >
          <p className="text-sm font-medium text-destructive">{t(`error.${error}`)}</p>
          {error === 'stale' || error === 'closed' ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setError(null);
                  router.refresh();
                }}
              >
                {t('reload')}
              </Button>
              <Link href="/queue" className={buttonVariants({ variant: 'ghost', size: 'lg' })}>
                {t('backToQueue')}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
      {done ? (
        <p role="status" className="text-sm font-medium text-success">
          {done}
        </p>
      ) : null}

      {recommendation?.status === 'suggested' ? (
        <FollowRecommendation
          recommendation={recommendation}
          pending={pending}
          onReply={(body) => reply(true, 'request_information', body)}
          onPromote={(why) => promote(true, 'community_volunteer', why)}
        />
      ) : null}

      <form
        className="flex flex-col gap-3"
        aria-labelledby="reply-title"
        onSubmit={(e) => {
          e.preventDefault();
          void reply();
        }}
      >
        <h3 id="reply-title" className="text-sm font-semibold">
          {t('replyTitle')}
        </h3>
        <Field id="reply-kind" label={t('replyKind')}>
          <select
            id="reply-kind"
            value={replyKind}
            onChange={(e) => setReplyKind(e.target.value as ReplyKind)}
          >
            {replyKinds.map((kind) => (
              <option key={kind} value={kind}>
                {t(`replyKinds.${kind}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="reply-body" label={t('replyBody')} hint={t('replyHint')}>
          <textarea
            id="reply-body"
            rows={3}
            required
            maxLength={MESSAGE_BODY_MAX}
            aria-describedby="reply-body-hint"
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
          />
        </Field>
        <Button type="submit" size="lg" className="self-start" disabled={pending}>
          {t('sendReply')}
        </Button>
      </form>

      <form
        className="flex flex-col gap-3 border-t pt-4"
        aria-labelledby="promote-title"
        onSubmit={(e) => {
          e.preventDefault();
          void promote();
        }}
      >
        <h3 id="promote-title" className="text-sm font-semibold">
          {t('promoteTitle')}
        </h3>
        <Field id="promote-target" label={t('destination')}>
          <select
            id="promote-target"
            value={target}
            onChange={(e) => setTarget(e.target.value as OrganizationId)}
          >
            {organizationIds.map((id) => (
              <option key={id} value={id}>
                {labels.organization[id]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="promote-reason" label={t('reason')}>
          <textarea
            id="promote-reason"
            rows={2}
            required
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <Button type="submit" size="lg" className="self-start" disabled={pending}>
          {t('promote')}
        </Button>
      </form>

      <div
        className="flex flex-col gap-3 border-t pt-4"
        role="group"
        aria-labelledby="cancel-title"
      >
        <h3 id="cancel-title" className="text-sm font-semibold">
          {t('cancelTitle')}
        </h3>
        <Field id="cancel-reason" label={t('cancelReason')}>
          <select
            id="cancel-reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value as CancelReason)}
          >
            {cancelReasons.map((value) => (
              <option key={value} value={value}>
                {t(`cancelReasons.${value}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="cancel-comment" label={t('cancelComment')} hint={t('cancelCommentHint')}>
          <textarea
            id="cancel-comment"
            rows={2}
            maxLength={MESSAGE_BODY_MAX}
            aria-describedby="cancel-comment-hint"
            value={cancelComment}
            onChange={(e) => setCancelComment(e.target.value)}
          />
        </Field>
        <ConfirmDialog
          trigger={
            <Button
              variant="destructive"
              size="lg"
              className="self-start"
              disabled={pending || cancelComment.trim() === ''}
            >
              {t('cancelCase')}
            </Button>
          }
          title={t('cancelConfirmTitle')}
          description={t('cancelConfirmBody')}
          confirmLabel={t('cancelCase')}
          cancelLabel={tc('back')}
          destructive
          onConfirm={async () => {
            await cancel();
          }}
        />
      </div>
    </section>
  );
}

/** "Follow AI recommendation": the suggested decision, prefilled and editable, behind a confirm. */
function FollowRecommendation({
  recommendation,
  pending,
  onReply,
  onPromote,
}: {
  recommendation: CaseRecommendation;
  pending: boolean;
  onReply: (body: string) => Promise<unknown>;
  onPromote: (reason: string) => Promise<unknown>;
}) {
  const t = useTranslations('decision');
  const tc = useTranslations('common');
  const [open, setOpen] = useState(false);
  const isReply = recommendation.action === 'request_more_evidence';
  const prefill = isReply ? t('followReplyPrefill') : t('followPromotePrefill');
  const [text, setText] = useState(prefill);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setText(prefill);
        setOpen(next);
      }}
    >
      <Button variant="secondary" size="lg" className="self-start" onClick={() => setOpen(true)}>
        {t('follow')}
      </Button>
      <DialogContent className="staff-form">
        <DialogHeader>
          <DialogTitle>{t('followTitle')}</DialogTitle>
          <DialogDescription>
            {isReply ? t('followReplyBody') : t('followPromoteBody')}
          </DialogDescription>
        </DialogHeader>
        <Field id="follow-text" label={isReply ? t('replyBody') : t('reason')}>
          <textarea
            id="follow-text"
            rows={4}
            maxLength={isReply ? MESSAGE_BODY_MAX : 500}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </Field>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{tc('cancel')}</DialogClose>
          <Button
            disabled={pending || text.trim() === ''}
            onClick={async () => {
              await (isReply ? onReply(text) : onPromote(text));
              setOpen(false);
            }}
          >
            {t('followConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
