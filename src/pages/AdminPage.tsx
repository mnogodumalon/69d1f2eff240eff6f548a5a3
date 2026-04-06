import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Locations, Tischplan, AufgabenToDos, Budgetplanung, ZeitplanAblauf, Hochzeitsdetails, Dienstleister, Gaesteliste } from '@/types/app';
import { LivingAppsService, extractRecordId, cleanFieldsForApi } from '@/services/livingAppsService';
import { LocationsDialog } from '@/components/dialogs/LocationsDialog';
import { LocationsViewDialog } from '@/components/dialogs/LocationsViewDialog';
import { TischplanDialog } from '@/components/dialogs/TischplanDialog';
import { TischplanViewDialog } from '@/components/dialogs/TischplanViewDialog';
import { AufgabenToDosDialog } from '@/components/dialogs/AufgabenToDosDialog';
import { AufgabenToDosViewDialog } from '@/components/dialogs/AufgabenToDosViewDialog';
import { BudgetplanungDialog } from '@/components/dialogs/BudgetplanungDialog';
import { BudgetplanungViewDialog } from '@/components/dialogs/BudgetplanungViewDialog';
import { ZeitplanAblaufDialog } from '@/components/dialogs/ZeitplanAblaufDialog';
import { ZeitplanAblaufViewDialog } from '@/components/dialogs/ZeitplanAblaufViewDialog';
import { HochzeitsdetailsDialog } from '@/components/dialogs/HochzeitsdetailsDialog';
import { HochzeitsdetailsViewDialog } from '@/components/dialogs/HochzeitsdetailsViewDialog';
import { DienstleisterDialog } from '@/components/dialogs/DienstleisterDialog';
import { DienstleisterViewDialog } from '@/components/dialogs/DienstleisterViewDialog';
import { GaestelisteDialog } from '@/components/dialogs/GaestelisteDialog';
import { GaestelisteViewDialog } from '@/components/dialogs/GaestelisteViewDialog';
import { BulkEditDialog } from '@/components/dialogs/BulkEditDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconPencil, IconTrash, IconPlus, IconFilter, IconX, IconArrowsUpDown, IconArrowUp, IconArrowDown, IconSearch, IconCopy, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

