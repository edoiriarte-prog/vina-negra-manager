
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
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, ChevronDown, MoreHorizontal, Eye, Printer, Edit, Trash2, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useReactToPrint } from 'react-to-print';
import { PurchaseOrderPreview } from './components/purchase-order-preview';
import { LotLabelPreview } from './components/lot-label-preview';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

const formatKilos = (value: number) =>
    `${new Intl.NumberFormat('es-CL').format(value)} kg`;
    
const formatPackages = (value: number) =>
    `${new Intl.NumberFormat('es-CL').format(value)}`;


function LotGenerationTab({ purchaseOrders, suppliers, handleSaveOrder }: { purchaseOrders: PurchaseOrder[], suppliers: Contact[], handleSaveOrder: (order: PurchaseOrder, newItems?: OrderItem[]) => void }) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderForLot, setOrderForLot] = useState<PurchaseOrder | null>(null);
  const [itemForLot, setItemForLot] = useState<OrderItem | null>(null);
  const [isPreviewingLot, setIsPreviewingLot] = useState(false);
  const { toast } = useToast();

  const selectedOrder = useMemo(() => {
    return purchaseOrders.find(po => po.id === selectedOrderId);
  }, [selectedOrderId, purchaseOrders]);

  const handleGenerateAndPreviewLot = (item: OrderItem) => {
    if (!selectedOrder) return;
    
    let updatedItem = { ...item };
    let orderToUpdate = { ...selectedOrder };

    if (!item.lotNumber) {
        const itemIndex = selectedOrder.items.findIndex(i => i.id === item.id);
        const datePart = selectedOrder.date.replace(/-/g, '');
        const newLotNumber = `LOTE-${datePart}-${selectedOrder.supplierId}-${itemIndex}`;
        updatedItem.lotNumber = newLotNumber;
        
        // Update the item in the order
        const updatedItems = selectedOrder.items.map(i => i.id === item.id ? updatedItem : i);
        orderToUpdate.items = updatedItems;
        handleSaveOrder(orderToUpdate);
        
        toast({
            title: "Lote Generado",
            description: `Se ha asignado el lote: ${newLotNumber}`,
        });
    }

    setOrderForLot(orderToUpdate);
    setItemForLot(updatedItem);
    setIsPreviewingLot(true);
  };


  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Generación de Lotes</CardTitle>
          <CardDescription>Seleccione una orden de compra completada para generar sus lotes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="max-w-md space-y-2">
            <Label htmlFor="oc-select">Seleccionar Orden de Compra</Label>
            <Select onValueChange={setSelectedOrderId} value={selectedOrderId || ''}>
              <SelectTrigger id="oc-select">
                <SelectValue placeholder="Elija una O/C..." />
              </SelectTrigger>
              <SelectContent>
                {purchaseOrders
                  .filter(po => po.status === 'completed')
                  .sort((a,b) => b.id.localeCompare(a.id))
                  .map(po => (
                    <SelectItem key={po.id} value={po.id}>{po.id} - {suppliers.find(s => s.id === po.supplierId)?.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {selectedOrder && (
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead>Calibre</TableHead>
                            <TableHead className="text-right">Kilos</TableHead>
                            <TableHead>Lote Asignado</TableHead>
                            <TableHead className="w-[180px] text-center">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {selectedOrder.items.map(item => (
                            <TableRow key={item.id}>
                                <TableCell>{item.product}</TableCell>
                                <TableCell>{item.caliber}</TableCell>
                                <TableCell className="text-right">{formatKilos(item.quantity)}</TableCell>
                                <TableCell>
                                    {item.lotNumber 
                                        ? <span className="font-mono bg-muted px-2 py-1 rounded-md text-xs">{item.lotNumber}</span> 
                                        : <span className="text-muted-foreground text-xs">No generado</span>
                                    }
                                </TableCell>
                                <TableCell className="text-center">
                                    <Button onClick={() => handleGenerateAndPreviewLot(item)}>
                                        <Wand2 className="mr-2 h-4 w-4"/>
                                        Generar y Ver Lote
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isPreviewingLot && orderForLot && itemForLot && (
        <LotLabelPreview 
          isOpen={isPreviewingLot}
          onOpenChange={setIsPreviewingLot}
          order={orderForLot}
          supplier={suppliers.find(s => s.id === orderForLot.supplierId) || null}
          specificItem={itemForLot}
        />
      )}
    </>
  );
}


export default function PurchasesPage() {
  const [purchaseOrders, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [contacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
  const [financialMovements] = useLocalStorage<FinancialMovement[]>('financialMovements', initialFinancialMovements);
  
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<PurchaseOrder | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [previewingOrder, setPreviewingOrder] = useState<PurchaseOrder | null>(null);
  const [selectedOrderForActions, setSelectedOrderForActions] = useState<PurchaseOrder | null>(null);
  
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState('');

  const printComponentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handlePrint = useReactToPrint({
      content: () => printComponentRef.current,
  });

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
    const groups: Record<string, { monthName: string; orders: PurchaseOrder[]; subtotalAmount: number; subtotalKilos: number; subtotalPackages: number; }> = {};
    
    ordersWithPaymentStatus.forEach(order => {
        const monthKey = format(parseISO(order.date), 'yyyy-MM');
        const monthName = format(parseISO(order.date), 'MMMM yyyy', { locale: es });

        if (!groups[monthKey]) {
            groups[monthKey] = {
                monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1),
                orders: [],
                subtotalAmount: 0,
                subtotalKilos: 0,
                subtotalPackages: 0,
            };
        }
        groups[monthKey].orders.push(order);
        groups[monthKey].subtotalAmount += order.totalAmount;
        groups[monthKey].subtotalKilos += order.totalKilos;
        groups[monthKey].subtotalPackages += order.totalPackages;
    });

    const sortedMonthKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return sortedMonthKeys.map(key => groups[key]);
  }, [ordersWithPaymentStatus]);

  const grandTotal = useMemo(() => {
    return groupedOrders.reduce((sum, group) => sum + group.subtotalAmount, 0);
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
                  subtotalAmount: filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0),
                  subtotalKilos: filteredOrders.reduce((sum, o) => sum + o.totalKilos, 0),
                  subtotalPackages: filteredOrders.reduce((sum, o) => sum + o.totalPackages, 0),
              };
          }
          return null;
      }).filter((g): g is { monthName: string; orders: PurchaseOrder[]; subtotalAmount: number; subtotalKilos: number; subtotalPackages: number; } => g !== null);
  }, [groupedOrders, filter, suppliers]);


  const handleSaveOrder = (order: PurchaseOrder | Omit<PurchaseOrder, 'id'>, newItems: OrderItem[] = []) => {
    const allItems = 'id' in order
      ? [...order.items.map(i => newItems.find(ni => ni.id === i.id) || i), ...newItems.filter(ni => !order.items.find(oi => oi.id === ni.id))]
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

  const handlePreviewRequest = (order: PurchaseOrder) => {
    setPreviewingOrder(order);
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
          <Skeleton className="h-96 w-full" />
        </div>
      )
    }
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[400px]'>Mes</TableHead>
              <TableHead className='text-right'>Total Envases</TableHead>
              <TableHead className='text-right'>Total Kilos</TableHead>
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
                    <TableCell className='text-right font-bold'>{formatPackages(group.subtotalPackages)}</TableCell>
                    <TableCell className='text-right font-bold'>{formatKilos(group.subtotalKilos)}</TableCell>
                    <TableCell className='text-right font-bold'>{formatCurrency(group.subtotalAmount)}</TableCell>
                  </TableRow>
                  {openCollapsibles[monthKey] && (
                    <TableRow>
                      <TableCell colSpan={4} className="p-0">
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
              <TableHead colSpan={3} className='text-right font-bold text-lg'>Total General</TableHead>
              <TableHead className='text-right font-bold text-lg'>{formatCurrency(grandTotal)}</TableHead>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="orders">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders">Gestión de Compras</TabsTrigger>
            <TabsTrigger value="lots">Generar Lotes</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="mt-6">
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="font-headline text-2xl">Listado de Órdenes de Compra (O/C)</CardTitle>
                                <CardDescription>Registra y administra todas las adquisiciones de productos.</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleExportAll}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Exportar Todo
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
                </div>
                <div className="lg:col-span-1">
                    <Card className="sticky top-20">
                        <CardHeader>
                            <CardTitle className="font-headline text-2xl">Acciones de Orden</CardTitle>
                            <CardDescription>
                                {selectedOrderForActions 
                                    ? `Acciones disponibles para la orden ${selectedOrderForActions.id}`
                                    : "Seleccione una orden de la lista para ver las acciones disponibles."
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {selectedOrderForActions ? (
                                <div className="grid grid-cols-1 gap-4 py-4">
                                    <Button variant="outline" onClick={() => handlePreviewRequest(selectedOrderForActions)}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        Visualizar O/C
                                    </Button>
                                    <Button variant="outline" onClick={() => handleEdit(selectedOrderForActions)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Editar
                                    </Button>
                                    <Button variant="destructive" onClick={() => handleDelete(selectedOrderForActions)}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Eliminar
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-md">
                                    <p className="text-sm text-muted-foreground">No hay orden seleccionada</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TabsContent>
        <TabsContent value="lots" className="mt-6">
            <LotGenerationTab purchaseOrders={purchaseOrders} suppliers={suppliers} handleSaveOrder={handleSaveOrder} />
        </TabsContent>
      </Tabs>
      
      <NewPurchaseOrderSheet 
        isOpen={isSheetOpen}
        onOpenChange={handleSheetOpenChange}
        onSave={handleSaveOrder}
        order={editingOrder}
        suppliers={suppliers}
      />

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
          isOpen={!!previewingOrder}
          onOpenChange={() => setPreviewingOrder(null)}
          order={previewingOrder}
          supplier={suppliers.find(s => s.id === previewingOrder.supplierId) || null}
          onPrintRequest={handlePrint}
        />
      )}
    </>
  );
}
