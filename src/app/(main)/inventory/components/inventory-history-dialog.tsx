
"use client";

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InventoryItem, PurchaseOrder, SalesOrder, Contact } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { purchaseOrders as initialPurchaseOrders, salesOrders as initialSalesOrders, contacts as initialContacts } from '@/lib/data';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type InventoryHistoryDialogProps = {
  item: InventoryItem | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

const formatKilos = (value: number) => new Intl.NumberFormat('es-CL').format(value) + ' kg';

type Transaction = {
    date: string;
    type: 'in' | 'out';
    orderId: string;
    contactName: string;
    quantity: number;
    balance: number;
}

export function InventoryHistoryDialog({ item, isOpen, onOpenChange }: InventoryHistoryDialogProps) {
  const [purchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [salesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
  const [contacts] = useLocalStorage<Contact[]>('contacts', initialContacts);

  const history = useMemo(() => {
    if (!item) return [];

    const inflows = purchaseOrders
      .flatMap(po => 
        po.items
          .filter(i => i.product === item.product && i.caliber === item.caliber && (item.warehouse === 'All' || po.warehouse === item.warehouse))
          .map(i => ({
            date: po.date,
            type: 'in' as const,
            orderId: po.id,
            contactName: contacts.find(c => c.id === po.supplierId)?.name || 'N/A',
            quantity: i.quantity,
          }))
      );

    const outflows = salesOrders
      .flatMap(so => 
        so.items
          .filter(i => i.product === item.product && i.caliber === item.caliber && (item.warehouse === 'All' || so.warehouse === item.warehouse))
          .map(i => ({
            date: so.date,
            type: 'out' as const,
            orderId: so.id,
            contactName: contacts.find(c => c.id === so.clientId)?.name || 'N/A',
            quantity: i.quantity,
          }))
      );

    const combined = [...inflows, ...outflows].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let runningBalance = 0;
    const chronologicalHistory: Transaction[] = combined.map(tx => {
        if (tx.type === 'in') {
            runningBalance += tx.quantity;
        } else {
            runningBalance -= tx.quantity;
        }
        return {
            ...tx,
            balance: runningBalance,
        };
    });

    return chronologicalHistory;
  }, [item, purchaseOrders, salesOrders, contacts]);
  
  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Seguimiento Histórico: {item.product} - {item.caliber}</DialogTitle>
          <DialogDescription>
            Historial cronológico de transacciones y balance de stock para este ítem en la bodega: {item.warehouse}.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto p-1">
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Orden ID</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Contacto</TableHead>
                            <TableHead className="text-right">Ingresos (kg)</TableHead>
                            <TableHead className="text-right">Egresos (kg)</TableHead>
                            <TableHead className="text-right">Saldo (kg)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {history.length === 0 && <TableRow><TableCell colSpan={7} className="h-24 text-center">Sin transacciones.</TableCell></TableRow>}
                        {history.map((tx, index) => (
                            <TableRow key={`${tx.orderId}-${index}`}>
                                <TableCell>{format(parseISO(tx.date), 'dd-MM-yy')}</TableCell>
                                <TableCell>{tx.orderId}</TableCell>
                                <TableCell>
                                    {tx.type === 'in' ? (
                                        <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300">
                                            <ArrowUpCircle className="mr-1 h-3 w-3" />
                                            Entrada
                                        </Badge>
                                    ) : (
                                        <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300">
                                            <ArrowDownCircle className="mr-1 h-3 w-3" />
                                            Salida
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-xs truncate">{tx.contactName}</TableCell>
                                 <TableCell className="text-right font-medium text-green-600">
                                    {tx.type === 'in' ? formatKilos(tx.quantity) : '-'}
                                </TableCell>
                                <TableCell className="text-right font-medium text-red-600">
                                    {tx.type === 'out' ? formatKilos(tx.quantity) : '-'}
                                </TableCell>
                                <TableCell className="text-right font-bold text-primary">
                                    {formatKilos(tx.balance)}
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
