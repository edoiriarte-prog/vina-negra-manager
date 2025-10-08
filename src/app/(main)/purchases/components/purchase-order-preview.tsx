
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
import { Edit, Trash2, FileDown } from 'lucide-react';
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
                order={order} 
                supplier={supplier}
                onEdit={onEdit}
                onDelete={onDelete}
                onExport={onExport}
            />
        </div>

        <DialogFooter className="mt-8 p-6 pt-0 border-t gap-2 no-print">
            <DialogClose asChild>
                <Button type="button">Cerrar</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
