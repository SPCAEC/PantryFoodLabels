// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/** Spreadsheet & headers */
function getSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(DATA_SHEET_NAME);
  if (!sh) throw new Error('Sheet not found: ' + DATA_SHEET_NAME);
  return sh;
}
function getHeaders_(sh) {
  return sh.getDataRange().getValues()[0];
}

/** “Last UPC” scratch value kept in Script Properties (used by flows) */
function setLastUPC_(upc) {
  if (upc != null) {
    PropertiesService.getScriptProperties().setProperty(KEY_LAST_UPC, String(upc));
  }
}
function getLastUPC_() {
  return PropertiesService.getScriptProperties().getProperty(KEY_LAST_UPC);
}

/** File extension from Blob content-type with JPG fallback */
function toExt_(blob) {
  const ct = blob && blob.getContentType && blob.getContentType();
  const m = ct && ct.split('/')[1];
  return m || 'jpg';
}

/** Keep parity between "ProductName" and "Product Name" */
function normalizeKeys_(obj) {
  obj = obj || {};
  if (obj['Product Name'] && !obj.ProductName) obj.ProductName = obj['Product Name'];
  if (obj.ProductName && !obj['Product Name']) obj['Product Name'] = obj.ProductName;
  return obj;
}

// ─────────────────────────────────────────────────────────────────────────────
// UPC helpers (canonical + legacy-safe fallbacks)
// ─────────────────────────────────────────────────────────────────────────────

/** Digits only (no spaces, no punctuation) */
function digits_(s) {
  return String(s || '').replace(/\D/g, '');
}

/**
 * Canonical 12-digit UPC string.
 * - Removes non-digits
 * - If 13+ digits (e.g., EAN-13), take the LAST 12
 * - If <12 digits, LEFT-PAD with zeros
 * This NEVER drops leading zeros in the final return value.
 */
function toUPC12_(u) {
  const d = digits_(u);
  if (d.length >= 12) return d.slice(-12);
  return d.padStart(12, '0');
}

/**
 * Legacy stripped form (removes leading zeros).
 * Use ONLY for fallback matching against legacy rows that may have been saved
 * as numbers (and thereby lost their leading zeros).
 */
function stripLeadingZeros_(u) {
  return digits_(u).replace(/^0+/, '');
}

/** Digits-only normalizer (used for Drive folder names, etc.) */
function normUPC(u) {
  return digits_(u);
}

/** Previous legacy helper: remove leading zeros (keep for compatibility) */
function normUPC_(u) {
  return String(u || '').replace(/^0+/, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Sheet column helpers (force text in UPC column to preserve leading zeros)
// ─────────────────────────────────────────────────────────────────────────────

function getUPCColIndex_() {
  const headers = getHeaders_(getSheet_());
  const idx = headers.indexOf('UPC');
  if (idx < 0) throw new Error('Sheet missing UPC column');
  return idx + 1; // 1-based
}

/** Force the entire UPC column to Plain Text so Google Sheets won’t strip zeros */
function ensureUPCColumnPlainText_() {
  const sh = getSheet_();
  const col = getUPCColIndex_();
  sh.getRange(1, col, Math.max(1, sh.getMaxRows()), 1).setNumberFormat('@');
}

// ─────────────────────────────────────────────────────────────────────────────
// Misc helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Coerce mixed truthy inputs to "Yes"/"No" */
function toYesNo(v) {
  const s = String(v || '').trim().toLowerCase();
  return (/^(yes|y|true|on|1|treat|treats)$/).test(s) ? 'Yes' : 'No';
}

// ─────────────────────────────────────────────────────────────────────────────
// Temporary photo-folder binding (avoid placeholder writes)
// ─────────────────────────────────────────────────────────────────────────────

function setTempFolderForUPC_(upc, folderId) {
  PropertiesService.getScriptProperties().setProperty('FOLDER_' + normUPC(upc), folderId);
}
function getTempFolderForUPC_(upc) {
  return PropertiesService.getScriptProperties().getProperty('FOLDER_' + normUPC(upc));
}
function clearTempFolderForUPC_(upc) {
  PropertiesService.getScriptProperties().deleteProperty('FOLDER_' + normUPC(upc));
}

/** Create or reuse a UPC-named subfolder under PHOTOS_FOLDER_ID */
function getOrCreateUpcFolder_(upc) {
  const parent = DriveApp.getFolderById(PHOTOS_FOLDER_ID);
  const name = normUPC(upc); // folder name = digits only (no padding needed)
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}