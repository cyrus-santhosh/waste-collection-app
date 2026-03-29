/**
 * WasteWatch — Header Component (Vanilla JS)
 * ─────────────────────────────────────────────
 * Features:
 *  • Sticky scroll-shadow effect
 *  • Announcement bar with close/dismiss (sessionStorage)
 *  • Hamburger mobile drawer toggle
 *  • Active nav link highlighting (hash or pathname)
 *  • Live bin count badge via Firebase (optional)
 *  • Keyboard accessibility (Escape closes drawer)
 */
import "./firebase";
import React, { useEffect } from "react";
import "./App.css";
import "leaflet/dist/leaflet.css";
import MapView from "./MapView";

/* ── CONFIG ─────────────────────────────────────────────────────── */
const HEADER_CONFIG = {
  scrollThreshold: 10,            // px before "scrolled" class is applied
  activeClass:     "active",
  scrolledClass:   "scrolled",
  topbarKey:       "ww_topbar_dismissed",  // sessionStorage key
  navLinks: [
    {
      label: "Dashboard",
      icon:  "📊",
      href:  "#dashboard",
      id:    "nav-dashboard",
      alwaysShow: true,
    },
    {
      label: "Bins Map",
      icon:  "🗺️",
      href:  "#map",
      id:    "nav-map",
      alwaysShow: true,
    },
    {
      label: "Reports",
      icon:  "📋",
      href:  "#reports",
      id:    "nav-reports",
    },
    {
      label: "Analytics",
      icon:  "📈",
      href:  "#analytics",
      id:    "nav-analytics",
      dropdown: [
        {
          icon:  "♻️",
          label: "Collection Stats",
          desc:  "View pickup efficiency & trends",
          href:  "#analytics/collection",
        },
        {
          icon:  "🚨",
          label: "Issue Heatmap",
          desc:  "Reported problems by zone",
          href:  "#analytics/heatmap",
        },
        {
          icon:  "📅",
          label: "Schedule Insights",
          desc:  "Optimise collection routes",
          href:  "#analytics/schedule",
        },
      ],
    },
    {
      label: "About",
      icon:  "ℹ️",
      href:  "#about",
      id:    "nav-about",
    },
  ],
};

/* ── TEMPLATE BUILDER ───────────────────────────────────────────── */

/**
 * Build the dropdown menu HTML for a nav item.
 * @param {Array} items
 * @returns {string}
 */
