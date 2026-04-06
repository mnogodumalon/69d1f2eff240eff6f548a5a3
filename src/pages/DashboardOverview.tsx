import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichBudgetplanung, enrichZeitplanAblauf, enrichTischplan } from '@/lib/enrich';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { LivingAppsService } from '@/services/livingAppsService';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck, IconPlus, IconPencil, IconTrash,
  IconHeart, IconUsers, IconCurrencyEuro, IconCalendarEvent, IconClock, IconSquareCheck,
  IconChevronRight, IconRings, IconBuildingChurch, IconConfetti
} from '@tabler/icons-react';
import { AufgabenToDosDialog } from '@/components/dialogs/AufgabenToDosDialog';
import { ZeitplanAblaufDialog } from '@/components/dialogs/ZeitplanAblaufDialog';
import type { AufgabenToDos, ZeitplanAblauf } from '@/types/app';
import type { EnrichedZeitplanAblauf } from '@/types/enriched';

const APPGROUP_ID = '69d1f2eff240eff6f548a5a3';
const REPAIR_ENDPOINT = '/claude/build/repair';

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function DashboardOverview() {
  const {
    hochzeitsdetails, gaesteliste, dienstleister, locations, budgetplanung, aufgabenToDos, zeitplanAblauf, tischplan,
    gaestelisteMap, dienstleisterMap, locationsMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedBudgetplanung = enrichBudgetplanung(budgetplanung, { dienstleisterMap });
  const enrichedZeitplanAblauf = enrichZeitplanAblauf(zeitplanAblauf, { locationsMap, dienstleisterMap });
  enrichTischplan(tischplan, { gaestelisteMap }); // keep enrichment call

  const [aufgabenDialogOpen, setAufgabenDialogOpen] = useState(false);
  const [editAufgabe, setEditAufgabe] = useState<AufgabenToDos | null>(null);
  const [deleteAufgabeTarget, setDeleteAufgabeTarget] = useState<AufgabenToDos | null>(null);

  const [zeitplanDialogOpen, setZeitplanDialogOpen] = useState(false);
  const [editZeitplan, setEditZeitplan] = useState<EnrichedZeitplanAblauf | null>(null);
  const [deleteZeitplanTarget, setDeleteZeitplanTarget] = useState<EnrichedZeitplanAblauf | null>(null);

  const hochzeit = hochzeitsdetails[0];
  const tage = daysUntil(hochzeit?.fields.hochzeitsdatum);

  const offeneAufgaben = useMemo(() =>
    aufgabenToDos.filter(a => a.fields.aufgabe_status?.key !== 'erledigt'),
    [aufgabenToDos]
  );
  const erledigteAufgaben = useMemo(() =>
    aufgabenToDos.filter(a => a.fields.aufgabe_status?.key === 'erledigt').length,
    [aufgabenToDos]
  );

  const hochAufgaben = useMemo(() =>
    offeneAufgaben.filter(a => a.fields.aufgabe_prioritaet?.key === 'hoch'),
    [offeneAufgaben]
  );

  const zugesagt = useMemo(() => gaesteliste.filter(g => g.fields.rsvp_status?.key === 'zugesagt').length, [gaesteliste]);
  const ausstehend = useMemo(() => gaesteliste.filter(g => g.fields.rsvp_status?.key === 'ausstehend').length, [gaesteliste]);

  const gesamtGeplant = useMemo(() => budgetplanung.reduce((s, b) => s + (b.fields.budget_geplant ?? 0), 0), [budgetplanung]);
  const gesamtTatsaechlich = useMemo(() => enrichedBudgetplanung.reduce((s, b) => s + (b.fields.budget_tatsaechlich ?? 0), 0), [enrichedBudgetplanung]);
  const budgetGesamtbudget = hochzeit?.fields.gesamtbudget ?? 0;

  const naechsteEvents = useMemo(() => {
    const now = new Date();
    return enrichedZeitplanAblauf
      .filter(e => e.fields.zeitplan_uhrzeit && new Date(e.fields.zeitplan_uhrzeit) >= now)
      .sort((a, b) => new Date(a.fields.zeitplan_uhrzeit!).getTime() - new Date(b.fields.zeitplan_uhrzeit!).getTime())
  }, [enrichedZeitplanAblauf]);

  const prioritaetColor = (key?: string) => {
    if (key === 'hoch') return 'bg-red-50 text-red-700 border-red-200';
    if (key === 'mittel') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const statusColor = (key?: string) => {
    if (key === 'erledigt') return 'bg-green-50 text-green-700';
    if (key === 'in_bearbeitung') return 'bg-blue-50 text-blue-700';
    if (key === 'verschoben') return 'bg-orange-50 text-orange-700';
    return 'bg-slate-50 text-slate-600';
  };

  const handleAufgabeSubmit = async (fields: AufgabenToDos['fields']) => {
    if (editAufgabe) {
      await LivingAppsService.updateAufgabenToDo(editAufgabe.record_id, fields);
    } else {
      await LivingAppsService.createAufgabenToDo(fields);
    }
    fetchAll();
    setEditAufgabe(null);
  };

  const handleAufgabeDelete = async () => {
    if (!deleteAufgabeTarget) return;
    await LivingAppsService.deleteAufgabenToDo(deleteAufgabeTarget.record_id);
    fetchAll();
    setDeleteAufgabeTarget(null);
  };

  const handleZeitplanSubmit = async (fields: ZeitplanAblauf['fields']) => {
    if (editZeitplan) {
      await LivingAppsService.updateZeitplanAblaufEntry(editZeitplan.record_id, fields);
    } else {
      await LivingAppsService.createZeitplanAblaufEntry(fields);
    }
    fetchAll();
    setEditZeitplan(null);
  };

  const handleZeitplanDelete = async () => {
    if (!deleteZeitplanTarget) return;
    await LivingAppsService.deleteZeitplanAblaufEntry(deleteZeitplanTarget.record_id);
    fetchAll();
    setDeleteZeitplanTarget(null);
  };

  const budgetProzent = budgetGesamtbudget > 0 ? Math.round((gesamtTatsaechlich / budgetGesamtbudget) * 100) : null;

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Hero — Countdown & Hochzeitsinfo */}
      <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 border border-rose-100">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <IconRings size={18} className="text-rose-400 shrink-0" />
                <span className="text-sm font-medium text-rose-500">Eure Hochzeit</span>
              </div>
              {hochzeit ? (
                <>
                  <h1 className="text-2xl font-bold text-foreground truncate">
                    {hochzeit.fields.braut_vorname} &amp; {hochzeit.fields.braeutigam_vorname}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {hochzeit.fields.motto && <span className="italic">„{hochzeit.fields.motto}" · </span>}
                    {hochzeit.fields.hochzeitsdatum ? formatDate(hochzeit.fields.hochzeitsdatum) : 'Kein Datum gesetzt'}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">Noch keine Hochzeitsdetails hinterlegt.</p>
              )}
            </div>
            {tage !== null && (
              <div className="flex-shrink-0 text-center bg-white/70 rounded-2xl px-6 py-3 border border-rose-200/60">
                <div className="text-4xl font-black text-rose-500 leading-none">
                  {tage > 0 ? tage : tage === 0 ? '🎉' : Math.abs(tage)}
                </div>
                <div className="text-xs font-medium text-rose-400 mt-1">
                  {tage > 0 ? 'Tage noch' : tage === 0 ? 'Heute!' : 'Tage her'}
                </div>
              </div>
            )}
          </div>

          {/* Fortschrittsbalken Aufgaben */}
          {aufgabenToDos.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-muted-foreground">Aufgaben-Fortschritt</span>
                <span className="text-xs font-semibold text-foreground">
                  {erledigteAufgaben}/{aufgabenToDos.length} erledigt
                </span>
              </div>
              <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((erledigteAufgaben / aufgabenToDos.length) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Karten */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Gäste zugesagt – mit Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="text-left w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
              <StatCard
                title="Gäste zugesagt"
                value={String(zugesagt)}
                description={`${ausstehend} ausstehend · ${gaesteliste.length} gesamt`}
                icon={<IconUsers size={18} className="text-muted-foreground" />}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0 max-h-80 overflow-y-auto" align="start">
            <div className="sticky top-0 bg-popover border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Gäste zugesagt ({zugesagt})</p>
            </div>
            {gaesteliste.filter(g => g.fields.rsvp_status?.key === 'zugesagt').length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">Noch keine Zusagen</div>
            ) : (
              <div className="divide-y divide-border">
                {gaesteliste
                  .filter(g => g.fields.rsvp_status?.key === 'zugesagt')
                  .map(g => (
                    <div key={g.record_id} className="flex items-center gap-2 px-4 py-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <IconUsers size={13} className="text-primary" />
                      </div>
                      <span className="text-sm text-foreground truncate">
                        {[g.fields.gast_vorname, g.fields.gast_nachname].filter(Boolean).join(' ') || 'Unbekannt'}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </PopoverContent>
        </Popover>

        <StatCard
          title="Offene Aufgaben"
          value={String(offeneAufgaben.length)}
          description={`${hochAufgaben.length} mit hoher Priorität`}
          icon={<IconSquareCheck size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Tatsächl. Budget"
          value={formatCurrency(gesamtTatsaechlich)}
          description={budgetGesamtbudget > 0 ? `von ${formatCurrency(budgetGesamtbudget)} geplant${budgetProzent !== null ? ` · ${budgetProzent}%` : ''}` : `${budgetplanung.length} Posten`}
          icon={<IconCurrencyEuro size={18} className="text-muted-foreground" />}
        />

        {/* Dienstleister – mit Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="text-left w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
              <StatCard
                title="Dienstleister"
                value={String(dienstleister.length)}
                description={`${dienstleister.filter(d => d.fields.dl_zahlungsstatus?.key === 'vollstaendig_bezahlt').length} vollst. bezahlt`}
                icon={<IconConfetti size={18} className="text-muted-foreground" />}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 max-h-80 overflow-y-auto" align="end">
            <div className="sticky top-0 bg-popover border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Dienstleister ({dienstleister.length})</p>
            </div>
            {dienstleister.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">Noch keine Dienstleister erfasst</div>
            ) : (
              <div className="divide-y divide-border">
                {dienstleister.map(d => (
                  <div key={d.record_id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <IconConfetti size={13} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{d.fields.dl_firmenname || 'Unbekannt'}</p>
                        {d.fields.dl_kategorie && (
                          <p className="text-xs text-muted-foreground truncate">{d.fields.dl_kategorie.label}</p>
                        )}
                      </div>
                    </div>
                    {d.fields.dl_zahlungsstatus && (
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${
                        d.fields.dl_zahlungsstatus.key === 'vollstaendig_bezahlt'
                          ? 'bg-green-50 text-green-700'
                          : d.fields.dl_zahlungsstatus.key === 'anzahlung_geleistet'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-50 text-slate-600'
                      }`}>
                        {d.fields.dl_zahlungsstatus.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Hauptbereich: Aufgaben + Zeitplan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Aufgaben Hero */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <IconSquareCheck size={18} className="text-primary shrink-0" />
              <h2 className="font-semibold text-foreground">Offene Aufgaben</h2>
              {offeneAufgaben.length > 0 && (
                <Badge variant="secondary" className="text-xs">{offeneAufgaben.length}</Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setEditAufgabe(null); setAufgabenDialogOpen(true); }}
              className="gap-1.5 shrink-0"
            >
              <IconPlus size={14} />
              <span className="hidden sm:inline">Aufgabe</span>
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border" style={{ maxHeight: '420px' }}>
            {offeneAufgaben.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <IconHeart size={36} className="text-muted-foreground mb-3" stroke={1.5} />
                <p className="text-sm font-medium text-foreground">Alle Aufgaben erledigt!</p>
                <p className="text-xs text-muted-foreground mt-1">Genieße die Zeit bis zur Hochzeit.</p>
              </div>
            ) : (
              offeneAufgaben
                .sort((a, b) => {
                  const prio = { hoch: 0, mittel: 1, niedrig: 2 };
                  return (prio[a.fields.aufgabe_prioritaet?.key as keyof typeof prio] ?? 2) -
                    (prio[b.fields.aufgabe_prioritaet?.key as keyof typeof prio] ?? 2);
                })
                .map(aufgabe => (
                  <div key={aufgabe.record_id} className="flex items-start gap-3 px-5 py-3 hover:bg-accent/30 transition-colors">
                    <div className="mt-0.5 shrink-0">
                      <button
                        className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 hover:border-primary flex items-center justify-center transition-colors"
                        title="Als erledigt markieren"
                        onClick={async () => {
                          await LivingAppsService.updateAufgabenToDo(aufgabe.record_id, {
                            ...aufgabe.fields,
                            aufgabe_status: 'erledigt',
                            aufgabe_erledigt_am: new Date().toISOString().slice(0, 10),
                          });
                          fetchAll();
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {aufgabe.fields.aufgabe_titel ?? 'Ohne Titel'}
                          </p>
                          <div className="flex items-center flex-wrap gap-1.5 mt-1">
                            {aufgabe.fields.aufgabe_prioritaet && (
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${prioritaetColor(aufgabe.fields.aufgabe_prioritaet.key)}`}>
                                {aufgabe.fields.aufgabe_prioritaet.label}
                              </span>
                            )}
                            {aufgabe.fields.aufgabe_status && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(aufgabe.fields.aufgabe_status.key)}`}>
                                {aufgabe.fields.aufgabe_status.label}
                              </span>
                            )}
                            {aufgabe.fields.aufgabe_faelligkeitsdatum && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <IconCalendarEvent size={11} className="shrink-0" />
                                {formatDate(aufgabe.fields.aufgabe_faelligkeitsdatum)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => { setEditAufgabe(aufgabe); setAufgabenDialogOpen(true); }}
                            title="Bearbeiten"
                          >
                            <IconPencil size={14} />
                          </button>
                          <button
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => setDeleteAufgabeTarget(aufgabe)}
                            title="Löschen"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>

          {erledigteAufgaben > 0 && (
            <div className="px-5 py-3 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <IconCheck size={13} className="text-green-500 shrink-0" />
                {erledigteAufgaben} Aufgabe{erledigteAufgaben !== 1 ? 'n' : ''} bereits erledigt
              </p>
            </div>
          )}
        </div>

        {/* Zeitplan */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <IconClock size={18} className="text-primary shrink-0" />
              <h2 className="font-semibold text-foreground">Nächste Termine</h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setEditZeitplan(null); setZeitplanDialogOpen(true); }}
              className="gap-1.5 shrink-0"
            >
              <IconPlus size={14} />
              <span className="hidden sm:inline">Termin</span>
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border" style={{ maxHeight: '420px' }}>
            {naechsteEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <IconCalendarEvent size={36} className="text-muted-foreground mb-3" stroke={1.5} />
                <p className="text-sm font-medium text-foreground">Keine bevorstehenden Termine</p>
                <p className="text-xs text-muted-foreground mt-1">Füge Einträge zum Zeitplan hinzu.</p>
              </div>
            ) : (
              naechsteEvents.map(event => (
                <div key={event.record_id} className="flex items-start gap-3 px-5 py-3 hover:bg-accent/30 transition-colors">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex flex-col items-center justify-center">
                    <IconBuildingChurch size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {event.fields.zeitplan_titel ?? 'Ohne Titel'}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {event.fields.zeitplan_uhrzeit && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <IconClock size={11} className="shrink-0" />
                              {formatDate(event.fields.zeitplan_uhrzeit)}
                            </span>
                          )}
                          {event.fields.zeitplan_dauer && (
                            <span className="text-xs text-muted-foreground">· {event.fields.zeitplan_dauer} Min.</span>
                          )}
                          {event.fields.zeitplan_kategorie && (
                            <Badge variant="secondary" className="text-xs py-0">
                              {event.fields.zeitplan_kategorie.label}
                            </Badge>
                          )}
                        </div>
                        {event.zeitplan_locationName && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">📍 {event.zeitplan_locationName}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => { setEditZeitplan(event); setZeitplanDialogOpen(true); }}
                          title="Bearbeiten"
                        >
                          <IconPencil size={14} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => setDeleteZeitplanTarget(event)}
                          title="Löschen"
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-5 py-3 border-t border-border bg-muted/30">
            <a href="#/zeitplan-&-ablauf" className="text-xs text-primary flex items-center gap-1 hover:underline">
              Alle Termine verwalten
              <IconChevronRight size={13} />
            </a>
          </div>
        </div>
      </div>

      {/* Budget-Übersicht */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <IconCurrencyEuro size={18} className="text-primary shrink-0" />
            <h2 className="font-semibold text-foreground">Budget nach Kategorie</h2>
          </div>
          <a href="#/budgetplanung" className="text-xs text-primary flex items-center gap-0.5 hover:underline shrink-0">
            Alle anzeigen <IconChevronRight size={13} />
          </a>
        </div>

        {budgetplanung.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <IconCurrencyEuro size={36} className="text-muted-foreground mb-3" stroke={1.5} />
            <p className="text-sm text-muted-foreground">Noch keine Budgetposten erfasst.</p>
          </div>
        ) : (
          <div className="p-5">
            {budgetGesamtbudget > 0 && (
              <div className="mb-4 p-4 rounded-xl bg-muted/40 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">Gesamtbudget</span>
                    <span className="text-sm font-bold text-foreground">
                      {formatCurrency(gesamtTatsaechlich)} / {formatCurrency(budgetGesamtbudget)}
                    </span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (budgetProzent ?? 0) > 90 ? 'bg-red-500' :
                        (budgetProzent ?? 0) > 70 ? 'bg-amber-500' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(budgetProzent ?? 0, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{budgetProzent ?? 0}% ausgegeben · {formatCurrency(Math.max(0, budgetGesamtbudget - gesamtTatsaechlich))} verbleibend</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {(() => {
                const byKategorie: Record<string, { geplant: number; tatsaechlich: number; label: string }> = {};
                enrichedBudgetplanung.forEach(b => {
                  const key = b.fields.budget_kategorie?.key ?? 'sonstiges';
                  const label = b.fields.budget_kategorie?.label ?? 'Sonstiges';
                  if (!byKategorie[key]) byKategorie[key] = { geplant: 0, tatsaechlich: 0, label };
                  byKategorie[key].geplant += b.fields.budget_geplant ?? 0;
                  byKategorie[key].tatsaechlich += b.fields.budget_tatsaechlich ?? 0;
                });
                return Object.entries(byKategorie)
                  .sort((a, b) => b[1].tatsaechlich - a[1].tatsaechlich)
                  .slice(0, 6)
                  .map(([key, data]) => {
                    const pct = data.geplant > 0 ? Math.round((data.tatsaechlich / data.geplant) * 100) : 0;
                    return (
                      <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{data.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatCurrency(data.tatsaechlich)} / {formatCurrency(data.geplant)}
                          </p>
                        </div>
                        <div className="shrink-0 text-xs font-bold text-muted-foreground">{pct}%</div>
                      </div>
                    );
                  });
              })()}
            </div>

            <div className="mt-3 flex items-center justify-between pt-3 border-t border-border">
              <span className="text-sm text-muted-foreground">Geplant gesamt</span>
              <span className="text-sm font-semibold text-foreground">{formatCurrency(gesamtGeplant)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Dialoge */}
      <AufgabenToDosDialog
        open={aufgabenDialogOpen}
        onClose={() => { setAufgabenDialogOpen(false); setEditAufgabe(null); }}
        onSubmit={async (fields) => { await handleAufgabeSubmit(fields); setAufgabenDialogOpen(false); }}
        defaultValues={editAufgabe?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['AufgabenToDos']}
        enablePhotoLocation={AI_PHOTO_LOCATION['AufgabenToDos']}
      />

      <ZeitplanAblaufDialog
        open={zeitplanDialogOpen}
        onClose={() => { setZeitplanDialogOpen(false); setEditZeitplan(null); }}
        onSubmit={async (fields) => { await handleZeitplanSubmit(fields); setZeitplanDialogOpen(false); }}
        defaultValues={editZeitplan?.fields}
        locationsList={locations}
        dienstleisterList={dienstleister}
        enablePhotoScan={AI_PHOTO_SCAN['ZeitplanAblauf']}
        enablePhotoLocation={AI_PHOTO_LOCATION['ZeitplanAblauf']}
      />

      <ConfirmDialog
        open={!!deleteAufgabeTarget}
        title="Aufgabe löschen"
        description={`Möchtest du „${deleteAufgabeTarget?.fields.aufgabe_titel ?? 'diese Aufgabe'}" wirklich löschen?`}
        onConfirm={handleAufgabeDelete}
        onClose={() => setDeleteAufgabeTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteZeitplanTarget}
        title="Termin löschen"
        description={`Möchtest du „${deleteZeitplanTarget?.fields.zeitplan_titel ?? 'diesen Termin'}" wirklich löschen?`}
        onConfirm={handleZeitplanDelete}
        onClose={() => setDeleteZeitplanTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
