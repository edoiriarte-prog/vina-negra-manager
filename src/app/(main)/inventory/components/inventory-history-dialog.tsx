
"use client";

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InventoryItem, PurchaseOrder, SalesOrder } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { purchaseOrders as initialPurchaseOrders, salesOrders as initialSalesOrders } from '@/lib/data';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

type InventoryHistoryDialogProps = {
  item: InventoryItem | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

type DailySummary = {
    date: string;
    inflows: number;
    outflows: number;
    balance: number;
}

const formatKilos = (value: number) => new Intl.NumberFormat('es-CL').format(value) + ' kg';

export function InventoryHistoryDialog({ item, isOpen, onOpenChange }: InventoryHistoryDialogProps) {
  const [purchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [salesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
  
  const dailySummary = useMemo(() => {
    if (!item) return [];

    const transactionsByDate: Record<string, { inflows: number, outflows: number }> = {};

    // Aggregate inflows from purchase orders
    purchaseOrders
      .flatMap(po => 
        po.items
          .filter(i => i.product === item.product && i.caliber === item.caliber && (item.warehouse === 'All' || po.warehouse === item.warehouse) && po.status === 'completed')
          .map(i => ({ date: po.date, quantity: i.quantity }))
      )
      .forEach(tx => {
        const dateStr = format(parseISO(tx.date), 'yyyy-MM-dd');
        if (!transactionsByDate[dateStr]) {
          transactionsByDate[dateStr] = { inflows: 0, outflows: 0 };
        }
        transactionsByDate[dateStr].inflows += tx.quantity;
      });

    // Aggregate outflows from sales orders
    salesOrders
      .flatMap(so => 
        so.items
          .filter(i => i.product === item.product && i.caliber === item.caliber && (item.warehouse === 'All' || so.warehouse === item.warehouse) && (so.status === 'completed' || so.status === 'pending'))
          .map(i => ({ date: so.date, quantity: i.quantity }))
      )
      .forEach(tx => {
        const dateStr = format(parseISO(tx.date), 'yyyy-MM-dd');
        if (!transactionsByDate[dateStr]) {
          transactionsByDate[dateStr] = { inflows: 0, outflows: 0 };
        }
        transactionsByDate[dateStr].outflows += tx.quantity;
      });

    const sortedDates = Object.keys(transactionsByDate).sort();

    let runningBalance = 0;
    const summary: DailySummary[] = sortedDates.map(dateStr => {
        const dailyTx = transactionsByDate[dateStr];
        runningBalance += dailyTx.inflows - dailyTx.outflows;
        return {
            date: dateStr,
            inflows: dailyTx.inflows,
            outflows: dailyTx.outflows,
            balance: runningBalance,
        };
    });

    return summary;
  }, [item, purchaseOrders, salesOrders]);
  
  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Seguimiento Histórico: {item.product} - {item.caliber}</DialogTitle>
          <DialogDescription>
            Resumen de movimientos diarios y balance de stock para este ítem en la bodega: {item.warehouse}.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto p-1">
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead className="text-right">Ingresos (kg)</TableHead>
                            <TableHead className="text-right">Egresos (kg)</TableHead>
                            <TableHead className="text-right">Saldo (kg)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dailySummary.length === 0 && <TableRow><TableCell colSpan={4} className="h-24 text-center">Sin transacciones.</TableCell></TableRow>}
                        {dailySummary.map((day) => (
                            <TableRow key={day.date}>
                                <TableCell className="font-medium">{format(parseISO(day.date), 'dd-MM-yyyy', { locale: es })}</TableCell>
                                <TableCell className="text-right font-medium text-green-600">
                                    {day.inflows > 0 ? formatKilos(day.inflows) : '-'}
                                </TableCell>
                                <TableCell className="text-right font-medium text-red-600">
                                    {day.outflows > 0 ? formatKilos(day.outflows) : '-'}
                                </TableCell>
                                <TableCell className="text-right font-bold text-primary">
                                    {formatKilos(day.balance)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