function buildDropdownHTML(items) {
  const rows = items.map(
    (item) => `
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

/**
 * Build a single nav link element (with optional dropdown wrapper).
 * @param {Object} link
 * @returns {string}
 */
function buildNavLinkHTML(link) {
  const alwaysClass = link.alwaysShow ? " always-show" : "";
  const hasDropdown = Array.isArray(link.dropdown) && link.dropdown.length > 0;
  const arrowHTML   = hasDropdown ? `<span class="nav-arrow">▾</span>` : "";

  const anchor = `
    <a
      class="ww-nav-link${alwaysClass}"
      href="${link.href}"
      id="${link.id || ""}"
      role="${hasDropdown ? "button" : "link"}"
      aria-haspopup="${hasDropdown ? "true" : "false"}"
    >
      <span class="nav-icon">${link.icon}</span>
      ${link.label}
      ${arrowHTML}
    </a>`;

  if (hasDropdown) {
    return `<div class="ww-dropdown">${anchor}${buildDropdownHTML(link.dropdown)}</div>`;
  }
  return anchor;
}

/**
 * Build the full header HTML string and inject it into the DOM.
 * Call this once on DOMContentLoaded.
 */
function buildHeader() {
  const navHTML = HEADER_CONFIG.navLinks.map(buildNavLinkHTML).join("");

  // Mobile nav links (flat, no dropdowns)
  const mobileNavHTML = HEADER_CONFIG.navLinks.map((link) => `
    <a class="ww-nav-link" href="${link.href}">
      <span class="nav-icon">${link.icon}</span>
      ${link.label}
    </a>`
  ).join("");

  const html = `
    <!-- Announcement Bar -->
    <div class="ww-topbar" id="ww-topbar" role="banner" aria-live="polite">
      <span class="topbar-icon">♻️</span>
      <span>
        WasteWatch v2.0 is live — real-time bin tracking &amp; smart routing.
        <a href="#whats-new">See what's new →</a>
      </span>
      <button class="topbar-close" id="topbar-close" aria-label="Dismiss announcement">✕</button>
    </div>

    <!-- Main Header -->
    <header class="ww-header" id="ww-header" role="navigation" aria-label="Main navigation">

      <!-- Logo -->
      <a class="ww-logo" href="#dashboard" aria-label="WasteWatch home">
        <span class="ww-logo-icon" aria-hidden="true">🗑️</span>
        <span class="ww-logo-text">Waste<span>Watch</span></span>
        <span class="ww-logo-badge">BETA</span>
      </a>

      <!-- Desktop Nav -->
      <nav class="ww-nav" aria-label="Primary">
        ${navHTML}

        <!-- Live status pill -->
        <div class="ww-status-pill" title="All systems operational" id="ww-status-pill">
          <span class="ww-status-dot" aria-hidden="true"></span>
          <span id="ww-live-count">Loading…</span>
        </div>
      </nav>

      <!-- Right Actions -->
      <div class="ww-header-actions">
        <!-- Notifications -->
        <button class="ww-icon-btn" id="ww-notif-btn" aria-label="Notifications" title="Notifications">
          🔔
          <span class="notif-badge" id="ww-notif-badge" aria-label="Unread notifications"></span>
        </button>

        <!-- Locate me -->
        <button class="ww-icon-btn" id="ww-locate-btn" aria-label="Find nearest bin" title="Find nearest bin">
          📍
        </button>

        <button class="ww-btn-ghost" id="ww-login-btn">Log in</button>
        <a class="ww-btn-primary" href="#report" id="ww-report-btn">
          ＋ Report Issue
        </a>

        <!-- Mobile hamburger -->
        <button class="ww-hamburger" id="ww-hamburger" aria-label="Toggle menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>

    <!-- Mobile Drawer -->
    <nav class="ww-mobile-nav" id="ww-mobile-nav" aria-label="Mobile navigation">
      ${mobileNavHTML}
      <div class="mobile-divider"></div>
      <div class="mobile-actions">
        <button class="ww-btn-ghost">Log in</button>
        <a class="ww-btn-primary" href="#report">＋ Report Issue</a>
      </div>
    </nav>
  `;

  // Inject into a wrapper div (or body prepend)
  const wrapper = document.getElementById("ww-header-root");
  if (wrapper) {
    wrapper.innerHTML = html;
  } else {
    const div = document.createElement("div");
    div.id = "ww-header-root";
    div.innerHTML = html;
    document.body.prepend(div);
  }
}

/* ── BEHAVIOUR ──────────────────────────────────────────────────── */

/** Scroll shadow on header */
function initScrollEffect() {
  const header = document.getElementById("ww-header");
  if (!header) return;

  const handler = () => {
    header.classList.toggle(
      HEADER_CONFIG.scrolledClass,
      window.scrollY > HEADER_CONFIG.scrollThreshold
    );
  };
  window.addEventListener("scroll", handler, { passive: true });
  handler(); // run once on init
}

/** Dismiss announcement bar; persist in sessionStorage */
function initTopbar() {
  const topbar = document.getElementById("ww-topbar");
  const closeBtn = document.getElementById("topbar-close");

  if (!topbar || !closeBtn) return;

  // Already dismissed this session?
  if (sessionStorage.getItem(HEADER_CONFIG.topbarKey)) {
    topbar.style.display = "none";
    updateHeaderTop(true);
    return;
  }

  closeBtn.addEventListener("click", () => {
    topbar.style.transition = "opacity 0.25s ease, max-height 0.3s ease";
    topbar.style.overflow = "hidden";
    topbar.style.opacity = "0";
    topbar.style.maxHeight = "0";
    setTimeout(() => {
      topbar.style.display = "none";
      updateHeaderTop(true);
    }, 310);
    sessionStorage.setItem(HEADER_CONFIG.topbarKey, "1");
  });
}

/** Adjust sticky top of header when topbar is removed */
function updateHeaderTop(dismissed) {
  const header = document.getElementById("ww-header");
  const mobileNav = document.getElementById("ww-mobile-nav");
  if (!header) return;
  if (dismissed) {
    header.style.top = "0px";
    if (mobileNav) mobileNav.style.top = "var(--header-h)";
  }
}

/** Hamburger ↔ mobile drawer toggle */
function initMobileMenu() {
  const hamburger = document.getElementById("ww-hamburger");
  const mobileNav = document.getElementById("ww-mobile-nav");

  if (!hamburger || !mobileNav) return;

  function close() {
    hamburger.classList.remove("open");
    hamburger.setAttribute("aria-expanded", "false");
    mobileNav.classList.remove("open");
  }

  hamburger.addEventListener("click", () => {
    const isOpen = hamburger.classList.toggle("open");
    hamburger.setAttribute("aria-expanded", String(isOpen));
    mobileNav.classList.toggle("open", isOpen);
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  // Close when a mobile link is clicked
  mobileNav.querySelectorAll(".ww-nav-link").forEach((link) => {
    link.addEventListener("click", close);
  });

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) {
      close();
    }
  });
}

/** Highlight the active nav link by matching window.location.hash */
function initActiveNav() {
  function update() {
    const hash = window.location.hash || "#dashboard";
    document.querySelectorAll(".ww-nav-link, .ww-dropdown-item").forEach((el) => {
      const href = el.getAttribute("href") || "";
      el.classList.toggle(
        HEADER_CONFIG.activeClass,
        href && hash.startsWith(href.split("/")[0])
      );
    });
  }
  window.addEventListener("hashchange", update);
  update();
}

/** Geolocation "find nearest bin" button */
function initLocateBtn() {
  const btn = document.getElementById("ww-locate-btn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      showHeaderToast("⚠️ Geolocation not supported by your browser.", "warn");
      return;
    }
    btn.textContent = "⏳";
    btn.disabled = true;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        btn.textContent = "📍";
        btn.disabled = false;
        const { latitude: lat, longitude: lng } = pos.coords;
        // Emit a custom event — the Map module listens for this
        window.dispatchEvent(
          new CustomEvent("ww:locate", { detail: { lat, lng } })
        );
        showHeaderToast("📍 Location found! Highlighting nearest bin…", "success");
      },
      () => {
        btn.textContent = "📍";
        btn.disabled = false;
        showHeaderToast("⚠️ Could not access location. Check permissions.", "warn");
      },
      { timeout: 8000, maximumAge: 30_000 }
    );
  });
}

/* ── FIREBASE LIVE COUNT ────────────────────────────────────────── */

/**
 * Subscribe to Firestore bins collection and update the
 * live-count status pill in the header.
 * Called after Firebase is ready (see "firebase-ready" event).
 */
function initLiveCount() {
  const pill = document.getElementById("ww-live-count");
  if (!pill || !window.__db) return;

  const { collection, onSnapshot } = window.__firebase;
  const binsRef = collection(window.__db, "bins");

  onSnapshot(binsRef, (snap) => {
    const total    = snap.size;
    const fullBins = snap.docs.filter(
      (d) => d.data().status === "full"
    ).length;

    pill.textContent = `${total} bins live • ${fullBins} need pickup`;

    // Warn badge if any full bins exist
    const badge = document.getElementById("ww-notif-badge");
    if (badge) badge.style.display = fullBins > 0 ? "block" : "none";
  });
}

/* ── TOAST UTILITY ──────────────────────────────────────────────── */

/**
 * Show a small toast anchored below the header.
 * @param {string} message
 * @param {"success"|"warn"|"error"} type
 * @param {number} duration ms
 */
function showHeaderToast(message, type = "success", duration = 3500) {
  // Remove any existing toast
  document.getElementById("ww-header-toast")?.remove();

  const colorMap = {
    success: "var(--accent)",
    warn:    "var(--warn)",
    error:   "#ff5252",
  };

  const toast = document.createElement("div");
  toast.id = "ww-header-toast";
  Object.assign(toast.style, {
    position:     "fixed",
    top:          "80px",
    left:         "50%",
    transform:    "translateX(-50%) translateY(-6px)",
    background:   "#1a231e",
    border:       `1px solid ${colorMap[type] ?? colorMap.success}`,
    borderLeft:   `3px solid ${colorMap[type] ?? colorMap.success}`,
    color:        "#e8f5ef",
    padding:      "10px 18px",
    borderRadius: "10px",
    fontSize:     "13.5px",
    fontFamily:   "'DM Sans', sans-serif",
    fontWeight:   "500",
    zIndex:       "9999",
    boxShadow:    "0 8px 32px rgba(0,0,0,0.5)",
    opacity:      "0",
    transition:   "opacity 0.22s ease, transform 0.22s ease",
    whiteSpace:   "nowrap",
    pointerEvents:"none",
  });
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger enter
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity   = "1";
      toast.style.transform = "translateX(-50%) translateY(0)";
    });
  });

  // Exit
  setTimeout(() => {
    toast.style.opacity   = "0";
    toast.style.transform = "translateX(-50%) translateY(-6px)";
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// Expose globally so other modules can call it
window.showHeaderToast = showHeaderToast;

/* ── NOTIFICATIONS PANEL (lightweight) ─────────────────────────── */

function initNotifications() {
  const btn = document.getElementById("ww-notif-btn");
  if (!btn) return;

  let panel = null;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();

    if (panel) {
      panel.remove();
      panel = null;
      return;
    }

    panel = document.createElement("div");
    panel.id = "ww-notif-panel";
    Object.assign(panel.style, {
      position:     "fixed",
      top:          "72px",
      right:        "20px",
      width:        "300px",
      background:   "#131a17",
      border:       "1px solid rgba(45,255,142,0.15)",
      borderRadius: "14px",
      padding:      "16px",
      zIndex:       "9998",
      boxShadow:    "0 20px 60px rgba(0,0,0,0.6)",
      fontFamily:   "'DM Sans', sans-serif",
      fontSize:     "13px",
      color:        "#b0ccbc",
      animation:    "dropdown-in 0.18s ease",
    });

    // Notifications are populated by the app; placeholder shown here
    panel.innerHTML = `
      <div style="font-weight:600;color:#e8f5ef;margin-bottom:12px;font-size:14px;">
        🔔 Notifications
      </div>
      <div id="ww-notif-list">
        <div style="color:#7a9e8a;text-align:center;padding:20px 0;">
          No new notifications
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // Populate from Firebase if ready
    if (window.__db) loadNotifications();
  });

  document.addEventListener("click", (e) => {
    if (panel && !panel.contains(e.target) && e.target !== btn) {
      panel.remove();
      panel = null;
    }
  });
}

