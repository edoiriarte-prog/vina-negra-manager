
"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { purchaseOrders as initialPurchaseOrders, contacts as initialContacts, financialMovements as initialFinancialMovements } from '@/lib/data';
import { PurchaseOrder, Contact, OrderItem, FinancialMovement } from '@/lib/types';
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
} from "@/components/ui/alert-dialog";
import { PurchaseOrderPreview } from './components/purchase-order-preview';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, MoreHorizontal, ChevronDown, Edit, Trash2, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);


export default function PurchasesPage() {
  const [purchaseOrders, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [contacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
  const [financialMovements, setFinancialMovements] = useLocalStorage<FinancialMovement[]>('financialMovements', initialFinancialMovements);
  
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [confirmingEditOrder, setConfirmingEditOrder] = useState<PurchaseOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<PurchaseOrder | null>(null);
  const [previewingOrder, setPreviewingOrder] = useState<PurchaseOrder | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const suppliers = contacts.filter(c => c.type === 'supplier' || c.type === 'both');

  const groupedOrders = useMemo(() => {
    const groups: Record<string, { supplierName: string; orders: PurchaseOrder[]; subtotal: number; totalKilos: number; totalPackages: number; }> = {};
    
    purchaseOrders.forEach(order => {
        const supplier = suppliers.find(s => s.id === order.supplierId);
        if (!supplier) return;

        if (!groups[supplier.id]) {
            groups[supplier.id] = {
                supplierName: supplier.name,
                orders: [],
                subtotal: 0,
                totalKilos: 0,
                totalPackages: 0,
            };
        }
        groups[supplier.id].orders.push(order);
        groups[supplier.id].subtotal += order.totalAmount;
        groups[supplier.id].totalKilos += order.totalKilos;
        groups[supplier.id].totalPackages += order.totalPackages || 0;
    });

    return Object.values(groups).sort((a,b) => a.supplierName.localeCompare(b.supplierName));
  }, [purchaseOrders, suppliers]);

  const grandTotals = useMemo(() => {
    return groupedOrders.reduce((acc, group) => {
        acc.subtotal += group.subtotal;
        acc.totalKilos += group.totalKilos;
        acc.totalPackages += group.totalPackages;
        return acc;
    }, { subtotal: 0, totalKilos: 0, totalPackages: 0 });
  }, [groupedOrders]);
  
  const filteredGroupedOrders = useMemo(() => {
      if (!filter) return groupedOrders;
      return groupedOrders.filter(group => 
        group.supplierName.toLowerCase().includes(filter.toLowerCase())
      );
  }, [groupedOrders, filter]);


  const handleSaveOrder = (order: PurchaseOrder | Omit<PurchaseOrder, 'id' | 'totalPackages'>, newItems: OrderItem[] = []) => {
    // Combine existing items with new items
    const allItems = 'id' in order
      ? [...order.items, ...newItems]
      : [...(order.items || []), ...newItems];
    
    const totalAmount = allItems.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0);
    const totalKilos = allItems.reduce((sum, item) => {
        if (item.unit === 'Kilos') {
            return sum + Number(item.quantity || 0);
        }
        return sum;
    }, 0);
    const totalPackages = allItems.reduce((sum, item) => sum + (Number(item.packagingQuantity || 0)), 0);


    let finalOrderData: PurchaseOrder | Omit<PurchaseOrder, 'id' | 'totalPackages'> = { ...order, items: allItems, totalAmount, totalKilos, totalPackages };

    if ('id' in finalOrderData) {
      // Update
      const updatedOrder = finalOrderData as PurchaseOrder;
      const totalPaid = financialMovements
        .filter(m => m.relatedDocument?.id === updatedOrder.id && m.type === 'expense')
        .reduce((sum, m) => sum + m.amount, 0);

      let paymentStatus: 'Pendiente' | 'Abonado' | 'Pagado' = 'Pendiente';
      if (totalPaid >= updatedOrder.totalAmount) {
        paymentStatus = 'Pagado';
      } else if (totalPaid > 0) {
        paymentStatus = 'Abonado';
      }
      updatedOrder.paymentStatus = paymentStatus;

      setPurchaseOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      toast({ title: 'Orden Actualizada', description: `La orden ${updatedOrder.id} ha sido actualizada.` });
    } else {
      // Add
      const sortedOrders = [...purchaseOrders].sort((a,b) => {
        const idA = a.id ? parseInt(a.id.split('-')[1]) : 0;
        const idB = b.id ? parseInt(b.id.split('-')[1]) : 0;
        return idA - idB;
      });
      const lastId = sortedOrders.length > 0 ? parseInt(sortedOrders[sortedOrders.length - 1].id.split('-')[1]) : 1000;
      const newOrder: PurchaseOrder = {
        ...(finalOrderData as Omit<PurchaseOrder, 'id' | 'totalPackages'>),
        id: `OC-${lastId + 1}`,
        paymentStatus: 'Pendiente',
        totalPackages,
      };
      setPurchaseOrders(prev => [...prev, newOrder]);
      toast({ title: 'Orden Creada', description: `La orden ${newOrder.id} ha sido creada.` });
    }
    setIsSheetOpen(false);
    setEditingOrder(null);
  };

  const handleEdit = (order: PurchaseOrder) => {
    setPreviewingOrder(null);
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
    setPreviewingOrder(null);
    setDeletingOrder(order);
  };
  
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

  const handlePreview = (order: PurchaseOrder) => {
    setPreviewingOrder(order);
  };
  
  const toggleCollapsible = (supplierId: string) => {
    setOpenCollapsibles(prev => ({...prev, [supplierId]: !prev[supplierId]}));
  }

   const handleExportSingle = (orderToExport: PurchaseOrder) => {
    if (!orderToExport) return;
    const supplier = suppliers.find(s => s.id === orderToExport.supplierId);
    const dataForSheet = orderToExport.items.map(item => ({
      'O/C': orderToExport.id,
      'Fecha': format(new Date(orderToExport.date), "dd-MM-yyyy"),
      'Proveedor': supplier?.name,
      'RUT Proveedor': supplier?.rut,
      'Estado': orderToExport.status,
      'Bodega': orderToExport.warehouse,
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
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `OC-${orderToExport.id}`);
    XLSX.writeFile(workbook, `Orden_de_Compra_${orderToExport.id}.xlsx`);
    toast({ title: 'Exportación Exitosa', description: `Se ha exportado la orden ${orderToExport.id}.` });
    setPreviewingOrder(null);
  };

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
                        <TableHead className='w-[400px]'>Proveedor</TableHead>
                        <TableHead className='text-right'>Monto Total</TableHead>
                        <TableHead className='text-right'>Kilos Totales</TableHead>
                        <TableHead className='text-right'>Envases Totales</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredGroupedOrders.map(group => {
                        const supplierId = suppliers.find(s => s.name === group.supplierName)?.id || '';
                        return (
                            <React.Fragment key={supplierId}>
                                <TableRow className="cursor-pointer bg-muted/20 hover:bg-muted/30" onClick={() => toggleCollapsible(supplierId)}>
                                    <TableCell className='font-bold'>
                                         <div className="flex items-center gap-2">
                                            <ChevronDown className={cn("h-4 w-4 transition-transform", openCollapsibles[supplierId] && "rotate-180")} />
                                            {group.supplierName}
                                        </div>
                                    </TableCell>
                                    <TableCell className='text-right font-bold'>{formatCurrency(group.subtotal)}</TableCell>
                                    <TableCell className='text-right font-bold'>{group.totalKilos.toLocaleString('es-CL')} kg</TableCell>
                                    <TableCell className='text-right font-bold'>{(group.totalPackages || 0).toLocaleString('es-CL')}</TableCell>
                                </TableRow>
                                {openCollapsibles[supplierId] && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="p-0">
                                            <div className='p-4 bg-background'>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>O/C</TableHead>
                                                            <TableHead>Fecha</TableHead>
                                                            <TableHead className="text-right">Monto</TableHead>
                                                            <TableHead className="text-right">Kilos</TableHead>
                                                            <TableHead className="text-right">Envases</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {group.orders.map(order => (
                                                            <TableRow key={order.id} className="cursor-pointer" onClick={() => handlePreview(order)}>
                                                                <TableCell className="font-medium">{order.id}</TableCell>
                                                                <TableCell>{format(parseISO(order.date), 'dd-MM-yyyy')}</TableCell>
                                                                <TableCell className="text-right">{formatCurrency(order.totalAmount)}</TableCell>
                                                                <TableCell className="text-right">{order.totalKilos.toLocaleString('es-CL')} kg</TableCell>
                                                                <TableCell className="text-right">{(order.totalPackages || 0).toLocaleString('es-CL')}</TableCell>
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
                        <TableHead className='text-right font-bold text-lg'>{formatCurrency(grandTotals.subtotal)}</TableHead>
                        <TableHead className='text-right font-bold text-lg'>{grandTotals.totalKilos.toLocaleString('es-CL')} kg</TableHead>
                        <TableHead className='text-right font-bold text-lg'>{grandTotals.totalPackages.toLocaleString('es-CL')}</TableHead>
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
          <div className="flex items-center justify-between">
            <div>
                <CardTitle className="font-headline text-2xl">Gestión de Compras (O/C)</CardTitle>
                <CardDescription>Registra todas las adquisiciones de productos, agrupadas por proveedor.</CardDescription>
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
           <div className="py-4">
              <Input
                placeholder="Filtrar por proveedor..."
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
            onOpenChange={() => setPreviewingOrder(null)}
            onEdit={() => {
                if (previewingOrder) {
                  handleEdit(previewingOrder)
                }
            }}
            onDelete={() => {
                if (previewingOrder) {
                    handleDelete(previewingOrder)
                }
            }}
            onExport={() => {
                if (previewingOrder) {
                    handleExportSingle(previewingOrder)
                }
            }}
        />
      )}
    </>
  );
}
