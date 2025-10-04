
"use client";

import { useLocalStorage } from '@/hooks/use-local-storage';
import { getInventory } from '@/lib/data';
import { PurchaseOrder, SalesOrder, InventoryItem } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from '@/components/ui/table';
import { purchaseOrders as initialPurchaseOrders, salesOrders as initialSalesOrders } from '@/lib/data';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PerformanceReports } from './components/performance-reports';
import { useMasterData } from '@/hooks/use-master-data';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InventoryHistoryDialog } from './components/inventory-history-dialog';

export default function InventoryPage() {
  const [purchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [salesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isClient, setIsClient] = useState(false);
  const { warehouses } = useMasterData();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('All');
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
        setInventory(getInventory(purchaseOrders, salesOrders));
    }
  }, [purchaseOrders, salesOrders, isClient]);
  
  const formatKilos = (value: number) => new Intl.NumberFormat('es-CL').format(value) + ' kg';

  const filteredInventory = useMemo(() => {
    if (selectedWarehouse === 'All') {
      const combined = new Map<string, InventoryItem>();
      inventory.forEach(item => {
        const key = `${item.product} - ${item.caliber}`;
        const existing = combined.get(key) || { 
            key, 
            product: item.product, 
            caliber: item.caliber, 
            warehouse: 'All', 
            kilosPurchased: 0, 
            kilosSold: 0, 
            stock: 0 
        };
        existing.kilosPurchased += item.kilosPurchased;
        existing.kilosSold += item.kilosSold;
        existing.stock += item.stock;
        combined.set(key, existing);
      });
      return Array.from(combined.values());
    }
    return inventory.filter(item => item.warehouse === selectedWarehouse);
  }, [inventory, selectedWarehouse]);

  const totals = useMemo(() => {
    return filteredInventory.reduce(
      (acc, item) => {
        acc.kilosPurchased += item.kilosPurchased;
        acc.kilosSold += item.kilosSold;
        acc.stock += item.stock;
        return acc;
      },
      { kilosPurchased: 0, kilosSold: 0, stock: 0 }
    );
  }, [filteredInventory]);

  const handleShowHistory = (item: InventoryItem) => {
    setHistoryItem(item);
  };

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
        </TableRow>
      ));
    }
    
    return filteredInventory.map((item) => (
        <TableRow key={item.key} onClick={() => handleShowHistory(item)} className="cursor-pointer">
            <TableCell className="font-medium">{item.product}</TableCell>
            <TableCell>{item.caliber}</TableCell>
            <TableCell className="text-right">{formatKilos(item.kilosPurchased)}</TableCell>
            <TableCell className="text-right">{formatKilos(item.kilosSold)}</TableCell>
            <TableCell className="text-right font-bold text-primary">{formatKilos(item.stock)}</TableCell>
        </TableRow>
    ));
  }

  return (
    <>
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
                    <CardDescription>Stock disponible calculado a partir de las compras y ventas completadas. Haz clic en una fila para ver el historial.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 mb-4">
                      <Button
                        variant={selectedWarehouse === 'All' ? 'default' : 'outline'}
                        onClick={() => setSelectedWarehouse('All')}
                      >
                        Todas las bodegas
                      </Button>
                      {warehouses.map(w => (
                        <Button
                          key={w}
                          variant={selectedWarehouse === w ? 'default' : 'outline'}
                          onClick={() => setSelectedWarehouse(w)}
                        >
                          {w}
                        </Button>
                      ))}
                    </div>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className='font-bold'>Producto</TableHead>
                                    <TableHead className='font-bold'>Calibre</TableHead>
                                    <TableHead className='text-right font-bold'>Kilos Comprados</TableHead>
                                    <TableHead className='text-right font-bold'>Kilos Vendidos</TableHead>
                                    <TableHead className='text-right font-bold text-primary'>Stock Actual</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderInventoryRows()}
                            </TableBody>
                            {isClient && (
                            <TableFooter>
                                <TableRow>
                                <TableHead colSpan={2} className="font-bold text-lg">Total ({selectedWarehouse === 'All' ? 'Global' : selectedWarehouse})</TableHead>
                                <TableHead className="text-right font-bold text-lg">{formatKilos(totals.kilosPurchased)}</TableHead>
                                <TableHead className="text-right font-bold text-lg">{formatKilos(totals.kilosSold)}</TableHead>
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
      <InventoryHistoryDialog
        item={historyItem}
        isOpen={!!historyItem}
        onOpenChange={() => setHistoryItem(null)}
      />
    </>
  );
}
