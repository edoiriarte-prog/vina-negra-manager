
"use client";

import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { inventoryAdjustments as initialInventoryAdjustments } from '@/lib/data';
import { InventoryAdjustment } from '@/lib/types';
import { getColumns } from './components/columns';
import { DataTable } from './components/data-table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { NewAdjustmentSheet } from './components/new-adjustment-sheet';
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
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function InventoryAdjustmentsPage() {
  const [adjustments, setAdjustments] = useLocalStorage<InventoryAdjustment[]>('inventoryAdjustments', initialInventoryAdjustments);
  
  const [editingAdjustment, setEditingAdjustment] = useState<InventoryAdjustment | null>(null);
  const [deletingAdjustment, setDeletingAdjustment] = useState<InventoryAdjustment | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSaveAdjustment = (adjustment: InventoryAdjustment | Omit<InventoryAdjustment, 'id'>) => {
    if ('id' in adjustment) {
      setAdjustments(prev => prev.map(a => a.id === adjustment.id ? adjustment : a));
      toast({ title: "Ajuste Actualizado" });
    } else {
      const lastId = adjustments.reduce((max, a) => {
        const num = parseInt(a.id.split('-')[1]);
        return num > max ? num : max;
      }, 0);
      const newAdjustment = {
        ...adjustment,
        id: `ADJ-${lastId + 1}`,
      };
      setAdjustments(prev => [...prev, newAdjustment]);
      toast({ title: "Ajuste Creado" });
    }
    setIsSheetOpen(false);
    setEditingAdjustment(null);
  };

  const handleEdit = (adjustment: InventoryAdjustment) => {
    setEditingAdjustment(adjustment);
    setIsSheetOpen(true);
  };

  const handleDelete = (adjustment: InventoryAdjustment) => {
    setDeletingAdjustment(adjustment);
  };
  
  const confirmDelete = () => {
    if (deletingAdjustment) {
      setAdjustments((prev) => prev.filter((a) => a.id !== deletingAdjustment.id));
      toast({ variant: "destructive", title: "Ajuste Eliminado" });
      setDeletingAdjustment(null);
    }
  }

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setEditingAdjustment(null);
    }
  }
  
  const openNewAdjustmentSheet = () => {
    setEditingAdjustment(null);
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
    return <DataTable columns={columns} data={adjustments} />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-headline text-2xl">Ajustes de Inventario</CardTitle>
              <CardDescription>Registra mermas, correcciones y otros movimientos de stock.</CardDescription>
            </div>
            <Button onClick={openNewAdjustmentSheet}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Ajuste
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
      
      <NewAdjustmentSheet 
        isOpen={isSheetOpen}
        onOpenChange={handleSheetOpenChange}
        onSave={handleSaveAdjustment}
        adjustment={editingAdjustment}
      />

      <AlertDialog open={!!deletingAdjustment} onOpenChange={(open) => !open && setDeletingAdjustment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de que quieres eliminar este ajuste?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el ajuste
               "{deletingAdjustment?.id}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingAdjustment(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
