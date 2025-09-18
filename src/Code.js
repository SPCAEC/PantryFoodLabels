// ─────────────────────────────────────────────────────────────────────────────
// Food Backend (Apps Script) — wired for the new Food Frontend flow
// ─────────────────────────────────────────────────────────────────────────────

// ─── Config ─────────────────────────────────────────────────────────────────
const SHEET_ID          = PropertiesService.getScriptProperties().getProperty('DATA_SHEET_ID');
const DATA_SHEET_NAME   = 'Pet Pantry UPC Database';
const PHOTOS_FOLDER_ID  = '1GtZ3eQ9Bfx4VwdbflhSAmNaz5TxmY0of';
const TEMPLATE_ID       = '1GOKk-R-OWG_lERehz-Bb5-RwsbXxExkObV-z7ZawrJA';
const LABEL_FOLDER_ID   = '1uJQUgS6JPwn-f8aOrgku5rWevM-9zxEX';
const OPENAI_MODEL      = 'gpt-4o';

// ScriptProperty key used to loosely track the most-recent UPC in this flow
const KEY_LAST_UPC = 'LAST_UPC';

// ─── Utilities ───────────────────────────────────────────────────────────────
function getSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(DATA_SHEET_NAME);
  if (!sh) throw new Error('Sheet not found: ' + DATA_SHEET_NAME);
  return sh;
}
function getHeaders_(sh) { return sh.getDataRange().getValues()[0]; }
function setLastUPC_(upc) { if (upc) PropertiesService.getScriptProperties().setProperty(KEY_LAST_UPC, String(upc)); }
function getLastUPC_()    { return PropertiesService.getScriptProperties().getProperty(KEY_LAST_UPC); }
function toExt_(blob)     { const ct = blob.getContentType(); const m = ct && ct.split('/')[1]; return m || 'jpg'; }
function normalizeKeys_(obj) {
  // Ensure both `ProductName` and `Product Name` parity for downstream use
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
  // Set the entire UPC column to plain text format
  sh.getRange(1, col, sh.getMaxRows(), 1).setNumberFormat('@');
}

function normUPC_(u) {
  return String(u || '').replace(/^0+/, ''); // remove leading zeros
}

// Coerce mixed truthy inputs to "Yes"/"No"
function toYesNo(v){
  const s = String(v || '').trim().toLowerCase();
  return (/^(yes|y|true|on|1|treat|treats)$/).test(s) ? 'Yes' : 'No';
}

// ─── De-dupe helpers ────────────────────────────────────────────────────────
function normUPC(u){ return String(u || '').replace(/\D/g, ''); }

function setTempFolderForUPC_(upc, folderId){
  PropertiesService.getScriptProperties().setProperty('FOLDER_' + normUPC(upc), folderId);
}
function getTempFolderForUPC_(upc){
  return PropertiesService.getScriptProperties().getProperty('FOLDER_' + normUPC(upc));
}
function clearTempFolderForUPC_(upc){
  PropertiesService.getScriptProperties().deleteProperty('FOLDER_' + normUPC(upc));
}

function getOrCreateUpcFolder_(upc){
  const parent = DriveApp.getFolderById(PHOTOS_FOLDER_ID);
  const name = normUPC(upc);
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

// ─── Web entrypoint ─────────────────────────────────────────────────────────
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('Pet Food Pantry Label Creator');
}

// ─── Lookup ─────────────────────────────────────────────────────────────────
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
      const cols = ['UPC','Species','Brand','Product Name','Flavor','Ingredients','ImageFolderID','isTreat']; // ← added
      const out = {};
      cols.forEach(c => { const i = headers.indexOf(c); out[c] = i >= 0 ? r[i] : ''; });
      return { found: true, data: out };
    }
  }
  setLastUPC_(upc);
  return { found: false, isNew: true };
}



