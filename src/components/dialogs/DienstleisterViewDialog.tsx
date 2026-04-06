import type { Dienstleister } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface DienstleisterViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Dienstleister | null;
  onEdit: (record: Dienstleister) => void;
}

export function DienstleisterViewDialog({ open, onClose, record, onEdit }: DienstleisterViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dienstleister anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vertragsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.dl_vertragsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vertrag (Datei)</Label>
            {record.fields.dl_vertrag_datei ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.dl_vertrag_datei} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen zum Dienstleister</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.dl_notizen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kategorie</Label>
            <Badge variant="secondary">{record.fields.dl_kategorie?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Firmenname</Label>
            <p className="text-sm">{record.fields.dl_firmenname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname des Ansprechpartners</Label>
            <p className="text-sm">{record.fields.dl_ansprechpartner_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname des Ansprechpartners</Label>
            <p className="text-sm">{record.fields.dl_ansprechpartner_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Telefon</Label>
            <p className="text-sm">{record.fields.dl_telefon ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">E-Mail</Label>
            <p className="text-sm">{record.fields.dl_email ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Website</Label>
            <p className="text-sm">{record.fields.dl_website ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Straße</Label>
            <p className="text-sm">{record.fields.dl_strasse ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hausnummer</Label>
            <p className="text-sm">{record.fields.dl_hausnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Postleitzahl</Label>
            <p className="text-sm">{record.fields.dl_plz ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ort</Label>
            <p className="text-sm">{record.fields.dl_ort ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtpreis (€)</Label>
            <p className="text-sm">{record.fields.dl_gesamtpreis ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anzahlung (€)</Label>
            <p className="text-sm">{record.fields.dl_anzahlung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Restbetrag (€)</Label>
            <p className="text-sm">{record.fields.dl_restbetrag ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zahlungsstatus</Label>
            <Badge variant="secondary">{record.fields.dl_zahlungsstatus?.label ?? '—'}</Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}