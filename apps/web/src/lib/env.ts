import 'server-only';

/** Base URL of the Haven API, including `/api/v1`. Server-side only. */
export const apiBaseUrl = process.env.HAVEN_API_URL ?? 'http://127.0.0.1:3001/api/v1';

/** The API's upload limit, mirrored so the picker can refuse big files before uploading. */
export const evidenceMaxBytes = Number(process.env.EVIDENCE_MAX_BYTES ?? 104_857_600);
