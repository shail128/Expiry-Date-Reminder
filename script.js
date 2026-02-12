/* ================= Expiry Date Reminder: script.js ================= */

/* ---------- Keys ---------- */
const STORAGE_KEY    = "edr_items";
const SETTINGS_KEY   = "edr_settings";
const NOTIFY_LOG_KEY = "edr_notify_log";

/* ---------- Storage helpers ---------- */
const loadItems = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
};
const saveItems = (arr) => localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));

function loadSettings() {
  // DEFAULT leadDays reset to 7
  const def = { leadDays: 7, theme: "light", notify: false, notifyTime: "09:00" };
  try { return { ...def, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}) }; }
  catch { return def; }
}
const saveSettings = (s) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));

const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------- Date helpers ---------- */
function daysUntil(iso) {
  if (!iso) return 99999;
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((target - today) / msPerDay);
}
function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

/* ---------- Tiny UI helpers ---------- */
function badge(text, type) {
  const map = { danger: "#d32f2f", warn: "#f57c00", ok: "#2e7d32" };
  return `<span style="background:${map[type]};color:#fff;padding:2px 8px;border-radius:999px;font-size:.72rem;margin-left:6px;">${text}</span>`;
}
function renderEmpty(targetEl, msg) {
  targetEl.innerHTML = `
    <div class="empty-state">
      <img src="https://cdn-icons-png.flaticon.com/512/3082/3082031.png" alt="Empty">
      <p>${msg} 🛒</p>
    </div>`;
}

/* ===================================================== */
/* Add Item page                                         */
/* ===================================================== */
function initAddItemPage() {
  const form = document.getElementById("itemForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const category = document.getElementById("category").value;
    const expiry = document.getElementById("expiry").value;
    const quantity = document.getElementById("quantity").value.trim();

    if (!name || !category || !expiry) {
      alert("Please fill Item Name, Food Type and Expiry Date.");
      return;
    }

    const items = loadItems();
    items.push({
      id: uid(),
      name,
      category,
      expiry,
      quantity: quantity || null,
      createdAt: new Date().toISOString()
    });
    saveItems(items);

    form.reset();
    alert("Item saved ✅");
    refreshDashboard();
  });
}

/* ===================================================== */
/* Dashboard (Home) + Delete                             */
/* ===================================================== */
function renderRow(item) {
  const lead = loadSettings().leadDays;
  const d = daysUntil(item.expiry);
  let tone = "ok", tag = "Safe";
  if (d < 0) { tone = "danger"; tag = "Expired"; }
  else if (d === 0) { tone = "danger"; tag = "Today"; }
  else if (d <= lead) { tone = "warn"; tag = `${d}d`; }

  return `
    <div class="mini-item" data-id="${item.id}">
      <div class="mini-left">
        <div class="mini-title">${item.name}</div>
        <div class="mini-meta">Exp: ${fmtDate(item.expiry)} • ${item.category || "Uncategorized"} ${badge(tag, tone)}</div>
      </div>
      <div class="mini-right">
        ${item.quantity ? `<span class="qty">×${item.quantity}</span>` : ""}
        <button class="icon-btn delete" title="Delete" data-id="${item.id}">🗑️</button>
      </div>
    </div>`;
}

