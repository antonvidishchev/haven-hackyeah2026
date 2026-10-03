-- Filing: the Smart Router's decision, the advisory recommendation, and the case that staff
-- work. All three are created in the same transaction that files the report.

-- The router's decision, frozen at filing. Every field is READONLY: it is never updated.
DEFINE TABLE IF NOT EXISTS routing_decision SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS report ON routing_decision TYPE record<report> READONLY;
DEFINE FIELD IF NOT EXISTS rule_id ON routing_decision TYPE string READONLY;
DEFINE FIELD IF NOT EXISTS ruleset_version ON routing_decision TYPE string READONLY;
-- sha256 hex of JSON.stringify(routerRules), so a later rules change is detectable.
DEFINE FIELD IF NOT EXISTS ruleset_digest ON routing_decision TYPE string READONLY;
DEFINE FIELD IF NOT EXISTS input_snapshot ON routing_decision TYPE object FLEXIBLE READONLY;
DEFINE FIELD IF NOT EXISTS result ON routing_decision TYPE object FLEXIBLE READONLY;
DEFINE FIELD IF NOT EXISTS created_at ON routing_decision TYPE datetime DEFAULT time::now() READONLY;
DEFINE INDEX IF NOT EXISTS routing_decision_report ON routing_decision FIELDS report UNIQUE;

-- The simulated advisory suggestion, computed once at filing. Staff only; never residents.
DEFINE TABLE IF NOT EXISTS recommendation SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS report ON recommendation TYPE record<report> READONLY;
DEFINE FIELD IF NOT EXISTS action ON recommendation TYPE string
  ASSERT $value IN ['request_more_evidence', 'transfer_to_ngo', 'none'];
DEFINE FIELD IF NOT EXISTS status ON recommendation TYPE string
  ASSERT $value IN ['suggested', 'abstained'];
DEFINE FIELD IF NOT EXISTS confidence ON recommendation TYPE float
  ASSERT $value >= 0 AND $value <= 1;
DEFINE FIELD IF NOT EXISTS rationale ON recommendation TYPE string;
DEFINE FIELD IF NOT EXISTS source ON recommendation TYPE string;
-- sha256 hex of the JSON input and output, for audit.
DEFINE FIELD IF NOT EXISTS input_hash ON recommendation TYPE string;
DEFINE FIELD IF NOT EXISTS output_hash ON recommendation TYPE string;
DEFINE FIELD IF NOT EXISTS created_at ON recommendation TYPE datetime DEFAULT time::now() READONLY;
DEFINE INDEX IF NOT EXISTS recommendation_report ON recommendation FIELDS report UNIQUE;

-- The case staff work on, one per filed report. `version` guards staff actions.
DEFINE TABLE IF NOT EXISTS haven_case SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS report ON haven_case TYPE record<report> READONLY;
DEFINE FIELD IF NOT EXISTS routing_decision ON haven_case TYPE record<routing_decision> READONLY;
DEFINE FIELD IF NOT EXISTS organization_id ON haven_case TYPE string
  ASSERT $value IN ['police_municipal', 'professional_paid', 'community_volunteer'];
DEFINE FIELD IF NOT EXISTS state ON haven_case TYPE string
  ASSERT $value IN ['open', 'in_review', 'closed', 'cancelled'];
DEFINE FIELD IF NOT EXISTS triage_status ON haven_case TYPE string
  ASSERT $value IN ['needs_review', 'awaiting_resident', 'handled'];
-- Copy of the routing queue, for sorting the operator queue.
DEFINE FIELD IF NOT EXISTS queue_priority ON haven_case TYPE string
  ASSERT $value IN ['normal', 'expedited', 'fast_laned', 'jumps_queue'];
DEFINE FIELD IF NOT EXISTS assigned_official ON haven_case TYPE option<record<principal>>;
DEFINE FIELD IF NOT EXISTS version ON haven_case TYPE int ASSERT $value >= 1;
DEFINE FIELD IF NOT EXISTS cancel_reason_category ON haven_case TYPE option<string>;
DEFINE FIELD IF NOT EXISTS cancel_comment ON haven_case TYPE option<string>;
DEFINE FIELD IF NOT EXISTS closure_comment ON haven_case TYPE option<string>;
DEFINE FIELD IF NOT EXISTS created_at ON haven_case TYPE datetime DEFAULT time::now() READONLY;
DEFINE FIELD IF NOT EXISTS updated_at ON haven_case TYPE datetime DEFAULT time::now();
DEFINE INDEX IF NOT EXISTS haven_case_report ON haven_case FIELDS report UNIQUE;
DEFINE INDEX IF NOT EXISTS haven_case_triage ON haven_case FIELDS triage_status;
DEFINE INDEX IF NOT EXISTS haven_case_organization ON haven_case FIELDS organization_id;

-- Messages on a case: requests to the resident, comments, cancellation notices.
DEFINE TABLE IF NOT EXISTS case_message SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS case ON case_message TYPE record<haven_case> READONLY;
DEFINE FIELD IF NOT EXISTS kind ON case_message TYPE string
  ASSERT $value IN ['request_information', 'comment', 'cancellation_notice'];
DEFINE FIELD IF NOT EXISTS body ON case_message TYPE string
  ASSERT string::len($value) >= 1 AND string::len($value) <= 1000;
DEFINE FIELD IF NOT EXISTS author ON case_message TYPE option<record<principal>> READONLY;
DEFINE FIELD IF NOT EXISTS created_at ON case_message TYPE datetime DEFAULT time::now() READONLY;
DEFINE INDEX IF NOT EXISTS case_message_case ON case_message FIELDS case;

-- Append-only audit of staff actions on a case.
DEFINE TABLE IF NOT EXISTS case_action SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS case ON case_action TYPE record<haven_case> READONLY;
DEFINE FIELD IF NOT EXISTS actor ON case_action TYPE record<principal> READONLY;
DEFINE FIELD IF NOT EXISTS type ON case_action TYPE string
  ASSERT $value IN ['operator.promote', 'operator.cancel', 'operator.reply', 'official.claim',
    'official.external_action', 'official.close'];
DEFINE FIELD IF NOT EXISTS payload ON case_action TYPE object FLEXIBLE DEFAULT {};
DEFINE FIELD IF NOT EXISTS recommendation ON case_action TYPE option<record<recommendation>>;
DEFINE FIELD IF NOT EXISTS disposition ON case_action TYPE option<string>
  ASSERT $value = NONE OR $value IN ['followed', 'rejected', 'different'];
DEFINE FIELD IF NOT EXISTS prior_version ON case_action TYPE int;
DEFINE FIELD IF NOT EXISTS resulting_version ON case_action TYPE int;
DEFINE FIELD IF NOT EXISTS created_at ON case_action TYPE datetime DEFAULT time::now() READONLY;
DEFINE INDEX IF NOT EXISTS case_action_case ON case_action FIELDS case;

-- Residents can now escalate a filed report.
DEFINE FIELD OVERWRITE note ON report_revision TYPE string
  ASSERT $value IN ['created', 'edited', 'evidence_added', 'filed', 'escalated'];
