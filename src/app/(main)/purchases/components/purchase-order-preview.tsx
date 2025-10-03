
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
import { PurchaseOrder, Contact } from '@/lib/types';
import { Printer, Edit, Trash2, FileDown } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { PreviewContent } from './purchase-order-preview-content';

type PurchaseOrderPreviewProps = {
  order: PurchaseOrder | null;
  supplier: Contact | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
};


export function PurchaseOrderPreview({ order, supplier, isOpen, onOpenChange, onEdit, onDelete, onExport }: PurchaseOrderPreviewProps) {
  const componentRef = useRef<HTMLDivElement>(null);

  const PrintButton = useReactToPrint({
    content: () => componentRef.current,
    trigger: () => (
      <Button variant="outline">
        <Printer className="mr-2 h-4 w-4" />
        Imprimir
      </Button>
    ),
  });
  
  if (!order) {
    return null;
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Orden de Compra: {order.id}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
            <PreviewContent 
                ref={componentRef} 
                order={order} 
                supplier={supplier} 
            />
        </div>

        <DialogFooter className="mt-8 p-6 pt-0 border-t gap-2">
            <Button variant="outline" onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
            </Button>
            <PrintButton />
             <Button variant="outline" onClick={onExport}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar Excel
            </Button>
            <Button variant="destructive" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
            </Button>
            <DialogClose asChild>
                <Button type="button">Cerrar</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