function refreshDashboard() {
  const todayBox = document.getElementById("expiring-today-list");
  const weekBox  = document.getElementById("expiring-week-list");
  const safeBox  = document.getElementById("safe-list");
  if (!(todayBox && weekBox && safeBox)) return;

  const items = loadItems();
  const lead = loadSettings().leadDays;

  const today = [], week = [], safe = [];
  items.forEach((it) => {
    const d = daysUntil(it.expiry);
    if (d === 0) today.push(it);
    else if (d > 0 && d <= lead) week.push(it);
    else if (d > lead) safe.push(it);
  });

  if (today.length) todayBox.innerHTML = today.sort((a,b)=>a.expiry.localeCompare(b.expiry)).map(renderRow).join("");
  else renderEmpty(todayBox, "No items expiring today");

  if (week.length) weekBox.innerHTML = week.sort((a,b)=>a.expiry.localeCompare(b.expiry)).map(renderRow).join("");
  else renderEmpty(weekBox, "No upcoming items");

  if (safe.length) safeBox.innerHTML = safe.sort((a,b)=>a.expiry.localeCompare(b.expiry)).map(renderRow).join("");
  else renderEmpty(safeBox, "No safe items yet");

  // delete handling (event delegation)
  ["expiring-today-list","expiring-week-list","safe-list"].forEach(id => {
    const box = document.getElementById(id);
    if (!box) return;
    box.onclick = (e) => {
      const btn = e.target.closest(".delete");
      if (!btn) return;
      const id = btn.dataset.id;
      if (!id || !confirm("Delete this item?")) return;
      saveItems(loadItems().filter(it => it.id !== id));
      refreshDashboard();
    };
  });

  // Smooth scroll for hero button
  const seeAllBtn = document.getElementById("seeAllBtn");
  const dash = document.getElementById("dashboard");
  if (seeAllBtn && dash) seeAllBtn.onclick = () => dash.scrollIntoView({ behavior: "smooth" });
}

/* ===================================================== */
/* All Items page + Delete                                */
/* ===================================================== */
function initAllItemsPage() {
  const listEl = document.getElementById("all-items-list");
  if (!listEl) return;

  function draw() {
    const items = loadItems();
    if (!items.length) {
      listEl.innerHTML = `<div class="empty-state"><p>No items yet. Add your first item!</p></div>`;
      return;
    }
    listEl.innerHTML = items
      .sort((a,b)=>a.expiry.localeCompare(b.expiry))
      .map(it => `
        <div class="row-item" data-id="${it.id}">
          <div>
            <div class="row-title">${it.name}</div>
            <div class="row-sub">Category: ${it.category} • Exp: ${fmtDate(it.expiry)}</div>
          </div>
          <div>
            ${it.quantity ? `×${it.quantity}` : ""}
            <button class="icon-btn delete" data-id="${it.id}">🗑️</button>
          </div>
        </div>`).join("");
  }

  listEl.onclick = (e) => {
    const btn = e.target.closest(".delete");
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id || !confirm("Delete this item?")) return;
    saveItems(loadItems().filter(it => it.id !== id));
    draw();
  };

  draw();
}

/* ===================================================== */
/* Analytics page (simple bar charts without libraries)   */
/* ===================================================== */
function initAnalyticsPage() {
  const totalEl   = document.getElementById("ana-total");
  const todayEl   = document.getElementById("ana-today");
  const weekEl    = document.getElementById("ana-week");
  const safeEl    = document.getElementById("ana-safe");
  const expiredEl = document.getElementById("ana-expired");
  const catNote   = document.getElementById("catNote");
  const catCanvas = document.getElementById("catChart");
  const timeCanvas= document.getElementById("timelineChart");
  if (!totalEl) return;

  const items = loadItems();
  const lead = loadSettings().leadDays;

  let today=0, week=0, safe=0, expired=0;
  items.forEach(it => {
    const d = daysUntil(it.expiry);
    if (d < 0) expired++;
    else if (d === 0) today++;
    else if (d <= lead) week++;
    else safe++;
  });

  totalEl.textContent   = items.length;
  todayEl.textContent   = today;
  weekEl.textContent    = week;
  safeEl.textContent    = safe;
  expiredEl.textContent = expired;

  const catMap = {};
  items.forEach(it => {
    const k = (it.category || "Uncategorized").trim();
    catMap[k] = (catMap[k] || 0) + 1;
  });
  const catLabels = Object.keys(catMap);
  const catData   = catLabels.map(k => catMap[k]);
  if (!catLabels.length && catNote) catNote.textContent = "No items to show yet.";

  if (catCanvas) drawBars(catCanvas, catLabels, catData, { title: "Categories" });

  const days = Array.from({length:14}, (_,i)=>i);
  const dayLabels = days.map(i => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return d.toLocaleDateString(undefined, { month:"short", day:"numeric" });
  });
  const dayCounts = days.map(()=>0);
  items.forEach(it => {
    const d = daysUntil(it.expiry);
    if (d >= 0 && d < 14) dayCounts[d]++;
  });
  if (timeCanvas) drawBars(timeCanvas, dayLabels, dayCounts, { title: "Next 14 Days", compact:true });
}

