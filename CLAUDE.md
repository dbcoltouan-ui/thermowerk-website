# Anweisung für Claude – Thermowerk Website

## Stack
- **Astro 5.5** – statisches Framework
- **Cloudflare Pages** – Hosting, auto-deploy per GitHub Push (thermowerk-website.pages.dev)
- **Sanity CMS** – vorbereitet aber noch nicht aktiv eingebunden (Project ID: `wpbatz1m`, Dataset: `production`)
- Alle Inhalte aktuell direkt in den Astro-Komponenten – Sanity-Integration ist nächster Schritt

## Dateipfade
Projektordner: `C:\Users\Daniel\Documents\thermowerk-website`

- Komponenten: `src/components/`
- Globales CSS + Layout: `src/layouts/Layout.astro`
- Seitenaufbau + JS: `src/pages/index.astro`
- Bilder: `public/img/`
- Sanity Client (noch zu erstellen): `src/lib/sanity.ts`
- Umgebungsvariablen (nie in Git!): `.env` → enthält Sanity API Token

## Aktive Komponenten (Reihenfolge)
Header → Hero → Services → ManufacturerLogos → Wpsm → Steps → About → WhyHeatpump → Klima → Calculator → Region → Contact → Footer

## Wie Claude Änderungen macht
1. Dateien lesen via **Read-Tool** aus dem gemounteten Pfad `/sessions/.../mnt/thermowerk-website/`
2. Änderungen schreiben via **Edit- oder Write-Tool** direkt in denselben Pfad
3. Committen und pushen via **Desktop Commander** (cmd-Shell):

```
cd C:\Users\Daniel\Documents\thermowerk-website
C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe add -A
echo [nachricht]> commitmsg.txt
C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe commit -F commitmsg.txt
C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe push
```

Claude macht das **selbstständig und vollständig** – kein manueller Schritt nötig.

## Wichtige Hinweise
- Git-Pfad: `C:\Users\Daniel\AppData\Local\Programs\Git\cmd\git.exe`
- Shell für Git-Befehle: immer **cmd** (nicht PowerShell)
- Commit-Message immer via `commitmsg.txt` – keine Sonderzeichen/Leerzeichen im `-m` Parameter
- `.env` darf nie in Git landen (in .gitignore)
- "Zugriff verweigert" beim echo-Befehl ist harmlos – der Push klappt trotzdem
- Sanity-Packages bereits installiert (`@sanity/client`, `@sanity/image-url`) – Integration noch ausstehend
