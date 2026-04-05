// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Hochzeitsdetails {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    braut_vorname?: string;
    braut_nachname?: string;
    braeutigam_vorname?: string;
    braeutigam_nachname?: string;
    braut_email?: string;
    braeutigam_email?: string;
    braut_telefon?: string;
    braeutigam_telefon?: string;
    hochzeitsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    standesamtdatum?: string; // Format: YYYY-MM-DD oder ISO String
    motto?: string;
    farbschema?: string;
    gaestezahl_geplant?: number;
    gesamtbudget?: number;
    weddingplaner_vorname?: string;
    weddingplaner_nachname?: string;
    weddingplaner_email?: string;
    weddingplaner_telefon?: string;
    notizen_allgemein?: string;
  };
}

export interface Gaesteliste {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    barrierefreiheit?: boolean;
    besondere_beduerfnisse?: string;
    gast_vorname?: string;
    gast_nachname?: string;
    gast_email?: string;
    gast_telefon?: string;
    gast_strasse?: string;
    gast_hausnummer?: string;
    gast_plz?: string;
    gast_ort?: string;
    beziehung?: LookupValue;
    sitzplatzkategorie?: LookupValue;
    rsvp_status?: LookupValue;
    menuewahl?: LookupValue;
    allergien?: string;
    uebernachtung?: boolean;
    kinderbegleitung?: boolean;
    anzahl_kinder?: number;
  };
}

export interface Dienstleister {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    dl_vertragsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    dl_vertrag_datei?: string;
    dl_notizen?: string;
    dl_kategorie?: LookupValue;
    dl_firmenname?: string;
    dl_ansprechpartner_vorname?: string;
    dl_ansprechpartner_nachname?: string;
    dl_telefon?: string;
    dl_email?: string;
    dl_website?: string;
    dl_strasse?: string;
    dl_hausnummer?: string;
    dl_plz?: string;
    dl_ort?: string;
    dl_gesamtpreis?: number;
    dl_anzahlung?: number;
    dl_restbetrag?: number;
    dl_zahlungsstatus?: LookupValue;
  };
}

export interface Locations {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    loc_name?: string;
    loc_typ?: LookupValue;
    loc_verwendung?: LookupValue[];
    loc_kapazitaet?: number;
    loc_strasse?: string;
    loc_hausnummer?: string;
    loc_plz?: string;
    loc_ort?: string;
    loc_geo?: GeoLocation; // { lat, long, info }
    loc_ansprechpartner_vorname?: string;
    loc_ansprechpartner_nachname?: string;
    loc_telefon?: string;
    loc_email?: string;
    loc_website?: string;
    loc_mietpreis?: number;
    loc_verfuegbar?: boolean;
    loc_besichtigung?: string; // Format: YYYY-MM-DD oder ISO String
    loc_notizen?: string;
  };
}

export interface Budgetplanung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    budget_bezeichnung?: string;
    budget_kategorie?: LookupValue;
    budget_geplant?: number;
    budget_tatsaechlich?: number;
    budget_zahlungsstatus?: LookupValue;
    budget_faelligkeitsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    budget_dienstleister?: string; // applookup -> URL zu 'Dienstleister' Record
    budget_rechnung?: string;
    budget_notizen?: string;
  };
}

export interface AufgabenToDos {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    aufgabe_titel?: string;
    aufgabe_beschreibung?: string;
    aufgabe_kategorie?: LookupValue;
    aufgabe_prioritaet?: LookupValue;
    aufgabe_status?: LookupValue;
    aufgabe_faelligkeitsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    aufgabe_verantwortliche_person?: string;
    aufgabe_erledigt_am?: string; // Format: YYYY-MM-DD oder ISO String
    aufgabe_notizen?: string;
  };
}

export interface ZeitplanAblauf {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    zeitplan_location?: string; // applookup -> URL zu 'Locations' Record
    zeitplan_dienstleister?: string; // applookup -> URL zu 'Dienstleister' Record
    zeitplan_uhrzeit?: string; // Format: YYYY-MM-DD oder ISO String
    zeitplan_titel?: string;
    zeitplan_beschreibung?: string;
    zeitplan_dauer?: number;
    zeitplan_kategorie?: LookupValue;
    zeitplan_verantwortliche_person?: string;
    zeitplan_notizen?: string;
  };
}

export interface Tischplan {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    tisch_name?: string;
    tisch_form?: LookupValue;
    tisch_kapazitaet?: number;
    tisch_kategorie?: LookupValue;
    tisch_gaeste?: string; // applookup -> URL zu 'Gaesteliste' Record
    tisch_notizen?: string;
  };
}

