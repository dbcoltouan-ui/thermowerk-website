# Recherche: Normwärmeleistung Plattenheizkörper (EN 442, 75/65/20 °C) in W/m

Abrufdatum aller Quellen: **2026-10-29**. Alle Zahlen sind aus den heruntergeladenen PDFs per `pdftotext` extrahiert (Rohdateien unter `(lokale PDF-Kopien nicht im Repo)`). Nichts aus dem Gedächtnis; fehlende Werte sind als «nicht belegt» (n. b.) markiert.

Konventionen:
- Typen nach DIN/EN-Bezeichnung: 10 (1 Platte, ohne Konvektor), 11 (1 Platte, 1 Konvektor), 20 (2 Platten, ohne Konvektor), 21 (2 Platten, 1 Konvektor; bei Purmo/Radson/V&N/Brugman als «21s/21 K-S» = schmale Bauart), 22 (2 Platten, 2 Konvektoren), 30 (3 Platten, ohne Konvektor), 33 (3 Platten, 3 Konvektoren). Kermi führt zusätzlich Typ 12 (2 Platten, 1 Konvektor, Bautiefe 64 mm) und bezeichnet Hygiene-Typen als 10/20/30.
- φ(75/65/20) in W je Meter Baulänge. Wo das Datenblatt W/m direkt ausweist, steht «W/m direkt». Wo nur Leistungen je Heizkörper gelistet sind, ist die Zeile Baulänge 1000 mm verwendet (= W/m, Längenbasis 1000 mm); das ist vermerkt.
- n = Heizkörperexponent laut Datenblatt.

---

## 1. Buderus – Logatrend C-Profil.2 (VC-Profil.2 / VCM-Profil.2 gleiche Daten)

Quelle: Buderus «Planungsunterlage Heizkörper/Badheizkörper Logatrend | Logatrend Therm», Dok.-Nr. 6721814245 (2025/09), Mirror: https://www.haustechnikmarkt24.de/media/pdf/heizkoerper/buderus-planungsunterlage-flachheizkoerper.pdf — Tab. 5 «Technische Daten der Flachheizkörper Logatrend C-Profil.2» auf **PDF-Seite 13** (Katalogseite 13); Bautiefen Tab. 3 auf PDF-Seite 7. Fußnote 2 auf S. 13: «Normwärmeleistung nach DIN EN 442 = Wärmeleistung bei 75/65/20 °C. Prüfstellennummer 1015.» Werte sind **W/m direkt**.

Bauhöhen im Programm: 300, 400, 500, 600, 900 (kein 750/200/1000).

### φ 75/65/20 [W/m]

| Typ | 300 | 400 | 500 | 600 | 750 | 900 |
|---|---|---|---|---|---|---|
| 10 | 330 | 423 | 514 | 604 | n. b. (nicht im Programm) | 875 |
| 11 | 549 | 708 | 858 | 1002 | – | 1394 |
| 20 | 590 | 746 | 897 | 1043 | – | 1463 |
| 21 | 745 | 937 | 1117 | 1288 | – | 1754 |
| 22 | 966 | 1216 | 1452 | 1679 | – | 2313 |
| 30 | 858 | 1072 | 1279 | 1482 | – | 2084 |
| 33 | 1379 | 1738 | 2079 | 2406 | – | 3328 |

### Exponent n (je Typ und Höhe, S. 13)

| Typ | 300 | 400 | 500 | 600 | 900 |
|---|---|---|---|---|---|
| 10 | 1,3319 | 1,3193 | 1,3068 | 1,2942 | 1,3083 |
| 11 | 1,3156 | 1,3140 | 1,3123 | 1,3107 | 1,3206 |
| 20 | 1,3018 | 1,3072 | 1,3127 | 1,3181 | 1,3058 |
| 21 | 1,3197 | 1,3238 | 1,3278 | 1,3319 | 1,3578 |
| 22 | 1,3297 | 1,3316 | 1,3334 | 1,3353 | 1,3574 |
| 30 | 1,3037 | 1,3124 | 1,3312 | 1,3299 | 1,3355 |
| 33 | 1,2977 | 1,3129 | 1,3282 | 1,3434 | 1,3626 |

### Kontrollwerte 70/55/20 und 55/45/20 [W/m] (S. 13; kein 45/35)

| Typ | 300: 70/55 / 55/45 | 400 | 500 | 600 | 900 |
|---|---|---|---|---|---|
| 10 | 266 / 167 | 341 / 216 | 416 / 264 | 489 / 312 | 707 / 449 |
| 11 | 443 / 280 | 572 / 362 | 693 / 439 | 810 / 513 | 1125 / 710 |
| 20 | 477 / 303 | 603 / 383 | 725 / 459 | 842 / 532 | 1183 / 751 |
| 21 | 601 / 380 | 756 / 476 | 900 / 567 | 1037 / 652 | 1407 / 877 |
| 22 | 778 / 490 | 979 / 616 | 1169 / 735 | 1351 / 849 | 1855 / 1156 |
| 30 | 694 / 441 | 866 / 548 | 1032 / 651 | 1194 / 751 | 1677 / 1053 |
| 33 | 1117 / 711 | 1404 / 889 | 1675 / 1055 | 1934 / 1211 | 2667 / 1659 |

Bautiefen C-Profil.2 (Tab. 3, PDF-S. 7): Typ 10: 60, 11: 63, 20: 66, 21: 66, 22: 100, 30: 155, 33: 155 mm. (C-Plan.2 jeweils +2 mm.)

Bemerkung: Die Tabelle gibt zudem den Koeffizienten KM je Typ/Höhe (Φ = KM·ΔT^n), z. B. Typ 22/600: 9,04516. Nicht hier übertragen, in der PDF S. 13 vorhanden.

---

## 2. Kermi – therm-x2 Profil-K / Profil-V / Profil-VM (Typ 10, 11, 12, 22, 33) und Profil-K Hygiene (Typ 10, 20, 30)

### 2a. Profil-K/V/VM (Standardprogramm)

