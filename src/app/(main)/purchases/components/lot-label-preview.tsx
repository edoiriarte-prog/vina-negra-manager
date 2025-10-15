
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogClose, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PurchaseOrder, Contact } from '@/lib/types';
import { LotLabelContent } from './lot-label-content';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';

type LotLabelPreviewProps = {
  order: PurchaseOrder | null;
  supplier: Contact | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function LotLabelPreview({ order, supplier, isOpen, onOpenChange }: LotLabelPreviewProps) {
  const componentRef = React.useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  if (!order) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="p-6 pb-0 no-print">
          <DialogTitle>Etiquetas de Lote para O/C: {order.id}</DialogTitle>
        </DialogHeader>
        <div className="hidden">
            <LotLabelContent ref={componentRef} order={order} supplier={supplier} />
        </div>
        <div className="p-6">
            Se generarán etiquetas para los lotes de la orden de compra. Asegúrese de que la impresora esté lista.
        </div>
        <DialogFooter className="p-6 pt-0 border-t gap-2 no-print">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Etiquetas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
