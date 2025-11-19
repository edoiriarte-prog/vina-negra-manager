import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface LotLabelPreviewProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lotData: any;
}

export function LotLabelPreview({ isOpen, onOpenChange, lotData }: LotLabelPreviewProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Impresión de Etiquetas</DialogTitle>
        </DialogHeader>
        <div className="h-96 flex items-center justify-center border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">Aquí se generará el PDF de las etiquetas.</p>
          {/* Aquí iría la lógica real de impresión en el futuro */}
        </div>
      </DialogContent>
    </Dialog>
  );
}