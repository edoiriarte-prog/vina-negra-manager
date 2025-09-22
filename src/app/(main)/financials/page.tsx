"use client";

import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { financialMovements as initialFinancialMovements, purchaseOrders as initialPurchaseOrders, salesOrders as initialSalesOrders, serviceOrders as initialServiceOrders, contacts as initialContacts } from '@/lib/data';
import { FinancialMovement, PurchaseOrder, SalesOrder, ServiceOrder, Contact } from '@/lib/types';
import { getColumns } from './components/columns';
import { DataTable } from './components/data-table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { NewFinancialMovementSheet } from './components/new-financial-movement-sheet';
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
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';


export default function FinancialsPage() {
  const [financialMovements, setFinancialMovements] = useLocalStorage<FinancialMovement[]>('financialMovements', initialFinancialMovements);
  const [purchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [salesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
  const [serviceOrders] = useLocalStorage<ServiceOrder[]>('serviceOrders', initialServiceOrders);
  const [contacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
  
  const [editingMovement, setEditingMovement] = useState<FinancialMovement | null>(null);
  const [deletingMovement, setDeletingMovement] = useState<FinancialMovement | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSaveMovement = (movement: FinancialMovement | Omit<FinancialMovement, 'id'>) => {
    if ('id' in movement) {
      // Update
      setFinancialMovements(prev => prev.map(m => m.id === movement.id ? movement : m));
      toast({ title: "Movimiento Actualizado" });
    } else {
      // Add
      const lastId = financialMovements.reduce((max, m) => Math.max(max, parseInt(m.id.split('-')[1])), 0);
      const newMovement = {
        ...movement,
        id: `M-${lastId + 1}`,
      };
      setFinancialMovements(prev => [...prev, newMovement]);
      toast({ title: "Movimiento Creado" });
    }
    setIsSheetOpen(false);
    setEditingMovement(null);
  };

  const handleEdit = (movement: FinancialMovement) => {
    setEditingMovement(movement);
    setIsSheetOpen(true);
  };

  const handleDelete = (movement: FinancialMovement) => {
    setDeletingMovement(movement);
  };
  
  const confirmDelete = () => {
    if (deletingMovement) {
      setFinancialMovements((prev) => prev.filter((m) => m.id !== deletingMovement.id));
      toast({ variant: "destructive", title: "Movimiento Eliminado" });
      setDeletingMovement(null);
    }
  }

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setEditingMovement(null);
    }
  }
  
  const openNewMovementSheet = () => {
    setEditingMovement(null);
    setIsSheetOpen(true);
  }

  const columns = getColumns({ onEdit: handleEdit, onDelete: handleDelete });

  const renderContent = () => {
    if (!isClient) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )
    }
    return <DataTable columns={columns} data={financialMovements} />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-headline text-2xl">Movimientos Financieros</CardTitle>
              <CardDescription>Registra todos los ingresos y egresos.</CardDescription>
            </div>
            <Button onClick={openNewMovementSheet}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Movimiento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
      
      <NewFinancialMovementSheet 
        isOpen={isSheetOpen}
        onOpenChange={handleSheetOpenChange}
        onSave={handleSaveMovement}
        movement={editingMovement}
        allMovements={financialMovements}
        purchaseOrders={purchaseOrders}
        salesOrders={salesOrders}
        serviceOrders={serviceOrders}
        contacts={contacts}
      />

      <AlertDialog open={!!deletingMovement} onOpenChange={(open) => !open && setDeletingMovement(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de que quieres eliminar este movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el movimiento
               "{deletingMovement?.description}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingMovement(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