function loadNotifications() {
  const list = document.getElementById("ww-notif-list");
  if (!list || !window.__db) return;

  const { collection, query, orderBy, onSnapshot, where } = window.__firebase;
  const q = query(
    collection(window.__db, "reports"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snap) => {
    if (!list.isConnected) return;
    if (snap.empty) {
      list.innerHTML = `<div style="color:#7a9e8a;text-align:center;padding:20px 0;">No new notifications</div>`;
      return;
    }

    list.innerHTML = snap.docs.slice(0, 5).map((d) => {
      const data = d.data();
      const time = data.createdAt?.toDate
        ? timeAgo(data.createdAt.toDate())
        : "just now";
      return `
        <div style="padding:10px 0;border-bottom:1px solid rgba(45,255,142,0.08);display:flex;gap:10px;align-items:flex-start;">
          <span style="font-size:18px;">${statusIcon(data.issue)}</span>
          <div>
            <div style="color:#e8f5ef;font-weight:500;font-size:13px;">${data.issue || "Issue reported"}</div>
            <div style="color:#7a9e8a;font-size:11.5px;margin-top:2px;">Bin ${data.binId || "?"} • ${time}</div>
          </div>
        </div>`;
    }).join("") || `<div style="color:#7a9e8a;text-align:center;padding:20px 0;">No new notifications</div>`;
  });
}

