# Recherche Gebäudehülle Bestand (Schweiz) – Fallback-Werte für Heizlast-Software

Abrufdatum aller Quellen: **2026-10-29**. Alle Zahlen stammen aus den genannten Dokumenten (heruntergeladen und mit pdftotext gelesen bzw. per WebFetch ausgewertet). Keine Zahl aus dem Gedächtnis. Wo keine belastbare Quelle gefunden wurde, steht «nicht belegt».

Lokale Kopien der PDFs: `(lokale PDF-Kopien nicht im Repo)`

## Quellenverzeichnis (Kurzzeichen)

| Kürzel | Quelle | URL |
|---|---|---|
| **[GEAK-Typ]** | GEAK-Schulungsfolien «Typische U-Werte, Lebensdauer, Kennzahlen Heizwärme, Strom, Weblinks» (Verein GEAK / cecb.ch; 9 S.; Quellenangabe auf Folien: Christoph Sibold FHNW) | https://www.cecb.ch/media/typische_uwerte_lebensdauer_kennzahlen_heizwaerme_strom_weblinks.pdf |
| **[BFE-UFELD]** | BFE-Fachbeitrag «Wie Wärme durch die Wand entweicht» (B. Vogel, 2017, 5 S.) zur Studie UFELD (hässig sustech, Messung an 32 Altbauten) | https://pubdb.bfe.admin.ch/de/publication/download/8782 |
| **[BTK-San]** | BFE/EnergieSchweiz «U-Wert-Berechnung und Bauteilekatalog Sanierungen», Kurt Marti, 2001/2002 (Bestellnr. 805.155 d), 84 S.; Spiegelkopie Kanton FR | https://www.fr.ch/sites/default/files/contens/sde/_www/files/pdf67/U-Wert-Berechnung_und_Bauteilekatalog_Sanierungen_d.pdf |
| **[BTK-Neu]** | EnergieSchweiz/BFE «U-Werte Katalog – Einfache Bestimmung des U-Werts von Bauteilen», Marti/Di Paolantonio, 02.2016 (Art.-Nr. 805.150.D), 24 S. | https://pubdb.bfe.admin.ch/de/publication/download/7356 |
| **[GPM-ZH]** | ETHZ IBB/TEP Energy «Gebäudeparkmodell Büro-, Schul- und Wohngebäude – Vorstudie 2000-Watt-Gesellschaft Stadt Zürich», Schlussbericht 06/2010, 136 S. | https://nheeren.github.io/publication/wallbaum-2010-a/wallbaum-2010-a.pdf |
| **[GPM-CH]** | ETHZ/BFE «Gebäudeparkmodell SIA Effizienzpfad Energie – Vorstudie zum Gebäudeparkmodell Schweiz», Schlussbericht 1.10.2009, 137 S. | https://nheeren.github.io/publication/wallbaum-2009/wallbaum-2009.pdf |
| **[eREN]** | HES-SO (TRANSFORM/inPACT/LESBAT/HEVS) «eREN – Energetische Sanierung, ganzheitliche Strategien für Gebäudehüllen», dt. Ausgabe 2018 (franz. 2017), 56 S. | https://www.smartlivinglab.ch/files/eren-2018-broschure-de-p.pdf |
| **[MBF-2021]** | EnDK/EnFK «Merkblatt Fenster – Das Fenster in der Energieberechnung», Ausgabe 2021, 16 S. (Spiegelkopie BS) | https://media.bs.ch/original_file/e3c37933daff8dfdcaa8b9ca2e12120d1d1260ff/merkblatt-fenster-2021-de.pdf |
| **[SIA2007-Vorwort]** | SIA-Shop-Vorschau Norm SIA 380/1:2007 (Vorwort mit Änderungen gegenüber 2001) | https://shop.sia.ch/c2170683-0e33-4c6c-a1a8-4fb288cdb2ea/D/DownloadAnhang |
| **[SIA2001-Vorwort]** | SIA-Shop-Vorschau Norm SIA 380/1:2001 (Vorwort) | https://shop.sia.ch/e2eb7b96-5bca-47fc-81b5-fe2ff4615bae/F/DownloadAnhang |
| **[ZH-WDV91]** | Baudirektion Kanton Zürich «Wärmedämmvorschriften Ausgabe 1991» (gültig 1.1.1991–30.6.1994; basiert auf Empfehlung SIA 380/1:1988), 12 S. | https://www.zh.ch/content/dam/zhweb/bilder-dokumente/themen/planen-bauen/bauvorschriften/bauvorschriften-im-energiebereich/energetische-bauvorschriften/rechtsgrundlagen/wdv_1991_1.1.1991_30.6.1994.pdf |
| **[EN-2-2013]** | EnFK Vollzugshilfe EN-2 «Wärmeschutz von Gebäuden», Ausgabe Februar 2013 (MuKEn 2008 / SIA 380/1:2009) | https://www.endk.ch/de/fachleute-1/vollzugshilfen/muken-2008/ftw-simplelayout-filelistingblock/vohi-en02-de.pdf |
| **[EN-102-2016]** | EnFK Vollzugshilfe EN-102 «Wärmeschutz von Gebäuden», Ausgabe August 2016 (MuKEn 2014 / SIA 380/1:2016) | https://www.endk.ch/de/dokumentation/gebaude_muken/abgeloeste-dokumente-fuer-den-vollzug/EN-102-d_Waermeschutz.pdf |
| **[AG-Anh]** | Kanton Aargau, Gesetzessammlung SR 773.116 Anhänge 1–9 (SIA 380/1:2009; Anhang 2 Neubau, Anhang 3 Umbau) | https://gesetzessammlungen.ag.ch/frontend/structured_documents/4293/download_pdf_annex?locale=de |
| **[MuKEn14]** | EnDK «Mustervorschriften der Kantone im Energiebereich MuKEn 2014», Nachführung 2018, Anhänge 1 und 2 (Spiegelkopie Kanton SZ) | https://www.sz.ch/public/upload/assets/59435/MuKEn2014.pdf?fp=1 |
| **[ZG-Anh]** | Kanton Zug, Anhang 1 Teilrevision Energieverordnung (MuKEn 2014, Nachführung 2018; Beilagen 1–3), 11 S. | https://www.zg.ch/dam/jcr:6fc9767e-2a3d-4d74-9272-e6bf0b518a4d/Anhang_1_Teilrevision_Energieverordnung_MuKEn.pdf |
| **[TG-Umbau]** | Kanton Thurgau, Merkblatt «Energiegesetzliche Anforderungen für Umbauten und Umnutzungen», Stand Juli 2020 | https://energie.tg.ch/public/upload/assets/99207/Energiegesetzliche_Anforderungen_f%C3%BCr_Umbauten_und_Umnutzungen.pdf?fp=1 |
| **[TG-Schulung]** / **[SH-Schulung]** | Schulungsunterlagen MuKEn 2014 «Neubau Wärmeschutz» (TG, 7 S.; SH, 6 S.) mit Gegenüberstellung SIA 380/1:2016 vs. 2009 | https://energie.tg.ch/public/upload/assets/145988/2._Schulungsunterlagen_Neubau_W%C3%A4rmeschutz.pdf?fp=2 ; https://sh.ch/CMS/get/file/62c04e21-4b83-4ee6-8b7b-7ff831dc5959 |
| **[ZH-Anf16]** | AWEL Kanton Zürich «Anforderungsprofil SIA 380/1:2016, Version 16.01a» (Tab. 2 und 3), 47 S. | https://www.zh.ch/content/dam/zhweb/bilder-dokumente/themen/planen-bauen/bauvorschriften/bauvorschriften-im-energiebereich/energienachweis/sia-380_1/anforderungsprofil_380_1_2016_v16.01a.pdf |
| **[LU-C]** | Kanton Luzern, Vollzugshilfe Teil C «Winterlicher Wärmeschutz», Stand 1.1.2017, 36 Folien | https://uwe.lu.ch/-/media/UWE/Dokumente/Themen/Energie/Vollzugshilfen/C_Winterlicher_Waermeschutz.pdf?la=de-CH |
| **[HSLU-2016]** | BFE-Schlussbericht «Bewertungskriterien zur Beurteilung der Gebäudehülle in der SIA 380/1», R. Gadola (HSLU) / FHNW, 28.11.2016, 81 S. | https://pubdb.bfe.admin.ch/de/publication/download/8513 |
| **[GEAK-Norm24]** | EnDK «Normierung des GEAK», Version 18.03.2024, 81 S. | https://www.geak.ch/media/normierung_240318_geak.pdf |
| **[GEAKplus-Bsp]** | Raiffeisen/GEAK «Beispiel GEAK Plus EFH Teil 2 Beratungsbericht» (EFH Baujahr 1972, Kanton GR), 57 S. | https://www.raiffeisen.ch/content/dam/wwwmicrosites/casa/pdf/beispiel-geakplus-efh-teil2-beratungsbericht_CHL.pdf |
| **[VS-Grundl]** | Kanton Wallis, Dienststelle für Energie «Grundlagen der Wärmedämmung» (Webseite) | https://www.vs.ch/de/web/energie/grundlagen-der-w%C3%A4rmed%C3%A4mmung |
| **[SFHF-7]** | SFHF tecinfo 7 «Energetische Sanierung von Fassaden», Rev. Mai 2020, 20 S. (swisspor-Spiegel) | https://www.swisspor.com/api-media/9937/download/SFHF%20tecinfo%207%20Energetische%20Sanierung%20von%20Fassaden.pdf |
| **[BFE-Fenster04]** | BFE/EnergieSchweiz Medienbeitrag «Fensterersatz als ein Schritt im Rahmen einer energieeffizienten Sanierung» (PDF-Erstellung 2004) | https://pubdb.bfe.admin.ch/de/publication/download/1271 |
| **[Bern-DP]** | Denkmalpflege Stadt/Kanton Bern «Fenster – Energieverbrauch im Vergleich» (Zusatz Merkblatt Fenster, Stand 2015) | https://www.bern.ch/themen/planen-und-bauen/denkmalpflege/publikationen/fenster/Zusatz%20Merkblatt%20Fenster_Energieverbrauch%20im%20Vergleich_1-7-15.pdf |
| **[Beobachter10]** | Beobachter «Die sind ja nicht ganz dicht», P. Knüsel, 8.9.2010 (zitiert FFF-Geschäftsführer B. Rudin) | https://www.beobachter.ch/wohnen/bauen-renovieren/fenster-die-sind-ja-nicht-ganz-dicht |
| **[swisspor-FR]** | swisspor «Support de planification» 02/2021, 388 S. (Rsi/Rse nach SIA 180) | https://www.swisspor.com/api-media/10095/download/Support%20de%20planification%20swisspor.pdf |
| **[ISO6946-17s]** | ISO 6946:2017 Sample (iTeh), 15 S. (Tab. 5) | https://cdn.standards.iteh.ai/samples/65708/fcbae03d539c493d89aa2b10bee7691c/ISO-6946-2017.pdf |
| **[SBZ-2013]** | SBZ Monteur 2013/01 «Erdreichberührte Bauteile – U-Wert unter der Grasnarbe» (Beispiele nach EN 12831) | https://www.sbz-monteur.de/sites/default/files/sbzm_pdf/file_389117.pdf |
| **[Beuth-Errata]** | Beuth «Errata Praxis Heizlastberechnung» (DIN/TS 12831-1:2020 Beispiel B', Uequiv) | https://www.beuth.de/resource/blob/787818/6fe74cc28f02554f8bbd917634a1ce6c/errata-praxis-heizlastberechnung-data.pdf |
| **[DEAP-IE]** | SEAI (Irland) DEAP-Handbuch «Floors – U-values» (Default-Tabelle Bodenplatte nach P/A, auf ISO-13370-Basis) | https://deapguide.seai.ie/fabric/floors/u-values |

---

## 1. Typische U-Werte Bestand nach Bauperiode (Schweiz)

### 1.1 Primärquelle GEAK: «GEAK – Typische U-Werte (W/(m²K))» [GEAK-Typ], Folie 3 von 9

| Bauteil | Bis 1960 | 1970 | 1980 | ab 1990 | Quelle |
|---|---|---|---|---|---|
| Fenster | 3,0 … 5,0 | 2,5 … 3,0 | 1,5 … 2,5 | 1,0 … 1,5 | [GEAK-Typ] S. 3 |
| Aussenwände | 1,2 … 1,4 | 0,6 … 0,8 | 0,6 … 0,4 (sic) | 0,2 … 0,3 | [GEAK-Typ] S. 3 |
| Dächer | 1,2 … 1,4 | 0,6 … 0,8 | 0,3 … 0,5 | 0,15 … 0,2 | [GEAK-Typ] S. 3 |

Hinweis: Diese Folie enthält keine Werte für Böden/Kellerdecken, Böden gegen Erdreich und Aussentüren. Spaltenüberschriften sind Einzeljahre («1970», «1980»), keine Periodengrenzen; das Dokument nennt kein Erstellungsjahr.

### 1.2 GEAK-Tool-Richtwerte Aussenwand nach Baujahr (Grafik «Schlussbericht UFELD») [BFE-UFELD], S. 2

Aus der Grafik (Baujahr-Achse 1900–1985, U-Wert-Achse) und dem Text abgelesen:

| Baujahr | Aussenwände «schwer» (GEAK-Tool) | Aussenwände «leicht» (GEAK-Tool) | Quelle |
|---|---|---|---|
| 1900 – ca. 1918 | ≈ 1,3 | 2,0 | [BFE-UFELD] S. 2, Grafik (Ablesung) |
| ca. 1919 – 1947/48 | 1,4 | 2,0 | [BFE-UFELD] S. 2, Grafik (Ablesung) |
| ca. 1948 – 1975 | 1,4 | 1,4 | [BFE-UFELD] S. 2, Grafik (Ablesung); Text: «In der GEAK-Software wird für Wände von Altbauten (Baujahr vor 1975) ein U-Wert von 1.4 W/m2K angenommen.» |
| 1976 – ca. 1983 | 0,8 | 0,6 | [BFE-UFELD] S. 2, Text: «bisher liegen sie für schwere Wände bei 0.8 und bei leichten Wänden bei 0.6» |
| ab ca. 1984 | ≈ 0,6 | ≈ 0,4 | [BFE-UFELD] S. 2, Grafik (Ablesung) |

Messbefund UFELD (32 überwiegend unsanierte Altbauten): «die im GEAK-Tool verwendeten U-Werte 50 bis 60% höher liegen als die gemessenen U-Werte». Empfehlung der Autoren: Wände Baujahr vor 1976 von 1,4 auf **1,0 W/m²K**; Wände 1976–1985 auf **0,6 W/m²K** senken ([BFE-UFELD] S. 2). Rechnerische Werte mit SIA-279-Lambda stimmten «häufig gut» mit Messungen überein ([BFE-UFELD] S. 3). Ob der Verein GEAK diese Empfehlung umgesetzt hat: nicht belegt.

### 1.3 Gebäudeparkmodell (ETHZ/TEP für BFE bzw. Stadt Zürich): angenommene Bestands-U-Werte 2005 nach Bauperiode

Werte = Zustand 2005 (inkl. bereits erfolgter Teilsanierungen; Modellannahmen, keine Messwerte).

| Bauteil | <1947 | 1947–75 | 1976–85 | 1986–2005 | 2006–2020 (Neubau) | Quelle |
|---|---|---|---|---|---|---|
| Flachdach MFH | 0,35 | 0,35 | 0,35 | 0,30 | 0,22 | [GPM-ZH] S. 125, Figur 84 |
| Flachdach EFH | 0,35 | 0,35 | 0,30 | 0,30 | 0,22 | [GPM-ZH] S. 125 |
| Steildach MFH/EFH | 0,30 | 0,30 | 0,30 | 0,30 | 0,22 | [GPM-ZH] S. 126, Figur 85 |
| Wand MFH/EFH | 0,30 | 0,30 | 0,30 | 0,30 | 0,22 | [GPM-ZH] S. 127, Figur 86 |
| Boden MFH/EFH (Perioden vor 1947 / 1947–75 / 1975–85 / 1985–2000) | 0,40 | 0,40 | 0,40 | 0,40 | – | [GPM-CH] S. 126, Figur 85 |
| Fenster MFH (dito) | 1,60 | 1,60 | 1,60 | 1,60 | – | [GPM-CH] S. 127, Figur 86 |
| Fenster EFH (dito) | 1,52 | 1,52 | 1,52 | 1,52 | – | [GPM-CH] S. 127 |

Bemerkung: Die Modellwerte sind über den (teilsanierten) Bestand gemittelt und daher deutlich tiefer als die GEAK-Richtwerte für *unsanierte* Bauteile; für eine Fallback-Logik «unsaniert» sind sie ungeeignet, als «Bestandsmittel» aber belegbar. Im Effizienzszenario wird für MFH 1975–85 explizit «0,14 W/m²K anstatt 0,25 W/m²K Aussenwände» als Sanierungs-U-Wert genannt ([Heeren 2010, nheeren.github.io/publication/heeren-2010-a/heeren-2010-a.pdf], S. 15).

### 1.4 Bauteilekatalog Sanierungen [BTK-San]: U-Werte «ca.» bestehender Bauteile und typische Aufbauten

Alle Werte W/(m²K), «U-Wert ca.», Bauteilnummern des Katalogs (Kap. 4, S. 26–61). Die Quelle ordnet die Aufbauten keinen Bauperioden zu; die Perioden-Zuordnung in der letzten Spalte ist aus [eREN] S. 10–12 (Bauhistorie Westschweiz) abgeleitet und als Interpretation gekennzeichnet.

**Aussenwände gegen Aussenluft**

| Nr. | Aufbau (innen → aussen) | 0 cm Dämmung | mit bestehender Dämmung | Quelle (Seite) | Perioden-Zuordnung (Interpretation, [eREN]) |
|---|---|---|---|---|---|
| Ws 1–3 | Innenputz / ca. 30 cm dickes Mauerwerk / Aussenputz | 1,1 | – | S. 31 | bis ca. 1950 (Massivbackstein) |
| Ws 4 | Natursteinmauerwerk | 0,9 | – | S. 32 | vor 1919 / Zwischenkrieg (Bruchstein 45–70 cm) |
| Ws 5–7 | Mauerwerk (Backstein oder Sichtbackstein) mit Aussendämmung | 2,0 (Dämmung entfernt) | 4 cm: 0,7; 6 cm: 0,5 | S. 32–33 | 1970er–80er |
| Ws 8–10 | Kalksandstein-Mauerwerk mit Aussendämmung | 3,0 (Dämmung entfernt) | 4 cm: 0,8; 6 cm: 0,6 | S. 33–34 | 1970er–80er |
| Ws 11–13 | Mauerwerk (Backstein/Sichtbackstein) mit Hohlraum (Zweischalenmauerwerk) | 1,2 | – | S. 34–35 | ab Ende 1940er bis 1970er |
| Ws 14–16 | Backstein-Zweischalenmauerwerk mit Kerndämmung | – | 3 cm: 0,7; 5 cm: 0,5; 8 cm: 0,4 | S. 35–36 | 1960er–80er |
| Ws 17–19 | Kalksandstein/Backstein mit Kerndämmung | – | 3 cm: 0,8; 5 cm: 0,6; 8 cm: 0,4 | S. 36–37 | 1960er–80er |
| Ws 20–22 | Backstein mit bestehender Innendämmung | 2,0 (Dämmung entfernt) | 3 cm: 0,7; 4 cm: 0,6; 5 cm: 0,5 | S. 37–38 | Ende 1950er–70er (Innendämmung, Westschweiz) |
| Ws 23–25 | Kalksandstein mit Innendämmung | 2,5 (Dämmung entfernt) | 3 cm: 0,8; 4 cm: 0,7; 5 cm: 0,6 | S. 38–39 | dito |
| Ws 39/40 | 25 cm Gasbeton (Porenbeton), verputzt | 0,7 | – | S. 43–44 | – |
| Ws 41–43 | Backstein (Verbandmauerwerk) mit 5 cm Dämmung | – | 5 cm: 0,6 | S. 44–45 | – |
| Ws 44/45 | Blockwand (Holz) | 1,0 | – | S. 45 | ländlich, alle Perioden |
| Wsi 1/2 | Holz-Riegelwand mit Täfer, Luft, Dämmung zwischen Riegeln, Holzfaserplatte, Hinterlüftung | – | 4 cm: 0,7; 6 cm: 0,5; 8 cm: 0,4 | S. 57 | – |
| Wsi 3/4 | Innenputz / Holzfachwerk mit Mauerwerk / Aussenputz | 1,9 | – | S. 57–58 | vor 1919 (Fachwerk) |

**Wände gegen unbeheizte Räume / Erdreich**

| Nr. | Aufbau | 0 cm | mit Dämmung | Quelle |
|---|---|---|---|---|
| Ws 26/27 | Backstein gegen unbeheizt | 2,0 | – | S. 39 |
| Ws 28/29 | Kalksandstein gegen unbeheizt | 3,0 | – | S. 40 |
| Ws 30–33 | Backstein / Kalksandstein gegen unbeheizt, mit Dämmung | 2,0 / 3,0 | 3 cm: 0,8; 4 cm: 0,7; 5 cm: 0,6 | S. 40–41 |
| Ws 36 | Beton gegen Erdreich, ohne Dämmung | 4,5 | – | S. 42 |
| Ws 37/38 | Beton gegen Erdreich mit Innendämmung | 4,0–4,5 (entfernt) | 3 cm: 1,0; 4 cm: 0,8; 5 cm: 0,7 | S. 43 |
| Wsi 5/6 | Leichte Holzständerwand gegen unbeheizt | – | 2 cm: 1,0; 4 cm: 0,7; 6 cm: 0,6 | S. 58 |

**Böden**

| Nr. | Aufbau | 0 cm | mit Dämmung | Quelle |
|---|---|---|---|---|
| Bs 1/2 | Bodenbelag / Zementüberzug / Trennlage / (Dämmung) / Beton – gegen Aussenluft | 3,0 | 2 cm: 1,2; 4 cm: 0,8 | S. 26 |
| Bs 3/4 | dito gegen unbeheizte Räume (Kellerdecke Beton) | 2,4 | 2 cm: 1,1; 4 cm: 0,7 | S. 26–27 |
| Bs 5 | Hobeldielen / Lagerhölzer / Schlackenfüllung / gemauertes Gewölbe bzw. Natursteingewölbe – gegen unbeheizt | 1,5 | – | S. 27 |
| Bs 6 | Bodenbelag / Zementüberzug / (Dämmung) / Balkendecke mit Tonhohlkörper (Hourdis) / Verputz – gegen unbeheizt | 1,6 | 2 cm: 1,1; 4 cm: 0,9 | S. 27 |
| Bs 7 | Zementüberzug / Beton / Geröllschicht-Magerbeton / Erdreich | 3,0 | – | S. 28 |
| Bs 8/9 | Steingutplatten / Sand / Erdreich (ohne Betonplatte) | 4,3 | – | S. 28 |
| Bs 10 | Zementüberzug / Betondecke / belüfteter Hohlraum / Erdreich | 2,6 | – | S. 29 |
| Bs 11/12 | Boden mit Fussbodenheizung gegen aussen / unbeheizt | – | 2 cm: 1,5/1,4; 3 cm: 1,2/1,1; 4 cm: 0,9/0,8 | S. 29 |
| Bs 13–15 | Zementüberzug / Beton / Erdreich (Bodenplatte) | 4,5 | 2 cm: 1,6; 4 cm: 0,9 | S. 30 |
| Bsi 4–7 | Bretterboden / Schlackenfüllung / Schiebboden / Balken (Holzbalkendecke) gegen aussen | mit Schlacke: 0,9; ohne Schlacke: 2,0 | – | S. 52–53 |
| Bsi 13–15 | dito gegen unbeheizt | mit Schlacke: 0,9; ohne Schlacke: 2,0 | – | S. 54–55 |
| Bsi 9–12, 17–19 | Holzbalkendecke mit bestehender Dämmung | 2,0 (entfernt) | 4 cm: 0,7–0,8; 6 cm: 0,6 | S. 53–56 |

**Dächer und Decken gegen unbeheizt**

| Nr. | Aufbau | 0 cm | mit Dämmung | Quelle |
|---|---|---|---|---|
| Ds 1/2, 5/6 | Flachdach Beton (Abdichtung / Dämmung / Dampfsperre / Beton) | 3,5 | 4 cm: 0,7; 6 cm: 0,5 | S. 46–47 |
| Ds 3/4, 7/8 | Flachdach Trapezblech (Hartfaserplatte / Trapezblech) | 3,0 | 4 cm: 0,7; 6 cm: 0,5 | S. 46–48 |
| Dsi 1–3 | Steildach: Dacheindeckung, Lattung, Hinterlüftung, Konterlattung, Unterdach (Schindeln/Bretter), Sparren – ungedämmt | 4,0 | – | S. 59 |
| Dsi 4 | Steildach mit Dämmung zwischen Sparren | – | 6 cm: 0,6 | S. 60 |
| Ds 10–17 | Estrichboden/Decke gegen unbeheizt: Zementüberzug / Beton (Deckenputz) | 3,0 | 2 cm: 1,1–1,2 | S. 48–51 |
| Dsi 5–7 | Estrichboden Holzbalkendecke mit Schlackenfüllung | mit Schlacke: 0,9; ohne: 2,0 | – | S. 60–61 |
| Dsi 8/9 | Holzbalkendecke mit bestehender Dämmung | – | 4 cm: 0,7 | S. 61 |

Regel aus [BTK-San] S. 25: «Ist der genaue Aufbau nicht bekannt, so ist die geringste Wärmedämmdicke einzusetzen.» Bei unbekanntem Dämmstoff: λ = 0,040 W/(mK) ([BTK-San] S. 17, Beispiel 2, Fussnote 1); Kanton Luzern: bei unbekanntem Dämmmaterial λ = 0,05 W/(mK) ([LU-C] Folie 7–8).

### 1.5 Bauhistorische Periodisierung (Westschweiz, 193 analysierte MFH) [eREN] S. 10–12

Beschreibende Aussagen (verbatim, keine U-Werte ausser Fenster):

- Perioden: Vorkriegszeit 1900–1920, Zwischenkriegszeit 1921–1945, Nachkriegszeit 1946–1960, Hochkonjunktur 1961–1975, nach der Ölkrise 1976–1990 ([eREN] S. 4, 8).
- Aussenwände: «Bis in die 30er Jahre bestehen Aussenwände aus massiven Natur- oder Backsteinwänden. Die Wanddicke variiert zwischen 45 und 70 cm» … «Zunächst ging man vorsichtig auf eine Mauerstärke von 25 cm zurück … Vormauerung auf der Raumseite, unter Einhaltung eines Luftzwischenraums» … «Seit dem Ende der 40er Jahre sind tragende Aussenwände mit Luftschicht und innerer Vorsatzschale … weit verbreitet» … Mineralfasermatten «1 bis max. 3 cm» … «Gegen Ende der 50er Jahre werden Aussenwände in der Westschweiz geringfügig innen gedämmt, während man sich in der Deutschschweiz gegen 1945 die Frage des Zweischalen-Mauerwerks … stellt» … «In den 60er Jahren erscheinen Betonfertigteilfassaden. Tragende Ortbetonfassaden verbreiten sich Anfang der 70er Jahre» … «In den 70er Jahren setzt sich die Wärmedämmung der Wände durch … erste Aussenwärmedämmungen erscheinen gegen Ende der 70er Jahre.» ([eREN] S. 10–11)
- Kellerdecken: «Decken über unbeheiztem Untergeschoss bestehen bis in die 30er Jahre häufig aus Zementdecken mit Metallträgern … Hohlsteindecken (Hourdis) … bis zum Ende der 60er Jahre … Seit den 50er Jahren … meistens Betondecken … Bis zu den 90er Jahren ist eine Dämmung der Untergeschossdecke selten.» ([eREN] S. 10)
- Oberste Geschossdecke: Holzbalkendecken bis 50er Jahre; «Eine erste geringe Wärmedämmung der Dachgeschossdecke erscheint Mitte der 40er Jahre. Diese wird jedoch bis ans Ende der 80er Jahre nur selten ausgeführt.» ([eREN] S. 10)
- Dächer: «schon in den 50er Jahren einige Dächer geringfügig gedämmt … Gegen Mitte der 60er Jahre ist ein Grossteil der Gebäude entweder auf der obersten Geschossdecke oder zwischen den Sparren … gedämmt. Flachdächer erscheinen ab den 30er Jahren. Flachdachdämmungen beginnen in den 60er Jahren und setzen sich nach der Ölkrise durch.» ([eREN] S. 12)
- Gemessene U-Werte (ISO 9869, 10 Fallstudien 1901–1988), Abb. 49 S. 27, abgelesen aus Balkendiagramm: Wand 1901 ≈ 0,7–1,0; Wand 1911 ≈ 1,5–1,6; Wand 1939 ≈ 1,1–1,6; Wand 1960 ≈ 1,2–1,6; Wand 1970 ≈ 0,8–1,4; Wand 1972 ≈ 0,4–0,9; Wand 1975 ≈ 0,4–0,6; Betonbrüstung 1971 gemessen ≈ 1,6, errechnet ≈ 3,5; Dach 1980 ≈ 0,2–0,6; Wand 1988 ≈ 0,4–0,5 (Ablesung, ±0,1).

### 1.6 Weitere Perioden-Indikatoren

| Aussage | Wert | Quelle |
|---|---|---|
| Dämmstärken in der Praxis (Wallis): vor 1980 | < 6 cm | [VS-Grundl] |
| 1980–1990 | ca. 6–8 cm | [VS-Grundl] |
| 1990–2000 | ca. 8–10 cm | [VS-Grundl] |
| 2000–2010 | ca. 10–12 cm | [VS-Grundl] |
| ab 2010 | 14 cm und mehr | [VS-Grundl] |
| Aussenwand-U vs. GEAK-Klasse (EFH-Beispiel, λ = 0,032): 60 mm «(1995)» 0,39; 80 mm «(1980)» 0,34; 120 mm Renovation 0,23; 160 mm Neubau 0,18; 200 mm Minergie 0,14; 280 mm Minergie-P 0,11; ungedämmt (Klasse G) 1,54 | s. links | [SFHF-7] S. 9 (Jahreszuordnung «1980»/«1995» in der Quelle vertauscht erscheinend; so abgedruckt) |
| Zwischensparrendämmung Bestand «nur 4 bis 6 cm» | – | AG Energieberatung Gebäudehülle, https://www.ag.ch/de/themen/umwelt-natur/energie/energieberatungaargau/informationen-zum-bauen-und-modernisieren/gebaeudehuelle |
| GEAK Plus Beispiel EFH 1972 (GR), Ist-Zustand: Dach 0,49; Decke g. unbeheizt 0,49; Wand g. aussen 0,64; Wand g. unbeheizt 1,1; Wand g. Erdreich >2 m 0,97; Fenster 0,94 (ersetzt); Boden g. unbeheizt 3,0; Boden g. Erdreich >2 m 1,5 | – | [GEAKplus-Bsp] S. 5 |
| GEAK-Beurteilungsklassen Bestand (Tab. 43): Dach «schlecht» > 0,5; Fenster «schlecht» > 2,1; Wand «schlecht» > 0,5; Boden «schlecht» > 0,5 | – | [GEAK-Norm24] S. 71 |

### 1.7 Vorschlag Fallback-Tabelle (abgeleitet; Herkunft je Zelle)

Spannen = min/max der belegten Werte; «typisch» = GEAK-Richtwert bzw. Katalog «ca.»-Wert. **Bauteile ohne belegten Wert sind als «nicht belegt» markiert.**

| Periode | Aussenwand | Steildach ungedämmt / mit Zwischensparrendämmung | Flachdach | Boden g. Erdreich | Decke/Boden g. Keller | Fenster | Aussentür |
|---|---|---|---|---|---|---|---|
| vor 1919 | 0,9 (Naturstein, [BTK-San] S. 32) – 1,1 (30 cm Backstein, S. 31) – 1,3 (GEAK-Tool schwer, [BFE-UFELD]) – 1,9 (Fachwerk, S. 57) – 2,0 (GEAK-Tool leicht) | 4,0 ungedämmt ([BTK-San] S. 59); GEAK 1,2–1,4 (Dach allg.) | selten (ab 1930er, [eREN]) | 3,0 (Beton auf Geröll, S. 28) – 4,3 (Platten auf Sand, S. 28) | Gewölbe mit Schlacke 1,5 (S. 27); Holzbalken mit Schlacke 0,9 / ohne 2,0 (S. 52–55) | 5,0 Einfachglas ([GEAK-Typ] S. 5; [eREN] S. 12); Kastenfenster 2,5 ([eREN] S. 12); GEAK 3,0–5,0 | nicht belegt (nur Türkatalog ohne Periode: Fichte massiv 40 mm 2,2; Eiche 2,8; [BTK-San] S. 67) |
| 1919–1945 | 1,1 (30 cm Backstein) – 1,4 (GEAK schwer) – 2,0 (GEAK leicht) | 4,0 ungedämmt; GEAK 1,2–1,4 | 3,0–3,5 ungedämmt ([BTK-San] S. 46–48) | 3,0 – 4,5 (Bodenplatte Beton, S. 30) | Hourdis-Decke 1,6 (S. 27); Beton 2,4 (S. 26) | 5,0 Einfachglas; Doppelfenster/Vorfenster 2,5–2,7 ([MBF-2021] S. 9) | nicht belegt |
| 1946–1960 | 1,2 (Zweischalen mit Hohlraum, S. 34) – 1,4 (GEAK) | 4,0 ungedämmt; GEAK 1,2–1,4 | 3,0–3,5 ungedämmt | 3,0 – 4,5 | 2,4 (Beton ungedämmt) | 5,0 Einfachglas (bis Mitte 60er, [eREN]); Doppelverglasung DV 2,7 ([MBF-2021] S. 9); GEAK 3,0–5,0 | nicht belegt |
| 1961–1977 | GEAK 1,4 (bis 1975) / 0,6–0,8 («1970», [GEAK-Typ]); Kerndämmung 3–5 cm: 0,5–0,8 ([BTK-San] S. 35–37); Innendämmung 3–5 cm: 0,5–0,8 (S. 37–39); Beton ungedämmt: nicht belegt als Zahl (gemessen 1971 ≈ 1,6, [eREN] S. 27) | Zwischensparren 6 cm: 0,6 (S. 60); GEAK 0,6–0,8 | 4 cm: 0,7; 6 cm: 0,5 (S. 46) | 3,0 – 4,5 ungedämmt | 2,4 ungedämmt; 2 cm: 1,1 (S. 26–27, 49–50) | 2-IV Isolierglas Luft 2,9 / Argon 2,7 ([MBF-2021] S. 9); GEAK 2,5–3,0 | nicht belegt |
| 1978–1994 | GEAK-Tool 0,8 (schwer) / 0,6 (leicht) 1976–85; GEAK-Typ «1980» 0,4–0,6; UFELD-Messung 0,6; SFHF 80 mm 0,34 | GEAK 0,3–0,5 | 4–6 cm: 0,5–0,7 (S. 46–47) | mit 2–4 cm: 0,9–1,6 (S. 30) | 2 cm: 1,1–1,2; 4 cm: 0,7–0,8 | 2-IV-IR ab 1990 1,3–1,8 Ug → Uw 1,5–2,4 ([MBF-2021] S. 9); 3-IV bis 1990 Ug 1,9–2,0 → Uw 1,9–2,5; GEAK 1,5–2,5 | nicht belegt (Türen mit 30 mm Dämmschicht 1,1; 20 mm Alu 2,1; [BTK-San] S. 67) |
| 1995–2010 | GEAK ab 1990 0,2–0,3; SFHF 120–160 mm 0,18–0,23; Gesetz 0,3 (2001) / 0,25 (2007) / 0,20 (2009) | GEAK 0,15–0,2 | nicht separat belegt (Grenzwert 0,3→0,2) | Grenzwert 0,4 (2001) / 0,3 (2007) / 0,25–0,28 (2009) | dito | GEAK 1,0–1,5; Grenzwert 1,7 (2001) / 1,5 (2007) / 1,3 (2009) | Grenzwert wie Fenster (1,7/1,5/1,3) |
| ab 2011 | Grenzwert 0,20 (2009, mit WB-Nachweis) / 0,17 (2016); Minergie 0,15 | 0,20 / 0,17 | 0,20 / 0,17 | 0,25 / 0,28 (g. unbeheizt bzw. >2 m) | 0,25 (2009) / 0,25 (2016) g. unbeheizt | 1,3 (2009) / 1,0 (2016) | 1,3 (2009) / 1,2 (2016) |

---

## 2. SIA 380/1 – Grenzwerte Einzelbauteile je Ausgabe

Alle Werte U_li in W/(m²K) bei 20 °C Raumtemperatur (Korrektur ±5 % pro K Abweichung: [MBF-2021] S. 4; [SH-Schulung] S. 3).

### 2.1 Empfehlung SIA 380/1:1988 (k-Werte) – Vollzug via kantonale Wärmedämmvorschriften

Die Empfehlung selbst ist nicht öffentlich. Belegt sind die darauf abgestützten Zürcher WDV 1991 ([ZH-WDV91] S. 1: «stützen sich … auf die Empfehlung SIA 380/1 "Energie im Hochbau", Ausgabe 1988»). Ob die Zahlen identisch mit der SIA-Empfehlung sind: nicht belegt.

| Bauteil | Neubau (Kleinbauten, Tab. 1) zu Aussenklima | zu unbeheizt/Erdreich | bei Heizflächen | Umbau (Tab. 2) zu Aussenklima | Quelle |
|---|---|---|---|---|---|
| Dach | 0,3 | 0,3 | 0,3 | 0,3 | [ZH-WDV91] S. 3, 7 |
| Wand, Boden | 0,4 | 0,4 | 0,3 | 0,3 | [ZH-WDV91] S. 3, 7 |
| Fenster und Türen | 2,2 | 3,0 | 1,8 | 2,2 (unbeheizt 3,0; Heizfläche 1,8) | [ZH-WDV91] S. 3, 7 |
| Schaufenster | 3,0 | – | 3,0 | 3,0 | [ZH-WDV91] S. 3 |
| Rolladen(kasten) | 0,6 | 0,8 | – | 0,6 / 0,8 | [ZH-WDV91] S. 3 |

Walliser Historie opake Bauteile: «ab 1987: U-Wert unter 0,4 W/m2K (Backstein mit 8 cm Dämmung, λ = 0,040)» ([VS-Grundl]).

### 2.2 SIA 380/1:2001

Keine direkte Tabelle öffentlich. Belegt über das Vorwort SIA 380/1:2007 ([SIA2007-Vorwort] S. 3):
- «Der Einzelbauteilgrenzwert für Fenster wurde von **1,7** W/(m²·K) auf 1,5 W/(m²·K) reduziert»
- «Der Einzelbauteilgrenzwert für opake Bauteile ohne Flächenheizungen gegen Aussenklima wird von **0,30** auf 0,25 W/(m²·K) und für Bauteile gegen Erdreich und unbeheizt von **0,40** auf 0,30 W/(m²·K) verschärft.»
- «Der Einzelbauteilgrenzwert für Storenkasten wird wieder eingeführt» (d. h. 2001 ohne Storenkasten-Grenzwert).
- Umbau 2001: «Es werden keine speziellen Einzelbauteil-Anforderungen bei Umbauten definiert. Bei Umbauten sind für neue Bauteile ebenfalls die Neubau-Grenzwerte einzuhalten» ([SIA2001-Vorwort] S. 3).

| Bauteil | Neubau g. Aussenklima | Neubau g. unbeheizt/Erdreich | Umbau | Quelle |
|---|---|---|---|---|
| opake Bauteile ohne Flächenheizung | 0,30 | 0,40 | wie Neubau für neue Bauteile | [SIA2007-Vorwort] S. 3; [VS-Grundl] «ab 2004: unter 0,3» |
| opake Bauteile mit Flächenheizung | nicht belegt | nicht belegt | – | – |
| Fenster | 1,7 | nicht belegt | – | [SIA2007-Vorwort] S. 3 |
| Türen | nicht belegt | nicht belegt | – | – |

### 2.3 SIA 380/1:2007 (gültig ab 1.1.2008)

| Bauteil | Neubau g. Aussenklima | g. Erdreich/unbeheizt | Quelle |
|---|---|---|---|
| opake Bauteile ohne Flächenheizung | 0,25 | 0,30 | [SIA2007-Vorwort] S. 3; [VS-Grundl] «ab 2008: unter 0,25» |
| Fenster (Normgrösse) | 1,5 | nicht belegt | [SIA2007-Vorwort] S. 3 |
| Storenkasten | 0,6 | – | [SIA2007-Vorwort] S. 3 |

### 2.4 SIA 380/1:2009 (MuKEn 2008; gültig ab 1.1.2010)

Neubau (Tabelle 1 in [EN-2-2013] S. 8; identisch [AG-Anh] Anhang 2):

| Bauteil | mit WB-Nachweis: Aussenklima / <2 m Erdreich | mit WB-Nachweis: unbeheizt / >2 m Erdreich | ohne WB-Nachweis: Aussenklima | ohne WB-Nachweis: unbeheizt |
|---|---|---|---|---|
| Dach, Decke (opak) | 0,20 | 0,25 | 0,17 | 0,25 |
| Wand, Boden (opak) | 0,20 | 0,28 | 0,17 | 0,25 |
| opake Bauteile mit Flächenheizung | 0,20 | 0,25 | 0,17 | 0,25 |
| Fenster, Fenstertüren, Türen | 1,3 | 1,6 | 1,3 | 1,6 |
| Fenster mit vorgelagerten Heizkörpern | 1,0 | 1,3 | 1,0 | 1,3 |
| Tore (>6 m²) | 1,7 | 2,0 | 1,7 | 2,0 |
| Storenkasten | 0,50 | 0,50 | 0,50 | 0,50 |

Umbau/Umnutzung (Tabelle 3 in [EN-2-2013] S. 9; [AG-Anh] Anhang 3):

| Bauteil | Aussenklima / <2 m | unbeheizt / >2 m | Zielwert (TG Anhang 1b) |
|---|---|---|---|
| Dach, Decke (opak) | 0,25 | 0,28 | 0,15 / 0,20 |
| Wand, Boden (opak) | 0,25 | 0,30 | 0,15 / 0,20 |
| opake Bauteile mit Flächenheizung | 0,25 | 0,28 | 0,15 / 0,20 |
| Fenster, Fenstertüren, Türen | 1,3 | 1,6 | Fenster 0,90/1,1; Türen 1,1/1,3 |
| Fenster mit vorgelagerten Heizkörpern | 1,0 | 1,3 | 0,80 / 1,0 |
| Tore | 1,7 | 2,0 | 1,2 / 1,4 |
| Storenkasten | 0,50 | 0,50 | 0,30 |

Zielwerte: Kanton TG SR 731.11 Anhang 1b (https://www.rechtsbuch.tg.ch/frontend/structured_documents/5360/download_pdf_annex?locale=de). Zusammenfassend in [GPM-ZH] S. 124, Tab. 17: Neubau mit WB-Nachweis 0,20 / ohne 0,17; Zielwert SIA 380/1 Dach 0,09, Wand 0,11, Boden 0,11, Fenster 0,90; Minergie-Standardlösung 0,15 / Fenster 1,0; Sanierung MuKEn08 0,25 / Fenster 1,3; Sanierung Zielwert 0,15 / Fenster 0,90.

### 2.5 SIA 380/1:2016 (MuKEn 2014; «aktuelle Fassung»)

Neubau (Tabelle 1 [EN-102-2016] S. 7; [MuKEn14] Anhang 1; [ZG-Anh] Beilage 1; [ZH-Anf16] Tab. 2; [HSLU-2016] S. 16 Tab. 6):

| Bauteil | Aussenklima / <2 m Erdreich | unbeheizt / >2 m Erdreich |
|---|---|---|
| opake Bauteile (Dach, Decke, Wand, Boden) | 0,17 | 0,25 |
| Fenster, Fenstertüren | 1,0 | 1,3 |
| Türen | 1,2 | 1,5 |
| Tore (SIA 343) | 1,7 | 2,0 |
| Storenkasten | 0,50 | 0,50 |

Umbau/Umnutzung (Tabelle 3 [EN-102-2016] S. 9; [MuKEn14] Anhang 2; [TG-Umbau]; [ZH-Anf16] Tab. 3):

| Bauteil | Aussenklima / <2 m | unbeheizt / >2 m |
|---|---|---|
| opake Bauteile | 0,25 | 0,28 |
| Fenster, Fenstertüren | 1,0 | 1,3 |
| Türen | 1,2 | 1,5 |
| Tore | 1,7 | 2,0 |
| Storenkasten | 0,50 | 0,50 |

Wärmebrücken Neubau (nur Neubau): Typ 1 0,30; Typ 2 0,20; Typ 3 0,20; Typ 5 (Fensteranschlag) 0,15 W/(mK); punktuell 0,30 W/K ([EN-102-2016] S. 8; [ZG-Anh] Beilage 1). 2016 entfällt die Unterscheidung mit/ohne WB-Nachweis ([TG-Schulung] S. 5: «neu 0.17 … bisher 0.20»; Fenster 1,0 bisher 1,3; Türen 1,2 bisher 1,3; Tore 1,7). Zielwerte prSIA 380/1 (2016): opake Bauteile 0,10; Fenster/Türen/Tore 0,80 ([HSLU-2016] S. 17, Tab. 8). Fenster-Zielwert 0,80 auch in [MBF-2021] S. 4.

Obere Grenze Behaglichkeit SIA 180:2014 (Maximalwerte): Dach 0,4 / 0,5 / 0,6; Wand 0,4 / 0,6 / 0,6; Fenster/Türen/Tore 2,4 / 2,4 / –; Boden 0,3 / 0,6 / 0,6 (Aussenklima / unbeheizt / >2 m Erdreich) ([HSLU-2016] S. 16, Tab. 7).

### 2.6 Übersicht Entwicklung (opake Bauteile gegen Aussenklima, Neubau)

| Ausgabe | opak aussen | opak unbeheizt/Erdreich | Fenster | Quelle |
|---|---|---|---|---|
| 1988 (ZH-Vollzug 1991) | Dach 0,3 / Wand+Boden 0,4 | 0,3 / 0,4 | 2,2 (unbeheizt 3,0) | [ZH-WDV91] |
| 2001 | 0,30 | 0,40 | 1,7 | [SIA2007-Vorwort] |
| 2007 | 0,25 | 0,30 | 1,5 | [SIA2007-Vorwort] |
| 2009 | 0,20 (mit WB) / 0,17 (ohne) | 0,25 Dach, 0,28 Wand/Boden | 1,3 | [EN-2-2013], [AG-Anh] |
| 2016 | 0,17 | 0,25 | 1,0 (Türen 1,2) | [EN-102-2016], [MuKEn14] |

---

## 3. Fenstergenerationen Schweiz

### 3.1 Tabelle 5 «Uw-Werte von älteren Fenstern» [MBF-2021] S. 9 (Normfenster; «Ohne detaillierte Angaben sind diese Werte beim Beurteilen von bestehenden Bauten einzusetzen»)

| Bezeichnung / Periode | Verglasung | Ug | g (%) | Uw bei Uf = 1,4 | Uf = 1,9 | Uf = 2,5 | Uf = 3,3 |
|---|---|---|---|---|---|---|---|
| Winterfenster Altbauten | Doppelverglasung mit Luftzwischenraum > 7 cm | 2,7 | 75 | 2,5 | 2,6 | 2,6 | 3,5 |
| DV bis 1980 | Doppelverglasung | 2,7 | 75 | 2,5 | 2,6 | 2,6 | 3,5 |
| 2-IV bis 1990 a) Luft | Isolierverglasung, SZR > 12 mm | 2,9 | 75 | 2,7 | 2,8 | 3,0 | 3,5 |
| 2-IV bis 1990 b) Argon | dito | 2,7 | 75 | 2,6 | 2,7 | 2,8 | 3,0 |
| 3-IV bis 1990 a) Luft | 3-fach-Isolierverglasung, 2 SZR > 9 mm | 2,0 | 70 | 2,0 | 2,1 | 2,3 | 2,5 |
| 3-IV bis 1990 b) Argon | dito | 1,9 | 70 | 1,9 | 2,0 | 2,2 | 2,4 |
| 2-IV-IR ab 1990 | Wärmeschutzglas, SZR > 10 mm, 1 selektive Schicht, Argon | 1,8 | 62 | 1,9 | 2,0 | 2,2 | 2,4 |
| | | 1,6 | 62 | 1,7 | 1,8 | 2,0 | 2,2 |
| | | 1,4 | 62 | 1,6 | 1,7 | 1,9 | 2,1 |
| | | 1,3 | 62 | 1,5 | 1,6 | 1,8 | 2,0 |
| 3-IV-IR ab 1990 | Wärmeschutzglas 2 SZR > 9 mm, 1 selektive Schicht, Argon | 1,5 | 60 | 1,7 | 1,8 | 1,9 | 2,1 |
| | | 1,4 | 60 | 1,6 | 1,7 | 1,8 | 2,0 |
| | | 1,2 | 60 | 1,4 | 1,6 | 1,7 | 1,9 |
| | | 1,1 | 60 | 1,3 | 1,5 | 1,6 | 1,8 |
| 3-IV-IR-IR ab 1990 | Wärmeschutzglas 2 SZR > 9 mm, 2 selektive Schichten, Argon | 1,2 | 45 | 1,5 | 1,6 | 1,7 | 1,9 |
| | | 1,1 | 45 | 1,4 | 1,5 | 1,6 | 1,8 |
| | | 0,9 | 45 | 1,2 | 1,4 | 1,5 | 1,7 |
| | | 0,8 | 45 | 1,1 | 1,3 | 1,4 | 1,6 |

