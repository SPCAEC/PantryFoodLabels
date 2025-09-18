// ─────────────────────────────────────────────────────────────────────────────
// Web entrypoint
// ─────────────────────────────────────────────────────────────────────────────
function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('Pet Food Pantry Label Creator');
}