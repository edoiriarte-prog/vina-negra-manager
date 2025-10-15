
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
import { PlusCircle, Download, X, MoreHorizontal, Eye, ChevronDown, Edit, Trash2, Printer, Wand2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useReactToPrint } from 'react-to-print';
import { PurchaseOrderPreview } from './components/purchase-order-preview';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LotGenerationContent } from './components/lot-generation-content';
import { useMasterData } from '@/hooks/use-master-data';
import { Badge } from '@/components/ui/badge';


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


function LotGenerationTab({ allOrders, suppliers, calibers, setAllOrders }: { allOrders: PurchaseOrder[], suppliers: Contact[], calibers: any[], setAllOrders: (orders: PurchaseOrder[]) => void }) {
    const [selectedOCs, setSelectedOCs] = useState<Record<string, boolean>>({});
    const [selectedCalibers, setSelectedCalibers] = useState<Record<string, string[]>>({});
    const [previewData, setPreviewData] = useState<any>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `Etiquetas_Lote`,
    });

    const ordersWithLotInfo = allOrders
      .filter(o => o.status === 'completed')
      .map(order => ({
        ...order,
        hasLots: order.items.some(item => !!item.lotNumber),
      }));


    const handleSelectOC = (ocId: string) => {
        setSelectedOCs(prev => {
            const newSelection = { ...prev, [ocId]: !prev[ocId] };
            if (!newSelection[ocId]) {
                const newCalibers = { ...selectedCalibers };
                delete newCalibers[ocId];
                setSelectedCalibers(newCalibers);
            } else {
                 setSelectedCalibers(prevCalibers => ({...prevCalibers, [ocId]: []}));
            }
            return newSelection;
        });
    };

    const handleCaliberChange = (ocId: string, caliber: string) => {
        setSelectedCalibers(prev => {
            const currentCalibers = prev[ocId] || [];
            const newCalibers = currentCalibers.includes(caliber)
                ? currentCalibers.filter(c => c !== caliber)
                : [...currentCalibers, caliber];
            return { ...prev, [ocId]: newCalibers };
        });
    };

    const handleGeneratePreview = () => {
        const selectedEntries = Object.entries(selectedCalibers)
            .filter(([ocId]) => selectedOCs[ocId])
            .flatMap(([ocId, calibers]) => calibers.map(caliber => ({ ocId, caliber })));

        if (selectedEntries.length === 0) {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Seleccione al menos una OC y un calibre.',
            });
            return;
        }

        const lotItems = selectedEntries.map(({ ocId, caliber: caliberName }, index) => {
            const order = allOrders.find(o => o.id === ocId);
            if (!order || !caliberName) return null;

            const supplier = suppliers.find(s => s.id === order.supplierId);
            const caliberInfo = calibers.find(c => c.name === caliberName);

            const relevantItems = order.items.filter(item => item.caliber === caliberName);
            const totalKilos = relevantItems.reduce((sum, item) => sum + item.quantity, 0);
            const totalPackages = relevantItems.reduce((sum, item) => sum + (item.packagingQuantity || 0), 0);
            const avgWeight = totalPackages > 0 ? totalKilos / totalPackages : 0;
            
            const datePart = format(parseISO(order.date), 'yyyyMMdd');
            const uniqueLotId = `LT-${datePart}-${index + 100}`;

            return {
                lotId: uniqueLotId,
                orderId: order.id,
                productName: relevantItems[0]?.product || 'N/A',
                supplierName: supplier?.name || 'N/A',
                caliberName: caliberName,
                caliberCode: caliberInfo?.code || 'N/A',
                totalKilos,
                totalPackages,
                avgWeight,
            };
        }).filter((item): item is NonNullable<typeof item> => item !== null);

        if (lotItems.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudieron generar los items del lote. Verifique las selecciones.',
            });
            return;
        }
        
        // --- Save Lot Number to Purchase Order ---
        const updatedOrders = allOrders.map(order => {
            let orderWasUpdated = false;
            const updatedItems = order.items.map(item => {
                const lotItemMatch = lotItems.find(li => li.orderId === order.id && li.caliberName === item.caliber);
                if (lotItemMatch) {
                    orderWasUpdated = true;
                    return { ...item, lotNumber: lotItemMatch.lotId };
                }
                return item;
            });

            if (orderWasUpdated) {
                return { ...order, items: updatedItems };
            }
            return order;
        });
        
        setAllOrders(updatedOrders);
        // --- End Save Logic ---

        setPreviewData({
            creationDate: format(new Date(), 'dd/MM/yyyy HH:mm'),
            items: lotItems,
        });

        toast({
            title: 'Lote Generado y Guardado',
            description: `${lotItems.length} lotes han sido guardados en las OCs correspondientes.`,
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
                            {ordersWithLotInfo.map(order => (
                                <div key={order.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`oc-${order.id}`}
                                        checked={!!selectedOCs[order.id]}
                                        onCheckedChange={() => handleSelectOC(order.id)}
                                    />
                                    <label htmlFor={`oc-${order.id}`} className="text-sm font-medium leading-none">
                                        {order.id} - {suppliers.find(s => s.id === order.supplierId)?.name}
                                    </label>
                                    {order.hasLots && (
                                        <Badge variant="destructive" className="flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" /> Con Lote
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label className="font-semibold text-lg">Paso 2: Especifique el Calibre por OC</Label>
                        <div className="mt-2 space-y-4 max-h-60 overflow-y-auto pr-2">
                            {Object.keys(selectedOCs).filter(id => selectedOCs[id]).map(ocId => {
                                const order = ordersWithLotInfo.find(o => o.id === ocId);
                                if (!order) return null;
                                const availableCalibers = [...new Set(order.items.map(item => item.caliber))];
                                return (
                                    <div key={ocId} className='p-3 border rounded-md'>
                                        <p className="font-medium text-sm mb-2">{ocId}</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {availableCalibers.map(caliber => (
                                                <div key={`${ocId}-${caliber}`} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`${ocId}-${caliber}`}
                                                        checked={selectedCalibers[ocId]?.includes(caliber)}
                                                        onCheckedChange={() => handleCaliberChange(ocId, caliber)}
                                                    />
                                                    <label htmlFor={`${ocId}-${caliber}`} className="text-sm font-normal">
                                                        {caliber}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
                 <CardFooter className="flex-col items-stretch gap-4 pt-6 mt-auto">
                    <Button onClick={handleGeneratePreview} disabled={Object.values(selectedCalibers).every(c => c.length === 0)}>
                        Generar Previsualización y Guardar Lotes
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
                         <div className="space-y-8">
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
  
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState('');
  const [lotFilter, setLotFilter] = useState('');
  const [previewLotData, setPreviewLotData] = useState<any>(null);

  const printComponentRef = useRef<HTMLDivElement>(null);
  const lotPrintRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handlePrint = useReactToPrint({
      content: () => printComponentRef.current,
  });

  const handleLotPrint = useReactToPrint({
    content: () => lotPrintRef.current,
    documentTitle: `Etiqueta_Lote`,
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (previewLotData) {
      const timer = setTimeout(() => {
        handleLotPrint();
        setPreviewLotData(null); 
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [previewLotData, handleLotPrint]);


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


  const createdLots = useMemo(() => {
    const lotsMap = new Map<string, any>();
    purchaseOrders.forEach(order => {
        order.items.forEach(item => {
            if (item.lotNumber) {
                const existing = lotsMap.get(item.lotNumber) || {
                    lotNumber: item.lotNumber,
                    orderId: order.id,
                    date: order.date,
                    supplierId: order.supplierId,
                    supplierName: suppliers.find(s => s.id === order.supplierId)?.name || 'N/A',
                    product: item.product,
                    caliber: item.caliber,
                    caliberCode: calibers.find(c => c.name === item.caliber)?.code || 'N/A',
                    totalKilos: 0,
                    totalPackages: 0,
                };
                existing.totalKilos += item.quantity;
                existing.totalPackages += (item.packagingQuantity || 0);
                lotsMap.set(item.lotNumber, existing);
            }
        });
    });
    return Array.from(lotsMap.values()).sort((a,b) => b.lotNumber.localeCompare(a.lotNumber));
  }, [purchaseOrders, suppliers, calibers]);

  const filteredCreatedLots = useMemo(() => {
      if (!lotFilter) return createdLots;
      const lower = lotFilter.toLowerCase();
      return createdLots.filter(lot => 
        lot.lotNumber.toLowerCase().includes(lower) ||
        lot.orderId.toLowerCase().includes(lower) ||
        lot.product.toLowerCase().includes(lower) ||
        lot.supplierName.toLowerCase().includes(lower) ||
        lot.caliber.toLowerCase().includes(lower)
      );
  }, [createdLots, lotFilter]);


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
  };

  const handleDelete = (order: PurchaseOrder) => {
    setDeletingOrder(order);
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
                'Lote': item.lotNumber || '',
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

  const handlePreviewLot = (lot: any) => {
    setPreviewLotData({
        creationDate: format(new Date(), 'dd/MM/yyyy HH:mm'),
        items: [{
            lotId: lot.lotNumber,
            orderId: lot.orderId,
            productName: lot.product,
            supplierName: lot.supplierName,
            caliberName: lot.caliber,
            caliberCode: lot.caliberCode,
            totalKilos: lot.totalKilos,
            totalPackages: lot.totalPackages,
            avgWeight: lot.totalPackages > 0 ? lot.totalKilos / lot.totalPackages : 0,
        }],
    });
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
                                <TableHead className="text-center">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.orders.map(order => {
                                const supplier = suppliers.find(s => s.id === order.supplierId);
                                return (
                                  <TableRow key={order.id}>
                                    <TableCell className="font-medium">{order.id}</TableCell>
                                    <TableCell>{format(parseISO(order.date), 'dd-MM-yyyy')}</TableCell>
                                    <TableCell>{supplier?.name}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(order.totalAmount)}</TableCell>
                                    <TableCell className="text-right">{order.totalKilos.toLocaleString('es-CL')}</TableCell>
                                    <TableCell className="text-right">{order.totalPackages.toLocaleString('es-CL')}</TableCell>
                                    <TableCell className="text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handlePreviewRequest(order)} title="Visualizar">
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(order)} title="Editar">
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(order)} title="Eliminar">
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </TableCell>
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
    <>
        <Tabs defaultValue="list">
            <TabsList className="mb-4">
                <TabsTrigger value="list">Listado de O/C</TabsTrigger>
                <TabsTrigger value="lots">Generar Lotes</TabsTrigger>
                <TabsTrigger value="created-lots">Lotes Creados</TabsTrigger>
            </TabsList>
            <TabsContent value="list">
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
            </TabsContent>
            <TabsContent value="lots">
                <LotGenerationTab allOrders={purchaseOrders} suppliers={suppliers} calibers={calibers} setAllOrders={setPurchaseOrders} />
            </TabsContent>
             <TabsContent value="created-lots">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Lotes Creados</CardTitle>
                        <CardDescription>Visualiza todos los lotes generados a partir de las órdenes de compra.</CardDescription>
                        <Input
                            placeholder="Filtrar lotes..."
                            value={lotFilter}
                            onChange={(e) => setLotFilter(e.target.value)}
                            className="max-w-sm mt-4"
                        />
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Lote</TableHead>
                                        <TableHead>O/C</TableHead>
                                        <TableHead>Producto</TableHead>
                                        <TableHead>Calibre</TableHead>
                                        <TableHead>Proveedor</TableHead>
                                        <TableHead className="text-right">Kilos</TableHead>
                                        <TableHead className="text-right">Envases</TableHead>
                                        <TableHead className="text-center">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isClient ? filteredCreatedLots.map(lot => (
                                        <TableRow key={lot.lotNumber}>
                                            <TableCell><Badge variant="secondary">{lot.lotNumber}</Badge></TableCell>
                                            <TableCell>{lot.orderId}</TableCell>
                                            <TableCell>{lot.product}</TableCell>
                                            <TableCell>{lot.caliber}</TableCell>
                                            <TableCell>{lot.supplierName}</TableCell>
                                            <TableCell className="text-right">{formatKilos(lot.totalKilos)}</TableCell>
                                            <TableCell className="text-right">{formatPackages(lot.totalPackages)}</TableCell>
                                            <TableCell className="text-center">
                                                <Button variant="ghost" size="icon" title="Previsualizar e Imprimir Lote" onClick={() => handlePreviewLot(lot)}>
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={8}><Skeleton className="w-full h-24"/></TableCell></TableRow>}
                                    {isClient && filteredCreatedLots.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center h-24">No se encontraron lotes.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
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
        <div className="hidden">
            {previewLotData && <LotGenerationContent ref={lotPrintRef} lotData={previewLotData} />}
        </div>
    </>
  );
}