Einfachverglasung fehlt in Tab. 5 (nicht belegt via EnFK). Andere Quellen: Einfachverglasung Ug 5,8 ([Bern-DP]); Einfachglas-Fenster Uw 5 W/m²K «bis Mitte der 60er Jahre» ([eREN] S. 12); U-Wert Einfachverglasung 5,0 ([GEAK-Typ] S. 5).

### 3.2 Rahmen-U-Werte Uf (Rechenwerte ohne Nachweis)

| Rahmenmaterial | Uf ältere Fenster [MBF-2021] S. 9 Tab. 6 | Uf [BTK-San] 2002 S. 64 | Uf-Spanne [GEAK-Typ] S. 5 |
|---|---|---|---|
| Holz / Holz-Metall | 1,4 | 1,9 | Holz 1,2–1,8; Holz-Metall 1,3–2,0 |
| Kunststoff (PVC) | 1,9 | 2,5 | 1,1–1,8 |
| wärmegedämmte Verbundprofile (Metall) | 2,5 | 3,3 | Metall 1,8–3,0 |
| Metallprofile (ohne thermische Trennung) | 3,3 | – | – |

### 3.3 Neue Fenster (Tab. 7 [MBF-2021] S. 9): 3-IV-IR-IR Ug 0,7 (g 50 %) → Uw 0,9 / 0,9 / 1,0 / 1,1 bei Uf 1,0 / 1,2 / 1,4 / 1,7; Ug 0,5 → Uw 0,7 / 0,8 / 0,8 / 0,9. Beispiel Uw ≤ 1,0 mit Glasanteil 75 %: Ug ≤ 0,7, Uf ≤ 1,4, ψg ≤ 0,045 ([MBF-2021] S. 4).