Quelle A (Kermi, polnische Technik-Ausgabe 2017, Originaldokument «Kermi_HKE_Polen_FHK_Technik_2017»): http://sankom.pl/download/dk/documentation/kermi/grzejniki/kiti_fhk_technik_2017_pl.pdf — «Zarejestrowane parametry mocy cieplnych therm-x2 Profil-K / Profil-V / Profil-VM» auf **PDF-Seite 24** (Katalogseite 22); W/m-Tabelle für 70/55, 55/45, 45/40 auf PDF-Seite 26; Bautiefen PDF-Seite 16.
Quelle B (Kermi, französischer Technik-Katalog, ModDate 2018): https://www.kamody.cz/soubory/relatedfile/FR-KERMI-catalogue_technique.pdf — «Performances enregistrées Therm X2 Profil-K/-V/-VM» **PDF-Seite 28** (Katalogseite 26); W/m bei 70/55, 55/45, 45/40 PDF-Seite 30 (Katalogseite 28); Bautiefen PDF-Seite 14.
Beide Quellen stimmen für 300–900 mm exakt überein (Typ 33 in Quelle B abweichend, s. Unsicherheiten). Werte sind **W/m direkt** («φSL = Norm-Wärmeleistung bezogen auf 1 m Baulänge, nach DIN EN 442 bei 75/65/20 °C»).

Ein deutsches Kermi-Datenblatt des Standard-Profil-K konnte nicht als PDF abgerufen werden (kermi.com-Downloadcenter lädt dynamisch); deutsche Belege nur für Hygiene (2b) und Austauschheizkörper (unten).

### φ 75/65/20 [W/m] – Profil-K/V/VM (Quelle A, PDF-S. 24)

| Typ | 200 | 300 | 400 | 500 | 600 | 750 | 900 |
|---|---|---|---|---|---|---|---|
| 10 | – | 335 | 425 | 514 | 602 | 736 | 872 |
| 11 | – | 551 | 697 | 840 | 979 | 1185 | 1390 |
| 12 | – | 720 | 894 | 1063 | 1229 | 1475 | 1723 |
| 21 | n. b. (Kermi führt Typ 12 statt 21) | | | | | | |
| 22 | 678 | 959 | 1207 | 1441 | 1666 | 1987 | 2295 |
| 33 | 998 | 1300 | 1633 | 1944 | 2236 | 2645 | 3023 |

### Exponent n (Quelle A, PDF-S. 24)

| Typ | 200 | 300 | 400 | 500 | 600 | 750 | 900 |
|---|---|---|---|---|---|---|---|
| 10 | – | 1,2361 | 1,2550 | 1,2739 | 1,2928 | 1,2932 | 1,2935 |
| 11 | – | 1,2196 | 1,2371 | 1,2546 | 1,2721 | 1,2833 | 1,3044 |
| 12 | – | 1,2731 | 1,2810 | 1,2889 | 1,2969 | 1,3156 | 1,3343 |
| 22 | 1,2828 | 1,2776 | 1,2827 | 1,2879 | 1,2930 | 1,3000 | 1,3069 |
| 33 | 1,2850 | 1,2671 | 1,2736 | 1,2801 | 1,2866 | 1,2967 | 1,3068 |

Hinweis: Quelle B (FR, 2018) gibt für Typ 33 andere Werte: 300: 1381 W/m (n 1,2839), 400: 1744 (1,29), 500: 2081 (1,2962), 600: 2394 (1,3023), 750: 2645 (1,2967), 900: 3214 (1,329). Für 750 mm identisch, sonst höher → vermutlich Typ-33-Variante mit anderem Zulassungsstand (siehe Unsicherheiten).

### Kontrollwerte W/m bei Raumtemperatur 20 °C (Quelle A, PDF-S. 26; «w watach na metr»; keine 45/35, dafür 45/40)

| Typ | 300: 70/55 / 55/45 / 45/40 | 400 | 500 | 600 | 750 | 900 |
|---|---|---|---|---|---|---|
| 10 | 272 / 177 / 125 | 344 / 222 / 156 | 414 / 266 / 186 | 483 / 309 / 214 | 591 / 377 / 262 | 700 / 447 / 310 |
| 11 | 448 / 293 / 208 | 565 / 368 / 259 | 679 / 439 / 308 | 789 / 507 / 354 | 952 / 609 / 423 | 1114 / 708 / 490 |
| 12 | 580 / 373 / 260 | 719 / 461 / 321 | 854 / 546 / 379 | 986 / 629 / 436 | 1180 / 747 / 515 | 1374 / 865 / 593 |
| 22 | 772 / 496 / 345 | 971 / 622 / 433 | 1158 / 741 / 515 | 1338 / 854 / 593 | 1594 / 1015 / 703 | 1839 / 1168 / 808 |
| 33 | 1049 / 675 / 472 | 1316 / 846 / 590 | 1565 / 1003 / 699 | 1798 / 1150 / 800 | 2123 / 1353 / 938 | 2422 / 1539 / 1064 |
| 22 (200 mm) | 545 / 349 / 243 | | | | | |
| 33 (200 mm) | 803 / 514 / 357 | | | | | |

Kontrolle: Die Kermi-Umrechnungstabelle (Raumtemperatur 20 °C) ist mit der Exponentenrechnung über ΔT_ln konsistent (Typ 22/600: 70/55 → 1666·(42,06/49,83)^1,293 = 1338 → Tabelle 1338; 55/45 → 1666·(29,72/49,83)^1,293 = 854 → Tabelle 854). In Quelle B S. 30 identische Zahlen. Die Tabellen enthalten auch Zeilen für 16/18/22/24 °C Raumtemperatur – nur die 20-°C-Zeile ist hier übernommen.

Bautiefen Profil-K (Quelle A PDF-S. 16, Quelle B PDF-S. 14): Typ 10: 61, 11: 61, 12: 64, 22: 100, 33: 155 mm.

### Deutscher Beleg Austauschheizkörper (Profil-K, Nabenabstand 500/900): https://heizungsshop.at/media/95/15/96/1681222598/kermi-modernisierungsheizk.pdf (PDF-S. 4, Katalogseite 37): BH 554: Typ 12 1153 W/m (n 1,2936), Typ 22 1564 (1,2899), Typ 33 2103 (1,2836); BH 954: Typ 12 1786 (1,3077), Typ 22 2307 (1,3068), Typ 33 3153 (1,3069).

### 2b. Profil-K/V/Vplus Hygiene (Typ 10, 20, 30) – deutsches Datenblatt

