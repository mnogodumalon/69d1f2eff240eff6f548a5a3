import { useState, useEffect, useRef, useCallback } from 'react';
import type { Locations } from '@/types/app';
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
import { IconCamera, IconChevronDown, IconCircleCheck, IconCrosshair, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromPhoto, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { GeoMapPicker } from '@/components/GeoMapPicker';
import { lookupKey, lookupKeys } from '@/lib/formatters';

interface LocationsDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Locations['fields']) => Promise<void>;
  defaultValues?: Locations['fields'];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function LocationsDialog({ open, onClose, onSubmit, defaultValues, enablePhotoScan = true, enablePhotoLocation = true }: LocationsDialogProps) {
  const [fields, setFields] = useState<Partial<Locations['fields']>>({});
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
      setGeoFromPhoto(false);
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
      const clean = cleanFieldsForApi({ ...fields }, 'locations');
      await onSubmit(clean as Locations['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const [locating, setLocating] = useState(false);
  const [showCoords, setShowCoords] = useState(false);
  const [geoFromPhoto, setGeoFromPhoto] = useState(false);
  const geoDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  async function geoLocate(fieldKey: string) {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      let info = '';
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await res.json();
        info = data.display_name ?? '';
      } catch {}
      setFields(f => ({ ...f, [fieldKey]: { lat: latitude, long: longitude, info } as any }));
      setGeoFromPhoto(false);
      setLocating(false);
    }, () => { setLocating(false); });
  }
  function handleMapMove(fieldKey: string, lat: number, lng: number) {
    setFields(f => ({ ...f, [fieldKey]: { ...((f as any)[fieldKey] ?? {}), lat, long: lng } }));
    clearTimeout(geoDebounceRef.current);
    geoDebounceRef.current = setTimeout(async () => {
      const info = await reverseGeocode(lat, lng);
      setFields(f => ({ ...f, [fieldKey]: { ...((f as any)[fieldKey] ?? {}), info } }));
    }, 600);
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
      const schema = `{\n  "loc_name": string | null, // Name der Location\n  "loc_typ": LookupValue | null, // Typ der Location (select one key: "kirche" | "standesamt" | "schloss" | "restaurant" | "hotel" | "weingut" | "scheune" | "strand" | "garten" | "eventlocation" | "sonstiges_loc") mapping: kirche=Kirche, standesamt=Standesamt, schloss=Schloss, restaurant=Restaurant, hotel=Hotel, weingut=Weingut, scheune=Scheune / Landgut, strand=Strandlocation, garten=Gartenanlage, eventlocation=Eventlocation, sonstiges_loc=Sonstiges\n  "loc_verwendung": LookupValue[] | null, // Verwendung (select one or more keys: "standesamt_trauung" | "zeremonie" | "sektempfang" | "feier" | "uebernachtung_loc") mapping: standesamt_trauung=Standesamtliche Trauung, zeremonie=Kirchliche / Freie Zeremonie, sektempfang=Sektempfang, feier=Hochzeitsfeier / Dinner, uebernachtung_loc=Übernachtung\n  "loc_kapazitaet": number | null, // Kapazität (Personen)\n  "loc_strasse": string | null, // Straße\n  "loc_hausnummer": string | null, // Hausnummer\n  "loc_plz": string | null, // Postleitzahl\n  "loc_ort": string | null, // Ort\n  "loc_ansprechpartner_vorname": string | null, // Vorname des Ansprechpartners\n  "loc_ansprechpartner_nachname": string | null, // Nachname des Ansprechpartners\n  "loc_telefon": string | null, // Telefon\n  "loc_email": string | null, // E-Mail\n  "loc_website": string | null, // Website\n  "loc_mietpreis": number | null, // Mietpreis (€)\n  "loc_verfuegbar": boolean | null, // Location ist verfügbar / bestätigt\n  "loc_besichtigung": string | null, // YYYY-MM-DD\n  "loc_notizen": string | null, // Notizen zur Location\n}`;
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
        return merged as Partial<Locations['fields']>;
      });
      if (gps) {
        setFields(f => ({ ...f, loc_geo: { lat: gps.latitude, long: gps.longitude, info: geoAddr } as any }));
        setGeoFromPhoto(true);
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

  const DIALOG_INTENT = defaultValues ? 'Locations bearbeiten' : 'Locations hinzufügen';

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
            <Label htmlFor="loc_name">Name der Location</Label>
            <Input
              id="loc_name"
              value={fields.loc_name ?? ''}
              onChange={e => setFields(f => ({ ...f, loc_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc_typ">Typ der Location</Label>
            <Select
              value={lookupKey(fields.loc_typ) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, loc_typ: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="loc_typ"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="kirche">Kirche</SelectItem>
                <SelectItem value="standesamt">Standesamt</SelectItem>
                <SelectItem value="schloss">Schloss</SelectItem>
                <SelectItem value="restaurant">Restaurant</SelectItem>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="weingut">Weingut</SelectItem>
                <SelectItem value="scheune">Scheune / Landgut</SelectItem>
                <SelectItem value="strand">Strandlocation</SelectItem>
                <SelectItem value="garten">Gartenanlage</SelectItem>
                <SelectItem value="eventlocation">Eventlocation</SelectItem>
                <SelectItem value="sonstiges_loc">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc_verwendung">Verwendung</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="loc_verwendung_standesamt_trauung"
                  checked={lookupKeys(fields.loc_verwendung).includes('standesamt_trauung')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.loc_verwendung);
                      const next = checked ? [...current, 'standesamt_trauung'] : current.filter(k => k !== 'standesamt_trauung');
                      return { ...f, loc_verwendung: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="loc_verwendung_standesamt_trauung" className="font-normal">Standesamtliche Trauung</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="loc_verwendung_zeremonie"
                  checked={lookupKeys(fields.loc_verwendung).includes('zeremonie')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.loc_verwendung);
                      const next = checked ? [...current, 'zeremonie'] : current.filter(k => k !== 'zeremonie');
                      return { ...f, loc_verwendung: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="loc_verwendung_zeremonie" className="font-normal">Kirchliche / Freie Zeremonie</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="loc_verwendung_sektempfang"
                  checked={lookupKeys(fields.loc_verwendung).includes('sektempfang')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.loc_verwendung);
                      const next = checked ? [...current, 'sektempfang'] : current.filter(k => k !== 'sektempfang');
                      return { ...f, loc_verwendung: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="loc_verwendung_sektempfang" className="font-normal">Sektempfang</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="loc_verwendung_feier"
                  checked={lookupKeys(fields.loc_verwendung).includes('feier')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.loc_verwendung);
                      const next = checked ? [...current, 'feier'] : current.filter(k => k !== 'feier');
                      return { ...f, loc_verwendung: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="loc_verwendung_feier" className="font-normal">Hochzeitsfeier / Dinner</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="loc_verwendung_uebernachtung_loc"
                  checked={lookupKeys(fields.loc_verwendung).includes('uebernachtung_loc')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.loc_verwendung);
                      const next = checked ? [...current, 'uebernachtung_loc'] : current.filter(k => k !== 'uebernachtung_loc');
                      return { ...f, loc_verwendung: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="loc_verwendung_uebernachtung_loc" className="font-normal">Übernachtung</Label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc_kapazitaet">Kapazität (Personen)</Label>
            <Input
              id="loc_kapazitaet"
              type="number"
              value={fields.loc_kapazitaet ?? ''}
              onChange={e => setFields(f => ({ ...f, loc_kapazitaet: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc_strasse">Straße</Label>
            <Input
              id="loc_strasse"
              value={fields.loc_strasse ?? ''}
              onChange={e => setFields(f => ({ ...f, loc_strasse: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc_hausnummer">Hausnummer</Label>
            <Input
              id="loc_hausnummer"
              value={fields.loc_hausnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, loc_hausnummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc_plz">Postleitzahl</Label>
            <Input
              id="loc_plz"
              value={fields.loc_plz ?? ''}
              onChange={e => setFields(f => ({ ...f, loc_plz: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc_ort">Ort</Label>
            <Input
              id="loc_ort"
              value={fields.loc_ort ?? ''}
              onChange={e => setFields(f => ({ ...f, loc_ort: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc_geo">Standort auf Karte</Label>
            <div className="space-y-3">
              <Button type="button" variant="outline" className="w-full" disabled={locating} onClick={() => geoLocate("loc_geo")}>
                {locating ? <IconLoader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <IconCrosshair className="h-4 w-4 mr-1.5" />}
                Aktuellen Standort verwenden
              </Button>
              {geoFromPhoto && fields.loc_geo && (
                <p className="text-xs text-primary italic">Standort aus Foto übernommen</p>
              )}
              {fields.loc_geo?.info && (
                <p className="text-sm text-muted-foreground break-words whitespace-normal">
                  {fields.loc_geo.info}
                </p>
              )}
              {fields.loc_geo?.lat != null && fields.loc_geo?.long != null && (
                <GeoMapPicker
                  lat={fields.loc_geo.lat}
                  lng={fields.loc_geo.long}
                  onChange={(lat, lng) => handleMapMove("loc_geo", lat, lng)}
                />
              )}
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors" onClick={() => setShowCoords(v => !v)}>
                {showCoords ? 'Koordinaten verbergen' : 'Koordinaten anzeigen'}
                <IconChevronDown className={`h-3 w-3 transition-transform ${showCoords ? "rotate-180" : ""}`} />
              </button>
              {showCoords && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Breitengrad</Label>
                    <Input type="number" step="any"
                      value={fields.loc_geo?.lat ?? ''}
                      onChange={e => {
                        const v = e.target.value;
                        setFields(f => ({ ...f, loc_geo: { ...(f.loc_geo as any ?? {}), lat: v ? Number(v) : undefined } }));
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Längengrad</Label>
                    <Input type="number" step="any"
                      value={fields.loc_geo?.long ?? ''}
                      onChange={e => {
                        const v = e.target.value;
                        setFields(f => ({ ...f, loc_geo: { ...(f.loc_geo as any ?? {}), long: v ? Number(v) : undefined } }));
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc_ansprechpartner_vorname">Vorname des Ansprechpartners</Label>
            <Input
              id="loc_ansprechpartner_vorname"
              value={fields.loc_ansprechpartner_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, loc_ansprechpartner_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc_ansprechpartner_nachname">Nachname des Ansprechpartners</Label>
            <Input
              id="loc_ansprechpartner_nachname"
              value={fields.loc_ansprechpartner_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, loc_ansprechpartner_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc_telefon">Telefon</Label>
            <Input
              id="loc_telefon"
              value={fields.loc_telefon ?? ''}
              onChange={e => setFields(f => ({ ...f, loc_telefon: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc_email">E-Mail</Label>
            <Input
              id="loc_email"
              type="email"
              value={fields.loc_email ?? ''}
              onChange={e => setFields(f => ({ ...f, loc_email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc_website">Website</Label>
            <Input
              id="loc_website"
              value={fields.loc_website ?? ''}
              onChange={e => setFields(f => ({ ...f, loc_website: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc_mietpreis">Mietpreis (€)</Label>
            <Input
              id="loc_mietpreis"
              type="number"
              value={fields.loc_mietpreis ?? ''}
              onChange={e => setFields(f => ({ ...f, loc_mietpreis: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc_verfuegbar">Location ist verfügbar / bestätigt</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="loc_verfuegbar"
                checked={!!fields.loc_verfuegbar}
                onCheckedChange={(v) => setFields(f => ({ ...f, loc_verfuegbar: !!v }))}
              />
              <Label htmlFor="loc_verfuegbar" className="font-normal">Location ist verfügbar / bestätigt</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc_besichtigung">Datum der Besichtigung</Label>
            <Input
              id="loc_besichtigung"
              type="date"
              value={fields.loc_besichtigung ?? ''}
              onChange={e => setFields(f => ({ ...f, loc_besichtigung: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc_notizen">Notizen zur Location</Label>
            <Textarea
              id="loc_notizen"
              value={fields.loc_notizen ?? ''}
              onChange={e => setFields(f => ({ ...f, loc_notizen: e.target.value }))}
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