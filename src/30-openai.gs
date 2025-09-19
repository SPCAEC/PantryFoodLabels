// ─────────────────────────────────────────────────────────────────────────────
// OpenAI Vision helper
// ─────────────────────────────────────────────────────────────────────────────
function extractFromImages(frontBlob, ingBlob) {
  const key = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!key) throw new Error('Missing OPENAI_API_KEY in Script Properties');

  const frontB64 = Utilities.base64Encode(frontBlob.getBytes());
  const ingB64   = Utilities.base64Encode(ingBlob.getBytes());

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
        { type: "text", text: "Return JSON with keys exactly: Brand, ProductName, Species, Flavor, Ingredients. Use empty strings if unknown." }
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