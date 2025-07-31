
function startScanner() {
  console.log("startScanner() called");

  const reader = document.getElementById("reader");
  reader.innerHTML = ""; // Clear any existing camera feed

  if (location.protocol !== "https:") {
    alert("Camera access requires HTTPS. Please access this page securely.");
    return;
  }

  const html5QrCode = new Html5Qrcode("reader");

  const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.UPC_A]
  };

  Html5Qrcode.getCameras()
    .then((devices) => {
      if (devices && devices.length) {
        const cameraId = devices[0].id;
        html5QrCode.start(
          cameraId,
          config,
          (decodedText) => {
            console.log("Scan result:", decodedText);
            document.getElementById("upc").value = decodedText;
            html5QrCode.stop().then(() => {
              console.log("Camera stopped");
              document.getElementById("reader").innerHTML = "";
            });
          },
          (errorMessage) => {
            console.warn("Scan error:", errorMessage);
          }
        );
      } else {
        alert("No camera devices found.");
      }
    })
    .catch((err) => {
      console.error("Camera initialization failed:", err);
      alert("Unable to access camera. Please check permissions and try again.");
    });
}