### 3.4 Glasrandverbund ψg (W/mK), [MBF-2021] S. 10, Tab. 8/9 (Quelle EN ISO 10077-1:2017)

| Rahmen | thermisch verbesserter Abstandhalter: Ug 1,9–3,0 / Ug 0,5–1,8 | Aluminium-Abstandhalter: Ug 1,9–3,0 / 0,5–1,8 |
|---|---|---|
| Holz/Kunststoff | 0,05 / 0,06 | 0,06 / 0,08 |
| Metall mit thermischer Trennung | 0,06 / 0,08 | 0,08 / 0,11 |
| Metall ohne thermische Trennung | 0,01 / 0,04 | 0,02 / 0,05 |

Ältere ψg-Werte für Alu-Abstandhalter (2IV Ug<1,4: 0,07/0,11 je nach Uf ≤/> 2,1 usw.): [BTK-San] S. 64, Tab. 4.

### 3.5 Generationen-Übersicht (Verglasung) [GEAK-Typ] S. 5

| Generation | U (Glas) | g | Typische Periode (Quelle) |
|---|---|---|---|
| Einfachverglasung | 5,0 | 75 % | bis Mitte 1960er ([eREN] S. 12) |
| Doppelverglasung (Kasten-/Vor-/Verbundfenster) | 2,7 … 3,0 | 50–65 % | Kastenfenster/Vorfenster «bis Ende der 20er Jahre», Doppel-/Verbundfenster ab Mitte 1940er ([eREN] S. 12); «DV bis 1980» ([MBF-2021]) |
| 2-fach Isolierverglasung (unbeschichtet) | 1,0 … 1,8 (GEAK) bzw. Ug 2,7–2,9 ([MBF-2021]) | 45–60 % | ab 1970er «Uw ca. 2.9» ([eREN] S. 12); «bis 1990» ([MBF-2021]); Luft-Isolierglas 2,8 ([BFE-Fenster04] S. 2) |
| 2-fach Wärmeschutz Low-E | Ug 1,3–1,8 ([MBF-2021]); 1,2–0,8 ([BFE-Fenster04]) | 62 % | «ab 1990» ([MBF-2021]; [eREN]: selektive Schichten «erst in den 90er Jahren», Uw ca. 1,3) |
| 3-fach Wärmeschutz | 0,5 … 1,1 (GEAK); Ug 0,5–0,7 neu ([MBF-2021] S. 9, 15) | 45–66 % | Förderschwelle Gebäudeprogramm 2010: Ug ≤ 0,7 «nur Dreifachverglasung» ([Beobachter10], B. Rudin FFF) |

