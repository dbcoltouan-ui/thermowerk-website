# Anweisung für Claude – Thermowerk Website

## Was ist das?
Die Thermowerk-Website ist eine statische Firmenwebsite für einen Wärmepumpen- und Klimaanlagen-Fachbetrieb aus Neftenbach, Zürich.

## Womit ist sie gebaut?
- **Astro** – das Framework, das die Seite zusammenbaut
- **Sanity CMS** – ein Content-Management-System, über das Texte verwaltet werden (Sanity Project ID: wpbatz1m, Dataset: production)
- **Netlify** – bisheriges Hosting (Deployment per GitHub)
- **Cloudflare Pages** – neues Hosting (thermowerk-website.pages.dev), ebenfalls per GitHub-Push automatisch

## Wo liegen die Dateien?
Alles liegt lokal unter: `C:\Users\Daniel\Documents\thermowerk-website`

- **Komponenten** (einzelne Sektionen der Seite): `src/components/`
- **Globales CSS + HTML-Grundgerüst**: `src/layouts/Layout.astro`
- **Seitenaufbau + JavaScript**: `src/pages/index.astro`
- **Bilder**: `public/img/` (logo.png, hero.jpg, heatpump.jpg, heizraum.jpg, klima.jpg)
- **Sanity-Schemas**: `src/lib/sanity.ts`
- **Umgebungsvariablen** (nie in Git!): `.env`

## Komponenten-Übersicht
Header, Hero, About, ImageBreak (Heizraum-Bild-Streifen), Steps, Wpsm, WhyHeatpump, Klima, Calculator, Region, Contact, Footer

## Wie werden Änderungen gemacht und gepusht?
Claude macht Änderungen direkt via Desktop Commander auf deinem Computer.

Danach führt Claude folgende Schritte aus (oder du manuell im Terminal):
1. `git add -A` – alle Änderungen erfassen
2. `git commit -F commitmsg.txt` – Commit mit Nachricht aus Datei
3. `git push` – zu GitHub pushen → Cloudflare/Netlify bauen automatisch neu

Commits werden immer über eine `commitmsg.txt`-Datei im Projektordner gemacht, um Probleme mit Sonderzeichen zu vermeiden.

## Wichtige Hinweise
- Die `.env`-Datei enthält den Sanity API Token – diese Datei darf NIE in Git landen (ist in .gitignore ausgeschlossen)
- Windows Defender "Überwachter Ordnerzugriff" muss `git.exe` und `node.exe` erlauben, sonst werden Dateiänderungen blockiert
- Für Reverts immer `git checkout [commit-hash] -- datei` benutzen und danach neu committen