Quelle: Kermi «therm-x2 Profil-K/V/Vplus Hygiene – Technik» (Katalogseiten 26–33, PDF-Erstellung 2023-01-17): https://assets.heizung-billiger.de/documents/kermi-profil-k-v-vplus-hygiene-technik.pdf — «Registrierte Leistungsdaten» **PDF-Seite 5** (Katalogseite 30); W/m je Temperaturpaar PDF-Seite 7 (Katalogseite 32). **W/m direkt.**

| Typ | 300 | 400 | 500 | 600 | 750 | 900 |
|---|---|---|---|---|---|---|
| 10 | 335 (n 1,2361) | 425 (1,2550) | 514 (1,2739) | 602 (1,2928) | 736 (1,2932) | 872 (1,2935) |
| 20 | 582 (1,2770) | 736 (1,2773) | 883 (1,2775) | 1027 (1,2778) | 1235 (1,2888) | 1437 (1,2955) |
| 30 | 823 (1,2660) | 1034 (1,2672) | 1236 (1,2684) | 1429 (1,2696) | 1707 (1,2772) | 1973 (1,2844) |

Kontrolle (PDF-S. 7, Raum 20 °C, W/m, 70/55 / 55/45 / 45/40): Typ 10: 300: 272/177/125; 400: 344/222/156; 500: 414/266/186; 600: 483/309/214; 750: 591/377/262; 900: 700/447/310. Typ 20: 300: 469/301/210; 400: 593/380/265; 500: 711/456/318; 600: 827/531/370; 750: 992/634/441; 900: 1153/736/510. Typ 30: 300: 664/428/299; 400: 834/537/376; 500: 997/642/448; 600: 1152/741/518; 750: 1374/882/615; 900: 1587/1016/707.

Bautiefen Hygiene: nicht in diesem Auszug belegt (Kermi PL S. 16 nennt Hygiene FH0 Typ 10: 61 mm; Typ 20/30 n. b.).

---

## 3. Purmo – Compact (C) / Ventil Compact (CV) und Hygiene (H)

Quelle A (Purmo Group, technischer Katalog Panelradiatoren, Ausgabe 10/2020, UA/RU/PL, Originaldatei «Purmo_tech_catalogue_full_PR_10_2020»): https://gazovik.ua/upload/fck/file/Purmo_tech_catalogue_2020_.pdf — Compact Typ 11 **PDF-S. 12**, Typ 21s S. 13, Typ 22 S. 14, Typ 33 S. 15; Ventil Compact S. 18–21 (identische Werte); Hygiene Typ 10 S. 31, Typ 20 S. 32, Typ 30 S. 33; Maßblatt Compact S. 11.
Quelle B (Purmo/Rettig Dänemark, Produktblad Compact, 2018): https://www.byggematerialer.dk/compact-datablad-1167965/fil-files/Compact-datablad.pdf — φn W/m (Δt50) und n je Typ/Höhe auf PDF-S. 5 (300), 6 (400), 7 (450), 8 (500), 9 (600), 10 (900). Werte identisch mit Quelle A.
Quelle C (Radson Compact HP, Purmo Group, FR 2023): siehe Abschnitt 8 – identische Werte, zusätzlich **Bauhöhe 750**.
Quelle D (deutsches Datenblatt Compact, PG Germany, 2025-05-27, Mirror heizungsdiscount24): https://www.heizungsdiscount24.de/pdf/Purmo-Compact-Datenblatt.pdf — enthält Typen, Höhen (300/400/500/550/600/900/950), Längen, Maßzeichnungen (Bautiefen), **aber keine Leistungstabellen**.

Längenbasis Quelle A: Leistungen je Heizkörper (W) bei 75/65/20 nach EN 442, Zeile Baulänge **1000 mm** = W/m (Quelle B weist dieselben Zahlen explizit als «φn W/m (Δt50)» aus).

### φ 75/65/20 [W/m] – Compact / Ventil Compact

| Typ | 300 | 400 | 450 | 500 | 550 | 600 | 750 | 900 |
|---|---|---|---|---|---|---|---|---|
| 10 (Hygiene H10) | 348 | 449 | 498 | 546 | 593 | 639 | n. b. | 903 |
| 11 | 546 | 711 | 790 | 868 | 944 | 1018 | 1230 | 1427 |
| 20 (Hygiene H20) | 630 | 787 | 863 | 938 | 1012 | 1085 | n. b. | 1516 |
| 21 (21s) | 761 | 963 | 1060 | 1156 | 1249 | 1340 | 1606 | 1861 |
| 22 | 961 | 1221 | 1347 | 1470 | 1591 | 1709 | 2055 | 2388 |
| 30 (Hygiene H30) | 874 | 1098 | 1205 | 1309 | 1410 | 1510 | n. b. | 2069 |
| 33 | 1347 | 1699 | 1869 | 2035 | 2197 | 2356 | 2818 | 3260 |

(750-mm-Werte aus Quelle C, Radson Compact HP 2023, PDF-S. 5–8; Purmo DE listet 750 nicht.)

### Exponent n («показник n», Quelle A; Quelle B «n =»)

| Typ | 300 | 400 | 450 | 500 | 550 | 600 | 750 (Quelle C) | 900 |
|---|---|---|---|---|---|---|---|---|
| 10 | 1,3425 | 1,3255 | 1,3171 | 1,3086 | 1,3001 | 1,2916 | – | 1,2988 |
| 11 | 1,2981 | 1,3026 | 1,3048 | 1,3070 | 1,3093 | 1,3115 | 1,3143 | 1,3170 |
| 20 | 1,2815 | 1,2835 | 1,2846 | 1,2856 | 1,2866 | 1,2876 | – | 1,3042 |
| 21s | 1,2803 | 1,2940 | 1,3008 | 1,3076 | 1,3145 | 1,3213 | 1,3302 | 1,3390 |
| 22 | 1,3094 | 1,3182 | 1,3226 | 1,3270 | 1,3314 | 1,3358 | 1,3460 | 1,3561 |
| 30 | 1,2957 | 1,3004 | 1,3028 | 1,3051 | 1,3075 | 1,3098 | – | 1,3418 |
| 33 | 1,3140 | 1,3255 | 1,3313 | 1,3371 | 1,3428 | 1,3486 | 1,3543 | 1,3600 |

### Kontrollwerte 55/45/20 [W/m] (Quelle C, Radson Compact HP 2023, Zeile 1000 mm; Quelle B gibt φn bei Δt30 identisch für 300–900)

