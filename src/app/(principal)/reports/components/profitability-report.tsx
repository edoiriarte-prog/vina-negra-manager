

"use client";

import { useState, useEffect, useMemo } from 'react';
import { SalesOrder, PurchaseOrder } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

type ProfitabilityReportProps = {}

type PerformanceData = {
    totalKilos: number;
    totalValue: number;
    avgPrice: number;
};

type ProfitabilityItem = {
    key: string;
    product: string;
    caliber: string;
    sales: PerformanceData;
    purchases: PerformanceData;
    profitMargin: number | null;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

const formatKilos = (value: number) => new Intl.NumberFormat('es-CL').format(value) + ' kg';

export function ProfitabilityReport({}: ProfitabilityReportProps) {
    const { firestore } = useFirebase();

    const salesOrdersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'salesOrders') : null, [firestore]);
    const purchaseOrdersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'purchaseOrders') : null, [firestore]);

    const { data: salesOrders, isLoading: loadingSales } = useCollection<SalesOrder>(salesOrdersQuery);
    const { data: purchaseOrders, isLoading: loadingPurchases } = useCollection<PurchaseOrder>(purchaseOrdersQuery);

    const [reportData, setReportData] = useState<ProfitabilityItem[]>([]);
    
    const isLoading = loadingSales || loadingPurchases;

    useEffect(() => {
        if (salesOrders && purchaseOrders) {
            const salesMap = new Map<string, { totalKilos: number, totalValue: number }>();
            salesOrders.forEach(order => {
                if (order.status === 'completed') {
                    order.items.forEach(item => {
                        const key = `${item.product} - ${item.caliber}`;
                        const existing = salesMap.get(key) || { totalKilos: 0, totalValue: 0 };
                        if (item.unit === 'Kilos') {
                            existing.totalKilos += item.quantity;
                            existing.totalValue += item.price * item.quantity;
                        }
                        salesMap.set(key, existing);
                    });
                }
            });

            const purchaseMap = new Map<string, { totalKilos: number, totalValue: number }>();
            purchaseOrders.forEach(order => {
                 if (order.status === 'completed') {
                    order.items.forEach(item => {
                        const key = `${item.product} - ${item.caliber}`;
                        const existing = purchaseMap.get(key) || { totalKilos: 0, totalValue: 0 };
                        if (item.unit === 'Kilos') {
                            existing.totalKilos += item.quantity;
                            existing.totalValue += item.price * item.quantity;
                        }
                        purchaseMap.set(key, existing);
                    });
                }
            });
            
            const combinedKeys = new Set([...salesMap.keys(), ...purchaseMap.keys()]);
            const profitabilityData: ProfitabilityItem[] = [];

            combinedKeys.forEach(key => {
                const [product, caliber] = key.split(' - ');
                const salesData = salesMap.get(key);
                const purchaseData = purchaseMap.get(key);

                const sales: PerformanceData = {
                    totalKilos: salesData?.totalKilos || 0,
                    totalValue: salesData?.totalValue || 0,
                    avgPrice: salesData && salesData.totalKilos > 0 ? salesData.totalValue / salesData.totalKilos : 0,
                };
                
                const purchases: PerformanceData = {
                    totalKilos: purchaseData?.totalKilos || 0,
                    totalValue: purchaseData?.totalValue || 0,
                    avgPrice: purchaseData && purchaseData.totalKilos > 0 ? purchaseData.totalValue / purchaseData.totalKilos : 0,
                };

                let profitMargin: number | null = null;
                if (sales.avgPrice > 0 && purchases.avgPrice > 0) {
                    profitMargin = ((sales.avgPrice - purchases.avgPrice) / sales.avgPrice) * 100;
                }

                profitabilityData.push({
                    key,
                    product,
                    caliber,
                    sales,
                    purchases,
                    profitMargin,
                });
            });

            setReportData(profitabilityData.sort((a,b) => a.key.localeCompare(b.key)));
        }
    }, [salesOrders, purchaseOrders]);
    
    const renderReportRows = (data: ProfitabilityItem[]) => {
        if (isLoading) {
            return Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-profit-${index}`}>
                    <TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
            ));
        }

        if (data.length === 0) {
            return <TableRow><TableCell colSpan={8} className="text-center h-24">No hay datos para mostrar.</TableCell></TableRow>;
        }

        return data.map(item => (
            <TableRow key={item.key}>
                <TableCell className="font-medium">{item.product}</TableCell>
                <TableCell>{item.caliber}</TableCell>
                <TableCell className="text-right">{formatKilos(item.sales.totalKilos)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.sales.avgPrice)}</TableCell>
                <TableCell className="text-right">{formatKilos(item.purchases.totalKilos)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.purchases.avgPrice)}</TableCell>
                <TableCell className="text-right font-bold">
                    {item.profitMargin !== null ? (
                        <Badge variant={item.profitMargin > 20 ? 'default' : item.profitMargin > 0 ? 'secondary' : 'destructive'}>
                            {item.profitMargin.toFixed(1)}%
                        </Badge>
                    ) : '-'}
                </TableCell>
            </TableRow>
        ));
    }

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Informe de Rentabilidad por Producto</CardTitle>
                <CardDescription>Análisis comparativo de precios de compra vs. venta y margen de rentabilidad por calibre.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead rowSpan={2} className="align-bottom">Producto</TableHead>
                                <TableHead rowSpan={2} className="align-bottom">Calibre</TableHead>
                                <TableHead colSpan={2} className="text-center border-b border-l">Ventas</TableHead>
                                <TableHead colSpan={2} className="text-center border-b border-l">Compras</TableHead>
                                <TableHead rowSpan={2} className="text-right align-bottom border-l">Margen</TableHead>
                            </TableRow>
                             <TableRow>
                                <TableHead className="text-right">Kilos Vendidos</TableHead>
                                <TableHead className="text-right">Precio Prom.</TableHead>
                                <TableHead className="text-right border-l">Kilos Comprados</TableHead>
                                <TableHead className="text-right">Costo Prom.</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {renderReportRows(reportData)}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
