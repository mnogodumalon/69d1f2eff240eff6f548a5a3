import { useState, useEffect, useRef, useCallback } from 'react';
import type { Hochzeitsdetails } from '@/types/app';
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
import { Checkbox } from '@/components/ui/checkbox';
import { IconCamera, IconCircleCheck, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromPhoto, extractPhotoMeta, reverseGeocode } from '@/lib/ai';

interface HochzeitsdetailsDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Hochzeitsdetails['fields']) => Promise<void>;
  defaultValues?: Hochzeitsdetails['fields'];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function HochzeitsdetailsDialog({ open, onClose, onSubmit, defaultValues, enablePhotoScan = true, enablePhotoLocation = true }: HochzeitsdetailsDialogProps) {
  const [fields, setFields] = useState<Partial<Hochzeitsdetails['fields']>>({});
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
      const clean = cleanFieldsForApi({ ...fields }, 'hochzeitsdetails');
      await onSubmit(clean as Hochzeitsdetails['fields']);
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
      const schema = `{\n  "braut_vorname": string | null, // Vorname der Braut\n  "braut_nachname": string | null, // Nachname der Braut\n  "braeutigam_vorname": string | null, // Vorname des Bräutigams\n  "braeutigam_nachname": string | null, // Nachname des Bräutigams\n  "braut_email": string | null, // E-Mail der Braut\n  "braeutigam_email": string | null, // E-Mail des Bräutigams\n  "braut_telefon": string | null, // Telefon der Braut\n  "braeutigam_telefon": string | null, // Telefon des Bräutigams\n  "hochzeitsdatum": string | null, // YYYY-MM-DD\n  "standesamtdatum": string | null, // YYYY-MM-DD\n  "motto": string | null, // Motto / Thema der Hochzeit\n  "farbschema": string | null, // Farbschema\n  "gaestezahl_geplant": number | null, // Geplante Gästeanzahl\n  "gesamtbudget": number | null, // Gesamtbudget (€)\n  "weddingplaner_vorname": string | null, // Vorname des Weddingplaners\n  "weddingplaner_nachname": string | null, // Nachname des Weddingplaners\n  "weddingplaner_email": string | null, // E-Mail des Weddingplaners\n  "weddingplaner_telefon": string | null, // Telefon des Weddingplaners\n  "notizen_allgemein": string | null, // Allgemeine Notizen\n}`;
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
        return merged as Partial<Hochzeitsdetails['fields']>;
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

  const DIALOG_INTENT = defaultValues ? 'Hochzeitsdetails bearbeiten' : 'Hochzeitsdetails hinzufügen';

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
            <Label htmlFor="braut_vorname">Vorname der Braut</Label>
            <Input
              id="braut_vorname"
              value={fields.braut_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, braut_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="braut_nachname">Nachname der Braut</Label>
            <Input
              id="braut_nachname"
              value={fields.braut_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, braut_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="braeutigam_vorname">Vorname des Bräutigams</Label>
            <Input
              id="braeutigam_vorname"
              value={fields.braeutigam_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, braeutigam_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="braeutigam_nachname">Nachname des Bräutigams</Label>
            <Input
              id="braeutigam_nachname"
              value={fields.braeutigam_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, braeutigam_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="braut_email">E-Mail der Braut</Label>
            <Input
              id="braut_email"
              type="email"
              value={fields.braut_email ?? ''}
              onChange={e => setFields(f => ({ ...f, braut_email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="braeutigam_email">E-Mail des Bräutigams</Label>
            <Input
              id="braeutigam_email"
              type="email"
              value={fields.braeutigam_email ?? ''}
              onChange={e => setFields(f => ({ ...f, braeutigam_email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="braut_telefon">Telefon der Braut</Label>
            <Input
              id="braut_telefon"
              value={fields.braut_telefon ?? ''}
              onChange={e => setFields(f => ({ ...f, braut_telefon: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="braeutigam_telefon">Telefon des Bräutigams</Label>
            <Input
              id="braeutigam_telefon"
              value={fields.braeutigam_telefon ?? ''}
              onChange={e => setFields(f => ({ ...f, braeutigam_telefon: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hochzeitsdatum">Hochzeitsdatum</Label>
            <Input
              id="hochzeitsdatum"
              type="date"
              value={fields.hochzeitsdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, hochzeitsdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="standesamtdatum">Datum der standesamtlichen Trauung</Label>
            <Input
              id="standesamtdatum"
              type="date"
              value={fields.standesamtdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, standesamtdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="motto">Motto / Thema der Hochzeit</Label>
            <Input
              id="motto"
              value={fields.motto ?? ''}
              onChange={e => setFields(f => ({ ...f, motto: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="farbschema">Farbschema</Label>
            <Input
              id="farbschema"
              value={fields.farbschema ?? ''}
              onChange={e => setFields(f => ({ ...f, farbschema: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gaestezahl_geplant">Geplante Gästeanzahl</Label>
            <Input
              id="gaestezahl_geplant"
              type="number"
              value={fields.gaestezahl_geplant ?? ''}
              onChange={e => setFields(f => ({ ...f, gaestezahl_geplant: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gesamtbudget">Gesamtbudget (€)</Label>
            <Input
              id="gesamtbudget"
              type="number"
              value={fields.gesamtbudget ?? ''}
              onChange={e => setFields(f => ({ ...f, gesamtbudget: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weddingplaner_vorname">Vorname des Weddingplaners</Label>
            <Input
              id="weddingplaner_vorname"
              value={fields.weddingplaner_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, weddingplaner_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weddingplaner_nachname">Nachname des Weddingplaners</Label>
            <Input
              id="weddingplaner_nachname"
              value={fields.weddingplaner_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, weddingplaner_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weddingplaner_email">E-Mail des Weddingplaners</Label>
            <Input
              id="weddingplaner_email"
              type="email"
              value={fields.weddingplaner_email ?? ''}
              onChange={e => setFields(f => ({ ...f, weddingplaner_email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weddingplaner_telefon">Telefon des Weddingplaners</Label>
            <Input
              id="weddingplaner_telefon"
              value={fields.weddingplaner_telefon ?? ''}
              onChange={e => setFields(f => ({ ...f, weddingplaner_telefon: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notizen_allgemein">Allgemeine Notizen</Label>
            <Textarea
              id="notizen_allgemein"
              value={fields.notizen_allgemein ?? ''}
              onChange={e => setFields(f => ({ ...f, notizen_allgemein: e.target.value }))}
              rows={3}
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