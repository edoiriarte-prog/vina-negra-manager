"use client";

import { useLocalStorage } from '@/hooks/use-local-storage';
import { getInventory } from '@/lib/data';
import { PurchaseOrder, SalesOrder, InventoryItem, InventoryAdjustment } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from '@/components/ui/table';
import { purchaseOrders as initialPurchaseOrders, salesOrders as initialSalesOrders, inventoryAdjustments as initialInventoryAdjustments } from '@/lib/data';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PerformanceReports } from './components/performance-reports';
import { Badge } from '@/components/ui/badge';

export default function InventoryPage() {
  const [purchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [salesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
  const [inventoryAdjustments] = useLocalStorage<InventoryAdjustment[]>('inventoryAdjustments', initialInventoryAdjustments);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
        setInventory(getInventory(purchaseOrders, salesOrders, inventoryAdjustments));
    }
  }, [purchaseOrders, salesOrders, inventoryAdjustments, isClient]);
  
  const formatKilos = (value: number) => new Intl.NumberFormat('es-CL').format(value) + ' kg';

  const totals = useMemo(() => {
    return inventory.reduce(
      (acc, item) => {
        acc.kilosPurchased += item.kilosPurchased;
        acc.kilosSold += item.kilosSold;
        acc.kilosAdjusted += item.kilosAdjusted;
        acc.stock += item.stock;
        return acc;
      },
      { kilosPurchased: 0, kilosSold: 0, stock: 0, kilosAdjusted: 0 }
    );
  }, [inventory]);

  const renderInventoryRows = () => {
    if (!isClient) {
      // Render skeleton rows on the server and initial client render
      return Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        </TableRow>
      ));
    }
    
    return inventory.map((item) => (
        <TableRow key={item.key}>
            <TableCell className="font-medium">{item.product}</TableCell>
            <TableCell>{item.caliber}</TableCell>
            <TableCell>{item.warehouse}</TableCell>
            <TableCell className="text-right">{formatKilos(item.kilosPurchased)}</TableCell>
            <TableCell className="text-right">{formatKilos(item.kilosSold)}</TableCell>
            <TableCell className="text-right">
              <Badge variant={item.kilosAdjusted === 0 ? "secondary" : item.kilosAdjusted > 0 ? "default" : "destructive"}>
                {formatKilos(item.kilosAdjusted)}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-bold text-primary">{formatKilos(item.stock)}</TableCell>
        </TableRow>
    ));
  }

  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="font-headline text-3xl">Inventario y Rendimiento</h1>
        <p className="text-muted-foreground">Analiza el stock actual y el rendimiento de tus productos.</p>
      </div>

      <Tabs defaultValue="stock">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stock">Stock Actual</TabsTrigger>
          <TabsTrigger value="performance">Rendimiento de Productos</TabsTrigger>
        </TabsList>
        <TabsContent value="stock">
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Inventario en Tiempo Real</CardTitle>
                    <CardDescription>Stock disponible calculado a partir de compras, ventas y ajustes manuales.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className='font-bold'>Producto</TableHead>
                                    <TableHead className='font-bold'>Calibre</TableHead>
                                    <TableHead className='font-bold'>Bodega</TableHead>
                                    <TableHead className='text-right font-bold'>Kilos Comprados</TableHead>
                                    <TableHead className='text-right font-bold'>Kilos Vendidos</TableHead>
                                    <TableHead className='text-right font-bold'>Kilos Ajustados</TableHead>
                                    <TableHead className='text-right font-bold text-primary'>Stock Actual</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderInventoryRows()}
                            </TableBody>
                            {isClient && (
                            <TableFooter>
                                <TableRow>
                                <TableHead colSpan={3} className="font-bold text-lg">Total</TableHead>
                                <TableHead className="text-right font-bold text-lg">{formatKilos(totals.kilosPurchased)}</TableHead>
                                <TableHead className="text-right font-bold text-lg">{formatKilos(totals.kilosSold)}</TableHead>
                                <TableHead className="text-right font-bold text-lg">{formatKilos(totals.kilosAdjusted)}</TableHead>
                                <TableHead className="text-right font-bold text-lg text-primary">{formatKilos(totals.stock)}</TableHead>
                                </TableRow>
                            </TableFooter>
                            )}
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="performance">
             <PerformanceReports
                salesOrders={salesOrders}
                purchaseOrders={purchaseOrders}
            />
        </TabsContent>
      </Tabs>
    </div>
  );
}