Hinweis: Herstellerquellen (4B, EgoKiefer, swisswindows) und FFF-Dokumente mit Periodenangaben wurden nicht gefunden → nicht belegt.

### 3.6 Türen (nicht verglast), [BTK-San] S. 67

| Nr. | Aufbau | U |
|---|---|---|
| T1 | Spanplatte 20 mm / Dämmschicht 30 mm / Täferaufdopplung 21 mm | 1,1 |
| T2 | Spanplatte 22 mm / Dämmschicht 10 mm / Täfer 21 mm | 1,6 |
| T3 | Fichte massiv verleimt 40 mm | 2,2 |
| T4 | Eiche massiv verleimt 40 mm | 2,8 |
| T5 | Spanplatte 40 mm, beidseitig Alu beschichtet | 2,5 |
| T6 | Aluminiumblech beidseitig / Dämmschicht 20 mm | 2,1 |
| T7 | Aluminiumblech beidseitig / Dämmschicht 40 mm | 1,3 |
| T8 | Furnier, Dünnspanplatte, Alublech beidseitig, Spanplatte 40 mm | 1,6 |
| T9 | dito mit Spanplatte 16 mm beidseitig + Dämmschicht 18 mm | 1,1 |
| T10–12 | Innentüren: gestemmt 36 mm 2,9; Hohltüre 40 mm 2,0; Volltüre 40 mm 2,2 | – |