| Typ | 300 | 400 | 500 | 600 | 750 | 900 |
|---|---|---|---|---|---|---|
| 11 | 281 | 366 | 445 | 521 | 629 | 728 |
| 21s | 396 | 497 | 593 | 682 | 814 | 939 |
| 22 | 492 | 623 | 746 | 864 | 1033 | 1194 |
| 33 | 688 | 863 | 1028 | 1183 | 1411 | 1627 |

70/55/20 und 45/35/20: in den Purmo-Quellen nicht tabelliert (Quelle A hat 90/70 und 105/75; Quelle B 55/40, 60/30, 70/40) → n. b.

Bautiefen Compact (Quelle A PDF-S. 11, Quelle D Maßzeichnungen S. 6–7): Typ 11: 60 (Blech 61), 21s: 70, 22: 102, 33: 152 mm. Hygiene: n. b.

---

## 4. Vogel & Noot – Kompaktheizkörper (Typ 10, 11 K, 21 K-S, 22 K, 33 K) = Vonova-Programm

Quelle A (Vogel & Noot Österreich, «Kompaktheizkörper – Technische Informationen», Preisliste gültig ab 1.3.2012): https://www.vogelundnoot.com/static_files/at/media/downloads/kompaktheizkoerper_technische_informationen.pdf — 75/65/20 und 70/55/20 **PDF-Seite 5** (Katalogseite 21), 55/45/20 und 45/40/20 PDF-Seite 6 (Katalogseite 22), Typenübersicht/Bautiefen PDF-Seite 2 (Katalogseite 25).
Quelle B (COSMO/Vogel & Noot Deutschland, «Flachheizkörper Technische Information», Stand Juli 2022): https://www.vogelundnoot.com/static_files/de/media/downloads/flachheizkoerper_technische_informationen_de.pdf — Kompakt-/Ventil-Multifunktionsheizkörper 75/65/20 **PDF-Seite 66**; identische Zahlen und Exponenten wie Quelle A.

Längenbasis: Leistungen je Heizkörper (W) nach DIN EN 442/ÖNORM EN 442; Zeile Baulänge **1000 mm** = W/m. Prüfregistrierungen WSP-Cert: Typ 10 0443, 11 K 0445, 21 K-S 0447, 22 K 0448, 33 K 0449. Bauhöhen 300/400/500/600/900 (kein 750).

### φ 75/65/20 [W/m] (Zeile 1000 mm)

| Typ | 300 | 400 | 500 | 600 | 750 | 900 |
|---|---|---|---|---|---|---|
| 10 | 348 | 444 | 536 | 625 | n. b. | 878 |
| 11 K | 565 | 708 | 843 | 939 | n. b. | 1292 |
| 20 | n. b. (nur Hygiene-Programm, nicht geprüft) | | | | | |
| 21 K-S | 838 | 1047 | 1227 | 1357 | n. b. | 1864 |
| 22 K | 1095 | 1357 | 1543 | 1713 | n. b. | 2296 |
| 30 | n. b. | | | | | |
| 33 K | 1561 | 1936 | 2228 | 2453 | n. b. | 3221 |

### Exponent n (Quelle A PDF-S. 5, Zeile «Heizkörperexponent n»)

| Typ | 300 | 400 | 500 | 600 | 900 |
|---|---|---|---|---|---|
| 10 | 1,274 | 1,283 | 1,292 | 1,301 | 1,305 |
| 11 K | 1,330 | 1,342 | 1,330 | 1,319 | 1,332 |
| 21 K-S | 1,327 | 1,334 | 1,323 | 1,310 | 1,321 |
| 22 K | 1,329 | 1,353 | 1,334 | 1,343 | 1,340 |
| 33 K | 1,331 | 1,357 | 1,351 | 1,333 | 1,354 |

### Kontrollwerte (Zeile 1000 mm) 70/55/20 · 55/45/20 · 45/40/20 [W/m]

| Typ | 300 | 400 | 500 | 600 | 900 |
|---|---|---|---|---|---|
| 10 | 283 · 182 · 126 | 360 · 231 · 159 | 434 · 277 · 191 | 506 · 322 · 221 | 710 · 451 · 310 |
| 11 K | 455 · 286 · 195 | 569 · 357 · 242 | 679 · 427 · 291 | 758 · 479 · 327 | 1041 · 654 · 446 |
| 21 K-S | 675 · 425 · 290 | 843 · 530 · 361 | 990 · 624 · 427 | 1097 · 695 · 477 | 1504 · 949 · 649 |
| 22 K | 882 · 555 · 379 | 1089 · 680 · 461 | 1242 · 781 · 532 | 1377 · 863 · 586 | 1847 · 1158 · 788 |
| 33 K | 1257 · 791 · 539 | 1553 · 968 · 655 | 1789 · 1117 · 758 | 1975 · 1242 · 846 | 2585 · 1613 · 1092 |

Bautiefen (Quelle A PDF-S. 2, Typenübersicht): Typ 10: 46, 11 K: 61, 21 K-S: 80, 22 K: 105, 33 K: 166 mm.

Bemerkung: Typ 10 ist bei BH 300/400 nur bis 1200/2400 mm Länge lieferbar; 1000-mm-Zeile vorhanden. Die COSMO-Ausgabe 2022 (Quelle B) nennt die Typen zusätzlich «11 / 21S-21-SD / 22-22-D / 33-33-D» (Ventil-Multifunktionsheizkörper) mit denselben Werten.

---

## 5. Stelrad – Novello (DE) / Compact (DE) / Hygiene ECO (DE) / Compact (UK)

