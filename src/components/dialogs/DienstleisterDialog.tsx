import { useState, useEffect, useRef, useCallback } from 'react';
import type { Dienstleister } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, uploadFile, getUserProfile } from '@/services/livingAppsService';
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
import { fileToDataUri, extractFromPhoto, extractPhotoMeta, reverseGeocode, dataUriToBlob } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

interface DienstleisterDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Dienstleister['fields']) => Promise<void>;
  defaultValues?: Dienstleister['fields'];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function DienstleisterDialog({ open, onClose, onSubmit, defaultValues, enablePhotoScan = true, enablePhotoLocation = true }: DienstleisterDialogProps) {
  const [fields, setFields] = useState<Partial<Dienstleister['fields']>>({});
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
      const clean = cleanFieldsForApi({ ...fields }, 'dienstleister');
      await onSubmit(clean as Dienstleister['fields']);
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
      const schema = `{\n  "dl_vertragsdatum": string | null, // YYYY-MM-DD\n  "dl_notizen": string | null, // Notizen zum Dienstleister\n  "dl_kategorie": LookupValue | null, // Kategorie (select one key: "fotograf" | "videograf" | "caterer" | "florist" | "dj" | "band" | "konditor" | "friseur" | "makeup" | "trauredner" | "dekoration" | "transport" | "moderator" | "sonstiges_dl") mapping: fotograf=Fotograf, videograf=Videograf, caterer=Caterer, florist=Florist, dj=DJ, band=Band / Musiker, konditor=Konditor / Hochzeitstorte, friseur=Friseur, makeup=Make-up Artist, trauredner=Trauredner / Zeremonienmeister, dekoration=Dekoration, transport=Transport / Limousine, moderator=Moderator, sonstiges_dl=Sonstiges\n  "dl_firmenname": string | null, // Firmenname\n  "dl_ansprechpartner_vorname": string | null, // Vorname des Ansprechpartners\n  "dl_ansprechpartner_nachname": string | null, // Nachname des Ansprechpartners\n  "dl_telefon": string | null, // Telefon\n  "dl_email": string | null, // E-Mail\n  "dl_website": string | null, // Website\n  "dl_strasse": string | null, // Straße\n  "dl_hausnummer": string | null, // Hausnummer\n  "dl_plz": string | null, // Postleitzahl\n  "dl_ort": string | null, // Ort\n  "dl_gesamtpreis": number | null, // Gesamtpreis (€)\n  "dl_anzahlung": number | null, // Anzahlung (€)\n  "dl_restbetrag": number | null, // Restbetrag (€)\n  "dl_zahlungsstatus": LookupValue | null, // Zahlungsstatus (select one key: "offen" | "anzahlung_geleistet" | "vollstaendig_bezahlt" | "storniert") mapping: offen=Offen, anzahlung_geleistet=Anzahlung geleistet, vollstaendig_bezahlt=Vollständig bezahlt, storniert=Storniert\n}`;
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
        return merged as Partial<Dienstleister['fields']>;
      });
      // Upload scanned file to file fields
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        try {
          const blob = dataUriToBlob(uri);
          const fileUrl = await uploadFile(blob, file.name);
          setFields(prev => ({ ...prev, dl_vertrag_datei: fileUrl }));
        } catch (uploadErr) {
          console.error('File upload failed:', uploadErr);
        }
      }
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

  const DIALOG_INTENT = defaultValues ? 'Dienstleister bearbeiten' : 'Dienstleister hinzufügen';

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
            <Label htmlFor="dl_vertragsdatum">Vertragsdatum</Label>
            <Input
              id="dl_vertragsdatum"
              type="date"
              value={fields.dl_vertragsdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, dl_vertragsdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl_vertrag_datei">Vertrag (Datei)</Label>
            {fields.dl_vertrag_datei ? (
              <div className="flex items-center gap-3 rounded-lg border p-2">
                <div className="relative h-14 w-14 shrink-0 rounded-md bg-muted overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <IconFileText size={20} className="text-muted-foreground" />
                  </div>
                  <img
                    src={fields.dl_vertrag_datei}
                    alt=""
                    className="relative h-full w-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-foreground">{fields.dl_vertrag_datei.split("/").pop()}</p>
                  <div className="flex gap-2 mt-1">
                    <label
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      Ändern
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const fileUrl = await uploadFile(file, file.name);
                            setFields(f => ({ ...f, dl_vertrag_datei: fileUrl }));
                          } catch (err) { console.error('Upload failed:', err); }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setFields(f => ({ ...f, dl_vertrag_datei: undefined }))}
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label
                className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <IconUpload size={20} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Datei hochladen</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const fileUrl = await uploadFile(file, file.name);
                      setFields(f => ({ ...f, dl_vertrag_datei: fileUrl }));
                    } catch (err) { console.error('Upload failed:', err); }
                  }}
                />
              </label>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl_notizen">Notizen zum Dienstleister</Label>
            <Textarea
              id="dl_notizen"
              value={fields.dl_notizen ?? ''}
              onChange={e => setFields(f => ({ ...f, dl_notizen: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl_kategorie">Kategorie</Label>
            <Select
              value={lookupKey(fields.dl_kategorie) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, dl_kategorie: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="dl_kategorie"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="fotograf">Fotograf</SelectItem>
                <SelectItem value="videograf">Videograf</SelectItem>
                <SelectItem value="caterer">Caterer</SelectItem>
                <SelectItem value="florist">Florist</SelectItem>
                <SelectItem value="dj">DJ</SelectItem>
                <SelectItem value="band">Band / Musiker</SelectItem>
                <SelectItem value="konditor">Konditor / Hochzeitstorte</SelectItem>
                <SelectItem value="friseur">Friseur</SelectItem>
                <SelectItem value="makeup">Make-up Artist</SelectItem>
                <SelectItem value="trauredner">Trauredner / Zeremonienmeister</SelectItem>
                <SelectItem value="dekoration">Dekoration</SelectItem>
                <SelectItem value="transport">Transport / Limousine</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="sonstiges_dl">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl_firmenname">Firmenname</Label>
            <Input
              id="dl_firmenname"
              value={fields.dl_firmenname ?? ''}
              onChange={e => setFields(f => ({ ...f, dl_firmenname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl_ansprechpartner_vorname">Vorname des Ansprechpartners</Label>
            <Input
              id="dl_ansprechpartner_vorname"
              value={fields.dl_ansprechpartner_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, dl_ansprechpartner_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl_ansprechpartner_nachname">Nachname des Ansprechpartners</Label>
            <Input
              id="dl_ansprechpartner_nachname"
              value={fields.dl_ansprechpartner_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, dl_ansprechpartner_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl_telefon">Telefon</Label>
            <Input
              id="dl_telefon"
              value={fields.dl_telefon ?? ''}
              onChange={e => setFields(f => ({ ...f, dl_telefon: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl_email">E-Mail</Label>
            <Input
              id="dl_email"
              type="email"
              value={fields.dl_email ?? ''}
              onChange={e => setFields(f => ({ ...f, dl_email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl_website">Website</Label>
            <Input
              id="dl_website"
              value={fields.dl_website ?? ''}
              onChange={e => setFields(f => ({ ...f, dl_website: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl_strasse">Straße</Label>
            <Input
              id="dl_strasse"
              value={fields.dl_strasse ?? ''}
              onChange={e => setFields(f => ({ ...f, dl_strasse: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl_hausnummer">Hausnummer</Label>
            <Input
              id="dl_hausnummer"
              value={fields.dl_hausnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, dl_hausnummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl_plz">Postleitzahl</Label>
            <Input
              id="dl_plz"
              value={fields.dl_plz ?? ''}
              onChange={e => setFields(f => ({ ...f, dl_plz: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl_ort">Ort</Label>
            <Input
              id="dl_ort"
              value={fields.dl_ort ?? ''}
              onChange={e => setFields(f => ({ ...f, dl_ort: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl_gesamtpreis">Gesamtpreis (€)</Label>
            <Input
              id="dl_gesamtpreis"
              type="number"
              value={fields.dl_gesamtpreis ?? ''}
              onChange={e => setFields(f => ({ ...f, dl_gesamtpreis: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl_anzahlung">Anzahlung (€)</Label>
            <Input
              id="dl_anzahlung"
              type="number"
              value={fields.dl_anzahlung ?? ''}
              onChange={e => setFields(f => ({ ...f, dl_anzahlung: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl_restbetrag">Restbetrag (€)</Label>
            <Input
              id="dl_restbetrag"
              type="number"
              value={fields.dl_restbetrag ?? ''}
              onChange={e => setFields(f => ({ ...f, dl_restbetrag: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl_zahlungsstatus">Zahlungsstatus</Label>
            <Select
              value={lookupKey(fields.dl_zahlungsstatus) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, dl_zahlungsstatus: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="dl_zahlungsstatus"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="offen">Offen</SelectItem>
                <SelectItem value="anzahlung_geleistet">Anzahlung geleistet</SelectItem>
                <SelectItem value="vollstaendig_bezahlt">Vollständig bezahlt</SelectItem>
                <SelectItem value="storniert">Storniert</SelectItem>
              </SelectContent>
            </Select>
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