---

## 4. Wärmeleitfähigkeit λ (Bemessungswerte)

### 4.1 Baustoffe – «Tabelle 2, Auszug aus Dokumentation SIA D0170» [BTK-San] S. 13 (Rohdichte kg/m³ → λ W/(mK))

| Stoff | Rohdichte | λ |
|---|---|---|
| Modulbackstein Einstein | 1100 | 0,44 |
| Modulbackstein Verband | 1100 | 0,37 |
| Isolierbackstein | 1200 | 0,47 |
| Sichtbackstein | 1400 | 0,52 |
| Kaminstein | 1800 | 0,80 |
| Kalksandstein | 1600 / 1800 / 2000 | 0,80 / 1,00 / 1,10 |
| Zementstein | 2000 | 1,10 |
| Zementblockstein | 1200 | 0,70 |
| Porenbetonstein | 300 / 400 / 500 / 600 | 0,10 / 0,13 / 0,16 / 0,19 |
| Kristalliner Naturstein | 2800 | 3,5 |
| Sediment-Naturstein | 2600 | 2,3 |
| Basalt / Granit / Marmor / Schiefer / Sandstein (Quarzit) | 2700–3000 / 2500–2700 / 2800 / 2000–2800 / 2600 | 3,5 / 2,8 / 3,5 / 2,2 / 2,3 |
| Erdreich: Ton/Schlick/Schlamm | 1200–1800 | 1,5 |
| Erdreich: Sand und Kies | 1700–2200 | 2,0 |
| Beton mittlere Rohdichte | 1800 / 2000 / 2200 | 1,15 / 1,35 / 1,65 |
| Beton hohe Rohdichte | 2400 | 2,00 |
| Beton armiert 1 % / 2 % Stahl | 2300 / 2400 | 2,3 / 2,5 |
| Innenputz (normale Berechnungen) | 1400 | 0,70 |
| Aussenputz (normale Berechnungen) | 1800 | 0,87 |
| Wärmedämmputz aussen | 300 / 450 | 0,08 / 0,14 |
| Kalkmörtel / Kalkzementmörtel / Zementmörtel | 1800 / 1900 / 2200 | 0,87 / 1,00 / 1,40 |
| Gipsdämmputz / Gipsputz | 600 / 1000 / 1300 | 0,18 / 0,40 / 0,57 |
| Gips | 600 / 900 / 1200 / 1500 | 0,18 / 0,30 / 0,43 / 0,56 |
| Gipskartonplatten | 900 | 0,25 |
| Nutzholz | 500 / 700 | 0,13 / 0,18 |
| Holzfaserplatte | 250 / 400 / 600 / 800 | 0,07 / 0,10 / 0,14 / 0,18 |
| Spanplatte | 300 / 600 / 900 | 0,10 / 0,14 / 0,18 |
| Zementgebundene Spanplatte | 1200 | 0,23 |
| Keramik / Porzellan (Platten) | 2300 | 1,3 |
| Kunststoff (Platten) | 1000 | 0,20 |
| PVC | 1390 | 0,17 |
| Glas (Floatglas) | 2500 | 1,00 |
| Stahl / nichtrostender Stahl / Aluminium | 7800 / 7900 / 2800 | 50 / 17 / 160 |

