/**
 * WasteWatch — App.js (Updated)
 * Integrates ReportModal + Dashboard with live Firebase data.
 */
import "./firebase";
import React, { useEffect, useState } from "react";
import "./App.css";
import "leaflet/dist/leaflet.css";
import MapView    from "./MapView";
import Dashboard  from "./Dashboard";
import ReportModal from "./ReportModal";

/* ── CSS injected once for modal animation + spinner ───────────── */
const GLOBAL_STYLES = `
  @keyframes modal-in {
    from { opacity: 0; transform: scale(0.94) translateY(10px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes dropdown-in {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  body { overflow-x: hidden; }
  /* Scrollbar for panels */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(45,255,142,0.15); border-radius: 4px; }
`;

/* ── Header config & init (unchanged from original) ────────────── */
const HEADER_CONFIG = {
  scrollThreshold: 10,
  activeClass:     "active",
  scrolledClass:   "scrolled",
  topbarKey:       "ww_topbar_dismissed",
  navLinks: [
    { label: "Dashboard", icon: "📊", href: "#dashboard", id: "nav-dashboard", alwaysShow: true },
    { label: "Bins Map",  icon: "🗺️", href: "#map",       id: "nav-map",       alwaysShow: true },
    { label: "Reports",   icon: "📋", href: "#reports",   id: "nav-reports" },
    {
      label: "Analytics", icon: "📈", href: "#analytics", id: "nav-analytics",
      dropdown: [
        { icon: "♻️", label: "Collection Stats",  desc: "View pickup efficiency & trends", href: "#analytics/collection" },
        { icon: "🚨", label: "Issue Heatmap",      desc: "Reported problems by zone",       href: "#analytics/heatmap"   },
        { icon: "📅", label: "Schedule Insights",  desc: "Optimise collection routes",      href: "#analytics/schedule"  },
      ],
    },
    { label: "About", icon: "ℹ️", href: "#about", id: "nav-about" },
  ],
};

function buildDropdownHTML(items) {
  const rows = items.map((item) => `
    <a class="ww-dropdown-item" href="${item.href}">
      <span class="di-icon">${item.icon}</span>
      <span>
        <div class="di-label">${item.label}</div>
        <div class="di-desc">${item.desc}</div>
      </span>
    </a>`
  ).join('<div class="ww-dropdown-divider"></div>');
  return `<div class="ww-dropdown-menu">${rows}</div>`;
}

function buildNavLinkHTML(link) {
  const alwaysClass = link.alwaysShow ? " always-show" : "";
  const hasDropdown = Array.isArray(link.dropdown) && link.dropdown.length > 0;
  const arrowHTML   = hasDropdown ? `<span class="nav-arrow">▾</span>` : "";
  const anchor = `
    <a class="ww-nav-link${alwaysClass}" href="${link.href}"
       id="${link.id || ""}"
       role="${hasDropdown ? "button" : "link"}"
       aria-haspopup="${hasDropdown ? "true" : "false"}">
      <span class="nav-icon">${link.icon}</span>
      ${link.label}
      ${arrowHTML}
    </a>`;
  return hasDropdown ? `<div class="ww-dropdown">${anchor}${buildDropdownHTML(link.dropdown)}</div>` : anchor;
}

