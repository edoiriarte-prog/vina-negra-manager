"use client";

import { useLocalStorage } from '@/hooks/use-local-storage';
import { getInventory } from '@/lib/data';
import { PurchaseOrder, SalesOrder, InventoryItem } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from '@/components/ui/table';
import { purchaseOrders as initialPurchaseOrders, salesOrders as initialSalesOrders } from '@/lib/data';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function InventoryPage() {
  const [purchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [salesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
        setInventory(getInventory(purchaseOrders, salesOrders));
    }
  }, [purchaseOrders, salesOrders, isClient]);
  
  const formatKilos = (value: number) => new Intl.NumberFormat('es-CL').format(value) + ' kg';

  const totals = useMemo(() => {
    return inventory.reduce(
      (acc, item) => {
        acc.kilosPurchased += item.kilosPurchased;
        acc.kilosSold += item.kilosSold;
        acc.stock += item.stock;
        return acc;
      },
      { kilosPurchased: 0, kilosSold: 0, stock: 0 }
    );
  }, [inventory]);

  const renderInventoryRows = () => {
    if (!isClient) {
      // Render skeleton rows on the server and initial client render
      return Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        </TableRow>
      ));
    }
    
    return inventory.map((item) => (
        <TableRow key={item.caliber}>
            <TableCell className="font-medium">{item.caliber}</TableCell>
            <TableCell className="text-right">{formatKilos(item.kilosPurchased)}</TableCell>
            <TableCell className="text-right">{formatKilos(item.kilosSold)}</TableCell>
            <TableCell className="text-right font-bold text-primary">{formatKilos(item.stock)}</TableCell>
        </TableRow>
    ));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Inventario en Tiempo Real</CardTitle>
        <CardDescription>Stock disponible calculado a partir de las compras y ventas.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
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
                      <TableHead className="font-bold text-lg">Total</TableHead>
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
  );
}
