// ─────────────────────────────────────────────────────────────────────────────
// Web entrypoint
// ─────────────────────────────────────────────────────────────────────────────
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

// Escapes literal </script> so Apps Script doesn't prematurely end the tag
function includeScript(name) {
  return HtmlService.createHtmlOutputFromFile(name)
    .getContent()
    .replace(/<\/script>/gi, '<\\/script>')   // escape closing script tags
    .replace(/<!--/g, '<\\!--');              // belt & suspenders for HTML comments
}

function doGet() {
  const t = HtmlService.createTemplateFromFile('Index');
  return t
    .evaluate()
    .setTitle('Pet Food Pantry Label Creator')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}