function buildHeader(onReportClick) {
  const navHTML       = HEADER_CONFIG.navLinks.map(buildNavLinkHTML).join("");
  const mobileNavHTML = HEADER_CONFIG.navLinks.map((link) => `
    <a class="ww-nav-link" href="${link.href}">
      <span class="nav-icon">${link.icon}</span>
      ${link.label}
    </a>`
  ).join("");

  const html = `
    <div class="ww-topbar" id="ww-topbar" role="banner" aria-live="polite">
      <span class="topbar-icon">♻️</span>
      <span>
        WasteWatch v2.0 is live — real-time bin tracking &amp; smart routing.
        <a href="#whats-new">See what's new →</a>
      </span>
      <button class="topbar-close" id="topbar-close" aria-label="Dismiss announcement">✕</button>
    </div>

    <header class="ww-header" id="ww-header" role="navigation" aria-label="Main navigation">
      <a class="ww-logo" href="#dashboard" aria-label="WasteWatch home">
        <span class="ww-logo-icon" aria-hidden="true">🗑️</span>
        <span class="ww-logo-text">Waste<span>Watch</span></span>
        <span class="ww-logo-badge">BETA</span>
      </a>

      <nav class="ww-nav" aria-label="Primary">
        ${navHTML}
        <div class="ww-status-pill" title="All systems operational" id="ww-status-pill">
          <span class="ww-status-dot" aria-hidden="true"></span>
          <span id="ww-live-count">Loading…</span>
        </div>
      </nav>

      <div class="ww-header-actions">
        <button class="ww-icon-btn" id="ww-notif-btn" aria-label="Notifications">
          🔔
          <span class="notif-badge" id="ww-notif-badge" aria-label="Unread notifications"></span>
        </button>
        <button class="ww-icon-btn" id="ww-locate-btn" aria-label="Find nearest bin">📍</button>
        <button class="ww-btn-ghost" id="ww-login-btn">Log in</button>

        <!-- Report Issue button now triggers React modal -->
        <button class="ww-btn-primary" id="ww-report-btn">＋ Report Issue</button>

        <button class="ww-hamburger" id="ww-hamburger" aria-label="Toggle menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>

    <nav class="ww-mobile-nav" id="ww-mobile-nav" aria-label="Mobile navigation">
      ${mobileNavHTML}
      <div class="mobile-divider"></div>
      <div class="mobile-actions">
        <button class="ww-btn-ghost">Log in</button>
        <button class="ww-btn-primary" id="ww-mobile-report-btn">＋ Report Issue</button>
      </div>
    </nav>
  `;

  const wrapper = document.getElementById("ww-header-root") || (() => {
    const div = document.createElement("div");
    div.id = "ww-header-root";
    document.body.prepend(div);
    return div;
  })();
  wrapper.innerHTML = html;

  // Wire the header Report Issue buttons to the React callback
  ["ww-report-btn", "ww-mobile-report-btn"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", onReportClick);
  });
}

function initScrollEffect() {
  const header = document.getElementById("ww-header");
  if (!header) return;
  const handler = () => header.classList.toggle("scrolled", window.scrollY > 10);
  window.addEventListener("scroll", handler, { passive: true });
  handler();
}

function initTopbar() {
  const topbar   = document.getElementById("ww-topbar");
  const closeBtn = document.getElementById("topbar-close");
  if (!topbar || !closeBtn) return;
  if (sessionStorage.getItem("ww_topbar_dismissed")) {
    topbar.style.display = "none";
    return;
  }
  closeBtn.addEventListener("click", () => {
    topbar.style.transition = "opacity 0.25s ease, max-height 0.3s ease";
    topbar.style.overflow = "hidden";
    topbar.style.opacity = "0";
    topbar.style.maxHeight = "0";
    setTimeout(() => { topbar.style.display = "none"; }, 310);
    sessionStorage.setItem("ww_topbar_dismissed", "1");
  });
}

function initMobileMenu() {
  const hamburger = document.getElementById("ww-hamburger");
  const mobileNav = document.getElementById("ww-mobile-nav");
  if (!hamburger || !mobileNav) return;

  const close = () => {
    hamburger.classList.remove("open");
    hamburger.setAttribute("aria-expanded", "false");
    mobileNav.classList.remove("open");
  };

  hamburger.addEventListener("click", () => {
    const isOpen = hamburger.classList.toggle("open");
    hamburger.setAttribute("aria-expanded", String(isOpen));
    mobileNav.classList.toggle("open", isOpen);
  });

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  mobileNav.querySelectorAll(".ww-nav-link").forEach((link) => link.addEventListener("click", close));
  document.addEventListener("click", (e) => {
    if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) close();
  });
}

