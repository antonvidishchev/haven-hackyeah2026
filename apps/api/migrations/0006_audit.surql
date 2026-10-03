-- The audit trail: one row per state change. Append-only: every field is READONLY and an
-- event refuses updates and deletes, so a row can only ever be created.
DEFINE TABLE IF NOT EXISTS audit_event SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS actor ON audit_event TYPE option<record<principal>> READONLY;
DEFINE FIELD IF NOT EXISTS actor_role ON audit_event TYPE string READONLY
  ASSERT $value IN ['guest', 'resident', 'operator', 'official', 'admin', 'anonymous'];
DEFINE FIELD IF NOT EXISTS action ON audit_event TYPE string READONLY;
-- `table:id` of what the action touched, when there is one.
DEFINE FIELD IF NOT EXISTS subject_type ON audit_event TYPE option<string> READONLY
  ASSERT $value = NONE OR $value IN ['principal', 'report', 'evidence', 'haven_case'];
DEFINE FIELD IF NOT EXISTS subject_id ON audit_event TYPE option<string> READONLY;
-- Ids, enums and lengths only; the API sanitises it before writing.
DEFINE FIELD IF NOT EXISTS meta ON audit_event TYPE object FLEXIBLE READONLY;
DEFINE FIELD IF NOT EXISTS occurred_at ON audit_event TYPE datetime DEFAULT time::now() READONLY;
DEFINE INDEX IF NOT EXISTS audit_event_time ON audit_event FIELDS occurred_at;
DEFINE INDEX IF NOT EXISTS audit_event_action ON audit_event FIELDS action, occurred_at;
DEFINE INDEX IF NOT EXISTS audit_event_actor ON audit_event FIELDS actor, occurred_at;
DEFINE EVENT IF NOT EXISTS audit_event_append_only ON audit_event
  WHEN $event != "CREATE" THEN { THROW "audit_event is append-only" };
