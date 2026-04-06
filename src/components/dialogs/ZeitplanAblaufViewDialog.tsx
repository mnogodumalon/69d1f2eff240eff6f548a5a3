import type { ZeitplanAblauf, Locations, Dienstleister } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface ZeitplanAblaufViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: ZeitplanAblauf | null;
  onEdit: (record: ZeitplanAblauf) => void;
  locationsList: Locations[];
  dienstleisterList: Dienstleister[];
}

export function ZeitplanAblaufViewDialog({ open, onClose, record, onEdit, locationsList, dienstleisterList }: ZeitplanAblaufViewDialogProps) {
  function getLocationsDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return locationsList.find(r => r.record_id === id)?.fields.loc_name ?? '—';
  }

  function getDienstleisterDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return dienstleisterList.find(r => r.record_id === id)?.fields.dl_firmenname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Zeitplan & Ablauf anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Location</Label>
            <p className="text-sm">{getLocationsDisplayName(record.fields.zeitplan_location)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verantwortlicher Dienstleister</Label>
            <p className="text-sm">{getDienstleisterDisplayName(record.fields.zeitplan_dienstleister)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datum & Uhrzeit</Label>
            <p className="text-sm">{formatDate(record.fields.zeitplan_uhrzeit)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Titel des Programmpunkts</Label>
            <p className="text-sm">{record.fields.zeitplan_titel ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.zeitplan_beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Dauer (Minuten)</Label>
            <p className="text-sm">{record.fields.zeitplan_dauer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kategorie</Label>
            <Badge variant="secondary">{record.fields.zeitplan_kategorie?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verantwortliche Person (intern)</Label>
            <p className="text-sm">{record.fields.zeitplan_verantwortliche_person ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.zeitplan_notizen ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}