export const APP_IDS = {
  HOCHZEITSDETAILS: '69d1f2b19917a46e1f788830',
  GAESTELISTE: '69d1f2b7ecfc2c3b0c09b767',
  DIENSTLEISTER: '69d1f2b83e1d3b28aad7445e',
  LOCATIONS: '69d1f2b90fca651e71fbc8be',
  BUDGETPLANUNG: '69d1f2bab40ae06e4b2f1e7a',
  AUFGABEN_TO_DOS: '69d1f2bb3b04163152b57515',
  ZEITPLAN_ABLAUF: '69d1f2bcb64b3f58f4c2d8fd',
  TISCHPLAN: '69d1f2bcf7e69465f268e88e',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'gaesteliste': {
    beziehung: [{ key: "familie_braeutigam", label: "Familie des Bräutigams" }, { key: "freunde_braut", label: "Freunde der Braut" }, { key: "freunde_braeutigam", label: "Freunde des Bräutigams" }, { key: "gemeinsame_freunde", label: "Gemeinsame Freunde" }, { key: "arbeitskollegen", label: "Arbeitskollegen" }, { key: "sonstige", label: "Sonstige" }, { key: "familie_braut", label: "Familie der Braut" }],
    sitzplatzkategorie: [{ key: "ehrentisch", label: "Ehrentisch" }, { key: "familie", label: "Familie" }, { key: "freunde", label: "Freunde" }, { key: "arbeitskollegen", label: "Arbeitskollegen" }, { key: "sonstige_sitz", label: "Sonstige" }],
    rsvp_status: [{ key: "ausstehend", label: "Ausstehend" }, { key: "zugesagt", label: "Zugesagt" }, { key: "abgesagt", label: "Abgesagt" }, { key: "vielleicht", label: "Vielleicht" }],
    menuewahl: [{ key: "fleisch", label: "Fleisch" }, { key: "vegetarisch", label: "Vegetarisch" }, { key: "vegan", label: "Vegan" }, { key: "fisch", label: "Fisch" }, { key: "kinderteller", label: "Kinderteller" }],
  },
  'dienstleister': {
    dl_kategorie: [{ key: "fotograf", label: "Fotograf" }, { key: "videograf", label: "Videograf" }, { key: "caterer", label: "Caterer" }, { key: "florist", label: "Florist" }, { key: "dj", label: "DJ" }, { key: "band", label: "Band / Musiker" }, { key: "konditor", label: "Konditor / Hochzeitstorte" }, { key: "friseur", label: "Friseur" }, { key: "makeup", label: "Make-up Artist" }, { key: "trauredner", label: "Trauredner / Zeremonienmeister" }, { key: "dekoration", label: "Dekoration" }, { key: "transport", label: "Transport / Limousine" }, { key: "moderator", label: "Moderator" }, { key: "sonstiges_dl", label: "Sonstiges" }],
    dl_zahlungsstatus: [{ key: "offen", label: "Offen" }, { key: "anzahlung_geleistet", label: "Anzahlung geleistet" }, { key: "vollstaendig_bezahlt", label: "Vollständig bezahlt" }, { key: "storniert", label: "Storniert" }],
  },
  'locations': {
    loc_typ: [{ key: "kirche", label: "Kirche" }, { key: "standesamt", label: "Standesamt" }, { key: "schloss", label: "Schloss" }, { key: "restaurant", label: "Restaurant" }, { key: "hotel", label: "Hotel" }, { key: "weingut", label: "Weingut" }, { key: "scheune", label: "Scheune / Landgut" }, { key: "strand", label: "Strandlocation" }, { key: "garten", label: "Gartenanlage" }, { key: "eventlocation", label: "Eventlocation" }, { key: "sonstiges_loc", label: "Sonstiges" }],
    loc_verwendung: [{ key: "standesamt_trauung", label: "Standesamtliche Trauung" }, { key: "zeremonie", label: "Kirchliche / Freie Zeremonie" }, { key: "sektempfang", label: "Sektempfang" }, { key: "feier", label: "Hochzeitsfeier / Dinner" }, { key: "uebernachtung_loc", label: "Übernachtung" }],
  },
  'budgetplanung': {
    budget_kategorie: [{ key: "kat_location", label: "Location" }, { key: "kat_catering", label: "Catering & Getränke" }, { key: "kat_deko", label: "Dekoration & Blumen" }, { key: "kat_foto", label: "Fotografie & Video" }, { key: "kat_musik", label: "Musik & Unterhaltung" }, { key: "kat_kleidung", label: "Kleidung & Accessoires" }, { key: "kat_torte", label: "Hochzeitstorte" }, { key: "kat_transport", label: "Transport" }, { key: "kat_papeterie", label: "Einladungen & Papeterie" }, { key: "kat_ringe", label: "Ringe & Schmuck" }, { key: "kat_flitterwochen", label: "Flitterwochen" }, { key: "kat_sonstiges", label: "Sonstiges" }],
    budget_zahlungsstatus: [{ key: "nicht_faellig", label: "Noch nicht fällig" }, { key: "offen_budget", label: "Offen" }, { key: "teilweise", label: "Teilweise bezahlt" }, { key: "bezahlt", label: "Vollständig bezahlt" }, { key: "storniert_budget", label: "Storniert" }],
  },
  'aufgaben_&_to_dos': {
    aufgabe_kategorie: [{ key: "aufg_location", label: "Location & Zeremonie" }, { key: "aufg_gaeste", label: "Gäste & Einladungen" }, { key: "aufg_catering", label: "Catering & Menü" }, { key: "aufg_deko", label: "Dekoration & Blumen" }, { key: "aufg_kleidung", label: "Kleidung & Beauty" }, { key: "aufg_musik", label: "Musik & Unterhaltung" }, { key: "aufg_foto", label: "Fotografie & Video" }, { key: "aufg_transport", label: "Transport & Logistik" }, { key: "aufg_budget", label: "Budget & Finanzen" }, { key: "aufg_flitterwochen", label: "Flitterwochen" }, { key: "aufg_sonstiges", label: "Sonstiges" }],
    aufgabe_prioritaet: [{ key: "hoch", label: "Hoch" }, { key: "mittel", label: "Mittel" }, { key: "niedrig", label: "Niedrig" }],
    aufgabe_status: [{ key: "offen_aufg", label: "Offen" }, { key: "in_bearbeitung", label: "In Bearbeitung" }, { key: "erledigt", label: "Erledigt" }, { key: "verschoben", label: "Verschoben" }],
  },
  'zeitplan_&_ablauf': {
    zeitplan_kategorie: [{ key: "standesamt_z", label: "Standesamtliche Trauung" }, { key: "zeremonie_z", label: "Kirchliche / Freie Zeremonie" }, { key: "sektempfang_z", label: "Sektempfang" }, { key: "fotoshooting", label: "Fotoshooting" }, { key: "dinner", label: "Dinner / Abendessen" }, { key: "reden", label: "Reden & Toasts" }, { key: "torte", label: "Tortenanschnitt" }, { key: "tanz", label: "Tanz & Party" }, { key: "spiele", label: "Spiele & Unterhaltung" }, { key: "abreise", label: "Abreise" }, { key: "sonstiges_z", label: "Sonstiges" }, { key: "anreise", label: "Anreise & Empfang" }],
  },
  'tischplan': {
    tisch_form: [{ key: "rund", label: "Rund" }, { key: "rechteckig", label: "Rechteckig" }, { key: "oval", label: "Oval" }, { key: "u_form", label: "U-Form" }, { key: "bankett", label: "Bankett" }, { key: "sonstiges_tisch", label: "Sonstiges" }],
    tisch_kategorie: [{ key: "ehrentisch_t", label: "Ehrentisch" }, { key: "familientisch", label: "Familientisch" }, { key: "freundetisch", label: "Freundetisch" }, { key: "kindertisch", label: "Kindertisch" }, { key: "sonstiger_tisch", label: "Sonstiger Tisch" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'hochzeitsdetails': {
    'braut_vorname': 'string/text',
    'braut_nachname': 'string/text',
    'braeutigam_vorname': 'string/text',
    'braeutigam_nachname': 'string/text',
    'braut_email': 'string/email',
    'braeutigam_email': 'string/email',
    'braut_telefon': 'string/tel',
    'braeutigam_telefon': 'string/tel',
    'hochzeitsdatum': 'date/date',
    'standesamtdatum': 'date/date',
    'motto': 'string/text',
    'farbschema': 'string/text',
    'gaestezahl_geplant': 'number',
    'gesamtbudget': 'number',
    'weddingplaner_vorname': 'string/text',
    'weddingplaner_nachname': 'string/text',
    'weddingplaner_email': 'string/email',
    'weddingplaner_telefon': 'string/tel',
    'notizen_allgemein': 'string/textarea',
  },
  'gaesteliste': {
    'barrierefreiheit': 'bool',
    'besondere_beduerfnisse': 'string/textarea',
    'gast_vorname': 'string/text',
    'gast_nachname': 'string/text',
    'gast_email': 'string/email',
    'gast_telefon': 'string/tel',
    'gast_strasse': 'string/text',
    'gast_hausnummer': 'string/text',
    'gast_plz': 'string/text',
    'gast_ort': 'string/text',
    'beziehung': 'lookup/select',
    'sitzplatzkategorie': 'lookup/select',
    'rsvp_status': 'lookup/radio',
    'menuewahl': 'lookup/radio',
    'allergien': 'string/textarea',
    'uebernachtung': 'bool',
    'kinderbegleitung': 'bool',
    'anzahl_kinder': 'number',
  },
  'dienstleister': {
    'dl_vertragsdatum': 'date/date',
    'dl_vertrag_datei': 'file',
    'dl_notizen': 'string/textarea',
    'dl_kategorie': 'lookup/select',
    'dl_firmenname': 'string/text',
    'dl_ansprechpartner_vorname': 'string/text',
    'dl_ansprechpartner_nachname': 'string/text',
    'dl_telefon': 'string/tel',
    'dl_email': 'string/email',
    'dl_website': 'string/url',
    'dl_strasse': 'string/text',
    'dl_hausnummer': 'string/text',
    'dl_plz': 'string/text',
    'dl_ort': 'string/text',
    'dl_gesamtpreis': 'number',
    'dl_anzahlung': 'number',
    'dl_restbetrag': 'number',
    'dl_zahlungsstatus': 'lookup/select',
  },
  'locations': {
    'loc_name': 'string/text',
    'loc_typ': 'lookup/select',
    'loc_verwendung': 'multiplelookup/checkbox',
    'loc_kapazitaet': 'number',
    'loc_strasse': 'string/text',
    'loc_hausnummer': 'string/text',
    'loc_plz': 'string/text',
    'loc_ort': 'string/text',
    'loc_geo': 'geo',
    'loc_ansprechpartner_vorname': 'string/text',
    'loc_ansprechpartner_nachname': 'string/text',
    'loc_telefon': 'string/tel',
    'loc_email': 'string/email',
    'loc_website': 'string/url',
    'loc_mietpreis': 'number',
    'loc_verfuegbar': 'bool',
    'loc_besichtigung': 'date/date',
    'loc_notizen': 'string/textarea',
  },
  'budgetplanung': {
    'budget_bezeichnung': 'string/text',
    'budget_kategorie': 'lookup/select',
    'budget_geplant': 'number',
    'budget_tatsaechlich': 'number',
    'budget_zahlungsstatus': 'lookup/select',
    'budget_faelligkeitsdatum': 'date/date',
    'budget_dienstleister': 'applookup/select',
    'budget_rechnung': 'file',
    'budget_notizen': 'string/textarea',
  },
  'aufgaben_&_to_dos': {
    'aufgabe_titel': 'string/text',
    'aufgabe_beschreibung': 'string/textarea',
    'aufgabe_kategorie': 'lookup/select',
    'aufgabe_prioritaet': 'lookup/radio',
    'aufgabe_status': 'lookup/radio',
    'aufgabe_faelligkeitsdatum': 'date/date',
    'aufgabe_verantwortliche_person': 'string/text',
    'aufgabe_erledigt_am': 'date/date',
    'aufgabe_notizen': 'string/textarea',
  },
  'zeitplan_&_ablauf': {
    'zeitplan_location': 'applookup/select',
    'zeitplan_dienstleister': 'applookup/select',
    'zeitplan_uhrzeit': 'date/datetimeminute',
    'zeitplan_titel': 'string/text',
    'zeitplan_beschreibung': 'string/textarea',
    'zeitplan_dauer': 'number',
    'zeitplan_kategorie': 'lookup/select',
    'zeitplan_verantwortliche_person': 'string/text',
    'zeitplan_notizen': 'string/textarea',
  },
  'tischplan': {
    'tisch_name': 'string/text',
    'tisch_form': 'lookup/select',
    'tisch_kapazitaet': 'number',
    'tisch_kategorie': 'lookup/select',
    'tisch_gaeste': 'applookup/select',
    'tisch_notizen': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateHochzeitsdetails = StripLookup<Hochzeitsdetails['fields']>;
export type CreateGaesteliste = StripLookup<Gaesteliste['fields']>;
export type CreateDienstleister = StripLookup<Dienstleister['fields']>;
export type CreateLocations = StripLookup<Locations['fields']>;
export type CreateBudgetplanung = StripLookup<Budgetplanung['fields']>;
export type CreateAufgabenToDos = StripLookup<AufgabenToDos['fields']>;
export type CreateZeitplanAblauf = StripLookup<ZeitplanAblauf['fields']>;
export type CreateTischplan = StripLookup<Tischplan['fields']>;