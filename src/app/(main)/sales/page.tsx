
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { SalesOrderPreview } from './components/sales-order-preview';
import { Button } from '@/components/ui/button';
import { PlusCircle, Printer, Download, X, MoreHorizontal, Eye, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { PreviewContent } from './components/sales-order-preview';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useReactToPrint } from 'react-to-print';

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
  const [serviceOrders, setServiceOrders] = useLocalStorage<ServiceOrder[]>('serviceOrders', initialServiceOrders);
  const [financialMovements, setFinancialMovements] = useLocalStorage<FinancialMovement[]>('financialMovements', initialFinancialMovements);
  const [contacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
  
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [confirmingEditOrder, setConfirmingEditOrder] = useState<SalesOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<SalesOrder | null>(null);
  const [previewingOrder, setPreviewingOrder] = useState<SalesOrder | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [postSaveOrderOptions, setPostSaveOrderOptions] = useState<SalesOrder | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState('');

  const printComponentRef = React.useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();

  const [nextLotCorrelative, setNextLotCorrelative] = useState(1);
  
  const clients = contacts.filter(c => c.type.includes('client'));
  const carriers = contacts.filter(c => c.type.includes('supplier'));

  const handlePrint = useReactToPrint({
      content: () => printComponentRef.current,
  });
  
  useEffect(() => {
    if (isPrinting && previewingOrder && printComponentRef.current) {
        handlePrint();
        setIsPrinting(false); // Reset printing state
        setPreviewingOrder(null); // Clean up after printing
    }
  }, [isPrinting, previewingOrder, handlePrint]);
  

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
      finalOrder = { ...orderToSave, totalAmount, totalKilos, totalPackages, paymentStatus: orderToSave.paymentStatus || 'Pendiente' } as SalesOrder;
      setSalesOrders(prev => prev.map(o => o.id === finalOrder.id ? finalOrder : o));
      toast({ title: 'Orden Actualizada', description: `La orden ${finalOrder.id} ha sido actualizada.` });
    } else {
      // Add
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

    // Update payment status of related orders
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
                                                              <TableCell>{format(parseISO(order.date), 'dd-MM-yyyy')}</TableCell>
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
                                                                      <DropdownMenuItem onClick={() => { setPreviewingOrder(order); }}>
                                                                        <Eye className='mr-2 h-4 w-4' />
                                                                        Visualizar
                                                                      </DropdownMenuItem>
                                                                      <DropdownMenuItem onClick={() => handleEdit(order)}>
                                                                        Editar
                                                                      </DropdownMenuItem>
                                                                      <DropdownMenuSeparator />
                                                                      <DropdownMenuItem 
                                                                        className="text-destructive focus:text-destructive"
                                                                        onClick={() => handleDelete(order)}
                                                                      >
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
            getNextLotNumber={getNextLotNumber}
            purchaseOrders={purchaseOrders}
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
          carrier={carriers.find(s => s.id === previewingOrder.carrierId) || null}
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
                  <Button variant="outline" onClick={() => {
                    handleExport(postSaveOrderOptions);
                    setPostSaveOrderOptions(null);
                  }}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar a Excel
                  </Button>
                  <Button variant="default" onClick={() => {
                    setPreviewingOrder(postSaveOrderOptions);
                    setIsPrinting(true);
                    setPostSaveOrderOptions(null);
                  }}>
                    <Printer className="mr-2 h-4 w-4" />
                    Exportar a PDF
                  </Button>
                  <Button variant="secondary" onClick={() => setPostSaveOrderOptions(null)}>
                        <X className="mr-2 h-4 w-4" />
                        Salir
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Hidden component for printing */}
      <div className="hidden">
         {isPrinting && previewingOrder && <PreviewContent ref={printComponentRef} order={previewingOrder} client={clients.find(c => c.id === previewingOrder.clientId) || null} carrier={carriers.find(c => c.id === previewingOrder.carrierId) || null} />}
      </div>
    </>
  );
}
