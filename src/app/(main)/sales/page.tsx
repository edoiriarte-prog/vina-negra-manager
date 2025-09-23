
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { PlusCircle, Printer, Download, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useReactToPrint } from 'react-to-print';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';


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
  const [postSaveOrderOptions, setPostSaveOrderOptions] = useState<SalesOrder | null>(null);

  const { toast } = useToast();

  const [nextLotCorrelative, setNextLotCorrelative] = useState(1);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
      content: () => printRef.current,
  });

  useEffect(() => {
    setIsClient(true);
    // Calculate the initial next lot correlative
    const maxLotNumber = salesOrders.reduce((max, order) => {
        order.items.forEach(item => {
            if (item.lotNumber && item.lotNumber.startsWith('L')) {
                try {
                    const numberPart = parseInt(item.lotNumber.substring(1));
                    if (!isNaN(numberPart) && numberPart > max) {
                        max = numberPart;
                    }
                } catch(e) { /* ignore parse errors */ }
            }
        });
        return max;
    }, 0);
    setNextLotCorrelative(maxLotNumber + 1);
  }, [salesOrders]);
  
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

  const getNextLotNumber = useCallback(() => {
    const lotNumber = `L${nextLotCorrelative.toString().padStart(5, '0')}`;
    setNextLotCorrelative(prev => prev + 1); // Increment for the next call
    return lotNumber;
  }, [nextLotCorrelative]);


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

    let finalOrder: SalesOrder;

    if ('id' in orderToSave) {
      // Update
      finalOrder = { ...orderToSave, totalAmount, totalKilos, totalPackages } as SalesOrder;
      setSalesOrders(prev => prev.map(o => o.id === finalOrder.id ? finalOrder : o));
      toast({ title: 'Orden Actualizada', description: `La orden ${finalOrder.id} ha sido actualizada.` });
    } else {
      // Add
      finalOrder = {
        ...orderToSave,
        id: nextOrderId,
        totalAmount, 
        totalKilos, 
        totalPackages
      } as SalesOrder;
      setSalesOrders(prev => [...prev, finalOrder]);
      toast({ title: 'Orden Creada', description: `La orden ${finalOrder.id} ha sido creada.` });
    }

    setIsSheetOpen(false);
    setEditingOrder(null);
    setPostSaveOrderOptions(finalOrder); // Open post-save dialog
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

  const handleExport = (orderToExport: SalesOrder) => {
    const client = clients.find(c => c.id === orderToExport.clientId);
    const dataForSheet = orderToExport.items.map(item => ({
      'O/V': orderToExport.id,
      'Fecha': format(new Date(orderToExport.date), "dd-MM-yyyy"),
      'Cliente': client?.name,
      'Producto': item.product,
      'Calibre': item.caliber,
      'Tipo Envase': item.packagingType,
      'Cant. Envase': item.packagingQuantity,
      'Cantidad (kg)': item.quantity,
      'Lote': item.lotNumber,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Packing List');
    XLSX.writeFile(workbook, `PackingList-${orderToExport.id}.xlsx`);
    toast({ title: 'Exportación Exitosa', description: `Se ha generado el packing list para la O/V ${orderToExport.id}.` });
  };


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
      
      {postSaveOrderOptions && (
        <AlertDialog open={!!postSaveOrderOptions} onOpenChange={() => setPostSaveOrderOptions(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Orden "{postSaveOrderOptions.id}" Guardada</AlertDialogTitle>
              <AlertDialogDescription>
                La orden de venta ha sido guardada exitosamente. ¿Qué deseas hacer a continuación?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center gap-2">
              <Button variant="outline" onClick={() => handleExport(postSaveOrderOptions)}>
                <Download className="mr-2 h-4 w-4" />
                Exportar a Excel
              </Button>
              <Button variant="outline" onClick={() => { setPreviewingOrder(postSaveOrderOptions); setPostSaveOrderOptions(null); }}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir O/V
              </Button>
               <Button onClick={() => setPostSaveOrderOptions(null)}>
                <X className="mr-2 h-4 w-4" />
                Salir
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Hidden component for printing */}
      <div className="hidden">
          {previewingOrder && (
            <div ref={printRef}>
              <SalesOrderPreview
                order={previewingOrder}
                client={clients.find(c => c.id === previewingOrder.clientId) || null}
                carrier={carriers.find(c => c.id === (previewingOrder as any).carrierId) || null}
                isOpen={true}
                onOpenChange={() => {}}
                isPrintMode={true}
              />
            </div>
          )}
      </div>
    </>
  );
}

    

    
