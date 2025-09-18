// ─────────────────────────────────────────────────────────────────────────────
// Save to Sheet (upsert)
// ─────────────────────────────────────────────────────────────────────────────
function saveRecord(data) {
  const sh = getSheet_();
  const headers = getHeaders_(sh);
  const idxUPC = headers.indexOf('UPC');
  const idxFld = headers.indexOf('ImageFolderID');

  const upcRaw = (data && (data.UPC || data['UPC'])) || getLastUPC_();
  if (!upcRaw) throw new Error('Missing UPC for save.');
  const upcNorm = (typeof normUPC === 'function') ? normUPC(upcRaw) : String(upcRaw);

  data = normalizeKeys_(data);

  // Normalize checkbox to Yes/No
  const isTreatYN = toYesNo(data.isTreat);

  // Attach stashed folder id if present
  const tempFolderId = (typeof getTempFolderForUPC_ === 'function') ? getTempFolderForUPC_(upcNorm) : null;
  if (tempFolderId) data.ImageFolderID = tempFolderId;

  const buildRow = (d) => headers.map(h => {
    switch (h) {
      case 'UPC':            return String(upcRaw);        // keep raw (with leading zeros)
      case 'Product Name':   return d.ProductName || '';
      case 'ImageFolderID':  return d.ImageFolderID || '';
      case 'isTreat':        return isTreatYN;             // Yes/No
      default:               return d[h] || '';
    }
  });

  const all = sh.getDataRange().getValues();
  let targetRow = -1;
  for (let r = 1; r < all.length; r++) {
    const sheetNorm = (typeof normUPC === 'function') ? normUPC(all[r][idxUPC]) : String(all[r][idxUPC]);
    if (sheetNorm === upcNorm) { targetRow = r + 1; break; }
  }

  const rowValues = [buildRow(data)];
  if (targetRow > 0) {
    sh.getRange(targetRow, 1, 1, headers.length).setValues(rowValues);
  } else {
    sh.appendRow(rowValues[0]);
  }

  if (tempFolderId && typeof clearTempFolderForUPC_ === 'function') clearTempFolderForUPC_(upcNorm);
  return { success: true };
}