// Field metadata per entity for bulk edit and column filters
const LOCATIONS_FIELDS = [
  { key: 'loc_name', label: 'Name der Location', type: 'string/text' },
  { key: 'loc_typ', label: 'Typ der Location', type: 'lookup/select', options: [{ key: 'kirche', label: 'Kirche' }, { key: 'standesamt', label: 'Standesamt' }, { key: 'schloss', label: 'Schloss' }, { key: 'restaurant', label: 'Restaurant' }, { key: 'hotel', label: 'Hotel' }, { key: 'weingut', label: 'Weingut' }, { key: 'scheune', label: 'Scheune / Landgut' }, { key: 'strand', label: 'Strandlocation' }, { key: 'garten', label: 'Gartenanlage' }, { key: 'eventlocation', label: 'Eventlocation' }, { key: 'sonstiges_loc', label: 'Sonstiges' }] },
  { key: 'loc_verwendung', label: 'Verwendung', type: 'multiplelookup/checkbox', options: [{ key: 'standesamt_trauung', label: 'Standesamtliche Trauung' }, { key: 'zeremonie', label: 'Kirchliche / Freie Zeremonie' }, { key: 'sektempfang', label: 'Sektempfang' }, { key: 'feier', label: 'Hochzeitsfeier / Dinner' }, { key: 'uebernachtung_loc', label: 'Übernachtung' }] },
  { key: 'loc_kapazitaet', label: 'Kapazität (Personen)', type: 'number' },
  { key: 'loc_strasse', label: 'Straße', type: 'string/text' },
  { key: 'loc_hausnummer', label: 'Hausnummer', type: 'string/text' },
  { key: 'loc_plz', label: 'Postleitzahl', type: 'string/text' },
  { key: 'loc_ort', label: 'Ort', type: 'string/text' },
  { key: 'loc_geo', label: 'Standort auf Karte', type: 'geo' },
  { key: 'loc_ansprechpartner_vorname', label: 'Vorname des Ansprechpartners', type: 'string/text' },
  { key: 'loc_ansprechpartner_nachname', label: 'Nachname des Ansprechpartners', type: 'string/text' },
  { key: 'loc_telefon', label: 'Telefon', type: 'string/tel' },
  { key: 'loc_email', label: 'E-Mail', type: 'string/email' },
  { key: 'loc_website', label: 'Website', type: 'string/url' },
  { key: 'loc_mietpreis', label: 'Mietpreis (€)', type: 'number' },
  { key: 'loc_verfuegbar', label: 'Location ist verfügbar / bestätigt', type: 'bool' },
  { key: 'loc_besichtigung', label: 'Datum der Besichtigung', type: 'date/date' },
  { key: 'loc_notizen', label: 'Notizen zur Location', type: 'string/textarea' },
];
const TISCHPLAN_FIELDS = [
  { key: 'tisch_name', label: 'Tischname / Tischnummer', type: 'string/text' },
  { key: 'tisch_form', label: 'Tischform', type: 'lookup/select', options: [{ key: 'rund', label: 'Rund' }, { key: 'rechteckig', label: 'Rechteckig' }, { key: 'oval', label: 'Oval' }, { key: 'u_form', label: 'U-Form' }, { key: 'bankett', label: 'Bankett' }, { key: 'sonstiges_tisch', label: 'Sonstiges' }] },
  { key: 'tisch_kapazitaet', label: 'Kapazität (Sitzplätze)', type: 'number' },
  { key: 'tisch_kategorie', label: 'Tischkategorie', type: 'lookup/select', options: [{ key: 'ehrentisch_t', label: 'Ehrentisch' }, { key: 'familientisch', label: 'Familientisch' }, { key: 'freundetisch', label: 'Freundetisch' }, { key: 'kindertisch', label: 'Kindertisch' }, { key: 'sonstiger_tisch', label: 'Sonstiger Tisch' }] },
  { key: 'tisch_gaeste', label: 'Gäste an diesem Tisch', type: 'applookup/select', targetEntity: 'gaesteliste', targetAppId: 'GAESTELISTE', displayField: 'gast_vorname' },
  { key: 'tisch_notizen', label: 'Notizen zum Tisch', type: 'string/textarea' },
];
const AUFGABENTODOS_FIELDS = [
  { key: 'aufgabe_titel', label: 'Titel der Aufgabe', type: 'string/text' },
  { key: 'aufgabe_beschreibung', label: 'Beschreibung', type: 'string/textarea' },
  { key: 'aufgabe_kategorie', label: 'Kategorie', type: 'lookup/select', options: [{ key: 'aufg_location', label: 'Location & Zeremonie' }, { key: 'aufg_gaeste', label: 'Gäste & Einladungen' }, { key: 'aufg_catering', label: 'Catering & Menü' }, { key: 'aufg_deko', label: 'Dekoration & Blumen' }, { key: 'aufg_kleidung', label: 'Kleidung & Beauty' }, { key: 'aufg_musik', label: 'Musik & Unterhaltung' }, { key: 'aufg_foto', label: 'Fotografie & Video' }, { key: 'aufg_transport', label: 'Transport & Logistik' }, { key: 'aufg_budget', label: 'Budget & Finanzen' }, { key: 'aufg_flitterwochen', label: 'Flitterwochen' }, { key: 'aufg_sonstiges', label: 'Sonstiges' }] },
  { key: 'aufgabe_prioritaet', label: 'Priorität', type: 'lookup/radio', options: [{ key: 'hoch', label: 'Hoch' }, { key: 'mittel', label: 'Mittel' }, { key: 'niedrig', label: 'Niedrig' }] },
  { key: 'aufgabe_status', label: 'Status', type: 'lookup/radio', options: [{ key: 'offen_aufg', label: 'Offen' }, { key: 'in_bearbeitung', label: 'In Bearbeitung' }, { key: 'erledigt', label: 'Erledigt' }, { key: 'verschoben', label: 'Verschoben' }] },
  { key: 'aufgabe_faelligkeitsdatum', label: 'Fälligkeitsdatum', type: 'date/date' },
  { key: 'aufgabe_verantwortliche_person', label: 'Verantwortliche Person', type: 'string/text' },
  { key: 'aufgabe_erledigt_am', label: 'Erledigt am', type: 'date/date' },
  { key: 'aufgabe_notizen', label: 'Notizen', type: 'string/textarea' },
];
const BUDGETPLANUNG_FIELDS = [
  { key: 'budget_bezeichnung', label: 'Bezeichnung des Budgetpostens', type: 'string/text' },
  { key: 'budget_kategorie', label: 'Kategorie', type: 'lookup/select', options: [{ key: 'kat_location', label: 'Location' }, { key: 'kat_catering', label: 'Catering & Getränke' }, { key: 'kat_deko', label: 'Dekoration & Blumen' }, { key: 'kat_foto', label: 'Fotografie & Video' }, { key: 'kat_musik', label: 'Musik & Unterhaltung' }, { key: 'kat_kleidung', label: 'Kleidung & Accessoires' }, { key: 'kat_torte', label: 'Hochzeitstorte' }, { key: 'kat_transport', label: 'Transport' }, { key: 'kat_papeterie', label: 'Einladungen & Papeterie' }, { key: 'kat_ringe', label: 'Ringe & Schmuck' }, { key: 'kat_flitterwochen', label: 'Flitterwochen' }, { key: 'kat_sonstiges', label: 'Sonstiges' }] },
  { key: 'budget_geplant', label: 'Geplanter Betrag (€)', type: 'number' },
  { key: 'budget_tatsaechlich', label: 'Tatsächlicher Betrag (€)', type: 'number' },
  { key: 'budget_zahlungsstatus', label: 'Zahlungsstatus', type: 'lookup/select', options: [{ key: 'nicht_faellig', label: 'Noch nicht fällig' }, { key: 'offen_budget', label: 'Offen' }, { key: 'teilweise', label: 'Teilweise bezahlt' }, { key: 'bezahlt', label: 'Vollständig bezahlt' }, { key: 'storniert_budget', label: 'Storniert' }] },
  { key: 'budget_faelligkeitsdatum', label: 'Fälligkeitsdatum', type: 'date/date' },
  { key: 'budget_dienstleister', label: 'Zugehöriger Dienstleister', type: 'applookup/select', targetEntity: 'dienstleister', targetAppId: 'DIENSTLEISTER', displayField: 'dl_firmenname' },
  { key: 'budget_rechnung', label: 'Rechnung / Beleg (Datei)', type: 'file' },
  { key: 'budget_notizen', label: 'Notizen', type: 'string/textarea' },
];
const ZEITPLANABLAUF_FIELDS = [
  { key: 'zeitplan_location', label: 'Location', type: 'applookup/select', targetEntity: 'locations', targetAppId: 'LOCATIONS', displayField: 'loc_name' },
  { key: 'zeitplan_dienstleister', label: 'Verantwortlicher Dienstleister', type: 'applookup/select', targetEntity: 'dienstleister', targetAppId: 'DIENSTLEISTER', displayField: 'dl_firmenname' },
  { key: 'zeitplan_uhrzeit', label: 'Datum & Uhrzeit', type: 'date/datetimeminute' },
  { key: 'zeitplan_titel', label: 'Titel des Programmpunkts', type: 'string/text' },
  { key: 'zeitplan_beschreibung', label: 'Beschreibung', type: 'string/textarea' },
  { key: 'zeitplan_dauer', label: 'Dauer (Minuten)', type: 'number' },
  { key: 'zeitplan_kategorie', label: 'Kategorie', type: 'lookup/select', options: [{ key: 'standesamt_z', label: 'Standesamtliche Trauung' }, { key: 'zeremonie_z', label: 'Kirchliche / Freie Zeremonie' }, { key: 'sektempfang_z', label: 'Sektempfang' }, { key: 'fotoshooting', label: 'Fotoshooting' }, { key: 'dinner', label: 'Dinner / Abendessen' }, { key: 'reden', label: 'Reden & Toasts' }, { key: 'torte', label: 'Tortenanschnitt' }, { key: 'tanz', label: 'Tanz & Party' }, { key: 'spiele', label: 'Spiele & Unterhaltung' }, { key: 'abreise', label: 'Abreise' }, { key: 'sonstiges_z', label: 'Sonstiges' }, { key: 'anreise', label: 'Anreise & Empfang' }] },
  { key: 'zeitplan_verantwortliche_person', label: 'Verantwortliche Person (intern)', type: 'string/text' },
  { key: 'zeitplan_notizen', label: 'Notizen', type: 'string/textarea' },
];
const HOCHZEITSDETAILS_FIELDS = [
  { key: 'braut_vorname', label: 'Vorname der Braut', type: 'string/text' },
  { key: 'braut_nachname', label: 'Nachname der Braut', type: 'string/text' },
  { key: 'braeutigam_vorname', label: 'Vorname des Bräutigams', type: 'string/text' },
  { key: 'braeutigam_nachname', label: 'Nachname des Bräutigams', type: 'string/text' },
  { key: 'braut_email', label: 'E-Mail der Braut', type: 'string/email' },
  { key: 'braeutigam_email', label: 'E-Mail des Bräutigams', type: 'string/email' },
  { key: 'braut_telefon', label: 'Telefon der Braut', type: 'string/tel' },
  { key: 'braeutigam_telefon', label: 'Telefon des Bräutigams', type: 'string/tel' },
  { key: 'hochzeitsdatum', label: 'Hochzeitsdatum', type: 'date/date' },
  { key: 'standesamtdatum', label: 'Datum der standesamtlichen Trauung', type: 'date/date' },
  { key: 'motto', label: 'Motto / Thema der Hochzeit', type: 'string/text' },
  { key: 'farbschema', label: 'Farbschema', type: 'string/text' },
  { key: 'gaestezahl_geplant', label: 'Geplante Gästeanzahl', type: 'number' },
  { key: 'gesamtbudget', label: 'Gesamtbudget (€)', type: 'number' },
  { key: 'weddingplaner_vorname', label: 'Vorname des Weddingplaners', type: 'string/text' },
  { key: 'weddingplaner_nachname', label: 'Nachname des Weddingplaners', type: 'string/text' },
  { key: 'weddingplaner_email', label: 'E-Mail des Weddingplaners', type: 'string/email' },
  { key: 'weddingplaner_telefon', label: 'Telefon des Weddingplaners', type: 'string/tel' },
  { key: 'notizen_allgemein', label: 'Allgemeine Notizen', type: 'string/textarea' },
];
const DIENSTLEISTER_FIELDS = [
  { key: 'dl_vertragsdatum', label: 'Vertragsdatum', type: 'date/date' },
  { key: 'dl_vertrag_datei', label: 'Vertrag (Datei)', type: 'file' },
  { key: 'dl_notizen', label: 'Notizen zum Dienstleister', type: 'string/textarea' },
  { key: 'dl_kategorie', label: 'Kategorie', type: 'lookup/select', options: [{ key: 'fotograf', label: 'Fotograf' }, { key: 'videograf', label: 'Videograf' }, { key: 'caterer', label: 'Caterer' }, { key: 'florist', label: 'Florist' }, { key: 'dj', label: 'DJ' }, { key: 'band', label: 'Band / Musiker' }, { key: 'konditor', label: 'Konditor / Hochzeitstorte' }, { key: 'friseur', label: 'Friseur' }, { key: 'makeup', label: 'Make-up Artist' }, { key: 'trauredner', label: 'Trauredner / Zeremonienmeister' }, { key: 'dekoration', label: 'Dekoration' }, { key: 'transport', label: 'Transport / Limousine' }, { key: 'moderator', label: 'Moderator' }, { key: 'sonstiges_dl', label: 'Sonstiges' }] },
  { key: 'dl_firmenname', label: 'Firmenname', type: 'string/text' },
  { key: 'dl_ansprechpartner_vorname', label: 'Vorname des Ansprechpartners', type: 'string/text' },
  { key: 'dl_ansprechpartner_nachname', label: 'Nachname des Ansprechpartners', type: 'string/text' },
  { key: 'dl_telefon', label: 'Telefon', type: 'string/tel' },
  { key: 'dl_email', label: 'E-Mail', type: 'string/email' },
  { key: 'dl_website', label: 'Website', type: 'string/url' },
  { key: 'dl_strasse', label: 'Straße', type: 'string/text' },
  { key: 'dl_hausnummer', label: 'Hausnummer', type: 'string/text' },
  { key: 'dl_plz', label: 'Postleitzahl', type: 'string/text' },
  { key: 'dl_ort', label: 'Ort', type: 'string/text' },
  { key: 'dl_gesamtpreis', label: 'Gesamtpreis (€)', type: 'number' },
  { key: 'dl_anzahlung', label: 'Anzahlung (€)', type: 'number' },
  { key: 'dl_restbetrag', label: 'Restbetrag (€)', type: 'number' },
  { key: 'dl_zahlungsstatus', label: 'Zahlungsstatus', type: 'lookup/select', options: [{ key: 'offen', label: 'Offen' }, { key: 'anzahlung_geleistet', label: 'Anzahlung geleistet' }, { key: 'vollstaendig_bezahlt', label: 'Vollständig bezahlt' }, { key: 'storniert', label: 'Storniert' }] },
];
const GAESTELISTE_FIELDS = [
  { key: 'barrierefreiheit', label: 'Barrierefreier Zugang benötigt', type: 'bool' },
  { key: 'besondere_beduerfnisse', label: 'Besondere Bedürfnisse / Anmerkungen', type: 'string/textarea' },
  { key: 'gast_vorname', label: 'Vorname', type: 'string/text' },
  { key: 'gast_nachname', label: 'Nachname', type: 'string/text' },
  { key: 'gast_email', label: 'E-Mail', type: 'string/email' },
  { key: 'gast_telefon', label: 'Telefon', type: 'string/tel' },
  { key: 'gast_strasse', label: 'Straße', type: 'string/text' },
  { key: 'gast_hausnummer', label: 'Hausnummer', type: 'string/text' },
  { key: 'gast_plz', label: 'Postleitzahl', type: 'string/text' },
  { key: 'gast_ort', label: 'Ort', type: 'string/text' },
  { key: 'beziehung', label: 'Beziehung zum Brautpaar', type: 'lookup/select', options: [{ key: 'familie_braeutigam', label: 'Familie des Bräutigams' }, { key: 'freunde_braut', label: 'Freunde der Braut' }, { key: 'freunde_braeutigam', label: 'Freunde des Bräutigams' }, { key: 'gemeinsame_freunde', label: 'Gemeinsame Freunde' }, { key: 'arbeitskollegen', label: 'Arbeitskollegen' }, { key: 'sonstige', label: 'Sonstige' }, { key: 'familie_braut', label: 'Familie der Braut' }] },
  { key: 'sitzplatzkategorie', label: 'Sitzplatzkategorie', type: 'lookup/select', options: [{ key: 'ehrentisch', label: 'Ehrentisch' }, { key: 'familie', label: 'Familie' }, { key: 'freunde', label: 'Freunde' }, { key: 'arbeitskollegen', label: 'Arbeitskollegen' }, { key: 'sonstige_sitz', label: 'Sonstige' }] },
  { key: 'rsvp_status', label: 'RSVP-Status', type: 'lookup/radio', options: [{ key: 'ausstehend', label: 'Ausstehend' }, { key: 'zugesagt', label: 'Zugesagt' }, { key: 'abgesagt', label: 'Abgesagt' }, { key: 'vielleicht', label: 'Vielleicht' }] },
  { key: 'menuewahl', label: 'Menüwahl', type: 'lookup/radio', options: [{ key: 'fleisch', label: 'Fleisch' }, { key: 'vegetarisch', label: 'Vegetarisch' }, { key: 'vegan', label: 'Vegan' }, { key: 'fisch', label: 'Fisch' }, { key: 'kinderteller', label: 'Kinderteller' }] },
  { key: 'allergien', label: 'Allergien / Unverträglichkeiten', type: 'string/textarea' },
  { key: 'uebernachtung', label: 'Übernachtung benötigt', type: 'bool' },
  { key: 'kinderbegleitung', label: 'Kommt mit Kindern', type: 'bool' },
  { key: 'anzahl_kinder', label: 'Anzahl der Kinder', type: 'number' },
];

