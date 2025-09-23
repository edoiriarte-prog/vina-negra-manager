
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { salesOrders as initialSalesOrders, contacts as initialContacts, purchaseOrders as initialPurchaseOrders, getInventory } from '@/lib/data';
import { SalesOrder, Contact, PurchaseOrder, InventoryItem, OrderItem } from '@/lib/types';
import { getColumns } from './components/columns';
import { DataTable } from './components/data-table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { NewSalesOrderSheet } from './components/new-sales-order-sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { SalesOrderPreview } from './components/sales-order-preview';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';


export default function SalesPage() {
  const [salesOrders, setSalesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
  const [purchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [contacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
  
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [confirmingEditOrder, setConfirmingEditOrder] = useState<SalesOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<SalesOrder | null>(null);
  const [previewingOrder, setPreviewingOrder] = useState<SalesOrder | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const clients = contacts.filter(c => c.type === 'client');
  const carriers = contacts.filter(c => c.type === 'supplier');
  const inventory = useMemo(() => getInventory(purchaseOrders, salesOrders, editingOrder), [purchaseOrders, salesOrders, editingOrder]);

  const nextOrderId = useMemo(() => {
    const lastIdNumber = salesOrders.reduce((max, order) => {
        const idNum = parseInt(order.id.split('-')[1]);
        return idNum > max ? idNum : max;
    }, 2000); // Start from 2000 to ensure next is 2001 if no higher ID exists
    return `OV-${lastIdNumber + 1}`;
  }, [salesOrders]);

  const getNextLotNumber = (product: string, caliber: string): string => {
    const productCode = product.substring(0, 2).toUpperCase();
    const caliberCode = caliber.substring(0, 2).toUpperCase();
    const prefix = `LOTE-${productCode}${caliberCode}`;

    let maxCorrelative = 0;
    salesOrders.forEach(order => {
        order.items.forEach(item => {
            if (item.lotNumber && item.lotNumber.startsWith(prefix)) {
                const numberPart = parseInt(item.lotNumber.substring(prefix.length));
                if (!isNaN(numberPart) && numberPart > maxCorrelative) {
                    maxCorrelative = numberPart;
                }
            }
        });
    });

    const nextCorrelative = (maxCorrelative + 1).toString().padStart(5, '0');
    return `${prefix}${nextCorrelative}`;
  };

  const handleSaveOrder = (orderData: SalesOrder | Omit<SalesOrder, 'id' | 'totalPackages'>, newItems: OrderItem[] = []) => {
    let orderToSave: SalesOrder | Omit<SalesOrder, 'id' | 'totalPackages'>;

    // Combine existing items with new items from matrix dialog
    const allItems = [...orderData.items, ...newItems];
    
    // For existing orders, just update items. For new orders, use the combined list.
    if ('id' in orderData) {
        orderToSave = { ...orderData, items: allItems };
    } else {
        orderToSave = { ...orderData, items: allItems };
    }

     // Stock validation
    for (const item of orderToSave.items) {
        const inventoryItem = inventory.find(i => i.product === item.product && i.caliber === item.caliber && i.warehouse === orderData.warehouse);
        const currentStock = inventoryItem ? inventoryItem.stock : 0;
        
        // When editing, the item's original quantity is already excluded from inventory calculation
        if (item.quantity > currentStock) {
            toast({
                variant: "destructive",
                title: "Error de Stock",
                description: `No hay suficiente stock para ${item.product} - ${item.caliber}. Stock disponible: ${currentStock} kg.`,
            });
            return;
        }
    }
    
    const totalAmount = orderToSave.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0);
    const totalKilos = orderToSave.items.reduce((sum, item) => {
      if (item.unit === 'Kilos') {
        return sum + Number(item.quantity || 0);
      }
      return sum;
    }, 0);
    const totalPackages = orderToSave.items.reduce((sum, item) => sum + (Number(item.packagingQuantity || 0)), 0);

    const finalOrder = { ...orderToSave, totalAmount, totalKilos, totalPackages };


    if ('id' in finalOrder) {
      // Update
      setSalesOrders(prev => prev.map(o => o.id === (finalOrder as SalesOrder).id ? finalOrder as SalesOrder : o));
      toast({ title: 'Orden Actualizada', description: `La orden ${finalOrder.id} ha sido actualizada.` });
    } else {
      // Add
      const newOrder = {
        ...finalOrder,
        id: nextOrderId,
      };
      setSalesOrders(prev => [...prev, newOrder]);
      toast({ title: 'Orden Creada', description: `La orden ${newOrder.id} ha sido creada.` });
    }
    setIsSheetOpen(false);
    setEditingOrder(null);
  };

  const handleEdit = (order: SalesOrder) => {
    setConfirmingEditOrder(order);
  };
  
  const confirmEdit = () => {
    if (confirmingEditOrder) {
      setEditingOrder(confirmingEditOrder);
      setIsSheetOpen(true);
      setConfirmingEditOrder(null);
    }
  }

  const handleDelete = (order: SalesOrder) => {
    setDeletingOrder(order);
  };

  const handlePreview = (order: SalesOrder) => {
    setPreviewingOrder(order);
  }
  
  const confirmDelete = () => {
    if (deletingOrder) {
      setSalesOrders((prev) => prev.filter((o) => o.id !== deletingOrder.id));
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

  const columns = getColumns({ onEdit: handleEdit, onDelete: handleDelete, onPreview: handlePreview, clients });
  
  const renderContent = () => {
    if (!isClient) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )
    }
    return <DataTable columns={columns} data={salesOrders} onRowClick={handleEdit} />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
                <CardTitle className="font-headline text-2xl">Gestión de Ventas (O/V)</CardTitle>
                <CardDescription>Crea y administra tus órdenes de venta.</CardDescription>
            </div>
            <Button onClick={openNewOrderSheet}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Venta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
      
      {isSheetOpen && (
        <NewSalesOrderSheet 
            isOpen={isSheetOpen}
            onOpenChange={handleSheetOpenChange}
            onSave={handleSaveOrder}
            order={editingOrder}
            clients={clients}
            carriers={carriers}
            inventory={inventory}
            nextOrderId={nextOrderId}
            getNextLotNumber={getNextLotNumber}
        />
      )}

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
        <SalesOrderPreview
          order={previewingOrder}
          client={clients.find(s => s.id === previewingOrder.clientId) || null}
          carrier={carriers.find(s => s.id === (previewingOrder as any).carrierId) || null}
          isOpen={!!previewingOrder}
          onOpenChange={(open) => !open && setPreviewingOrder(null)}
        />
      )}
    </>
  );
}

    