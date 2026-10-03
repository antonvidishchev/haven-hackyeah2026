-- Migration bookkeeping. Every later migration is recorded here with its checksum.
DEFINE TABLE IF NOT EXISTS schema_migration SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS name ON schema_migration TYPE string;
DEFINE FIELD IF NOT EXISTS checksum ON schema_migration TYPE string;
DEFINE FIELD IF NOT EXISTS applied_at ON schema_migration TYPE datetime DEFAULT time::now();
DEFINE INDEX IF NOT EXISTS schema_migration_name ON schema_migration FIELDS name UNIQUE;
