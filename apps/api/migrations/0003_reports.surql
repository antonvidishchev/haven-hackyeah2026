-- Reports: a resident's account of an incident, a draft until it is filed.
-- `fields` mirrors the shared ReportFields shape exactly, nulls included.
DEFINE TABLE IF NOT EXISTS report SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS owner ON report TYPE record<principal> READONLY;
DEFINE FIELD IF NOT EXISTS reference ON report TYPE option<string>;
DEFINE FIELD IF NOT EXISTS state ON report TYPE string ASSERT $value IN ['draft', 'submitted'];
DEFINE FIELD IF NOT EXISTS current_revision ON report TYPE int ASSERT $value >= 1;
DEFINE FIELD IF NOT EXISTS fields ON report TYPE object;
DEFINE FIELD IF NOT EXISTS fields.category ON report TYPE string
  ASSERT $value IN ['unclassified', 'verbal_harassment', 'physical_intimidation', 'threat',
    'discrimination', 'online_harassment', 'vandalism_hate_symbols', 'other'];
DEFINE FIELD IF NOT EXISTS fields.severity ON report TYPE string | null
  ASSERT $value = NULL OR $value IN ['low', 'medium', 'high', 'emergency'];
DEFINE FIELD IF NOT EXISTS fields.weaponOrImmediateThreat ON report TYPE bool;
DEFINE FIELD IF NOT EXISTS fields.isRepeatIncident ON report TYPE bool;
-- Kept as the ISO string the resident sent, so its UTC offset survives the round trip.
DEFINE FIELD IF NOT EXISTS fields.eventTime ON report TYPE string | null;
DEFINE FIELD IF NOT EXISTS fields.description ON report TYPE string;
DEFINE FIELD IF NOT EXISTS fields.location ON report TYPE { lat: number, lng: number } | null;
DEFINE FIELD IF NOT EXISTS fields.locationLabel ON report TYPE string;
DEFINE FIELD IF NOT EXISTS fields.zoneId ON report TYPE string | null;
-- Mirrors fields.zoneId for the (state, zone) queue queries.
DEFINE FIELD IF NOT EXISTS zone_id ON report TYPE option<string>;
DEFINE FIELD IF NOT EXISTS escalated ON report TYPE bool DEFAULT false;
DEFINE FIELD IF NOT EXISTS escalated_at ON report TYPE option<datetime>;
DEFINE FIELD IF NOT EXISTS submitted_at ON report TYPE option<datetime>;
DEFINE FIELD IF NOT EXISTS created_at ON report TYPE datetime DEFAULT time::now() READONLY;
DEFINE FIELD IF NOT EXISTS updated_at ON report TYPE datetime DEFAULT time::now();
DEFINE INDEX IF NOT EXISTS report_owner ON report FIELDS owner;
DEFINE INDEX IF NOT EXISTS report_reference ON report FIELDS reference UNIQUE;
DEFINE INDEX IF NOT EXISTS report_state_zone ON report FIELDS state, zone_id;

-- Every saved version of a report's fields, append-only.
DEFINE TABLE IF NOT EXISTS report_revision SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS report ON report_revision TYPE record<report> READONLY;
DEFINE FIELD IF NOT EXISTS revision ON report_revision TYPE int ASSERT $value >= 1 READONLY;
DEFINE FIELD IF NOT EXISTS fields ON report_revision TYPE object;
DEFINE FIELD IF NOT EXISTS fields.category ON report_revision TYPE string
  ASSERT $value IN ['unclassified', 'verbal_harassment', 'physical_intimidation', 'threat',
    'discrimination', 'online_harassment', 'vandalism_hate_symbols', 'other'];
DEFINE FIELD IF NOT EXISTS fields.severity ON report_revision TYPE string | null
  ASSERT $value = NULL OR $value IN ['low', 'medium', 'high', 'emergency'];
DEFINE FIELD IF NOT EXISTS fields.weaponOrImmediateThreat ON report_revision TYPE bool;
DEFINE FIELD IF NOT EXISTS fields.isRepeatIncident ON report_revision TYPE bool;
-- Kept as the ISO string the resident sent, so its UTC offset survives the round trip.
DEFINE FIELD IF NOT EXISTS fields.eventTime ON report_revision TYPE string | null;
DEFINE FIELD IF NOT EXISTS fields.description ON report_revision TYPE string;
DEFINE FIELD IF NOT EXISTS fields.location ON report_revision TYPE { lat: number, lng: number } | null;
DEFINE FIELD IF NOT EXISTS fields.locationLabel ON report_revision TYPE string;
DEFINE FIELD IF NOT EXISTS fields.zoneId ON report_revision TYPE string | null;
DEFINE FIELD IF NOT EXISTS note ON report_revision TYPE string
  ASSERT $value IN ['created', 'edited', 'evidence_added', 'filed'];
DEFINE FIELD IF NOT EXISTS author ON report_revision TYPE record<principal> READONLY;
DEFINE FIELD IF NOT EXISTS created_at ON report_revision TYPE datetime DEFAULT time::now() READONLY;
DEFINE INDEX IF NOT EXISTS report_revision_report_revision ON report_revision
  FIELDS report, revision UNIQUE;

-- Filing references, HV-YYYY-NNNNNN: one counter record per year, keyed by the year.
DEFINE TABLE IF NOT EXISTS report_reference_counter SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS value ON report_reference_counter TYPE int DEFAULT 0;
DEFINE FUNCTION IF NOT EXISTS fn::next_report_reference($year: int) -> string {
  LET $row = UPSERT type::record('report_reference_counter', $year) SET value += 1 RETURN AFTER;
  LET $sequence = <string>$row[0].value;
  RETURN 'HV-' + <string>$year + '-'
    + string::repeat('0', math::max([0, 6 - string::len($sequence)])) + $sequence;
};
