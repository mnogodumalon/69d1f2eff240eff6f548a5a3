import type { Tischplan, Gaesteliste } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';

interface TischplanViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Tischplan | null;
  onEdit: (record: Tischplan) => void;
  gaestelisteList: Gaesteliste[];
}

export function TischplanViewDialog({ open, onClose, record, onEdit, gaestelisteList }: TischplanViewDialogProps) {
  function getGaestelisteDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return gaestelisteList.find(r => r.record_id === id)?.fields.gast_vorname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tischplan anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tischname / Tischnummer</Label>
            <p className="text-sm">{record.fields.tisch_name ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tischform</Label>
            <Badge variant="secondary">{record.fields.tisch_form?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kapazität (Sitzplätze)</Label>
            <p className="text-sm">{record.fields.tisch_kapazitaet ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tischkategorie</Label>
            <Badge variant="secondary">{record.fields.tisch_kategorie?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gäste an diesem Tisch</Label>
            <p className="text-sm">{getGaestelisteDisplayName(record.fields.tisch_gaeste)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen zum Tisch</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.tisch_notizen ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}