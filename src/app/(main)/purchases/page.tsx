"use client";

import { useState } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { purchaseOrders as initialPurchaseOrders, contacts as initialContacts } from '@/lib/data';
import { PurchaseOrder, Contact } from '@/lib/types';
import { getColumns } from './components/columns';
import { DataTable } from './components/data-table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { NewPurchaseOrderSheet } from './components/new-purchase-order-sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function PurchasesPage() {
  const [purchaseOrders, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [contacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<PurchaseOrder | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  const suppliers = contacts.filter(c => c.type === 'supplier');

  const handleSaveOrder = (order: PurchaseOrder | Omit<PurchaseOrder, 'id'>) => {
    if ('id' in order) {
      // Update
      setPurchaseOrders(prev => prev.map(o => o.id === order.id ? order : o));
    } else {
      // Add
      const newOrder = {
        ...order,
        id: `OC-00${purchaseOrders.length + 1}`,
      };
      setPurchaseOrders(prev => [...prev, newOrder]);
    }
    setIsSheetOpen(false);
    setEditingOrder(null);
  };

  const handleEdit = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setIsSheetOpen(true);
  };

  const handleDelete = (order: PurchaseOrder) => {
    setDeletingOrder(order);
  };
  
  const confirmDelete = () => {
    if (deletingOrder) {
      setPurchaseOrders((prev) => prev.filter((o) => o.id !== deletingOrder.id));
      setDeletingOrder(null);
    }
  }

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setEditingOrder(null);
    }
  }

  const columns = getColumns({ onEdit: handleEdit, onDelete: handleDelete, suppliers });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
                <CardTitle className="font-headline text-2xl">Gestión de Compras (O/C)</CardTitle>
                <CardDescription>Registra todas las adquisiciones de productos.</CardDescription>
            </div>
            <NewPurchaseOrderSheet 
              isOpen={isSheetOpen}
              onOpenChange={handleSheetOpenChange}
              onSave={handleSaveOrder}
              order={editingOrder}
              suppliers={suppliers}
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={purchaseOrders} />
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingOrder} onOpenChange={(open) => !open && setDeletingOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de que quieres eliminar esta orden?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la orden
               "{deletingOrder?.id}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingOrder(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
