// Wiederverwendbare UI-Helfer

export const $  = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

export function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class')       e.className = v;
    else if (k === 'style')  Object.assign(e.style, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'html')   e.innerHTML = v;
    else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    e.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return e;
}

export function renderSteps(result) {
  if (!result || !result.steps) return null;
  const list = el('div', { class: 'steps-list' },
    ...result.steps.map(s =>
      el('div', { class: 'step' },
        el('span', { class: 'left' }, s.formel),
        el('span', { class: 'right' }, s.wert || ''))
    ));
  return el('details', { class: 'steps' },
    el('summary', {}, 'Rechenweg anzeigen'),
    list);
}

export function resultCard(label, result, opts = {}) {
  if (!result) return el('div');
  const val = typeof result === 'object'
    ? `${result.wert.toLocaleString('de-CH', { minimumFractionDigits: opts.decimals ?? 2, maximumFractionDigits: opts.decimals ?? 2 })} ${result.einheit}`
    : result;
  const card = el('div', { class: 'result-card' + (opts.highlight ? ' highlight' : '') },
    el('div', {},
      el('div', { class: 'label' }, label),
      el('div', { class: 'value' }, val)),
    result.ampel ? el('span', { class: `ampel ${result.ampel}` }, opts.ampelLabel || result.ampel) : null,
  );
  const wrap = el('div', {}, card);
  const steps = renderSteps(result);
  if (steps) wrap.appendChild(steps);
  if (result.hinweis) wrap.appendChild(el('div', { class: 'hinweis' }, result.hinweis));
  return wrap;
}

export function toast(msg, ms = 2200) {
  let t = $('#toast');
  if (!t) { t = el('div', { id: 'toast' }); document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), ms);
}

// Eingabefelder binden mit Auto-Update
export function bindInputs(container, state, callback) {
  $$('input[data-key], select[data-key]', container).forEach(inp => {
    const key = inp.dataset.key;
    const type = inp.type;
    // Init from state
    if (state[key] != null) inp.value = state[key];
    inp.addEventListener('input', () => {
      let v = inp.value;
      if (type === 'number') v = v === '' ? '' : parseFloat(v);
      state[key] = v;
      callback?.(key, v);
    });
  });
}
