
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { PurchaseOrder, SalesOrder, InventoryAdjustment, Contact } from '@/lib/types';
import { purchaseOrders as initialPurchaseOrders, salesOrders as initialSalesOrders, inventoryAdjustments as initialInventoryAdjustments, contacts as initialContacts } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMasterData } from '@/hooks/use-master-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Eye, Download, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, parseISO, isBefore, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { InventoryHistoryDialog } from './components/inventory-history-dialog';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

type InventoryReportItem = {
    key: string;
    product: string;
    caliber: string;
    caliberCode: string;
    initialStockKg: number;
    inflowKg: number;
    outflowKg: number;
    adjustmentsKg: number;
    finalStockKg: number;
    initialStockPackages: number;
    inflowPackages: number;
    outflowPackages: number;
    adjustmentsPackages: number;
    finalStockPackages: number;
};

const formatKilos = (value: number) => new Intl.NumberFormat('es-CL').format(value) + ' kg';
const formatPackages = (value: number) => new Intl.NumberFormat('es-CL').format(value);


export default function InventoryPage() {
    const [purchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
    const [salesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
    const [inventoryAdjustments] = useLocalStorage<InventoryAdjustment[]>('inventoryAdjustments', initialInventoryAdjustments);
    const { calibers: masterCalibers, warehouses, products: masterProducts } = useMasterData();

    const [isClient, setIsClient] = useState(false);
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('All');
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [inventoryData, setInventoryData] = useState<InventoryReportItem[]>([]);
    const [viewingHistory, setViewingHistory] = useState<any | null>(null);

    const { toast } = useToast();

    useEffect(() => {
        setIsClient(true);
    }, []);
    
    useEffect(() => {
        if (isClient && masterProducts.length > 0 && !selectedProduct) {
            setSelectedProduct(masterProducts[0]);
        }
    }, [isClient, masterProducts, selectedProduct]);


    useEffect(() => {
        if (isClient && selectedProduct) {
            const getStockAsOf = (date: Date) => {
                const stockMap = new Map<string, { kg: number, packages: number }>();

                const relevantPOs = purchaseOrders.filter(po => po.status === 'completed' && !isAfter(parseISO(po.date), date));
                const relevantSOs = salesOrders.filter(so => (so.status === 'completed' || so.status === 'pending') && !isAfter(parseISO(so.date), date));
                const relevantAdjs = inventoryAdjustments.filter(adj => !isAfter(parseISO(adj.date), date));

                relevantPOs.forEach(po => {
                    if (selectedWarehouse === 'All' || po.warehouse === selectedWarehouse) {
                        po.items.forEach(item => {
                             if (item.product === selectedProduct) {
                                const key = `${item.product}-${item.caliber}`;
                                const currentStock = stockMap.get(key) || { kg: 0, packages: 0 };
                                if (item.unit === 'Kilos') {
                                    currentStock.kg += item.quantity;
                                }
                                currentStock.packages += (item.packagingQuantity || 0);
                                stockMap.set(key, currentStock);
                            }
                        });
                    }
                });
                
                relevantSOs.forEach(so => {
                    if (selectedWarehouse === 'All' || so.warehouse === selectedWarehouse) {
                        so.items.forEach(item => {
                            if (item.product === selectedProduct) {
                                const key = `${item.product}-${item.caliber}`;
                                const currentStock = stockMap.get(key) || { kg: 0, packages: 0 };
                                 if (item.unit === 'Kilos') {
                                    currentStock.kg -= item.quantity;
                                }
                                currentStock.packages -= (item.packagingQuantity || 0);
                                stockMap.set(key, currentStock);
                            }
                        });
                    }
                });

                relevantAdjs.forEach(adj => {
                    if (adj.product === selectedProduct && (selectedWarehouse === 'All' || adj.warehouse === selectedWarehouse)) {
                        const key = `${adj.product}-${adj.caliber}`;
                        const currentStock = stockMap.get(key) || { kg: 0, packages: 0 };
                        const adjustmentKg = adj.type === 'increase' ? adj.quantity : -adj.quantity;
                        const adjustmentPkg = adj.type === 'increase' ? (adj.packagingQuantity || 0) : -(adj.packagingQuantity || 0);
                        currentStock.kg += adjustmentKg;
                        currentStock.packages += adjustmentPkg;
                        stockMap.set(key, currentStock);
                    }
                });

                return stockMap;
            };

            const initialStockMap = getStockAsOf(new Date(dateRange.from.getTime() - 86400000));

            const inflowsMap = new Map<string, { kg: number, packages: number }>();
            const outflowsMap = new Map<string, { kg: number, packages: number }>();
            const adjustmentsMap = new Map<string, { kg: number, packages: number }>();
            const allCalibers = new Set<string>();

            const filterByDate = (dateStr: string) => {
                const date = parseISO(dateStr);
                return !isBefore(date, dateRange.from) && !isAfter(date, dateRange.to);
            };

            purchaseOrders.filter(po => po.status === 'completed' && filterByDate(po.date)).forEach(po => {
                po.items.forEach(item => {
                    if (item.product === selectedProduct && (selectedWarehouse === 'All' || po.warehouse === selectedWarehouse)) {
                        const key = `${item.product}-${item.caliber}`;
                        const current = inflowsMap.get(key) || { kg: 0, packages: 0 };
                        current.kg += item.unit === 'Kilos' ? item.quantity : 0;
                        current.packages += item.packagingQuantity || 0;
                        inflowsMap.set(key, current);
                        allCalibers.add(item.caliber);
                    }
                });
            });

            salesOrders.filter(so => (so.status === 'completed' || so.status === 'pending') && filterByDate(so.date)).forEach(so => {
                so.items.forEach(item => {
                    if (item.product === selectedProduct && (selectedWarehouse === 'All' || so.warehouse === selectedWarehouse)) {
                        const key = `${item.product}-${item.caliber}`;
                        const current = outflowsMap.get(key) || { kg: 0, packages: 0 };
                        current.kg += item.unit === 'Kilos' ? item.quantity : 0;
                        current.packages += item.packagingQuantity || 0;
                        outflowsMap.set(key, current);
                        allCalibers.add(item.caliber);
                    }
                });
            });

            inventoryAdjustments.filter(adj => filterByDate(adj.date)).forEach(adj => {
                if (adj.product === selectedProduct && (selectedWarehouse === 'All' || adj.warehouse === selectedWarehouse)) {
                    const key = `${adj.product}-${adj.caliber}`;
                    const current = adjustmentsMap.get(key) || { kg: 0, packages: 0 };
                    const adjustmentKg = adj.type === 'increase' ? adj.quantity : -adj.quantity;
                    const adjustmentPkg = adj.type === 'increase' ? (adj.packagingQuantity || 0) : -(adj.packagingQuantity || 0);
                    current.kg += adjustmentKg;
                    current.packages += adjustmentPkg;
                    adjustmentsMap.set(key, current);
                    allCalibers.add(adj.caliber);
                }
            });
            
            initialStockMap.forEach((_, key) => {
                const caliber = key.split('-')[1];
                allCalibers.add(caliber);
            });

            const reportData: InventoryReportItem[] = Array.from(allCalibers).map(caliber => {
                const key = `${selectedProduct}-${caliber}`;
                const initialStock = initialStockMap.get(key) || { kg: 0, packages: 0 };
                const inflows = inflowsMap.get(key) || { kg: 0, packages: 0 };
                const outflows = outflowsMap.get(key) || { kg: 0, packages: 0 };
                const adjustments = adjustmentsMap.get(key) || { kg: 0, packages: 0 };
                
                const finalStockKg = initialStock.kg + inflows.kg - outflows.kg + adjustments.kg;
                const finalStockPackages = initialStock.packages + inflows.packages - outflows.packages + adjustments.packages;

                return {
                    key,
                    product: selectedProduct,
                    caliber,
                    caliberCode: masterCalibers.find(c => c.name === caliber)?.code || 'N/A',
                    initialStockKg: initialStock.kg,
                    inflowKg: inflows.kg,
                    outflowKg: outflows.kg,
                    adjustmentsKg: adjustments.kg,
                    finalStockKg: finalStockKg,
                    initialStockPackages: initialStock.packages,
                    inflowPackages: inflows.packages,
                    outflowPackages: outflows.packages,
                    adjustmentsPackages: adjustments.packages,
                    finalStockPackages: finalStockPackages,
                };
            }).sort((a, b) => {
                const caliberAIndex = masterCalibers.findIndex(c => c.code === a.caliberCode);
                const caliberBIndex = masterCalibers.findIndex(c => c.code === b.caliberCode);
                if (caliberAIndex === -1 && caliberBIndex === -1) return a.caliber.localeCompare(b.caliber);
                if (caliberAIndex === -1) return 1;
                if (caliberBIndex === -1) return -1;
                return caliberAIndex - caliberBIndex;
            });
            
            setInventoryData(reportData);
        }
    }, [isClient, dateRange, selectedWarehouse, selectedProduct, purchaseOrders, salesOrders, inventoryAdjustments, masterCalibers, masterProducts]);
    
    const handleExport = () => {
      if (!inventoryData.length) {
        toast({ variant: 'destructive', title: 'Sin datos', description: 'No hay datos de inventario para exportar.'});
        return;
      }

      const dataForSheet = inventoryData.map(item => ({
        'Producto': item.product,
        'Calibre': item.caliber,
        'Cód. Calibre': item.caliberCode,
        'Bodega': selectedWarehouse,
        'Stock Inicial (kg)': item.initialStockKg,
        'Entradas (kg)': item.inflowKg,
        'Salidas (kg)': item.outflowKg,
        'Ajustes (kg)': item.adjustmentsKg,
        'Stock Final (kg)': item.finalStockKg,
        'Stock Inicial (envases)': item.initialStockPackages,
        'Entradas (envases)': item.inflowPackages,
        'Salidas (envases)': item.outflowPackages,
        'Ajustes (envases)': item.adjustmentsPackages,
        'Stock Final (envases)': item.finalStockPackages,
      }));

      const summary = [
        ["Reporte de Inventario"],
        ["Producto", selectedProduct],
        ["Periodo", `${format(dateRange.from, 'dd-MM-yyyy')} al ${format(dateRange.to, 'dd-MM-yyyy')}`],
        ["Bodega", selectedWarehouse],
        []
      ];

      const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
      XLSX.utils.sheet_add_aoa(worksheet, summary, { origin: "A1" });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
      XLSX.writeFile(workbook, `Reporte_Inventario_${selectedProduct}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast({ title: 'Exportación Exitosa'});
    };
    
    const totals = useMemo(() => {
        return inventoryData.reduce((acc, item) => {
            acc.initialStockKg += item.initialStockKg;
            acc.inflowKg += item.inflowKg;
            acc.outflowKg += item.outflowKg;
            acc.adjustmentsKg += item.adjustmentsKg;
            acc.finalStockKg += item.finalStockKg;
            acc.initialStockPackages += item.initialStockPackages;
            acc.inflowPackages += item.inflowPackages;
            acc.outflowPackages += item.outflowPackages;
            acc.adjustmentsPackages += item.adjustmentsPackages;
            acc.finalStockPackages += item.finalStockPackages;
            return acc;
        }, { initialStockKg: 0, inflowKg: 0, outflowKg: 0, adjustmentsKg: 0, finalStockKg: 0, initialStockPackages: 0, inflowPackages: 0, outflowPackages: 0, adjustmentsPackages: 0, finalStockPackages: 0 });
    }, [inventoryData]);

    const renderContent = () => {
        if (!isClient) {
            return <Skeleton className="h-96 w-full" />;
        }

        return (
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead rowSpan={2} className="align-bottom">Calibre</TableHead>
                            <TableHead rowSpan={2} className="align-bottom">Cód.</TableHead>
                            <TableHead colSpan={2} className="text-center border-b border-l">Stock Inicial</TableHead>
                            <TableHead colSpan={2} className="text-center border-b border-l">Entradas</TableHead>
                            <TableHead colSpan={2} className="text-center border-b border-l">Salidas</TableHead>
                            <TableHead colSpan={2} className="text-center border-b border-l">Ajustes</TableHead>
                            <TableHead colSpan={2} className="text-center border-b border-l font-bold">Stock Final</TableHead>
                            <TableHead rowSpan={2} className="align-bottom w-[50px] border-l">Acciones</TableHead>
                        </TableRow>
                         <TableRow>
                            <TableHead className="text-right border-l">Envases</TableHead>
                            <TableHead className="text-right">Kg</TableHead>
                            <TableHead className="text-right border-l">Envases</TableHead>
                            <TableHead className="text-right">Kg</TableHead>
                            <TableHead className="text-right border-l">Envases</TableHead>
                            <TableHead className="text-right">Kg</TableHead>
                            <TableHead className="text-right border-l">Envases</TableHead>
                            <TableHead className="text-right">Kg</TableHead>
                            <TableHead className="text-right border-l font-bold">Envases</TableHead>
                            <TableHead className="text-right font-bold">Kg</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {inventoryData.length > 0 ? inventoryData.map(item => (
                             <TableRow key={item.key}>
                                <TableCell className="font-medium">{item.caliber}</TableCell>
                                <TableCell>{item.caliberCode}</TableCell>
                                <TableCell className="text-right border-l">{formatPackages(item.initialStockPackages)}</TableCell>
                                <TableCell className="text-right">{formatKilos(item.initialStockKg)}</TableCell>
                                <TableCell className="text-right text-green-500 border-l">{item.inflowPackages > 0 ? `+${formatPackages(item.inflowPackages)}` : '-'}</TableCell>
                                <TableCell className="text-right text-green-500">{item.inflowKg > 0 ? `+${formatKilos(item.inflowKg)}` : '-'}</TableCell>
                                <TableCell className="text-right text-red-500 border-l">{item.outflowPackages > 0 ? `-${formatPackages(item.outflowPackages)}` : '-'}</TableCell>
                                <TableCell className="text-right text-red-500">{item.outflowKg > 0 ? `-${formatKilos(item.outflowKg)}` : '-'}</TableCell>
                                <TableCell className="text-right text-blue-500 border-l">{item.adjustmentsPackages !== 0 ? formatPackages(item.adjustmentsPackages) : '-'}</TableCell>
                                <TableCell className="text-right text-blue-500">{item.adjustmentsKg !== 0 ? formatKilos(item.adjustmentsKg) : '-'}</TableCell>
                                <TableCell className="text-right font-bold text-primary border-l">{formatPackages(item.finalStockPackages)}</TableCell>
                                <TableCell className="text-right font-bold text-primary">{formatKilos(item.finalStockKg)}</TableCell>
                                <TableCell className="border-l">
                                    <Button variant="ghost" size="icon" onClick={() => setViewingHistory({ ...item, warehouse: selectedWarehouse })}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={13} className="text-center h-24">No hay datos de inventario para el período y filtros seleccionados.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                     <TableFooter>
                        <TableRow>
                            <TableHead colSpan={2} className="text-right font-bold text-lg">Totales</TableHead>
                            <TableHead className="text-right font-bold text-lg border-l">{formatPackages(totals.initialStockPackages)}</TableHead>
                            <TableHead className="text-right font-bold text-lg">{formatKilos(totals.initialStockKg)}</TableHead>
                            <TableHead className="text-right font-bold text-lg border-l">{formatPackages(totals.inflowPackages)}</TableHead>
                            <TableHead className="text-right font-bold text-lg">{formatKilos(totals.inflowKg)}</TableHead>
                            <TableHead className="text-right font-bold text-lg border-l">{formatPackages(totals.outflowPackages)}</TableHead>
                            <TableHead className="text-right font-bold text-lg">{formatKilos(totals.outflowKg)}</TableHead>
                            <TableHead className="text-right font-bold text-lg border-l">{formatPackages(totals.adjustmentsPackages)}</TableHead>
                            <TableHead className="text-right font-bold text-lg">{formatKilos(totals.adjustmentsKg)}</TableHead>
                            <TableHead className="text-right font-bold text-lg border-l">{formatPackages(totals.finalStockPackages)}</TableHead>
                            <TableHead className="text-right font-bold text-lg">{formatKilos(totals.finalStockKg)}</TableHead>
                             <TableHead></TableHead>
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
                    <div className="flex justify-between items-start">
                         <div>
                            <h1 className="font-headline text-3xl">Inventario en Tiempo Real</h1>
                            <p className="text-muted-foreground">Consulta el stock por producto y calibre en un rango de fechas.</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" />Exportar a Excel</Button>
                          <Button variant="outline" disabled>
                            <Printer className="mr-2 h-4 w-4" /> Imprimir
                          </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 items-end p-4 mb-4 border rounded-lg bg-muted/20">
                        <div className="flex-1 w-full">
                            <Label>Producto</Label>
                            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {masterProducts.map(p => (
                                        <SelectItem key={p} value={p}>{p}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 w-full">
                            <Label>Bodega</Label>
                            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">Todas las Bodegas</SelectItem>
                                    {warehouses.map(w => (
                                        <SelectItem key={w} value={w}>{w}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 w-full">
                             <Label>Desde</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange.from ? format(dateRange.from, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={dateRange.from} onSelect={(date) => date && setDateRange(prev => ({...prev, from: date}))} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex-1 w-full">
                             <Label>Hasta</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !dateRange.to && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange.to ? format(dateRange.to, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={dateRange.to} onSelect={(date) => date && setDateRange(prev => ({...prev, to: date}))} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    {renderContent()}
                </CardContent>
            </Card>
             {viewingHistory && (
                <InventoryHistoryDialog
                    item={viewingHistory}
                    isOpen={!!viewingHistory}
                    onOpenChange={() => setViewingHistory(null)}
                />
            )}
        </>
    );
}
