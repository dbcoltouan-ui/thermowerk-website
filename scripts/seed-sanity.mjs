// Content-Import nach Sanity – befüllt alle Sektionen mit exakten 1:1-Werten aus den Komponenten
// WICHTIG: Jeder Wert hier entspricht EXAKT dem Fallback-Wert in der jeweiligen Astro-Komponente.
// Bei Bildern: Keine Bild-Referenzen setzen – so greifen die lokalen Fallback-Bilder aus public/img/.
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'wpbatz1m',
  dataset: 'production',
  apiVersion: '2024-03-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function seed() {
  console.log('Starte Content-Import nach Sanity (1:1 aus Komponenten-Fallbacks)...\n');

  // ─── 1. Site Settings (Topbar.astro, Contact.astro, Footer.astro) ───
  await client.createOrReplace({
    _id: 'siteSettings',
    _type: 'siteSettings',
    companyName: 'Thermowerk',
    companyLegalName: 'Gebäudetechnik Coltouan',
    phone: '+41 76 504 03 68',
    email: 'db.coltouan@gmail.com',
    emailPublic: 'info@thermowerk.ch',
    address: 'Rankstrasse 18',
    plz: '8413',
    city: 'Neftenbach',
    country: 'Schweiz',
    uid: 'CHE-489.162.528',
    mwst: 'CHE-489.162.528 MWST',
    serviceArea: 'ZH, SH, TG, AG, ZG, SZ, LU',
    openingHours: 'Mo-Fr, 07:00-18:00 Uhr',
    ownerName: 'Coltouan Beniamin-Daniel',
    logoAlt: 'Thermowerk',
    colorNavy: '#1B2A4A',
    colorNavyLight: '#243658',
    colorNavyDark: '#111D33',
    colorRed: '#D93025',
    colorRedHover: '#B71C1C',
    fontHeading: 'Outfit',
    fontBody: 'DM Sans',
    fontNav: 'Montserrat',
    instagram: 'https://www.instagram.com/thermowerk.ch/',
    seoTitle: 'Thermowerk – Wärmepumpen & Klimaanlagen | Neftenbach, Zürich',
    seoDescription: 'WPSM-zertifizierter Fachbetrieb für Luft-Wasser-Wärmepumpen. Persönliche Beratung, fachgerechte Montage und Förderberatung in ZH, SH, TG, AG.',
  });
  console.log('✓ Site Settings');

  // ─── 2. Navigation (Header.astro) ───
  // WICHTIG: Header-Fallback verwendet #anchor OHNE Slash-Prefix
  await client.createOrReplace({
    _id: 'navigation',
    _type: 'navigation',
    ctaButtonText: 'Beratung anfragen',
    ctaButtonLink: '#contact',
    stoerungText: 'Störung melden',
    stoerungLink: 'tel:+41765040368',
    items: [
      { _key: 'nav1', label: 'Leistungen', href: '#services', mobileOnly: false, children: [
        { _key: 'sub1', label: 'Wärmepumpen', href: '#why' },
        { _key: 'sub2', label: 'Klimaanlagen', href: '#klima' },
      ]},
      { _key: 'nav2', label: 'Über Uns', href: '#about', mobileOnly: false },
      { _key: 'nav3', label: 'Förderung', href: '#wpsm', mobileOnly: false },
      { _key: 'nav4', label: 'Kostenrechner', href: '#calculator', mobileOnly: false },
    ],
  });
  console.log('✓ Navigation');

  // ─── 3. Hero (Hero.astro) ───
  // WICHTIG: ctaSecondary ist "Kostenrechner" / "#calculator" – NICHT "Leistungen ansehen"
  await client.createOrReplace({
    _id: 'heroSection',
    _type: 'heroSection',
    headlineLine1: 'Ihre Wärmepumpe.',
    headlineLine2: 'Ihre Klimaanlage.',
    headlineLine3: 'Unser Handwerk.',
    subtitle: 'Mit kompletter Förderabwicklung.',
    text: 'WPSM-zertifiziert. Von der Beratung bis zur Förderabwicklung – alles aus einer Hand.',
    badgeText: 'WPSM-zertifizierter Fachbetrieb aus Neftenbach',
    ctaPrimary: { text: 'Beratung anfragen', link: '#contact' },
    ctaSecondary: { text: 'Kostenrechner', link: '#calculator' },
    overlayOpacity: 0.65,
    overlayColor: '27, 42, 74',
  });
  console.log('✓ Hero');

  // ─── 4. Services (Services.astro) ───
  // WICHTIG: Beschreibungen verwenden BINDESTRICHE (-) nicht Gedankenstriche (–)
  // WICHTIG: linkText hat trailing Space: 'Mehr erfahren '
  // WICHTIG: Keine Bild-Referenzen – Fallback-Bilder aus public/img/ werden verwendet
  await client.createOrReplace({
    _id: 'servicesSection',
    _type: 'servicesSection',
    headline: 'Unsere Leistungen',
    services: [
      {
        _key: 's1',
        title: 'Wärmepumpen',
        description: 'Heizungsersatz mit System - von der Beratung über die Förderabwicklung bis zur optimierten Anlage. WPSM-zertifiziert und auf Effizienz ausgelegt.',
        link: '#why',
        linkText: 'Mehr erfahren ',
        imageAlt: 'Wärmepumpe Installation am Einfamilienhaus',
      },
      {
        _key: 's2',
        title: 'Klimaanlagen',
        description: 'Split- und Multisplit-Systeme für Wohnräume, Büros und Gewerbe - geplant und installiert mit demselben Fachwissen aus der Kältetechnik.',
        link: '#klima',
        linkText: 'Mehr erfahren ',
        imageAlt: 'Klimaanlage Montage im Wohnraum',
      },
      {
        _key: 's3',
        title: 'Service & Wartung',
        description: 'Regelmässige Wartung, Störungsbehebung und Optimierung bestehender Anlagen - damit Ihr System dauerhaft zuverlässig und effizient arbeitet.',
        link: '#contact',
        linkText: 'Mehr erfahren ',
        imageAlt: 'Service und Wartung an Wärmepumpe',
      },
    ],
  });
  console.log('✓ Services');

  // ─── 5. Manufacturer Logos (ManufacturerLogos.astro) ───
  // KEINE Bild-Referenzen setzen! Komponente prüft auf gültige Bilder und fällt auf lokale Dateien zurück.
  await client.createOrReplace({
    _id: 'manufacturerLogos',
    _type: 'manufacturerLogos',
    logos: [
      { _key: 'l1', alt: 'Oertli Wärmepumpen', size: 'logo-sm' },
      { _key: 'l2', alt: 'Bosch Heiztechnik', size: '' },
      { _key: 'l3', alt: 'Mitsubishi Electric Klimaanlagen', size: '' },
      { _key: 'l4', alt: 'Panasonic Klimatechnik', size: 'logo-md' },
    ],
  });
  console.log('✓ Manufacturer Logos');

  // ─── 6. WPSM (Wpsm.astro) ───
  await client.createOrReplace({
    _id: 'wpsmSection',
    _type: 'wpsmSection',
    headline: 'Ihre Förderbeiträge – gesichert durch das WPSM-Zertifikat',
    bodyText: [
      { _type: 'block', _key: 'w1', style: 'normal', children: [{ _type: 'span', _key: 'w1s', text: 'Das Wärmepumpen-Systemmodul (WPSM) gilt als massgebender Schweizer Qualitätsstandard für Planung und Installation von Wärmepumpenanlagen. Getragen wird das Programm von der Fachvereinigung Wärmepumpen Schweiz (FWS), suissetec, GebäudeKlima Schweiz und EnergieSchweiz.' }] },
      { _type: 'block', _key: 'w2', style: 'normal', children: [{ _type: 'span', _key: 'w2s', text: 'Was das für Sie als Eigentümerin oder Eigentümer bedeutet: In den meisten Kantonen – darunter Zürich – ist das WPSM-Anlagezertifikat Voraussetzung für die Auszahlung kantonaler Förderbeiträge. Ohne Zertifikat keine Fördergelder. Je nach Projekt kann es dabei um mehrere tausend Franken gehen.' }] },
      { _type: 'block', _key: 'w3', style: 'normal', children: [{ _type: 'span', _key: 'w3s', text: 'Thermowerk ist WPSM-zertifiziert und übernimmt den gesamten Prozess – von der normgerechten Planung über die dokumentierte Inbetriebnahme bis zur Einreichung des Zertifikatsantrags. So stellen wir sicher, dass Ihnen keine Fördermittel entgehen.' }] },
    ],
    ctaText: 'Förderberatung anfragen',
    ctaLink: '#contact',
    badgeNumber: 26,
    badgeText: 'Kantone verlangen das WPSM als Voraussetzung für Förderbeiträge',
    badgeLabel: 'WPSM-zertifizierter Fachbetrieb',
  });
  console.log('✓ WPSM');

  // ─── 7. Steps (Steps.astro) ───
  await client.createOrReplace({
    _id: 'stepsSection',
    _type: 'stepsSection',
    headline: 'Der Weg zu Ihrer geförderten Wärmepumpe',
    steps: [
      { _key: 'st1', number: '01', title: 'Vor-Ort-Beratung', description: 'Wir verschaffen uns direkt bei Ihnen ein Bild: Gebäude, Ist-Zustand, Ihre Anforderungen. Auf dieser Grundlage erhalten Sie eine fundierte Ersteinschätzung, ob und wie sich Ihre bestehende Öl- oder Gasheizung durch eine moderne Wärmepumpe ersetzen lässt.' },
      { _key: 'st2', number: '02', title: 'Planung & Offerte', description: 'Auf Basis einer detaillierten Heizlastberechnung und eines hydraulischen Abgleichs erarbeiten wir eine massgeschneiderte Offerte. Das Fördergesuch bereiten wir richtlinienkonform vor Baubeginn für Sie vor, reichen sämtliche Unterlagen ein und halten Sie über den Verlauf auf dem Laufenden.' },
      { _key: 'st3', number: '03', title: 'Ausführung & Montage', description: 'Koordination, Organisation und Überwachung der gesamten Installation liegen in unserer Verantwortung – einschliesslich aller beteiligten Nebengewerke. Sie haben eine Ansprechperson für alles.' },
      { _key: 'st4', number: '04', title: 'Inbetriebnahme', description: 'Ihre Anlage wird sorgfältig einreguliert, und Sie erhalten eine ausführliche Einweisung in die Bedienung. Gleichzeitig stellen wir den WPSM-Zertifikatsantrag und übergeben Ihnen die vollständige Förderdokumentation.' },
      { _key: 'st5', number: '05', title: 'Nachkontrolle & Optimierung', description: 'Nach der ersten Heizperiode werten wir die Betriebsdaten Ihrer Wärmepumpe aus, justieren die Einstellungen und stellen sicher, dass die Anlage mit maximaler Effizienz arbeitet – damit Sie langfristig von tiefen Betriebskosten profitieren.' },
    ],
    ctaPreText: 'Ihr Projekt beginnt mit einem Gespräch.',
    ctaText: 'Beratung anfragen',
    ctaLink: '#contact',
  });
  console.log('✓ Steps');

  // ─── 8. About (About.astro) ───
  await client.createOrReplace({
    _id: 'aboutSection',
    _type: 'aboutSection',
    headline: 'Über Thermowerk',
    subheadline: 'Aus Neftenbach, für die ganze Deutschschweiz.',
    introText: [
      { _type: 'block', _key: 'a1', style: 'normal', children: [{ _type: 'span', _key: 'a1s', text: 'Hinter Thermowerk steht die Gebäudetechnik Coltouan – ein Unternehmen, das seine Ursprünge in der Kälte- und Klimatechnik hat. Die Energiewende und der wachsende Bedarf an erneuerbaren Lösungen haben uns dazu bewogen, unser Wissen gezielt in die Wärmepumpentechnik einzubringen. Dabei setzen wir konsequent auf ökologische Kältemittel der neuesten Generation, damit unsere Anlagen auch künftige Anforderungen an Nachhaltigkeit und Effizienz übertreffen.' }] },
      { _type: 'block', _key: 'a2', style: 'normal', children: [{ _type: 'span', _key: 'a2s', text: 'Unser Anspruch geht über die reine Installation hinaus. Wir begleiten jedes Projekt von der ersten Analyse über die Umsetzung bis zur Feinabstimmung im laufenden Betrieb – so lange, bis Ihre Anlage ihr volles Potenzial ausschöpft. Dabei steht Ihnen von Anfang bis Ende eine feste Ansprechperson zur Seite, die Ihr Vorhaben im Detail kennt. Kein Weiterleiten, kein Wiederholen.' }] },
    ],
    imageAlt: 'Daniel Coltouan – Inhaber Thermowerk Neftenbach',
    uspHeading: 'Was Sie von uns erwarten dürfen:',
    usps: [
      { _key: 'u1', title: 'Individuell', description: 'Jedes Konzept wird exakt auf Ihre Gegebenheiten abgestimmt. Denn eine Investition, die langfristig überzeugen soll, verdient eine Lösung, die von Grund auf zu Ihnen passt.', iconSvg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' },
      { _key: 'u2', title: 'Höchste Standards', description: 'Als WPSM-zertifizierter Betrieb arbeiten wir nach den strengsten Schweizer Vorgaben – und setzen diese mit der nötigen Sorgfalt um, damit Effizienz und Betriebssicherheit Ihrer Anlage gewährleistet sind.', iconSvg: '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>' },
      { _key: 'u3', title: 'Aus einer Hand', description: 'Planung, Koordination und Umsetzung aller Gewerke übernehmen wir vollständig. Sie behalten den Überblick, ohne sich um jedes Detail kümmern zu müssen.', iconSvg: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>' },
      { _key: 'u4', title: 'Persönlich', description: 'Eine Fachperson, ein Projekt, ein Draht. Sie rufen an, wir wissen Bescheid.', iconSvg: '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.81.36 1.6.7 2.35a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.75.34 1.54.57 2.35.7A2 2 0 0122 16.92z"/>' },
    ],
    closingText: [
      { _type: 'block', _key: 'c1', style: 'normal', children: [{ _type: 'span', _key: 'c1s', text: 'Wir sind überzeugt, dass gute Gebäudetechnik dort beginnt, wo man genau zuhört. Jedes Gebäude bringt andere Voraussetzungen mit, jeder Auftraggeber andere Erwartungen. Genau das treibt uns an – in den Kantonen Zürich, Aargau, Thurgau, Schaffhausen, Zug, Schwyz und Luzern entwickeln wir Lösungen für Heizung, Kühlung und Lüftung, die auf die jeweilige Situation zugeschnitten sind und ökologisch wie wirtschaftlich überzeugen.' }] },
      { _type: 'block', _key: 'c2', style: 'normal', children: [{ _type: 'span', _key: 'c2s', text: 'Unser Ziel ist nicht nur, den heutigen Bedarf zu decken. Wir wollen mit jeder Anlage einen Schritt weiterdenken – hin zu einer Gebäudetechnik, die nachhaltig funktioniert und sich den Anforderungen von morgen gewachsen zeigt.' }] },
    ],
    ctaText: 'Beratung vor Ort vereinbaren',
    ctaLink: '#contact',
  });
  console.log('✓ About');

  // ─── 9. Why Heatpump (WhyHeatpump.astro) ───
  await client.createOrReplace({
    _id: 'whySection',
    _type: 'whySection',
    headline: 'Warum wir auf Luft-Wasser-Wärmepumpen setzen',
    introText: 'Erdsonden-Wärmepumpen haben ihre Berechtigung – für bestimmte Anwendungen sind sie nach wie vor eine solide Wahl. Bei den meisten Heizungssanierungen im Raum Zürich und Winterthur erweist sich die Luft-Wasser-Wärmepumpe jedoch als die pragmatischere und oft auch wirtschaftlichere Lösung.',
    imageAlt: 'Luft-Wasser-Wärmepumpe Aussengerät',
    cards: [
      { _key: 'wc1', title: 'Kein Bewilligungsverfahren', description: 'Da keine Erdsondenbohrung erforderlich ist, entfällt das aufwändige Baubewilligungsverfahren. Das verkürzt die Projektlaufzeit um Wochen und umgeht mögliche Einschränkungen im Grundwasserschutz.', iconSvg: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/>' },
      { _key: 'wc2', title: 'Tiefere Investitionskosten', description: 'Ohne Bohrung fallen die Gesamtkosten spürbar tiefer aus. Gleichzeitig arbeiten moderne Luft-Wasser-Wärmepumpen auch bei niedrigen Aussentemperaturen effizient und zuverlässig.', iconSvg: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>' },
      { _key: 'wc3', title: 'Optimale Kombination mit Solarstrom', description: 'Luft-Wasser-Wärmepumpen lassen sich ideal mit einer Photovoltaikanlage koppeln. Das steigert den Eigenverbrauch und senkt die laufenden Energiekosten nachhaltig.', iconSvg: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>' },
      { _key: 'wc4', title: 'Kühlung im Sommer inklusive', description: 'Viele Luft-Wasser-Systeme bieten die Möglichkeit, im Sommer aktiv zu kühlen – eine Funktion, die angesichts steigender Temperaturen zunehmend an Bedeutung gewinnt.', iconSvg: '<path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/>' },
    ],
    ctaHeadline: 'Welches System passt zu Ihrem Gebäude?',
    ctaText: 'Jetzt beraten lassen',
    ctaLink: '#contact',
    calcHintText: 'Wie viel können Sie mit einer Wärmepumpe sparen?',
    calcHintButtonText: 'Zum Kostenrechner',
    calcHintButtonLink: '#calculator',
  });
  console.log('✓ Why Heatpump');

  // ─── 10. Klima (Klima.astro) ───
  await client.createOrReplace({
    _id: 'klimaSection',
    _type: 'klimaSection',
    headline: 'Klimaanlagen',
    subheadline: 'Damit Sie im Sommer einen kühlen Kopf bewahren, laufen wir auf Hochtouren.',
    introText: 'Hitzetage nehmen zu – auch in der Deutschschweiz. Wer im Büro produktiv bleiben, in der Praxis ein angenehmes Umfeld bieten oder nachts wieder durchschlafen will, kommt an einer durchdachten Klimatisierung kaum mehr vorbei. Wir planen und installieren Klimasysteme für Wohnräume, Büros und Praxen, abgestimmt auf Ihr Gebäude, Ihre Nutzung und Ihr Budget – und begleiten Sie von der ersten Begehung bis hin zur Fertigstellung und Inbetriebnahme.',
    imageAlt: 'Klimaanlage in modernem Wohnzimmer',
    types: [
      { _key: 'k1', title: 'Split-Systeme', description: 'Die klassische Lösung für einzelne Räume: Ein Aussen- und ein Innengerät, schnell installiert und ideal für Schlafzimmer, Büros oder Behandlungsräume. Leiser Betrieb und hohe Energieeffizienz sind bei aktuellen Geräten Standard.', iconSvg: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>' },
      { _key: 'k2', title: 'Multisplit-Systeme', description: 'Ein einzelnes Aussengerät versorgt mehrere Innengeräte in verschiedenen Räumen – unabhängig voneinander regelbar. Die wirtschaftliche Lösung, wenn mehrere Zonen klimatisiert werden sollen, ohne die Fassade mit mehreren Ausseneinheiten zu belasten.', iconSvg: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="12" y1="3" x2="12" y2="17"/>' },
      { _key: 'k3', title: 'Deckenkassetten', description: 'Wo Wandgeräte nicht in Frage kommen – etwa in Praxisräumen, offenen Büros oder repräsentativen Bereichen – bieten Deckenkassetten eine dezente Alternative. Die Luftverteilung erfolgt gleichmässig von oben, das Gerät fügt sich unauffällig in die Decke ein.', iconSvg: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>' },
      { _key: 'k4', title: 'Wartung & Instandhaltung', description: 'Eine Klimaanlage arbeitet nur so gut, wie sie gewartet wird. Regelmässige Filterreinigung, Kältemittelkontrolle und Funktionsprüfung sichern die Effizienz und verlängern die Lebensdauer Ihrer Anlage. Wir übernehmen das für Sie – zuverlässig und zu festen Konditionen.', iconSvg: '<path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>' },
    ],
    ctaText: 'Beratung, Planung, Montage und Service – aus einer Hand. Sie haben eine Ansprechperson, die Ihr Projekt von der ersten Frage bis zum laufenden Betrieb begleitet.',
    ctaButtonText: 'Klimaanlage anfragen',
    ctaButtonLink: '#contact',
  });
  console.log('✓ Klima');

  // ─── 11. Calculator (Calculator.astro) ───
  await client.createOrReplace({
    _id: 'calculatorSection',
    _type: 'calculatorSection',
    headline: 'Kostenrechner',
    subheadline: 'Was kostet eine Wärmepumpe im Betrieb?',
    description: 'Schätzen Sie Ihre jährlichen Heizkosten mit einer Luft-Wasser-Wärmepumpe – und vergleichen Sie mit Ihrer aktuellen Heizung.',
    savingLabel: 'Ihre geschätzte Einsparung pro Jahr',
    disclaimer: 'Grobe Schätzung basierend auf Durchschnittswerten. Die tatsächlichen Kosten hängen von Gebäude, Anlage und Nutzungsverhalten ab. Gerne berechnen wir Ihre Situation bei einer Beratung vor Ort.',
    ctaText: 'Persönliche Berechnung anfragen',
    ctaLink: '#contact',
    defaultArea: 160,
    defaultElecPrice: 27,
    defaultOilPrice: 120,
    defaultGasPrice: 13,
    jaz: 3.2,
  });
  console.log('✓ Calculator');

  // ─── 12. Region (Region.astro) ───
  await client.createOrReplace({
    _id: 'regionSection',
    _type: 'regionSection',
    headline: 'Aus Neftenbach – für die ganze Region',
    bodyText: 'Thermowerk hat seinen Sitz in Neftenbach, mitten im Zürcher Weinland. Von hier aus sind wir in Winterthur, Schaffhausen, im Thurgau, im Aargau und in weiteren Kantonen im Einsatz.',
    facts: [
      { _key: 'f1', title: 'Keine Anfahrtskosten', description: 'im Umkreis von 50 km ab Neftenbach.', iconSvg: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>' },
      { _key: 'f2', title: 'Reaktion innerhalb 24h', description: 'bei Störungen im Servicegebiet.', iconSvg: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' },
      { _key: 'f3', title: 'Direkt erreichbar', description: '– in der Regel melden wir uns am selben Tag.', iconSvg: '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.81.36 1.6.7 2.35a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.75.34 1.54.57 2.35.7A2 2 0 0122 16.92z"/>' },
    ],
    ctaText: 'Kontakt aufnehmen',
    ctaLink: '#contact',
    mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d172637.4!2d8.55!3d47.53!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x479a9988e32d27eb%3A0xe0b5b5e4a0010!2s8413%20Neftenbach!5e0!3m2!1sde!2sch!4v1',
  });
  console.log('✓ Region');

  // ─── 13. Contact (Contact.astro) ───
  // WICHTIG: phoneHours verwendet EN-DASHES (–): 'Mo–Fr, 07:00–18:00 Uhr'
  await client.createOrReplace({
    _id: 'contactSection',
    _type: 'contactSection',
    subtitle: 'Kontakt',
    headline: 'Sprechen wir über Ihr Projekt',
    phoneLabel: 'Telefon',
    phoneHours: 'Mo\u2013Fr, 07:00\u201318:00 Uhr',
    emailLabel: 'E-Mail',
    locationLabel: 'Standort',
    locationText: 'Neftenbach, Kanton Zürich',
    locationSubtext: 'Einsatzgebiet: ZH, SH, TG, AG, ZG, SZ, LU',
    hintText: 'Gut zu wissen: Die Beratung vor Ort ist unverbindlich und kostenlos. Im Umkreis von 50 km ab Neftenbach berechnen wir keine Anfahrtskosten.',
    formAccessKey: 'DEIN-ACCESS-KEY-HIER',
    formSubject: 'Neue Anfrage via thermowerk.ch',
    formInterests: [
      { _key: 'i1', label: 'Wärmepumpe (Heizungsersatz)', value: 'waermepumpe' },
      { _key: 'i2', label: 'Klimaanlage', value: 'klimaanlage' },
      { _key: 'i3', label: 'Förderberatung', value: 'foerderberatung' },
      { _key: 'i4', label: 'Sonstiges', value: 'sonstiges' },
    ],
    formPlaceholderMessage: 'Beschreiben Sie kurz Ihr Anliegen \u2013 z.B. Art der aktuellen Heizung, Baujahr, Gebäudetyp.',
    formButtonText: 'Anfrage senden',
    formNote: 'Wir melden uns in der Regel innerhalb eines Arbeitstages.',
  });
  console.log('✓ Contact');

  // ─── 14. Footer (Footer.astro) ───
  // WICHTIG: navLinks verwenden /#anchor (MIT Slash) – weil Footer auch auf Unterseiten (Impressum, Datenschutz) verwendet wird
  // WICHTIG: Datenschutz-Link ist /datenschutz (NICHT #)
  await client.createOrReplace({
    _id: 'footerSection',
    _type: 'footerSection',
    brandText: 'Wärmepumpen und Klimaanlagen für die Deutschschweiz. WPSM-zertifizierter Fachbetrieb aus Neftenbach.',
    copyrightText: '2026 Thermowerk \u2013 Gebäudetechnik Coltouan \u00b7 UID: CHE-489.162.528',
    navLinks: [
      { _key: 'fn1', label: 'Wärmepumpen', href: '/#why' },
      { _key: 'fn2', label: 'Klimaanlagen', href: '/#klima' },
      { _key: 'fn3', label: 'Über Uns', href: '/#about' },
      { _key: 'fn4', label: 'Förderung', href: '/#wpsm' },
      { _key: 'fn5', label: 'Kostenrechner', href: '/#calculator' },
      { _key: 'fn6', label: 'Kontakt', href: '/#contact' },
    ],
    legalLinks: [
      { _key: 'fl1', label: 'Impressum', href: '/impressum' },
      { _key: 'fl2', label: 'Datenschutz', href: '/datenschutz' },
    ],
  });
  console.log('✓ Footer');

  console.log('\n✅ Alle Inhalte importiert (1:1 aus Komponenten-Fallbacks)!');
  console.log('Hinweis: Bilder werden NICHT in Sanity gesetzt – die lokalen Fallback-Bilder aus public/img/ greifen automatisch.');
}

seed().catch((err) => {
  console.error('Fehler beim Import:', err);
  process.exit(1);
});
