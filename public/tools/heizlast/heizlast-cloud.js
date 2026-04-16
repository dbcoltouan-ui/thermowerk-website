/* ============================================================
   Thermowerk Heizlast – Cloud-Sync (Sanity)
   Läuft als Overlay-Script neben dem Original-Tool.
   Nutzt den vom Tool verwendeten localStorage-Key als Brücke.
   ============================================================ */
(function () {
  const LS_KEY = 'thermowerk_heizlast_projekte';
  const API_LIST   = '/api/heizlast-projects';
  const API_AUTH   = '/api/heizlast-auth';

  const $ = (s, p = document) => p.querySelector(s);

  // ─── localStorage-Helpers (spiegeln storage.js des Tools) ───
  function lsList() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
    catch { return {}; }
  }
  function lsSave(name, stateObj) {
    const all = lsList();
    all[name] = { state: stateObj, savedAt: new Date().toISOString() };
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  }

  // ─── DOM-State-Scraper: liest die sichtbaren Ergebniswerte aus dem Tool ───
  // Fallback-Strategie: wenn wir den echten state nicht greifen können, nehmen
  // wir das aktuell lokal gespeicherte Projekt – das Tool speichert beim Klick
  // auf "Speichern" den vollständigen state, wir lesen ihn dann aus localStorage.
  function getCurrentStateFromLocalStorage(name) {
    const all = lsList();
    return all[name]?.state || null;
  }
  function extractResultMetrics(stateObj) {
    // Heuristik: das Tool legt _last, _lastQh etc. in state ab (siehe app.js)
    const qhl = stateObj?._last?.qhl ?? null;
    const qh  = stateObj?._lastQh?.qh ?? null;
    const ebf = stateObj?.m1?.ebf ? parseFloat(stateObj.m1.ebf) : null;
    return { qhl, qh, ebf };
  }

  // ─── Toast (reused wenn vorhanden, sonst eigenes) ───
  function toast(msg) {
    // Es gibt ein toast() im Tool – wir nutzen es wenn global verfügbar
    if (typeof window.toast === 'function') return window.toast(msg);
    const t = document.createElement('div');
    t.className = 'toast tw-cloud-toast';
    t.textContent = msg;
    Object.assign(t.style, {
      position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
      padding: '10px 18px', borderRadius: '8px', background: '#1B2A4A', color: '#fff',
      fontSize: '13px', zIndex: '10000', opacity: '0', transition: 'opacity .2s',
      fontFamily: 'DM Sans, sans-serif',
    });
    document.body.appendChild(t);
    requestAnimationFrame(() => t.style.opacity = '1');
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2800);
  }

  // ─── API-Calls ───
  async function apiListProjects() {
    const r = await fetch(API_LIST, { credentials: 'same-origin' });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || 'Listen fehlgeschlagen');
    return d.projects || [];
  }
  async function apiGetProject(id) {
    const r = await fetch(`${API_LIST}?id=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || 'Laden fehlgeschlagen');
    return d.project;
  }
  async function apiSaveProject(payload) {
    const r = await fetch(API_LIST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || 'Speichern fehlgeschlagen');
    return d.id;
  }
  async function apiDeleteProject(id) {
    const r = await fetch(`${API_LIST}?id=${encodeURIComponent(id)}`, {
      method: 'DELETE', credentials: 'same-origin',
    });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || 'Löschen fehlgeschlagen');
  }
  async function apiLogout() {
    await fetch(API_AUTH, { method: 'DELETE', credentials: 'same-origin' });
  }

  // ─── Modal-UI ───
  function ensureModal() {
    let m = document.getElementById('cloud-modal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'cloud-modal';
    m.innerHTML = `
      <div class="cloud-modal-box" role="dialog" aria-modal="true">
        <div class="cloud-modal-head">
          <h3>☁ Cloud-Projekte (Sanity)</h3>
          <button class="cloud-modal-close" aria-label="Schliessen">×</button>
        </div>
        <div class="cloud-modal-body" id="cloud-modal-body">
          <div class="cloud-empty">Lade …</div>
        </div>
        <div class="cloud-modal-footer">
          <button id="cloud-modal-refresh">Aktualisieren</button>
          <button id="cloud-modal-close-btn">Schliessen</button>
        </div>
      </div>
    `;
    document.body.appendChild(m);
    m.addEventListener('click', (e) => { if (e.target === m) hideModal(); });
    m.querySelector('.cloud-modal-close').addEventListener('click', hideModal);
    m.querySelector('#cloud-modal-close-btn').addEventListener('click', hideModal);
    m.querySelector('#cloud-modal-refresh').addEventListener('click', renderProjectList);
    return m;
  }
  function showModal() { ensureModal().classList.add('visible'); renderProjectList(); }
  function hideModal() { ensureModal().classList.remove('visible'); }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return ''; }
  }

  async function renderProjectList() {
    const body = $('#cloud-modal-body');
    body.innerHTML = '<div class="cloud-empty">Lade …</div>';
    try {
      const projects = await apiListProjects();
      if (!projects.length) {
        body.innerHTML = '<div class="cloud-empty">Noch keine Cloud-Projekte gespeichert.<br><small>Erst lokal speichern, dann „☁ In Cloud speichern" klicken.</small></div>';
        return;
      }
      body.innerHTML = '';
      projects.forEach(p => {
        const item = document.createElement('div');
        item.className = 'cloud-project-item';
        const qhlStr = p.qhl != null ? `${p.qhl.toFixed(2)} kW` : '—';
        const statusLabels = { arbeit: '🔧 In Arbeit', offeriert: '📋 Offeriert', bestellt: '✅ Bestellt', abgeschlossen: '🏁 Abgeschlossen', archiv: '📦 Archiv' };
        const statusStr = statusLabels[p.status] || '';
        item.innerHTML = `
          <div class="cloud-project-info">
            <div class="cloud-project-name">${escapeHtml(p.projectName || 'Unbenannt')}</div>
            <div class="cloud-project-meta">
              ${escapeHtml(p.customerName || '')}${p.customerName ? ' · ' : ''}${escapeHtml(p.address || '')}
              ${(p.customerName || p.address) ? '<br>' : ''}
              Qhl: <strong>${qhlStr}</strong> · EBF: ${p.ebf ? Math.round(p.ebf) + ' m²' : '—'} · ${formatDate(p.updatedAt)} · ${statusStr}
            </div>
          </div>
          <div class="cloud-project-actions">
            <button class="btn-load" data-id="${p._id}">Laden</button>
            <button class="btn-del" data-id="${p._id}" data-name="${escapeHtml(p.projectName || '')}">×</button>
          </div>
        `;
        item.querySelector('.btn-load').addEventListener('click', (e) => {
          e.stopPropagation();
          loadFromCloud(p._id, p.projectName);
        });
        item.querySelector('.btn-del').addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm(`Cloud-Projekt "${p.projectName || 'Unbenannt'}" wirklich löschen?`)) return;
          try {
            await apiDeleteProject(p._id);
            toast('Cloud-Projekt gelöscht');
            renderProjectList();
          } catch (err) { toast('Fehler: ' + err.message); }
        });
        // Klick auf ganze Karte = laden
        item.addEventListener('click', () => loadFromCloud(p._id, p.projectName));
        body.appendChild(item);
      });
    } catch (err) {
      body.innerHTML = `<div class="cloud-empty" style="color:#D93025">Fehler beim Laden:<br>${escapeHtml(err.message)}</div>`;
    }
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ─── Cloud-Load: in localStorage schreiben, dann Tool's Load-Mechanismus triggern ───
  async function loadFromCloud(id, displayName) {
    try {
      const proj = await apiGetProject(id);
      if (!proj || !proj.stateJson) { toast('Projekt leer'); return; }
      let stateObj;
      try { stateObj = JSON.parse(proj.stateJson); } catch { toast('Projekt-JSON defekt'); return; }

      const projectName = proj.projectName || displayName || 'Cloud-Projekt';
      // In localStorage schreiben
      lsSave(projectName, stateObj);

      // Dropdown des Tools aktualisieren (es liest aus localStorage) und Projekt auswählen
      const sel = $('#project-select');
      if (sel) {
        let opt = Array.from(sel.options).find(o => o.value === projectName);
        if (!opt) {
          opt = document.createElement('option');
          opt.value = projectName;
          opt.textContent = projectName;
          sel.appendChild(opt);
        }
        sel.value = projectName;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }

      hideModal();
      toast(`"${projectName}" aus Cloud geladen`);
    } catch (err) {
      toast('Fehler: ' + err.message);
    }
  }

  // ─── Cloud-Save: aktuelles lokales Projekt in Sanity spiegeln ───
  async function saveToCloud() {
    const sel = $('#project-select');
    let projectName = sel?.value || '';
    if (!projectName) {
      // Kein lokales Projekt ausgewählt – Nutzer nach Name fragen und zuerst lokal speichern
      projectName = prompt('Projektname für die Cloud-Speicherung:');
      if (!projectName) return;
      // Lokales Speichern triggern: wir simulieren einen Klick auf „Speichern"
      // – dafür brauchen wir aber den aktuellen state, den wir nicht sehen.
      // Einfacher Weg: den Nutzer erst lokal speichern lassen.
      alert(`Bitte zuerst lokal speichern:\n\n1. Klick auf "Speichern"\n2. Namen "${projectName}" eingeben\n3. Dann erneut "☁ In Cloud speichern" klicken.`);
      return;
    }
    const stateObj = getCurrentStateFromLocalStorage(projectName);
    if (!stateObj) {
      toast('Projekt lokal nicht gefunden – erst "Speichern" klicken');
      return;
    }
    const metrics = extractResultMetrics(stateObj);
    // Optionale Metadaten abfragen
    const existingCloudId = sessionStorage.getItem(`cloud-id-${projectName}`) || null;
    try {
      const customerName = stateObj.m1?.customerName || '';
      const address      = stateObj.m1?.address || '';
      const id = await apiSaveProject({
        id: existingCloudId,
        projectName,
        customerName,
        address,
        qhl: metrics.qhl,
        qh:  metrics.qh,
        ebf: metrics.ebf,
        stateJson: JSON.stringify(stateObj),
        status: stateObj._status || 'arbeit',
        notes:  stateObj._notes || '',
      });
      sessionStorage.setItem(`cloud-id-${projectName}`, id);
      toast(`"${projectName}" in Cloud gespeichert`);
    } catch (err) {
      toast('Cloud-Speichern fehlgeschlagen: ' + err.message);
    }
  }

  // ─── Logout ───
  async function doLogout() {
    if (!confirm('Abmelden? Beim nächsten Zugriff wird erneut das Passwort verlangt.')) return;
    try { await apiLogout(); } catch {}
    location.reload();
  }

  // ─── UI: Cloud-Buttons in Header einhängen (nur einmal, als auth-only) ───
  let uiInstalled = false;
  function installUI() {
    if (uiInstalled) return;
    const actions = $('.header-actions');
    if (!actions) return;

    const btnCloudList = document.createElement('button');
    btnCloudList.id = 'btn-cloud-list';
    btnCloudList.className = 'auth-only';
    btnCloudList.title = 'Cloud-Projekte anzeigen';
    btnCloudList.innerHTML = '☁ Cloud-Projekte';
    btnCloudList.addEventListener('click', showModal);

    const btnCloudSave = document.createElement('button');
    btnCloudSave.id = 'btn-cloud-save';
    btnCloudSave.className = 'auth-only dark';
    btnCloudSave.title = 'Aktuelles (lokales) Projekt in Sanity-Cloud speichern';
    btnCloudSave.innerHTML = '☁ Cloud speichern';
    btnCloudSave.addEventListener('click', saveToCloud);

    // Vor dem Login/Logout-Block einfügen (also vor #btn-login)
    const loginBtn = document.getElementById('btn-login');
    if (loginBtn) {
      actions.insertBefore(btnCloudList, loginBtn);
      actions.insertBefore(btnCloudSave, loginBtn);
    } else {
      actions.appendChild(btnCloudList);
      actions.appendChild(btnCloudSave);
    }
    uiInstalled = true;
  }

  // Cloud-UI immer im DOM, aber sichtbar nur via .auth-only + body.is-auth
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => setTimeout(installUI, 60));
  } else {
    setTimeout(installUI, 60);
  }
})();
