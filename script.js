function startScanner() {
  const reader = document.getElementById("reader");
  reader.style.display = "block";
  const html5QrCode = new Html5Qrcode("reader");
  Html5Qrcode.getCameras().then(devices => {
    if (devices && devices.length) {
      html5QrCode.start(
        devices[0].id,
        { fps: 10, qrbox: 250 },
        upc => {
          document.getElementById("upc").value = upc;
          html5QrCode.stop();
          reader.style.display = "none";
        },
        error => {}
      ).catch(err => {
        console.error("Camera start failed:", err);
      });
    } else {
      alert("No camera found.");
    }
  });
}

function lookupUPC() {
  const upc = document.getElementById("upc").value;
  if (!upc) return alert("Please enter or scan a UPC.");
  fetch(`/getProductData?upc=${upc}`)
    .then(res => res.json())
    .then(data => {
      if (data) {
        document.getElementById("form-section").style.display = "block";
        document.getElementById("brand").value = data.brand || "";
        document.getElementById("name").value = data.name || "";
        document.getElementById("flavor").value = data.flavor || "";
        document.getElementById("ingredients").value = data.ingredients || "";
        document.getElementById("species").value = data.species || "";
      } else {
        document.getElementById("fallback-upload").style.display = "block";
      }
    });
}

function submitForm() {
  alert("Pretend we are printing the label!");
}

function submitFallback() {
  alert("Pretend we're sending to GPT for image analysis!");
}
