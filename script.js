
function startScanner() {
  const html5QrCode = new Html5Qrcode("reader");
  const qrConfig = { fps: 10, qrbox: 250 };

  html5QrCode.start(
    { facingMode: "environment" },
    qrConfig,
    (decodedText) => {
      document.getElementById("upc").value = decodedText;
      html5QrCode.stop();
      document.getElementById("reader").innerHTML = "";
    }
  ).catch(err => {
    console.error("Scanner error", err);
  });
}

function lookupUPC() {
  const upc = document.getElementById("upc").value.trim();
  if (!upc) {
    alert("Please enter or scan a UPC.");
    return;
  }

  fetch(`https://script.google.com/macros/s/AKfycbydw2XM7CbgYvk5wB1qy3qOxxQbEuIi0E5Q56t4mhY5objU4Z1UuHO0UTgqwonkJIIt3w/exec?upc=${upc}`)
    .then(response => response.json())
    .then(data => {
      if (data && data.brand) {
        document.getElementById("brand").value = data.brand;
        document.getElementById("name").value = data.name;
        document.getElementById("flavor").value = data.flavor;
        document.getElementById("ingredients").value = data.ingredients;
        document.getElementById("species").value = data.species;
        document.getElementById("form-section").style.display = "block";
        document.getElementById("fallback-upload").style.display = "none";
      } else {
        document.getElementById("fallback-upload").style.display = "block";
      }
    })
    .catch(error => {
      console.error("Lookup failed", error);
      document.getElementById("fallback-upload").style.display = "block";
    });
}
