"use client";

import React, { useState, useMemo } from 'react';
import { SalesOrder, Contact, OrderItem, InventoryItem } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { NewSalesOrderSheet } from '../sales/components/new-sales-order-sheet';
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
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, MoreHorizontal, Eye, ChevronDown, Edit, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { es } from 'date-fns/locale';
import { SalesOrderPreview } from '../sales/components/sales-order-preview';
import { collection, doc } from 'firebase/firestore';
import { useFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
// Hooks
import { useOperations } from '@/hooks/use-operations';
import { useMasterData } from '@/hooks/use-master-data';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

export default function DispatchesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const { salesOrders, purchaseOrders, isLoading: loadingOps } = useOperations();
  const { contacts, inventory, isLoading: loadingMaster } = useMasterData();

  const isLoading = loadingOps || loadingMaster;

  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [confirmingEditOrder, setConfirmingEditOrder] = useState<SalesOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<SalesOrder | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [previewingOrder, setPreviewingOrder] = useState<SalesOrder | null>(null);
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState('');

  const clients = useMemo(() => contacts?.filter(c => Array.isArray(c.type) ? c.type.includes('client') : c.type === 'client') || [], [contacts]);
  const carriers = useMemo(() => contacts?.filter(c => Array.isArray(c.type) ? c.type.includes('carrier') : c.type === 'carrier') || [], [contacts]);
  
  // Filtramos órdenes activas
  const dispatchOrders = useMemo(() => {
      return salesOrders.filter(o => o.status !== 'cancelled'); 
  }, [salesOrders]);

  const groupedOrders = useMemo(() => {
    if (!dispatchOrders || !clients) return [];
    const groups: Record<string, { clientName: string; orders: SalesOrder[]; subtotal: number; }> = {};
    
    dispatchOrders.forEach(order => {
        const client = clients.find(s => s.id === order.clientId);
        const clientName = client ? client.name : 'Despacho Interno / Sin Cliente';
        const clientId = client ? client.id : 'internal';

        if (!groups[clientId]) {
            groups[clientId] = {
                clientName: clientName,
                orders: [],
                subtotal: 0,
            };
        }
        groups[clientId].orders.push(order);
        groups[clientId].subtotal += Number(order.totalAmount) || 0;
    });

    return Object.values(groups).sort((a,b) => a.clientName.localeCompare(b.clientName));
  }, [dispatchOrders, clients]);

  const grandTotal = useMemo(() => {
    return groupedOrders.reduce((sum, group) => sum + group.subtotal, 0);
  }, [groupedOrders]);
  
  const filteredGroupedOrders = useMemo(() => {
      if (!filter) return groupedOrders;
      return groupedOrders.filter(group => 
        group.clientName.toLowerCase().includes(filter.toLowerCase())
      );
  }, [groupedOrders, filter]);

  const handleSaveOrder = (orderData: SalesOrder | Omit<SalesOrder, 'id' | 'totalPackages'>, newItems: OrderItem[] = []) => {
    if (!firestore) return;
    let orderToSave: SalesOrder | Omit<SalesOrder, 'id' | 'totalPackages'>;

    const allItems = [...orderData.items, ...newItems];
    
    if ('id' in orderData) {
        orderToSave = { ...orderData, items: allItems };
    } else {
        // @ts-ignore
        orderToSave = { ...orderData, items: allItems, orderType: 'dispatch' };
    }

    // Validación Stock
    for (const item of orderToSave.items) {
        const inventoryItem = inventory.find(i => 
            i.name === item.product && 
            i.caliber === item.caliber && 
            i.warehouse === (orderData.warehouse || 'Principal')
        );
        
        const currentStock = inventoryItem ? inventoryItem.stock : 0;
        let quantityInOrder = 0;
        if('id' in orderToSave && editingOrder) {
             const oldItem = editingOrder.items.find(old => old.product === item.product && old.caliber === item.caliber);
             quantityInOrder = oldItem ? oldItem.quantity : 0;
        }

        if (item.quantity > (currentStock + quantityInOrder)) {
            toast({
                variant: "destructive",
                title: "Error de Stock",
                description: `No hay suficiente stock para ${item.product} - ${item.caliber}. Stock disponible: ${currentStock} kg.`,
            });
            return;
        }
    }
    
    const subtotal = allItems.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0);
    const totalAmount = orderToSave.includeVat ? subtotal * 1.19 : subtotal;
    const totalKilos = allItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const totalPackages = allItems.reduce((sum, item) => sum + (Number(item.packagingQuantity || 0)), 0);

    let finalOrderData: Omit<SalesOrder, 'id'> = {
        ...(orderToSave as Omit<SalesOrder, 'id'>), 
        totalAmount, 
        totalKilos, 
        totalPackages,
        paymentStatus: 'Pendiente',
        status: orderToSave.status || 'completed'
    };

    if ('id' in orderToSave) {
        updateDocumentNonBlocking(doc(firestore, 'salesOrders', orderToSave.id), finalOrderData);
        toast({ title: 'Orden Actualizada', description: `La orden ${orderToSave.id} ha sido actualizada.` });
        setPreviewingOrder({ ...finalOrderData, id: orderToSave.id } as SalesOrder);
    } else {
        addDocumentNonBlocking(collection(firestore, 'salesOrders'), finalOrderData).then(docRef => {
            if (docRef) {
                toast({ title: 'Orden Creada', description: `La orden ${docRef.id} ha sido creada.` });
                setPreviewingOrder({ ...finalOrderData, id: docRef.id } as SalesOrder);
            }
        });
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
  
  const confirmDelete = () => {
    if (deletingOrder && firestore) {
      deleteDocumentNonBlocking(doc(firestore, 'salesOrders', deletingOrder.id));
      toast({ variant: "destructive", title: 'Orden Eliminada', description: `La orden ${deletingOrder.id} ha sido eliminada.` });
      setDeletingOrder(null);
    }
  }

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) setEditingOrder(null);
  }
  
  const openNewOrderSheet = () => {
    setEditingOrder(null);
    setIsSheetOpen(true);
  }
  
  const toggleCollapsible = (clientId: string) => {
    setOpenCollapsibles(prev => ({...prev, [clientId]: !prev[clientId]}));
  }

  const handleExport = (orderToExport: SalesOrder) => {
    const client = clients.find(c => c.id === orderToExport.clientId);
    const dataForSheet = orderToExport.items.map(item => ({
        'Proveedor': 'Viña Negra',
        'O/S': orderToExport.id,
        'Fecha': format(parseISO(orderToExport.date), "dd-MM-yyyy"),
        'Cliente': client?.name || 'Interno',
        'Producto': item.product,
        'Calibre': item.caliber,
        'Tipo Envase': item.format || 'N/A',
        'Cant. Envase': item.packagingQuantity,
        'Cantidad (kg)': item.quantity,
        'Precio Unitario': item.price,
        'Subtotal': item.quantity * item.price,
        'Lote': item.lotNumber || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Packing List');
    XLSX.writeFile(workbook, `PackingList-${orderToExport.id}.xlsx`);
    toast({ title: 'Exportación Exitosa', description: `Se ha generado el packing list para la O/S ${orderToExport.id}.` });
  };
  
  const handleExportAllCompleted = () => {
    if (!dispatchOrders) return;
    const completedOrders = dispatchOrders.filter(o => o.status === 'completed');
    if (completedOrders.length === 0) {
        toast({ variant: "destructive", title: "Sin Órdenes", description: "No hay órdenes completadas para exportar." });
        return;
    }
    
    const allItems: any[] = [];
    completedOrders.forEach(order => {
        const client = clients.find(c => c.id === order.clientId);
        order.items.forEach(item => {
            allItems.push({
                'Proveedor': 'Viña Negra',
                'O/S': order.id,
                'Fecha': format(parseISO(order.date), "dd-MM-yyyy"),
                'Cliente': client?.name,
                'Producto': item.product,
                'Calibre': item.caliber,
                'Tipo Envase': item.format,
                'Cant. Envase': item.packagingQuantity,
                'Cantidad (kg)': item.quantity,
                'Precio Unitario': item.price,
                'Subtotal': item.quantity * item.price,
                'Lote': item.lotNumber,
            });
        });
    });

    const worksheet = XLSX.utils.json_to_sheet(allItems);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Packing List Completado');
    XLSX.writeFile(workbook, `PackingList_Completadas.xlsx`);
    toast({ title: 'Exportación Exitosa', description: 'Se ha generado el packing list con todas las órdenes completadas.' });
  }

  const handlePreviewRequest = (order: SalesOrder) => {
      setPreviewingOrder(order);
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )
    }
    return (
      <div className="rounded-md border">
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead className='w-[400px]'>Cliente / Destino</TableHead>
                      <TableHead className='text-right'>Monto Total</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {filteredGroupedOrders.map(group => {
                      const groupKey = group.clientName; 
                      return (
                          <React.Fragment key={groupKey}>
                              <TableRow className="cursor-pointer bg-muted/20 hover:bg-muted/30" onClick={() => toggleCollapsible(groupKey)}>
                                  <TableCell className='font-bold'>
                                        <div className="flex items-center gap-2">
                                          <ChevronDown className={cn("h-4 w-4 transition-transform", openCollapsibles[groupKey] && "rotate-180")} />
                                          {group.clientName}
                                      </div>
                                  </TableCell>
                                  <TableCell className='text-right font-bold'>{formatCurrency(group.subtotal)}</TableCell>
                              </TableRow>
                              {openCollapsibles[groupKey] && (
                                  <TableRow>
                                      <TableCell colSpan={2} className="p-0">
                                          <div className='p-4 bg-background'>
                                              <Table>
                                                  <TableHeader>
                                                      <TableRow>
                                                          <TableHead>O/S</TableHead>
                                                          <TableHead>Fecha</TableHead>
                                                          <TableHead className="text-right">Kilos</TableHead>
                                                          <TableHead className="text-right">Monto</TableHead>
                                                          <TableHead className="w-[50px]"></TableHead>
                                                      </TableRow>
                                                  </TableHeader>
                                                  <TableBody>
                                                      {group.orders.map(order => (
                                                          <TableRow key={order.id}>
                                                              <TableCell className="font-medium">{order.number || order.id}</TableCell>
                                                              <TableCell>{format(parseISO(order.date), 'dd-MM-yyyy', { locale: es })}</TableCell>
                                                              <TableCell className="text-right">
                                                                {order.items.reduce((s, i) => s + i.quantity, 0).toLocaleString('es-CL')} kg
                                                              </TableCell>
                                                              <TableCell className="text-right">{formatCurrency(order.totalAmount)}</TableCell>
                                                              <TableCell>
                                                                <DropdownMenu>
                                                                  <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                                      <span className="sr-only">Abrir menú</span>
                                                                      <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                  </DropdownMenuTrigger>
                                                                  <DropdownMenuContent align="end">
                                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                                    <DropdownMenuItem onClick={() => handlePreviewRequest(order)}>
                                                                          <Eye className='mr-2 h-4 w-4' />
                                                                          Visualizar
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleEdit(order)}>
                                                                        <Edit className='mr-2 h-4 w-4' />
                                                                        Editar
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem 
                                                                      className="text-destructive focus:text-destructive"
                                                                      onClick={() => handleDelete(order)}
                                                                    >
                                                                        <Trash2 className='mr-2 h-4 w-4' />
                                                                        Eliminar
                                                                    </DropdownMenuItem>
                                                                  </DropdownMenuContent>
                                                                </DropdownMenu>
                                                              </TableCell>
                                                          </TableRow>
                                                      ))}
                                                  </TableBody>
                                              </Table>
                                          </div>
                                      </TableCell>
                                  </TableRow>
                              )}
                          </React.Fragment>
                      );
                  })}
              </TableBody>
              <TableFooter>
                  <TableRow>
                      <TableHead className='text-right font-bold text-lg'>Total General</TableHead>
                      <TableHead className='text-right font-bold text-lg'>{formatCurrency(grandTotal)}</TableHead>
                  </TableRow>
              </TableFooter>
          </Table>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
                <CardTitle className="font-headline text-2xl">Traspaso de Bodega</CardTitle>
                <CardDescription>Crea y administra tus órdenes de traspaso entre bodegas.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportAllCompleted}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Packing List
              </Button>
              <Button onClick={openNewOrderSheet}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Traspaso
              </Button>
            </div>
          </div>
          <div className="py-4">
              <Input
                placeholder="Filtrar por cliente..."
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="max-w-sm"
              />
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
            // @ts-ignore
            carriers={carriers}
            inventory={inventory} 
            nextOrderId="" 
            purchaseOrders={purchaseOrders || []}
            salesOrders={salesOrders || []}
            inventoryAdjustments={[]}
            contacts={contacts || []}
            sheetType="dispatch"
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
            isOpen={!!previewingOrder}
            // CORRECCIÓN DEL ERROR DE TIPOS AQUÍ
            onOpenChange={(open) => !open && setPreviewingOrder(null)}
            onExportRequest={() => handleExport(previewingOrder)}
        />
      )}
    </>
  );
}