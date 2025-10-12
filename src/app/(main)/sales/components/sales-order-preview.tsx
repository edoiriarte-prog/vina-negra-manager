
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SalesOrder, Contact } from '@/lib/types';
import { PreviewContent } from './sales-order-preview-content';

type SalesOrderPreviewProps = {
  order: SalesOrder;
  client: Contact | null;
  carrier: Contact | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};


export const SalesOrderPreview = React.forwardRef<HTMLDivElement, SalesOrderPreviewProps>(({ order, client, carrier, isOpen, onOpenChange }, ref) => {

  if (!order) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="p-6 pb-0 no-print">
           <DialogTitle>Previsualización de Orden de Venta: {order.id}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto" id="print-area">
             <PreviewContent order={order} client={client} carrier={carrier} ref={ref} />
        </div>
        <DialogFooter className="p-6 pt-4 flex-row justify-end gap-2 no-print">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
SalesOrderPreview.displayName = "SalesOrderPreview";
