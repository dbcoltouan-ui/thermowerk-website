// Projekt-Speicher: LocalStorage + Export/Import als JSON

const KEY = 'thermowerk_heizlast_projekte';

export function listProjects() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
}

export function saveProject(name, data) {
  const all = listProjects();
  all[name] = {
    ...data,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(all));
  return all[name];
}

export function loadProject(name) {
  return listProjects()[name] || null;
}

export function deleteProject(name) {
  const all = listProjects();
  delete all[name];
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function exportJSON(data, filename = 'heizlast-projekt.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

export function importJSON(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => { try { res(JSON.parse(r.result)); } catch (e) { rej(e); } };
    r.onerror = () => rej(r.error);
    r.readAsText(file);
  });
}