function initActiveNav() {
  const update = () => {
    const hash = window.location.hash || "#dashboard";
    document.querySelectorAll(".ww-nav-link, .ww-dropdown-item").forEach((el) => {
      const href = el.getAttribute("href") || "";
      el.classList.toggle("active", !!(href && hash.startsWith(href.split("/")[0])));
    });
  };
  window.addEventListener("hashchange", update);
  update();
}

function initLocateBtn() {
  const btn = document.getElementById("ww-locate-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      window.showHeaderToast?.("⚠️ Geolocation not supported.", "warn");
      return;
    }
    btn.textContent = "⏳";
    btn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        btn.textContent = "📍";
        btn.disabled = false;
        window.dispatchEvent(new CustomEvent("ww:locate", { detail: pos.coords }));
        window.showHeaderToast?.("📍 Location found! Highlighting nearest bin…", "success");
      },
      () => {
        btn.textContent = "📍";
        btn.disabled = false;
        window.showHeaderToast?.("⚠️ Could not access location.", "warn");
      },
      { timeout: 8000, maximumAge: 30_000 }
    );
  });
}

function initLiveCount() {
  const pill = document.getElementById("ww-live-count");
  if (!pill || !window.__db) return;
  const { collection, onSnapshot } = window.__firebase;
  onSnapshot(collection(window.__db, "bins"), (snap) => {
    const full = snap.docs.filter((d) => d.data().status === "full").length;
    pill.textContent = `${snap.size} bins live • ${full} need pickup`;
    const badge = document.getElementById("ww-notif-badge");
    if (badge) badge.style.display = full > 0 ? "block" : "none";
  });
}

function initNotifications() {
  const btn = document.getElementById("ww-notif-btn");
  if (!btn) return;
  let panel = null;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (panel) { panel.remove(); panel = null; return; }

    panel = document.createElement("div");
    panel.id = "ww-notif-panel";
    Object.assign(panel.style, {
      position: "fixed", top: "72px", right: "20px", width: "300px",
      background: "#131a17", border: "1px solid rgba(45,255,142,0.15)",
      borderRadius: "14px", padding: "16px", zIndex: "9998",
      boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
      fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#b0ccbc",
      animation: "dropdown-in 0.18s ease",
    });

    panel.innerHTML = `
      <div style="font-weight:600;color:#e8f5ef;margin-bottom:12px;font-size:14px;">🔔 Notifications</div>
      <div id="ww-notif-list">
        <div style="color:#7a9e8a;text-align:center;padding:20px 0;">Loading…</div>
      </div>`;
    document.body.appendChild(panel);
    if (window.__db) loadNotifications();
  });

  document.addEventListener("click", (e) => {
    if (panel && !panel.contains(e.target) && e.target !== btn) { panel.remove(); panel = null; }
  });
}

function timeAgo(date) {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60)    return "just now";
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}
function statusIcon(issue) {
  const i = (issue || "").toLowerCase();
  if (i.includes("full"))     return "🗑️";
  if (i.includes("overflow")) return "⚠️";
  if (i.includes("damage"))   return "🔧";
  if (i.includes("smell"))    return "👃";
  return "📋";
}

