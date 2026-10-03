'use client';

import { FileDown, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { evidenceKind, type EvidenceItem } from '@haven/shared';

import { ConfirmDialog } from '@/components/haven/confirm-dialog';
import { formatBytes } from '@/lib/datetime';

export const mediaUrl = (id: string) => `/media/${encodeURIComponent(id)}`;

function Preview({ item }: { item: EvidenceItem }) {
  const t = useTranslations('evidence');
  const src = mediaUrl(item.id);
  switch (evidenceKind(item.mediaType)) {
    case 'image':
      return (
        <Image
          src={src}
          alt={t('imageAlt', { name: item.fileName })}
          width={640}
          height={480}
          unoptimized
          className="h-auto max-h-72 w-auto max-w-full rounded-lg border object-contain"
        />
      );
    case 'video':
      return (
        <video controls preload="metadata" src={src} className="max-h-72 w-full rounded-lg border">
          <a href={src}>{t('download')}</a>
        </video>
      );
    case 'audio':
      return <audio controls preload="metadata" src={src} className="w-full" />;
    default:
      return (
        <a href={src} download={item.fileName} className="resident-button secondary self-start">
          <FileDown aria-hidden className="size-5" />
          {t('download')}
        </a>
      );
  }
}

/** Uploaded evidence with playback. Every file loads through `/media`, never a public URL. */
export function EvidenceList({
  items,
  onRemove,
}: {
  items: EvidenceItem[];
  /** Absent once the report is filed: evidence then stays on record. */
  onRemove?: (id: string) => Promise<void>;
}) {
  const t = useTranslations('evidence');
  const tc = useTranslations('common');
  const locale = useLocale();
  if (items.length === 0) return null;
  return (
    <ul aria-label={t('listLabel')} className="flex flex-col gap-4">
      {items.map((item) => (
        <li key={item.id} className="resident-card flex flex-col gap-3">
          <Preview item={item} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 text-sm break-all">
              <span className="font-medium text-foreground">{item.fileName}</span>
              {' · '}
              {formatBytes(item.byteSize, locale)}
            </p>
            {onRemove ? (
              <ConfirmDialog
                trigger={
                  <button type="button" className="resident-button secondary">
                    <Trash2 aria-hidden className="size-4" />
                    {t('remove')}
                    <span className="sr-only"> {item.fileName}</span>
                  </button>
                }
                title={t('removeTitle')}
                description={t('removeBody', { name: item.fileName })}
                confirmLabel={t('remove')}
                cancelLabel={tc('cancel')}
                destructive
                onConfirm={() => onRemove(item.id)}
              />
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
