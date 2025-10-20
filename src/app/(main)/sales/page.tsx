

"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { salesOrders as initialSalesOrders, contacts as initialContacts, purchaseOrders as initialPurchaseOrders, getInventory, serviceOrders as initialServiceOrders, financialMovements as initialFinancialMovements, inventoryAdjustments as initialInventoryAdjustments } from '@/lib/data';
import { SalesOrder, Contact, PurchaseOrder, InventoryItem, OrderItem, ServiceOrder, FinancialMovement, InventoryAdjustment } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, X, MoreHorizontal, Eye, ChevronDown, Edit, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { es } from 'date-fns/locale';
import { SalesOrderPreview } from './components/sales-order-preview';
import { getColumns } from './components/columns';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);


export default function SalesPage() {
  const [salesOrders, setSalesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
  const [purchaseOrders, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [inventoryAdjustments] = useLocalStorage<InventoryAdjustment[]>('inventoryAdjustments', initialInventoryAdjustments);
  const [financialMovements, setFinancialMovements] = useLocalStorage<FinancialMovement[]>('financialMovements', initialFinancialMovements);
  const [contacts, setContacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
  
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [confirmingEditOrder, setConfirmingEditOrder] = useState<SalesOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<SalesOrder | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [previewingOrder, setPreviewingOrder] = useState<SalesOrder | null>(null);

  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState('');

  const { toast } = useToast();
  
  const clients = contacts.filter(c => c.type.includes('client'));
  const carriers = contacts.filter(c => c.type.includes('supplier'));

  useEffect(() => {
    setIsClient(true);
  }, []);

  const groupedOrders = useMemo(() => {
    const groups: Record<string, { clientName: string; orders: SalesOrder[]; subtotal: number; }> = {};
    
    salesOrders.forEach(order => {
        const client = clients.find(s => s.id === order.clientId);
        if (!client) return;

        if (!groups[client.id]) {
            groups[client.id] = {
                clientName: client.name,
                orders: [],
                subtotal: 0,
            };
        }
        groups[client.id].orders.push(order);
        groups[client.id].subtotal += order.totalAmount;
    });

    return Object.values(groups).sort((a,b) => a.clientName.localeCompare(b.clientName));
  }, [salesOrders, clients]);

  const grandTotal = useMemo(() => {
    return groupedOrders.reduce((sum, group) => sum + group.subtotal, 0);
  }, [groupedOrders]);
  
  const filteredGroupedOrders = useMemo(() => {
      if (!filter) return groupedOrders;
      return groupedOrders.filter(group => 
        group.clientName.toLowerCase().includes(filter.toLowerCase())
      );
  }, [groupedOrders, filter]);

  
  const inventory = useMemo(() => getInventory(purchaseOrders, salesOrders, inventoryAdjustments, editingOrder), [purchaseOrders, salesOrders, inventoryAdjustments, editingOrder]);

  const nextOrderId = useMemo(() => {
    const lastIdNumber = salesOrders.reduce((max, order) => {
        const idNum = parseInt(order.id.split('-')[1]);
        return idNum > max ? idNum : max;
    }, 2000); // Start from 2000 to ensure next is 2001 if no higher ID exists
    return `OV-${lastIdNumber + 1}`;
  }, [salesOrders]);


  const handleSaveOrder = (orderData: SalesOrder | Omit<SalesOrder, 'id' | 'totalPackages'>, newItems: OrderItem[] = []) => {
    let orderToSave: SalesOrder | Omit<SalesOrder, 'id' | 'totalPackages'>;

    const allItems = [...orderData.items, ...newItems];
    
    if ('id' in orderData) {
        orderToSave = { ...orderData, items: allItems };
    } else {
        orderToSave = { ...orderData, items: allItems };
    }

    for (const item of orderToSave.items) {
        const inventoryItem = inventory.find(i => i.product === item.product && i.caliber === item.caliber && i.warehouse === orderData.warehouse);
        const currentStock = inventoryItem ? inventoryItem.stock : 0;
        
        if (item.quantity > currentStock) {
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
    
    const totalKilos = allItems.reduce((sum, item) => {
      if (item.unit === 'Kilos') {
        return sum + Number(item.quantity || 0);
      }
      return sum;
    }, 0);
    const totalPackages = allItems.reduce((sum, item) => sum + (Number(item.packagingQuantity || 0)), 0);

    let finalOrder: SalesOrder;

    if ('id' in orderToSave) {
      finalOrder = { ...orderToSave, totalAmount, totalKilos, totalPackages, paymentStatus: orderToSave.paymentStatus || 'Pendiente' } as SalesOrder;
      setSalesOrders(prev => prev.map(o => o.id === finalOrder.id ? finalOrder : o));
      toast({ title: 'Orden Actualizada', description: `La orden ${finalOrder.id} ha sido actualizada.` });
    } else {
      finalOrder = {
        ...orderToSave,
        id: nextOrderId,
        totalAmount, 
        totalKilos, 
        totalPackages,
        paymentStatus: 'Pendiente'
      } as SalesOrder;
      setSalesOrders(prev => [...prev, finalOrder]);
      toast({ title: 'Orden Creada', description: `La orden ${finalOrder.id} ha sido creada.` });
    }
    
    if (finalOrder.movementType === 'Traslado Bodega Interna' && finalOrder.destinationWarehouse) {
        const internalSupplier = contacts.find(c => c.rut === '0-0');
        if (internalSupplier) {
            const lastPoId = purchaseOrders.reduce((max, o) => {
                if (o.id.startsWith('OC-T-')) {
                    const num = parseInt(o.id.split('-')[2]);
                    return num > max ? num : max;
                }
                return max;
            }, 0);
            const newPoId = `OC-T-${lastPoId + 1}`;
            
            const newPo: PurchaseOrder = {
                id: newPoId,
                supplierId: internalSupplier.id,
                date: finalOrder.date,
                status: 'completed',
                warehouse: finalOrder.destinationWarehouse,
                items: finalOrder.items.map((item, index) => ({
                    ...item,
                    id: `po-item-${newPoId}-${index}`,
                    price: 0,
                    lotNumber: `LOTE-T-${format(parseISO(finalOrder.date), 'ddMMyy')}-${newPoId.split('-')[2]}-${index}`
                })),
                totalAmount: 0,
                totalKilos: finalOrder.totalKilos,
                totalPackages: finalOrder.totalPackages,
            };
            
            setPurchaseOrders(prev => [...prev, newPo]);
            toast({
                title: 'Transferencia Procesada',
                description: `Se ha creado la Orden de Compra ${newPo.id} para el ingreso en ${finalOrder.destinationWarehouse}.`
            })
        }
    }


    const movementsForOrder = financialMovements.filter(m => m.relatedDocument?.id === finalOrder.id);
    const totalPaid = movementsForOrder.reduce((sum, m) => sum + m.amount, 0);
    
    let newPaymentStatus: 'Pendiente' | 'Abonado' | 'Pagado' = 'Pendiente';
    if (totalPaid >= finalOrder.totalAmount) {
        newPaymentStatus = 'Pagado';
    } else if (totalPaid > 0) {
        newPaymentStatus = 'Abonado';
    }
    
    if (finalOrder.paymentStatus !== newPaymentStatus) {
        finalOrder.paymentStatus = newPaymentStatus;
        setSalesOrders(prev => prev.map(o => o.id === finalOrder.id ? finalOrder : o));
    }

    setIsSheetOpen(false);
    setEditingOrder(null);
    setPreviewingOrder(finalOrder);
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
    if (deletingOrder) {
      setSalesOrders((prev) => prev.filter((o) => o.id !== deletingOrder.id));
      toast({ variant: "destructive", title: 'Orden Eliminada', description: `La orden ${deletingOrder.id} ha sido eliminada.` });
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
  
  const toggleCollapsible = (clientId: string) => {
    setOpenCollapsibles(prev => ({...prev, [clientId]: !prev[clientId]}));
  }

  const handleExport = (orderToExport: SalesOrder) => {
    const client = clients.find(c => c.id === orderToExport.clientId);
    const dataForSheet = orderToExport.items.map(item => {
      
      const advanceAmount = orderToExport.paymentMethod === 'Pago con Anticipo y Saldo' ? orderToExport.totalAmount * ((orderToExport.advancePercentage || 0) / 100) : 0;
      const balanceAmount = orderToExport.paymentMethod === 'Pago con Anticipo y Saldo' ? orderToExport.totalAmount - advanceAmount : 0;

      return {
        'Proveedor': 'Viña Negra',
        'O/V': orderToExport.id,
        'Fecha': format(new Date(orderToExport.date), "dd-MM-yyyy"),
        'Cliente': client?.name,
        'Producto': item.product,
        'Calibre': item.caliber,
        'Tipo Envase': item.packagingType,
        'Cant. Envase': item.packagingQuantity,
        'Cantidad (kg)': item.quantity,
        'Precio Unitario': item.price,
        'Subtotal': item.quantity * item.price,
        'Lote': item.lotNumber,
        'Modalidad de Pago': orderToExport.paymentMethod,
        'Monto Anticipo': advanceAmount > 0 ? advanceAmount : '',
        'Venc. Anticipo': orderToExport.advanceDueDate ? format(parseISO(orderToExport.advanceDueDate), 'dd-MM-yyyy') : '',
        'Monto Saldo': balanceAmount > 0 ? balanceAmount : '',
        'Venc. Saldo': orderToExport.balanceDueDate ? format(parseISO(orderToExport.balanceDueDate), 'dd-MM-yyyy') : '',
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Packing List');
    XLSX.writeFile(workbook, `PackingList-${orderToExport.id}.xlsx`);
    toast({ title: 'Exportación Exitosa', description: `Se ha generado el packing list para la O/V ${orderToExport.id}.` });
  };
  
  const handleExportAllCompleted = () => {
    const completedOrders = salesOrders.filter(o => o.status === 'completed');
    if (completedOrders.length === 0) {
        toast({
            variant: "destructive",
            title: "Sin Órdenes",
            description: "No hay órdenes completadas para exportar."
        });
        return;
    }
    
    const allItems: any[] = [];
    completedOrders.forEach(order => {
        const client = clients.find(c => c.id === order.clientId);
        const advanceAmount = order.paymentMethod === 'Pago con Anticipo y Saldo' ? order.totalAmount * ((order.advancePercentage || 0) / 100) : 0;
        const balanceAmount = order.paymentMethod === 'Pago con Anticipo y Saldo' ? order.totalAmount - advanceAmount : 0;

        order.items.forEach(item => {
            allItems.push({
                'Proveedor': 'Viña Negra',
                'O/V': order.id,
                'Fecha': format(new Date(order.date), "dd-MM-yyyy"),
                'Cliente': client?.name,
                'Producto': item.product,
                'Calibre': item.caliber,
                'Tipo Envase': item.packagingType,
                'Cant. Envase': item.packagingQuantity,
                'Cantidad (kg)': item.quantity,
                'Precio Unitario': item.price,
                'Subtotal': item.quantity * item.price,
                'Lote': item.lotNumber,
                'Modalidad de Pago': order.paymentMethod,
                'Monto Anticipo': advanceAmount > 0 ? advanceAmount : '',
                'Venc. Anticipo': order.advanceDueDate ? format(parseISO(order.advanceDueDate), 'dd-MM-yyyy') : '',
                'Monto Saldo': balanceAmount > 0 ? balanceAmount : '',
                'Venc. Saldo': order.balanceDueDate ? format(parseISO(order.balanceDueDate), 'dd-MM-yyyy') : '',
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

  const columns = getColumns({ onEdit: handleEdit, onDelete: handleDelete, onPreview: handlePreviewRequest, clients });

  const renderContent = () => {
    if (!isClient) {
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
                      <TableHead className='w-[400px]'>Cliente</TableHead>
                      <TableHead className='text-right'>Monto Total</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {filteredGroupedOrders.map(group => {
                      const clientId = clients.find(s => s.name === group.clientName)?.id || '';
                      return (
                          <React.Fragment key={clientId}>
                              <TableRow className="cursor-pointer bg-muted/20 hover:bg-muted/30" onClick={() => toggleCollapsible(clientId)}>
                                  <TableCell className='font-bold'>
                                       <div className="flex items-center gap-2">
                                          <ChevronDown className={cn("h-4 w-4 transition-transform", openCollapsibles[clientId] && "rotate-180")} />
                                          {group.clientName}
                                      </div>
                                  </TableCell>
                                  <TableCell className='text-right font-bold'>{formatCurrency(group.subtotal)}</TableCell>
                              </TableRow>
                              {openCollapsibles[clientId] && (
                                  <TableRow>
                                      <TableCell colSpan={2} className="p-0">
                                          <div className='p-4 bg-background'>
                                              <Table>
                                                  <TableHeader>
                                                      <TableRow>
                                                          <TableHead>O/V</TableHead>
                                                          <TableHead>Fecha</TableHead>
                                                          <TableHead className="text-right">Kilos</TableHead>
                                                          <TableHead className="text-right">Monto</TableHead>
                                                          <TableHead className="w-[50px]"></TableHead>
                                                      </TableRow>
                                                  </TableHeader>
                                                  <TableBody>
                                                      {group.orders.map(order => (
                                                          <TableRow key={order.id}>
                                                              <TableCell className="font-medium">{order.id}</TableCell>
                                                              <TableCell>{format(parseISO(order.date), 'dd-MM-yyyy', { locale: es })}</TableCell>
                                                              <TableCell className="text-right">{order.totalKilos.toLocaleString('es-CL')} kg</TableCell>
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
                <CardTitle className="font-headline text-2xl">Gestión de Ventas (O/V)</CardTitle>
                <CardDescription>Crea y administra tus órdenes de venta.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportAllCompleted}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Packing List
              </Button>
              <Button onClick={openNewOrderSheet}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Venta
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
            carriers={carriers}
            inventory={inventory}
            nextOrderId={nextOrderId}
            purchaseOrders={purchaseOrders}
            salesOrders={salesOrders}
            contacts={contacts}
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
            onOpenChange={setPreviewingOrder}
            onExportRequest={() => handleExport(previewingOrder)}
        />
      )}
    </>
  );
}

