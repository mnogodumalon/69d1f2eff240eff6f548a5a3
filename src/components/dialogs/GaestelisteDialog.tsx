import { useState, useEffect, useRef, useCallback } from 'react';
import type { Gaesteliste } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, getUserProfile } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconCamera, IconCircleCheck, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromPhoto, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

interface GaestelisteDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Gaesteliste['fields']) => Promise<void>;
  defaultValues?: Gaesteliste['fields'];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function GaestelisteDialog({ open, onClose, onSubmit, defaultValues, enablePhotoScan = true, enablePhotoLocation = true }: GaestelisteDialogProps) {
  const [fields, setFields] = useState<Partial<Gaesteliste['fields']>>({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setFields(defaultValues ?? {});
      setPreview(null);
      setScanSuccess(false);
    }
  }, [open, defaultValues]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const clean = cleanFieldsForApi({ ...fields }, 'gaesteliste');
      await onSubmit(clean as Gaesteliste['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoScan(file: File) {
    setScanning(true);
    setScanSuccess(false);
    try {
      const [uri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
      if (file.type.startsWith('image/')) setPreview(uri);
      const gps = enablePhotoLocation ? meta?.gps ?? null : null;
      const parts: string[] = [];
      let geoAddr = '';
      if (gps) {
        geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
        parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
        if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
      }
      if (meta?.dateTime) {
        parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "barrierefreiheit": boolean | null, // Barrierefreier Zugang benötigt\n  "besondere_beduerfnisse": string | null, // Besondere Bedürfnisse / Anmerkungen\n  "gast_vorname": string | null, // Vorname\n  "gast_nachname": string | null, // Nachname\n  "gast_email": string | null, // E-Mail\n  "gast_telefon": string | null, // Telefon\n  "gast_strasse": string | null, // Straße\n  "gast_hausnummer": string | null, // Hausnummer\n  "gast_plz": string | null, // Postleitzahl\n  "gast_ort": string | null, // Ort\n  "beziehung": LookupValue | null, // Beziehung zum Brautpaar (select one key: "familie_braeutigam" | "freunde_braut" | "freunde_braeutigam" | "gemeinsame_freunde" | "arbeitskollegen" | "sonstige" | "familie_braut") mapping: familie_braeutigam=Familie des Bräutigams, freunde_braut=Freunde der Braut, freunde_braeutigam=Freunde des Bräutigams, gemeinsame_freunde=Gemeinsame Freunde, arbeitskollegen=Arbeitskollegen, sonstige=Sonstige, familie_braut=Familie der Braut\n  "sitzplatzkategorie": LookupValue | null, // Sitzplatzkategorie (select one key: "ehrentisch" | "familie" | "freunde" | "arbeitskollegen" | "sonstige_sitz") mapping: ehrentisch=Ehrentisch, familie=Familie, freunde=Freunde, arbeitskollegen=Arbeitskollegen, sonstige_sitz=Sonstige\n  "rsvp_status": LookupValue | null, // RSVP-Status (select one key: "ausstehend" | "zugesagt" | "abgesagt" | "vielleicht") mapping: ausstehend=Ausstehend, zugesagt=Zugesagt, abgesagt=Abgesagt, vielleicht=Vielleicht\n  "menuewahl": LookupValue | null, // Menüwahl (select one key: "fleisch" | "vegetarisch" | "vegan" | "fisch" | "kinderteller") mapping: fleisch=Fleisch, vegetarisch=Vegetarisch, vegan=Vegan, fisch=Fisch, kinderteller=Kinderteller\n  "allergien": string | null, // Allergien / Unverträglichkeiten\n  "uebernachtung": boolean | null, // Übernachtung benötigt\n  "kinderbegleitung": boolean | null, // Kommt mit Kindern\n  "anzahl_kinder": number | null, // Anzahl der Kinder\n}`;
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema, photoContext, DIALOG_INTENT);
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        for (const [k, v] of Object.entries(raw)) {
          if (v != null) merged[k] = v;
        }
        return merged as Partial<Gaesteliste['fields']>;
      });
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handlePhotoScan(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handlePhotoScan(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Gästeliste bearbeiten' : 'Gästeliste hinzufügen';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{DIALOG_INTENT}</DialogTitle>
        </DialogHeader>

        {enablePhotoScan && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div>
              <div className="flex items-center gap-1.5 font-medium">
                <IconSparkles className="h-4 w-4 text-primary" />
                KI-Assistent
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Versteht deine Fotos / Dokumente und füllt alles für dich aus</p>
            </div>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  KI-Assistent darf zusätzlich Informationen zu meiner Person verwenden
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? 'Lade...' : '(mehr Infos)'}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">Folgende Infos über dich können von der KI genutzt werden:</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">Profil konnte nicht geladen werden</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hierher ziehen oder auswählen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1.5" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1.5" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1.5" />Dokument
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="barrierefreiheit">Barrierefreier Zugang benötigt</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="barrierefreiheit"
                checked={!!fields.barrierefreiheit}
                onCheckedChange={(v) => setFields(f => ({ ...f, barrierefreiheit: !!v }))}
              />
              <Label htmlFor="barrierefreiheit" className="font-normal">Barrierefreier Zugang benötigt</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="besondere_beduerfnisse">Besondere Bedürfnisse / Anmerkungen</Label>
            <Textarea
              id="besondere_beduerfnisse"
              value={fields.besondere_beduerfnisse ?? ''}
              onChange={e => setFields(f => ({ ...f, besondere_beduerfnisse: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gast_vorname">Vorname</Label>
            <Input
              id="gast_vorname"
              value={fields.gast_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, gast_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gast_nachname">Nachname</Label>
            <Input
              id="gast_nachname"
              value={fields.gast_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, gast_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gast_email">E-Mail</Label>
            <Input
              id="gast_email"
              type="email"
              value={fields.gast_email ?? ''}
              onChange={e => setFields(f => ({ ...f, gast_email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gast_telefon">Telefon</Label>
            <Input
              id="gast_telefon"
              value={fields.gast_telefon ?? ''}
              onChange={e => setFields(f => ({ ...f, gast_telefon: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gast_strasse">Straße</Label>
            <Input
              id="gast_strasse"
              value={fields.gast_strasse ?? ''}
              onChange={e => setFields(f => ({ ...f, gast_strasse: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gast_hausnummer">Hausnummer</Label>
            <Input
              id="gast_hausnummer"
              value={fields.gast_hausnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, gast_hausnummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gast_plz">Postleitzahl</Label>
            <Input
              id="gast_plz"
              value={fields.gast_plz ?? ''}
              onChange={e => setFields(f => ({ ...f, gast_plz: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gast_ort">Ort</Label>
            <Input
              id="gast_ort"
              value={fields.gast_ort ?? ''}
              onChange={e => setFields(f => ({ ...f, gast_ort: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="beziehung">Beziehung zum Brautpaar</Label>
            <Select
              value={lookupKey(fields.beziehung) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, beziehung: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="beziehung"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="familie_braeutigam">Familie des Bräutigams</SelectItem>
                <SelectItem value="freunde_braut">Freunde der Braut</SelectItem>
                <SelectItem value="freunde_braeutigam">Freunde des Bräutigams</SelectItem>
                <SelectItem value="gemeinsame_freunde">Gemeinsame Freunde</SelectItem>
                <SelectItem value="arbeitskollegen">Arbeitskollegen</SelectItem>
                <SelectItem value="sonstige">Sonstige</SelectItem>
                <SelectItem value="familie_braut">Familie der Braut</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sitzplatzkategorie">Sitzplatzkategorie</Label>
            <Select
              value={lookupKey(fields.sitzplatzkategorie) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, sitzplatzkategorie: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="sitzplatzkategorie"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="ehrentisch">Ehrentisch</SelectItem>
                <SelectItem value="familie">Familie</SelectItem>
                <SelectItem value="freunde">Freunde</SelectItem>
                <SelectItem value="arbeitskollegen">Arbeitskollegen</SelectItem>
                <SelectItem value="sonstige_sitz">Sonstige</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rsvp_status">RSVP-Status</Label>
            <Select
              value={lookupKey(fields.rsvp_status) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, rsvp_status: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="rsvp_status"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="ausstehend">Ausstehend</SelectItem>
                <SelectItem value="zugesagt">Zugesagt</SelectItem>
                <SelectItem value="abgesagt">Abgesagt</SelectItem>
                <SelectItem value="vielleicht">Vielleicht</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="menuewahl">Menüwahl</Label>
            <Select
              value={lookupKey(fields.menuewahl) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, menuewahl: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="menuewahl"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="fleisch">Fleisch</SelectItem>
                <SelectItem value="vegetarisch">Vegetarisch</SelectItem>
                <SelectItem value="vegan">Vegan</SelectItem>
                <SelectItem value="fisch">Fisch</SelectItem>
                <SelectItem value="kinderteller">Kinderteller</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="allergien">Allergien / Unverträglichkeiten</Label>
            <Textarea
              id="allergien"
              value={fields.allergien ?? ''}
              onChange={e => setFields(f => ({ ...f, allergien: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uebernachtung">Übernachtung benötigt</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="uebernachtung"
                checked={!!fields.uebernachtung}
                onCheckedChange={(v) => setFields(f => ({ ...f, uebernachtung: !!v }))}
              />
              <Label htmlFor="uebernachtung" className="font-normal">Übernachtung benötigt</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kinderbegleitung">Kommt mit Kindern</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="kinderbegleitung"
                checked={!!fields.kinderbegleitung}
                onCheckedChange={(v) => setFields(f => ({ ...f, kinderbegleitung: !!v }))}
              />
              <Label htmlFor="kinderbegleitung" className="font-normal">Kommt mit Kindern</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="anzahl_kinder">Anzahl der Kinder</Label>
            <Input
              id="anzahl_kinder"
              type="number"
              value={fields.anzahl_kinder ?? ''}
              onChange={e => setFields(f => ({ ...f, anzahl_kinder: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}