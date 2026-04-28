// Re-Export aller WP-Datenbank-Schemas
// Source-of-Truth: Review_WP_Datenbank_v0.2/Datenbank_Waermepumpen_v1.0.xlsx
// Spec:            Review_WP_Datenbank_v0.2/04_Tool_Uebernahme/TOOL_UEBERNAHME.md
import wpHauptgeraet from './wpHauptgeraet';
import wpKomponenteStamm from './wpKomponenteStamm';
import wpMapping from './wpMapping';
import wpKonfigVariable from './wpKonfigVariable';
import wpDatenblatt from './wpDatenblatt';

export { wpHauptgeraet, wpKomponenteStamm, wpMapping, wpKonfigVariable, wpDatenblatt };

export const wpDatenbankSchemas = [
  wpHauptgeraet,
  wpKomponenteStamm,
  wpMapping,
  wpKonfigVariable,
  wpDatenblatt,
];
