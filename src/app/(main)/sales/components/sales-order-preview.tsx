
"use client";

import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SalesOrder } from '@/lib/types';
import { SalesOrderPreviewContent } from './sales-order-preview-content';
import { Printer, Download } from 'lucide-react';

type SalesOrderPreviewProps = {
  order: SalesOrder;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPrintRequest: () => void;
  onExportRequest: () => void;
};

export const SalesOrderPreview = React.forwardRef<HTMLDivElement, SalesOrderPreviewProps>(({ order, isOpen, onOpenChange, onPrintRequest, onExportRequest }, ref) => {
  if (!order) {
    return null;
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="p-6 pb-0 no-print">
          <DialogTitle>Orden de Venta: {order.id}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
            <SalesOrderPreviewContent
                ref={ref}
                order={order} 
            />
        </div>

        <DialogFooter className="mt-8 p-6 pt-0 border-t gap-2 no-print">
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
});

SalesOrderPreview.displayName = 'SalesOrderPreview';

    