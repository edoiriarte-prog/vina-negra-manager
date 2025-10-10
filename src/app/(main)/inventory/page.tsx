
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
    initialStock: number;
    inflows: number;
    outflows: number;
    adjustments: number;
    finalStock: number;
};

const formatKilos = (value: number) => new Intl.NumberFormat('es-CL').format(value) + ' kg';

export default function InventoryPage() {
    const [purchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
    const [salesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
    const [inventoryAdjustments] = useLocalStorage<InventoryAdjustment[]>('inventoryAdjustments', initialInventoryAdjustments);
    const [contacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
    const { calibers: masterCalibers, warehouses } = useMasterData();

    const [isClient, setIsClient] = useState(false);
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('All');
    const [inventoryData, setInventoryData] = useState<InventoryReportItem[]>([]);
    const [viewingHistory, setViewingHistory] = useState<InventoryReportItem | null>(null);

    const { toast } = useToast();

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (isClient) {
            const getStockAsOf = (date: Date) => {
                const stockMap = new Map<string, number>();

                const relevantPOs = purchaseOrders.filter(po => po.status === 'completed' && !isAfter(parseISO(po.date), date));
                const relevantSOs = salesOrders.filter(so => (so.status === 'completed' || so.status === 'pending') && !isAfter(parseISO(so.date), date));
                const relevantAdjs = inventoryAdjustments.filter(adj => !isAfter(parseISO(adj.date), date));

                const processItems = (items: any[], warehouse: string, isPurchase: boolean) => {
                    items.forEach(item => {
                        if (item.unit === 'Kilos' && (selectedWarehouse === 'All' || warehouse === selectedWarehouse)) {
                            const key = `${item.product}-${item.caliber}`;
                            const currentStock = stockMap.get(key) || 0;
                            stockMap.set(key, currentStock + (isPurchase ? item.quantity : -item.quantity));
                        }
                    });
                };
                
                relevantPOs.forEach(po => processItems(po.items, po.warehouse, true));
                relevantSOs.forEach(so => processItems(so.items, so.warehouse, false));

                relevantAdjs.forEach(adj => {
                    if (selectedWarehouse === 'All' || adj.warehouse === selectedWarehouse) {
                        const key = `${adj.product}-${adj.caliber}`;
                        const currentStock = stockMap.get(key) || 0;
                        const adjustment = adj.type === 'increase' ? adj.quantity : -adj.quantity;
                        stockMap.set(key, currentStock + adjustment);
                    }
                });

                return stockMap;
            };

            const initialStockMap = getStockAsOf(new Date(dateRange.from.getTime() - 86400000)); // Day before 'from'

            const inflowsMap = new Map<string, number>();
            const outflowsMap = new Map<string, number>();
            const adjustmentsMap = new Map<string, number>();
            const allItems = new Set<string>();

            const filterByDate = (dateStr: string) => {
                const date = parseISO(dateStr);
                return !isBefore(date, dateRange.from) && !isAfter(date, dateRange.to);
            };

            purchaseOrders.filter(po => po.status === 'completed' && filterByDate(po.date)).forEach(po => {
                po.items.forEach(item => {
                    if (item.unit === 'Kilos' && (selectedWarehouse === 'All' || po.warehouse === selectedWarehouse)) {
                        const key = `${item.product}-${item.caliber}`;
                        inflowsMap.set(key, (inflowsMap.get(key) || 0) + item.quantity);
                        allItems.add(key);
                    }
                });
            });

            salesOrders.filter(so => (so.status === 'completed' || so.status === 'pending') && filterByDate(so.date)).forEach(so => {
                so.items.forEach(item => {
                    if (item.unit === 'Kilos' && (selectedWarehouse === 'All' || so.warehouse === selectedWarehouse)) {
                        const key = `${item.product}-${item.caliber}`;
                        outflowsMap.set(key, (outflowsMap.get(key) || 0) + item.quantity);
                        allItems.add(key);
                    }
                });
            });

            inventoryAdjustments.filter(adj => filterByDate(adj.date)).forEach(adj => {
                if (selectedWarehouse === 'All' || adj.warehouse === selectedWarehouse) {
                    const key = `${adj.product}-${adj.caliber}`;
                    const adjustment = adj.type === 'increase' ? adj.quantity : -adj.quantity;
                    adjustmentsMap.set(key, (adjustmentsMap.get(key) || 0) + adjustment);
                    allItems.add(key);
                }
            });
            
            initialStockMap.forEach((_, key) => allItems.add(key));

            const reportData: InventoryReportItem[] = Array.from(allItems).map(key => {
                const [product, caliber] = key.split('-');
                const initialStock = initialStockMap.get(key) || 0;
                const inflows = inflowsMap.get(key) || 0;
                const outflows = outflowsMap.get(key) || 0;
                const adjustments = adjustmentsMap.get(key) || 0;
                const finalStock = initialStock + inflows - outflows + adjustments;

                return {
                    key,
                    product,
                    caliber,
                    caliberCode: masterCalibers.find(c => c.name === caliber)?.code || 'N/A',
                    initialStock,
                    inflows,
                    outflows,
                    adjustments,
                    finalStock,
                };
            }).sort((a, b) => a.key.localeCompare(b.key));
            
            setInventoryData(reportData);
        }
    }, [isClient, dateRange, selectedWarehouse, purchaseOrders, salesOrders, inventoryAdjustments, masterCalibers]);
    
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
        'Stock Inicial (kg)': item.initialStock,
        'Entradas (kg)': item.inflows,
        'Salidas (kg)': item.outflows,
        'Ajustes (kg)': item.adjustments,
        'Stock Final (kg)': item.finalStock,
      }));

      const summary = [
        ["Reporte de Inventario"],
        ["Periodo", `${format(dateRange.from, 'dd-MM-yyyy')} al ${format(dateRange.to, 'dd-MM-yyyy')}`],
        ["Bodega", selectedWarehouse],
        []
      ];

      const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
      XLSX.utils.sheet_add_aoa(worksheet, summary, { origin: "A1" });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
      XLSX.writeFile(workbook, `Reporte_Inventario_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast({ title: 'Exportación Exitosa'});
    };
    
    const totals = useMemo(() => {
        return inventoryData.reduce((acc, item) => {
            acc.initialStock += item.initialStock;
            acc.inflows += item.inflows;
            acc.outflows += item.outflows;
            acc.adjustments += item.adjustments;
            acc.finalStock += item.finalStock;
            return acc;
        }, { initialStock: 0, inflows: 0, outflows: 0, adjustments: 0, finalStock: 0 });
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
                            <TableHead>Producto</TableHead>
                            <TableHead>Calibre</TableHead>
                            <TableHead>Cód.</TableHead>
                            <TableHead className="text-right">Stock Inicial</TableHead>
                            <TableHead className="text-right">Entradas</TableHead>
                            <TableHead className="text-right">Salidas</TableHead>
                            <TableHead className="text-right">Ajustes</TableHead>
                            <TableHead className="text-right font-bold">Stock Final</TableHead>
                            <TableHead className="w-[50px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {inventoryData.length > 0 ? inventoryData.map(item => (
                             <TableRow key={item.key}>
                                <TableCell className="font-medium">{item.product}</TableCell>
                                <TableCell>{item.caliber}</TableCell>
                                <TableCell>{item.caliberCode}</TableCell>
                                <TableCell className="text-right">{formatKilos(item.initialStock)}</TableCell>
                                <TableCell className="text-right text-green-500">{item.inflows > 0 ? `+${formatKilos(item.inflows)}` : '-'}</TableCell>
                                <TableCell className="text-right text-red-500">{item.outflows > 0 ? `-${formatKilos(item.outflows)}` : '-'}</TableCell>
                                <TableCell className="text-right text-blue-500">{item.adjustments !== 0 ? formatKilos(item.adjustments) : '-'}</TableCell>
                                <TableCell className="text-right font-bold text-primary">{formatKilos(item.finalStock)}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => setViewingHistory(item as any)}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center h-24">No hay datos de inventario para el período y bodega seleccionados.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                     <TableFooter>
                        <TableRow>
                            <TableHead colSpan={3} className="text-right font-bold text-lg">Totales</TableHead>
                            <TableHead className="text-right font-bold text-lg">{formatKilos(totals.initialStock)}</TableHead>
                            <TableHead className="text-right font-bold text-lg">{formatKilos(totals.inflows)}</TableHead>
                            <TableHead className="text-right font-bold text-lg">{formatKilos(totals.outflows)}</TableHead>
                            <TableHead className="text-right font-bold text-lg">{formatKilos(totals.adjustments)}</TableHead>
                            <TableHead className="text-right font-bold text-lg">{formatKilos(totals.finalStock)}</TableHead>
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
                                    {format(dateRange.from, "PPP", { locale: es })}
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
                                    {format(dateRange.to, "PPP", { locale: es })}
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
                    item={viewingHistory as any}
                    isOpen={!!viewingHistory}
                    onOpenChange={() => setViewingHistory(null)}
                />
            )}
        </>
    );
}
