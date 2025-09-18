// ─────────────────────────────────────────────────────────────────────────────
// Web entrypoint
// ─────────────────────────────────────────────────────────────────────────────
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}
function doGet() {
  const t = HtmlService.createTemplateFromFile('Index');
  return t.evaluate()
          .setTitle('Pet Food Pantry Label Creator')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}