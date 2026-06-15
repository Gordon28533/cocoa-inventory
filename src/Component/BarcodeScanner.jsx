/**
 * BarcodeScanner.jsx
 *
 * Camera-based barcode scanner using the native BarcodeDetector Web API.
 * Supported in Chrome 83+, Edge 83+, and Chrome for Android 83+.
 *
 * Graceful degradation:
 *   • Unsupported browser  → shows an instructional message for USB scanners
 *   • Camera permission denied → shows an error with retry
 *   • Scan success → calls onScan(rawValue) and stops the camera
 *
 * Props:
 *   onScan  (string) => void  — called with the raw barcode string on success
 *   onClose ()       => void  — called when the user cancels
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

// Barcode formats commonly used in inventory systems
const FORMATS = [
  "code_128",
  "code_39",
  "code_93",
  "ean_13",
  "ean_8",
  "qr_code",
  "data_matrix",
  "pdf417",
];

const BarcodeScanner = ({ onScan, onClose }) => {
  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const rafRef     = useRef(null);
  const detectorRef = useRef(null);

  const [phase, setPhase] = useState("init"); // init | scanning | error | unsupported
  const [errorMsg, setErrorMsg] = useState("");

  // ── Stop camera and cancel any pending animation frame ──────────────────────
  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // ── Main scanning loop (requestAnimationFrame-based) ─────────────────────────
  const scanLoop = useCallback(async () => {
    const video    = videoRef.current;
    const detector = detectorRef.current;

    if (!video || !detector || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    try {
      const barcodes = await detector.detect(video);
      if (barcodes.length > 0) {
        const code = barcodes[0].rawValue;
        stopCamera();
        onScan(code);
        return; // don't schedule another frame after a successful scan
      }
    } catch {
      // Detection errors are transient — keep looping
    }

    rafRef.current = requestAnimationFrame(scanLoop);
  }, [onScan, stopCamera]);

  // ── Start camera and detector ─────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setPhase("init");
    setErrorMsg("");

    // BarcodeDetector availability check
    if (!("BarcodeDetector" in window)) {
      setPhase("unsupported");
      return;
    }

    try {
      detectorRef.current = new window.BarcodeDetector({ formats: FORMATS });
    } catch {
      setPhase("unsupported");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setPhase("scanning");
      rafRef.current = requestAnimationFrame(scanLoop);
    } catch (err) {
      const msg =
        err.name === "NotAllowedError"
          ? "Camera access was denied. Please allow camera permission and try again."
          : err.name === "NotFoundError"
          ? "No camera found on this device."
          : err.message || "Could not start camera.";
      setErrorMsg(msg);
      setPhase("error");
    }
  }, [scanLoop]);

  // Start on mount; clean up on unmount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // ── Unsupported browser ───────────────────────────────────────────────────────
  if (phase === "unsupported") {
    return (
      <div className="barcode-scanner barcode-scanner--unsupported">
        <div className="barcode-scanner__icon" aria-hidden="true">📷</div>
        <h4 className="barcode-scanner__title">Camera scanning not supported</h4>
        <p className="barcode-scanner__body">
          Your browser does not support the BarcodeDetector API. Use{" "}
          <strong>Chrome 83+</strong> or <strong>Microsoft Edge 83+</strong> for
          camera-based scanning.
        </p>
        <p className="barcode-scanner__body">
          <strong>Tip:</strong> Most USB and Bluetooth barcode scanners work as
          keyboard devices — just focus the{" "}
          <em>Item ID</em> field and scan. The barcode value will be typed
          automatically.
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    );
  }

  // ── Camera error ──────────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="barcode-scanner barcode-scanner--error">
        <div className="barcode-scanner__icon" aria-hidden="true">⚠️</div>
        <h4 className="barcode-scanner__title">Camera error</h4>
        <p className="barcode-scanner__body">{errorMsg}</p>
        <div className="barcode-scanner__actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={startCamera}
          >
            Retry
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Scanning view ─────────────────────────────────────────────────────────────
  return (
    <div className="barcode-scanner">
      <div className="barcode-scanner__header">
        <span className="barcode-scanner__label">
          {phase === "init" ? "Starting camera…" : "Point camera at barcode"}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm barcode-scanner__close"
          onClick={() => { stopCamera(); onClose(); }}
          aria-label="Cancel barcode scan"
        >
          ✕ Cancel
        </button>
      </div>

      <div className="barcode-scanner__viewport">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          className="barcode-scanner__video"
          playsInline
          muted
          aria-label="Camera preview for barcode scanning"
        />
        <div className="barcode-scanner__overlay" aria-hidden="true">
          <div className="barcode-scanner__crosshair" />
        </div>
      </div>

      {phase === "scanning" && (
        <p className="barcode-scanner__hint">
          Hold steady — scanning automatically…
        </p>
      )}
    </div>
  );
};

BarcodeScanner.propTypes = {
  onScan:  PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default BarcodeScanner;
