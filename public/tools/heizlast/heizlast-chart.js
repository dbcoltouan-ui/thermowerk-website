/* ============================================================
   Thermowerk Heizlast – Modul M10: Leistungsdiagramm
   Chart.js-basiertes, kundentaugliches Bivalenz-Diagramm.
   ============================================================ */
(function () {
  const $ = (s, p = document) => p.querySelector(s);

  function el(tag, attrs = {}, ...children) {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') n.className = v;
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'html') n.innerHTML = v;
      else n.setAttribute(k, v);
    });
    children.flat().forEach(c => {
      if (c == null) return;
      n.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    });
    return n;
  }

  let chart = null;

  // ─── Heizlast-Gerade ab Qh (bei Normaussentemperatur) bis Heizgrenze (15 °C = 0 kW) ───
  function heizlastPunkte(qh, tNorm, tHeizgrenze = 15) {
    const pts = [];
    for (let t = tHeizgrenze; t >= tNorm; t -= 1) {
      const frac = (tHeizgrenze - t) / (tHeizgrenze - tNorm);
      pts.push({ x: t, y: +(qh * frac).toFixed(3) });
    }
    return pts;
  }

  // ─── WP-Kennlinie: stück-weise linear zwischen drei Punkten (A-7, A2, A7) ───
  function wpKennlinie(p_A7, p_A2, p_An7, tMin) {
    // 3 Punkte: (-7, p_An7), (2, p_A2), (7, p_A7)
    // Wir extrapolieren nach unten bis tMin mit derselben Steigung wie -7→2
    const pts = [];
    for (let t = 15; t >= tMin; t -= 0.5) {
      let y;
      if (t >= 2)      y = p_A2 + ((p_A7  - p_A2) / (7  -  2)) * (t -  2);
      else if (t >= -7) y = p_An7 + ((p_A2 - p_An7) / (2 - (-7))) * (t - (-7));
      else              y = p_An7 + ((p_A2 - p_An7) / (2 - (-7))) * (t - (-7));
      pts.push({ x: t, y: +y.toFixed(3) });
    }
    return pts;
  }

  // ─── Bivalenzpunkt: Schnittpunkt Heizlast-Gerade & WP-Kennlinie ───
  function computeBivalenz(heizlast, wpLine) {
    // lineare Interpolation: in kleinen Schritten nach Vorzeichenwechsel suchen
    let bivalenz = null;
    const step = 0.25;
    const tMax = 15, tMin = Math.min(...wpLine.map(p => p.x));
    for (let t = tMax; t >= tMin; t -= step) {
      const hl = interp(heizlast, t);
      const wp = interp(wpLine, t);
      if (hl == null || wp == null) continue;
      if (wp < hl) {
        // bei diesem t wird die WP-Leistung von Heizlast überholt → Bivalenzpunkt
        bivalenz = { t: +t.toFixed(2), p: +hl.toFixed(2) };
        break;
      }
    }
    return bivalenz;
  }
  function interp(pts, t) {
    if (!pts.length) return null;
    const sorted = [...pts].sort((a, b) => a.x - b.x);
    if (t < sorted[0].x || t > sorted[sorted.length - 1].x) return null;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (t >= sorted[i].x && t <= sorted[i + 1].x) {
        const a = sorted[i], b = sorted[i + 1];
        const f = (t - a.x) / (b.x - a.x);
        return a.y + f * (b.y - a.y);
      }
    }
    return null;
  }

  // ─── Werte aus DOM holen (Qh aus M7 wenn sichtbar) ───
  function tryReadQhFromDOM() {
    // M7 zeigt den Ergebniswert – wir suchen nach einem Element mit Qh
    const nodes = document.querySelectorAll('#m7 .module-body *');
    for (const n of nodes) {
      const t = n.textContent || '';
      const m = t.match(/(\d+[\.,]?\d*)\s*kW/);
      if (m && /Qh|Auslegung|WP/i.test(t)) {
        const v = parseFloat(m[1].replace(',', '.'));
        if (v > 0 && v < 100) return v;
      }
    }
    return null;
  }
  function tryReadEBF() {
    // M1 hat ein EBF-Input
    const ebfInput = document.querySelector('#m1 input[name="ebf"], #m1 input[data-field="ebf"]');
    if (ebfInput && ebfInput.value) return parseFloat(ebfInput.value);
    return null;
  }

  function buildModule() {
    // Warten bis das Tool die Module gerendert hat
    const app = $('#app');
    if (!app || !$('#m9')) { setTimeout(buildModule, 250); return; }
    if ($('#m10')) return; // schon da

    const section = el('section', { class: 'module', id: 'm10' },
      el('div', { class: 'module-head', onclick: () => section.classList.toggle('collapsed') },
        el('h2', {}, 'M10 · Leistungsdiagramm & Bivalenzpunkt ',
          el('span', { class: 'badge' }, 'Kunden-Visualisierung')),
        el('span', { class: 'chev' }, '▾')),
      el('div', { class: 'module-body' })
    );
    app.appendChild(section);

    renderBody(section.querySelector('.module-body'));
  }

  function renderBody(body) {
    body.innerHTML = '';

    // Kundentauglicher Erklärtext
    body.appendChild(el('div', { class: 'm10-intro' },
      el('div', { html: '<strong>Was zeigt diese Grafik?</strong> Sie vergleicht die benötigte Heizleistung Ihres Hauses mit der Leistung, die die Wärmepumpe je nach Aussentemperatur liefern kann. Dort wo sich die beiden Linien kreuzen (<em>Bivalenzpunkt</em>), reicht die Wärmepumpe gerade noch aus. Darunter kann — je nach Auslegung — ein Elektro-Heizstab kurzzeitig unterstützen.' })));

    // Eingabe-Formular
    const form = el('div', { class: 'row row-3' });
    const qhDefault = tryReadQhFromDOM();

    const inQh = mkInput('Erforderliche Heizleistung Qh', qhDefault ?? 9, 'kW', 0.1);
    const inTnorm = mkInput('Normaussentemperatur', -8, '°C', 0.5);
    const inTmin = mkInput('Tiefste angenommene Aussentemp.', -15, '°C', 0.5);
    form.appendChild(wrap(inQh.wrapper, 'Aus M7 übernommen (bearbeitbar)'));
    form.appendChild(wrap(inTnorm.wrapper, 'SIA 384/2 je nach Standort'));
    form.appendChild(wrap(inTmin.wrapper, 'Sicherheits-Auslegung bis hier'));
    body.appendChild(form);

    body.appendChild(el('h4', { style: 'margin:14px 0 8px; font-family:Outfit; font-size:14px; font-weight:600; color:#1B2A4A' }, 'Wärmepumpen-Leistung (Datenblatt-Werte)'));
    const form2 = el('div', { class: 'row row-3' });
    const inA7   = mkInput('Leistung bei A7/W35',   9.0, 'kW', 0.1);
    const inA2   = mkInput('Leistung bei A2/W35',   7.5, 'kW', 0.1);
    const inAn7  = mkInput('Leistung bei A-7/W35',  5.8, 'kW', 0.1);
    form2.appendChild(wrap(inA7.wrapper,  'aus Datenblatt, W35 = Heizwasservorlauf 35 °C'));
    form2.appendChild(wrap(inA2.wrapper,  'aus Datenblatt'));
    form2.appendChild(wrap(inAn7.wrapper, 'aus Datenblatt, bei -7 °C Aussenluft'));
    body.appendChild(form2);

    // Chart-Container
    const chartWrap = el('div', { class: 'm10-chart-wrap' },
      el('canvas', { id: 'm10-canvas', height: '340' }));
    body.appendChild(chartWrap);

    // Ergebnis-KPIs
    const resBox = el('div', { class: 'm10-result', id: 'm10-result' });
    body.appendChild(resBox);

    body.appendChild(el('div', { class: 'm10-legend-note' },
      'Das Diagramm ist eine vereinfachte technische Darstellung. Die reale COP-Abhängigkeit, ' +
      'Abtauverluste und Witterungseffekte sind nicht berücksichtigt.'));

    // Re-Render bei Eingabe
    const inputs = [inQh, inTnorm, inTmin, inA7, inA2, inAn7];
    inputs.forEach(i => i.input.addEventListener('input', () => draw()));

    // Initial zeichnen (Chart.js muss geladen sein)
    waitForChart().then(draw);

    function draw() {
      const qh    = parseFloat(inQh.input.value)    || 0;
      const tNorm = parseFloat(inTnorm.input.value) || -8;
      const tMin  = parseFloat(inTmin.input.value)  || -15;
      const p7    = parseFloat(inA7.input.value)    || 0;
      const p2    = parseFloat(inA2.input.value)    || 0;
      const pm7   = parseFloat(inAn7.input.value)   || 0;

      const heizlast = heizlastPunkte(qh, Math.min(tNorm, tMin));
      const wp       = wpKennlinie(p7, p2, pm7, tMin);
      const biv      = computeBivalenz(heizlast, wp);

      drawChart(heizlast, wp, biv, tNorm, tMin, qh);
      drawKPIs(biv, qh, tNorm, tMin, wp);
    }
  }

  function drawChart(heizlast, wp, biv, tNorm, tMin, qh) {
    const canvas = $('#m10-canvas');
    if (!canvas || !window.Chart) return;
    const ctx = canvas.getContext('2d');

    // Farbige Flächen: unter dem Bivalenzpunkt (kälter) = Heizstab-Bereich
    const hlFill = heizlast.map(p => ({ x: p.x, y: p.y }));

    if (chart) { chart.destroy(); chart = null; }

    const bivX = biv?.t ?? tNorm;
    const annotationLines = [];

    chart = new window.Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Heizbedarf des Hauses',
            data: heizlast,
            borderColor: '#D93025',
            backgroundColor: 'rgba(217,48,37,0.08)',
            borderWidth: 2.5,
            tension: 0,
            pointRadius: 0,
            fill: false,
          },
          {
            label: 'Leistung Wärmepumpe',
            data: wp,
            borderColor: '#1B2A4A',
            backgroundColor: 'rgba(27,42,74,0.10)',
            borderWidth: 2.5,
            tension: 0.15,
            pointRadius: 0,
            fill: 'origin',
          },
          // Bivalenzpunkt-Marker
          ...(biv ? [{
            label: 'Bivalenzpunkt',
            data: [{ x: biv.t, y: biv.p }],
            borderColor: '#F59E0B',
            backgroundColor: '#F59E0B',
            borderWidth: 0,
            pointRadius: 7,
            pointHoverRadius: 9,
            showLine: false,
          }] : []),
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: { family: 'DM Sans', size: 13 },
              color: '#1A1A1A',
              boxWidth: 14,
              padding: 14,
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.parsed.y;
                const t = ctx.parsed.x;
                return `${ctx.dataset.label}: ${v.toFixed(2)} kW bei ${t.toFixed(1)} °C`;
              },
            },
            titleFont: { family: 'DM Sans', size: 12 },
            bodyFont: { family: 'DM Sans', size: 12 },
          },
          title: {
            display: true,
            text: biv
              ? `Bivalenzpunkt bei ${biv.t.toFixed(1)} °C · Leistung: ${biv.p.toFixed(2)} kW`
              : 'Wärmepumpe deckt den gesamten Bereich ab',
            font: { family: 'Outfit', size: 15, weight: '600' },
            color: '#1B2A4A',
            padding: { bottom: 14 },
          },
        },
        scales: {
          x: {
            type: 'linear',
            min: tMin,
            max: 16,
            reverse: true,
            title: { display: true, text: 'Aussentemperatur °C', font: { family: 'DM Sans', size: 12 }, color: '#6B7280' },
            grid: { color: 'rgba(0,0,0,0.06)' },
            ticks: { font: { family: 'DM Sans' }, color: '#6B7280' },
          },
          y: {
            min: 0,
            title: { display: true, text: 'Leistung kW', font: { family: 'DM Sans', size: 12 }, color: '#6B7280' },
            grid: { color: 'rgba(0,0,0,0.06)' },
            ticks: { font: { family: 'DM Sans' }, color: '#6B7280' },
          },
        },
      },
    });
  }

  function drawKPIs(biv, qh, tNorm, tMin, wp) {
    const box = $('#m10-result');
    if (!box) return;
    box.innerHTML = '';

    // Abdeckungsgrad
    let coverClass = 'good';
    let coverText = 'WP deckt alles';
    let coverValue = '100 %';
    if (biv && biv.t > tMin) {
      // Unterhalb Bivalenzpunkt braucht's Heizstab
      coverClass = biv.t > tNorm ? 'warn' : 'good';
      coverText  = biv.t > tNorm ? 'Heizstab bei Kälte nötig' : 'WP reicht bis Auslegung';
      coverValue = `bis ${biv.t.toFixed(1)} °C`;
    }

    box.appendChild(mkKPI(coverValue, coverText, coverClass));

    // Bivalenzpunkt-Leistung
    if (biv) {
      box.appendChild(mkKPI(`${biv.p.toFixed(2)} kW`, 'Leistung am Bivalenzpunkt', ''));
    }

    // Erforderlich bei Normaussentemp
    box.appendChild(mkKPI(`${qh.toFixed(2)} kW`, `Bedarf bei ${tNorm} °C`, ''));

    // WP-Leistung bei Normaussentemp (interpoliert)
    const pAtNorm = interp(wp, tNorm);
    if (pAtNorm != null) {
      const reserve = pAtNorm - qh;
      const cls = reserve >= 0 ? 'good' : 'warn';
      box.appendChild(mkKPI(
        `${pAtNorm.toFixed(2)} kW`,
        reserve >= 0 ? `Reserve: +${reserve.toFixed(2)} kW` : `Fehlt: ${Math.abs(reserve).toFixed(2)} kW`,
        cls,
      ));
    }
  }

  function mkKPI(value, label, cls = '') {
    const div = el('div', { class: 'm10-kpi ' + cls },
      el('div', { class: 'kpi-v' }, value),
      el('div', { class: 'kpi-l' }, label));
    return div;
  }

  function mkInput(label, defaultVal, unit, step) {
    const input = el('input', { type: 'number', value: String(defaultVal), step: String(step) });
    const grp = el('div', { class: 'input-group', style: 'display:flex;border:1px solid #E2E5EB;border-radius:7px;overflow:hidden;background:#fff' });
    input.style.cssText = 'border:none;flex:1;padding:10px 12px;font-size:14px;font-family:DM Sans;width:100%';
    const u = el('span', { style: 'padding:0 12px;display:flex;align-items:center;background:#F7F8FA;color:#6B7280;font-size:12.5px;font-weight:500' }, unit);
    grp.appendChild(input); grp.appendChild(u);
    const wrapper = el('label', { class: 'field', style: 'display:flex;flex-direction:column;gap:5px' },
      el('span', {}, label));
    wrapper.appendChild(grp);
    return { wrapper, input };
  }

  function wrap(wrapper, hint) {
    if (hint) wrapper.appendChild(el('small', { style: 'color:#6B7280;font-size:11px;margin-top:2px' }, hint));
    return wrapper;
  }

  function waitForChart() {
    return new Promise((res) => {
      const check = () => {
        if (window.Chart) res();
        else setTimeout(check, 80);
      };
      check();
    });
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => setTimeout(buildModule, 200));
  } else {
    setTimeout(buildModule, 200);
  }
})();