function drawBars(canvas, labels, data, opts = {}) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  const padding = 40, maxVal = Math.max(1, ...data);
  const count = data.length, gap = 12;
  const barW = Math.max(12, (W - padding*2 - gap*(count-1)) / Math.max(count,1));

  // axes
  ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, H - padding);
  ctx.lineTo(W - padding, H - padding);
  ctx.moveTo(padding, H - padding);
  ctx.lineTo(padding, padding);
  ctx.stroke();

  // bars
  for (let i=0;i<count;i++){
    const x = padding + i*(barW + gap);
    const h = Math.round((data[i]/maxVal) * (H - padding*2));
    const y = H - padding - h;

    const grad = ctx.createLinearGradient(0, y, 0, y+h);
    grad.addColorStop(0, "#0f84d8"); grad.addColorStop(1, "#0b72b9");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barW, h);

    ctx.fillStyle = "#0d3b66";
    ctx.font = "bold 12px Poppins, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(data[i]), x + barW/2, y - 6);

    ctx.save();
    ctx.fillStyle = "#5a7184";
    ctx.font = "11px Poppins, sans-serif";
    ctx.translate(x + barW/2, H - padding + 14);
    if ((opts.compact && labels[i]?.length > 4) || labels[i]?.length > 8) {
      ctx.rotate(-Math.PI/4); ctx.translate(0, 6);
    }
    ctx.fillText(labels[i] || "", 0, 0);
    ctx.restore();
  }
}

/* ===================================================== */
/* Settings page (lead days, theme, clear, notifications) */
/* ===================================================== */
function applyTheme(theme){
  if (theme === "dark") document.body.classList.add("dark");
  else document.body.classList.remove("dark");
}

/* =================== NOTIFICATIONS: upgraded =================== */
function getNotifyLog() {
  try { return JSON.parse(localStorage.getItem(NOTIFY_LOG_KEY)) || {}; }
  catch { return {}; }
}
function setNotifyLog(log) {
  localStorage.setItem(NOTIFY_LOG_KEY, JSON.stringify(log));
}
function resetNotifyLogIfNewDay() {
  const todayStr = new Date().toDateString();
  const log = getNotifyLog();
  if (log._day !== todayStr) {
    setNotifyLog({ _day: todayStr, sent: { today: "", soon: "", expired: "" } });
  }
}
function markSent(kind, sig) {
  const log = getNotifyLog();
  log.sent = log.sent || { today: "", soon: "", expired: "" };
  log.sent[kind] = sig;
  setNotifyLog(log);
}
function wasSent(kind, sig) {
  const log = getNotifyLog();
  const current = log?.sent?.[kind] || "";
  return current === sig;
}