Beispiel-Rechenwerte in Katalogbeispielen: Zementüberzug (Zementestrich) λ 1,4 ([BTK-San] S. 17, Beispiel 2: «Zementüberzug 0.05 / 1.4»); Beton 2,3 bzw. 1,8 (S. 17); Keramikplatten 1,3 (S. 19); Schutzschicht Sand/Kies 2,0 (S. 18). Bei Fussbodenheizung werden Bodenbelag und Unterlagsboden in der U-Wert-Berechnung nicht mitgerechnet ([BTK-San] S. 15, 17; [LU-C] Folie 9: Rsi = 0).

**Nicht belegt:** Anhydritestrich, Schlacke(nfüllung) als λ-Wert (nur als Bauteil-U-Wert 0,9 belegt), Bodenbeläge Parkett/Linoleum/Teppich, Kork als Baustoff (nur als Dämmstoff, s. u.).

### 4.2 Dämmstoffe – «Tabelle 1, Auszug aus Vornorm SIA 279» [BTK-San] S. 12 (Nennwert λD überwacht typ. Bereich / nicht überwacht)

| Dämmstoff | Rohdichte | λ überwacht (typ.) | λ nicht überwacht |
|---|---|---|---|
| Glaswolle Platten/Matten/Rollen | 10–120 | 0,031–0,048 | 0,055 |
| Glaswolle lose | 30–100 | – | 0,060 |
| Steinwolle Platten/Matten/Rollen | 15–200 | 0,034–0,048 | 0,055 |
| Steinwolle lose | 30–100 | – | 0,060 |
| Schaumglas Platten | 100–150 | 0,040–0,055 | 0,064 |
| Schaumglas lose (Schotter) | 250–450 | – | 0,094 |
| Perlit, Vermiculit lose | 50–130 | – | 0,084 |
| EPS | 30–15 (sic) | 0,032–0,042 | 0,048 |
| XPS, Zellinhalt wärmedämmrelevant | 25–65 | 0,028–0,036 | 0,043 |
| XPS, Zellinhalt Luft | 25–65 | 0,034–0,038 | 0,046 |
| PUR/PIR Pentan diffusionsdicht | 28–55 | 0,022–0,027 | 0,032 |
| PUR/PIR Pentan diffusionsoffen | 28–55 | 0,026–0,033 | 0,037 |
| PUR/PIR CO2 | 35–60 | 0,032–0,038 | 0,045 |
| Kork Platten/Matten | 90–160 | 0,040–0,047 | 0,056 |
| Holzwolle Platten | 30–150 | 0,067–0,089 | 0,107 |
| Holzwolle-Leichtbauplatten | 250–450 | – | 0,095 |
| Holzfaserdämmplatten | 120–300 / 300–600 | 0,044–0,065 / – | 0,080 / 0,110 |
| Zellulose Platten / lose | – / 30–80 | – | 0,065 / 0,060 |
| Flachsfaserplatten / Schilfrohr / Kokosfaser / Baumwolle / Schafwolle | 25–35 / 150–200 / 50–100 / >25 / 20–60 | – | 0,055 / 0,072 / 0,066 / 0,055 / 0,055 |

