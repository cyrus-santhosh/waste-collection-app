/**
 * WasteWatch — Firebase Backend (firebase.js)
 * ─────────────────────────────────────────────
 * Exposes globals required by App.js / header module:
 *   window.__db        → Firestore database instance
 *   window.__firebase  → Firestore helper functions
 *   window.__dbReady   → true (set before "firebase-ready" fires)
 *
 * Named exports:
 *   getBins()                        → Promise<Bin[]>
 *   getBin(id)                       → Promise<Bin | null>
 *   addReport(payload)               → Promise<string>
 *   updateBinStatus(id, status, cap) → Promise<void>
 *   subscribeToBins(cb)              → unsubscribe fn
 *   subscribeToReports(cb, limit)    → unsubscribe fn
 *   seedDemoData()                   → Promise<void>  (dev only)
 */

import { initializeApp } from "firebase/app";
import { getAnalytics }  from "firebase/analytics";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

/* ── 1. CONFIG ──────────────────────────────────────────────────── */
const firebaseConfig = {
  apiKey:            "AIzaSyCvKWw7O5Q4BuUcMUcPRXRWeqUdS9VbLOU",
  authDomain:        "waste-collection-app-5e05c.firebaseapp.com",
  projectId:         "waste-collection-app-5e05c",
  storageBucket:     "waste-collection-app-5e05c.firebasestorage.app",
  messagingSenderId: "98185232937",
  appId:             "1:98185232937:web:28bec0e79f2e4136059238",
  measurementId:     "G-CM3HK4QC7Z",
};

/* ── 2. INIT ────────────────────────────────────────────────────── */
const app       = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);          // Google Analytics
const db        = getFirestore(app);

/* ── 3. EXPOSE GLOBALS (required by App.js / header module) ──────
   The header module reads window.__firebase and window.__db
   directly, so these must be set before initHeader() runs.
────────────────────────────────────────────────────────────────── */
window.__db = db;

window.__firebase = {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs,
  getDoc,
  Timestamp,
};

window.__dbReady = true;
window.dispatchEvent(new Event("firebase-ready"));

/* ── 4. COLLECTION REFS ─────────────────────────────────────────
   Firestore schema
   ─────────────────
   bins/{binDocId}
     binId        string    e.g. "BIN-042"
     address      string    human-readable address
     status       "ok" | "full" | "overflow" | "damaged"
     capacity     number    fill % 0–100
     lat          number
     lng          number
     lastEmptied  Timestamp
     updatedAt    Timestamp

   reports/{reportId}
     binId        string    references a bin's binId field
     issue        string    e.g. "Full", "Overflow", "Damaged", "Smell"
     notes        string
     lat          number
     lng          number
     status       "open" | "in-progress" | "resolved"
     createdAt    Timestamp (server)
────────────────────────────────────────────────────────────────── */
const binsRef    = collection(db, "bins");
const reportsRef = collection(db, "reports");

/* ── 5. EXPORTED HELPERS ─────────────────────────────────────── */

/**
 * Fetch all bins once.
 * @returns {Promise<Array<{id: string, [key: string]: any}>>}
 */
export async function getBins() {
  const snap = await getDocs(binsRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch a single bin by its Firestore document ID.
 * @param {string} id
 * @returns {Promise<{id: string, [key: string]: any} | null>}
 */
export async function getBin(id) {
  const snap = await getDoc(doc(db, "bins", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Submit a new issue report.
 * @param {{
 *   binId:  string,
 *   issue:  string,
 *   notes?: string,
 *   lat?:   number,
 *   lng?:   number,
 * }} payload
 * @returns {Promise<string>} Firestore document id of the new report
 */
export async function addReport(payload) {
  const docRef = await addDoc(reportsRef, {
    ...payload,
    status:    "open",
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update a bin's status and optionally its fill capacity.
 * @param {string} binDocId             Firestore doc id of the bin
 * @param {"ok"|"full"|"overflow"|"damaged"} status
 * @param {number} [capacity]           Optional fill % 0–100
 * @returns {Promise<void>}
 */
export async function updateBinStatus(binDocId, status, capacity) {
  const update = { status, updatedAt: serverTimestamp() };
  if (capacity !== undefined) update.capacity = capacity;
  await updateDoc(doc(db, "bins", binDocId), update);
}

/**
 * Real-time listener for the bins collection.
 * @param {(bins: Array<{id: string, [key: string]: any}>) => void} callback
 * @returns {() => void} unsubscribe function
 *
 * @example
 *   const unsub = subscribeToBins((bins) => renderMap(bins));
 *   // cleanup: unsub();
 */
export function subscribeToBins(callback) {
  return onSnapshot(binsRef, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/**
 * Real-time listener for reports, ordered newest-first.
 * @param {(reports: Array<{id: string, [key: string]: any}>) => void} callback
 * @param {number} [limit=50]
 * @returns {() => void} unsubscribe function
 */
export function subscribeToReports(callback, limit = 50) {
  const q = query(reportsRef, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.slice(0, limit).map((d) => ({ id: d.id, ...d.data() }))
    );
  });
}

/* ── 6. DEV SEED — remove or guard before production ─────────── */
/**
 * Populate Firestore with Bengaluru demo data for local testing.
 * Call from the browser console:
 *   import { seedDemoData } from "./firebase";
 *   await seedDemoData();
 */
export async function seedDemoData() {
  const demoBins = [
    { binId: "BIN-001", address: "MG Road, Bengaluru",    status: "full",     capacity: 95,  lat: 12.9716, lng: 77.5946 },
    { binId: "BIN-002", address: "Koramangala 5th Block", status: "ok",       capacity: 40,  lat: 12.9352, lng: 77.6245 },
    { binId: "BIN-003", address: "Indiranagar 100ft Rd",  status: "overflow", capacity: 100, lat: 12.9784, lng: 77.6408 },
    { binId: "BIN-004", address: "HSR Layout Sector 7",   status: "ok",       capacity: 22,  lat: 12.9121, lng: 77.6446 },
    { binId: "BIN-005", address: "Whitefield Main Rd",    status: "damaged",  capacity: 60,  lat: 12.9698, lng: 77.7499 },
  ];

  const demoReports = [
    { binId: "BIN-001", issue: "Full",     notes: "Overflowing since morning",  lat: 12.9716, lng: 77.5946 },
    { binId: "BIN-003", issue: "Overflow", notes: "Waste spilling on pavement", lat: 12.9784, lng: 77.6408 },
    { binId: "BIN-005", issue: "Damaged",  notes: "Lid broken",                 lat: 12.9698, lng: 77.7499 },
  ];

  console.log("🌱 Seeding demo data…");

  for (const bin of demoBins) {
    await addDoc(binsRef, {
      ...bin,
      lastEmptied: Timestamp.fromDate(new Date(Date.now() - 86_400_000)),
      updatedAt:   serverTimestamp(),
    });
  }

  for (const report of demoReports) {
    await addDoc(reportsRef, {
      ...report,
      status:    "open",
      createdAt: serverTimestamp(),
    });
  }

  console.log("✅ Demo data seeded — refresh the app.");
}

export { db, analytics };