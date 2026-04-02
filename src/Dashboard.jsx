/**
 * WasteWatch — Dashboard Component
 * Live stats from Firebase using subscribeToBins + subscribeToReports
 */
import React, { useState, useEffect } from "react";
import { subscribeToBins, subscribeToReports } from "./firebase";

/* ── Helpers ───────────────────────────────────────────────────── */
function timeAgo(ts) {
  if (!ts?.toDate) return "—";
  const sec = Math.floor((Date.now() - ts.toDate().getTime()) / 1000);
  if (sec < 60)    return "just now";
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

const STATUS_META = {
  ok:       { label: "OK",       color: "#2dff8e", bg: "rgba(45,255,142,0.1)",  icon: "✅" },
  full:     { label: "Full",     color: "#ffcc00", bg: "rgba(255,204,0,0.1)",   icon: "🗑️" },
  overflow: { label: "Overflow", color: "#ff6b35", bg: "rgba(255,107,53,0.1)",  icon: "⚠️" },
  damaged:  { label: "Damaged",  color: "#ff5252", bg: "rgba(255,82,82,0.1)",   icon: "🔧" },
};

const ISSUE_ICON = {
  Full:     "🗑️",
  Overflow: "⚠️",
  Damaged:  "🔧",
  Smell:    "👃",
  Missing:  "❓",
  Other:    "📋",
};

/* ── Stat Card ─────────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div style={{ ...S.card, borderColor: accent ? `${accent}33` : "rgba(45,255,142,0.1)" }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: accent || "#2dff8e", letterSpacing: "-1px" }}>
        {value}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#e8f5ef", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11.5, color: "#5a8a6a", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ── Bin Row ────────────────────────────────────────────────────── */
function BinRow({ bin }) {
  const meta = STATUS_META[bin.status] || STATUS_META.ok;
  const cap  = bin.capacity ?? 0;

  return (
    <div style={S.binRow}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
        <div style={{ ...S.statusDot, background: meta.color }} />
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#e8f5ef" }}>
            {bin.binId || bin.id}
          </div>
          <div style={{ fontSize: 11.5, color: "#5a8a6a", marginTop: 1 }}>
            {bin.address || "No address"}
          </div>
        </div>
      </div>

      {/* Fill bar */}
      <div style={{ width: 80 }}>
        <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 4,
            width: `${cap}%`,
            background: cap > 90 ? "#ff5252" : cap > 70 ? "#ffcc00" : "#2dff8e",
            transition: "width 0.5s ease",
          }} />
        </div>
        <div style={{ fontSize: 10.5, color: "#4a6e5a", marginTop: 3, textAlign: "right" }}>{cap}%</div>
      </div>

      {/* Status badge */}
      <div style={{ ...S.badge, background: meta.bg, color: meta.color }}>
        {meta.icon} {meta.label}
      </div>
    </div>
  );
}

