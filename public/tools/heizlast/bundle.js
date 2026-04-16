(() => {
  // js/ui.js
  var $ = (sel, ctx = document) => ctx.querySelector(sel);
  var $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  function el(tag, attrs = {}, ...children) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") e.className = v;
      else if (k === "style") Object.assign(e.style, v);
      else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
      else if (k === "html") e.innerHTML = v;
      else if (v !== null && v !== void 0 && v !== false) e.setAttribute(k, v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      e.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return e;
  }
  function toast(msg, ms = 2200) {
    let t = $("#toast");
    if (!t) {
      t = el("div", { id: "toast" });
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), ms);
  }
  function bindInputs(container, state2, callback) {
    $$("input[data-key], select[data-key]", container).forEach((inp) => {
      const key = inp.dataset.key;
      const type = inp.type;
      if (state2[key] != null) inp.value = state2[key];
      inp.addEventListener("input", () => {
        let v = inp.value;
        if (type === "number") v = v === "" ? "" : parseFloat(v);
        state2[key] = v;
        callback?.(key, v);
      });
    });
  }

  // js/storage.js
  var KEY = "thermowerk_heizlast_projekte";
  function listProjects() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch {
      return {};
    }
  }
  function saveProject(name, data) {
    const all = listProjects();
    all[name] = {
      ...data,
      savedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    localStorage.setItem(KEY, JSON.stringify(all));
    return all[name];
  }
  function loadProject(name) {
    return listProjects()[name] || null;
  }
  function deleteProject(name) {
    const all = listProjects();
    delete all[name];
    localStorage.setItem(KEY, JSON.stringify(all));
  }
  function exportJSON(data, filename = "heizlast-projekt.json") {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
  function importJSON(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => {
        try {
          res(JSON.parse(r.result));
        } catch (e) {
          rej(e);
        }
      };
      r.onerror = () => rej(r.error);
      r.readAsText(file);
    });
  }

  // js/constants.js
  var BRENNWERTE = {
    oel: { label: "Heiz\xF6l EL", ho: 10.5, einheit: "kWh/l", verbrauchEinheit: "l/a" },
    gas: { label: "Erdgas", ho: 10.4, einheit: "kWh/m\xB3", verbrauchEinheit: "m\xB3/a" },
    hartholz: { label: "Hartholz (500\u2013530 kg/Ster)", ho: 2500, einheit: "kWh/rm", verbrauchEinheit: "rm/a" },
    nadelholz: { label: "Nadelholz (340\u2013380 kg/Ster)", ho: 1800, einheit: "kWh/rm", verbrauchEinheit: "rm/a" },
    pellets: { label: "Pellets", ho: 5.3, einheit: "kWh/kg", verbrauchEinheit: "kg/a" },
    elektro: { label: "Elektrospeicher", ho: 1, einheit: "kWh/kWh", verbrauchEinheit: "kWh/a" }
  };
  var WIRKUNGSGRADE = [
    { id: "oel_gas_alt_mWW", label: "\xD6l/Gas \xE4lter, MIT WW-Bereitung", min: 0.7, max: 0.75, default: 0.73 },
    { id: "oel_gas_alt_oWW", label: "\xD6l/Gas \xE4lter, OHNE WW-Bereitung", min: 0.8, max: 0.85, default: 0.82 },
    { id: "oel_gas_kond", label: "\xD6l/Gas kondensierend (neu)", min: 0.85, max: 0.95, default: 0.9 },
    { id: "holz_stueck_neu", label: "St\xFCckholz (neu)", min: 0.65, max: 0.75, default: 0.7 },
    { id: "holz_stueck_alt", label: "St\xFCckholz (alt)", min: 0.45, max: 0.65, default: 0.55 },
    { id: "holz_pellets", label: "Pellets", min: 0.65, max: 0.75, default: 0.7 },
    { id: "elektrospeicher", label: "Elektrospeicher", min: 0.95, max: 0.95, default: 0.95 }
  ];
  var VOLLASTSTUNDEN = [
    { gebaeudetyp: "wohnen_ohneWW", lage: "mittelland", tvoll: 2e3, label: "Wohngeb\xE4ude, ohne WW, Mittelland" },
    { gebaeudetyp: "wohnen_ohneWW", lage: "hoehe", tvoll: 2300, label: "Wohngeb\xE4ude, ohne WW, ab 800 m \xFC. M." },
    { gebaeudetyp: "wohnen_mitWW", lage: "mittelland", tvoll: 2300, label: "Wohngeb\xE4ude, mit WW, Mittelland" },
    { gebaeudetyp: "wohnen_mitWW", lage: "hoehe", tvoll: 2500, label: "Wohngeb\xE4ude, mit WW, ab 800 m \xFC. M." },
    { gebaeudetyp: "gewerbe_absenkung", lage: "mittelland", tvoll: 1900, label: "Schulhaus/Industrie/B\xFCro, Wochenendabsenkung, Mittelland" },
    { gebaeudetyp: "gewerbe_absenkung", lage: "hoehe", tvoll: 2100, label: "Schulhaus/Industrie/B\xFCro, Wochenendabsenkung, ab 800 m \xFC. M." }
  ];
  var BAUPERIODEN = [
    { id: "vor1919", label: "vor 1919", efh: [55, 125], mfh: [65, 115] },
    { id: "1919_45", label: "1919\u20131945", efh: [80, 135], mfh: [80, 120] },
    { id: "1946_60", label: "1946\u20131960", efh: [80, 140], mfh: [70, 115] },
    { id: "1961_70", label: "1961\u20131970", efh: [80, 145], mfh: [75, 120] },
    { id: "1971_80", label: "1971\u20131980", efh: [70, 125], mfh: [75, 115] },
    { id: "1981_85", label: "1981\u20131985", efh: [55, 105], mfh: [70, 105] },
    { id: "1986_90", label: "1986\u20131990", efh: [60, 95], mfh: [65, 95] },
    { id: "1991_95", label: "1991\u20131995", efh: [50, 90], mfh: [60, 85] },
    { id: "1996_00", label: "1996\u20132000", efh: [45, 85], mfh: [55, 75] },
    { id: "2001_05", label: "2001\u20132005", efh: [35, 80], mfh: [55, 75] },
    { id: "2006_10", label: "2006\u20132010", efh: [35, 75], mfh: [45, 65] },
    { id: "2011_heute", label: "2011\u2013heute", efh: [30, 45], mfh: [30, 40] }
  ];
  var SPEZ_HEIZLEISTUNG = [
    { id: "vor1919", efh: [28, 63], mfh: [33, 58] },
    { id: "1919_45", efh: [40, 68], mfh: [40, 60] },
    { id: "1946_60", efh: [40, 70], mfh: [35, 58] },
    { id: "1961_70", efh: [40, 73], mfh: [38, 60] },
    { id: "1971_80", efh: [35, 63], mfh: [38, 58] },
    { id: "1981_85", efh: [28, 53], mfh: [35, 53] },
    { id: "1986_90", efh: [30, 48], mfh: [33, 48] },
    { id: "1991_95", efh: [25, 45], mfh: [30, 43] },
    { id: "1996_00", efh: [23, 43], mfh: [28, 38] },
    { id: "2001_05", efh: [18, 40], mfh: [28, 38] },
    { id: "2006_10", efh: [18, 38], mfh: [23, 33] },
    { id: "2011_heute", efh: [15, 23], mfh: [15, 20] }
  ];
  var SANIERUNGS_MASSNAHMEN = [
    { id: "fenster", label: "Fenstersanierung", einsparung: [10, 20], default: 15 },
    { id: "fassade", label: "Fassadend\xE4mmung", einsparung: [25, 40], default: 32 },
    { id: "estrich", label: "Estrichboden-/decke D\xE4mmung", einsparung: [10, 15], default: 12 },
    { id: "kellerdecke", label: "Kellerdecke D\xE4mmung", einsparung: [8, 12], default: 10 },
    { id: "kwl", label: "KWL (Komfortl\xFCftung)", einsparung: [5, 10], default: 7 }
  ];
  var WW_STANDARDS = [
    { gebaeudetyp: "efh", label: "EFH / Eigentumswohnung, einfach", vwu: 40 },
    { gebaeudetyp: "efh", label: "EFH / Eigentumswohnung, mittel", vwu: 45 },
    { gebaeudetyp: "efh", label: "EFH / Eigentumswohnung, gehoben", vwu: 55 },
    { gebaeudetyp: "mfh", label: "MFH allgemeiner Wohnungsbau", vwu: 35 },
    { gebaeudetyp: "mfh", label: "MFH gehobener Wohnungsbau", vwu: 45 },
    { gebaeudetyp: "buero", label: "B\xFCrogeb\xE4ude ohne Personalrestaurant", vwu: 3 }
  ];
  var SPERRZEIT_FAKTOREN = {
    0: 1,
    1: 1.04,
    2: 1.09,
    3: 1.14,
    4: 1.2,
    5: 1.26,
    6: 1.33,
    7: 1.41,
    8: 1.5
  };
  var SPEICHER_VERLUSTE = [
    { volumen: 200, verlust: 1.5 },
    { volumen: 500, verlust: 2.8 },
    { volumen: 800, verlust: 3.3 },
    { volumen: 1e3, verlust: 3.8 },
    { volumen: 1500, verlust: 4.3 },
    { volumen: 2e3, verlust: 4.8 }
  ];
  var FSTO = [
    { id: "misch_kalt", label: "Mischzone + Kaltzone (innenlieg. WT)", faktor: 1.25 },
    { id: "nur_misch", label: "Nur Mischzone (aussenliegender WT)", faktor: 1.1 },
    { id: "keine_zonen", label: "Weder Misch- noch Kaltzone", faktor: 1 }
  ];
  var WT_FAUSTFORMEL = [
    { id: "innen_mitWH", label: "Innen, mit Warmhaltung (65\xB0C / 60\xB0C)", mPerKw: 0.65 },
    { id: "innen_ohneWH_65", label: "Innen, ohne Warmhaltung (65\xB0C / 55\xB0C)", mPerKw: 0.4 },
    { id: "innen_ohneWH_60", label: "Innen, ohne Warmhaltung (60\xB0C / 55\xB0C)", mPerKw: 0.65 },
    { id: "aussen", label: "Aussen (FRIWA/Magroladung)", mPerKw: 0.05 }
  ];
  var HEIZPUFFER = {
    // Physik
    cp: 4.2,
    // kJ/(kg·K)
    // (1) Abtauung L/W-WP: t_Abtau · ΔT_zul
    abtauZeitMin: 5,
    // min typische Dauer Prozessumkehr
    abtauDeltaT: 5,
    // K zulässige Systemtemperatur-Absenkung
    // (2) Mindestlaufzeit Kompressor
    taktZeitMin: 6,
    // min typische Mindestlaufzeit Scrollverdichter
    taktDeltaT: 5,
    // K Temperaturhub Puffer
    // (3) ERR-Entkopplung (Herstellerband)
    errBand: [15, 25],
    // l/kW
    // Typ-spezifische Sockel-Empfehlungen aus Herstellerhandbüchern (Maximalwerte)
    typen: {
      "lw_abtau": { label: "L/W-WP mit Abtauung (Prozessumkehr)", braucht: ["abtau"], empfehlung: [20, 25] },
      "lw_ohne": { label: "L/W-WP ohne Abtauung", braucht: ["takt", "err"], empfehlung: [15, 20] },
      "sw": { label: "S/W-WP (Sole)", braucht: ["takt", "err"], empfehlung: [10, 15] },
      "ww": { label: "W/W-WP (Grundwasser)", braucht: ["takt", "err"], empfehlung: [10, 15] }
    }
  };
  var PHYSIK = {
    cp_wasser: 4.2,
    // kJ/(kg·K)
    rho_wasser: 1,
    // kg/l
    kJzukWh: 1 / 3600,
    t_kaltwasser: 10,
    // °C (SIA 385/2)
    deltaT_ww: 50
    // K (10 → 60 °C)
  };

  // js/modules/m1-stammdaten.js
  function renderM1(state2, onChange) {
    const s = state2.m1 ||= {
      gebaeudetyp: "efh",
      // 'efh' | 'mfh' | 'buero'
      lage: "mittelland",
      // 'mittelland' | 'hoehe'
      wpMachtWW: false,
      // WP erzeugt auch Warmwasser (steuert M5)
      ebf: "",
      bauperiode: "1971_80",
      wohneinheiten: 1,
      tvollModus: "auto",
      // 'auto' | 'manuell'
      tvollManuell: ""
      // Override, sonst leer
    };
    if (s.inklWW !== void 0 && s.wpMachtWW === void 0) s.wpMachtWW = !!s.inklWW;
    const body = el(
      "div",
      {},
      el(
        "div",
        { class: "row row-3" },
        el(
          "label",
          { class: "field" },
          el("span", {}, "Geb\xE4udetyp"),
          el(
            "select",
            { "data-key": "gebaeudetyp" },
            el("option", { value: "efh" }, "EFH / Eigentumswohnung"),
            el("option", { value: "mfh" }, "MFH"),
            el("option", { value: "buero" }, "B\xFCro / Gewerbe")
          )
        ),
        el(
          "label",
          { class: "field" },
          el("span", {}, "Lage"),
          el(
            "select",
            { "data-key": "lage" },
            el("option", { value: "mittelland" }, "Mittelland"),
            el("option", { value: "hoehe" }, "ab 800 m \xFC. M.")
          )
        ),
        el(
          "label",
          { class: "field" },
          el("span", {}, "WP macht Warmwasser?"),
          el(
            "select",
            { "data-key": "wpMachtWW" },
            el("option", { value: "false" }, "nein \u2013 separat (Boiler/WP-Boiler)"),
            el("option", { value: "true" }, "ja \u2013 WP \xFCbernimmt auch WW")
          )
        )
      ),
      el(
        "div",
        { class: "row" },
        el(
          "label",
          { class: "field" },
          el("span", {}, "Bauperiode"),
          el(
            "select",
            { "data-key": "bauperiode" },
            ...BAUPERIODEN.map((b) => el("option", { value: b.id }, b.label))
          )
        ),
        el(
          "label",
          { class: "field" },
          el(
            "span",
            {},
            "Energiebezugsfl\xE4che EBF",
            el("small", {}, " \u2013 optional, f\xFCr Plausibilit\xE4tskontrolle")
          ),
          el(
            "div",
            { class: "input-group" },
            el("input", { type: "number", "data-key": "ebf", step: "1", min: "0", placeholder: "z. B. 270" }),
            el("span", { class: "unit" }, "m\xB2")
          )
        )
      ),
      el(
        "div",
        { class: "row row-3" },
        el(
          "label",
          { class: "field" },
          el("span", {}, "Anzahl Wohneinheiten"),
          el("input", { type: "number", "data-key": "wohneinheiten", step: "1", min: "1" })
        ),
        el(
          "label",
          { class: "field" },
          el("span", {}, "Vollbetriebsstunden tvoll"),
          el(
            "select",
            { "data-key": "tvollModus" },
            el("option", { value: "auto" }, "automatisch (FWS \xA73)"),
            el("option", { value: "manuell" }, "manuell \xFCberschreiben")
          )
        ),
        el(
          "label",
          { class: "field" },
          el("span", {}, "tvoll-Wert"),
          el(
            "div",
            { class: "input-group" },
            el("input", { id: "m1-tvoll-out", "data-key": "tvollManuell", type: "number", step: "10", min: "500", placeholder: "2000" }),
            el("span", { class: "unit" }, "h/a")
          )
        )
      ),
      el("div", { id: "m1-tvoll-hinweis", class: "hinweis", style: { marginTop: "8px" } })
    );
    setTimeout(() => {
      Object.entries(s).forEach(([k, v]) => {
        const inp = body.querySelector(`[data-key="${k}"]`);
        if (inp) inp.value = typeof v === "boolean" ? String(v) : v;
      });
      updateTvoll();
    }, 0);
    function autoTvoll() {
      const typ = s.gebaeudetyp === "buero" ? "gewerbe_absenkung" : "wohnen_ohneWW";
      const row = VOLLASTSTUNDEN.find((r) => r.gebaeudetyp === typ && r.lage === s.lage);
      return row ? row.tvoll : 2e3;
    }
    function updateTvoll() {
      const auto = autoTvoll();
      const input = body.querySelector("#m1-tvoll-out");
      const hinweis = body.querySelector("#m1-tvoll-hinweis");
      if (s.tvollModus === "manuell" && parseFloat(s.tvollManuell) > 0) {
        s.tvoll = parseFloat(s.tvollManuell);
        if (input) {
          input.readOnly = false;
          input.value = s.tvollManuell;
        }
        if (hinweis) hinweis.textContent = `Manueller Override: tvoll = ${s.tvoll} h/a (automatischer Vorschlag w\xE4re ${auto} h/a).`;
      } else {
        s.tvoll = auto;
        if (input) {
          input.readOnly = true;
          input.value = auto;
        }
        if (hinweis) hinweis.textContent = `Automatik: ${s.gebaeudetyp === "buero" ? "B\xFCro/Gewerbe (Wochenendabsenkung)" : "Wohnen ohne WW"}, ${s.lage === "hoehe" ? "\u2265 800 m \xFC. M." : "Mittelland"} \u2192 ${auto} h/a. Die WW-Energie wird separat in M5 gerechnet.`;
      }
    }
    bindInputs(body, s, (k, v) => {
      if (k === "wpMachtWW") s.wpMachtWW = v === "true" || v === true;
      if (k === "inklWW") s.wpMachtWW = v === "true" || v === true;
      if (k === "ebf") s.ebf = v === "" ? "" : parseFloat(v);
      if (k === "wohneinheiten") s.wohneinheiten = parseInt(v) || 1;
      if (k === "tvollManuell") s.tvollManuell = v === "" ? "" : parseFloat(v);
      if (k === "tvollModus") s.tvollModus = v;
      updateTvoll();
      onChange?.();
    });
    return body;
  }

  // js/heizlast.js
  var round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
  var fmt = (n, d = 2) => round(n, d).toLocaleString("de-CH", {
    minimumFractionDigits: d,
    maximumFractionDigits: d
  });
  function result(wert, einheit, steps, opts = {}) {
    return { wert, einheit, steps, ...opts };
  }
  function qnAusVerbrauch(ba, ho, eta, { label = "", trennerEinheit = "" } = {}) {
    const qn = ba * ho * eta;
    return result(qn, "kWh/a", [
      { formel: `Qn = Ba \xB7 Ho \xB7 \u03B7${label ? " (" + label + ")" : ""}`, wert: "" },
      { formel: `Qn = ${fmt(ba)} ${trennerEinheit} \xB7 ${fmt(ho, 2)} kWh \xB7 ${fmt(eta, 2)}`, wert: "" },
      { formel: `Qn`, wert: `${fmt(qn, 0)} kWh/a` }
    ]);
  }
  function qnSumme(qnList) {
    const summe = qnList.reduce((s, q) => s + q.wert, 0);
    const steps = [
      { formel: "\u03A3 Qn,i  (bivalente Anlage)", wert: "" },
      ...qnList.map((q) => ({ formel: "+", wert: `${fmt(q.wert, 0)} kWh/a` })),
      { formel: "Qn,total", wert: `${fmt(summe, 0)} kWh/a` }
    ];
    return result(summe, "kWh/a", steps);
  }
  function qhlAusQn(qn, tvoll) {
    const qhl = qn / tvoll;
    return result(qhl, "kW", [
      { formel: "Qhl = Qn / tvoll", wert: "" },
      { formel: `Qhl = ${fmt(qn, 0)} / ${fmt(tvoll, 0)}`, wert: "" },
      { formel: "Qhl", wert: `${fmt(qhl, 2)} kW` }
    ]);
  }
  function qnAusBetriebsstunden(stundenGesamt, jahre, qhWP) {
    const hProJahr = stundenGesamt / jahre;
    const qn = hProJahr * qhWP;
    return result(qn, "kWh/a", [
      {
        formel: "h/a = Stunden gesamt / Jahre",
        wert: `${fmt(stundenGesamt, 0)} / ${fmt(jahre, 0)} = ${fmt(hProJahr, 0)} h/a`
      },
      {
        formel: "Qn = (h/a) \xB7 Qh,WP",
        wert: `${fmt(hProJahr, 0)} \xB7 ${fmt(qhWP, 2)} = ${fmt(qn, 0)} kWh/a`
      }
    ]);
  }
  function qhlAusBauperiode(bauperiodeId, gebaeudetyp, ebf, tvoll) {
    const bp = BAUPERIODEN.find((b) => b.id === bauperiodeId);
    if (!bp) return null;
    const [min, max] = bp[gebaeudetyp];
    const kwhMin = min * ebf;
    const kwhMax = max * ebf;
    const qhlMin = kwhMin / tvoll;
    const qhlMax = kwhMax / tvoll;
    return result((qhlMin + qhlMax) / 2, "kW", [
      {
        formel: `Bauperiode ${bp.label} (${gebaeudetyp.toUpperCase()})`,
        wert: `${min}\u2013${max} kWh/m\xB2\xB7a`
      },
      {
        formel: `Qn = spez \xB7 EBF`,
        wert: `${min}\u2026${max} \xB7 ${ebf} = ${fmt(kwhMin, 0)}\u2026${fmt(kwhMax, 0)} kWh/a`
      },
      {
        formel: `Qhl = Qn / tvoll`,
        wert: `${fmt(qhlMin, 2)}\u2026${fmt(qhlMax, 2)} kW`
      }
    ], { range: [qhlMin, qhlMax] });
  }
  function qoff(qhl, toff) {
    const faktor = toff >= 24 ? Infinity : 24 / (24 - toff) - 1;
    const qoffVal = qhl * faktor;
    const tabFaktor = SPERRZEIT_FAKTOREN[Math.round(toff)];
    return result(qoffVal, "kW", [
      { formel: "Qoff = Qhl \xB7 (24 / (24 \u2212 toff) \u2212 1)", wert: "" },
      { formel: `Qoff = ${fmt(qhl, 2)} \xB7 (24 / (24 \u2212 ${toff}) \u2212 1)`, wert: "" },
      { formel: `Qoff = ${fmt(qhl, 2)} \xB7 ${fmt(faktor, 4)}`, wert: "" },
      { formel: "Qoff", wert: `${fmt(qoffVal, 2)} kW` },
      {
        formel: "Kontrollfaktor Tabelle",
        wert: tabFaktor ? `${toff} h \u2192 ${(tabFaktor * 100).toFixed(0)} %` : "\u2014"
      }
    ]);
  }
  function spezHeizleistung(qhl, ebf, bauperiodeId, gebaeudetyp) {
    if (!ebf) return null;
    const wm2 = qhl * 1e3 / ebf;
    const ref = SPEZ_HEIZLEISTUNG.find((b) => b.id === bauperiodeId);
    const [rMin, rMax] = ref ? ref[gebaeudetyp] : [null, null];
    let ampel = "grau";
    let hinweis = "";
    if (ref) {
      if (wm2 < rMin * 0.85) {
        ampel = "rot";
        hinweis = "Deutlich unter Band \u2013 Vollaststunden-Methode m\xF6glicherweise ungenau (Minergie-P, Leichtbau, hoher Glasanteil).";
      } else if (wm2 < rMin) {
        ampel = "gelb";
        hinweis = "Knapp unter Band \u2013 Vollaststunden pr\xFCfen.";
      } else if (wm2 > rMax * 1.15) {
        ampel = "rot";
        hinweis = "Deutlich \xFCber Band \u2013 Eingaben pr\xFCfen (\u03B7, Ho, Verbrauch).";
      } else if (wm2 > rMax) {
        ampel = "gelb";
        hinweis = "Knapp \xFCber Band.";
      } else {
        ampel = "gruen";
        hinweis = "Im typischen Bereich.";
      }
    }
    return result(wm2, "W/m\xB2", [
      {
        formel: "spez = Qhl / EBF",
        wert: `${fmt(qhl * 1e3, 0)} W / ${fmt(ebf, 0)} m\xB2 = ${fmt(wm2, 1)} W/m\xB2`
      },
      {
        formel: "Referenzband",
        wert: ref ? `${rMin}\u2013${rMax} W/m\xB2` : "\u2014"
      }
    ], { ampel, hinweis, refBand: ref ? [rMin, rMax] : null });
  }
  function qhlNachSanierung(qhl, massnahmen) {
    const faktor = massnahmen.reduce((f, m) => f * (1 - m.einsparungProzent / 100), 1);
    const qhlNeu = qhl * faktor;
    const steps = [
      { formel: "Qhl,neu = Qhl \xB7 \u03A0 (1 \u2212 Einsparung)", wert: "" },
      { formel: "Qhl,neu = " + fmt(qhl, 2) + " kW", wert: "" },
      ...massnahmen.map((m) => ({
        formel: `\xD7 (1 \u2212 ${m.einsparungProzent}%)  [${m.label}]`,
        wert: `\xD7 ${fmt(1 - m.einsparungProzent / 100, 3)}`
      })),
      { formel: "Qhl,neu", wert: `${fmt(qhlNeu, 2)} kW  (Reduktion ${fmt((1 - faktor) * 100, 1)} %)` }
    ];
    return result(qhlNeu, "kW", steps, { faktor, einsparungProzent: (1 - faktor) * 100 });
  }
  function personenbelegung(anf) {
    const np = 3.3 - 2 / (1 + Math.pow(anf / 100, 3));
    return result(np, "P", [
      { formel: "np = 3.3 \u2212 2 / (1 + (ANF/100)\xB3)", wert: "" },
      { formel: `np = 3.3 \u2212 2 / (1 + (${fmt(anf, 0)}/100)\xB3)`, wert: "" },
      { formel: "np", wert: `${fmt(np, 2)} P` }
    ]);
  }
  function qwuTag(vwu, deltaT = PHYSIK.deltaT_ww) {
    const qwu = vwu * PHYSIK.rho_wasser * PHYSIK.cp_wasser * PHYSIK.kJzukWh * deltaT;
    return result(qwu, "kWh/d", [
      { formel: "QW,u = V \xB7 \u03C1 \xB7 cp \xB7 \u0394T / 3600", wert: "" },
      { formel: `QW,u = ${fmt(vwu, 0)} \xB7 1 \xB7 4.2 \xB7 ${deltaT} / 3600`, wert: "" },
      { formel: "QW,u", wert: `${fmt(qwu, 2)} kWh/d` }
    ]);
  }
  function qnwwJahr(vwu, verluste, deltaT = PHYSIK.deltaT_ww) {
    const faktorSpeicher = 1 + (verluste.speicher || 0);
    const faktorZirk = 1 + (verluste.zirk || 0);
    const faktorAusstoss = 1 + (verluste.ausstoss || 0);
    const faktorTotal = faktorSpeicher * faktorZirk * faktorAusstoss;
    const qnww = vwu * PHYSIK.cp_wasser * PHYSIK.kJzukWh * deltaT * faktorTotal * 365;
    const steps = [
      { formel: "Qn,WW = V \xB7 cp \xB7 \u0394T / 3600 \xB7 \u03A0(1+f) \xB7 365", wert: "" },
      {
        formel: `Basis`,
        wert: `${fmt(vwu, 0)} l/d \xB7 4.2/3600 \xB7 ${deltaT} K \xB7 365 d/a = ${fmt(vwu * 4.2 / 3600 * deltaT * 365, 0)} kWh/a`
      },
      {
        formel: `Verluste Speicher \xD7${fmt(faktorSpeicher, 2)}  Zirk \xD7${fmt(faktorZirk, 2)}  Ausstoss \xD7${fmt(faktorAusstoss, 2)}`,
        wert: `\xD7 ${fmt(faktorTotal, 3)}`
      },
      { formel: "Qn,WW", wert: `${fmt(qnww, 0)} kWh/a` }
    ];
    return result(qnww, "kWh/a", steps, { verlustFaktor: faktorTotal });
  }
  function speicherverlustAusVolumen(volumen) {
    const tab = SPEICHER_VERLUSTE;
    if (volumen <= tab[0].volumen) return tab[0].verlust;
    if (volumen >= tab[tab.length - 1].volumen) return tab[tab.length - 1].verlust;
    for (let i = 0; i < tab.length - 1; i++) {
      if (volumen >= tab[i].volumen && volumen <= tab[i + 1].volumen) {
        const f = (volumen - tab[i].volumen) / (tab[i + 1].volumen - tab[i].volumen);
        return tab[i].verlust + f * (tab[i + 1].verlust - tab[i].verlust);
      }
    }
    return null;
  }
  function qwwTag(qwu, {
    qstoLs = null,
    qhlLs = null,
    qemLs = null,
    speicherProzent = null,
    zirkProzent = null,
    ausstossProzent = null
  } = {}) {
    const sto = qstoLs != null ? qstoLs : speicherProzent != null ? qwu * speicherProzent / 100 : 0;
    const hl = qhlLs != null ? qhlLs : zirkProzent != null ? qwu * zirkProzent / 100 : 0;
    const em = qemLs != null ? qemLs : ausstossProzent != null ? qwu * ausstossProzent / 100 : 0;
    const qww = qwu + sto + hl + em;
    return result(qww, "kWh/d", [
      { formel: "QWW = QW,u + QW,sto,ls + QW,hl,ls + QW,em,ls", wert: "" },
      { formel: `QWW = ${fmt(qwu, 2)} + ${fmt(sto, 2)} + ${fmt(hl, 2)} + ${fmt(em, 2)}`, wert: "" },
      { formel: "QWW", wert: `${fmt(qww, 2)} kWh/d` }
    ], { anteile: { qwu, sto, hl, em } });
  }
  function qw(qhl, qwwTag2) {
    const td = qwwTag2 / qhl;
    const faktor = td >= 24 ? Infinity : 24 / (24 - td) - 1;
    const qwVal = qhl * faktor;
    return result(qwVal, "kW", [
      { formel: "td = QWW / Qhl", wert: `${fmt(qwwTag2, 2)} / ${fmt(qhl, 2)} = ${fmt(td, 2)} h/d` },
      { formel: "Qw = Qhl \xB7 (24 / (24 \u2212 td) \u2212 1)", wert: "" },
      { formel: `Qw = ${fmt(qhl, 2)} \xB7 (24 / (24 \u2212 ${fmt(td, 2)}) \u2212 1)`, wert: "" },
      { formel: "Qw", wert: `${fmt(qwVal, 2)} kW` }
    ], { td });
  }
  function qhGesamt(qhl, qw_, qoff_, qas = 0) {
    const qh = qhl + qw_ + qoff_ + qas;
    return result(qh, "kW", [
      { formel: "Qh = Qhl + Qw + Qoff + Qas", wert: "" },
      { formel: `Qh = ${fmt(qhl, 2)} + ${fmt(qw_, 2)} + ${fmt(qoff_, 2)} + ${fmt(qas, 2)}`, wert: "" },
      { formel: "Qh", wert: `${fmt(qh, 2)} kW` }
    ]);
  }
  function inverterCheck(qhGebaeude, qWP) {
    const verhaeltnis = qhGebaeude / qWP;
    const ok = verhaeltnis >= 0.75;
    return result(verhaeltnis, "", [
      { formel: "Faustregel: Qh,Geb\xE4ude \u2265 0.75 \xB7 QWP", wert: "" },
      {
        formel: `Verh\xE4ltnis = ${fmt(qhGebaeude, 2)} / ${fmt(qWP, 2)}`,
        wert: `${fmt(verhaeltnis, 2)}`
      },
      {
        formel: "Beurteilung",
        wert: ok ? "\u2713 im Bereich (bis 25 % \xDCberdimensionierung OK)" : "\u2717 WP zu gross \u2013 \xDCberdimensionierung > 25 %"
      }
    ], { ok });
  }
  function speichervolumen(qww, tStoAus = 60, tStoEin = PHYSIK.t_kaltwasser) {
    const deltaT = tStoAus - tStoEin;
    const v = qww / (PHYSIK.cp_wasser * PHYSIK.kJzukWh * deltaT);
    return result(v, "l", [
      { formel: "VW,Sto = QWW / (cp \xB7 \u0394T / 3600)", wert: "" },
      { formel: `VW,Sto = ${fmt(qww, 2)} / (4.2 \xB7 ${deltaT} / 3600)`, wert: "" },
      { formel: "VW,Sto", wert: `${fmt(v, 0)} l` }
    ]);
  }
  function puffer_abtau(qwp, { tMin = 5, deltaT = 5, cp = 4.2 } = {}) {
    const v = qwp * (tMin / 60) * 3600 / (cp * deltaT);
    return result(v, "l", [
      { formel: "V = Q_WP \xB7 t_Abtau \xB7 3600 / (cp \xB7 \u0394T)", wert: "" },
      { formel: `V = ${fmt(qwp, 2)} \xB7 ${tMin}/60 \xB7 3600 / (${cp} \xB7 ${deltaT})`, wert: "" },
      { formel: "V", wert: `${fmt(v, 0)} l` }
    ]);
  }
  function puffer_takt(qwp, { tMin = 6, deltaT = 5, cp = 4.2 } = {}) {
    const v = qwp * (tMin / 60) * 3600 / (cp * deltaT);
    return result(v, "l", [
      { formel: "V = Q_WP \xB7 t_min \xB7 3600 / (cp \xB7 \u0394T)", wert: "" },
      { formel: `V = ${fmt(qwp, 2)} \xB7 ${tMin}/60 \xB7 3600 / (${cp} \xB7 ${deltaT})`, wert: "" },
      { formel: "V", wert: `${fmt(v, 0)} l` }
    ]);
  }
  function puffer_err(qwp, bandLproKw = [15, 25]) {
    const [min, max] = bandLproKw;
    return result(qwp * max, "l", [
      { formel: "V = Q_WP \xB7 (Herstellerband l/kW)", wert: "" },
      { formel: `V = ${fmt(qwp, 2)} \xB7 ${min}\u2026${max}`, wert: `${fmt(qwp * min, 0)}\u2026${fmt(qwp * max, 0)} l` }
    ], { range: [qwp * min, qwp * max] });
  }
  function puffer_sperrzeit(qhl, toff, deltaT = 10, cp = 4.2) {
    const v = qhl * toff * 3600 / (cp * deltaT);
    return result(v, "l", [
      { formel: "V = Qhl \xB7 t_off \xB7 3600 / (cp \xB7 \u0394T)", wert: "" },
      { formel: `V = ${fmt(qhl, 2)} \xB7 ${toff} \xB7 3600 / (${cp} \xB7 ${deltaT})`, wert: "" },
      { formel: "V", wert: `${fmt(v, 0)} l` }
    ]);
  }

  // js/modules/m2-heizlast.js
  function renderM2(state2, onChange) {
    const s = state2.m2 ||= {
      methode: "verbrauch",
      // a|b|c|d|f
      traeger: [
        { energietraeger: "oel", verbrauch: "", ho: BRENNWERTE.oel.ho, eta: 0.85 }
      ],
      inklWW: false,
      vwuFuerAbzug: "",
      // l/d falls inklWW
      verlusteFuerAbzug: { speicher: 10, zirk: 0, ausstoss: 15 },
      qnMess: "",
      // (b)
      stundenGesamt: "",
      // (c)
      jahreBetrieb: "",
      // (c)
      qhWP: "",
      // (c)
      // (d) greift auf state.m1 zurück
      qhlOverride: ""
      // (f)
    };
    const body = el("div", {});
    const tabs = el("div", { class: "tabs" });
    const panels = el("div", {});
    const methoden = [
      { id: "verbrauch", label: "Brennstoffverbrauch" },
      { id: "messung", label: "Messwert" },
      { id: "bstd", label: "Betriebsstunden-R\xFCckrechnung" },
      { id: "bauperiode", label: "Bauperiode + EBF" },
      { id: "override", label: "Fester Wert" }
    ];
    methoden.forEach((m) => {
      const btn = el("button", {
        class: s.methode === m.id ? "active" : "",
        onclick: () => switchTab(m.id)
      }, m.label);
      tabs.appendChild(btn);
      const panel = el("div", { class: "tab-panel" + (s.methode === m.id ? " active" : ""), "data-tab": m.id });
      panels.appendChild(panel);
    });
    function switchTab(id) {
      s.methode = id;
      tabs.querySelectorAll("button").forEach((b, i) => b.classList.toggle("active", methoden[i].id === id));
      panels.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.dataset.tab === id));
      recompute();
    }
    const panelA = panels.querySelector('[data-tab="verbrauch"]');
    const listA = el("div", { class: "dyn-list" });
    const addBtn = el("button", { class: "dyn-add", onclick: () => {
      s.traeger.push({ energietraeger: "oel", verbrauch: "", ho: BRENNWERTE.oel.ho, eta: 0.85 });
      renderTraegerList();
      recompute();
    } }, "+ Energietr\xE4ger hinzuf\xFCgen");
    const wwToggle = el(
      "label",
      { class: "field" },
      el("span", {}, "Verbrauch inklusive Warmwasser?"),
      el(
        "select",
        { onchange: (e) => {
          s.inklWW = e.target.value === "true";
          renderWWBlock();
          recompute();
        } },
        el("option", { value: "false" }, "nein \u2013 Heizung only"),
        el("option", { value: "true" }, "ja \u2013 WW-Anteil wird abgezogen")
      )
    );
    wwToggle.querySelector("select").value = String(s.inklWW);
    const wwBlock = el("div", {});
    function renderWWBlock() {
      wwBlock.innerHTML = "";
      if (!s.inklWW) return;
      wwBlock.appendChild(el(
        "div",
        { class: "row row-3" },
        el(
          "label",
          { class: "field" },
          el("span", {}, "WW-Verbrauch VW,u"),
          el(
            "div",
            { class: "input-group" },
            el("input", { type: "number", value: s.vwuFuerAbzug, oninput: (e) => {
              s.vwuFuerAbzug = e.target.value === "" ? "" : parseFloat(e.target.value);
              recompute();
            } }),
            el("span", { class: "unit" }, "l/d")
          )
        ),
        el(
          "label",
          { class: "field" },
          el("span", {}, "Speicher-Verluste"),
          el(
            "div",
            { class: "input-group" },
            el("input", { type: "number", value: s.verlusteFuerAbzug.speicher, oninput: (e) => {
              s.verlusteFuerAbzug.speicher = parseFloat(e.target.value) || 0;
              recompute();
            } }),
            el("span", { class: "unit" }, "%")
          )
        ),
        el(
          "label",
          { class: "field" },
          el("span", {}, "Ausstoss-Verluste"),
          el(
            "div",
            { class: "input-group" },
            el("input", { type: "number", value: s.verlusteFuerAbzug.ausstoss, oninput: (e) => {
              s.verlusteFuerAbzug.ausstoss = parseFloat(e.target.value) || 0;
              recompute();
            } }),
            el("span", { class: "unit" }, "%")
          )
        )
      ));
      wwBlock.appendChild(el(
        "div",
        { class: "row" },
        el(
          "label",
          { class: "field" },
          el("span", {}, "Zirkulations-Verluste"),
          el(
            "div",
            { class: "input-group" },
            el("input", { type: "number", value: s.verlusteFuerAbzug.zirk, oninput: (e) => {
              s.verlusteFuerAbzug.zirk = parseFloat(e.target.value) || 0;
              recompute();
            } }),
            el("span", { class: "unit" }, "%")
          )
        )
      ));
    }
    function renderTraegerList() {
      listA.innerHTML = "";
      s.traeger.forEach((t, idx) => {
        const etDef = BRENNWERTE[t.energietraeger] || BRENNWERTE.oel;
        const item = el(
          "div",
          { class: "dyn-item" },
          el(
            "div",
            { class: "inner" },
            el(
              "label",
              { class: "field" },
              el("span", {}, "Energietr\xE4ger"),
              el(
                "select",
                { onchange: (e) => {
                  t.energietraeger = e.target.value;
                  t.ho = BRENNWERTE[t.energietraeger].ho;
                  renderTraegerList();
                  recompute();
                } },
                ...Object.entries(BRENNWERTE).map(([k, v]) => el("option", { value: k, ...k === t.energietraeger ? { selected: "selected" } : {} }, v.label))
              )
            ),
            el(
              "label",
              { class: "field" },
              el("span", {}, "Jahresverbrauch"),
              el(
                "div",
                { class: "input-group" },
                el("input", {
                  type: "number",
                  value: t.verbrauch,
                  placeholder: "0",
                  oninput: (e) => {
                    t.verbrauch = e.target.value === "" ? "" : parseFloat(e.target.value);
                    recompute();
                  }
                }),
                el("span", { class: "unit" }, etDef.verbrauchEinheit)
              )
            ),
            el(
              "label",
              { class: "field" },
              el("span", {}, "Brennwert Ho"),
              el(
                "div",
                { class: "input-group" },
                el("input", {
                  type: "number",
                  value: t.ho,
                  step: "0.1",
                  oninput: (e) => {
                    t.ho = parseFloat(e.target.value) || 0;
                    recompute();
                  }
                }),
                el("span", { class: "unit" }, etDef.einheit)
              )
            ),
            el(
              "label",
              { class: "field" },
              el("span", {}, "Jahresnutzungsgrad \u03B7"),
              el("input", {
                type: "number",
                value: t.eta,
                step: "0.01",
                min: "0",
                max: "1",
                oninput: (e) => {
                  t.eta = parseFloat(e.target.value) || 0;
                  recompute();
                }
              })
            )
          ),
          s.traeger.length > 1 ? el("button", {
            class: "dyn-item-remove",
            title: "Entfernen",
            onclick: () => {
              s.traeger.splice(idx, 1);
              renderTraegerList();
              recompute();
            }
          }, "\xD7") : null
        );
        listA.appendChild(item);
      });
      const hilfe = el(
        "details",
        { class: "steps" },
        el("summary", {}, "\u03B7-Richtwerte (klicken zum \xDCbernehmen)"),
        el(
          "div",
          { class: "steps-list" },
          ...WIRKUNGSGRADE.map((w) => el(
            "div",
            { class: "step" },
            el("span", { class: "left" }, w.label),
            el("span", { class: "right" }, `${w.min}\u2013${w.max}`)
          ))
        )
      );
      listA.appendChild(hilfe);
    }
    panelA.appendChild(wwToggle);
    panelA.appendChild(wwBlock);
    panelA.appendChild(el(
      "div",
      { style: { marginTop: "12px", fontSize: "12px", color: "var(--mid-gray)" } },
      "Bivalente Anlagen: mehrere Tr\xE4ger hinzuf\xFCgen, Nutzenergien werden addiert."
    ));
    panelA.appendChild(listA);
    panelA.appendChild(addBtn);
    renderTraegerList();
    renderWWBlock();
    const panelB = panels.querySelector('[data-tab="messung"]');
    panelB.appendChild(el(
      "div",
      { class: "row" },
      el(
        "label",
        { class: "field" },
        el("span", {}, "Nutzenergie Heizung (gemessen)"),
        el(
          "div",
          { class: "input-group" },
          el("input", {
            type: "number",
            value: s.qnMess,
            placeholder: "z. B. 23000",
            oninput: (e) => {
              s.qnMess = e.target.value === "" ? "" : parseFloat(e.target.value);
              recompute();
            }
          }),
          el("span", { class: "unit" }, "kWh/a")
        )
      )
    ));
    const panelC = panels.querySelector('[data-tab="bstd"]');
    panelC.appendChild(el(
      "div",
      { class: "row row-3" },
      el(
        "label",
        { class: "field" },
        el("span", {}, "Betriebsstundenz\xE4hler"),
        el(
          "div",
          { class: "input-group" },
          el("input", {
            type: "number",
            value: s.stundenGesamt,
            oninput: (e) => {
              s.stundenGesamt = parseFloat(e.target.value) || "";
              recompute();
            }
          }),
          el("span", { class: "unit" }, "h")
        )
      ),
      el(
        "label",
        { class: "field" },
        el("span", {}, "Betriebsdauer"),
        el(
          "div",
          { class: "input-group" },
          el("input", {
            type: "number",
            value: s.jahreBetrieb,
            oninput: (e) => {
              s.jahreBetrieb = parseFloat(e.target.value) || "";
              recompute();
            }
          }),
          el("span", { class: "unit" }, "Jahre")
        )
      ),
      el(
        "label",
        { class: "field" },
        el("span", {}, "Heizleistung WP (BO/W35 o.\xE4.)"),
        el(
          "div",
          { class: "input-group" },
          el("input", {
            type: "number",
            value: s.qhWP,
            step: "0.1",
            oninput: (e) => {
              s.qhWP = parseFloat(e.target.value) || "";
              recompute();
            }
          }),
          el("span", { class: "unit" }, "kW")
        )
      )
    ));
    const panelD = panels.querySelector('[data-tab="bauperiode"]');
    panelD.appendChild(el(
      "div",
      { style: { fontSize: "13px", color: "var(--mid-gray)" } },
      "\xDCbernimmt Bauperiode und EBF aus Stammdaten (M1) und berechnet Sch\xE4tzband anhand \xA76."
    ));
    const panelF = panels.querySelector('[data-tab="override"]');
    panelF.appendChild(el(
      "div",
      { class: "row" },
      el(
        "label",
        { class: "field" },
        el("span", {}, "Qhl (z. B. aus SIA 384/1-Berechnung)"),
        el(
          "div",
          { class: "input-group" },
          el("input", {
            type: "number",
            value: s.qhlOverride,
            step: "0.1",
            placeholder: "z. B. 12.5",
            oninput: (e) => {
              s.qhlOverride = parseFloat(e.target.value) || "";
              recompute();
            }
          }),
          el("span", { class: "unit" }, "kW")
        )
      )
    ));
    body.appendChild(tabs);
    body.appendChild(panels);
    const resultMount = el("div", { id: "m2-result" });
    body.appendChild(resultMount);
    function recompute() {
      const m1 = state2.m1 || {};
      const tvoll = m1.tvoll || 2e3;
      let qn = null, qhl = null;
      if (s.methode === "verbrauch") {
        const qnTeile = s.traeger.filter((t) => parseFloat(t.verbrauch) > 0).map((t) => qnAusVerbrauch(
          parseFloat(t.verbrauch),
          parseFloat(t.ho),
          parseFloat(t.eta),
          { label: BRENNWERTE[t.energietraeger]?.label, trennerEinheit: BRENNWERTE[t.energietraeger]?.verbrauchEinheit }
        ));
        if (qnTeile.length === 0) {
          render(null, null, null);
          return;
        }
        const qnGes = qnTeile.length > 1 ? qnSumme(qnTeile) : qnTeile[0];
        let qnH = qnGes;
        let qnWwRes = null;
        if (s.inklWW && parseFloat(s.vwuFuerAbzug) > 0) {
          qnWwRes = qnwwJahr(parseFloat(s.vwuFuerAbzug), {
            speicher: s.verlusteFuerAbzug.speicher / 100,
            zirk: s.verlusteFuerAbzug.zirk / 100,
            ausstoss: s.verlusteFuerAbzug.ausstoss / 100
          });
          qnH = { ...qnGes, wert: qnGes.wert - qnWwRes.wert, steps: [
            ...qnGes.steps,
            { formel: "\u2212 Qn,WW", wert: `\u2212 ${qnWwRes.wert.toFixed(0)} kWh/a` },
            { formel: "Qn,H", wert: `${(qnGes.wert - qnWwRes.wert).toFixed(0)} kWh/a` }
          ] };
        }
        qhl = qhlAusQn(qnH.wert, tvoll);
        render(qnGes, qnH, qhl, qnWwRes);
        state2._last = { qhl: qhl.wert, qhlRaw: qhl.wert, qnH: qnH.wert, qnWW: qnWwRes?.wert ?? null };
      } else if (s.methode === "messung" && parseFloat(s.qnMess) > 0) {
        qhl = qhlAusQn(parseFloat(s.qnMess), tvoll);
        render(null, { wert: parseFloat(s.qnMess), einheit: "kWh/a", steps: [{ formel: "Messwert Qn,H", wert: `${s.qnMess} kWh/a` }] }, qhl);
        state2._last = { qhl: qhl.wert, qhlRaw: qhl.wert, qnH: parseFloat(s.qnMess), qnWW: null };
      } else if (s.methode === "bstd" && parseFloat(s.stundenGesamt) > 0 && parseFloat(s.jahreBetrieb) > 0 && parseFloat(s.qhWP) > 0) {
        qn = qnAusBetriebsstunden(parseFloat(s.stundenGesamt), parseFloat(s.jahreBetrieb), parseFloat(s.qhWP));
        qhl = qhlAusQn(qn.wert, tvoll);
        render(null, qn, qhl);
        state2._last = { qhl: qhl.wert, qhlRaw: qhl.wert, qnH: qn.wert, qnWW: null };
      } else if (s.methode === "bauperiode" && m1.bauperiode && parseFloat(m1.ebf) > 0) {
        const g = m1.gebaeudetyp === "mfh" ? "mfh" : "efh";
        qhl = qhlAusBauperiode(m1.bauperiode, g, parseFloat(m1.ebf), tvoll);
        render(null, null, qhl);
        state2._last = { qhl: qhl?.wert, qhlRaw: qhl?.wert, qnH: null, qnWW: null };
      } else if (s.methode === "override" && parseFloat(s.qhlOverride) > 0) {
        qhl = { wert: parseFloat(s.qhlOverride), einheit: "kW", steps: [{ formel: "Fester Wert (Override)", wert: `${s.qhlOverride} kW` }] };
        render(null, null, qhl);
        state2._last = { qhl: qhl.wert, qhlRaw: qhl.wert, qnH: null, qnWW: null };
      } else {
        render(null, null, null);
        state2._last = {};
      }
      onChange?.();
    }
    function render(qnGes, qnH, qhl, qnWw) {
      resultMount.innerHTML = "";
      if (!qhl) {
        resultMount.appendChild(el(
          "div",
          { style: { color: "var(--mid-gray)", fontSize: "13px", marginTop: "10px" } },
          "Eingaben erg\xE4nzen, um die Heizlast zu berechnen."
        ));
        return;
      }
      if (qnGes) resultMount.appendChild(stepsCard("Nutzenergie Total", qnGes));
      if (qnWw) resultMount.appendChild(stepsCard("Abgezogene Nutzenergie Warmwasser", qnWw));
      if (qnH) resultMount.appendChild(stepsCard("Nutzenergie Heizung", qnH));
      resultMount.appendChild(mainCard("Norm-Heizlast Qhl", qhl));
      const m1 = state2.m1 || {};
      const tv = m1.tvoll || 2e3;
      const modusTxt = m1.tvollModus === "manuell" ? `manueller Override` : (m1.gebaeudetyp === "buero" ? "B\xFCro/Gewerbe" : "Wohnen ohne WW") + `, ${m1.lage === "hoehe" ? "\u2265 800 m \xFC. M." : "Mittelland"}`;
      resultMount.appendChild(el(
        "div",
        { class: "hinweis", style: { marginTop: "8px" } },
        `Verwendet tvoll = ${tv} h/a (${modusTxt}). Warmwasser wird in M5 separat als Zuschlag Qw gerechnet.`
      ));
    }
    function stepsCard(label, res) {
      return el(
        "div",
        { style: { marginTop: "10px" } },
        el("div", { style: { fontSize: "12px", color: "var(--mid-gray)", marginBottom: "4px" } }, label),
        el(
          "div",
          { style: { fontSize: "15px", color: "var(--navy)", fontWeight: 500 } },
          `${res.wert.toLocaleString("de-CH", { maximumFractionDigits: 0 })} ${res.einheit}`
        ),
        renderStepsDetails(res)
      );
    }
    function mainCard(label, res) {
      const card = el(
        "div",
        { class: "result-card highlight" },
        el(
          "div",
          {},
          el("div", { class: "label" }, label),
          el(
            "div",
            { class: "value" },
            `${res.wert.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${res.einheit}`
          )
        )
      );
      const wrap = el("div", { style: { marginTop: "14px" } }, card, renderStepsDetails(res));
      if (res.range) wrap.appendChild(el(
        "div",
        { class: "hinweis" },
        `Sch\xE4tzband: ${res.range[0].toFixed(2)} \u2013 ${res.range[1].toFixed(2)} kW`
      ));
      return wrap;
    }
    function renderStepsDetails(res) {
      if (!res.steps) return null;
      return el(
        "details",
        { class: "steps" },
        el("summary", {}, "Rechenweg"),
        el(
          "div",
          { class: "steps-list" },
          ...res.steps.map((st) => el(
            "div",
            { class: "step" },
            el("span", { class: "left" }, st.formel),
            el("span", { class: "right" }, st.wert || "")
          ))
        )
      );
    }
    setTimeout(recompute, 0);
    body._recompute = recompute;
    return body;
  }

  // js/modules/m3-plausibilitaet.js
  function renderM3(state2) {
    const body = el("div", { id: "m3-body" });
    function render() {
      body.innerHTML = "";
      const m1 = state2.m1 || {};
      const qhl = state2._last?.qhl;
      if (!qhl || !m1.ebf || !m1.bauperiode) {
        body.appendChild(el(
          "div",
          { style: { color: "var(--mid-gray)", fontSize: "13px" } },
          "EBF und Bauperiode in Stammdaten (M1) sowie eine berechnete Qhl (M2) erforderlich."
        ));
        return;
      }
      const g = m1.gebaeudetyp === "mfh" ? "mfh" : "efh";
      const res = spezHeizleistung(qhl, parseFloat(m1.ebf), m1.bauperiode, g);
      if (!res) {
        body.appendChild(el("div", {}, "\u2013"));
        return;
      }
      body.appendChild(el(
        "div",
        { class: "result-card" },
        el(
          "div",
          {},
          el("div", { class: "label" }, "Spezifische Heizleistung"),
          el("div", { class: "value" }, `${res.wert.toFixed(1)} W/m\xB2`)
        ),
        el("span", { class: `ampel ${res.ampel}` }, res.ampel.toUpperCase())
      ));
      body.appendChild(el(
        "details",
        { class: "steps" },
        el("summary", {}, "Rechenweg"),
        el(
          "div",
          { class: "steps-list" },
          ...res.steps.map((st) => el(
            "div",
            { class: "step" },
            el("span", { class: "left" }, st.formel),
            el("span", { class: "right" }, st.wert || "")
          ))
        )
      ));
      if (res.hinweis) body.appendChild(el("div", { class: "hinweis" }, res.hinweis));
    }
    body._render = render;
    setTimeout(render, 0);
    return body;
  }

  // js/modules/m4-sanierung.js
  function renderM4(state2, onChange) {
    const s = state2.m4 ||= {
      aktiv: false,
      // Map massnahmen-id → { enabled, prozent }
      auswahl: Object.fromEntries(SANIERUNGS_MASSNAHMEN.map((m) => [m.id, {
        enabled: false,
        prozent: m.default
      }]))
    };
    const body = el("div", {});
    const aktivRow = el(
      "div",
      { class: "row", style: { marginBottom: "12px" } },
      el(
        "label",
        { class: "field" },
        el("span", {}, "Sanierung ber\xFCcksichtigen?"),
        el(
          "select",
          { onchange: (e) => {
            s.aktiv = e.target.value === "true";
            recompute();
            onChange?.();
          } },
          el("option", { value: "false" }, "nein \u2013 Qhl unver\xE4ndert"),
          el("option", { value: "true" }, "ja \u2013 Qhl multiplikativ reduzieren")
        )
      )
    );
    aktivRow.querySelector("select").value = String(s.aktiv);
    body.appendChild(aktivRow);
    body.appendChild(el(
      "div",
      { style: { fontSize: "12px", color: "var(--mid-gray)", marginBottom: "8px" } },
      "Richtwerte aus FWS M3 \xA76 (Einsparungs-Bandbreiten). Schieber bleibt innerhalb des Bands, Slider f\xFCr Feinjustierung."
    ));
    const listWrap = el("div", { class: "dyn-list" });
    SANIERUNGS_MASSNAHMEN.forEach((m) => {
      const entry = s.auswahl[m.id];
      const item = el("div", { class: "dyn-item" });
      const inner = el("div", { class: "inner" });
      const chkField = el(
        "label",
        { class: "field" },
        el("span", {}, m.label),
        el(
          "select",
          { onchange: (e) => {
            entry.enabled = e.target.value === "true";
            recompute();
            onChange?.();
          } },
          el("option", { value: "false" }, "aus"),
          el("option", { value: "true" }, "aktiv")
        )
      );
      chkField.querySelector("select").value = String(entry.enabled);
      const prozField = el(
        "label",
        { class: "field" },
        el("span", {}, `Einsparung (${m.einsparung[0]}\u2013${m.einsparung[1]} %)`),
        el(
          "div",
          { class: "input-group" },
          el("input", {
            type: "number",
            value: entry.prozent,
            min: m.einsparung[0],
            max: m.einsparung[1],
            step: "1",
            oninput: (e) => {
              const v = parseFloat(e.target.value) || 0;
              entry.prozent = Math.max(m.einsparung[0], Math.min(m.einsparung[1], v));
              recompute();
              onChange?.();
            }
          }),
          el("span", { class: "unit" }, "%")
        )
      );
      inner.appendChild(chkField);
      inner.appendChild(prozField);
      item.appendChild(inner);
      listWrap.appendChild(item);
    });
    body.appendChild(listWrap);
    const mount = el("div", { id: "m4-result", style: { marginTop: "14px" } });
    body.appendChild(mount);
    const mountKunde = el("div", { id: "m4-kunde" });
    body.appendChild(mountKunde);
    function grad(m, prozent) {
      const span = m.einsparung[1] - m.einsparung[0];
      const rel = span > 0 ? (prozent - m.einsparung[0]) / span : 0;
      if (rel < 0.34) return "teilweise wirksam";
      if (rel < 0.67) return "wirksam";
      return "umfassend wirksam";
    }
    function recompute() {
      mount.innerHTML = "";
      mountKunde.innerHTML = "";
      const qhlRaw = state2._last?.qhlRaw;
      if (!qhlRaw) {
        mount.appendChild(el(
          "div",
          { style: { color: "var(--mid-gray)", fontSize: "13px" } },
          "Qhl aus M2 erforderlich."
        ));
        if (state2._last) state2._last.qhl = state2._last.qhlRaw;
        return;
      }
      if (!s.aktiv) {
        state2._last.qhl = qhlRaw;
        mount.appendChild(el(
          "div",
          { style: { color: "var(--mid-gray)", fontSize: "13px" } },
          `Sanierung inaktiv \u2014 Qhl unver\xE4ndert (${qhlRaw.toFixed(2)} kW).`
        ));
        mountKunde.appendChild(el("div", {}, "Keine zus\xE4tzlichen Sanierungsmassnahmen in der Berechnung ber\xFCcksichtigt (Verbrauchs-Basis entspricht dem Ist-Zustand)."));
        return;
      }
      const massnahmen = SANIERUNGS_MASSNAHMEN.filter((m) => s.auswahl[m.id].enabled).map((m) => ({ id: m.id, label: m.label, einsparungProzent: s.auswahl[m.id].prozent }));
      if (massnahmen.length === 0) {
        state2._last.qhl = qhlRaw;
        mount.appendChild(el(
          "div",
          { style: { color: "var(--mid-gray)", fontSize: "13px" } },
          "Keine Massnahme aktiviert \u2014 Qhl unver\xE4ndert."
        ));
        return;
      }
      const r = qhlNachSanierung(qhlRaw, massnahmen);
      state2._last.qhl = r.wert;
      mount.appendChild(el(
        "div",
        { class: "result-card" },
        el(
          "div",
          {},
          el("div", { class: "label" }, `Qhl nach Sanierung (\u2212${r.einsparungProzent.toFixed(1)} %)`),
          el("div", { class: "value" }, `${r.wert.toFixed(2)} kW`)
        )
      ));
      mount.appendChild(el(
        "details",
        { class: "steps" },
        el("summary", {}, "Rechenweg"),
        el(
          "div",
          { class: "steps-list" },
          ...r.steps.map((st) => el(
            "div",
            { class: "step" },
            el("span", { class: "left" }, st.formel),
            el("span", { class: "right" }, st.wert || "")
          ))
        )
      ));
      const mMap = new Map(SANIERUNGS_MASSNAHMEN.map((m) => [m.id, m]));
      const lines = massnahmen.map((ma) => {
        const m = mMap.get(ma.id);
        return `\xB7 ${m.label} \u2013 ${grad(m, ma.einsparungProzent)}`;
      });
      mountKunde.appendChild(el(
        "div",
        {},
        el("div", { style: { fontWeight: 500, marginBottom: "6px" } }, "In die Auslegung einbezogene Sanierungsmassnahmen:"),
        el("div", { style: { whiteSpace: "pre-line", lineHeight: "1.5" } }, lines.join("\n")),
        el(
          "div",
          { style: { marginTop: "8px" } },
          `Nach Ber\xFCcksichtigung dieser Massnahmen betr\xE4gt die dimensionsrelevante Heizlast `,
          el("strong", {}, `${r.wert.toFixed(2)} kW`),
          ` (Reduktion gegen\xFCber Ist-Zustand gem\xE4ss anerkannten Erfahrungswerten FWS M3 \xA76).`
        )
      ));
    }
    body._recompute = recompute;
    setTimeout(recompute, 0);
    return body;
  }

  // js/modules/m5-warmwasser.js
  function renderM5(state2, onChange) {
    const s = state2.m5 ||= {
      aktiv: true,
      // WW via Heizungs-WP berechnen?
      methode: "personen",
      // personen | direkt | messung
      // (a) Personen-Methode
      einheiten: [{ anf: 150, vwuiId: 0, vwui: WW_STANDARDS[0].vwu, npAuto: true, npManuell: "" }],
      // (b) direkt
      vwuDirekt: "",
      // (c) Messwert
      qnwwMess: "",
      // Verluste
      verluste: {
        speicher: 10,
        zirk: 0,
        ausstoss: 15,
        speicherMethode: "prozent",
        zirkMethode: "keine"
      }
    };
    const body = el("div", {});
    const aktivRow = el(
      "div",
      { class: "row", style: { marginBottom: "14px" } },
      el(
        "label",
        { class: "field" },
        el("span", {}, "Warmwasserbereitung \xFCber Heizungs-WP?"),
        el(
          "select",
          { onchange: (e) => {
            s.aktiv = e.target.value === "true";
            render();
          } },
          el("option", { value: "true" }, "ja \u2013 Qw-Zuschlag rechnen"),
          el("option", { value: "false" }, "nein \u2013 separat (WP-Boiler / Elektro)")
        )
      )
    );
    aktivRow.querySelector("select").value = String(s.aktiv);
    body.appendChild(aktivRow);
    const content = el("div", {});
    body.appendChild(content);
    const tabs = el("div", { class: "tabs" });
    const panels = el("div", {});
    const methoden = [
      { id: "personen", label: "Aus Personen / Wohnfl\xE4chen" },
      { id: "direkt", label: "V [l/d] direkt" },
      { id: "messung", label: "Messwert [kWh/a]" }
    ];
    methoden.forEach((m) => {
      const btn = el("button", {
        class: s.methode === m.id ? "active" : "",
        onclick: () => {
          s.methode = m.id;
          switchTab();
          recompute();
        }
      }, m.label);
      tabs.appendChild(btn);
      panels.appendChild(el("div", { class: "tab-panel" + (s.methode === m.id ? " active" : ""), "data-tab": m.id }));
    });
    function switchTab() {
      tabs.querySelectorAll("button").forEach((b, i) => b.classList.toggle("active", methoden[i].id === s.methode));
      panels.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.dataset.tab === s.methode));
    }
    content.appendChild(tabs);
    content.appendChild(panels);
    const panelA = panels.querySelector('[data-tab="personen"]');
    const listA = el("div", { class: "dyn-list" });
    const addBtn = el("button", { class: "dyn-add", onclick: () => {
      s.einheiten.push({ anf: 100, vwuiId: 0, vwui: WW_STANDARDS[0].vwu, npAuto: true, npManuell: "" });
      renderEinheiten();
      recompute();
    } }, "+ Wohneinheit hinzuf\xFCgen");
    const totalRow = el("div", { style: { marginTop: "8px", fontSize: "12px", color: "var(--mid-gray)" } });
    function renderEinheiten() {
      listA.innerHTML = "";
      s.einheiten.forEach((e, idx) => {
        const np = e.npAuto ? personenbelegung(parseFloat(e.anf) || 0).wert : parseFloat(e.npManuell) || 0;
        const v = np * parseFloat(e.vwui);
        const item = el(
          "div",
          { class: "dyn-item" },
          el(
            "div",
            { class: "inner" },
            el(
              "label",
              { class: "field" },
              el("span", {}, `Einheit ${idx + 1} \xB7 Wohnfl\xE4che ANF`),
              el(
                "div",
                { class: "input-group" },
                el("input", {
                  type: "number",
                  value: e.anf,
                  min: "10",
                  oninput: (ev) => {
                    e.anf = parseFloat(ev.target.value) || 0;
                    renderEinheiten();
                    recompute();
                  }
                }),
                el("span", { class: "unit" }, "m\xB2")
              )
            ),
            el(
              "label",
              { class: "field" },
              el("span", {}, "Standard (l/P\xB7Tag)"),
              el(
                "select",
                { onchange: (ev) => {
                  e.vwuiId = parseInt(ev.target.value);
                  e.vwui = WW_STANDARDS[e.vwuiId].vwu;
                  renderEinheiten();
                  recompute();
                } },
                ...WW_STANDARDS.map((w, i) => el(
                  "option",
                  { value: i, ...i === e.vwuiId ? { selected: "selected" } : {} },
                  `${w.label} (${w.vwu} l)`
                ))
              )
            ),
            el(
              "label",
              { class: "field" },
              el(
                "span",
                {},
                "Personen np",
                el("small", {}, e.npAuto ? " (auto aus ANF)" : " (manuell)")
              ),
              el(
                "div",
                { style: { display: "flex", gap: "6px", alignItems: "center" } },
                el("input", {
                  type: "number",
                  value: e.npAuto ? np.toFixed(2) : e.npManuell,
                  readonly: e.npAuto ? true : null,
                  step: "0.1",
                  oninput: (ev) => {
                    e.npManuell = parseFloat(ev.target.value) || 0;
                    recompute();
                  }
                }),
                el(
                  "button",
                  {
                    class: "ghost",
                    style: { padding: "4px 8px", fontSize: "11px" },
                    onclick: () => {
                      e.npAuto = !e.npAuto;
                      if (!e.npAuto && !e.npManuell) e.npManuell = np.toFixed(2);
                      renderEinheiten();
                      recompute();
                    }
                  },
                  e.npAuto ? "manuell" : "auto"
                )
              )
            ),
            el(
              "div",
              { class: "field", style: { fontSize: "12px", color: "var(--mid-gray)", justifyContent: "flex-end" } },
              el("span", {}, `\u2192 ${v.toFixed(1)} l/Tag`)
            )
          ),
          s.einheiten.length > 1 ? el("button", { class: "dyn-item-remove", onclick: () => {
            s.einheiten.splice(idx, 1);
            renderEinheiten();
            recompute();
          } }, "\xD7") : null
        );
        listA.appendChild(item);
      });
    }
    panelA.appendChild(el(
      "div",
      { style: { fontSize: "12px", color: "var(--mid-gray)", marginBottom: "8px" } },
      "Formel SIA 385/2: np = 3.3 \u2212 2 / (1 + (ANF/100)\xB3). np kann manuell \xFCberschrieben werden (z. B. bei bekannter Belegung)."
    ));
    panelA.appendChild(listA);
    panelA.appendChild(addBtn);
    panelA.appendChild(totalRow);
    renderEinheiten();
    const panelB = panels.querySelector('[data-tab="direkt"]');
    panelB.appendChild(el(
      "div",
      { class: "row" },
      el(
        "label",
        { class: "field" },
        el("span", {}, "Warmwasserverbrauch VW,u"),
        el(
          "div",
          { class: "input-group" },
          el("input", {
            type: "number",
            value: s.vwuDirekt,
            placeholder: "z. B. 160",
            oninput: (e) => {
              s.vwuDirekt = parseFloat(e.target.value) || "";
              recompute();
            }
          }),
          el("span", { class: "unit" }, "l/Tag")
        )
      )
    ));
    const panelC = panels.querySelector('[data-tab="messung"]');
    panelC.appendChild(el(
      "div",
      { class: "row" },
      el(
        "label",
        { class: "field" },
        el("span", {}, "Qn,WW Messwert"),
        el(
          "div",
          { class: "input-group" },
          el("input", {
            type: "number",
            value: s.qnwwMess,
            placeholder: "z. B. 20000",
            oninput: (e) => {
              s.qnwwMess = parseFloat(e.target.value) || "";
              recompute();
            }
          }),
          el("span", { class: "unit" }, "kWh/a")
        )
      )
    ));
    const verlBlock = el(
      "div",
      { style: { marginTop: "18px", paddingTop: "14px", borderTop: "1px solid var(--border)" } },
      el("div", { style: { fontSize: "13px", fontWeight: "500", color: "var(--navy)", marginBottom: "10px" } }, "Verluste")
    );
    verlBlock.appendChild(el(
      "div",
      { class: "row row-3" },
      el(
        "label",
        { class: "field" },
        el("span", {}, "Speicher-Verluste"),
        el(
          "div",
          { class: "input-group" },
          el("input", {
            type: "number",
            value: s.verluste.speicher,
            step: "1",
            oninput: (e) => {
              s.verluste.speicher = parseFloat(e.target.value) || 0;
              recompute();
            }
          }),
          el("span", { class: "unit" }, "% von QW,u")
        )
      ),
      el(
        "label",
        { class: "field" },
        el("span", {}, "Zirkulations-Verluste"),
        el(
          "div",
          { class: "input-group" },
          el("input", {
            type: "number",
            value: s.verluste.zirk,
            step: "1",
            oninput: (e) => {
              s.verluste.zirk = parseFloat(e.target.value) || 0;
              recompute();
            }
          }),
          el("span", { class: "unit" }, "% von QW,u")
        )
      ),
      el(
        "label",
        { class: "field" },
        el("span", {}, "Ausstoss-Verluste"),
        el(
          "div",
          { class: "input-group" },
          el("input", {
            type: "number",
            value: s.verluste.ausstoss,
            step: "1",
            oninput: (e) => {
              s.verluste.ausstoss = parseFloat(e.target.value) || 0;
              recompute();
            }
          }),
          el("span", { class: "unit" }, "% von QW,u")
        )
      )
    ));
    verlBlock.appendChild(el(
      "div",
      { style: { marginTop: "6px", fontSize: "11px", color: "var(--mid-gray)" } },
      "Richtwerte FWS M3 \xA78: Speicher 8\u201310 %, Zirkulation 10\u201315 % (L\xE4nge unbekannt) oder 0 (keine Warmhaltung / Elektroheizband = nicht rechnen), Ausstoss 15\u201320 %."
    ));
    content.appendChild(verlBlock);
    const mount = el("div", { id: "m5-result", style: { marginTop: "16px" } });
    body.appendChild(mount);
    function render() {
      content.style.display = s.aktiv ? "" : "none";
      mount.innerHTML = "";
      if (!s.aktiv) {
        mount.appendChild(el(
          "div",
          { style: { color: "var(--mid-gray)", fontSize: "13px", marginTop: "8px" } },
          "Warmwasser wird separat erzeugt (z. B. WP-Boiler oder Elektro). Kein Qw-Zuschlag."
        ));
        state2._lastQw = null;
        state2._lastWW = null;
        onChange?.();
        return;
      }
      recompute();
    }
    function recompute() {
      if (!s.aktiv) {
        state2._lastQw = null;
        state2._lastWW = null;
        return;
      }
      let vwu = null;
      let qwuRes = null;
      let qnwwRes = null;
      let qwwRes = null;
      if (s.methode === "personen") {
        vwu = s.einheiten.reduce((sum, e) => {
          const np = e.npAuto ? personenbelegung(parseFloat(e.anf) || 0).wert : parseFloat(e.npManuell) || 0;
          return sum + np * parseFloat(e.vwui || 0);
        }, 0);
        totalRow.textContent = vwu > 0 ? `\u03A3 VW,u = ${vwu.toFixed(1)} l/Tag` : "";
      } else if (s.methode === "direkt" && parseFloat(s.vwuDirekt) > 0) {
        vwu = parseFloat(s.vwuDirekt);
      } else if (s.methode === "messung" && parseFloat(s.qnwwMess) > 0) {
        qnwwRes = {
          wert: parseFloat(s.qnwwMess),
          einheit: "kWh/a",
          steps: [{ formel: "Messwert Qn,WW", wert: `${s.qnwwMess} kWh/a` }]
        };
      }
      if (vwu > 0) {
        qwuRes = qwuTag(vwu);
        qnwwRes = qnwwJahr(vwu, {
          speicher: s.verluste.speicher / 100,
          zirk: s.verluste.zirk / 100,
          ausstoss: s.verluste.ausstoss / 100
        });
        qwwRes = qwwTag(qwuRes.wert, {
          speicherProzent: s.verluste.speicher,
          zirkProzent: s.verluste.zirk,
          ausstossProzent: s.verluste.ausstoss
        });
      } else if (qnwwRes) {
        const qwwTagWert = qnwwRes.wert / 365;
        qwwRes = {
          wert: qwwTagWert,
          einheit: "kWh/d",
          steps: [{ formel: "QWW = Qn,WW / 365", wert: `${qnwwRes.wert.toFixed(0)} / 365 = ${qwwTagWert.toFixed(2)} kWh/d` }]
        };
      }
      let qwRes = null;
      const qhl = state2._last?.qhl;
      if (qhl && qwwRes) qwRes = qw(qhl, qwwRes.wert);
      mount.innerHTML = "";
      if (qwuRes) mount.appendChild(stepsCard("Nutzenergie Warmwasser QW,u", qwuRes, "kWh/d", 2));
      if (qnwwRes && s.methode !== "messung") mount.appendChild(stepsCard("Qn,WW (Jahresenergie inkl. Verluste)", qnwwRes, "kWh/a", 0));
      if (qwwRes) mount.appendChild(stepsCard("QWW gesamt pro Tag", qwwRes, "kWh/d", 2));
      if (qwRes) {
        mount.appendChild(el(
          "div",
          { class: "result-card", style: { marginTop: "10px" } },
          el(
            "div",
            {},
            el("div", { class: "label" }, "Leistungszuschlag Warmwasser Qw"),
            el("div", { class: "value" }, `${qwRes.wert.toFixed(2)} kW`)
          )
        ));
        mount.appendChild(renderStepsDetails(qwRes));
      } else if (qwwRes && !qhl) {
        mount.appendChild(el("div", { class: "hinweis" }, "Qhl aus M2 erforderlich, um Qw zu berechnen."));
      }
      state2._lastWW = { vwu, qwuTag: qwuRes?.wert, qwwTag: qwwRes?.wert, qnwwJahr: qnwwRes?.wert };
      state2._lastQw = qwRes ? { qw: qwRes.wert, td: qwRes.td } : null;
      onChange?.();
    }
    function stepsCard(label, res, _unit, decimals = 2) {
      const wrap = el("div", { style: { marginBottom: "10px" } });
      wrap.appendChild(el("div", { style: { fontSize: "12px", color: "var(--mid-gray)", marginBottom: "4px" } }, label));
      wrap.appendChild(el(
        "div",
        { style: { fontSize: "15px", color: "var(--navy)", fontWeight: 500 } },
        `${res.wert.toLocaleString("de-CH", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${res.einheit}`
      ));
      wrap.appendChild(renderStepsDetails(res));
      return wrap;
    }
    function renderStepsDetails(res) {
      if (!res.steps) return null;
      return el(
        "details",
        { class: "steps" },
        el("summary", {}, "Rechenweg"),
        el(
          "div",
          { class: "steps-list" },
          ...res.steps.map((st) => el(
            "div",
            { class: "step" },
            el("span", { class: "left" }, st.formel),
            el("span", { class: "right" }, st.wert || "")
          ))
        )
      );
    }
    body._recompute = recompute;
    setTimeout(render, 0);
    return body;
  }

  // js/modules/m6-zuschlaege.js
  function renderM6(state2, onChange) {
    const s = state2.m6 ||= { toff: 0, qas: 0 };
    const body = el("div", {});
    body.appendChild(el(
      "div",
      { class: "row" },
      el(
        "label",
        { class: "field" },
        el("span", {}, "Sperrzeit toff (EVU)"),
        el(
          "div",
          { class: "input-group" },
          el("input", {
            type: "number",
            value: s.toff,
            step: "0.5",
            min: "0",
            max: "12",
            oninput: (e) => {
              s.toff = parseFloat(e.target.value) || 0;
              recompute();
              onChange?.();
            }
          }),
          el("span", { class: "unit" }, "h/Tag")
        )
      ),
      el(
        "label",
        { class: "field" },
        el("span", {}, "Qas \u2013 verbundene Systeme", el("small", {}, " (L\xFCftung, Pool)")),
        el(
          "div",
          { class: "input-group" },
          el("input", {
            type: "number",
            value: s.qas,
            step: "0.1",
            min: "0",
            oninput: (e) => {
              s.qas = parseFloat(e.target.value) || 0;
              recompute();
              onChange?.();
            }
          }),
          el("span", { class: "unit" }, "kW")
        )
      )
    ));
    const mount = el("div", { id: "m6-result" });
    body.appendChild(mount);
    function recompute() {
      mount.innerHTML = "";
      const qhl = state2._last?.qhl;
      if (!qhl) {
        mount.appendChild(el(
          "div",
          { style: { color: "var(--mid-gray)", fontSize: "13px", marginTop: "10px" } },
          "Qhl aus M2 erforderlich."
        ));
        state2._lastZuschlaege = { qoff: 0, qas: parseFloat(s.qas) || 0 };
        return;
      }
      const r = qoff(qhl, parseFloat(s.toff) || 0);
      mount.appendChild(el(
        "div",
        { class: "result-card" },
        el(
          "div",
          {},
          el("div", { class: "label" }, "Qoff (Sperrzeitzuschlag)"),
          el("div", { class: "value" }, `${r.wert.toFixed(2)} kW`)
        )
      ));
      mount.appendChild(el(
        "details",
        { class: "steps" },
        el("summary", {}, "Rechenweg"),
        el(
          "div",
          { class: "steps-list" },
          ...r.steps.map((st) => el(
            "div",
            { class: "step" },
            el("span", { class: "left" }, st.formel),
            el("span", { class: "right" }, st.wert || "")
          ))
        )
      ));
      state2._lastZuschlaege = { qoff: r.wert, qas: parseFloat(s.qas) || 0 };
    }
    body._recompute = recompute;
    setTimeout(recompute, 0);
    return body;
  }

  // js/modules/m7-wp-auslegung.js
  function renderM7(state2) {
    const s = state2.m7 ||= { qhWPDatenblatt: "", inverter: true };
    const body = el("div", {});
    body.appendChild(el(
      "div",
      { class: "row" },
      el(
        "label",
        { class: "field" },
        el("span", {}, "WP-Typ"),
        el(
          "select",
          { onchange: (e) => {
            s.inverter = e.target.value === "inverter";
            render();
          } },
          el("option", { value: "inverter", ...s.inverter ? { selected: "selected" } : {} }, "Inverter"),
          el("option", { value: "einstufig", ...!s.inverter ? { selected: "selected" } : {} }, "1-stufig / On-Off")
        )
      ),
      el(
        "label",
        { class: "field" },
        el("span", {}, "Qh,WP Datenblatt (am Auslegepunkt)"),
        el(
          "div",
          { class: "input-group" },
          el("input", {
            type: "number",
            value: s.qhWPDatenblatt,
            step: "0.1",
            oninput: (e) => {
              s.qhWPDatenblatt = parseFloat(e.target.value) || "";
              render();
            }
          }),
          el("span", { class: "unit" }, "kW")
        )
      )
    ));
    const mount = el("div", { id: "m7-result" });
    body.appendChild(mount);
    function render() {
      mount.innerHTML = "";
      const qhl = state2._last?.qhl;
      const qoffV = state2._lastZuschlaege?.qoff || 0;
      const qas = state2._lastZuschlaege?.qas || 0;
      const qw2 = state2._lastQw?.qw || 0;
      if (!qhl) {
        mount.appendChild(el(
          "div",
          { style: { color: "var(--mid-gray)", fontSize: "13px" } },
          "Qhl aus M2 erforderlich."
        ));
        return;
      }
      const qh = qhGesamt(qhl, qw2, qoffV, qas);
      state2._lastQh = { qh: qh.wert };
      mount.appendChild(el(
        "div",
        { class: "result-card highlight" },
        el(
          "div",
          {},
          el("div", { class: "label" }, "W\xE4rmeerzeugerleistung Qh"),
          el("div", { class: "value" }, `${qh.wert.toFixed(2)} kW`)
        )
      ));
      mount.appendChild(el(
        "details",
        { class: "steps" },
        el("summary", {}, "Rechenweg"),
        el(
          "div",
          { class: "steps-list" },
          ...qh.steps.map((st) => el(
            "div",
            { class: "step" },
            el("span", { class: "left" }, st.formel),
            el("span", { class: "right" }, st.wert || "")
          ))
        )
      ));
      if (s.qhWPDatenblatt && s.inverter) {
        const check = inverterCheck(qh.wert, parseFloat(s.qhWPDatenblatt));
        mount.appendChild(el(
          "div",
          { style: { marginTop: "12px" } },
          el(
            "div",
            { class: "result-card" },
            el(
              "div",
              {},
              el("div", { class: "label" }, "Inverter-Check (Qh \u2265 0.75 \xB7 QWP)"),
              el("div", { class: "value" }, `${(check.wert * 100).toFixed(1)} %`)
            ),
            el("span", { class: `ampel ${check.ok ? "gruen" : "rot"}` }, check.ok ? "OK" : "zu gross")
          ),
          el(
            "details",
            { class: "steps" },
            el("summary", {}, "Rechenweg"),
            el(
              "div",
              { class: "steps-list" },
              ...check.steps.map((st) => el(
                "div",
                { class: "step" },
                el("span", { class: "left" }, st.formel),
                el("span", { class: "right" }, st.wert || "")
              ))
            )
          )
        ));
      }
    }
    body._recompute = render;
    setTimeout(render, 0);
    return body;
  }

  // js/modules/m8-speicher.js
  function renderM8(state2) {
    const s = state2.m8 ||= {
      tStoAus: 60,
      tStoEin: PHYSIK.t_kaltwasser,
      fstoId: "keine_zonen",
      wtId: "innen_mitWH",
      wpQuelleKw: ""
      // manuell überschreiben (sonst Qh aus M7-State)
    };
    const body = el("div", {});
    body.appendChild(el(
      "div",
      { class: "row row-3" },
      el(
        "label",
        { class: "field" },
        el("span", {}, "Speicheraustrittstemperatur TSto,aus"),
        el(
          "div",
          { class: "input-group" },
          el("input", {
            type: "number",
            value: s.tStoAus,
            step: "1",
            oninput: (e) => {
              s.tStoAus = parseFloat(e.target.value) || 60;
              recompute();
            }
          }),
          el("span", { class: "unit" }, "\xB0C")
        )
      ),
      el(
        "label",
        { class: "field" },
        el("span", {}, "Kaltwassertemperatur TSto,ein"),
        el(
          "div",
          { class: "input-group" },
          el("input", {
            type: "number",
            value: s.tStoEin,
            step: "1",
            oninput: (e) => {
              s.tStoEin = parseFloat(e.target.value) || 10;
              recompute();
            }
          }),
          el("span", { class: "unit" }, "\xB0C")
        )
      ),
      el(
        "label",
        { class: "field" },
        el("span", {}, "Speicher-Konfiguration fsto"),
        el(
          "select",
          { onchange: (e) => {
            s.fstoId = e.target.value;
            recompute();
          } },
          ...FSTO.map((f) => el(
            "option",
            { value: f.id, ...f.id === s.fstoId ? { selected: "selected" } : {} },
            `${f.label} (${f.faktor})`
          ))
        )
      )
    ));
    body.appendChild(el(
      "div",
      { class: "row" },
      el(
        "label",
        { class: "field" },
        el("span", {}, "W\xE4rmetauscher-System (\xA711)"),
        el(
          "select",
          { onchange: (e) => {
            s.wtId = e.target.value;
            recompute();
          } },
          ...WT_FAUSTFORMEL.map((w) => el(
            "option",
            { value: w.id, ...w.id === s.wtId ? { selected: "selected" } : {} },
            `${w.label} \u2014 ${w.mPerKw} m\xB2/kW`
          ))
        )
      ),
      el(
        "label",
        { class: "field" },
        el("span", {}, "WP-Heizleistung (Basis WT-Fl\xE4che)"),
        el(
          "div",
          { class: "input-group" },
          el("input", {
            type: "number",
            value: s.wpQuelleKw,
            placeholder: "leer = Qh aus M7",
            step: "0.1",
            oninput: (e) => {
              s.wpQuelleKw = e.target.value === "" ? "" : parseFloat(e.target.value);
              recompute();
            }
          }),
          el("span", { class: "unit" }, "kW")
        )
      )
    ));
    const mount = el("div", { id: "m8-result", style: { marginTop: "14px" } });
    body.appendChild(mount);
    function recompute() {
      mount.innerHTML = "";
      const qww = state2._lastWW?.qwwTag;
      const vwu = state2._lastWW?.vwu;
      const qhWP = s.wpQuelleKw !== "" && s.wpQuelleKw > 0 ? parseFloat(s.wpQuelleKw) : state2._lastQh?.qh || state2._last?.qhl;
      if (!qww) {
        mount.appendChild(el(
          "div",
          { style: { color: "var(--mid-gray)", fontSize: "13px" } },
          "QWW aus M5 erforderlich \u2013 Warmwasser zuerst erfassen."
        ));
        return;
      }
      const volRes = speichervolumen(qww, s.tStoAus, s.tStoEin);
      const vStoCont = volRes.wert;
      const fstoEntry = FSTO.find((f) => f.id === s.fstoId) || FSTO[2];
      const vSto1 = vStoCont * fstoEntry.faktor;
      const verlustKwhTag = speicherverlustAusVolumen(vSto1);
      const spitzeMin = vwu ? vwu * 0.09 : null;
      const spitzeMax = vwu ? vwu * 0.1 : null;
      const wtEntry = WT_FAUSTFORMEL.find((w) => w.id === s.wtId) || WT_FAUSTFORMEL[0];
      const wtFlaeche = qhWP ? qhWP * wtEntry.mPerKw : null;
      mount.appendChild(el(
        "div",
        { class: "result-card highlight" },
        el(
          "div",
          {},
          el("div", { class: "label" }, `Empfohlenes Speichervolumen VW,Sto (\xD7${fstoEntry.faktor})`),
          el("div", { class: "value" }, `${vSto1.toFixed(0)} l`)
        )
      ));
      mount.appendChild(el(
        "details",
        { class: "steps" },
        el("summary", {}, "Rechenweg"),
        el(
          "div",
          { class: "steps-list" },
          el(
            "div",
            { class: "step" },
            el("span", { class: "left" }, "VW,Sto,cont = QWW / (cp \xB7 \u0394T / 3600)"),
            el(
              "span",
              { class: "right" },
              `${qww.toFixed(2)} / (4.2 \xB7 ${s.tStoAus - s.tStoEin} / 3600) = ${vStoCont.toFixed(0)} l`
            )
          ),
          el(
            "div",
            { class: "step" },
            el("span", { class: "left" }, `\xD7 fsto (${fstoEntry.label})`),
            el("span", { class: "right" }, `\xD7 ${fstoEntry.faktor} = ${vSto1.toFixed(0)} l`)
          )
        )
      ));
      if (spitzeMin && spitzeMax) {
        mount.appendChild(el(
          "div",
          { class: "result-card", style: { marginTop: "10px" } },
          el(
            "div",
            {},
            el("div", { class: "label" }, "Spitzendeckung Stundenspitze (\xA710.3, ca. 9\u201310 % VW,u)"),
            el("div", { class: "value" }, `${spitzeMin.toFixed(0)} \u2013 ${spitzeMax.toFixed(0)} l`)
          )
        ));
      }
      if (verlustKwhTag != null) {
        mount.appendChild(el(
          "div",
          { class: "result-card", style: { marginTop: "10px" } },
          el(
            "div",
            {},
            el("div", { class: "label" }, "Speicherverluste laut Diagramm (\xA78.2)"),
            el("div", { class: "value" }, `\u2248 ${verlustKwhTag.toFixed(2)} kWh/d`)
          )
        ));
      }
      if (wtFlaeche) {
        mount.appendChild(el(
          "div",
          { class: "result-card", style: { marginTop: "10px" } },
          el(
            "div",
            {},
            el("div", { class: "label" }, `WT-Fl\xE4che Faustformel (\xA711.2 \xB7 ${wtEntry.mPerKw} m\xB2/kW)`),
            el("div", { class: "value" }, `${wtFlaeche.toFixed(2)} m\xB2`)
          ),
          el("span", { class: "ampel grau" }, `${qhWP.toFixed(1)} kW`)
        ));
        mount.appendChild(el(
          "details",
          { class: "steps" },
          el("summary", {}, "Rechenweg"),
          el(
            "div",
            { class: "steps-list" },
            el(
              "div",
              { class: "step" },
              el("span", { class: "left" }, "A = QhWP \xB7 f"),
              el("span", { class: "right" }, `${qhWP.toFixed(2)} \xB7 ${wtEntry.mPerKw} = ${wtFlaeche.toFixed(2)} m\xB2`)
            )
          )
        ));
      } else {
        mount.appendChild(el(
          "div",
          { class: "hinweis" },
          'F\xFCr WT-Fl\xE4che: Qh aus M7 n\xF6tig oder manuell unter "WP-Heizleistung" eintragen.'
        ));
      }
      mount.appendChild(el(
        "div",
        { class: "hinweis" },
        "Empfehlungen (\xA710.4): EFH \xFCblich ~400 l bei 60 \xB0C \xB7 MFH 2\u20133 Ladezyklen/Tag \xB7 PV-Eigenoptimierung: Speicher NICHT vergr\xF6ssern (Hygiene/Effizienz)."
      ));
    }
    body._recompute = recompute;
    setTimeout(recompute, 0);
    return body;
  }

  // js/modules/m9-heizpuffer.js
  function renderM9(state2) {
    const s = state2.m9 ||= {
      wpTyp: "lw_abtau",
      err: true,
      inverter: true,
      qwpManuell: "",
      // leer = Qh aus M7
      toffManuell: "",
      // leer = toff aus M6
      abtauMin: HEIZPUFFER.abtauZeitMin,
      abtauDeltaT: HEIZPUFFER.abtauDeltaT,
      taktMin: HEIZPUFFER.taktZeitMin,
      taktDeltaT: HEIZPUFFER.taktDeltaT,
      errMin: HEIZPUFFER.errBand[0],
      errMax: HEIZPUFFER.errBand[1]
    };
    const body = el("div", {});
    body.appendChild(el(
      "div",
      {
        style: {
          padding: "10px 12px",
          background: "#fff8e1",
          border: "1px solid #f0d68a",
          borderRadius: "6px",
          fontSize: "12px",
          color: "#5a4a00",
          marginBottom: "14px"
        }
      },
      "Berechnung nicht aus FWS M3 (dort nur qualitativ behandelt). Basis: SWKI BT 102-01, VDI 4645, WP-Hersteller\xADhandb\xFCcher. ",
      el("strong", {}, "Herstellervorgabe der konkret eingesetzten WP ist f\xFCr die Gew\xE4hrleistung bindend \u2014 immer pr\xFCfen.")
    ));
    body.appendChild(el(
      "div",
      { class: "row row-3" },
      el(
        "label",
        { class: "field" },
        el("span", {}, "WP-Typ"),
        el(
          "select",
          { onchange: (e) => {
            s.wpTyp = e.target.value;
            recompute();
          } },
          ...Object.entries(HEIZPUFFER.typen).map(([id, t]) => el("option", { value: id, ...id === s.wpTyp ? { selected: "selected" } : {} }, t.label))
        )
      ),
      el(
        "label",
        { class: "field" },
        el("span", {}, "Einzelraumregulierung (ERR)"),
        el(
          "select",
          { onchange: (e) => {
            s.err = e.target.value === "true";
            recompute();
          } },
          el("option", { value: "false" }, "nein \u2013 zentrale Regelung / FBH ohne Stellantriebe"),
          el("option", { value: "true" }, "ja \u2013 Thermostatventile / FBH-Stellantriebe")
        )
      ),
      el(
        "label",
        { class: "field" },
        el("span", {}, "WP-Regelverhalten"),
        el(
          "select",
          { onchange: (e) => {
            s.inverter = e.target.value === "inverter";
            recompute();
          } },
          el("option", { value: "inverter" }, "Inverter (moduliert)"),
          el("option", { value: "onoff" }, "On/Off \u2013 1-stufig")
        )
      )
    ));
    body.querySelector("select:nth-of-type(1)");
    body.querySelectorAll("select").forEach((sel) => {
    });
    const [selTyp, selErr, selInv] = body.querySelectorAll(".row.row-3 select");
    selErr.value = String(s.err);
    selInv.value = s.inverter ? "inverter" : "onoff";
    body.appendChild(el(
      "div",
      { class: "row row-3" },
      el(
        "label",
        { class: "field" },
        el("span", {}, "Q_WP Heizleistung"),
        el(
          "div",
          { class: "input-group" },
          el("input", {
            type: "number",
            value: s.qwpManuell,
            placeholder: "leer = Qh aus M7",
            step: "0.1",
            oninput: (e) => {
              s.qwpManuell = e.target.value === "" ? "" : parseFloat(e.target.value);
              recompute();
            }
          }),
          el("span", { class: "unit" }, "kW")
        )
      ),
      el(
        "label",
        { class: "field" },
        el("span", {}, "Sperrzeit toff"),
        el(
          "div",
          { class: "input-group" },
          el("input", {
            type: "number",
            value: s.toffManuell,
            placeholder: "leer = aus M6",
            step: "0.5",
            oninput: (e) => {
              s.toffManuell = e.target.value === "" ? "" : parseFloat(e.target.value);
              recompute();
            }
          }),
          el("span", { class: "unit" }, "h/d")
        )
      ),
      el(
        "label",
        { class: "field" },
        el("span", {}, "ERR-Band (Herstellerempfehlung)"),
        el(
          "div",
          { style: { display: "flex", gap: "6px", alignItems: "center" } },
          el("input", {
            type: "number",
            value: s.errMin,
            step: "1",
            style: { width: "60px" },
            oninput: (e) => {
              s.errMin = parseFloat(e.target.value) || 15;
              recompute();
            }
          }),
          el("span", {}, "\u2013"),
          el("input", {
            type: "number",
            value: s.errMax,
            step: "1",
            style: { width: "60px" },
            oninput: (e) => {
              s.errMax = parseFloat(e.target.value) || 25;
              recompute();
            }
          }),
          el("span", { class: "unit" }, "l/kW")
        )
      )
    ));
    body.appendChild(el(
      "details",
      { class: "steps", style: { marginTop: "8px" } },
      el("summary", {}, "Feintuning (Abtau-/Taktparameter)"),
      el(
        "div",
        { class: "row row-3", style: { marginTop: "10px" } },
        el(
          "label",
          { class: "field" },
          el("span", {}, "Abtaudauer"),
          el(
            "div",
            { class: "input-group" },
            el("input", {
              type: "number",
              value: s.abtauMin,
              step: "1",
              oninput: (e) => {
                s.abtauMin = parseFloat(e.target.value) || 5;
                recompute();
              }
            }),
            el("span", { class: "unit" }, "min")
          )
        ),
        el(
          "label",
          { class: "field" },
          el("span", {}, "Abtau \u0394T zul\xE4ssig"),
          el(
            "div",
            { class: "input-group" },
            el("input", {
              type: "number",
              value: s.abtauDeltaT,
              step: "0.5",
              oninput: (e) => {
                s.abtauDeltaT = parseFloat(e.target.value) || 5;
                recompute();
              }
            }),
            el("span", { class: "unit" }, "K")
          )
        ),
        el(
          "label",
          { class: "field" },
          el("span", {}, "Takt \u0394T"),
          el(
            "div",
            { class: "input-group" },
            el("input", {
              type: "number",
              value: s.taktDeltaT,
              step: "0.5",
              oninput: (e) => {
                s.taktDeltaT = parseFloat(e.target.value) || 5;
                recompute();
              }
            }),
            el("span", { class: "unit" }, "K")
          )
        )
      ),
      el(
        "div",
        { class: "row" },
        el(
          "label",
          { class: "field" },
          el("span", {}, "Kompressor-Mindestlaufzeit"),
          el(
            "div",
            { class: "input-group" },
            el("input", {
              type: "number",
              value: s.taktMin,
              step: "1",
              oninput: (e) => {
                s.taktMin = parseFloat(e.target.value) || 6;
                recompute();
              }
            }),
            el("span", { class: "unit" }, "min")
          )
        )
      )
    ));
    const mount = el("div", { id: "m9-result", style: { marginTop: "16px" } });
    body.appendChild(mount);
    function recompute() {
      mount.innerHTML = "";
      const qwp = s.qwpManuell !== "" && s.qwpManuell > 0 ? parseFloat(s.qwpManuell) : state2._lastQh?.qh;
      const toff = s.toffManuell !== "" && s.toffManuell !== null ? parseFloat(s.toffManuell) : state2.m6?.toff ?? 0;
      if (!qwp) {
        mount.appendChild(el(
          "div",
          { style: { color: "var(--mid-gray)", fontSize: "13px" } },
          "Qh aus M7 erforderlich \u2013 WP-Auslegung zuerst berechnen."
        ));
        return;
      }
      const typ = HEIZPUFFER.typen[s.wpTyp];
      const kandidaten = [];
      if (typ.braucht.includes("abtau")) {
        const r = puffer_abtau(qwp, { tMin: s.abtauMin, deltaT: s.abtauDeltaT });
        kandidaten.push({ label: "Abtauung (Prozessumkehr)", res: r, wert: r.wert });
      }
      if (typ.braucht.includes("takt") && !s.inverter) {
        const r = puffer_takt(qwp, { tMin: s.taktMin, deltaT: s.taktDeltaT });
        kandidaten.push({ label: "Taktschutz (On/Off-Mindestlaufzeit)", res: r, wert: r.wert });
      }
      if (typ.braucht.includes("err") && s.err) {
        const r = puffer_err(qwp, [s.errMin, s.errMax]);
        kandidaten.push({ label: "ERR-Entkopplung (Parallelspeicher)", res: r, wert: r.wert });
      }
      const [sockMin, sockMax] = typ.empfehlung;
      kandidaten.push({
        label: `Herstellerkonsens ${typ.label}`,
        res: { wert: qwp * sockMax, einheit: "l", steps: [
          { formel: `${typ.label}: ${sockMin}\u2013${sockMax} l/kW`, wert: `${(qwp * sockMin).toFixed(0)}\u2026${(qwp * sockMax).toFixed(0)} l` }
        ] },
        wert: qwp * sockMax,
        bandMin: qwp * sockMin
      });
      const empfehlung = kandidaten.reduce((m, k) => k.wert > m.wert ? k : m, kandidaten[0]);
      const untereGrenze = Math.min(...kandidaten.map((k) => k.bandMin ?? k.wert));
      const obereGrenze = empfehlung.wert;
      mount.appendChild(el(
        "div",
        { class: "result-card highlight" },
        el(
          "div",
          {},
          el("div", { class: "label" }, "Empfohlenes Puffervolumen (Maximum aller Kriterien)"),
          el(
            "div",
            { class: "value" },
            obereGrenze <= untereGrenze ? `${obereGrenze.toFixed(0)} l` : `${untereGrenze.toFixed(0)} \u2013 ${obereGrenze.toFixed(0)} l`
          )
        )
      ));
      mount.appendChild(el(
        "div",
        { style: { fontSize: "12px", color: "var(--mid-gray)", marginTop: "4px" } },
        `Massgebend: ${empfehlung.label}`
      ));
      mount.appendChild(el(
        "div",
        { style: { marginTop: "14px", fontSize: "13px", fontWeight: 500, color: "var(--navy)" } },
        "Einzel-Kriterien"
      ));
      kandidaten.forEach((k) => {
        const card = el(
          "div",
          { class: "result-card", style: { marginTop: "8px" } },
          el(
            "div",
            {},
            el("div", { class: "label" }, k.label),
            el("div", { class: "value" }, `${k.wert.toFixed(0)} l`)
          ),
          k === empfehlung ? el("span", { class: "ampel gruen" }, "massgebend") : el("span", { class: "ampel grau" }, "nicht massgebend")
        );
        mount.appendChild(card);
        if (k.res.steps) {
          mount.appendChild(el(
            "details",
            { class: "steps" },
            el("summary", {}, "Rechenweg"),
            el(
              "div",
              { class: "steps-list" },
              ...k.res.steps.map((st) => el(
                "div",
                { class: "step" },
                el("span", { class: "left" }, st.formel),
                el("span", { class: "right" }, st.wert || "")
              ))
            )
          ));
        }
      });
      if (toff > 0) {
        const rSperr = puffer_sperrzeit(state2._last?.qhl || qwp, toff);
        mount.appendChild(el(
          "div",
          { style: { marginTop: "14px", fontSize: "13px", fontWeight: 500, color: "var(--navy)" } },
          "Sperrzeit-\xDCberbr\xFCckung (informativ)"
        ));
        mount.appendChild(el(
          "div",
          { class: "result-card", style: { marginTop: "8px" } },
          el(
            "div",
            {},
            el("div", { class: "label" }, `Vollst\xE4ndige \xDCberbr\xFCckung ${toff} h @ \u0394T 10 K`),
            el("div", { class: "value" }, `${rSperr.wert.toFixed(0)} l`)
          ),
          el("span", { class: "ampel gelb" }, "meist unrealistisch")
        ));
        mount.appendChild(el(
          "div",
          { class: "hinweis" },
          "In der Praxis wird Sperrzeit selten voll abgepuffert (Volumen zu gross). FWS M3 \xA719 empfiehlt stattdessen: Anlage so auslegen, dass Aussentemperaturzone der Sperrzeiten-Einschr\xE4nkung akzeptiert wird."
        ));
      }
    }
    body._recompute = recompute;
    setTimeout(recompute, 0);
    return body;
  }

  // js/app.js
  var state = {};
  var modules = [];
  function buildApp() {
    const root = $("#app");
    root.innerHTML = "";
    const m1Body = renderM1(state, onStateChange);
    const m2Body = renderM2(state, onStateChange);
    const m4Body = renderM4(state, onStateChange);
    const m3Body = renderM3(state);
    const m5Body = renderM5(state, onStateChange);
    const m6Body = renderM6(state, onStateChange);
    const m7Body = renderM7(state);
    const m8Body = renderM8(state);
    const m9Body = renderM9(state);
    modules = [
      { id: "m1", title: "M1 \xB7 Stammdaten", badge: "Geb\xE4ude", body: m1Body },
      { id: "m2", title: "M2 \xB7 Norm-Heizlast Qhl", badge: "Kernberechnung", body: m2Body },
      { id: "m4", title: "M4 \xB7 Sanierungs-Delta", badge: "\xA76 multiplikativ", body: m4Body },
      { id: "m3", title: "M3 \xB7 Plausibilit\xE4tskontrolle (\xA77)", badge: "W/m\xB2", body: m3Body },
      { id: "m5", title: "M5 \xB7 Warmwasser", badge: "QW,u \xB7 Qw", body: m5Body },
      { id: "m6", title: "M6 \xB7 Leistungszuschl\xE4ge Qoff \xB7 Qas", badge: "Sperrzeit", body: m6Body },
      { id: "m7", title: "M7 \xB7 WP-Auslegung Qh", badge: "Auslegung", body: m7Body },
      { id: "m8", title: "M8 \xB7 WW-Speicher & WT-Fl\xE4che", badge: "\xA710 \xB7 \xA711", body: m8Body },
      { id: "m9", title: "M9 \xB7 Heizungs-Pufferspeicher", badge: "SWKI \xB7 VDI", body: m9Body }
    ];
    modules.forEach((m) => {
      const mod = el(
        "section",
        { class: "module", id: m.id },
        el(
          "div",
          { class: "module-head", onclick: () => mod.classList.toggle("collapsed") },
          el("h2", {}, m.title, el("span", { class: "badge" }, m.badge)),
          el("span", { class: "chev" }, "\u25BE")
        ),
        el("div", { class: "module-body" }, m.body)
      );
      root.appendChild(mod);
    });
  }
  var _cascading = false;
  function onStateChange() {
    if (_cascading) return;
    _cascading = true;
    try {
      $("#m4 .module-body")?.firstChild?._recompute?.();
      $("#m3 .module-body")?.firstChild?._render?.();
      $("#m5 .module-body")?.firstChild?._recompute?.();
      $("#m6 .module-body")?.firstChild?._recompute?.();
      $("#m7 .module-body")?.firstChild?._recompute?.();
      $("#m8 .module-body")?.firstChild?._recompute?.();
      $("#m9 .module-body")?.firstChild?._recompute?.();
    } finally {
      _cascading = false;
    }
  }
  function refreshProjectList() {
    const sel = $("#project-select");
    if (!sel) return;
    const all = listProjects();
    const current = sel.value;
    sel.innerHTML = '<option value="">\u2014 Projekt laden \u2014</option>';
    Object.keys(all).sort().forEach((name) => {
      sel.appendChild(el("option", { value: name }, name));
    });
    if (current && all[current]) sel.value = current;
  }
  function doSave() {
    const name = prompt("Projektname:", state._projectName || "");
    if (!name) return;
    state._projectName = name;
    saveProject(name, { state: { ...state, _projectName: void 0 } });
    refreshProjectList();
    toast(`Projekt "${name}" gespeichert`);
  }
  function doLoad(name) {
    if (!name) return;
    const p = loadProject(name);
    if (!p) return;
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, p.state || {});
    state._projectName = name;
    buildApp();
    toast(`"${name}" geladen`);
  }
  function doDelete() {
    const name = $("#project-select")?.value;
    if (!name) return;
    if (!confirm(`Projekt "${name}" wirklich l\xF6schen?`)) return;
    deleteProject(name);
    refreshProjectList();
    toast("Gel\xF6scht");
  }
  function doExportJson() {
    const name = state._projectName || "heizlast";
    exportJSON({ state, exportedAt: (/* @__PURE__ */ new Date()).toISOString(), version: 1 }, `${name}.json`);
  }
  async function doImportJson(file) {
    try {
      const data = await importJSON(file);
      if (data.state) {
        Object.keys(state).forEach((k) => delete state[k]);
        Object.assign(state, data.state);
        buildApp();
        toast("Import erfolgreich");
      } else toast("Ung\xFCltiges JSON");
    } catch (e) {
      toast("Fehler beim Import");
    }
  }
  function updatePrintMeta() {
    const meta = $("#print-meta");
    if (!meta) return;
    const d = /* @__PURE__ */ new Date();
    const datum = d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
    const proj = state._projectName ? `Projekt: ${state._projectName}<br>` : "";
    meta.innerHTML = `${proj}Datum: ${datum}`;
  }
  function loadLogo() {
    const dataUrl = localStorage.getItem("thermowerk_logo");
    const img = $("#print-logo");
    if (img) img.src = dataUrl || img.getAttribute("data-default") || "";
  }
  function doLogoUpload(file) {
    const r = new FileReader();
    r.onload = () => {
      localStorage.setItem("thermowerk_logo", r.result);
      loadLogo();
      toast("Logo gespeichert");
    };
    r.readAsDataURL(file);
  }
  function buildKundenReport() {
    const m1 = state.m1 || {};
    const m2 = state.m2 || {};
    const last = state._last || {};
    const ww = state._lastWW || {};
    const qw2 = state._lastQw;
    const qoff2 = state._lastZuschlaege?.qoff;
    const qh = state._lastQh?.qh;
    const m4 = state.m4 || {};
    const m8 = state.m8 || {};
    const m9 = state._m9 || {};
    const fmt2 = (v, d = 2) => v != null && isFinite(v) ? v.toLocaleString("de-CH", { minimumFractionDigits: d, maximumFractionDigits: d }) : "\u2014";
    const int = (v) => v != null && isFinite(v) ? Math.round(v).toLocaleString("de-CH") : "\u2014";
    const datum = (/* @__PURE__ */ new Date()).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
    const proj = state._projectName || "\u2014";
    let sanText = "Keine zus\xE4tzlichen Sanierungsmassnahmen in der Berechnung ber\xFCcksichtigt (Verbrauchsbasis entspricht dem Ist-Zustand).";
    if (m4.aktiv && m4.auswahl) {
      const aktive = Object.entries(m4.auswahl).filter(([, v]) => v.enabled);
      if (aktive.length) {
        sanText = "Bei der Auslegung ber\xFCcksichtigte energetische Verbesserungen:<ul>" + aktive.map(([id, v]) => {
          const labels = {
            fenster: "Fensterersatz auf 2-/3-fach Isolierverglasung",
            fassade: "Fassadend\xE4mmung",
            estrich: "Estrichboden-/deckend\xE4mmung",
            kellerdecke: "Kellerdeckend\xE4mmung",
            kwl: "Kontrollierte Wohnrauml\xFCftung (KWL)"
          };
          return `<li>${labels[id] || id}</li>`;
        }).join("") + "</ul>";
      }
    }
    const traegerText = (m2.traeger || []).filter((t) => parseFloat(t.verbrauch) > 0).map((t) => {
      const et = { oel: "Heiz\xF6l EL", gas: "Erdgas", stueck: "St\xFCckholz", pellets: "Holz-Pellets", elektro: "Elektrospeicherheizung" }[t.energietraeger] || t.energietraeger;
      return `${int(parseFloat(t.verbrauch))} ${{ oel: "L/a", gas: "m\xB3/a", stueck: "Ster/a", pellets: "kg/a", elektro: "kWh/a" }[t.energietraeger] || ""} ${et}`;
    }).join(", ");
    const report = el("div", { class: "kunden-report" });
    report.appendChild(el(
      "div",
      { class: "kr-header" },
      el("div", { class: "kr-logo" }, el("img", { id: "kr-logo-img" })),
      el(
        "div",
        { class: "kr-head-right" },
        el("div", { class: "kr-doctype" }, "Heizlast-Auslegung"),
        el(
          "div",
          { class: "kr-meta" },
          el("div", {}, el("strong", {}, "Projekt: "), proj),
          el("div", {}, el("strong", {}, "Datum: "), datum),
          el("div", {}, el("strong", {}, "Grundlage: "), "FWS Modul 3 \xB7 Ausgabe 1-2025")
        )
      )
    ));
    report.appendChild(el("h1", { class: "kr-title" }, "Auslegungsbericht W\xE4rmepumpe"));
    report.appendChild(el(
      "div",
      { class: "kr-lead" },
      "Basierend auf dem gemessenen Energieverbrauch sowie den dokumentierten Geb\xE4udemerkmalen wurde die Norm-Heizlast nach FWS Modul 3 (Ausgabe 1-2025) berechnet. Die ausgewiesenen Leistungen dienen als technische Grundlage f\xFCr die Dimensionierung von W\xE4rmepumpe, W\xE4rme- und Warmwasserspeicher."
    ));
    report.appendChild(el("h2", { class: "kr-h2" }, "Objektdaten"));
    const bauperiodeLabels = {
      "vor_1947": "vor 1947",
      "1947_70": "1947\u20131970",
      "1971_80": "1971\u20131980",
      "1981_90": "1981\u20131990",
      "1991_00": "1991\u20132000",
      "2001_10": "2001\u20132010",
      "nach_2010": "nach 2010",
      "minergie": "Minergie-Standard"
    };
    report.appendChild(kvTable([
      ["Geb\xE4udetyp", { efh: "Einfamilienhaus", mfh: "Mehrfamilienhaus", buero: "B\xFCro / Gewerbe" }[m1.gebaeudetyp] || "\u2014"],
      ["Lage", m1.lage === "hoehe" ? "ab 800 m \xFC. M." : "Mittelland"],
      ["Bauperiode", bauperiodeLabels[m1.bauperiode] || m1.bauperiode || "\u2014"],
      ["Energiebezugsfl\xE4che EBF", m1.ebf ? `${int(m1.ebf)} m\xB2` : "\u2014"],
      ["Wohneinheiten", m1.wohneinheiten || "\u2014"],
      ["Verbrauch (Basis der Berechnung)", traegerText || "\u2014"]
    ]));
    report.appendChild(el("h2", { class: "kr-h2" }, "Dimensionsrelevante Leistungen"));
    report.appendChild(kvTable([
      ["Norm-Heizlast Qhl", `${fmt2(last.qhl)} kW`],
      ["Leistungszuschlag Sperrzeit Qoff", qoff2 != null ? `${fmt2(qoff2)} kW` : "\u2014"],
      ["Leistungszuschlag Warmwasser Qw", qw2?.qw != null ? `${fmt2(qw2.qw)} kW` : "entf\xE4llt (separate Warmwasseraufbereitung)"],
      ["Auslegungsleistung W\xE4rmepumpe Qh", qh != null ? `${fmt2(qh)} kW` : "\u2014"]
    ], { highlight: 3 }));
    report.appendChild(el("h2", { class: "kr-h2" }, "Energetische Geb\xE4udemerkmale"));
    const sanDiv = el("div", { class: "kr-text" });
    sanDiv.innerHTML = sanText;
    report.appendChild(sanDiv);
    const zeilen = [];
    if (state._lastWW?.qwwTag) {
      const qww = state._lastWW.qwwTag;
      const dt = (m8.tStoAus || 60) - (m8.tStoEin || 10);
      const vSto = qww / (4.2 * dt / 3600);
      const fak = { keine_zonen: 1.25, mit_zonen: 1.1, bivalent: 1 }[m8.fstoId] || 1.25;
      zeilen.push(["Warmwasserspeicher (empfohlen)", `${int(vSto * fak)} Liter (${m8.tStoAus || 60} \xB0C)`]);
    }
    if (qh && qh > 0) {
      const puff = Math.round(qh * 20);
      zeilen.push(["Heizungs-Pufferspeicher (Richtwert)", `${puff} Liter (Abtau-Sicherung L/W-WP)`]);
    }
    if (zeilen.length) {
      report.appendChild(el("h2", { class: "kr-h2" }, "Empfohlene Speichervolumen"));
      report.appendChild(kvTable(zeilen));
    }
    report.appendChild(el("h2", { class: "kr-h2" }, "Berechnungsgrundlagen"));
    report.appendChild(el(
      "div",
      { class: "kr-text" },
      el("p", {}, "Die Heizlast wurde nach dem Verbrauchsverfahren gem\xE4ss FWS Modul 3 (Ausgabe 1-2025, Schweizer W\xE4rmepumpen-Fachvereinigung) ermittelt. Leistungszuschl\xE4ge f\xFCr Sperrzeiten und Warmwasserbereitung folgen denselben Grundlagen."),
      el("p", {}, "Weitere Grundlagen: SIA 384/1:2022 (Heizlast in Geb\xE4uden), SIA 385/1:2020 und 385/2 (Warmwasseranlagen). Speichervolumen nach FWS M3 \xA710, W\xE4rmetauscher-Dimensionierung nach \xA711. Der Heizungs-Pufferspeicher ist als Richtwert aus SWKI BT 102-01 und VDI 4645 abgeleitet."),
      el(
        "p",
        { style: { fontSize: "9pt", color: "#555" } },
        "Die berechneten Werte basieren auf den vom Kunden/Planer zur Verf\xFCgung gestellten Angaben (Brennstoffverbrauch, Geb\xE4udekennwerte, Sanierungszustand). Abweichungen im Nutzerverhalten oder in der Geb\xE4udeh\xFClle k\xF6nnen das Ergebnis beeinflussen."
      )
    ));
    return report;
  }
  function kvTable(rows, opts = {}) {
    const tbl = el("table", { class: "kr-kv" });
    rows.forEach((r, i) => {
      const tr = el(
        "tr",
        { class: opts.highlight === i ? "hl" : "" },
        el("td", { class: "kv-k" }, r[0]),
        el("td", { class: "kv-v" }, r[1])
      );
      tbl.appendChild(tr);
    });
    return tbl;
  }
  var _kundenMount = null;
  function doPrint(modus = "intern") {
    document.body.classList.toggle("print-kunde", modus === "kunde");
    $$("details.steps").forEach((d) => d.open = modus === "intern");
    updatePrintMeta();
    if (modus === "kunde") {
      if (_kundenMount) _kundenMount.remove();
      _kundenMount = buildKundenReport();
      document.body.insertBefore(_kundenMount, document.querySelector("main"));
      const krImg = $("#kr-logo-img");
      if (krImg) {
        const custom = localStorage.getItem("thermowerk_logo");
        const def = $("#print-logo")?.getAttribute("data-default");
        krImg.src = custom || def || "";
      }
    } else if (_kundenMount) {
      _kundenMount.remove();
      _kundenMount = null;
    }
    toast('Tipp: Im Druckdialog "Kopf-/Fusszeilen" abw\xE4hlen');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove("print-kunde");
        if (_kundenMount) {
          _kundenMount.remove();
          _kundenMount = null;
        }
      }, 500);
    }, 250);
  }
  window.addEventListener("DOMContentLoaded", () => {
    buildApp();
    refreshProjectList();
    $("#btn-save")?.addEventListener("click", doSave);
    $("#btn-delete")?.addEventListener("click", doDelete);
    $("#project-select")?.addEventListener("change", (e) => doLoad(e.target.value));
    $("#btn-export-json")?.addEventListener("click", doExportJson);
    $("#btn-import-json")?.addEventListener("click", () => $("#file-import").click());
    $("#file-import")?.addEventListener("change", (e) => {
      if (e.target.files[0]) doImportJson(e.target.files[0]);
    });
    $("#btn-print-full")?.addEventListener("click", () => doPrint("intern"));
    $("#btn-print-kunde")?.addEventListener("click", () => doPrint("kunde"));
    $("#btn-logo-upload")?.addEventListener("click", () => $("#file-logo").click());
    $("#file-logo")?.addEventListener("change", (e) => {
      if (e.target.files[0]) doLogoUpload(e.target.files[0]);
    });
    loadLogo();
    $("#btn-neu")?.addEventListener("click", () => {
      if (!confirm("Neues leeres Projekt beginnen?")) return;
      Object.keys(state).forEach((k) => delete state[k]);
      buildApp();
    });
  });
})();
