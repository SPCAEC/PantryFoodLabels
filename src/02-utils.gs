// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function getSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(DATA_SHEET_NAME);
  if (!sh) throw new Error('Sheet not found: ' + DATA_SHEET_NAME);
  return sh;
}

function getHeaders_(sh) {
  return sh.getDataRange().getValues()[0];
}

function setLastUPC_(upc) {
  if (upc) PropertiesService.getScriptProperties().setProperty(KEY_LAST_UPC, String(upc));
}

function getLastUPC_() {
  return PropertiesService.getScriptProperties().getProperty(KEY_LAST_UPC);
}

function toExt_(blob) {
  const ct = blob.getContentType();
  const m = ct && ct.split('/')[1];
  return m || 'jpg';
}

// Keep parity between "ProductName" and "Product Name"
function normalizeKeys_(obj) {
  if (obj && obj['Product Name'] && !obj.ProductName) obj.ProductName = obj['Product Name'];
  if (obj && obj.ProductName && !obj['Product Name']) obj['Product Name'] = obj.ProductName;
  return obj || {};
}

function getUPCColIndex_() {
  const headers = getHeaders_(getSheet_());
  const idx = headers.indexOf('UPC');
  if (idx < 0) throw new Error('Sheet missing UPC column');
  return idx + 1; // 1-based
}

function ensureUPCColumnPlainText_() {
  const sh = getSheet_();
  const col = getUPCColIndex_();
  sh.getRange(1, col, sh.getMaxRows(), 1).setNumberFormat('@'); // force text
}

// Remove leading zeros (used in some legacy flows)
function normUPC_(u) {
  return String(u || '').replace(/^0+/, '');
}

// Digits-only normalizer used for comparisons and folder names
function normUPC(u) {
  return String(u || '').replace(/\D/g, '');
}

// Coerce mixed truthy inputs to "Yes"/"No"
function toYesNo(v) {
  const s = String(v || '').trim().toLowerCase();
  return (/^(yes|y|true|on|1|treat|treats)$/).test(s) ? 'Yes' : 'No';
}

// Temp photo folder binding (avoid placeholder writes)
function setTempFolderForUPC_(upc, folderId) {
  PropertiesService.getScriptProperties().setProperty('FOLDER_' + normUPC(upc), folderId);
}
function getTempFolderForUPC_(upc) {
  return PropertiesService.getScriptProperties().getProperty('FOLDER_' + normUPC(upc));
}
function clearTempFolderForUPC_(upc) {
  PropertiesService.getScriptProperties().deleteProperty('FOLDER_' + normUPC(upc));
}

// Create or reuse a UPC subfolder under PHOTOS_FOLDER_ID
function getOrCreateUpcFolder_(upc) {
  const parent = DriveApp.getFolderById(PHOTOS_FOLDER_ID);
  const name = normUPC(upc);
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}