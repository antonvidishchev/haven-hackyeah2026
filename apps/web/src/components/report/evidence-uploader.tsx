'use client';

import { RotateCcw, Upload, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  apiErrorBodySchema,
  EVIDENCE_ACCEPT,
  validateEvidence,
  type EvidenceItem,
} from '@haven/shared';

import { formatBytes } from '@/lib/datetime';

type UploadError = 'type' | 'empty' | 'too_large' | 'failed';
type Upload = {
  key: string;
  file: File;
  status: 'waiting' | 'uploading' | 'failed';
  progress: number;
  error?: UploadError;
};

const errorFromCode: Record<string, UploadError> = {
  unsupported_media_type: 'type',
  empty_file: 'empty',
  file_too_large: 'too_large',
};

/** Posts one file through the proxy with XHR, which (unlike fetch) reports upload progress. */
function send(reportId: string, file: File, onProgress: (percent: number) => void) {
  return new Promise<EvidenceItem>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/proxy/reports/${encodeURIComponent(reportId)}/evidence`);
    xhr.responseType = 'json';
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve(xhr.response as EvidenceItem);
      const body = apiErrorBodySchema.safeParse(xhr.response);
      reject(errorFromCode[body.success ? body.data.error.code : ''] ?? 'failed');
    };
    xhr.onerror = () => reject('failed');
    const form = new FormData();
    form.append('file', file, file.name);
    xhr.send(form);
  });
}

/**
 * A multi-file picker with a per-file status list. Files upload one at a time; a failed
 * upload can be retried or dropped, and nothing is lost from the form while it runs.
 */
export function EvidenceUploader({
  reportId,
  maxBytes,
  onUploaded,
}: {
  reportId: string;
  maxBytes: number;
  onUploaded: (item: EvidenceItem) => void;
}) {
  const t = useTranslations('evidence');
  const locale = useLocale();
  const inputId = useId();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const update = (key: string, change: Partial<Upload>) =>
    setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...change } : u)));

  function enqueue(upload: Upload) {
    queue.current = queue.current.then(async () => {
      update(upload.key, { status: 'uploading', progress: 0, error: undefined });
      try {
        const item = await send(reportId, upload.file, (progress) =>
          update(upload.key, { progress }),
        );
        setUploads((list) => list.filter((u) => u.key !== upload.key));
        onUploaded(item);
      } catch (error) {
        update(upload.key, { status: 'failed', error: error as UploadError });
      }
    });
  }

  function addFiles(files: FileList | null) {
    for (const file of files ?? []) {
      const rejection = validateEvidence({ mediaType: file.type, byteSize: file.size }, maxBytes);
      const upload: Upload = {
        key: crypto.randomUUID(),
        file,
        status: rejection ? 'failed' : 'waiting',
        progress: 0,
        error: rejection ?? undefined,
      };
      setUploads((list) => [...list, upload]);
      if (!rejection) enqueue(upload);
    }
  }

  const retry = (upload: Upload) => {
    update(upload.key, { status: 'waiting', error: undefined });
    enqueue(upload);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-base font-medium">
          {t('addLabel')}
        </label>
        <p id={`${inputId}-hint`} className="text-sm text-muted-foreground">
          {t('addHint', { size: formatBytes(maxBytes, locale) })}
        </p>
        <div className="relative">
          <input
            id={inputId}
            type="file"
            multiple
            accept={EVIDENCE_ACCEPT}
            aria-describedby={`${inputId}-hint`}
            className="peer absolute inset-0 size-full cursor-pointer opacity-0"
            onChange={(event) => {
              addFiles(event.currentTarget.files);
              event.currentTarget.value = '';
            }}
          />
          <span className="resident-button secondary w-full peer-focus-visible:ring-3 peer-focus-visible:ring-ring">
            <Upload aria-hidden className="size-5" />
            {t('choose')}
          </span>
        </div>
      </div>

      {uploads.length > 0 ? (
        <ul aria-label={t('uploadsLabel')} aria-live="polite" className="flex flex-col gap-2">
          {uploads.map((upload) => (
            <li
              key={upload.key}
              className="flex flex-col gap-2 rounded-xl border bg-card px-4 py-3 text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 font-medium break-all">{upload.file.name}</span>
                <span
                  className={
                    upload.status === 'failed'
                      ? 'shrink-0 font-medium text-destructive'
                      : 'shrink-0 text-muted-foreground'
                  }
                >
                  {upload.status === 'uploading'
                    ? t('uploading', { progress: upload.progress })
                    : upload.status === 'waiting'
                      ? t('waiting')
                      : t('failed')}
                </span>
              </div>
              {upload.status === 'uploading' ? (
                <progress
                  max={100}
                  value={upload.progress}
                  aria-label={t('progressLabel', { name: upload.file.name })}
                  className="h-2 w-full accent-primary"
                />
              ) : null}
              {upload.status === 'failed' ? (
                <>
                  <p className="text-destructive">
                    {upload.error === 'too_large'
                      ? t('errorTooLarge', { size: formatBytes(maxBytes, locale) })
                      : t(`error.${upload.error ?? 'failed'}`)}
                  </p>
                  <div className="flex gap-2">
                    {upload.error === 'failed' ? (
                      <button
                        type="button"
                        className="resident-button secondary"
                        onClick={() => retry(upload)}
                      >
                        <RotateCcw aria-hidden className="size-4" />
                        {t('retry')}
                        <span className="sr-only"> {upload.file.name}</span>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="resident-button secondary"
                      onClick={() => setUploads((list) => list.filter((u) => u.key !== upload.key))}
                    >
                      <X aria-hidden className="size-4" />
                      {t('dismiss')}
                      <span className="sr-only"> {upload.file.name}</span>
                    </button>
                  </div>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
