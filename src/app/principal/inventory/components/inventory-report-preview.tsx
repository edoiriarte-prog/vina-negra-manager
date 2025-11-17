
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';

type InventoryReportPreviewProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPrintRequest: () => void;
  onExportRequest: () => void;
  children: React.ReactNode;
};


export function InventoryReportPreview({ isOpen, onOpenChange, onPrintRequest, onExportRequest, children }: InventoryReportPreviewProps) {
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-0">
        <DialogHeader className="p-6 pb-0 no-print">
          <DialogTitle>Vista Previa: Reporte de Inventario</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
            {children}
        </div>

        <DialogFooter className="p-6 pt-0 border-t gap-2 no-print">
            <Button variant="outline" onClick={onExportRequest}>
                <Download className="mr-2 h-4 w-4" />
                Exportar Excel
            </Button>
            <Button variant="outline" onClick={onPrintRequest}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir PDF
            </Button>
            <DialogClose asChild>
                <Button type="button">Cerrar</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
