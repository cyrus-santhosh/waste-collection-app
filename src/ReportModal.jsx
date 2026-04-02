/**
 * WasteWatch — ReportModal Component
 * Triggered by clicking "＋ Report Issue" in the header.
 * Calls addReport() from firebase.js and shows toast feedback.
 */
import React, { useState, useEffect, useRef } from "react";
import { addReport } from "./firebase";

const ISSUE_TYPES = [
  { value: "Full",     label: "🗑️ Bin Full",       desc: "Bin has reached capacity" },
  { value: "Overflow", label: "⚠️ Overflow",        desc: "Waste spilling outside" },
  { value: "Damaged",  label: "🔧 Damaged",         desc: "Bin is broken or cracked" },
  { value: "Smell",    label: "👃 Bad Smell",        desc: "Foul odour reported" },
  { value: "Missing",  label: "❓ Bin Missing",      desc: "Bin has been removed" },
  { value: "Other",    label: "📋 Other",            desc: "Something else" },
];

export default function ReportModal({ onClose }) {
  const [step, setStep]         = useState(1); // 1 = form, 2 = success
  const [binId, setBinId]       = useState("");
  const [issue, setIssue]       = useState("");
  const [notes, setNotes]       = useState("");
  const [locating, setLocating] = useState(false);
  const [coords, setCoords]     = useState(null);
  const [submitting, setSubmit] = useState(false);
  const [error, setError]       = useState("");
  const overlayRef              = useRef(null);
  const firstInputRef           = useRef(null);

  // Auto-focus first input on mount
  useEffect(() => {
    setTimeout(() => firstInputRef.current?.focus(), 80);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Click outside overlay to close
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Geolocation
  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by your browser.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setError("Could not get location. Please allow location access.");
        setLocating(false);
      },
      { timeout: 8000, maximumAge: 30_000 }
    );
  };

  // Submit
  const handleSubmit = async () => {
    setError("");
    if (!binId.trim()) { setError("Please enter a Bin ID."); return; }
    if (!issue)        { setError("Please select an issue type."); return; }

    setSubmit(true);
    try {
      await addReport({
        binId:  binId.trim().toUpperCase(),
        issue,
        notes:  notes.trim(),
        ...(coords ?? {}),
      });
      setStep(2);
      // Show global toast if available
      window.showHeaderToast?.("✅ Report submitted successfully!", "success");
    } catch (err) {
      console.error(err);
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmit(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Report Issue"
    >
      <div style={styles.modal}>

        {/* ── Header ── */}
        <div style={styles.modalHeader}>
          <div style={styles.modalTitleRow}>
            <span style={styles.modalIcon}>🚨</span>
            <div>
              <div style={styles.modalTitle}>Report an Issue</div>
              <div style={styles.modalSub}>Help keep Bengaluru clean</div>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close">✕</button>
        </div>

        {/* ── Step indicator ── */}
        <div style={styles.stepRow}>
          {[1, 2].map((s) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ ...styles.stepDot, background: step >= s ? "var(--accent, #2dff8e)" : "rgba(255,255,255,0.1)", color: step >= s ? "#0a1410" : "#7a9e8a" }}>
                {s}
              </div>
              <span style={{ fontSize: 12, color: step >= s ? "#e8f5ef" : "#4a6e5a" }}>
                {s === 1 ? "Details" : "Done"}
              </span>
              {s < 2 && <div style={styles.stepLine} />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Form ── */}
        {step === 1 && (
          <div style={styles.body}>

            {/* Bin ID */}
            <div style={styles.field}>
              <label style={styles.label}>Bin ID <span style={styles.req}>*</span></label>
              <input
                ref={firstInputRef}
                type="text"
                placeholder="e.g. BIN-001"
                value={binId}
                onChange={(e) => setBinId(e.target.value)}
                style={styles.input}
                onFocus={(e) => e.target.style.borderColor = "var(--accent, #2dff8e)"}
                onBlur={(e)  => e.target.style.borderColor = "rgba(45,255,142,0.15)"}
              />
              <div style={styles.hint}>Find the ID on the bin's QR sticker</div>
            </div>

            {/* Issue type */}
            <div style={styles.field}>
              <label style={styles.label}>Issue Type <span style={styles.req}>*</span></label>
              <div style={styles.issueGrid}>
                {ISSUE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setIssue(t.value)}
                    style={{
                      ...styles.issueBtn,
                      ...(issue === t.value ? styles.issueBtnActive : {}),
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{t.label.split(" ")[0]}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12, color: issue === t.value ? "#0a1410" : "#e8f5ef" }}>
                        {t.label.slice(t.label.indexOf(" ") + 1)}
                      </div>
                      <div style={{ fontSize: 10.5, color: issue === t.value ? "#1a4030" : "#5a8a6a", marginTop: 1 }}>
                        {t.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={styles.field}>
              <label style={styles.label}>Additional Notes</label>
              <textarea
                placeholder="Describe the issue in more detail…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                style={{ ...styles.input, resize: "vertical", lineHeight: 1.5 }}
                onFocus={(e) => e.target.style.borderColor = "var(--accent, #2dff8e)"}
                onBlur={(e)  => e.target.style.borderColor = "rgba(45,255,142,0.15)"}
              />
            </div>

            {/* Location */}
            <div style={styles.field}>
              <label style={styles.label}>Location</label>
              <button onClick={handleLocate} disabled={locating} style={styles.locateBtn}>
                {locating ? "⏳ Locating…" : coords ? `📍 ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "📍 Attach My Location"}
              </button>
              {coords && <div style={{ ...styles.hint, color: "#2dff8e" }}>✓ Location attached</div>}
            </div>

            {/* Error */}
            {error && (
              <div style={styles.errorBox}>⚠️ {error}</div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ ...styles.submitBtn, opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? "⏳ Submitting…" : "🚨 Submit Report"}
            </button>
          </div>
        )}

        {/* ── STEP 2: Success ── */}
        {step === 2 && (
          <div style={{ ...styles.body, textAlign: "center", paddingTop: 24 }}>
            <div style={styles.successIcon}>✅</div>
            <div style={styles.successTitle}>Report Submitted!</div>
            <div style={styles.successMsg}>
              Your report for <strong style={{ color: "#2dff8e" }}>{binId.toUpperCase()}</strong> has been received.
              Our team will review it shortly.
            </div>
            <div style={styles.successMeta}>
              Issue: <span style={{ color: "#e8f5ef" }}>{issue}</span>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28 }}>
              <button
                onClick={() => { setStep(1); setBinId(""); setIssue(""); setNotes(""); setCoords(null); }}
                style={styles.ghostBtn}
              >
                ＋ Report Another
              </button>
              <button onClick={onClose} style={styles.submitBtn}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────────────── */
const styles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.72)",
    backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 10000,
    padding: 16,
  },
  modal: {
    background: "linear-gradient(145deg, #131a17 0%, #0d1510 100%)",
    border: "1px solid rgba(45,255,142,0.15)",
    borderRadius: 20,
    width: "100%", maxWidth: 520,
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(45,255,142,0.05)",
    fontFamily: "'DM Sans', sans-serif",
    animation: "modal-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  modalHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "22px 24px 0",
  },
  modalTitleRow: { display: "flex", gap: 12, alignItems: "center" },
  modalIcon: { fontSize: 32 },
  modalTitle: { fontSize: 20, fontWeight: 700, color: "#e8f5ef", letterSpacing: "-0.3px" },
  modalSub: { fontSize: 12.5, color: "#5a8a6a", marginTop: 2 },
  closeBtn: {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8, color: "#7a9e8a", cursor: "pointer",
    width: 32, height: 32, fontSize: 14,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.15s",
  },
  stepRow: {
    display: "flex", alignItems: "center", gap: 4,
    padding: "16px 24px 0",
  },
  stepDot: {
    width: 24, height: 24, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 700,
    transition: "all 0.3s",
  },
  stepLine: { width: 40, height: 1, background: "rgba(45,255,142,0.12)", margin: "0 4px" },
  body: { padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 18 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "#a0bfad", letterSpacing: "0.3px" },
  req: { color: "#2dff8e" },
  hint: { fontSize: 11.5, color: "#4a6e5a", marginTop: 2 },
  input: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(45,255,142,0.15)",
    borderRadius: 10, padding: "10px 14px",
    color: "#e8f5ef", fontSize: 14,
    outline: "none", width: "100%",
    boxSizing: "border-box",
    fontFamily: "'DM Sans', sans-serif",
    transition: "border-color 0.2s",
  },
  issueGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
  },
  issueBtn: {
    display: "flex", gap: 10, alignItems: "center",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(45,255,142,0.1)",
    borderRadius: 10, padding: "10px 12px",
    cursor: "pointer", textAlign: "left",
    transition: "all 0.18s",
  },
  issueBtnActive: {
    background: "#2dff8e",
    border: "1px solid #2dff8e",
  },
  locateBtn: {
    background: "rgba(45,255,142,0.06)",
    border: "1px dashed rgba(45,255,142,0.3)",
    borderRadius: 10, padding: "10px 16px",
    color: "#2dff8e", fontSize: 13.5, fontWeight: 500,
    cursor: "pointer", width: "100%",
    transition: "all 0.18s",
    fontFamily: "'DM Sans', sans-serif",
  },
  errorBox: {
    background: "rgba(255,80,80,0.08)",
    border: "1px solid rgba(255,80,80,0.2)",
    borderRadius: 10, padding: "10px 14px",
    color: "#ff8080", fontSize: 13,
  },
  submitBtn: {
    background: "var(--accent, #2dff8e)",
    border: "none", borderRadius: 11,
    padding: "13px 24px",
    color: "#0a1410", fontSize: 14.5, fontWeight: 700,
    cursor: "pointer", width: "100%",
    transition: "opacity 0.2s, transform 0.15s",
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: "0.2px",
  },
  ghostBtn: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 11, padding: "13px 24px",
    color: "#a0bfad", fontSize: 14, fontWeight: 500,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  successIcon: { fontSize: 56, marginBottom: 12 },
  successTitle: { fontSize: 22, fontWeight: 700, color: "#e8f5ef", marginBottom: 10 },
  successMsg: { fontSize: 14, color: "#7a9e8a", lineHeight: 1.6, marginBottom: 8 },
  successMeta: { fontSize: 13, color: "#5a8a6a" },
};