/* ── HELPERS ────────────────────────────────────────────────────── */
function timeAgo(date) {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60)  return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function statusIcon(issue) {
  if (!issue) return "📋";
  const i = issue.toLowerCase();
  if (i.includes("full"))     return "🗑️";
  if (i.includes("overflow")) return "⚠️";
  if (i.includes("damage"))   return "🔧";
  if (i.includes("smell"))    return "👃";
  return "📋";
}

/* ── INIT ───────────────────────────────────────────────────────── */

function initHeader() {
  buildHeader();
  initScrollEffect();
  initTopbar();
  initMobileMenu();
  initActiveNav();
  initLocateBtn();
  initNotifications();

  // Live Firestore data (if Firebase already loaded)
  if (window.__dbReady) {
    initLiveCount();
  } else {
    window.addEventListener("firebase-ready", initLiveCount, { once: true });
  }
}


function App() {
  useEffect(() => {
    initHeader();
    showHeaderToast("🚀 WasteWatch loaded!", "success");
  }, []);

  return (
    <div id="app">
      <div className="section" id="dashboard">
        <h1>📊 Dashboard</h1>
        <p>Overview of waste collection system.</p>
      </div>

      <div className="section" id="map">
        <h1>🗺️ Bins Map</h1>
      <MapView />
      </div>

      <div className="section" id="reports">
        <h1>📋 Reports</h1>
      </div>

      <div className="section" id="analytics">
        <h1>📈 Analytics</h1>
      </div>

      <div className="section" id="about">
        <h1>ℹ️ About</h1>
      </div>
    </div>
  );
}

export default App;