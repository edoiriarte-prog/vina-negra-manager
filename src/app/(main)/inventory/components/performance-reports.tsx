
"use client";

import { useState, useEffect } from 'react';
import { SalesOrder, PurchaseOrder } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

type PerformanceReportProps = {
    salesOrders: SalesOrder[];
    purchaseOrders: PurchaseOrder[];
}

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

const formatKilos = (value: number) => new Intl.NumberFormat('es-CL').format(value) + ' kg';

export function PerformanceReports({ salesOrders, purchaseOrders }: PerformanceReportProps) {
    const [salesPerformance, setSalesPerformance] = useState<PerformanceItem[]>([]);
    const [purchasePerformance, setPurchasePerformance] = useState<PerformanceItem[]>([]);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (isClient) {
            // Sales Performance
            const salesMap = new Map<string, { totalKilos: number, totalValue: number }>();
            salesOrders.forEach(order => {
                if (order.status === 'completed') {
                    order.items.forEach(item => {
                        const key = `${item.product} - ${item.caliber}`;
                        const existing = salesMap.get(key) || { totalKilos: 0, totalValue: 0 };
                        const quantityInKilos = item.unit === 'Kilos' ? item.quantity : 0; // Assuming conversion is 1:1 or cajas are not kilos
                        
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
            purchaseOrders.forEach(order => {
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
    }, [salesOrders, purchaseOrders, isClient]);
    
    const renderPerformanceRows = (data: PerformanceItem[]) => {
        if (!isClient) {
            return Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={`skeleton-perf-${index}`}>
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
        <div className="flex flex-col gap-6 mt-6">
            <Card>
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
                                {renderPerformanceRows(salesPerformance)}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

             <Card>
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
                                {renderPerformanceRows(purchasePerformance)}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
