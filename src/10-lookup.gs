// ─────────────────────────────────────────────────────────────────────────────
// Lookup
// ─────────────────────────────────────────────────────────────────────────────
/** Returns {found:true, data:{...}} when UPC exists; else {found:false, isNew:true} */
function lookupUPC(upcInput) {
  const sh = getSheet_();
  const all = sh.getDataRange().getValues();
  const headers = all.shift();
  const idxUPC = headers.indexOf('UPC');

  if (idxUPC < 0) throw new Error('Sheet missing UPC column');

  // 1) Canonical target we want to find
  const want12   = toUPC12_(upcInput);           // always 12 chars
  const wantBare = stripLeadingZeros_(upcInput); // legacy fallback

  // 2) First pass: exact 12-digit match (preferred)
  for (const r of all) {
    if (String(r[idxUPC]) === want12) {
      const cols = ['UPC','Species','Brand','Product Name','Flavor','Ingredients','ImageFolderID','isTreat'];
      const out = {};
      cols.forEach(c => { const i = headers.indexOf(c); out[c] = i >= 0 ? r[i] : ''; });
      return { found: true, data: out };
    }
  }

  // 3) Second pass: legacy match ignoring leading zeros (old numeric rows)
  for (const r of all) {
    if (stripLeadingZeros_(r[idxUPC]) === wantBare) {
      const cols = ['UPC','Species','Brand','Product Name','Flavor','Ingredients','ImageFolderID','isTreat'];
      const out = {};
      cols.forEach(c => { const i = headers.indexOf(c); out[c] = i >= 0 ? r[i] : ''; });
      return { found: true, data: out };
    }
  }

  // Not found → remember last UPC and mark as new
  setLastUPC_(want12);
  return { found: false, isNew: true };
}