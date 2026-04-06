import type { Hochzeitsdetails } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface HochzeitsdetailsViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Hochzeitsdetails | null;
  onEdit: (record: Hochzeitsdetails) => void;
}

export function HochzeitsdetailsViewDialog({ open, onClose, record, onEdit }: HochzeitsdetailsViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hochzeitsdetails anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname der Braut</Label>
            <p className="text-sm">{record.fields.braut_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname der Braut</Label>
            <p className="text-sm">{record.fields.braut_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname des Bräutigams</Label>
            <p className="text-sm">{record.fields.braeutigam_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname des Bräutigams</Label>
            <p className="text-sm">{record.fields.braeutigam_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">E-Mail der Braut</Label>
            <p className="text-sm">{record.fields.braut_email ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">E-Mail des Bräutigams</Label>
            <p className="text-sm">{record.fields.braeutigam_email ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Telefon der Braut</Label>
            <p className="text-sm">{record.fields.braut_telefon ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Telefon des Bräutigams</Label>
            <p className="text-sm">{record.fields.braeutigam_telefon ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hochzeitsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.hochzeitsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datum der standesamtlichen Trauung</Label>
            <p className="text-sm">{formatDate(record.fields.standesamtdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Motto / Thema der Hochzeit</Label>
            <p className="text-sm">{record.fields.motto ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Farbschema</Label>
            <p className="text-sm">{record.fields.farbschema ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Geplante Gästeanzahl</Label>
            <p className="text-sm">{record.fields.gaestezahl_geplant ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtbudget (€)</Label>
            <p className="text-sm">{record.fields.gesamtbudget ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname des Weddingplaners</Label>
            <p className="text-sm">{record.fields.weddingplaner_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname des Weddingplaners</Label>
            <p className="text-sm">{record.fields.weddingplaner_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">E-Mail des Weddingplaners</Label>
            <p className="text-sm">{record.fields.weddingplaner_email ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Telefon des Weddingplaners</Label>
            <p className="text-sm">{record.fields.weddingplaner_telefon ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Allgemeine Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.notizen_allgemein ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}