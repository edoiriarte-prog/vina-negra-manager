

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
import { PlusCircle, Download, X, MoreHorizontal, Eye, ChevronDown, Edit, Trash2, Printer, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useReactToPrint } from 'react-to-print';
import { PurchaseOrderPreview } from './components/purchase-order-preview';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LotGenerationContent } from './components/lot-generation-content';
import { useMasterData } from '@/hooks/use-master-data';


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


function LotGenerationTab({ allOrders, suppliers, calibers }: { allOrders: PurchaseOrder[], suppliers: Contact[], calibers: any[] }) {
    const [selectedOCs, setSelectedOCs] = useState<Record<string, boolean>>({});
    const [selectedCalibers, setSelectedCalibers] = useState<Record<string, string>>({});
    const [previewData, setPreviewData] = useState<any>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `Lote-${previewData?.id || ''}`,
    });

    const completedOrders = allOrders.filter(o => o.status === 'completed');

    const handleSelectOC = (ocId: string) => {
        setSelectedOCs(prev => {
            const newSelection = { ...prev, [ocId]: !prev[ocId] };
            if (!newSelection[ocId]) {
                const newCalibers = { ...selectedCalibers };
                delete newCalibers[ocId];
                setSelectedCalibers(newCalibers);
            }
            return newSelection;
        });
    };

    const handleCaliberChange = (ocId: string, caliber: string) => {
        setSelectedCalibers(prev => ({ ...prev, [ocId]: caliber }));
    };

    const handleGeneratePreview = () => {
        const lotItems = Object.keys(selectedOCs).filter(id => selectedOCs[id]).map(ocId => {
            const order = completedOrders.find(o => o.id === ocId);
            const caliberName = selectedCalibers[ocId];
            if (!order || !caliberName) return null;

            const supplier = suppliers.find(s => s.id === order.supplierId);
            const caliberInfo = calibers.find(c => c.name === caliberName);

            const relevantItems = order.items.filter(item => item.caliber === caliberName);
            const totalKilos = relevantItems.reduce((sum, item) => sum + item.quantity, 0);
            const totalPackages = relevantItems.reduce((sum, item) => sum + (item.packagingQuantity || 0), 0);
            const avgWeight = totalPackages > 0 ? totalKilos / totalPackages : 0;

            return {
                orderId: order.id,
                productName: relevantItems[0]?.product || 'N/A',
                supplierName: supplier?.name || 'N/A',
                caliberName: caliberName,
                caliberCode: caliberInfo?.code || 'N/A',
                totalKilos,
                totalPackages,
                avgWeight,
            };
        }).filter(Boolean);

        if (lotItems.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Seleccione al menos una OC y especifique su calibre.',
            });
            return;
        }

        const date = new Date();
        const lotId = `LT-${format(date, 'yyyyMMdd')}-${String(date.getTime()).slice(-3)}`;
        setPreviewData({
            id: lotId,
            date: format(date, 'dd/MM/yyyy HH:mm'),
            items: lotItems,
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Módulo de Creación de Lotes</CardTitle>
                    <CardDescription>Siga los pasos para generar e imprimir las hojas de lote.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Label className="font-semibold text-lg">Paso 1: Seleccione las Órdenes de Compra (OC)</Label>
                        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border p-3 rounded-md">
                            {completedOrders.map(order => (
                                <div key={order.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={order.id}
                                        checked={!!selectedOCs[order.id]}
                                        onCheckedChange={() => handleSelectOC(order.id)}
                                    />
                                    <label htmlFor={order.id} className="text-sm font-medium leading-none">
                                        {order.id} - {suppliers.find(s => s.id === order.supplierId)?.name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label className="font-semibold text-lg">Paso 2: Especifique el Calibre por OC</Label>
                        <div className="mt-2 space-y-3">
                            {Object.keys(selectedOCs).filter(id => selectedOCs[id]).map(ocId => {
                                const order = completedOrders.find(o => o.id === ocId);
                                if (!order) return null;
                                const availableCalibers = [...new Set(order.items.map(item => item.caliber))];
                                return (
                                    <div key={ocId} className="grid grid-cols-3 items-center gap-4">
                                        <Label htmlFor={`caliber-${ocId}`} className="text-right">{ocId}</Label>
                                        <Select onValueChange={(value) => handleCaliberChange(ocId, value)}>
                                            <SelectTrigger className="col-span-2">
                                                <SelectValue placeholder="Seleccione un calibre" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableCalibers.map(caliber => (
                                                    <SelectItem key={caliber} value={caliber}>{caliber}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
                 <CardFooter className="flex-col items-stretch gap-4 pt-6 mt-auto">
                    <Button onClick={handleGeneratePreview} disabled={Object.keys(selectedOCs).filter(id => selectedOCs[id]).length === 0}>
                        Generar Previsualización
                    </Button>
                    <Button onClick={handlePrint} disabled={!previewData} variant="outline">
                        Exportar a PDF e Imprimir
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Área de Previsualización</CardTitle>
                </CardHeader>
                <CardContent className="bg-gray-200 p-4 rounded-md h-[600px] overflow-y-auto">
                    {previewData ? (
                         <div className="w-[21.59cm] min-h-[27.94cm] bg-white shadow-lg mx-auto p-4 transform scale-[0.4] sm:scale-50 md:scale-75 origin-top">
                            <LotGenerationContent ref={printRef} lotData={previewData} />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full border-2 border-dashed rounded-md">
                            <p className="text-muted-foreground">La vista previa de impresión aparecerá aquí.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function PurchasesPage() {
  const [purchaseOrders, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [contacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
  const [financialMovements] = useLocalStorage<FinancialMovement[]>('financialMovements', initialFinancialMovements);
  const { calibers } = useMasterData();
  
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
        </Table>
      </div>
    );
  }

  return (
    <Tabs defaultValue="list">
        <TabsList className="mb-4">
            <TabsTrigger value="list">Listado de O/C</TabsTrigger>
            <TabsTrigger value="lots">Generar Lotes</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
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
        <TabsContent value="lots">
            <LotGenerationTab allOrders={purchaseOrders} suppliers={suppliers} calibers={calibers} />
        </TabsContent>
        
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
    </Tabs>
  );
}


