
"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { getInventory, inventoryAdjustments as initialInventoryAdjustments, purchaseOrders as initialPurchaseOrders, salesOrders as initialSalesOrders } from '@/lib/data';
import { PurchaseOrder, SalesOrder, InventoryItem, InventoryAdjustment } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useMasterData } from '@/hooks/use-master-data';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InventoryHistoryDialog } from './components/inventory-history-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Printer, Download } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { useReactToPrint } from 'react-to-print';

type PerformanceItem = {
    key: string;
    product: string;
    caliber: string;
    totalKilos: number;
    totalValue: number;
    avgPrice: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);


export default function InventoryPage() {
  const [purchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [salesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
  const [inventoryAdjustments] = useLocalStorage<InventoryAdjustment[]>('inventoryAdjustments', initialInventoryAdjustments);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [salesPerformance, setSalesPerformance] = useState<PerformanceItem[]>([]);
  const [purchasePerformance, setPurchasePerformance] = useState<PerformanceItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    // Set the date only on the client side to avoid hydration mismatch
    setFilterDate(new Date());
  }, []);

  useEffect(() => {
    if (isClient) {
        const endDate = filterDate ? startOfDay(filterDate) : new Date();

        const filteredPurchases = purchaseOrders.filter(po => new Date(po.date) <= endDate);
        const filteredSales = salesOrders.filter(so => new Date(so.date) <= endDate);
        
        // Sales Performance
        const salesMap = new Map<string, { totalKilos: number, totalValue: number }>();
        filteredSales.forEach(order => {
            if (order.status === 'completed') {
                order.items.forEach(item => {
                    const key = `${item.product} - ${item.caliber}`;
                    const existing = salesMap.get(key) || { totalKilos: 0, totalValue: 0 };
                    const quantityInKilos = item.unit === 'Kilos' ? item.quantity : 0;
                    
                    existing.totalKilos += quantityInKilos;
                    existing.totalValue += item.price * item.quantity;
                    salesMap.set(key, existing);
                });
            }
        });

        const salesData: PerformanceItem[] = [];
        salesMap.forEach((value, key) => {
            const [product, caliber] = key.split(' - ');
            salesData.push({
                key,
                product,
                caliber,
                totalKilos: value.totalKilos,
                totalValue: value.totalValue,
                avgPrice: value.totalKilos > 0 ? value.totalValue / value.totalKilos : 0,
            });
        });
        setSalesPerformance(salesData.sort((a,b) => b.totalValue - a.totalValue));

        // Purchase Performance
        const purchaseMap = new Map<string, { totalKilos: number, totalValue: number }>();
        filteredPurchases.forEach(order => {
             if (order.status === 'completed') {
                order.items.forEach(item => {
                    const key = `${item.product} - ${item.caliber}`;
                    const existing = purchaseMap.get(key) || { totalKilos: 0, totalValue: 0 };
                    const quantityInKilos = item.unit === 'Kilos' ? item.quantity : 0;

                    existing.totalKilos += quantityInKilos;
                    existing.totalValue += item.price * item.quantity;
                    purchaseMap.set(key, existing);
                });
            }
        });

        const purchaseData: PerformanceItem[] = [];
        purchaseMap.forEach((value, key) => {
            const [product, caliber] = key.split(' - ');
            purchaseData.push({
                key,
                product,
                caliber,
                totalKilos: value.totalKilos,
                totalValue: value.totalValue,
                avgPrice: value.totalKilos > 0 ? value.totalValue / value.totalKilos : 0,
            });
        });
        setPurchasePerformance(purchaseData.sort((a,b) => b.totalValue - a.totalValue));
    }
  }, [purchaseOrders, salesOrders, isClient, filterDate]);
  
  const formatKilos = (value: number) => new Intl.NumberFormat('es-CL').format(value) + ' kg';
    const renderPerformanceRows = (data: PerformanceItem[], type: 'sales' | 'purchases') => {
        if (!isClient) {
            return Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={`skeleton-perf-${type}-${index}`}>
                    <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
            ));
        }

        return data.map(item => (
            <TableRow key={item.key}>
                <TableCell className="font-medium">{item.product}</TableCell>
                <TableCell>{item.caliber}</TableCell>
                <TableCell className="text-right">{formatKilos(item.totalKilos)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.totalValue)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(item.avgPrice)}/kg</TableCell>
            </TableRow>
        ));
    }

  return (
    <>
      <div className="flex flex-col gap-6">
       <div className="flex justify-between items-start no-print">
          <div>
            <h1 className="font-headline text-3xl">Rendimiento de Productos</h1>
            <p className="text-muted-foreground">Analiza el rendimiento de tus productos en compras y ventas.</p>
          </div>
        </div>

        <div className="flex flex-col gap-6 mt-6">
            <div className="flex items-center gap-4 mb-4 no-print">
                <div className="flex flex-col gap-1.5">
                    <Label>Ver rendimiento hasta</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn("w-[280px] justify-start text-left font-normal", !filterDate && "text-muted-foreground")}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filterDate ? format(filterDate, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={filterDate || undefined}
                            onSelect={(date) => setFilterDate(date || null)}
                            initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            <Card className="print-container">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Rendimiento de Ventas</CardTitle>
                    <CardDescription>Análisis de ventas por producto y calibre.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Calibre</TableHead>
                                    <TableHead className="text-right">Kilos Vendidos</TableHead>
                                    <TableHead className="text-right">Ingreso Total</TableHead>
                                    <TableHead className="text-right">Precio Promedio/kg</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderPerformanceRows(salesPerformance, 'sales')}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card className="print-container">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Rendimiento de Compras</CardTitle>
                    <CardDescription>Análisis de compras por producto y calibre.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Calibre</TableHead>
                                    <TableHead className="text-right">Kilos Comprados</TableHead>
                                    <TableHead className="text-right">Costo Total</TableHead>
                                    <TableHead className="text-right">Costo Promedio/kg</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderPerformanceRows(purchasePerformance, 'purchases')}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}
