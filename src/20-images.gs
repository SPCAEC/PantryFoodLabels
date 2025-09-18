// ─────────────────────────────────────────────────────────────────────────────
// Image capture (front & ingredients) + DataURL helpers
// ─────────────────────────────────────────────────────────────────────────────

function captureFrontImage(upc, frontBlob) {
  const folder = getOrCreateUpcFolder_(upc);
  const ext = toExt_(frontBlob);
  folder.createFile(frontBlob).setName(`${normUPC(upc)}_front.${ext}`);

  // Stash folder for later (do not write to sheet yet)
  setTempFolderForUPC_(upc, folder.getId());
  setLastUPC_(upc);
  return { success: true };
}

function captureFrontImageFromDataURL(upc, dataUrl) {
  const parts       = dataUrl.split(',');
  const contentType = parts[0].match(/data:(.*);base64/)[1];
  const bytes       = Utilities.base64Decode(parts[1]);
  const blob        = Utilities.newBlob(bytes, contentType, `${upc}_front.jpg`);
  return captureFrontImage(upc, blob);
}

function captureIngredientsImage(upc, ingBlob) {
  const upcKey = normUPC(upc);
  const sh = getSheet_();
  const headers = getHeaders_(sh);
  const idxUPC = headers.indexOf('UPC');
  const idxFld = headers.indexOf('ImageFolderID');

  // 1) Prefer stashed folder id from front-photo step
  let folder = null;
  const tempId = getTempFolderForUPC_(upcKey);
  if (tempId) { try { folder = DriveApp.getFolderById(tempId); } catch(e) { folder = null; } }

  // 2) Else, use ImageFolderID on the matching row
  if (!folder) {
    const data = sh.getDataRange().getValues();
    let rowIndex = -1;
    for (let r = 1; r < data.length; r++) {
      if (normUPC(data[r][idxUPC]) === upcKey) { rowIndex = r; break; }
    }
    if (rowIndex > 0 && idxFld >= 0) {
      const fldId = String(data[rowIndex][idxFld] || '');
      if (fldId) { try { folder = DriveApp.getFolderById(fldId); } catch(e) { folder = null; } }
    }
  }

  // 3) Else, fallback to UPC-named subfolder under PHOTOS_FOLDER_ID
  if (!folder) folder = getOrCreateUpcFolder_(upcKey);

  // Save ingredients image
  const ext = toExt_(ingBlob);
  folder.createFile(ingBlob).setName(`${upcKey}_ingredients.${ext}`);

  // Ensure the front image exists in the same folder
  const files = folder.getFiles();
  let frontBlob = null;
  while (files.hasNext()) {
    const f = files.next();
    if (f.getName().startsWith(`${upcKey}_front.`)) { frontBlob = f.getBlob(); break; }
  }
  if (!frontBlob) throw new Error('Front image not found for UPC in folder: ' + folder.getName());

  // Extract structured data via Vision and normalize keys
  const extracted = extractFromImages(frontBlob, ingBlob);
  const out = normalizeKeys_({
    UPC:         upcKey,
    Species:     extracted.Species     || '',
    Brand:       extracted.Brand       || '',
    ProductName: extracted.ProductName || '',
    Flavor:      extracted.Flavor      || '',
    Ingredients: extracted.Ingredients || ''
  });
  setLastUPC_(upcKey);
  return out;
}

function captureIngredientsFromDataURL(upc, dataUrl) {
  const parts       = dataUrl.split(',');
  const contentType = parts[0].match(/data:(.*);base64/)[1];
  const bytes       = Utilities.base64Decode(parts[1]);
  const blob        = Utilities.newBlob(bytes, contentType, `${upc}_ingredients.jpg`);
  return captureIngredientsImage(upc, blob);
}