Quelle A (Stelrad Deutschland, «Technische Dokumentation» STR-TD-GE-2014-08, PDF erstellt 2014-08-12): https://documents.unidomo.de/de/Katalog/Stellrad/Stellrad_STR-TD-GE-2014-08.pdf — Novello Typenübersicht («W = Leistung pro Meter bei 75/65/20 °C nach EN 442, n = Exponent») **PDF-S. 92** (Katalogseite 89); Novello-Leistungstabellen 300/400/500 PDF-S. 93, 600/900 PDF-S. 94 (je Zelle drei Werte: 70/55/20, 55/45/20, 75/65/20); Compact (4 × ½" seitlich) Typenübersicht PDF-S. 96 (Katalogseite 93, identische Werte, zusätzlich BH 700); Novello ECO (serielle Durchströmung) PDF-S. 6 (Katalogseite 3); Hygiene ECO Typ 10/20/30 PDF-S. 10 (Katalogseite 7). **W/m direkt.**
Quelle B (Stelrad UK, Green Compact, 2024-05): https://www.stelrad.com/wp-content/uploads/2023/12/28092_Stelrad_Web-PDF_Green-Compact.pdf — «EN 442 Certification Data – CETIAT tested», W/m at 75/65/20 und n, PDF-S. 6. Quelle C (Stelrad UK, Compact K3): https://www.stelradprofessional.com/wp-content/uploads/2019/12/28092_Compact_K3_Web-LK.pdf PDF-S. 6.

### Novello / Compact (DE), φ 75/65/20 [W/m] (PDF-S. 92 und 96)

| Typ | 300 | 400 | 500 | 600 | 700 | 750 | 900 |
|---|---|---|---|---|---|---|---|
| 11 | 509 | 676 | 833 | 980 | 1117 (nur Compact) | n. b. | 1360 |
| 21 | 745 | n. b. (400 nicht im Programm) | 1153 | 1345 | 1530 (Compact) | n. b. | 1883 |
| 22 | 982 | 1245 | 1494 | 1732 | 1961 (Compact) | n. b. | 2395 |
| 33 | 1349 | 1711 | 2056 | 2389 | 2712 (Compact) | n. b. | 3334 |

Exponent n (PDF-S. 92/96):

| Typ | 300 | 400 | 500 | 600 | 700 | 900 |
|---|---|---|---|---|---|---|
| 11 | 1,32 | 1,31 | 1,30 | 1,29 | 1,29 | 1,29 |
| 21 | 1,33 | – | 1,34 | 1,34 | 1,34 | 1,34 |
| 22 | 1,33 | 1,33 | 1,33 | 1,33 | 1,34 | 1,35 |
| 33 | 1,31 | 1,32 | 1,32 | 1,32 | 1,34 | 1,37 |

Kontrollwerte Novello (Zeile Baulänge 1000 mm, PDF-S. 93/94; 70/55/20 · 55/45/20):

| Typ | 300 | 400 | 500 | 600 | 900 |
|---|---|---|---|---|---|
| 11 | 407 · 257 | 541 · 343 | 668 · 425 | 787 · 503 | 1092 · 698 |
| 21 | 595 · 375 | – | 919 · 578 | 1072 · 674 | 1500 · 943 |
| 22 | 784 · 495 | 994 · 626 | 1192 · 751 | 1381 · 869 | 1906 · 1194 |
| 33 | 1079 · 684 | 1368 · 866 | 1643 · 1039 | 1908 · 1205 | 2642 · 1641 |

Achtung: Die Stelrad-70/55-Werte entsprechen rechnerisch ΔT ≈ 42 K mit dem angegebenen n (Typ 22/600: 1732·(42,06/49,83)^1,33 = 1382 → Tabelle 1381) – konsistent.

### Hygiene ECO (Typ 10/20/30), PDF-S. 10, φ 75/65/20 [W/m] (n in Klammern)

| Typ | 300 | 400 | 500 | 600 | 700 | 900 |
|---|---|---|---|---|---|---|
| 10 | 338 (1,28) | 430 (1,29) | 521 (1,30) | 610 (1,31) | 699 (1,32) | 877 (1,33) |
| 20 | 585 (1,27) | 732 (1,28) | 879 (1,28) | 1023 (1,29) | 1167 (1,29) | 1458 (1,30) |
| 30 | 867 (1,30) | 1074 (1,30) | 1275 (1,30) | 1470 (1,31) | 1659 (1,31) | 2034 (1,32) |

### Novello ECO (serielle Durchströmung, Typ 11/21/22/33), PDF-S. 6 – abweichend vom Standard-Novello

300: 509/744/933/1347 · 400: 676/927/1173/1686 · 500: 833/1107/1401/2007 · 600: 980/1287/1617/2313 · 700: 1117/1467/1824/2607 · 900: 1360/1836/2220/3180 W/m (n 300: 1,32/1,28/1,31/1,33 … 900: 1,29/1,32/1,30/1,33).

Bautiefen (Ausschreibungstext PDF-S. 91/95 «Tiefen: 61 | 77 | 100 | 158 mm» für Typ 11 | 21 | 22 | 33); Hygiene ECO (PDF-S. 10): 47 | 77 | 158 mm für Typ 10 | 20 | 30.

### Stelrad UK (Compact, K1 = Typ 11, P+ = Typ 21, K2 = Typ 22, K3 = Typ 33), W/m at 75/65/20 (Quelle B PDF-S. 6; Quelle C PDF-S. 6)

K1: 300: 494 (n 1,27), 450: 716 (1,28), 600: 923 (1,29), 700: 1052 (1,31). P+: 450: 1055 (1,33), 600: 1345 (1,34). K2: 300: 982 (1,33), 450: 1371 (1,33), 600: 1732 (1,33), 700: 1961 (1,34). K3: 300: 1349 (1,31), 500: 2056 (1,32), 600: 2389 (1,32), 700: 2712 (1,34). (UK-Programm ohne 400/500/900 außer K3/500; K2/K3-Werte identisch mit DE.)

---

## 6. Brugman – Compact 4 / Uni 6 / Centric (Typ 11, 21s, 22, 33)

Quelle: Brugman «Technisches Handbuch 2025» (01/2025, Datei vom 20.10.2025): https://brugman.eu/files/downloads/Brugman-Technisches-Handuch-DE-20-10-2025.pdf — «Technische Daten pro laufenden Meter bei 75/65/20 °C» Compact 4 **PDF-S. 9**, Centric PDF-S. 35; W/m-Tabellen je Typ mit 75/65, 70/55, 55/45 und n: Compact 4 PDF-S. 94 (Typ 11), 95 (21s), 96 (22), 97 (33); Uni 6 PDF-S. 98–101 (Typ 22/33 zusätzlich BH 200); Centric PDF-S. 110–113. **W/m direkt.**

Compact 4 und Centric haben identische Leistungen (Uni 6 ebenfalls, Piano-Varianten mit glatter Front abweichend, PDF-S. 102–105).

### φ 75/65/20 [W/m] – Compact 4 / Centric

