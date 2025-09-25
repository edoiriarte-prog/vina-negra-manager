
"use client";

import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { purchaseOrders as initialPurchaseOrders, contacts as initialContacts } from '@/lib/data';
import { PurchaseOrder, Contact, OrderItem } from '@/lib/types';
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
import { PurchaseOrderPreview } from './components/purchase-order-preview';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';


export default function PurchasesPage() {
  const [purchaseOrders, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [contacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [confirmingEditOrder, setConfirmingEditOrder] = useState<PurchaseOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<PurchaseOrder | null>(null);
  const [previewingOrder, setPreviewingOrder] = useState<PurchaseOrder | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const suppliers = contacts.filter(c => c.type === 'supplier');

  const handleSaveOrder = (order: PurchaseOrder | Omit<PurchaseOrder, 'id' | 'totalAmount' | 'totalKilos'>, newItems: OrderItem[] = []) => {
    let orderToSave: PurchaseOrder | Omit<PurchaseOrder, 'id' | 'totalAmount' | 'totalKilos'>;
    
    // Combine existing items with new items from matrix dialog
    const allItems = [...order.items, ...newItems];

    orderToSave = { ...order, items: allItems };
    
    const totalAmount = orderToSave.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0);
    const totalKilos = orderToSave.items.reduce((sum, item) => {
        if (item.unit === 'Kilos') {
            return sum + Number(item.quantity || 0);
        }
        return sum;
    }, 0);

    let finalOrderData: PurchaseOrder | Omit<PurchaseOrder, 'id'> = { ...orderToSave, totalAmount, totalKilos };


    if ('id' in finalOrderData) {
      // Update
      setPurchaseOrders(prev => prev.map(o => o.id === (finalOrderData as PurchaseOrder).id ? finalOrderData as PurchaseOrder : o));
      toast({ title: 'Orden Actualizada', description: `La orden ${finalOrderData.id} ha sido actualizada.` });
    } else {
      // Add
      const sortedOrders = [...purchaseOrders].sort((a,b) => {
        const idA = a.id ? parseInt(a.id.split('-')[1]) : 0;
        const idB = b.id ? parseInt(b.id.split('-')[1]) : 0;
        return idA - idB;
      });
      const lastId = sortedOrders.length > 0 ? parseInt(sortedOrders[sortedOrders.length - 1].id.split('-')[1]) : 1000;
      const newOrder = {
        ...(finalOrderData as Omit<PurchaseOrder, 'id'>),
        id: `OC-${lastId + 1}`,
      };
      setPurchaseOrders(prev => [...prev, newOrder]);
      toast({ title: 'Orden Creada', description: `La orden ${newOrder.id} ha sido creada.` });
    }
    setIsSheetOpen(false);
    setEditingOrder(null);
  };

  const handleEdit = (order: PurchaseOrder) => {
    setConfirmingEditOrder(order);
  };

  const confirmEdit = () => {
    if (confirmingEditOrder) {
      setEditingOrder(confirmingEditOrder);
      setIsSheetOpen(true);
      setConfirmingEditOrder(null);
    }
  }

  const handleDelete = (order: PurchaseOrder) => {
    setDeletingOrder(order);
  };

  const handlePreview = (order: PurchaseOrder) => {
    setPreviewingOrder(order);
  }
  
  const confirmDelete = () => {
    if (deletingOrder) {
      setPurchaseOrders((prev) => prev.filter((o) => o.id !== deletingOrder.id));
      toast({ variant: 'destructive', title: 'Orden Eliminada', description: `La orden ${deletingOrder.id} ha sido eliminada.` });
      setDeletingOrder(null);
    }
  }

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setEditingOrder(null);
    }
  }
  
  const openNewOrderSheet = () => {
    setEditingOrder(null);
    setIsSheetOpen(true);
  }

  const handleExportAll = () => {
    if (purchaseOrders.length === 0) {
        toast({
            variant: "destructive",
            title: "Sin Órdenes",
            description: "No hay órdenes de compra para exportar."
        });
        return;
    }
    
    const allItems: any[] = [];
    purchaseOrders.forEach(order => {
        const supplier = suppliers.find(s => s.id === order.supplierId);
        order.items.forEach(item => {
            allItems.push({
                'O/C': order.id,
                'Fecha': format(new Date(order.date), "dd-MM-yyyy"),
                'Proveedor': supplier?.name,
                'RUT Proveedor': supplier?.rut,
                'Estado': order.status,
                'Bodega': order.warehouse,
                'Item ID': item.id,
                'Producto': item.product,
                'Calibre': item.caliber,
                'Cantidad': item.quantity,
                'Unidad': item.unit,
                'Precio Unitario': item.price,
                'Subtotal': item.quantity * item.price,
                'Tipo Envase': item.packagingType,
                'Cant. Envase': item.packagingQuantity,
                'Lote': item.lotNumber,
            });
        });
    });

    const worksheet = XLSX.utils.json_to_sheet(allItems);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ordenes de Compra');
    XLSX.writeFile(workbook, `Ordenes_de_Compra.xlsx`);
    toast({ title: 'Exportación Exitosa', description: 'Se han exportado todas las órdenes de compra.' });
  }

  const columns = getColumns({ onEdit: handleEdit, onDelete: handleDelete, onPreview: handlePreview, suppliers });

  const renderContent = () => {
    if (!isClient) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )
    }
    return <DataTable columns={columns} data={purchaseOrders} onRowClick={handleEdit} />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
                <CardTitle className="font-headline text-2xl">Gestión de Compras (O/C)</CardTitle>
                <CardDescription>Registra todas las adquisiciones de productos.</CardDescription>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportAll}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar a Excel
                </Button>
                <Button onClick={openNewOrderSheet}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nueva Compra
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
      
      <NewPurchaseOrderSheet 
        isOpen={isSheetOpen}
        onOpenChange={handleSheetOpenChange}
        onSave={handleSaveOrder}
        order={editingOrder}
        suppliers={suppliers}
      />

       <AlertDialog open={!!confirmingEditOrder} onOpenChange={(open) => !open && setConfirmingEditOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de que quieres editar esta orden?</AlertDialogTitle>
            <AlertDialogDescription>
              Se abrirá el formulario para editar la orden "{confirmingEditOrder?.id}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmingEditOrder(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEdit}>Editar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {previewingOrder && (
        <PurchaseOrderPreview
          order={previewingOrder}
          supplier={suppliers.find(s => s.id === previewingOrder.supplierId) || null}
          isOpen={!!previewingOrder}
          onOpenChange={(open) => !open && setPreviewingOrder(null)}
        />
      )}
    </>
  );
}