const ENTITY_TABS = [
  { key: 'locations', label: 'Locations', pascal: 'Locations' },
  { key: 'tischplan', label: 'Tischplan', pascal: 'Tischplan' },
  { key: 'aufgaben_to_dos', label: 'Aufgaben & To-Dos', pascal: 'AufgabenToDos' },
  { key: 'budgetplanung', label: 'Budgetplanung', pascal: 'Budgetplanung' },
  { key: 'zeitplan_ablauf', label: 'Zeitplan & Ablauf', pascal: 'ZeitplanAblauf' },
  { key: 'hochzeitsdetails', label: 'Hochzeitsdetails', pascal: 'Hochzeitsdetails' },
  { key: 'dienstleister', label: 'Dienstleister', pascal: 'Dienstleister' },
  { key: 'gaesteliste', label: 'Gästeliste', pascal: 'Gaesteliste' },
] as const;

type EntityKey = typeof ENTITY_TABS[number]['key'];

export default function AdminPage() {
  const data = useDashboardData();
  const { loading, error, fetchAll } = data;

  const [activeTab, setActiveTab] = useState<EntityKey>('locations');
  const [selectedIds, setSelectedIds] = useState<Record<EntityKey, Set<string>>>(() => ({
    'locations': new Set(),
    'tischplan': new Set(),
    'aufgaben_to_dos': new Set(),
    'budgetplanung': new Set(),
    'zeitplan_ablauf': new Set(),
    'hochzeitsdetails': new Set(),
    'dienstleister': new Set(),
    'gaesteliste': new Set(),
  }));
  const [filters, setFilters] = useState<Record<EntityKey, Record<string, string>>>(() => ({
    'locations': {},
    'tischplan': {},
    'aufgaben_to_dos': {},
    'budgetplanung': {},
    'zeitplan_ablauf': {},
    'hochzeitsdetails': {},
    'dienstleister': {},
    'gaesteliste': {},
  }));
  const [showFilters, setShowFilters] = useState(false);
  const [dialogState, setDialogState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [createEntity, setCreateEntity] = useState<EntityKey | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<{ entity: EntityKey; ids: string[] } | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState<EntityKey | null>(null);
  const [viewState, setViewState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');

  const getRecords = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'locations': return (data as any).locations as Locations[] ?? [];
      case 'tischplan': return (data as any).tischplan as Tischplan[] ?? [];
      case 'aufgaben_to_dos': return (data as any).aufgabenToDos as AufgabenToDos[] ?? [];
      case 'budgetplanung': return (data as any).budgetplanung as Budgetplanung[] ?? [];
      case 'zeitplan_ablauf': return (data as any).zeitplanAblauf as ZeitplanAblauf[] ?? [];
      case 'hochzeitsdetails': return (data as any).hochzeitsdetails as Hochzeitsdetails[] ?? [];
      case 'dienstleister': return (data as any).dienstleister as Dienstleister[] ?? [];
      case 'gaesteliste': return (data as any).gaesteliste as Gaesteliste[] ?? [];
      default: return [];
    }
  }, [data]);

  const getLookupLists = useCallback((entity: EntityKey) => {
    const lists: Record<string, any[]> = {};
    switch (entity) {
      case 'tischplan':
        lists.gaestelisteList = (data as any).gaesteliste ?? [];
        break;
      case 'budgetplanung':
        lists.dienstleisterList = (data as any).dienstleister ?? [];
        break;
      case 'zeitplan_ablauf':
        lists.locationsList = (data as any).locations ?? [];
        lists.dienstleisterList = (data as any).dienstleister ?? [];
        break;
    }
    return lists;
  }, [data]);

  const getApplookupDisplay = useCallback((entity: EntityKey, fieldKey: string, url?: unknown) => {
    if (!url) return '—';
    const id = extractRecordId(url);
    if (!id) return '—';
    const lists = getLookupLists(entity);
    void fieldKey; // ensure used for noUnusedParameters
    if (entity === 'tischplan' && fieldKey === 'tisch_gaeste') {
      const match = (lists.gaestelisteList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.gast_vorname ?? '—';
    }
    if (entity === 'budgetplanung' && fieldKey === 'budget_dienstleister') {
      const match = (lists.dienstleisterList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.dl_firmenname ?? '—';
    }
    if (entity === 'zeitplan_ablauf' && fieldKey === 'zeitplan_location') {
      const match = (lists.locationsList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.loc_name ?? '—';
    }
    if (entity === 'zeitplan_ablauf' && fieldKey === 'zeitplan_dienstleister') {
      const match = (lists.dienstleisterList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.dl_firmenname ?? '—';
    }
    return String(url);
  }, [getLookupLists]);

  const getFieldMeta = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'locations': return LOCATIONS_FIELDS;
      case 'tischplan': return TISCHPLAN_FIELDS;
      case 'aufgaben_to_dos': return AUFGABENTODOS_FIELDS;
      case 'budgetplanung': return BUDGETPLANUNG_FIELDS;
      case 'zeitplan_ablauf': return ZEITPLANABLAUF_FIELDS;
      case 'hochzeitsdetails': return HOCHZEITSDETAILS_FIELDS;
      case 'dienstleister': return DIENSTLEISTER_FIELDS;
      case 'gaesteliste': return GAESTELISTE_FIELDS;
      default: return [];
    }
  }, []);

  const getFilteredRecords = useCallback((entity: EntityKey) => {
    const records = getRecords(entity);
    const s = search.toLowerCase();
    const searched = !s ? records : records.filter((r: any) => {
      return Object.values(r.fields).some((v: any) => {
        if (v == null) return false;
        if (Array.isArray(v)) return v.some((item: any) => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
        if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
        return String(v).toLowerCase().includes(s);
      });
    });
    const entityFilters = filters[entity] ?? {};
    const fieldMeta = getFieldMeta(entity);
    return searched.filter((r: any) => {
      return fieldMeta.every((fm: any) => {
        const fv = entityFilters[fm.key];
        if (!fv || fv === '') return true;
        const val = r.fields?.[fm.key];
        if (fm.type === 'bool') {
          if (fv === 'true') return val === true;
          if (fv === 'false') return val !== true;
          return true;
        }
        if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
          const label = val && typeof val === 'object' && 'label' in val ? val.label : '';
          return String(label).toLowerCase().includes(fv.toLowerCase());
        }
        if (fm.type.includes('multiplelookup')) {
          if (!Array.isArray(val)) return false;
          return val.some((item: any) => String(item?.label ?? '').toLowerCase().includes(fv.toLowerCase()));
        }
        if (fm.type.includes('applookup')) {
          const display = getApplookupDisplay(entity, fm.key, val);
          return String(display).toLowerCase().includes(fv.toLowerCase());
        }
        return String(val ?? '').toLowerCase().includes(fv.toLowerCase());
      });
    });
  }, [getRecords, filters, getFieldMeta, getApplookupDisplay, search]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else { setSortKey(key); setSortDir('asc'); }
  }

  function sortRecords<T extends { fields: Record<string, any> }>(recs: T[]): T[] {
    if (!sortKey) return recs;
    return [...recs].sort((a, b) => {
      let va: any = a.fields[sortKey], vb: any = b.fields[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'object' && 'label' in va) va = va.label;
      if (typeof vb === 'object' && 'label' in vb) vb = vb.label;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  const toggleSelect = useCallback((entity: EntityKey, id: string) => {
    setSelectedIds(prev => {
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (next[entity].has(id)) next[entity].delete(id);
      else next[entity].add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((entity: EntityKey) => {
    const filtered = getFilteredRecords(entity);
    setSelectedIds(prev => {
      const allSelected = filtered.every((r: any) => prev[entity].has(r.record_id));
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (allSelected) {
        filtered.forEach((r: any) => next[entity].delete(r.record_id));
      } else {
        filtered.forEach((r: any) => next[entity].add(r.record_id));
      }
      return next;
    });
  }, [getFilteredRecords]);

  const clearSelection = useCallback((entity: EntityKey) => {
    setSelectedIds(prev => ({ ...prev, [entity]: new Set() }));
  }, []);

  const getServiceMethods = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'locations': return {
        create: (fields: any) => LivingAppsService.createLocation(fields),
        update: (id: string, fields: any) => LivingAppsService.updateLocation(id, fields),
        remove: (id: string) => LivingAppsService.deleteLocation(id),
      };
      case 'tischplan': return {
        create: (fields: any) => LivingAppsService.createTischplanEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateTischplanEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteTischplanEntry(id),
      };
      case 'aufgaben_to_dos': return {
        create: (fields: any) => LivingAppsService.createAufgabenToDo(fields),
        update: (id: string, fields: any) => LivingAppsService.updateAufgabenToDo(id, fields),
        remove: (id: string) => LivingAppsService.deleteAufgabenToDo(id),
      };
      case 'budgetplanung': return {
        create: (fields: any) => LivingAppsService.createBudgetplanungEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateBudgetplanungEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteBudgetplanungEntry(id),
      };
      case 'zeitplan_ablauf': return {
        create: (fields: any) => LivingAppsService.createZeitplanAblaufEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateZeitplanAblaufEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteZeitplanAblaufEntry(id),
      };
      case 'hochzeitsdetails': return {
        create: (fields: any) => LivingAppsService.createHochzeitsdetail(fields),
        update: (id: string, fields: any) => LivingAppsService.updateHochzeitsdetail(id, fields),
        remove: (id: string) => LivingAppsService.deleteHochzeitsdetail(id),
      };
      case 'dienstleister': return {
        create: (fields: any) => LivingAppsService.createDienstleisterEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateDienstleisterEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteDienstleisterEntry(id),
      };
      case 'gaesteliste': return {
        create: (fields: any) => LivingAppsService.createGaestelisteEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateGaestelisteEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteGaestelisteEntry(id),
      };
      default: return null;
    }
  }, []);

  async function handleCreate(entity: EntityKey, fields: any) {
    const svc = getServiceMethods(entity);
    if (!svc) return;
    await svc.create(fields);
    fetchAll();
    setCreateEntity(null);
  }

  async function handleUpdate(fields: any) {
    if (!dialogState) return;
    const svc = getServiceMethods(dialogState.entity);
    if (!svc) return;
    await svc.update(dialogState.record.record_id, fields);
    fetchAll();
    setDialogState(null);
  }

  async function handleBulkDelete() {
    if (!deleteTargets) return;
    const svc = getServiceMethods(deleteTargets.entity);
    if (!svc) return;
    setBulkLoading(true);
    try {
      for (const id of deleteTargets.ids) {
        await svc.remove(id);
      }
      clearSelection(deleteTargets.entity);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setDeleteTargets(null);
    }
  }

  async function handleBulkClone() {
    const svc = getServiceMethods(activeTab);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const records = getRecords(activeTab);
      const ids = Array.from(selectedIds[activeTab]);
      for (const id of ids) {
        const rec = records.find((r: any) => r.record_id === id);
        if (!rec) continue;
        const clean = cleanFieldsForApi(rec.fields, activeTab);
        await svc.create(clean as any);
      }
      clearSelection(activeTab);
      fetchAll();
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkEdit(fieldKey: string, value: any) {
    if (!bulkEditOpen) return;
    const svc = getServiceMethods(bulkEditOpen);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds[bulkEditOpen]);
      for (const id of ids) {
        await svc.update(id, { [fieldKey]: value });
      }
      clearSelection(bulkEditOpen);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setBulkEditOpen(null);
    }
  }

  function updateFilter(entity: EntityKey, fieldKey: string, value: string) {
    setFilters(prev => ({
      ...prev,
      [entity]: { ...prev[entity], [fieldKey]: value },
    }));
  }

  function clearEntityFilters(entity: EntityKey) {
    setFilters(prev => ({ ...prev, [entity]: {} }));
  }

  const activeFilterCount = useMemo(() => {
    const f = filters[activeTab] ?? {};
    return Object.values(f).filter(v => v && v !== '').length;
  }, [filters, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-destructive">{error.message}</p>
        <Button onClick={fetchAll}>Erneut versuchen</Button>
      </div>
    );
  }

  const filtered = getFilteredRecords(activeTab);
  const sel = selectedIds[activeTab];
  const allFiltered = filtered.every((r: any) => sel.has(r.record_id)) && filtered.length > 0;
  const fieldMeta = getFieldMeta(activeTab);

  return (
    <PageShell
      title="Verwaltung"
      subtitle="Alle Daten verwalten"
      action={
        <Button onClick={() => setCreateEntity(activeTab)} className="shrink-0">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="flex gap-2 flex-wrap">
        {ENTITY_TABS.map(tab => {
          const count = getRecords(tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(''); setSortKey(''); setSortDir('asc'); fetchAll(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(f => !f)} className="gap-2">
            <IconFilter className="h-4 w-4" />
            Filtern
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearEntityFilters(activeTab)}>
              Filter zurücksetzen
            </Button>
          )}
        </div>
        {sel.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-muted/60 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium">{sel.size} ausgewählt</span>
            <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(activeTab)}>
              <IconPencil className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Feld bearbeiten</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkClone()}>
              <IconCopy className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Kopieren</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteTargets({ entity: activeTab, ids: Array.from(sel) })}>
              <IconTrash className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Ausgewählte löschen</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clearSelection(activeTab)}>
              <IconX className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Auswahl aufheben</span>
            </Button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-lg border bg-muted/30">
          {fieldMeta.map((fm: any) => (
            <div key={fm.key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{fm.label}</label>
              {fm.type === 'bool' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="true">Ja</SelectItem>
                    <SelectItem value="false">Nein</SelectItem>
                  </SelectContent>
                </Select>
              ) : fm.type === 'lookup/select' || fm.type === 'lookup/radio' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {fm.options?.map((o: any) => (
                      <SelectItem key={o.key} value={o.label}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-8 text-xs"
                  placeholder="Filtern..."
                  value={filters[activeTab]?.[fm.key] ?? ''}
                  onChange={e => updateFilter(activeTab, fm.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[27px] bg-card shadow-lg overflow-x-auto">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="w-10 px-6">
                <Checkbox
                  checked={allFiltered}
                  onCheckedChange={() => toggleSelectAll(activeTab)}
                />
              </TableHead>
              {fieldMeta.map((fm: any) => (
                <TableHead key={fm.key} className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort(fm.key)}>
                  <span className="inline-flex items-center gap-1">
                    {fm.label}
                    {sortKey === fm.key ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map((record: any) => (
              <TableRow key={record.record_id} className={`transition-colors cursor-pointer ${sel.has(record.record_id) ? "bg-primary/5" : "hover:bg-muted/50"}`} onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewState({ entity: activeTab, record }); }}>
                <TableCell>
                  <Checkbox
                    checked={sel.has(record.record_id)}
                    onCheckedChange={() => toggleSelect(activeTab, record.record_id)}
                  />
                </TableCell>
                {fieldMeta.map((fm: any) => {
                  const val = record.fields?.[fm.key];
                  if (fm.type === 'bool') {
                    return (
                      <TableCell key={fm.key}>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          val ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {val ? 'Ja' : 'Nein'}
                        </span>
                      </TableCell>
                    );
                  }
                  if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{val?.label ?? '—'}</span></TableCell>;
                  }
                  if (fm.type.includes('multiplelookup')) {
                    return <TableCell key={fm.key}>{Array.isArray(val) ? val.map((v: any) => v?.label ?? v).join(', ') : '—'}</TableCell>;
                  }
                  if (fm.type.includes('applookup')) {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getApplookupDisplay(activeTab, fm.key, val)}</span></TableCell>;
                  }
                  if (fm.type.includes('date')) {
                    return <TableCell key={fm.key} className="text-muted-foreground">{fmtDate(val)}</TableCell>;
                  }
                  if (fm.type.startsWith('file')) {
                    return (
                      <TableCell key={fm.key}>
                        {val ? (
                          <div className="relative h-8 w-8 rounded bg-muted overflow-hidden">
                            <img src={val} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        ) : '—'}
                      </TableCell>
                    );
                  }
                  if (fm.type === 'string/textarea') {
                    return <TableCell key={fm.key} className="max-w-xs"><span className="truncate block">{val ?? '—'}</span></TableCell>;
                  }
                  if (fm.type === 'geo') {
                    return (
                      <TableCell key={fm.key} className="max-w-[200px]">
                        <span className="truncate block" title={val ? `${val.lat}, ${val.long}` : undefined}>
                          {val?.info ?? (val ? `${val.lat?.toFixed(4)}, ${val.long?.toFixed(4)}` : '—')}
                        </span>
                      </TableCell>
                    );
                  }
                  return <TableCell key={fm.key}>{val ?? '—'}</TableCell>;
                })}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setDialogState({ entity: activeTab, record })}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTargets({ entity: activeTab, ids: [record.record_id] })}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={fieldMeta.length + 2} className="text-center py-16 text-muted-foreground">
                  Keine Ergebnisse gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(createEntity === 'locations' || dialogState?.entity === 'locations') && (
        <LocationsDialog
          open={createEntity === 'locations' || dialogState?.entity === 'locations'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'locations' ? handleUpdate : (fields: any) => handleCreate('locations', fields)}
          defaultValues={dialogState?.entity === 'locations' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Locations']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Locations']}
        />
      )}
      {(createEntity === 'tischplan' || dialogState?.entity === 'tischplan') && (
        <TischplanDialog
          open={createEntity === 'tischplan' || dialogState?.entity === 'tischplan'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'tischplan' ? handleUpdate : (fields: any) => handleCreate('tischplan', fields)}
          defaultValues={dialogState?.entity === 'tischplan' ? dialogState.record?.fields : undefined}
          gaestelisteList={(data as any).gaesteliste ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Tischplan']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Tischplan']}
        />
      )}
      {(createEntity === 'aufgaben_to_dos' || dialogState?.entity === 'aufgaben_to_dos') && (
        <AufgabenToDosDialog
          open={createEntity === 'aufgaben_to_dos' || dialogState?.entity === 'aufgaben_to_dos'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'aufgaben_to_dos' ? handleUpdate : (fields: any) => handleCreate('aufgaben_to_dos', fields)}
          defaultValues={dialogState?.entity === 'aufgaben_to_dos' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['AufgabenToDos']}
          enablePhotoLocation={AI_PHOTO_LOCATION['AufgabenToDos']}
        />
      )}
      {(createEntity === 'budgetplanung' || dialogState?.entity === 'budgetplanung') && (
        <BudgetplanungDialog
          open={createEntity === 'budgetplanung' || dialogState?.entity === 'budgetplanung'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'budgetplanung' ? handleUpdate : (fields: any) => handleCreate('budgetplanung', fields)}
          defaultValues={dialogState?.entity === 'budgetplanung' ? dialogState.record?.fields : undefined}
          dienstleisterList={(data as any).dienstleister ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Budgetplanung']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Budgetplanung']}
        />
      )}
      {(createEntity === 'zeitplan_ablauf' || dialogState?.entity === 'zeitplan_ablauf') && (
        <ZeitplanAblaufDialog
          open={createEntity === 'zeitplan_ablauf' || dialogState?.entity === 'zeitplan_ablauf'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'zeitplan_ablauf' ? handleUpdate : (fields: any) => handleCreate('zeitplan_ablauf', fields)}
          defaultValues={dialogState?.entity === 'zeitplan_ablauf' ? dialogState.record?.fields : undefined}
          locationsList={(data as any).locations ?? []}
          dienstleisterList={(data as any).dienstleister ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['ZeitplanAblauf']}
          enablePhotoLocation={AI_PHOTO_LOCATION['ZeitplanAblauf']}
        />
      )}
      {(createEntity === 'hochzeitsdetails' || dialogState?.entity === 'hochzeitsdetails') && (
        <HochzeitsdetailsDialog
          open={createEntity === 'hochzeitsdetails' || dialogState?.entity === 'hochzeitsdetails'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'hochzeitsdetails' ? handleUpdate : (fields: any) => handleCreate('hochzeitsdetails', fields)}
          defaultValues={dialogState?.entity === 'hochzeitsdetails' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Hochzeitsdetails']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Hochzeitsdetails']}
        />
      )}
      {(createEntity === 'dienstleister' || dialogState?.entity === 'dienstleister') && (
        <DienstleisterDialog
          open={createEntity === 'dienstleister' || dialogState?.entity === 'dienstleister'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'dienstleister' ? handleUpdate : (fields: any) => handleCreate('dienstleister', fields)}
          defaultValues={dialogState?.entity === 'dienstleister' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Dienstleister']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Dienstleister']}
        />
      )}
      {(createEntity === 'gaesteliste' || dialogState?.entity === 'gaesteliste') && (
        <GaestelisteDialog
          open={createEntity === 'gaesteliste' || dialogState?.entity === 'gaesteliste'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'gaesteliste' ? handleUpdate : (fields: any) => handleCreate('gaesteliste', fields)}
          defaultValues={dialogState?.entity === 'gaesteliste' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Gaesteliste']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Gaesteliste']}
        />
      )}
      {viewState?.entity === 'locations' && (
        <LocationsViewDialog
          open={viewState?.entity === 'locations'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'locations', record: r }); }}
        />
      )}
      {viewState?.entity === 'tischplan' && (
        <TischplanViewDialog
          open={viewState?.entity === 'tischplan'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'tischplan', record: r }); }}
          gaestelisteList={(data as any).gaesteliste ?? []}
        />
      )}
      {viewState?.entity === 'aufgaben_to_dos' && (
        <AufgabenToDosViewDialog
          open={viewState?.entity === 'aufgaben_to_dos'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'aufgaben_to_dos', record: r }); }}
        />
      )}
      {viewState?.entity === 'budgetplanung' && (
        <BudgetplanungViewDialog
          open={viewState?.entity === 'budgetplanung'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'budgetplanung', record: r }); }}
          dienstleisterList={(data as any).dienstleister ?? []}
        />
      )}
      {viewState?.entity === 'zeitplan_ablauf' && (
        <ZeitplanAblaufViewDialog
          open={viewState?.entity === 'zeitplan_ablauf'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'zeitplan_ablauf', record: r }); }}
          locationsList={(data as any).locations ?? []}
          dienstleisterList={(data as any).dienstleister ?? []}
        />
      )}
      {viewState?.entity === 'hochzeitsdetails' && (
        <HochzeitsdetailsViewDialog
          open={viewState?.entity === 'hochzeitsdetails'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'hochzeitsdetails', record: r }); }}
        />
      )}
      {viewState?.entity === 'dienstleister' && (
        <DienstleisterViewDialog
          open={viewState?.entity === 'dienstleister'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'dienstleister', record: r }); }}
        />
      )}
      {viewState?.entity === 'gaesteliste' && (
        <GaestelisteViewDialog
          open={viewState?.entity === 'gaesteliste'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'gaesteliste', record: r }); }}
        />
      )}

      <BulkEditDialog
        open={!!bulkEditOpen}
        onClose={() => setBulkEditOpen(null)}
        onApply={handleBulkEdit}
        fields={bulkEditOpen ? getFieldMeta(bulkEditOpen) : []}
        selectedCount={bulkEditOpen ? selectedIds[bulkEditOpen].size : 0}
        loading={bulkLoading}
        lookupLists={bulkEditOpen ? getLookupLists(bulkEditOpen) : {}}
      />

      <ConfirmDialog
        open={!!deleteTargets}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleBulkDelete}
        title="Ausgewählte löschen"
        description={`Sollen ${deleteTargets?.ids.length ?? 0} Einträge wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
      />
    </PageShell>
  );
}