| Typ | 200 (Uni 6) | 300 | 400 | 500 | 600 | 750 | 900 |
|---|---|---|---|---|---|---|---|
| 11 | – | n. b. (nicht im Programm) | 697 | 840 | 979 | n. b. | 1390 |
| 21s | – | 755 (nur Centric, S. 35) | 953 | 1141 | 1322 | n. b. | 1841 |
| 22 | 619 | 942 | 1202 | 1449 | 1683 | n. b. | 2326 |
| 33 | 871 | 1334 | 1700 | 2048 | 2379 | n. b. | 3297 |

Typ 10/20/30: nicht im Brugman-Handbuch → n. b.

### Exponent n (PDF-S. 9 / 94–97)

| Typ | 200 | 300 | 400 | 500 | 600 | 900 |
|---|---|---|---|---|---|---|
| 11 | – | – | 1,24 | 1,25 | 1,27 | 1,30 |
| 21s | – | 1,31 | 1,31 (S. 95: 1,31) | 1,32 | 1,32 | 1,33 |
| 22 | 1,29 | 1,31 | 1,32 | 1,32 | 1,33 | 1,34 |
| 33 | 1,29 | 1,29 | 1,30 | 1,31 | 1,32 | 1,34 |

(Hinweis: S. 9 gibt für Typ 21s/400 n = 1,32, S. 95 n = 1,31 – Rundungsdifferenz im Handbuch.)

### Kontrollwerte 70/55/20 · 55/45/20 [W/m] (PDF-S. 94–97, 100–101)

| Typ | 200 | 300 | 400 | 500 | 600 | 900 |
|---|---|---|---|---|---|---|
| 11 | – | – | 565 · 368 | 679 · 439 | 789 · 507 | 1114 · 708 |
| 21s | – | – | 770 · 488 | 921 · 581 | 1067 · 674 | 1483 · 933 |
| 22 | 502 · 320 | 761 · 482 | 970 · 612 | 1169 · 738 | 1356 · 853 | 1871 · 1173 |
| 33 | 705 · 448 | 1082 · 690 | 1376 · 875 | 1655 · 1049 | 1920 · 1212 | 2652 · 1663 |

Bautiefen (Maßzeichnungen L-Konsolen PDF-S. 9 / Ansicht von unten S. 35): Typ 11: 61, 21s: 73, 22: 106, 33: 165 mm.

Hinweis: Das bei der Suche gefundene «Technische Angaben Kompaktheizkörper» (loebbeshop.de, …_7855.pdf) ist ein **Viessmann**-Dokument (Autor «Viessmann Deutschland GmbH»), nicht Brugman – nicht verwendet.

---

## 7. Arbonia

**Nicht belegt.** Die Arbonia-Website (arbonia-solutions.com) listet unter «Heating panels» nur Heizwände (Modell HH/HV, Flachrohr-Konstruktion), keine Plattenheizkörper vom Typ 10–33 nach EN-Typenschlüssel; das Downloadcenter liefert keine direkt abrufbaren PDFs (dynamisch geladen). Mehrere Web-Suchen nach Arbonia-Kompaktheizkörper-Datenblättern blieben ohne Treffer (Arbonia vertreibt im DACH-Raum Röhrenradiatoren, Heizwände, Konvektoren, Badheizkörper; Plattenheizkörper innerhalb der Arbonia-Gruppe laufen unter Kermi, Vasco, Brugman, Superia). Abrufdatum 2026-10-29.

---

## 8. Radson – Compact HP (Purmo Group) / Compact (FR)

Quelle A: Radson «Compact HP | Fiche technique» (FR, 2023-08): https://www.radson.com/docs/Compact_HP_Tech_Data_Sheet_FR_2023.pdf — Leistungstabellen (W je Heizkörper, 75/65/20 und 55/45/20, Bauhöhen 300/400/500/600/750/900) Typ 11 **PDF-S. 5**, Typ 21s S. 6, Typ 22 S. 7, Typ 33 S. 8, jeweils mit «exposant n»; Maßzeichnungen (Bautiefen) PDF-S. 2. Längenbasis: Zeile **1000 mm** = W/m.
Quelle B: Radson Compact (FR-Händlerdoku Richardson, 2022): https://www.richardson.fr/files/richardson/technical_document/01c/9673139_t0600b.pdf — nur Typ 22, Leistungen je Heizkörper 75/65 und 55/45 für Höhen 300–900, Längen 450–1800 (keine 1000-mm-Zeile; 1050 mm: 1264/1603/1914/2198/2580/2912 W bei 75/65) → W/m rechnerisch ≈ 1204/1527/1823/2093/2457/2773; abweichend von Compact HP (anderes Produkt/Prüfstand), s. Unsicherheiten.

### φ 75/65/20 [W/m] – Radson Compact HP (Zeile 1000 mm) – identisch Purmo Compact

| Typ | 300 | 400 | 500 | 600 | 750 | 900 |
|---|---|---|---|---|---|---|
| 11 | 546 | 711 | 868 | 1018 | 1230 | 1427 |
| 21s | 761 | 963 | 1156 | 1340 | 1606 | 1861 |
| 22 | 961 | 1221 | 1470 | 1709 | 2055 | 2388 |
| 33 | 1347 | 1699 | 2035 | 2356 | 2818 | 3260 |

Exponent n: Typ 11: 1,2981 / 1,3026 / 1,3070 / 1,3115 / 1,3143 / 1,3170; 21s: 1,2803 / 1,2940 / 1,3076 / 1,3213 / 1,3302 / 1,3390; 22: 1,3094 / 1,3182 / 1,3270 / 1,3358 / 1,3460 / 1,3561; 33: 1,3140 / 1,3255 / 1,3371 / 1,3486 / 1,3543 / 1,3600 (je 300/400/500/600/750/900).

55/45/20 (Zeile 1000 mm): Typ 11: 281/366/445/521/629/728; 21s: 396/497/593/682/814/939; 22: 492/623/746/864/1033/1194; 33: 688/863/1028/1183/1411/1627 W/m.

Bautiefen (PDF-S. 2, Maß C): Typ 11: 60, 21s: 70, 22: 102, 33: 152 mm. Typ 10/20/30: n. b. (Radson Hygiene-Datenblatt nicht abgerufen; radson.com liefert 522-Fehler).

---

