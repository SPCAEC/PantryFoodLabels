<script type="module">
import {
  configure,
  DataCaptureContext,
  DataCaptureView,
  Camera,
  FrameSourceState
} from "@scandit/web-datacapture-core";
import {
  barcodeCaptureLoader,
  BarcodeCapture,
  BarcodeCaptureSettings,
  BarcodeCaptureOverlay,
  Symbology
} from "@scandit/web-datacapture-barcode";

// One-time configuration gate
let _configured = false;
async function ensureConfigured() {
  if (_configured) return;

  // Pull license key from Apps Script
  const licenseKey = await new Promise((res, rej) =>
    google.script.run.withSuccessHandler(res).withFailureHandler(rej).getScanditLicense()
  );

  await configure({
    licenseKey,
    // where the engine files (WASM/worker) are hosted:
    libraryLocation: "https://cdn.jsdelivr.net/npm/@scandit/web-datacapture-barcode@7.6.0/sdc-lib/",
    moduleLoaders: [barcodeCaptureLoader()]
  });

  _configured = true;
}

function enableEANUPCSymbologies(settings) {
  settings.enableSymbologies([
    Symbology.EAN13UPCA, // includes UPC-A
    Symbology.UPCE,
    Symbology.EAN8,
    Symbology.Code128
  ]);
  try { settings.codeDuplicateFilter = 0; } catch(_) {}
}

/**
 * Open a single-use scanner UI, resolve with decoded text once, then stop camera and detach.
 * @param {HTMLElement} containerEl - element to host the live view
 * @returns {Promise<string|null>}
 */
async function scanOnce(containerEl) {
  await ensureConfigured();

  // build view & context
  const view = new DataCaptureView();
  view.connectToElement(containerEl);
  view.showProgressBar();

  const context = await DataCaptureContext.create();
  await view.setContext(context);

  // camera
  const camera = Camera.default;
  const camSettings = BarcodeCapture.recommendedCameraSettings;
  await camera.applySettings(camSettings);
  await context.setFrameSource(camera);

  // capture mode
  const settings = new BarcodeCaptureSettings();
  enableEANUPCSymbologies(settings);

  const capture = await BarcodeCapture.forContext(context, settings);
  BarcodeCaptureOverlay.withBarcodeCaptureForView(capture, view);

  // Helper to fully stop & clean
  async function teardown() {
    try { await capture.setEnabled(false); } catch(_) {}
    try { await camera.switchToDesiredState(FrameSourceState.Off); } catch(_) {}
    try { view.connectToElement(null); } catch(_) {}
  }

  return new Promise(async (resolve) => {
    // cancel button support (optional): if your container has a "data-cancel-button"
    const cancelBtn = containerEl.closest('.card')?.querySelector('[data-cancel-scandit]');
    if (cancelBtn) {
      cancelBtn.onclick = async () => { await teardown(); resolve(null); };
    }

    // One-shot handler
    const listener = {
      didScan: async (_mode, session) => {
        const arr = session?.newlyRecognizedBarcodes || [];
        if (!arr.length) return;
        const val = arr[arr.length - 1]?.data ?? '';
        await teardown();
        try { capture.removeListener(listener); } catch(_) {}
        resolve(val || null);
      }
    };
    capture.addListener(listener);

    // Go live
    await camera.switchToDesiredState(FrameSourceState.On);
    await capture.setEnabled(true);
    view.hideProgressBar();
  });
}

// Expose a single entry point the app can call.
// The app handles UI (creating container, cancel button, etc.).
window.scanWithScandit = async function(containerEl) {
  try {
    return await scanOnce(containerEl);
  } catch (e) {
    console.error('[Scandit] scan error:', e);
    return null; // let caller decide fallback
  }
};
</script>