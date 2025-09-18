// ─────────────────────────────────────────────────────────────────────────────
/** Create Slides → PDF label and return { url } */
// ─────────────────────────────────────────────────────────────────────────────
function createLabel(data) {
  data = normalizeKeys_(data);
  const productName = data.ProductName || data['Product Name'] || '';

  // Food vs Treats: UI foodType wins; else use isTreat Yes/No
  const isTreatYN = toYesNo(data.isTreat);
  const foodType  = (data.foodType === 'Treats') ? 'Treats' : (isTreatYN === 'Yes' ? 'Treats' : 'Food');

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
    '{{foodType}}':    foodType
  };
  slides.forEach(slide => { for (const k in map) slide.replaceAllText(k, map[k]); });
  pres.saveAndClose();

  const pdfBlob = DriveApp.getFileById(copyId).getAs('application/pdf').setName(pdfName);
  const pdfFile = folder.createFile(pdfBlob);
  DriveApp.getFileById(copyId).setTrashed(true);
  return { url: pdfFile.getUrl() };
}