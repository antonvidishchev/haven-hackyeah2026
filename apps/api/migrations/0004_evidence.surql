-- Evidence: files a resident attached to a report. Bytes live on disk under EVIDENCE_DIR;
-- `storage_path` is relative to it.
DEFINE TABLE IF NOT EXISTS evidence SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS report ON evidence TYPE record<report> READONLY;
DEFINE FIELD IF NOT EXISTS owner ON evidence TYPE record<principal> READONLY;
DEFINE FIELD IF NOT EXISTS file_name ON evidence TYPE string;
DEFINE FIELD IF NOT EXISTS media_type ON evidence TYPE string;
DEFINE FIELD IF NOT EXISTS byte_size ON evidence TYPE int ASSERT $value > 0;
DEFINE FIELD IF NOT EXISTS sha256 ON evidence TYPE string;
DEFINE FIELD IF NOT EXISTS storage_path ON evidence TYPE string;
DEFINE FIELD IF NOT EXISTS created_at ON evidence TYPE datetime DEFAULT time::now() READONLY;
DEFINE INDEX IF NOT EXISTS evidence_report ON evidence FIELDS report;
