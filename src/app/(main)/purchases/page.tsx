
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
import { PlusCircle, Download, ChevronDown, MoreHorizontal, Eye, Printer, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useReactToPrint } from 'react-to-print';
import { PreviewContent } from './components/purchase-order-preview-content';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);


export default function PurchasesPage() {
  const [purchaseOrders, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [contacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
  const [financialMovements] = useLocalStorage<FinancialMovement[]>('financialMovements', initialFinancialMovements);
  
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<PurchaseOrder | null>(null);
  const [previewingOrder, setPreviewingOrder] = useState<PurchaseOrder | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [orderToPrint, setOrderToPrint] = useState<PurchaseOrder | null>(null);
  const [selectedOrderForActions, setSelectedOrderForActions] = useState<PurchaseOrder | null>(null);
  
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState('');

  const printComponentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handlePrint = useReactToPrint({
      content: () => printComponentRef.current,
  });

  useEffect(() => {
    if (orderToPrint) {
       setTimeout(() => {
        handlePrint();
        setOrderToPrint(null);
      }, 100);
    }
  }, [orderToPrint, handlePrint]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const suppliers = useMemo(() => contacts.filter(c => c.type.includes('supplier')), [contacts]);

  const ordersWithPaymentStatus = useMemo(() => {
    return purchaseOrders.map(order => {
        const payments = financialMovements.filter(m => m.relatedDocument?.id === order.id && m.type === 'expense');
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

        let paymentStatus: PurchaseOrder['paymentStatus'] = 'Pendiente';
        if (order.status === 'cancelled') {
            paymentStatus = undefined;
        } else if (totalPaid >= order.totalAmount) {
            paymentStatus = 'Pagado';
        } else if (totalPaid > 0) {
            paymentStatus = 'Abonado';
        }
        return { ...order, paymentStatus };
    });
  }, [purchaseOrders, financialMovements]);

  const groupedOrders = useMemo(() => {
    const groups: Record<string, { monthName: string; orders: PurchaseOrder[]; subtotal: number; }> = {};
    
    ordersWithPaymentStatus.forEach(order => {
        const monthKey = format(parseISO(order.date), 'yyyy-MM');
        const monthName = format(parseISO(order.date), 'MMMM yyyy', { locale: es });

        if (!groups[monthKey]) {
            groups[monthKey] = {
                monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1),
                orders: [],
                subtotal: 0,
            };
        }
        groups[monthKey].orders.push(order);
        groups[monthKey].subtotal += order.totalAmount;
    });

    const sortedMonthKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return sortedMonthKeys.map(key => groups[key]);
  }, [ordersWithPaymentStatus]);

  const grandTotal = useMemo(() => {
    return groupedOrders.reduce((sum, group) => sum + group.subtotal, 0);
  }, [groupedOrders]);

  const filteredGroupedOrders = useMemo(() => {
      if (!filter) return groupedOrders;
      
      const lowercasedFilter = filter.toLowerCase();
      
      return groupedOrders.map(group => {
          const filteredOrders = group.orders.filter(order => {
              const supplier = suppliers.find(s => s.id === order.supplierId);
              return supplier?.name.toLowerCase().includes(lowercasedFilter);
          });

          if (filteredOrders.length > 0) {
              return {
                  ...group,
                  orders: filteredOrders,
                  subtotal: filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0)
              };
          }
          return null;
      }).filter((g): g is { monthName: string; orders: PurchaseOrder[]; subtotal: number; } => g !== null);
  }, [groupedOrders, filter, suppliers]);


  const handleSaveOrder = (order: PurchaseOrder | Omit<PurchaseOrder, 'id'>, newItems: OrderItem[] = []) => {
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

    let finalOrderData: PurchaseOrder | Omit<PurchaseOrder, 'id'> = { ...(order as any), items: allItems, totalAmount, totalKilos, totalPackages };

    if ('id' in finalOrderData) {
      const updatedOrder = finalOrderData as PurchaseOrder;
      setPurchaseOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      toast({ title: 'Orden Actualizada', description: `La orden ${updatedOrder.id} ha sido actualizada.` });
    } else {
      const sortedOrders = [...purchaseOrders].sort((a,b) => {
        const idA = a.id ? parseInt(a.id.split('-')[1]) : 0;
        const idB = b.id ? parseInt(b.id.split('-')[1]) : 0;
        return idA - idB;
      });
      const lastId = sortedOrders.length > 0 ? parseInt(sortedOrders[sortedOrders.length - 1].id.split('-')[1]) : 1000;
      const newOrder: PurchaseOrder = {
        ...(finalOrderData as Omit<PurchaseOrder, 'id'>),
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
    setEditingOrder(order);
    setIsSheetOpen(true);
    setSelectedOrderForActions(null);
  };

  const handleDelete = (order: PurchaseOrder) => {
    setDeletingOrder(order);
    setSelectedOrderForActions(null);
  };
  
  const confirmDelete = () => {
    if (deletingOrder) {
      setPurchaseOrders((prev) => prev.filter((o) => o.id !== deletingOrder.id));
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

  const handlePreview = (order: PurchaseOrder) => {
    setPreviewingOrder(order);
    setSelectedOrderForActions(null);
  };

  const handlePrintRequest = (order: PurchaseOrder) => {
    setOrderToPrint(order);
    setSelectedOrderForActions(null);
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

  const toggleCollapsible = (monthKey: string) => {
    setOpenCollapsibles(prev => ({...prev, [monthKey]: !prev[monthKey]}));
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
              <TableHead className='w-[400px]'>Mes</TableHead>
              <TableHead className='text-right'>Monto Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGroupedOrders.map(group => {
              const monthKey = group.monthName.replace(' ', '-');
              return (
                <React.Fragment key={monthKey}>
                  <TableRow className="cursor-pointer bg-muted/20 hover:bg-muted/30" onClick={() => toggleCollapsible(monthKey)}>
                    <TableCell className='font-bold'>
                      <div className="flex items-center gap-2">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", openCollapsibles[monthKey] && "rotate-180")} />
                        {group.monthName}
                      </div>
                    </TableCell>
                    <TableCell className='text-right font-bold'>{formatCurrency(group.subtotal)}</TableCell>
                  </TableRow>
                  {openCollapsibles[monthKey] && (
                    <TableRow>
                      <TableCell colSpan={2} className="p-0">
                        <div className='p-4 bg-background'>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>O/C</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Proveedor</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                                <TableHead className="text-right">Kilos</TableHead>
                                <TableHead className="text-right">Envases</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.orders.map(order => {
                                const supplier = suppliers.find(s => s.id === order.supplierId);
                                return (
                                  <TableRow key={order.id} className="cursor-pointer" onClick={() => setSelectedOrderForActions(order)}>
                                    <TableCell className="font-medium">{order.id}</TableCell>
                                    <TableCell>{format(parseISO(order.date), 'dd-MM-yyyy')}</TableCell>
                                    <TableCell>{supplier?.name}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(order.totalAmount)}</TableCell>
                                    <TableCell className="text-right">{order.totalKilos.toLocaleString('es-CL')}</TableCell>
                                    <TableCell className="text-right">{order.totalPackages.toLocaleString('es-CL')}</TableCell>
                                  </TableRow>
                                )
                              })}
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
          <div className="flex items-center justify-between">
            <div>
                <CardTitle className="font-headline text-2xl">Gestión de Compras (O/C)</CardTitle>
                <CardDescription>Registra y administra todas las adquisiciones de productos.</CardDescription>
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

       <AlertDialog open={!!selectedOrderForActions} onOpenChange={() => setSelectedOrderForActions(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Acciones para la Orden {selectedOrderForActions?.id}</AlertDialogTitle>
            <AlertDialogDescription>
              Seleccione una acción para ejecutar en la orden de compra.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button variant="outline" onClick={() => selectedOrderForActions && handlePrintRequest(selectedOrderForActions)}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir PDF
            </Button>
            <Button variant="outline" onClick={() => selectedOrderForActions && handlePreview(selectedOrderForActions)}>
                <Eye className="mr-2 h-4 w-4" />
                Visualizar
            </Button>
             <Button variant="outline" onClick={() => selectedOrderForActions && handleEdit(selectedOrderForActions)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
            </Button>
            <Button variant="destructive" onClick={() => selectedOrderForActions && handleDelete(selectedOrderForActions)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedOrderForActions(null)}>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingOrder} onOpenChange={(open) => !open && setDeletingOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de que quieres eliminar esta orden?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la orden "{deletingOrder?.id}".
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
                handleEdit(previewingOrder);
              }
            }}
            onDelete={() => {
              if (previewingOrder) {
                handleDelete(previewingOrder);
              }
            }}
            onPrintRequest={() => {
                if (previewingOrder) {
                    setOrderToPrint(previewingOrder);
                }
            }}
        />
      )}
       <div className="hidden print:block">
        {orderToPrint && (
            <PreviewContent
                ref={printComponentRef}
                order={orderToPrint}
                supplier={suppliers.find(s => s.id === orderToPrint.supplierId) || null}
                onEdit={() => {}}
                onDelete={() => {}}
            />
        )}
      </div>
    </>
  );
}
