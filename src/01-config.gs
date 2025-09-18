// ─────────────────────────────────────────────────────────────────────────────
// Config (constants / script properties)
// ─────────────────────────────────────────────────────────────────────────────
const SHEET_ID          = PropertiesService.getScriptProperties().getProperty('DATA_SHEET_ID');
const DATA_SHEET_NAME   = 'Pet Pantry UPC Database';
const PHOTOS_FOLDER_ID  = '1GtZ3eQ9Bfx4VwdbflhSAmNaz5TxmY0of';
const TEMPLATE_ID       = '1GOKk-R-OWG_lERehz-Bb5-RwsbXxExkObV-z7ZawrJA';
const LABEL_FOLDER_ID   = '1uJQUgS6JPwn-f8aOrgku5rWevM-9zxEX';
const OPENAI_MODEL      = 'gpt-4o';

// ScriptProperty key used to loosely track the most-recent UPC in this flow
const KEY_LAST_UPC = 'LAST_UPC';