Praxisregeln: unbekannter Dämmstoff im Bestand → 0,040 ([BTK-San] S. 17) bzw. 0,05 W/(mK) (Kanton LU, [LU-C] Folie 7; Glaswolle «nicht überwacht» gemäss SIA 279: 0,05, Folie 8). Standard-Dämmstoff heute 0,035; PUR-Alu 0,025; Zellulose/Holzfaser 0,045 ([VS-Grundl]). Aktuelle Produktwerte: Merkblatt SIA 2001 (Excel, sia.ch) ([LU-C] Folie 5).

---

## 5. Wärmeübergangswiderstände und Erdreich

### 5.1 Rsi / Rse

| Fall | Rsi | Rse | Quelle |
|---|---|---|---|
| Standard (SIA 180:2014 Ziff. 4.2.3.1) | 0,13 m²K/W | 0,04 m²K/W | [LU-C] Folie 9; [BTK-San] S. 11 (hi = 8, he = 25 W/(m²K)); [swisspor-FR] S. 5 |
| Bauteile im Erdreich | – | 0 | [LU-C] Folie 9; [BTK-San] S. 11 |
| hinterlüftet verkleidete Aussenbauteile | – | 0,13 (= Rsi) | [LU-C] Folie 9; [BTK-San] S. 15 |
| Bauteil gegen unbeheizt (Katalog) | 0,13 | 0,13 | [BTK-San] S. 17 (Beispiel 2, Fussnote 3) |
| Bodenheizung | 0 | – | [LU-C] Folie 9 (SIA 380/1 Ziff. 3.5.4.1) |
| ISO 6946:2017 Tab. 5 «conventional values» | 0,1 bis 0,2 (Bereich) | 0,04 | [ISO6946-17s] S. 13 (Tab. 5; Richtungswerte in 6.8/Annex C, nicht im Sample) |
| Richtungsabhängig (ISO 6946): aufwärts / horizontal / abwärts | 0,10 / 0,13 / 0,17 | 0,04 / 0,04 / 0,04 | Sekundärquellen: ravagobuildingsolutions.com/hu/en/knowledgebase/heat-transfer-coefficient (ohne Normzitat); studyflix.de (nennt DIN EN ISO 6946: Rsi aufwärts 0,10, horizontal 0,13, abwärts 0,17; Rse 0,04; Erdreich 0); spanische UPV-Tabelle «UNE EN ISO 6946:1997» (0,10 / 0,13 / 0,17; Rse 0,04). **Normtext selbst nicht öffentlich → «belegt nur sekundär».** |
| Luftschichten ruhend (Rg, m²K/W), Dicke 5/10/25/50/100 mm: aufwärts 0,11/0,15/0,16/0,16/0,16; horizontal 0,11/0,15/0,18/0,18/0,18; abwärts 0,11/0,15/0,19/0,21/0,22 | | | [BTK-San] S. 14, Tab. 3 |
| Umkehrdach-Zuschlag | +20 % Dämmdicke ([BTK-San] S. 15) bzw. +30 % U-Wert ohne Nachweis nach ISO 6946 Anhang D.4 ([LU-C] Folie 12) | | |
| Horizontale/geneigte Verglasung: Ug-Erhöhung 20–50 %; Beispiel 3-fach Ug 0,5 bei 90° → 0,8 bei 0°; 0,7 → 0,9; 0,9 → 1,2 | | | [LU-C] Folie 18–19 |

