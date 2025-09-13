"use client";

import { useLocalStorage } from '@/hooks/use-local-storage';
import { getInventory } from '@/lib/data';
import { PurchaseOrder, SalesOrder } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { purchaseOrders as initialPurchaseOrders, salesOrders as initialSalesOrders } from '@/lib/data';

export default function InventoryPage() {
  const [purchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [salesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
  
  const inventory = getInventory(purchaseOrders, salesOrders);
  
  const formatKilos = (value: number) => new Intl.NumberFormat('es-CL').format(value) + ' kg';

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
                    {inventory.map((item) => (
                        <TableRow key={item.caliber}>
                            <TableCell className="font-medium">{item.caliber}</TableCell>
                            <TableCell className="text-right">{formatKilos(item.kilosPurchased)}</TableCell>
                            <TableCell className="text-right">{formatKilos(item.kilosSold)}</TableCell>
                            <TableCell className="text-right font-bold text-primary">{formatKilos(item.stock)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