async function ensureSW() {
  if (!('serviceWorker' in navigator)) { console.warn("SW not supported"); return null; }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    console.log("[SW] ready");
    return reg;
  } catch (e) {
    console.error("[SW] register error", e);
    return null;
  }
}
async function requestNotifyPermission() {
  if (!('Notification' in window)) { alert("Notifications not supported in this browser."); return false; }
  let perm = Notification.permission;
  if (perm === 'default') perm = await Notification.requestPermission();
  console.log("[Notify] permission:", perm);
  if (perm !== 'granted') { alert("Please allow notifications (URL bar → Permissions)."); return false; }
  return true;
}
async function sendNotification(title, body) {
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      body,
      icon: 'https://cdn-icons-png.flaticon.com/512/415/415733.png',
      badge:'https://cdn-icons-png.flaticon.com/512/415/415733.png'
    });
    return;
  } catch (e) {
    console.warn("[Notify] SW showNotification failed:", e);
  }
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: 'https://cdn-icons-png.flaticon.com/512/415/415733.png' });
  } else {
    alert(`${title}\n${body}`);
  }
}
function parseHHMM(str) {
  if (!str) return { h: 9, m: 0 };
  const cleaned = str.toLowerCase().replace(/\s/g, '');
  const ampm = /am|pm/.test(cleaned) ? cleaned.slice(-2) : null;
  const [hRaw, mRaw='0'] = cleaned.replace(/(am|pm)$/, '').split(':');
  let h = Number(hRaw), m = Number(mRaw);
  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  h = Math.max(0, Math.min(23, h));
  m = Math.max(0, Math.min(59, m));
  return { h, m };
}

function groupItemsForNotifications() {
  const s = loadSettings();
  const items = loadItems();
  const today = [], soon = [], expired = [];
  items.forEach(it => {
    const d = daysUntil(it.expiry);
    if (d === 0) today.push(it);
    else if (d > 0 && d <= s.leadDays) soon.push(it);
    else if (d < 0) expired.push(it);
  });
  return { today, soon, expired };
}
function sigFor(arr) {
  return arr.map(it => `${it.name}__${it.expiry}`).sort().join('|');
}
function listPreview(arr, limit = 5) {
  const top = arr
    .sort((a,b)=>a.expiry.localeCompare(b.expiry))
    .slice(0, limit)
    .map(it => `${it.name} (${fmtDate(it.expiry)})`)
    .join(', ');
  return top + (arr.length > limit ? ` +${arr.length - limit} more` : '');
}

/* ---------- CHANGED FUNCTION: includes custom popup calls ---------- */
async function runExpiryNotificationCheck() {
  const s = loadSettings();
  if (!s.notify) return;

  resetNotifyLogIfNewDay();
  const { today, soon /*, expired*/ } = groupItemsForNotifications();

  // Expiring today -> in-app popup + system notification
  if (today.length) {
    const sigT = sigFor(today);
    if (!wasSent("today", sigT)) {
      if (window.EDRNotify?.showToday) EDRNotify.showToday(today);
      await sendNotification("Expiring today", listPreview(today));
      markSent("today", sigT);
    } else {
      console.log("[Notify] 'today' already sent");
    }
  }

  // Upcoming within lead days -> optional popup + system notification
  if (soon.length) {
    const sigS = sigFor(soon);
    if (!wasSent("soon", sigS)) {
      if (window.EDRNotify?.showSoon) EDRNotify.showSoon(soon);
      await sendNotification("Upcoming expiries", listPreview(soon));
      markSent("soon", sigS);
    } else {
      console.log("[Notify] 'soon' already sent");
    }
  }
}