### 5.2 U_equiv Bodenplatte / Keller nach B' (SIA 384/2 Anhang B, EN 12831, ISO 13370)

**SIA 384.201 / SIA 384/2 Anhang B: nicht öffentlich zugänglich → nicht belegt.** EN 12831:2003 Tabellen Uequiv,bf (nach B' und Ubf) und ISO 13370-Tabellen: Normtext hinter Paywall; keine öffentliche Reproduktion gefunden → **nicht belegt**. Verfügbare Teilbelege:

| Aussage | Wert | Quelle |
|---|---|---|
| EN 12831-Beispiel: rechnerischer U Bodenplatte 1,0 W/(m²K), B' = 4 m → Uequiv direkt auf Erdreich 0,45; in 1,5 m Tiefe 0,38; in 3,0 m Tiefe 0,33 | s. links | [SBZ-2013] S. 17–18 (aus Diagramm der Norm abgelesen) |
| DIN/TS 12831-1:2020 Beispiel: U_Boden 0,58, ΔU_TB 0,05, B' = A_g/(0,5·P) = 24,77/(0,5·11,35) = 4,36 m, z = 0 → Uequiv = 0,37 W/(m²K); f_θann = 1,45; f_GW = 1,0 (Grundwasser > 1 m) | s. links | [Beuth-Errata] S. 97–98 |
| Default-Tabelle Bodenplatte ungedämmt (Altersbänder A–E), auf ISO-13370-Basis, nach P/A: 0,1 → 0,27; 0,2 → 0,46; 0,3 → 0,61; 0,4 → 0,73; 0,5 → 0,84; 0,6 → 0,94; 0,7 → 1,02; 0,8 → 1,10; 0,9 → 1,16; ≥1,0 → 1,23 W/(m²K) | s. links | [DEAP-IE] (irische Konvention; P/A = 2/B'; Randbedingungen λ_Erdreich/Wanddicke nicht auf der Seite angegeben) |
| Katalog-Pauschale: Betonbodenplatte ungedämmt gegen Erdreich «U-Wert ca. 4.5» (ohne Erdreichkorrektur, Rse = 0) | 4,5 | [BTK-San] S. 30 |
| SIA 380/1-Regel: Bauteile < 2 m im Erdreich wie gegen Aussenklima; > 2 m wie gegen unbeheizt (Figur 2 SIA 380/1) | – | [LU-C] Folie 25 |

---

## Nicht belegt / Unsicherheiten

1. **GEAK-Tool-Standardwerte vollständig nach Bauperiode** (offizielle Dokumentation «GEAK Berechnungshilfen» mit Dach/Boden/Fenster je Baujahr): nicht gefunden. Belegt sind nur die GEAK-Schulungsfolie [GEAK-Typ] (Fenster/Wand/Dach, 4 Zeitpunkte) und die Aussenwand-Grafik in [BFE-UFELD]. Die Aussenwand-Werte vor 1975 (1,3/1,4/2,0) sind teilweise **aus einer Grafik abgelesen**. Die «Normierung des GEAK» (2024) enthält keine Bauteil-Standardwerte nach Baujahr, nur Beurteilungsklassen.
2. **Böden gegen Erdreich, Kellerdecken und Aussentüren nach Bauperiode**: keine Schweizer Quelle mit Periodenzuordnung gefunden. Verwendbar sind nur die Katalog-«ca.»-Werte [BTK-San] (ohne Periode) plus die Bauhistorie [eREN] (qualitativ).
3. **Perioden-Zuordnung der Katalogaufbauten** in Abschnitt 1.4/1.7 ist eine Interpretation (basierend auf [eREN] S. 10–12 für die Westschweiz); für die Deutschschweiz nennt [eREN] nur das Zweischalenmauerwerk «gegen 1945».
4. **UFELD-Schlussbericht** (hässig sustech, aramis ProjectID 37271) selbst nicht erreichbar; nur BFE-Fachbeitrag. Ob GEAK die Werte 1,0/0,6 übernommen hat: unbekannt.
5. **SIA 380/1:1988 Originalwerte**: nur indirekt über ZH-WDV 1991 belegt. **SIA 380/1:2001**: Flächenheizung, Türen, unbeheizt-Fenster nicht belegt; nur 0,30 / 0,40 / 1,7 (Vorwort 2007). **2007**: nur opak 0,25/0,30, Fenster 1,5, Storenkasten 0,6 belegt.
6. **Fenstergenerationen**: Hersteller-/FFF-Dokumente mit Einbauperioden nicht gefunden. Periodenzuordnung beruht auf [MBF-2021] («bis 1980», «bis 1990», «ab 1990»), [eREN] und GEAK-Folie. Einfachverglasung in Tab. 5 des EnFK-Merkblatts nicht enthalten.
7. **λ-Werte**: Quelle [BTK-San] ist Stand 2001/2002 (SIA D0170 / SIA 279:2000). Die aktuelle SIA 381/1 bzw. SIA 2001 (Excel) wurden nicht gelesen (nicht frei zugänglich). Anhydritestrich, Schlacke, Bodenbeläge (Parkett, Linoleum, Teppich): nicht belegt. Spalte «Rohdichte EPS 30–15» ist so gedruckt (Druckfehler in der Quelle).
8. **ISO 6946 richtungsabhängige Rsi** (0,10/0,13/0,17): Normtext nicht zugänglich; nur Sekundärquellen (ravago, studyflix, UPV-Tabelle «UNE EN ISO 6946:1997»). Das ISO-Sample bestätigt nur Rse = 0,04 und Rsi-Bereich 0,1–0,2.
9. **U_equiv-Tabellen** (SIA 384/2 Anhang B, EN 12831 Tab., ISO 13370): nicht belegt (Paywall). Nur Einzelbeispiele ([SBZ-2013], [Beuth-Errata]) und eine irische Default-Tabelle ([DEAP-IE]) ohne Angabe der Randbedingungen.
10. Ablesungen aus Diagrammen ([BFE-UFELD] S. 2; [eREN] S. 27) sind mit ±0,1 W/(m²K) Unsicherheit behaftet und entsprechend gekennzeichnet.
11. Mehrere endk.ch-/Gesetzessammlungs-PDFs liessen sich nicht per curl herunterladen (HTML statt PDF); sie wurden per WebFetch gelesen. Dadurch sind bei [EN-2-2013] und [AG-Anh] Zeilen «Wand/Boden ohne WB-Nachweis» teils aus zwei Quellen abgeglichen (0,17 / 0,25) — konsistent, aber nicht aus einem Original-PDF-Textlayer verifiziert.
