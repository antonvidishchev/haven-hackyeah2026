-- Identity: everyone who acts in Haven, including anonymous guests.
DEFINE TABLE IF NOT EXISTS principal SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS kind ON principal TYPE string
  ASSERT $value IN ['guest', 'resident', 'operator', 'official', 'admin'];
DEFINE FIELD IF NOT EXISTS username ON principal TYPE option<string>;
DEFINE FIELD IF NOT EXISTS password_hash ON principal TYPE option<string>;
DEFINE FIELD IF NOT EXISTS display_name ON principal TYPE string;
DEFINE FIELD IF NOT EXISTS organization_id ON principal TYPE option<string>
  ASSERT $value = NONE OR $value IN ['police_municipal', 'professional_paid', 'community_volunteer'];
DEFINE FIELD IF NOT EXISTS created_at ON principal TYPE datetime DEFAULT time::now() READONLY;
DEFINE INDEX IF NOT EXISTS principal_username ON principal FIELDS username UNIQUE;
