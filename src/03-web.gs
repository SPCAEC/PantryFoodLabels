// ─────────────────────────────────────────────────────────────────────────────
// Web entrypoint
// ─────────────────────────────────────────────────────────────────────────────
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

// Escape any literal </script> (and <!--) inside included JS so HtmlService
// doesn't terminate the outer tag early.
function includeScript(name) {
  return HtmlService.createHtmlOutputFromFile(name)
    .getContent()
    .replace(/<\/script>/gi, '<\\/script>')
    .replace(/<!--/g, '<\\!--');
}

function doGet() {
  const t = HtmlService.createTemplateFromFile('Index');
  return t.evaluate()
    .setTitle('Pet Food Pantry Label Creator')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}