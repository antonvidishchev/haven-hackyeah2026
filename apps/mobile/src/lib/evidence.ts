import { apiErrorBodySchema, safeFileName, type EvidenceItem } from '@haven/shared';
import { Platform } from 'react-native';

import { api, apiBaseUrl } from '@/lib/api';

/** Matches the API's EVIDENCE_MAX_BYTES (100 MiB by default). */
export const evidenceMaxBytes = Number(process.env.EXPO_PUBLIC_EVIDENCE_MAX_BYTES ?? 104_857_600);

/** A file on this device, from the picker, the camera or a recording. */
export type LocalFile = { uri: string; name: string; mediaType: string; byteSize: number | null };

/** Translation keys under `evidence`. */
export type UploadError = 'errorType' | 'errorEmpty' | 'errorTooLarge' | 'errorFailed';

const errorFromCode: Record<string, UploadError> = {
  unsupported_media_type: 'errorType',
  empty_file: 'errorEmpty',
  file_too_large: 'errorTooLarge',
};

/** Guesses a media type from the file extension when the picker doesn't report one. */
export function mediaTypeFor(name: string, fallback: string): string {
  const extension = name.split('.').pop()?.toLowerCase();
  const known: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    heic: 'image/heic',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    caf: 'audio/x-caf',
    '3gp': 'audio/3gpp',
    webm: 'audio/webm',
  };
  return (extension && known[extension]) ?? fallback;
}

/**
 * Posts one file with XHR, which (unlike fetch) reports upload progress. Rejects with an
 * `UploadError` key.
 */
export async function uploadEvidence(
  reportId: string,
  file: LocalFile,
  token: string | null,
  onProgress: (percent: number) => void,
): Promise<EvidenceItem> {
  const form = new FormData();
  const name = safeFileName(file.name);
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    form.append('file', blob, name);
  } else {
    // React Native's FormData takes a { uri, name, type } descriptor for files on disk.
    form.append('file', { uri: file.uri, name, type: file.mediaType } as unknown as Blob);
  }
  return new Promise<EvidenceItem>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiBaseUrl}/reports/${encodeURIComponent(reportId)}/evidence`);
    xhr.setRequestHeader('accept', 'application/json');
    if (token) xhr.setRequestHeader('authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // Not JSON; treated as a failed upload below.
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(body as EvidenceItem);
      const parsed = apiErrorBodySchema.safeParse(body);
      reject(errorFromCode[parsed.success ? parsed.data.error.code : ''] ?? 'errorFailed');
    };
    xhr.onerror = () => reject('errorFailed' satisfies UploadError);
    xhr.send(form);
  });
}

/** An authenticated source for expo-image, expo-video and expo-audio. */
export const mediaSource = (id: string, token: string | null) => ({
  uri: `${apiBaseUrl}${api.evidence.mediaPath(id)}`,
  headers: token ? { authorization: `Bearer ${token}` } : undefined,
});

export function formatBytes(bytes: number, locale: string): string {
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: units[unit],
    unitDisplay: 'short',
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(value);
}

/** m:ss for recording timers. */
export function formatDuration(millis: number): string {
  const seconds = Math.floor(millis / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