function startMinuteLoop() {
  if (!window.__edr_minute_loop) {
    window.__edr_minute_loop = setInterval(runExpiryNotificationCheck, 60 * 1000);
  }
}
function scheduleDailyCheck() {
  const s = loadSettings();
  if (!s.notify) return;

  const { h, m } = parseHHMM(s.notifyTime || "09:00");
  const now = new Date();
  const next = new Date();
  next.setHours(h, m, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  const delay = next - now;
  if (window.__edr_daily_timer) clearTimeout(window.__edr_daily_timer);
  window.__edr_daily_timer = setTimeout(() => {
    runExpiryNotificationCheck();
    window.__edr_daily_interval = setInterval(runExpiryNotificationCheck, 24*60*60*1000);
  }, delay);

  console.log(`[Notify] scheduled for ${next.toLocaleString()}`);
}
async function initNotificationsEngine() {
  const ok = await requestNotifyPermission();
  if (!ok) return;
  await ensureSW();
  resetNotifyLogIfNewDay();
  runExpiryNotificationCheck();   // immediate
  startMinuteLoop();              // every minute while tab open
  scheduleDailyCheck();           // at chosen time
}

/* ---- Actual Settings UI wiring ---- */
function initSettingsPage() {
  const leadInput = document.getElementById("set-lead");
  const themeChk  = document.getElementById("set-theme");
  const clearBtn  = document.getElementById("btn-clear");

  const notifChk  = document.getElementById("set-notify");
  const notifTime = document.getElementById("set-notify-time");
  const askBtn    = document.getElementById("btn-ask-permission");
  const testBtn   = document.getElementById("btn-test");

  if (!(leadInput || themeChk || clearBtn || notifChk || notifTime || askBtn || testBtn)) return;

  // load saved
  const s = loadSettings();
  leadInput && (leadInput.value = s.leadDays);
  themeChk  && (themeChk.checked = s.theme === "dark");
  notifChk  && (notifChk.checked = !!s.notify);
  notifTime && (notifTime.value  = s.notifyTime || "09:00");
  applyTheme(s.theme);

  // lead days
  leadInput?.addEventListener("change", () => {
    const v = Math.max(1, Math.min(14, Number(leadInput.value || 7)));
    saveSettings({ ...loadSettings(), leadDays: v });
    alert("Lead days saved.");
  });

  // theme
  themeChk?.addEventListener("change", () => {
    const theme = themeChk.checked ? "dark" : "light";
    saveSettings({ ...loadSettings(), theme });
    applyTheme(theme);
  });

  // notifications
  notifChk?.addEventListener("change", async () => {
    const enabled = notifChk.checked;
    saveSettings({ ...loadSettings(), notify: enabled });
    if (enabled) {
      await initNotificationsEngine();
      alert("Notifications enabled.");
    }
  });

  notifTime?.addEventListener("change", () => {
    saveSettings({ ...loadSettings(), notifyTime: notifTime.value || "09:00" });
    scheduleDailyCheck();
    alert("Notify time saved.");
  });

  // convenience buttons
  askBtn?.addEventListener("click", async () => {
    const ok = await requestNotifyPermission();
    if (ok) { await ensureSW(); alert("Permission granted."); }
  });
  testBtn?.addEventListener("click", async () => {
    const ok = await requestNotifyPermission();
    if (ok) {
      await ensureSW();
      sendNotification("Test notification", "This is how reminders will appear.");
    }
  });

  // danger
  clearBtn?.addEventListener("click", () => {
    if (!confirm("Delete ALL saved items?")) return;
    localStorage.removeItem(STORAGE_KEY);
    alert("All items cleared.");
  });
}

/* ===================================================== */
/* Boot                                                   */
/* ===================================================== */
document.addEventListener("DOMContentLoaded", async () => {
  // Service worker early
  await ensureSW();

  // Apply theme & init pages
  applyTheme(loadSettings().theme);

  initAddItemPage();
  refreshDashboard();
  initAllItemsPage();
  initAnalyticsPage();
  initSettingsPage();

  // === show in-app popup for items expiring TODAY on page load ===
  (function showTodayOnLoad(){
    try {
      const items = loadItems();
      const todayItems = items.filter(it => it && it.expiry && daysUntil(it.expiry) === 0);
      if (todayItems.length && window.EDRNotify?.showToday) {
        console.log("[EDR] showing in-app TODAY popup on load", todayItems);
        EDRNotify.showToday(todayItems);
      }
    } catch (e) {
      console.error("[EDR] showTodayOnLoad error", e);
    }
  })();

  // Notifications engine on load if enabled
  const s = loadSettings();
  if (s.notify) initNotificationsEngine();
});
