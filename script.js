// ─────────────────────────────────────────────────────────────────────────────
// 1) Your Web App endpoint (lookup only for now)
const API_BASE = 'https://script.google.com/macros/s/AKfycbzFnK8qLK0R7SAmG6C-UkhsUh5wOkCW1yJ6UXzV6kiW/dev';

// ─────────────────────────────────────────────────────────────────────────────
// 2) DOM refs
const upcInput  = document.getElementById('upc');
const lookupBtn = document.getElementById('lookup');
const scanBtn   = document.getElementById('scanBtn');
const readerDiv = document.getElementById('reader');
const resultDiv = document.getElementById('result');

// ─────────────────────────────────────────────────────────────────────────────
// 3) Lookup handler
lookupBtn.addEventListener('click', () => {
  const upc = upcInput.value.trim();
  if (!upc) return alert('Please enter or scan a UPC.');
  performLookup(upc);
});

async function performLookup(upc) {
  resultDiv.textContent = 'Looking up…';

  // 1) unique callback name
  const cbName = 'lookup_cb_' + Date.now();
  window[cbName] = json => {
    // cleanup
    delete window[cbName];
    script.remove();

    // handle response
    if (json.found) renderRecord(json.record);
    else            renderNotFound(upc);
  };

  // 2) inject a <script> tag instead of fetch()
  const script = document.createElement('script');
  script.src = `${API_BASE}`
             + `?action=lookup`
             + `&barcode=${encodeURIComponent(upc)}`
             + `&callback=${cbName}`;
  document.body.appendChild(script);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) Render when found
function renderRecord(record) {
  resultDiv.innerHTML = `
    <h2>Found!</h2>
    <ul>
      <li><strong>UPC:</strong> ${record.UPC}</li>
      <li><strong>Species:</strong> ${record.Species}</li>
      <li><strong>Brand:</strong> ${record.Brand}</li>
      <li><strong>Name:</strong> ${record['Product Name']}</li>
      <li><strong>Flavor:</strong> ${record.Flavor}</li>
      <li><strong>Ingredients:</strong> ${record.Ingredients}</li>
    </ul>
    <button id="printLabel">🖨️ Print Label</button>
  `;
  document.getElementById('printLabel').onclick = () => {
    // TODO: build and print your 4×6 label
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) Render when NOT found
function renderNotFound(upc) {
  resultDiv.innerHTML = `
    <h2>Not in database</h2>
    <p>UPC <strong>${upc}</strong> not found. Please take two photos:</p>
    <p>
      1. Front of bag/can<br/>
      2. Ingredients label
    </p>
    <input type="file" id="frontPic" accept="image/*" capture="environment"/><br/>
    <input type="file" id="ingPic" accept="image/*" capture="environment"/><br/>
    <button id="uploadPics">→ Process with GPT</button>
  `;

  document.getElementById('uploadPics').onclick = () => {
    const frontFile = document.getElementById('frontPic').files[0];
    const ingFile   = document.getElementById('ingPic').files[0];
    if (!frontFile || !ingFile) return alert('Please select both photos.');
    processImages(upc, frontFile, ingFile);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) Hook up html5-qrcode scanner
scanBtn.addEventListener('click', () => {
  readerDiv.classList.remove('hidden');
  const html5QrCode = new Html5QrCode('reader');
  Html5QrCode.getCameras()
    .then(cameras => {
      html5QrCode.start(
        cameras[0].id,
        { fps: 10, qrbox: 250 },
        qrText => {
          html5QrCode.stop();
          readerDiv.classList.add('hidden');
          upcInput.value = qrText;
          performLookup(qrText);
        },
        err => console.warn(err)
      );
    })
    .catch(err => console.error('Camera error:', err));
});

// ─────────────────────────────────────────────────────────────────────────────
// 7) Stub for the image→GPT flow (we’ll fill this in next)
async function processImages(upc, frontFile, ingFile) {
  // TODO: POST FormData(frontFile, ingFile, upc) to your Apps Script
  resultDiv.textContent = 'Uploading photos…';
}