## 9. Vergleichstabelle φ 75/65/20 [W/m] – Hersteller nebeneinander

Spalten: Buderus (Bud), Kermi Profil-K/Hygiene (Ker), Purmo Compact/Hygiene = Radson Compact HP (Pur), Vogel & Noot Kompakt (V&N), Stelrad Novello/Compact/Hygiene ECO DE (Ste), Brugman Compact 4/Centric (Bru). «–» = nicht im Programm / nicht belegt.

### Typ 10

| Höhe | Bud | Ker | Pur | V&N | Ste | Bru |
|---|---|---|---|---|---|---|
| 300 | 330 | 335 | 348 | 348 | 338 | – |
| 400 | 423 | 425 | 449 | 444 | 430 | – |
| 500 | 514 | 514 | 546 | 536 | 521 | – |
| 600 | 604 | 602 | 639 | 625 | 610 | – |
| 750 | – | 736 | – | – | – (700: 699) | – |
| 900 | 875 | 872 | 903 | 878 | 877 | – |

### Typ 11

| Höhe | Bud | Ker | Pur | V&N | Ste | Bru |
|---|---|---|---|---|---|---|
| 300 | 549 | 551 | 546 | 565 | 509 | – |
| 400 | 708 | 697 | 711 | 708 | 676 | 697 |
| 500 | 858 | 840 | 868 | 843 | 833 | 840 |
| 600 | 1002 | 979 | 1018 | 939 | 980 | 979 |
| 750 | – | 1185 | 1230 | – | – (700: 1117) | – |
| 900 | 1394 | 1390 | 1427 | 1292 | 1360 | 1390 |

### Typ 20

| Höhe | Bud | Ker (Hyg.) | Pur (Hyg.) | V&N | Ste (Hyg. ECO) | Bru |
|---|---|---|---|---|---|---|
| 300 | 590 | 582 | 630 | – | 585 | – |
| 400 | 746 | 736 | 787 | – | 732 | – |
| 500 | 897 | 883 | 938 | – | 879 | – |
| 600 | 1043 | 1027 | 1085 | – | 1023 | – |
| 750 | – | 1235 | – | – | – (700: 1167) | – |
| 900 | 1463 | 1437 | 1516 | – | 1458 | – |

### Typ 21 (Pur/V&N/Bru: schmale Bauart 21s / 21 K-S; Kermi: Typ 12 als nächstliegend, 64 mm)

| Höhe | Bud | Ker (Typ 12) | Pur (21s) | V&N (21 K-S) | Ste | Bru (21s) |
|---|---|---|---|---|---|---|
| 300 | 745 | 720 | 761 | 838 | 745 | 755 |
| 400 | 937 | 894 | 963 | 1047 | – | 953 |
| 500 | 1117 | 1063 | 1156 | 1227 | 1153 | 1141 |
| 600 | 1288 | 1229 | 1340 | 1357 | 1345 | 1322 |
| 750 | – | 1475 | 1606 | – | – (700: 1530) | – |
| 900 | 1754 | 1723 | 1861 | 1864 | 1883 | 1841 |

### Typ 22

| Höhe | Bud | Ker | Pur | V&N | Ste | Bru |
|---|---|---|---|---|---|---|
| 200 | – | 678 | – | – | – | 619 |
| 300 | 966 | 959 | 961 | 1095 | 982 | 942 |
| 400 | 1216 | 1207 | 1221 | 1357 | 1245 | 1202 |
| 500 | 1452 | 1441 | 1470 | 1543 | 1494 | 1449 |
| 600 | 1679 | 1666 | 1709 | 1713 | 1732 | 1683 |
| 750 | – | 1987 | 2055 | – | – (700: 1961) | – |
| 900 | 2313 | 2295 | 2388 | 2296 | 2395 | 2326 |

### Typ 30

| Höhe | Bud | Ker (Hyg.) | Pur (Hyg.) | V&N | Ste (Hyg. ECO) | Bru |
|---|---|---|---|---|---|---|
| 300 | 858 | 823 | 874 | – | 867 | – |
| 400 | 1072 | 1034 | 1098 | – | 1074 | – |
| 500 | 1279 | 1236 | 1309 | – | 1275 | – |
| 600 | 1482 | 1429 | 1510 | – | 1470 | – |
| 750 | – | 1707 | – | – | – (700: 1659) | – |
| 900 | 2084 | 1973 | 2069 | – | 2034 | – |

### Typ 33

| Höhe | Bud | Ker | Pur | V&N | Ste | Bru |
|---|---|---|---|---|---|---|
| 200 | – | 998 | – | – | – | 871 |
| 300 | 1379 | 1300 | 1347 | 1561 | 1349 | 1334 |
| 400 | 1738 | 1633 | 1699 | 1936 | 1711 | 1700 |
| 500 | 2079 | 1944 | 2035 | 2228 | 2056 | 2048 |
| 600 | 2406 | 2236 | 2356 | 2453 | 2389 | 2379 |
| 750 | – | 2645 | 2818 | – | – (700: 2712) | – |
| 900 | 3328 | 3023 | 3260 | 3221 | 3334 | 3297 |

### Exponent n – Spannweite je Typ (alle Hersteller, Höhen 300–900)

| Typ | min | max | typisch |
|---|---|---|---|
| 10 | 1,2361 (Kermi 300) | 1,3425 (Purmo 300) | 1,29–1,31 |
| 11 | 1,2196 (Kermi 300) | 1,342 (V&N 400) | 1,30–1,32 |
| 20 | 1,27 (Stelrad 300) | 1,3181 (Buderus 600) | 1,28–1,31 |
| 21 | 1,2731 (Kermi 12/300) | 1,3578 (Buderus 900) | 1,30–1,33 |
| 22 | 1,2776 (Kermi 300) | 1,3574 (Buderus 900) | 1,31–1,34 |
| 30 | 1,2660 (Kermi 300) | 1,3418 (Purmo 900) | 1,28–1,32 |
| 33 | 1,2671 (Kermi 300) | 1,37 (Stelrad 900) | 1,30–1,35 |

### Bautiefen [mm] Übersicht