function loadNotifications() {
  const list = document.getElementById("ww-notif-list");
  if (!list || !window.__db) return;
  const { collection, query, orderBy, onSnapshot } = window.__firebase;
  const q = query(collection(window.__db, "reports"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    if (!list.isConnected) return;
    if (snap.empty) {
      list.innerHTML = `<div style="color:#7a9e8a;text-align:center;padding:20px 0;">No new notifications</div>`;
      return;
    }
    list.innerHTML = snap.docs.slice(0, 5).map((d) => {
      const data = d.data();
      const time = data.createdAt?.toDate ? timeAgo(data.createdAt.toDate()) : "just now";
      return `
        <div style="padding:10px 0;border-bottom:1px solid rgba(45,255,142,0.08);display:flex;gap:10px;align-items:flex-start;">
          <span style="font-size:18px;">${statusIcon(data.issue)}</span>
          <div>
            <div style="color:#e8f5ef;font-weight:500;font-size:13px;">${data.issue || "Issue reported"}</div>
            <div style="color:#7a9e8a;font-size:11.5px;margin-top:2px;">Bin ${data.binId || "?"} • ${time}</div>
          </div>
        </div>`;
    }).join("");
  });
}

function showHeaderToast(message, type = "success", duration = 3500) {
  document.getElementById("ww-header-toast")?.remove();
  const colorMap = { success: "var(--accent, #2dff8e)", warn: "#ffcc00", error: "#ff5252" };
  const toast = document.createElement("div");
  toast.id = "ww-header-toast";
  Object.assign(toast.style, {
    position: "fixed", top: "80px", left: "50%",
    transform: "translateX(-50%) translateY(-6px)",
    background: "#1a231e", border: `1px solid ${colorMap[type]}`,
    borderLeft: `3px solid ${colorMap[type]}`,
    color: "#e8f5ef", padding: "10px 18px", borderRadius: "10px",
    fontSize: "13.5px", fontFamily: "'DM Sans', sans-serif", fontWeight: "500",
    zIndex: "9999", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    opacity: "0", transition: "opacity 0.22s ease, transform 0.22s ease",
    whiteSpace: "nowrap", pointerEvents: "none",
  });
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
  }));
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(-6px)";
    setTimeout(() => toast.remove(), 250);
  }, duration);
}
window.showHeaderToast = showHeaderToast;

/* ── App ────────────────────────────────────────────────────────── */
export default function App() {
  const [showModal, setShowModal] = useState(false);

  const openModal  = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  useEffect(() => {
    // Inject global animation styles once
    if (!document.getElementById("ww-global-styles")) {
      const style = document.createElement("style");
      style.id = "ww-global-styles";
      style.textContent = GLOBAL_STYLES;
      document.head.appendChild(style);
    }

    buildHeader(openModal);
    initScrollEffect();
    initTopbar();
    initMobileMenu();
    initActiveNav();
    initLocateBtn();
    initNotifications();

    if (window.__dbReady) {
      initLiveCount();
    } else {
      window.addEventListener("firebase-ready", initLiveCount, { once: true });
    }

    showHeaderToast("🚀 WasteWatch loaded!", "success");
  }, []);

  // Re-wire header buttons if modal state changes
  useEffect(() => {
    ["ww-report-btn", "ww-mobile-report-btn"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.onclick = openModal;
      }
    });
  }, [showModal]);

  return (
    <div id="app">
      {/* ── Report Issue Modal ── */}
      {showModal && <ReportModal onClose={closeModal} />}

      {/* ── Dashboard ── */}
      <div className="section" id="dashboard">
        <h1>📊 Dashboard</h1>
        <Dashboard />
      </div>

      {/* ── Map ── */}
      <div className="section" id="map">
        <h1>🗺️ Bins Map</h1>
        <MapView />
      </div>

      {/* ── Reports ── */}
      <div className="section" id="reports">
        <h1>📋 Reports</h1>
        <p style={{ color: "#5a8a6a", fontFamily: "'DM Sans', sans-serif" }}>
          Live report feed — use the <strong style={{ color: "#2dff8e" }}>＋ Report Issue</strong> button to submit a new report.
        </p>
      </div>

      {/* ── Analytics ── */}
      <div className="section" id="analytics">
        <h1>📈 Analytics</h1>
      </div>

      {/* ── About ── */}
      <div className="section" id="about">
        <h1>ℹ️ About</h1>
      </div>
    </div>
  );
}