/* ── Report Row ─────────────────────────────────────────────────── */
function ReportRow({ report }) {
  const icon = ISSUE_ICON[report.issue] || "📋";
  const statusColor = report.status === "resolved" ? "#2dff8e" : report.status === "in-progress" ? "#ffcc00" : "#ff6b35";

  return (
    <div style={S.reportRow}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e8f5ef" }}>
          {report.issue} — <span style={{ color: "#2dff8e", fontWeight: 700 }}>{report.binId}</span>
        </div>
        {report.notes && (
          <div style={{ fontSize: 11.5, color: "#5a8a6a", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {report.notes}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        <div style={{ ...S.badge, background: `${statusColor}18`, color: statusColor, fontSize: 10.5 }}>
          {report.status || "open"}
        </div>
        <div style={{ fontSize: 10.5, color: "#4a6e5a" }}>{timeAgo(report.createdAt)}</div>
      </div>
    </div>
  );
}

/* ── Main Dashboard ─────────────────────────────────────────────── */
export default function Dashboard() {
  const [bins,    setBins]    = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubBins = subscribeToBins((data) => {
      setBins(data);
      setLoading(false);
    });
    const unsubReports = subscribeToReports((data) => {
      setReports(data);
    }, 20);

    return () => { unsubBins(); unsubReports(); };
  }, []);

  /* ── Computed Stats ── */
  const total      = bins.length;
  const fullCount  = bins.filter((b) => b.status === "full" || b.status === "overflow").length;
  const okCount    = bins.filter((b) => b.status === "ok").length;
  const openRep    = reports.filter((r) => r.status === "open").length;
  const avgCap     = total ? Math.round(bins.reduce((a, b) => a + (b.capacity || 0), 0) / total) : 0;
  const critBins   = bins.filter((b) => (b.capacity || 0) >= 90).sort((a, b) => (b.capacity || 0) - (a.capacity || 0));
  const recentReps = reports.slice(0, 8);

  if (loading) {
    return (
      <div style={S.loadingWrap}>
        <div style={S.spinner} />
        <div style={{ color: "#5a8a6a", fontSize: 14, marginTop: 16 }}>Connecting to live data…</div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div style={S.emptyWrap}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#e8f5ef" }}>No bins yet</div>
        <div style={{ fontSize: 13.5, color: "#5a8a6a", marginTop: 8 }}>
          Seed demo data from the browser console: <code style={{ color: "#2dff8e" }}>seedDemoData()</code>
        </div>
      </div>
    );
  }

  return (
    <div style={S.wrapper}>

      {/* ── Stat Cards ── */}
      <div style={S.statsGrid}>
        <StatCard icon="🗑️" label="Total Bins"     value={total}      sub="across Bengaluru"         accent="#2dff8e" />
        <StatCard icon="✅" label="Operational"     value={okCount}    sub={`${total - okCount} need attention`} accent="#2dff8e" />
        <StatCard icon="⚠️" label="Need Pickup"     value={fullCount}  sub="full or overflowing"      accent="#ffcc00" />
        <StatCard icon="📋" label="Open Reports"    value={openRep}    sub="awaiting review"           accent="#ff6b35" />
        <StatCard icon="📊" label="Avg Fill Level"  value={`${avgCap}%`} sub="across all bins"        accent={avgCap > 70 ? "#ffcc00" : "#2dff8e"} />
        <StatCard icon="🚨" label="Critical Bins"   value={critBins.length} sub="≥ 90% capacity"     accent="#ff5252" />
      </div>

      {/* ── Two-column bottom ── */}
      <div style={S.twoCol}>

        {/* Left: Bin status list */}
        <div style={S.panel}>
          <div style={S.panelHeader}>
            <span style={S.panelTitle}>🗑️ Bin Status</span>
            <span style={S.panelCount}>{total} bins</span>
          </div>
          <div style={S.listScroll}>
            {bins
              .sort((a, b) => (b.capacity || 0) - (a.capacity || 0))
              .map((bin) => <BinRow key={bin.id} bin={bin} />)
            }
          </div>
        </div>

        {/* Right: Recent reports */}
        <div style={S.panel}>
          <div style={S.panelHeader}>
            <span style={S.panelTitle}>📋 Recent Reports</span>
            <span style={S.panelCount}>{reports.length} total</span>
          </div>
          {recentReps.length === 0 ? (
            <div style={S.emptyList}>No reports yet — all clear! 🎉</div>
          ) : (
            <div style={S.listScroll}>
              {recentReps.map((rep) => <ReportRow key={rep.id} report={rep} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── Critical alert strip ── */}
      {critBins.length > 0 && (
        <div style={S.alertStrip}>
          <span style={{ fontSize: 16 }}>🚨</span>
          <span style={{ fontWeight: 600, color: "#ff8080" }}>Critical:</span>
          <span style={{ color: "#e8f5ef" }}>
            {critBins.slice(0, 3).map((b) => `${b.binId || b.id} (${b.capacity}%)`).join(", ")}
            {critBins.length > 3 && ` +${critBins.length - 3} more`}
          </span>
          <span style={{ color: "#5a8a6a", marginLeft: "auto", fontSize: 12 }}>Immediate collection needed</span>
        </div>
      )}

    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────── */
const S = {
  wrapper:    { display: "flex", flexDirection: "column", gap: 20, padding: "4px 0" },
  statsGrid:  { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 },
  card: {
    background:   "linear-gradient(145deg, #131a17, #0d1510)",
    border:       "1px solid rgba(45,255,142,0.1)",
    borderRadius: 16, padding: "18px 20px",
    display:      "flex", flexDirection: "column",
    fontFamily:   "'DM Sans', sans-serif",
  },
  twoCol:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  panel: {
    background:   "#0f1812",
    border:       "1px solid rgba(45,255,142,0.08)",
    borderRadius: 16, overflow: "hidden",
    display:      "flex", flexDirection: "column",
    fontFamily:   "'DM Sans', sans-serif",
  },
  panelHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 18px", borderBottom: "1px solid rgba(45,255,142,0.07)",
  },
  panelTitle: { fontSize: 14, fontWeight: 700, color: "#c8e8d4" },
  panelCount: { fontSize: 11.5, color: "#4a6e5a", background: "rgba(45,255,142,0.06)", padding: "3px 9px", borderRadius: 20 },
  listScroll: { overflowY: "auto", maxHeight: 320 },
  binRow: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "11px 18px",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
    transition: "background 0.15s",
  },
  reportRow: {
    display: "flex", alignItems: "flex-start", gap: 10,
    padding: "11px 18px",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  statusDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 2 },
  badge: { fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20 },
  emptyList: { padding: "32px 18px", color: "#4a6e5a", fontSize: 13, textAlign: "center" },
  emptyWrap: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "60px 20px",
    fontFamily: "'DM Sans', sans-serif",
  },
  loadingWrap: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "60px 20px",
  },
  spinner: {
    width: 36, height: 36,
    border: "3px solid rgba(45,255,142,0.1)",
    borderTop: "3px solid #2dff8e",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  alertStrip: {
    display: "flex", alignItems: "center", gap: 10,
    background: "rgba(255,82,82,0.07)",
    border: "1px solid rgba(255,82,82,0.2)",
    borderRadius: 12, padding: "12px 18px",
    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    flexWrap: "wrap",
  },
};