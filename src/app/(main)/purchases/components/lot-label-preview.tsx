
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogClose, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PurchaseOrder, Contact, OrderItem } from '@/lib/types';
import { LotLabelContent } from './lot-label-content';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';

type LotLabelPreviewProps = {
  order: PurchaseOrder | null;
  supplier: Contact | null;
  specificItem: OrderItem | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function LotLabelPreview({ order, supplier, specificItem, isOpen, onOpenChange }: LotLabelPreviewProps) {
  const componentRef = React.useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
     pageStyle: `@page { size: A4; margin: 0; } @media print { body { -webkit-print-color-adjust: exact; } }`,
  });

  if (!order || !specificItem) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="p-6 pb-0 no-print">
          <DialogTitle>Previsualización de Etiqueta de Lote: {specificItem.lotNumber}</DialogTitle>
        </DialogHeader>
        <div className="p-6 max-h-[70vh] overflow-y-auto bg-gray-200">
           {/* This is a scaled-down preview for the UI */}
           <div className="w-[210mm] min-h-[297mm] mx-auto origin-top scale-[0.3] sm:scale-50 md:scale-75 lg:scale-100">
             <LotLabelContent ref={null} order={order} supplier={supplier} specificItem={specificItem} />
           </div>
        </div>
        {/* This is the hidden, full-sized version for printing */}
        <div className="hidden">
            <LotLabelContent ref={componentRef} order={order} supplier={supplier} specificItem={specificItem}/>
        </div>
        <DialogFooter className="p-6 pt-0 border-t gap-2 no-print">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cerrar</Button>
          </DialogClose>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Etiqueta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
