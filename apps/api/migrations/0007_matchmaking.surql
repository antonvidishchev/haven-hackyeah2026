-- Support matchmaking: fictional city resources residents can be pointed to.
-- Folded words cut into edge n-grams, so "tram" matches "tramwaju" and "grozby" matches "groźby".
DEFINE ANALYZER IF NOT EXISTS haven_text TOKENIZERS blank, class
  FILTERS lowercase, ascii, edgengram(3, 12);

DEFINE TABLE IF NOT EXISTS support_resource SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS slug ON support_resource TYPE string;
DEFINE FIELD IF NOT EXISTS kind ON support_resource TYPE string
  ASSERT $value IN ['legal_aid', 'translation', 'psychological_support', 'victim_support', 'ngo',
    'helpline', 'community_mediation', 'digital_safety'];
DEFINE FIELD IF NOT EXISTS name_en ON support_resource TYPE string;
DEFINE FIELD IF NOT EXISTS name_pl ON support_resource TYPE string;
DEFINE FIELD IF NOT EXISTS description_en ON support_resource TYPE string;
DEFINE FIELD IF NOT EXISTS description_pl ON support_resource TYPE string;
DEFINE FIELD IF NOT EXISTS categories ON support_resource TYPE array<string>;
-- Empty means citywide.
DEFINE FIELD IF NOT EXISTS districts ON support_resource TYPE array<string>;
DEFINE FIELD IF NOT EXISTS languages ON support_resource TYPE array<string>;
DEFINE FIELD IF NOT EXISTS severities ON support_resource TYPE array<string>;
DEFINE FIELD IF NOT EXISTS keywords_en ON support_resource TYPE array<string>;
DEFINE FIELD IF NOT EXISTS keywords_pl ON support_resource TYPE array<string>;
-- Always clearly fictional (example.org, 000 numbers).
DEFINE FIELD IF NOT EXISTS contact ON support_resource TYPE string;
DEFINE FIELD IF NOT EXISTS available_hours ON support_resource TYPE object;
DEFINE FIELD IF NOT EXISTS available_hours.en ON support_resource TYPE string;
DEFINE FIELD IF NOT EXISTS available_hours.pl ON support_resource TYPE string;
DEFINE INDEX IF NOT EXISTS support_resource_slug ON support_resource FIELDS slug UNIQUE;

DEFINE INDEX IF NOT EXISTS support_resource_description_en ON support_resource
  FIELDS description_en FULLTEXT ANALYZER haven_text BM25;
DEFINE INDEX IF NOT EXISTS support_resource_description_pl ON support_resource
  FIELDS description_pl FULLTEXT ANALYZER haven_text BM25;
DEFINE INDEX IF NOT EXISTS support_resource_keywords_en ON support_resource
  FIELDS keywords_en FULLTEXT ANALYZER haven_text BM25;
DEFINE INDEX IF NOT EXISTS support_resource_keywords_pl ON support_resource
  FIELDS keywords_pl FULLTEXT ANALYZER haven_text BM25;
