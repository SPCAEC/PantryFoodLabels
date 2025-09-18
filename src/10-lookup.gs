// ─────────────────────────────────────────────────────────────────────────────
// Lookup
// ─────────────────────────────────────────────────────────────────────────────
/** Returns {found:true, data:{...}} when UPC exists; else {found:false, isNew:true} */
function lookupUPC(upc) {
  const sh = getSheet_();
  const rows = sh.getDataRange().getValues();
  const headers = rows.shift();
  const idxUPC = headers.indexOf('UPC');

  const target = (typeof normUPC === 'function') ? normUPC(upc) : String(upc);

  for (const r of rows) {
    const got = (typeof normUPC === 'function') ? normUPC(r[idxUPC]) : String(r[idxUPC]);
    if (got === target) {
      const cols = ['UPC','Species','Brand','Product Name','Flavor','Ingredients','ImageFolderID','isTreat'];
      const out = {};
      cols.forEach(c => { const i = headers.indexOf(c); out[c] = i >= 0 ? r[i] : ''; });
      return { found: true, data: out };
    }
  }
  setLastUPC_(upc);
  return { found: false, isNew: true };
}