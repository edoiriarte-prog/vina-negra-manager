

"use client";

import { useState, useMemo } from 'react';
import { InventoryAdjustment, PurchaseOrder } from '@/lib/types';
import { getColumns } from './components/columns';
import { DataTable } from './components/data-table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { format } from 'date-fns';
import { useOperations } from '@/hooks/use-operations';
import { useAdjustmentsCRUD } from '@/hooks/use-adjustments-crud';

type LotAdjustment = Omit<InventoryAdjustment, 'id' | 'product' | 'caliber'>;

function LotAdjustmentForm({ onSave }: { onSave: (adjustment: LotAdjustment) => void }) {
    const { purchaseOrders } = useOperations();
    
    const [formData, setFormData] = useState<Omit<LotAdjustment, 'id'>>({
        date: format(new Date(), 'yyyy-MM-dd'),
        warehouse: '',
        type: 'decrease',
        quantity: 0,
        packagingQuantity: 0,
        reason: '',
        lotNumber: '',
    });

    const allLotNumbers = useMemo(() => {
        if (!purchaseOrders) return [];
        const lots = new Set<string>();
        purchaseOrders.forEach(po => po.items.forEach(item => {
            if (item.lotNumber) lots.add(item.lotNumber);
        }));
        return Array.from(lots);
    }, [purchaseOrders]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        setFormData({
            date: format(new Date(), 'yyyy-MM-dd'),
            warehouse: '',
            type: 'decrease',
            quantity: 0,
            packagingQuantity: 0,
            reason: '',
            lotNumber: '',
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <Card>
                <CardHeader>
                    <CardTitle>Nuevo Ajuste por Lote</CardTitle>
                    <CardDescription>Ajuste el stock de un lote específico.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <Label htmlFor="lot-date">Fecha</Label>
                        <Input id="lot-date" type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} required />
                    </div>
                     <div>
                        <Label htmlFor="lot-warehouse">Bodega</Label>
                        <Input id="lot-warehouse" value={formData.warehouse} onChange={e => setFormData(p => ({ ...p, warehouse: e.target.value }))} placeholder="Ej: Bodega Principal" required />
                    </div>
                    <div>
                        <Label htmlFor="lot-number">Número de Lote</Label>
                        <Select onValueChange={val => setFormData(p => ({ ...p, lotNumber: val }))} value={formData.lotNumber} required>
                            <SelectTrigger><SelectValue placeholder="Seleccione un lote" /></SelectTrigger>
                            <SelectContent>
                                {allLotNumbers.map(lot => <SelectItem key={lot} value={lot}>{lot}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div>
                        <Label htmlFor="lot-type">Tipo de Ajuste</Label>
                        <Select onValueChange={(val: 'increase' | 'decrease') => setFormData(p => ({ ...p, type: val }))} value={formData.type} required>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="decrease">Disminución</SelectItem>
                                <SelectItem value="increase">Aumento</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="lot-quantity">Ajuste Kilos</Label>
                        <Input id="lot-quantity" type="number" value={formData.quantity || ''} onChange={e => setFormData(p => ({ ...p, quantity: Number(e.target.value) }))} placeholder="0" />
                    </div>
                    <div>
                        <Label htmlFor="lot-packagingQuantity">Ajuste Envases</Label>
                        <Input id="lot-packagingQuantity" type="number" value={formData.packagingQuantity || ''} onChange={e => setFormData(p => ({ ...p, packagingQuantity: Number(e.target.value) }))} placeholder="0" />
                    </div>
                    <div className="md:col-span-2">
                        <Label htmlFor="lot-reason">Motivo / Referencia (OC/OV)</Label>
                        <Input id="lot-reason" value={formData.reason} onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))} required />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit">Guardar Ajuste de Lote</Button>
                </CardFooter>
            </Card>
        </form>
    );
}

export default function InventoryAdjustmentsPage() {
  const { inventoryAdjustments, purchaseOrders, isLoading } = useOperations();
  const { createAdjustment, createAdjustments, updateAdjustment, deleteAdjustment } = useAdjustmentsCRUD();
  
  const [editingAdjustment, setEditingAdjustment] = useState<InventoryAdjustment | null>(null);
  const [deletingAdjustment, setDeletingAdjustment] = useState<InventoryAdjustment | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { toast } = useToast();

  const handleSaveAdjustment = (data: (InventoryAdjustment | Omit<InventoryAdjustment, 'id'>)[] | InventoryAdjustment | Omit<InventoryAdjustment, 'id'>) => {
    if (Array.isArray(data)) {
        createAdjustments(data as Omit<InventoryAdjustment, 'id'>[]);
        toast({ title: `${data.length} Ajustes Creados` });
    } else {
      if ('id' in data) {
        updateAdjustment(data.id, data);
        toast({ title: "Ajuste Actualizado" });
      } else {
        if (!purchaseOrders) return;
        const lotAdjustmentData = data as Omit<InventoryAdjustment, 'id'>;
        
        const poItem = purchaseOrders.flatMap(po => po.items).find(item => item.lotNumber === lotAdjustmentData.lotNumber);
        if (!poItem) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo encontrar el lote seleccionado.' });
            return;
        }
        
        const newAdjustment = {
          ...lotAdjustmentData,
          product: poItem.product,
          caliber: poItem.caliber,
        };
        createAdjustment(newAdjustment);
        toast({ title: "Ajuste de Lote Creado" });
      }
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
      deleteAdjustment(deletingAdjustment.id);
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

  const { lotAdjustments, generalAdjustments } = useMemo(() => {
    if (!inventoryAdjustments) return { lotAdjustments: [], generalAdjustments: [] };
    return inventoryAdjustments.reduce((acc, adj) => {
      if (adj.lotNumber) {
        acc.lotAdjustments.push(adj);
      } else {
        acc.generalAdjustments.push(adj);
      }
      return acc;
    }, { lotAdjustments: [] as InventoryAdjustment[], generalAdjustments: [] as InventoryAdjustment[] });
  }, [inventoryAdjustments]);


  return (
    <>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-headline text-3xl">Ajustes de Inventario</h1>
          <p className="text-muted-foreground">Registra mermas, correcciones y otros movimientos de stock.</p>
        </div>
        
        <Tabs defaultValue="matrix">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="matrix">Ajustes por Matriz</TabsTrigger>
                <TabsTrigger value="lot">Ajustes por Lote</TabsTrigger>
            </TabsList>
            <TabsContent value="matrix">
                <Card className="mt-6">
                    <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                        <CardTitle className="font-headline text-2xl">Ajustes Generales por Matriz</CardTitle>
                        <CardDescription>Crea múltiples ajustes de stock por producto y calibre.</CardDescription>
                        </div>
                        <Button onClick={openNewAdjustmentSheet}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nuevo Ajuste por Matriz
                        </Button>
                    </div>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? <Skeleton className="h-64 w-full" /> : <DataTable columns={columns} data={generalAdjustments} />}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="lot">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    <LotAdjustmentForm onSave={handleSaveAdjustment} />
                     <Card>
                        <CardHeader>
                            <CardTitle>Historial de Ajustes de Lote</CardTitle>
                        </CardHeader>
                        <CardContent>
                           {isLoading ? <Skeleton className="h-64 w-full" /> : <DataTable columns={columns} data={lotAdjustments} />}
                        </CardContent>
                    </Card>
                 </div>
            </TabsContent>
        </Tabs>
      </div>
      
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
