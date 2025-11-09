'use client';

import { useState, useEffect } from 'react';
import { useCollection, useFirebase } from '@/firebase';
import { ServiceOrder } from '@/lib/types';
import { getColumns } from './components/columns';
import { DataTable } from './components/data-table';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { NewServiceOrderSheet } from './components/new-service-order-sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';

export default function ServicesPage() {
  const { firestore } = useFirebase();
  const serviceOrdersRef = useMemo(
    () => (firestore ? collection(firestore, 'serviceOrders') : null),
    [firestore]
  );
  const { data: serviceOrders, isLoading, error } = useCollection<ServiceOrder>(serviceOrdersRef);

  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<ServiceOrder | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { toast } = useToast();

  const handleSaveOrder = (order: ServiceOrder | Omit<ServiceOrder, 'id'>) => {
    if (!firestore) return;
    if ('id' in order) {
      const docRef = doc(firestore, 'serviceOrders', order.id);
      updateDocumentNonBlocking(docRef, order);
      toast({ title: 'Orden de Servicio Actualizada' });
    } else {
      addDocumentNonBlocking(collection(firestore, 'serviceOrders'), order);
      toast({ title: 'Orden de Servicio Creada' });
    }
    setIsSheetOpen(false);
    setEditingOrder(null);
  };

  const handleEdit = (order: ServiceOrder) => {
    setEditingOrder(order);
    setIsSheetOpen(true);
  };

  const handleDelete = (order: ServiceOrder) => {
    setDeletingOrder(order);
  };

  const confirmDelete = () => {
    if (deletingOrder && firestore) {
      deleteDocumentNonBlocking(doc(firestore, 'serviceOrders', deletingOrder.id));
      toast({ variant: 'destructive', title: 'Orden de Servicio Eliminada' });
      setDeletingOrder(null);
    }
  };

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setEditingOrder(null);
    }
  };

  const openNewOrderSheet = () => {
    setEditingOrder(null);
    setIsSheetOpen(true);
  };

  const columns = getColumns({ onEdit: handleEdit, onDelete: handleDelete });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      );
    }
     if (error) {
      return <div className="text-red-500">Error: {error.message}</div>;
    }
    return <DataTable columns={columns} data={serviceOrders || []} />;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-headline text-2xl">
                Gestión de Servicios (O/S)
              </CardTitle>
              <CardDescription>
                Registra costos operativos como fletes y jornales.
              </CardDescription>
            </div>
            <Button onClick={openNewOrderSheet}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Servicio
            </Button>
          </div>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>

      <NewServiceOrderSheet
        isOpen={isSheetOpen}
        onOpenChange={handleSheetOpenChange}
        onSave={handleSaveOrder}
        order={editingOrder}
      />

      <AlertDialog
        open={!!deletingOrder}
        onOpenChange={open => !open && setDeletingOrder(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Estás seguro de que quieres eliminar esta orden?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la
              orden "{deletingOrder?.id}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingOrder(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
