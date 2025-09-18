// ─────────────────────────────────────────────────────────────────────────────
// Save to Sheet (upsert)
// ─────────────────────────────────────────────────────────────────────────────
// ─── Save to Sheet (super-safe UPC text) ────────────────────────────────────
function saveRecord(data) {
  const sh = getSheet_();
  const headers = getHeaders_(sh);
  const idxUPC = headers.indexOf('UPC');
  const idxFld = headers.indexOf('ImageFolderID');

  const upcRaw = (data && (data.UPC || data['UPC'])) || getLastUPC_();
  if (!upcRaw) throw new Error('Missing UPC for save.');
  const upcNorm = (typeof normUPC === 'function') ? normUPC(upcRaw) : String(upcRaw);

  data = normalizeKeys_(data);

  // Normalize checkbox value to Yes/No (defaults to "No")
  const isTreatYN = toYesNo(data.isTreat);

  // Attach stashed folder id from front-photo step, if any
  const tempFolderId = (typeof getTempFolderForUPC_ === 'function') ? getTempFolderForUPC_(upcNorm) : null;
  if (tempFolderId) data.ImageFolderID = tempFolderId;

  // Safety: force entire UPC column to Plain text before writing
  ensureUPCColumnPlainText_();

  const buildRow = (d) => headers.map(h => {
    switch (h) {
      case 'UPC':            return String(upcRaw);            // keep raw (with leading zeros)
      case 'Product Name':   return d.ProductName || '';
      case 'ImageFolderID':  return d.ImageFolderID || '';
      case 'isTreat':        return isTreatYN;                 // Yes/No
      default:               return d[h] || '';
    }
  });

  // Find target row by normalized UPC (match regardless of sheet formatting)
  const all = sh.getDataRange().getValues();
  let targetRow = -1;
  for (let r = 1; r < all.length; r++) {
    const sheetNorm = (typeof normUPC === 'function') ? normUPC(all[r][idxUPC]) : String(all[r][idxUPC]);
    if (sheetNorm === upcNorm) { targetRow = r + 1; break; }
  }

  const rowValues = [buildRow(data)];

  if (targetRow > 0) {
    // Update row
    sh.getRange(targetRow, 1, 1, headers.length).setValues(rowValues);
    // Re-force this specific UPC cell to Plain text and re-set its value as a string
    sh.getRange(targetRow, idxUPC + 1).setNumberFormat('@').setValue(String(upcRaw));
  } else {
    // Append row
    sh.appendRow(rowValues[0]);
    const lastRow = sh.getLastRow();
    // Re-force the appended UPC cell to Plain text and re-set its value as a string
    sh.getRange(lastRow, idxUPC + 1).setNumberFormat('@').setValue(String(upcRaw));
  }

  if (tempFolderId && typeof clearTempFolderForUPC_ === 'function') clearTempFolderForUPC_(upcNorm);
  return { success: true };
}