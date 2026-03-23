/* ==========================================
   THERMOWERK – JAVASCRIPT
   Letzte Änderung: 17. März 2026
   ========================================== */


/* ------------------------------------------
   Header: Schatten beim Scrollen
   ------------------------------------------ */
const header = document.getElementById('header');

window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 20);
});


/* ------------------------------------------
   Mobile Menü: Öffnen / Schliessen
   ------------------------------------------ */
const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');

menuToggle.addEventListener('click', () => {
  mainNav.classList.toggle('open');
  const spans = menuToggle.querySelectorAll('span');

  if (mainNav.classList.contains('open')) {
    spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
    spans[1].style.opacity = '0';
    spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
  } else {
    spans[0].style.transform = '';
    spans[1].style.opacity = '';
    spans[2].style.transform = '';
  }
});

// Menü schliessen bei Link-Klick
mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    const spans = menuToggle.querySelectorAll('span');
    spans[0].style.transform = '';
    spans[1].style.opacity = '';
    spans[2].style.transform = '';
  });
});


/* ------------------------------------------
   Scroll-Animationen (Fade-Up)
   ------------------------------------------ */
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  },
  { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));


/* ------------------------------------------
   Smooth Scroll mit Header-Offset
   ------------------------------------------ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      const offset = 88;
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});


/* ------------------------------------------
   Stromkosten-Rechner
   ------------------------------------------ */
(function () {
  // Elemente
  const areaSlider = document.getElementById('calc-area');
  const areaVal = document.getElementById('calc-area-val');
  const elecSlider = document.getElementById('calc-elec');
  const elecVal = document.getElementById('calc-elec-val');
  const oilSlider = document.getElementById('calc-oil');
  const oilVal = document.getElementById('calc-oil-val');
  const gasSlider = document.getElementById('calc-gas');
  const gasVal = document.getElementById('calc-gas-val');
  const oilRow = document.getElementById('calc-oil-row');
  const gasRow = document.getElementById('calc-gas-row');

  // Ergebnis-Elemente
  const savingEl = document.getElementById('calc-saving');
  const demandEl = document.getElementById('calc-demand');
  const wpKwhEl = document.getElementById('calc-wp-kwh');
  const wpCostEl = document.getElementById('calc-wp-cost');
  const oldCostEl = document.getElementById('calc-old-cost');
  const fuelLabelEl = document.getElementById('calc-fuel-label');

  // Status
  let insulation = 'medium';
  let fuel = 'oil';

  // Heizwärmebedarf pro m² je Gebäudezustand (kWh/m²/a)
  const demandPerM2 = {
    good: 55,    // Gut gedämmt / nach 2000
    medium: 95,  // Mittel / 1970-2000
    poor: 155    // Unsaniert / vor 1970
  };

  // JAZ Luft-Wasser-Wärmepumpe (saisonaler Durchschnitt)
  const JAZ = 3.2;

  // Formatierung: Schweizer Tausender-Trennung
  function fmt(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  }

  function calculate() {
    const area = parseInt(areaSlider.value);
    const elecPrice = parseInt(elecSlider.value) / 100;   // Rappen -> CHF
    const oilPrice = parseInt(oilSlider.value) / 100;     // Rappen -> CHF/l
    const gasPrice = parseInt(gasSlider.value) / 100;     // Rappen -> CHF/kWh

    // 1. Wärmebedarf
    const demand = area * demandPerM2[insulation];

    // 2. Stromverbrauch WP
    const wpKwh = demand / JAZ;

    // 3. Jährliche Stromkosten WP
    const wpCost = wpKwh * elecPrice;

    // 4. Jährliche Kosten alte Heizung
    let oldCost;
    if (fuel === 'oil') {
      // 1 Liter Heizöl ≈ 10 kWh, Wirkungsgrad Ölheizung ≈ 85%
      const liters = demand / (10 * 0.85);
      oldCost = liters * oilPrice;
      fuelLabelEl.textContent = 'Ölheizung';
    } else {
      // Wirkungsgrad Gasheizung ≈ 90%
      const gasKwh = demand / 0.90;
      oldCost = gasKwh * gasPrice;
      fuelLabelEl.textContent = 'Gasheizung';
    }

    // 5. Einsparung
    const saving = oldCost - wpCost;

    // Anzeige aktualisieren
    areaVal.textContent = area + ' m²';
    elecVal.textContent = elecPrice.toFixed(2) + ' CHF/kWh';
    oilVal.textContent = oilPrice.toFixed(2) + ' CHF/l';
    gasVal.textContent = gasPrice.toFixed(2) + ' CHF/kWh';

    demandEl.textContent = fmt(demand) + ' kWh/Jahr';
    wpKwhEl.textContent = fmt(wpKwh) + ' kWh/Jahr';
    wpCostEl.textContent = 'CHF ' + fmt(wpCost);
    oldCostEl.textContent = 'CHF ' + fmt(oldCost);
    savingEl.textContent = 'CHF ' + fmt(Math.max(0, saving));
  }

  // Toggle-Buttons: Gebäudezustand
  document.querySelectorAll('#calc-insulation .calc-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#calc-insulation .calc-toggle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      insulation = btn.dataset.value;
      calculate();
    });
  });

  // Toggle-Buttons: Brennstoff
  document.querySelectorAll('#calc-fuel .calc-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#calc-fuel .calc-toggle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      fuel = btn.dataset.value;
      // Passenden Preisregler zeigen
      oilRow.style.display = fuel === 'oil' ? 'flex' : 'none';
      gasRow.style.display = fuel === 'gas' ? 'flex' : 'none';
      calculate();
    });
  });

  // Slider-Events
  areaSlider.addEventListener('input', calculate);
  elecSlider.addEventListener('input', calculate);
  oilSlider.addEventListener('input', calculate);
  gasSlider.addEventListener('input', calculate);

  // Erste Berechnung
  calculate();
})();
