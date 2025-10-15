
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
import { PurchaseOrder, Contact } from '@/lib/types';
import { PreviewContent } from './purchase-order-preview-content';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';

type PurchaseOrderPreviewProps = {
  order: PurchaseOrder | null;
  supplier: Contact | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPrintRequest: () => void;
};


export function PurchaseOrderPreview({ order, supplier, isOpen, onOpenChange, onPrintRequest }: PurchaseOrderPreviewProps) {
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
          <DialogTitle>Orden de Compra: {order.id}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
            <PreviewContent
                ref={componentRef}
                order={order} 
                supplier={supplier}
            />
        </div>

        <DialogFooter className="p-6 pt-0 border-t gap-2 no-print">
            <Button variant="outline" onClick={handlePrint}>
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
