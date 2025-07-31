const APPS_SCRIPT_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbydw2XM7CbgYvk5wB1qy3qOxxQbEuIi0E5Q56t4mhY5objU4Z1UuHO0UTgqwonkJIIt3w/exec";
const GPT_IMAGE_ENDPOINT = "https://pantrypilot.fly.dev/parse-label";

function lookupUPC() {
  const upc = document.getElementById('upc').value.trim();
  if (!upc) return;
  fetch(APPS_SCRIPT_WEBAPP_URL + '?action=getProduct&upc=' + encodeURIComponent(upc))
    .then(res => res.json())
    .then(data => {
      if (data && data.brand) {
        showFormWithData(data);
      } else {
        document.getElementById('fallback-upload').style.display = 'block';
      }
    });
}

function showFormWithData(data) {
  document.getElementById('form-section').style.display = 'block';
  document.getElementById('fallback-upload').style.display = 'none';
  document.getElementById('brand').value = data.brand || '';
  document.getElementById('name').value = data.name || '';
  document.getElementById('flavor').value = data.flavor || '';
  document.getElementById('ingredients').value = data.ingredients || '';
  document.getElementById('species').value = data.species || '';
}

function submitForm() {
  const formData = {
    upc: document.getElementById('upc').value.trim(),
    species: document.getElementById('species').value.trim(),
    brand: document.getElementById('brand').value.trim(),
    name: document.getElementById('name').value.trim(),
    flavor: document.getElementById('flavor').value.trim(),
    ingredients: document.getElementById('ingredients').value.trim(),
    exp: document.getElementById('exp').value.trim()
  };

  fetch(APPS_SCRIPT_WEBAPP_URL + '?action=saveAndGenerate', {
    method: 'POST',
    body: JSON.stringify(formData),
    headers: { 'Content-Type': 'application/json' }
  })
  .then(res => res.json())
  .then(data => {
    if (data && data.url) {
      window.open(data.url, '_blank');
      alert("Label created! Review and print from new tab.");
    }
  });
}

function startScanner() {
  const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
  scanner.render((decodedText) => {
    document.getElementById('upc').value = decodedText;
    scanner.clear().then(() => {
      document.getElementById('reader').innerHTML = "";
    });
  }, (error) => {});
}

function submitFallback() {
  const upc = document.getElementById('upc').value.trim();
  const file1 = document.getElementById('photo-front').files[0];
  const file2 = document.getElementById('photo-ingredients').files[0];
  if (!file1 || !file2) return alert("Please upload both photos.");

  const formData = new FormData();
  formData.append("upc", upc);
  formData.append("photo_front", file1);
  formData.append("photo_ingredients", file2);

  fetch(GPT_IMAGE_ENDPOINT, { method: "POST", body: formData })
    .then(res => res.json())
    .then(data => {
      if (data && data.brand) {
        showFormWithData(data);
      } else {
        alert("Could not extract data from images. Please try again or enter manually.");
      }
    });
}