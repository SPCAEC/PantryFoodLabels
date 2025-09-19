// ─────────────────────────────────────────────────────────────────────────────
// Config (constants / script properties)
// ─────────────────────────────────────────────────────────────────────────────
const SHEET_ID        = PropertiesService.getScriptProperties().getProperty('DATA_SHEET_ID');
const DATA_SHEET_NAME = 'Pet Pantry UPC Database';
const PHOTOS_FOLDER_ID= '1GtZ3eQ9Bfx4VwdbflhSAmNaz5TxmY0of';
const TEMPLATE_ID     = '1GOKk-R-OWG_lERehz-Bb5-RwsbXxExkObV-z7ZawrJA';
const LABEL_FOLDER_ID = '1uJQUgS6JPwn-f8aOrgku5rWevM-9zxEX';
const OPENAI_MODEL    = 'gpt-4o';

// ScriptProperty key used to loosely track the most-recent UPC in this flow
const KEY_LAST_UPC    = 'LAST_UPC';

// ─────────────────────────────────────────────────────────────────────────────
// Scandit license getter (reads SCANDIT_LICENSE_KEY from Script Properties)
// ─────────────────────────────────────────────────────────────────────────────
function getScanditLicense() {
  const key = PropertiesService.getScriptProperties().getProperty('SCANDIT_LICENSE_KEY');
  if (!key) throw new Error('Missing SCANDIT_LICENSE_KEY in Script Properties');
  return key;
}

// ─────────────────────────────────────────────────────────────────────────────
// Config sanity checks (useful to call from doGet or early utilities)
// ─────────────────────────────────────────────────────────────────────────────
function assertConfig_() {
  const missing = [];
  if (!SHEET_ID)        missing.push('DATA_SHEET_ID');
  if (!DATA_SHEET_NAME) missing.push('DATA_SHEET_NAME (hardcoded)');
  if (!PHOTOS_FOLDER_ID)missing.push('PHOTOS_FOLDER_ID (hardcoded)');
  if (!TEMPLATE_ID)     missing.push('TEMPLATE_ID (hardcoded)');
  if (!LABEL_FOLDER_ID) missing.push('LABEL_FOLDER_ID (hardcoded)');
  if (!OPENAI_MODEL)    missing.push('OPENAI_MODEL (hardcoded)');
  // SCANDIT_LICENSE_KEY is optional unless scanner is used on this request
  // OPENAI_API_KEY checked at call site in vision helper

  if (missing.length) {
    throw new Error('Config error — missing: ' + missing.join(', '));
  }
  return true;
}

/**
 * Optional helper you can log from doGet() while debugging.
 */
function getConfigDebugInfo() {
  return {
    hasSheetId: !!SHEET_ID,
    sheetName: DATA_SHEET_NAME,
    hasPhotosFolder: !!PHOTOS_FOLDER_ID,
    hasTemplate: !!TEMPLATE_ID,
    hasLabelFolder: !!LABEL_FOLDER_ID,
    model: OPENAI_MODEL
  };
}