# Thermowerk Website – Zusammenfassung

## Was wurde gebaut

Eine vollständige Marketing-Website für **Thermowerk** (Wärmepumpen & Klimaanlagen, Neftenbach ZH) auf Basis von **Astro + Sanity CMS**.

### Technologie-Stack
- **Frontend:** Astro 5.5 (Static Site Generation)
- **CMS:** Sanity (Content Management)
- **Styling:** Globales CSS mit CSS-Variablen, vollständig responsiv
- **Deployment:** Netlify (netlify.toml vorhanden)

### Seiten-Struktur (One-Pager)
1. **Header** – Navigation mit Mobile-Hamburger-Menü
2. **Hero** – Vollbild-Hero mit CTA-Buttons
3. **Über Uns** – Unternehmensvorstellung mit Versprechen-Box
4. **Bild-Streifen** – Dekorativer Trennbereich
5. **Ablauf** – 4-Schritte-Prozess
6. **Zertifikate (WPSM)** – Förderberechtigungs-Badge
7. **Warum Luft-Wasser** – 4 Feature-Karten
8. **Klimaanlagen** – Split/Multisplit-Angebote
9. **Kostenrechner** – Interaktiver Heizkosten-Vergleich
10. **Region** – Servicegebiet mit Google Maps
11. **Kontakt** – Formular + Kontaktinfos (Web3Forms)
12. **Footer** – Links, Rechtliches

### Sanity-Schemas (8 Dokumente)
- siteSettings, heroSection, aboutSection, stepsSection
- wpsmSection, whySection, regionSection, contactSection

Alle Inhalte wurden per `scripts/seed-sanity.mjs` mit Initialdaten befüllt.

---

## Lokal starten

```bash
# Abhängigkeiten installieren (falls nötig)
npm install

# Entwicklungsserver starten
npm run dev
# → http://localhost:4321

# Produktions-Build erstellen
npm run build

# Build-Preview
npm run preview
```

### Voraussetzungen
- Node.js 18+
- `.env`-Datei mit Sanity-Credentials (liegt lokal, nicht im Repo):
  ```
  SANITY_PROJECT_ID=wpbatz1m
  SANITY_DATASET=production
  SANITY_API_TOKEN=...
  ```

---

## Nächste Schritte

### 1. Netlify verbinden
1. Auf [netlify.com](https://netlify.com) einloggen
2. **"Add new site" → "Import from Git"**
3. GitHub-Repo `dbcoltouan-ui/thermowerk-website` auswählen
4. Build-Einstellungen bestätigen:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. **Environment Variables** in Netlify setzen:
   - `SANITY_PROJECT_ID` = `wpbatz1m`
   - `SANITY_DATASET` = `production`
6. Deploy starten – die Seite ist live!

### 2. Sanity Studio einrichten (optional)
Das Sanity Studio ist unter `https://www.sanity.io/manage/project/wpbatz1m` erreichbar. Von dort können Inhalte direkt bearbeitet werden.

Für lokales Studio:
```bash
npx sanity@latest dev
```

### 3. Noch ausstehend
- **Telefonnummer** in Header, Contact und Footer eintragen (aktuell `+41 XX XXX XX XX`)
- **E-Mail-Adresse** im Contact-Bereich eintragen
- **Web3Forms Access Key** im Contact-Formular eintragen (`DEIN-ACCESS-KEY-HIER`)
- **Foto Klima** unter `public/img/klima.jpg` ergänzen
- **Impressum & Datenschutz** Seiten erstellen

---

*Erstellt: März 2026*