// ─── Image capture (Front) ──────────────────────────────────────────────────
function captureFrontImage(upc, frontBlob) {
  const folder = getOrCreateUpcFolder_(upc);
  const ext = toExt_(frontBlob);
  folder.createFile(frontBlob).setName(`${normUPC(upc)}_front.${ext}`);

  // Do NOT write ImageFolderID to the sheet here; stash for later
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

// ─── Image capture (Ingredients) + Vision extraction ────────────────────────
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

  // Load the front image from the same folder
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

// ─── OpenAI Vision helper ───────────────────────────────────────────────────
function extractFromImages(frontBlob, ingBlob) {
  const key = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!key) throw new Error('Missing OPENAI_API_KEY in Script Properties');

  const frontB64 = Utilities.base64Encode(frontBlob.getBytes());
  const ingB64   = Utilities.base64Encode(ingBlob.getBytes());

  // Build messages (kept in-scope)
const messages = [
  {
    role: "system",
    content: [
      "You extract structured data from pet food package photos (front) and the ingredients panel.",
      "",
      "Return a single JSON object with these fields:",
      "- Brand",
      "- ProductName",
      "- Species",
      "- Flavor",
      "- Ingredients",
      "",
      "Rules:",
      "• ProductName is the commercial product line name in large type under/next to the brand.",
      "  Exclude flavor, size/weight, slogans, life stage terms unless they are part of the official line.",
      "  Examples: 'Life Protection Formula', 'True Instinct', 'Science Diet'.",
      "• Species MUST be exactly one of: Dog, Puppy, Cat, Kitten.",
      "  - If the packaging indicates life stage like 'Puppy', 'Puppies', 'Kitten', 'Kittens', set Species accordingly.",
      "  - Otherwise infer Dog vs Cat from brand/product/imagery/keywords (e.g., 'canine' → Dog, 'feline' → Cat).",
      "  - Never return values like 'adult', 'senior', 'all life stages', 'treat', etc. for Species.",
      "• Ingredients should be a readable comma-separated string from the ingredient panel.",
      "",
      "Respond with valid JSON only."
    ].join("\n")
  },
  {
    role: "user",
    content: [
      { type: "text", text: "Front of the package:" },
      { type: "image_url", image_url: { url: `data:image/png;base64,${frontB64}` } },
      { type: "text", text: "Ingredients label:" },
      { type: "image_url", image_url: { url: `data:image/png;base64,${ingB64}` } },
      {
        type: "text",
        text: "Return JSON with keys exactly: Brand, ProductName, Species, Flavor, Ingredients. Use empty strings if unknown."
      }
    ]
  }
];

  const payload = {
    model: OPENAI_MODEL,
    messages,
    temperature: 0,
    max_tokens: 800,
    response_format: { type: "json_object" }
  };

  const resp = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + key },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const result = JSON.parse(resp.getContentText());
  if (result.error) throw new Error(result.error.message);

  // Defensive parse
  let txt = (result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) || "";
  try {
    const start = txt.indexOf("{");
    const end   = txt.lastIndexOf("}");
    if (start !== -1 && end !== -1) txt = txt.slice(start, end + 1);
    return JSON.parse(txt);
  } catch (e) {
    console.error("Raw model content:", txt);
    throw new Error("OpenAI returned non-JSON content.");
  }
}

// ─── Save to Sheet ──────────────────────────────────────────────────────────
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

  // (Optional) attach stashed folder id
  const tempFolderId = (typeof getTempFolderForUPC_ === 'function') ? getTempFolderForUPC_(upcNorm) : null;
  if (tempFolderId) data.ImageFolderID = tempFolderId;

  const buildRow = (d) => headers.map(h => {
    switch (h) {
      case 'UPC':            return String(upcRaw);                 // keep raw (with leading zeros)
      case 'Product Name':   return d.ProductName || '';
      case 'ImageFolderID':  return d.ImageFolderID || '';
      case 'isTreat':        return isTreatYN;                      // ← write Yes/No
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

// ─── Create Slides → PDF ────────────────────────────────────────────────────
function createLabel(data) {
  data = normalizeKeys_(data);
  const productName = data.ProductName || data['Product Name'] || '';

  // Compute Food vs Treats: UI foodType wins, else use isTreat Yes/No
  const isTreatYN = toYesNo(data.isTreat);
  const foodType = (data.foodType === 'Treats') ? 'Treats' : (isTreatYN === 'Yes' ? 'Treats' : 'Food');

  const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMddyyyyHHmmss');
  const pdfName = `${data.Species || ''} ${foodType} - ${data.Brand || ''} ${productName} ${data.Expiration || ''} ${ts}.pdf`;

  const folder   = DriveApp.getFolderById(LABEL_FOLDER_ID);
  const template = DriveApp.getFileById(TEMPLATE_ID);
  const copy     = template.makeCopy(pdfName.replace('.pdf', ''), folder);
  const copyId   = copy.getId();

  const pres   = SlidesApp.openById(copyId);
  const slides = pres.getSlides();
  const map = {
    '{{Species}}':     data.Species || '',
    '{{Brand}}':       data.Brand || '',
    '{{ProductName}}': productName || '',
    '{{Flavor}}':      data.Flavor || '',
    '{{Ingredients}}': data.Ingredients || '',
    '{{Expiration}}':  data.Expiration || '',
    '{{foodType}}':    foodType                                  // ← new
  };
  slides.forEach(slide => { for (const k in map) slide.replaceAllText(k, map[k]); });
  pres.saveAndClose();

  const pdfBlob = DriveApp.getFileById(copyId).getAs('application/pdf').setName(pdfName);
  const pdfFile = folder.createFile(pdfBlob);
  DriveApp.getFileById(copyId).setTrashed(true);
  return { url: pdfFile.getUrl() };
}
