-- Online harassment has no district, so it is no longer an incident type. Existing reports of
-- that type become 'other', then the category checks drop it.
UPDATE report SET fields.category = 'other' WHERE fields.category = 'online_harassment';
UPDATE report_revision SET fields.category = 'other' WHERE fields.category = 'online_harassment';
UPDATE support_resource SET categories = array::complement(categories, ['online_harassment'])
  WHERE categories CONTAINS 'online_harassment';

DEFINE FIELD OVERWRITE fields.category ON report TYPE string
  ASSERT $value IN ['unclassified', 'verbal_harassment', 'physical_intimidation', 'threat',
    'discrimination', 'vandalism_hate_symbols', 'other'];
DEFINE FIELD OVERWRITE fields.category ON report_revision TYPE string
  ASSERT $value IN ['unclassified', 'verbal_harassment', 'physical_intimidation', 'threat',
    'discrimination', 'vandalism_hate_symbols', 'other'];
