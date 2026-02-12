/* ========== EDR Notify: creates a nice in-app popup ========== */
(function () {
  function fmtDate(iso) {
    if (!iso) return "";
    const [y,m,d] = iso.split("-").map(Number);
    return new Date(y, m-1, d).toLocaleDateString(undefined, { month:"short", day:"numeric", year:"numeric" });
  }
  function nowClock() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function makeOverlay() {
    const o = document.createElement('div');
    o.className = 'edr-ntf-overlay';
    o.addEventListener('click', (e)=> {
      if (e.target === o) closeOverlay(o);
    });
    return o;
  }
  function closeOverlay(o) {
    if (!o) return;
    o.style.animation = 'edr-fade .16s reverse ease-in';
    const card = o.querySelector('.edr-ntf-card');
    if (card) card.style.animation = 'edr-pop .18s reverse ease-in';
    setTimeout(()=>o.remove(), 120);
  }

  function buildCard(kind, items) {
    const overlay = makeOverlay();

    const card = document.createElement('div');
    card.className = 'edr-ntf-card';
    card.innerHTML = `
      <div class="edr-ntf-head">
        <div class="edr-ntf-icon">⏰</div>
        <div>
          <div class="edr-ntf-title">
            ${kind === 'today' ? 'Items expiring today' : 'Upcoming expiries'}
          </div>
          <div class="edr-ntf-subtitle">at ${nowClock()}</div>
        </div>
      </div>
      <div class="edr-ntf-body">
        <div class="edr-ntf-list"></div>
      </div>
      <div class="edr-ntf-foot">
        <button class="edr-ntf-btn secondary" id="edrNtfSnooze">Snooze 10 min</button>
        <button class="edr-ntf-btn primary"   id="edrNtfOk">Got it</button>
      </div>
    `;

    const list = card.querySelector('.edr-ntf-list');
    items.forEach(it => {
      const row = document.createElement('div');
      row.className = 'edr-ntf-item';
      row.innerHTML = `
        <div class="edr-ntf-l">
          <div class="edr-ntf-name">${it.name}</div>
          <div class="edr-ntf-meta">Expiry: ${fmtDate(it.expiry)}</div>
        </div>
        <div class="edr-ntf-chip">${kind === 'today' ? 'Today' : 'Soon'}</div>
      `;
      list.appendChild(row);
    });

    const ok   = card.querySelector('#edrNtfOk');
    const snz  = card.querySelector('#edrNtfSnooze');
    ok.addEventListener('click', () => closeOverlay(overlay));
    snz.addEventListener('click', () => {
      try {
        // lightweight “snooze” using setTimeout while tab is open
        setTimeout(() => {
          EDRNotify.showCustom(
            "Reminder (Snoozed)",
            "Here are the items you snoozed:",
            items,
            'soon'
          );
        }, 10 * 60 * 1000);
        snz.textContent = "Snoozed ✓";
        snz.disabled = true;
      } catch {}
    });

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  function showCustom(title, subtitle, items, kind = 'today') {
    const overlay = makeOverlay();
    const card = document.createElement('div');
    card.className = 'edr-ntf-card';
    card.innerHTML = `
      <div class="edr-ntf-head">
        <div class="edr-ntf-icon">🔔</div>
        <div>
          <div class="edr-ntf-title">${title}</div>
          <div class="edr-ntf-subtitle">${subtitle}</div>
        </div>
      </div>
      <div class="edr-ntf-body"><div class="edr-ntf-list"></div></div>
      <div class="edr-ntf-foot">
        <button class="edr-ntf-btn primary" id="edrNtfClose">Close</button>
      </div>
    `;
    const list = card.querySelector('.edr-ntf-list');
    items.forEach(it => {
      const row = document.createElement('div');
      row.className = 'edr-ntf-item';
      row.innerHTML = `
        <div class="edr-ntf-l">
          <div class="edr-ntf-name">${it.name}</div>
          <div class="edr-ntf-meta">Expiry: ${fmtDate(it.expiry)}</div>
        </div>
        <div class="edr-ntf-chip">${kind === 'today' ? 'Today' : 'Soon'}</div>
      `;
      list.appendChild(row);
    });
    card.querySelector('#edrNtfClose').addEventListener('click', () => closeOverlay(overlay));
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  window.EDRNotify = {
    showToday(items) { buildCard('today', items); },
    showSoon(items)  { buildCard('soon',  items); },
    showCustom
  };
})();
