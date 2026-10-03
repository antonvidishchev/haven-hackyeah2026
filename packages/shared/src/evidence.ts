export type EvidenceKind = 'image' | 'audio' | 'video';

/**
 * `image/*`, `audio/*` and `video/*` only; anything else is refused. SVG is refused too: it can
 * carry script and is served from our own origin.
 */
export function evidenceKind(mediaType: string): EvidenceKind | null {
  const match = /^(image|audio|video)\/[\w.+-]+$/i.exec(mediaType.trim());
  if (!match || /svg/i.test(mediaType)) return null;
  return match[1]!.toLowerCase() as EvidenceKind;
}

export const EVIDENCE_ACCEPT = 'image/*,audio/*,video/*';

export type EvidenceRejection = 'type' | 'empty' | 'too_large';

export function validateEvidence(
  file: { mediaType: string; byteSize: number },
  maxBytes: number,
): EvidenceRejection | null {
  if (!evidenceKind(file.mediaType)) return 'type';
  if (file.byteSize <= 0) return 'empty';
  if (file.byteSize > maxBytes) return 'too_large';
  return null;
}

/** Strips paths and control characters from an uploaded file name. */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const cleaned = [...base]
    .filter((c) => c.charCodeAt(0) >= 0x20 && c !== '\u007f')
    .join('')
    .trim();
  return cleaned.slice(0, 200) || 'evidence';
}