| Typ | Buderus | Kermi | Purmo/Radson | V&N | Stelrad | Brugman |
|---|---|---|---|---|---|---|
| 10 | 60 | 61 | n. b. | 46 | 47 (Hyg.) | – |
| 11 | 63 | 61 | 60 | 61 | 61 | 61 |
| 12 | – | 64 | – | – | – | – |
| 20 | 66 | n. b. | n. b. | – | 77 (Hyg.) | – |
| 21 | 66 | – | 70 (21s) | 80 (21 K-S) | 77 | 73 (21s) |
| 22 | 100 | 100 | 102 | 105 | 100 | 106 |
| 30 | 155 | n. b. | n. b. | – | 158 (Hyg.) | – |
| 33 | 155 | 155 | 152 | 166 | 158 | 165 |

---

## 10. Nicht belegt / Unsicherheiten

1. **Arbonia**: keine Plattenheizkörper-Datenblätter auffindbar (Hersteller führt im DACH-Programm keine Typ-10/33-Flachheizkörper unter eigener Marke); komplett n. b.
2. **Purmo**: Das aktuelle **deutsche** Datenblatt (PG Germany 2025) enthält keine Leistungstabellen; die deutschen technischen Unterlagen auf purmo.com (`PURMO_FHK_TDPL_2026_web.pdf`, `P_TEC_KHK_1-2021_DE_210212_web.pdf`) lieferten am Abrufdatum HTTP 522 (Cloudflare). Die Leistungswerte stammen aus dem Purmo-Group-Katalog 10/2020 (UA/RU/PL-Ausgabe), dem dänischen Produktblad 2018 und dem Radson-Compact-HP-Datenblatt 2023 (FR) – alle drei stimmen überein; Produktidentität Purmo Compact DE = Purmo Group Compact ist plausibel (gleiche Typen/Höhen/Bautiefen), aber nicht durch ein deutsches Leistungsdatenblatt belegt. 750 mm nur über Radson Compact HP 2023 belegt (Purmo DE führt BH 750 nicht). 70/55/20 und 45/35/20 bei Purmo nicht tabelliert.
3. **Kermi Standard-Profil-K (Typ 11/12/22/33)**: Belege nur aus der polnischen (2017) und französischen (2018) Technik-Ausgabe; ein deutsches PDF war nicht erreichbar (kermi.com-Downloadcenter dynamisch; heizung-billiger stellt nur das Hygiene-Datenblatt bereit). Typ 10 und Hygiene-Typen sind deutsch belegt (2023). **Typ 33 widersprüchlich**: PL-2017 300–900: 1300/1633/1944/2236/2645/3023 W/m; FR-2018: 1381/1744/2081/2394/2645/3214 W/m (nur 750 gleich). Für eine Software den konservativeren PL-Satz oder eine Verifikation am aktuellen Kermi-Katalog empfohlen. Kermi hat **keinen Typ 21**; Typ 12 (2 Platten, 1 Konvektor, 64 mm tief) ist die ähnlichste Bauart, aber nicht identisch mit Typ 21 (Bautiefe ~66–80 mm bei anderen Herstellern) – entsprechend tiefere Leistung.
4. **Vogel & Noot**: Die AT-Quelle ist eine Preisliste mit Stand 1.3.2012; die COSMO/V&N-DE-Ausgabe 2022 bestätigt identische Werte (gleiche WSP-Registriernummern). Aktuellere V&N-Preisliste 2025/2026 (`2025_04_VN_PL-FHK.pdf`, `02_VN_PL-FHK_01-2026_web.pdf`) am Abrufdatum nicht abrufbar (Server lieferte HTML-Fehlerseite). Typ 20/30 (Hygiene) nicht abgerufen; Bauhöhe 750 nicht im Programm. Die Zeile Baulänge 1000 mm wurde als W/m verwendet (keine explizite W/m-Angabe im Dokument).
5. **Stelrad DE**: Die technische Dokumentation ist von 2014 (ModDate 2021), Produktbezeichnungen Novello/Compact; aktuellere deutsche Stelrad-Unterlagen nicht gefunden. UK-Werte (2024) für K2/K3 sind identisch mit DE 2014, was für fortbestehende Gültigkeit spricht. Typ 21/400 im Novello-Programm nicht vorhanden. Stelrad gibt n nur 2-stellig an. Bauhöhe 700 statt 750.
6. **Brugman**: Typ 11/300 und Typ 10/20/30 nicht im Programm; BH 750 nicht vorhanden. Kleine Rundungsinkonsistenz bei n (21s/400: 1,31 vs. 1,32 je nach Seite).
7. **Buderus**: vollständig für 300/400/500/600/900 inkl. 70/55 und 55/45; kein 750/200/1000.
8. **Radson Compact (FR, Richardson 2022)**: Typ-22-Werte liegen deutlich über Compact HP/Purmo (z. B. 600 mm ≈ 2093 vs. 1709 W/m); es handelt sich um ein anderes Produkt (Radson «Compact» alte Baureihe, evtl. 22-Dreifachkonvektor-Variante); nicht in die Vergleichstabelle übernommen. radson.com-Dokumente (`FICHE-TECHNIQUE-COMPACT-BF.pdf`, `TF_std_vanaf_01072020.pdf`) am Abrufdatum nicht erreichbar (HTTP 522).
9. **Kermi 70/55-Werte**: Die Kermi-Umrechnungstabellen (PL S. 26, FR S. 30) sind nach Raumtemperatur (16–24 °C) gestaffelt; die 16-°C-Zeile zeigt für Typ 22/600 z. B. 1506 W/m, die 20-°C-Zeile 1338 W/m. In Abschnitt 2 ist ausschließlich die 20-°C-Zeile übernommen.
10. Die 55/45-Kontrollwerte aller Hersteller liegen innerhalb ±1 % der Exponentenumrechnung mit ΔT_ln (49,83 K → 29,72 K) – Umrechnung per n ist damit belastbar (Stichproben Typ 22/600: Buderus 842 ber./849 Doku, Kermi 854/854, Brugman 846/853, Purmo 857/864, V&N 856/863, Stelrad 871/866).
11. Bauhöhen 200 und 1000: 200 nur bei Kermi (Typ 22/33) und Brugman Uni 6 (Typ 22/33) belegt; 1000 mm bei keinem Hersteller im Standardprogramm (Stelrad UK Compact 1200: K2 2889 W/m, n 1,33, https://www.stelradprofessional.com/wp-content/uploads/2025/06/28968-Compact-1200_Web-PDF.pdf PDF-S. 4 – nur als Randnotiz).
