
"use client";

import { useMemo, useRef, forwardRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InventoryItem, PurchaseOrder, SalesOrder } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { purchaseOrders as initialPurchaseOrders, salesOrders as initialSalesOrders } from '@/lib/data';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';

type InventoryHistoryDialogProps = {
  item: InventoryItem | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

type Transaction = {
  date: string;
  orderId: string;
  type: 'Entrada' | 'Salida';
  contact: string;
  quantity: number;
};

const formatKilos = (value: number) => new Intl.NumberFormat('es-CL').format(value) + ' kg';

const PrintableContent = forwardRef<HTMLDivElement, { history: (Transaction & { balance: number })[] }>(({ history }, ref) => (
    <div ref={ref} className="max-h-[60vh] overflow-y-auto p-1">
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Contacto</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {history.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center">Sin transacciones.</TableCell></TableRow>}
                    {history.map((tx, index) => (
                        <TableRow key={index}>
                            <TableCell className="font-medium">{format(parseISO(tx.date), 'dd-MM-yyyy', { locale: es })}</TableCell>
                            <TableCell>
                                <Badge variant={tx.type === 'Entrada' ? 'secondary' : 'destructive'}>{tx.type}</Badge>
                            </TableCell>
                            <TableCell>{tx.orderId}</TableCell>
                            <TableCell>{tx.contact}</TableCell>
                            <TableCell className={`text-right font-medium ${tx.type === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>
                                {tx.type === 'Entrada' ? '+' : '-'} {formatKilos(tx.quantity)}
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
));
PrintableContent.displayName = 'PrintableContent';

export function InventoryHistoryDialog({ item, isOpen, onOpenChange }: InventoryHistoryDialogProps) {
  const [purchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [salesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
  const [contacts] = useLocalStorage('contacts', []);

  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });
  
  const transactionHistory = useMemo(() => {
    if (!item) return [];

    const allTransactions: Transaction[] = [];

    // Aggregate inflows from purchase orders
    purchaseOrders
      .filter(po => (item.warehouse === 'All' || po.warehouse === item.warehouse) && po.status === 'completed')
      .forEach(po => {
        po.items
          .filter(i => i.product === item.product && i.caliber === item.caliber)
          .forEach(i => {
            const supplier = (contacts as any[]).find(c => c.id === po.supplierId);
            allTransactions.push({
              date: po.date,
              orderId: po.id,
              type: 'Entrada',
              contact: supplier?.name || 'N/A',
              quantity: i.quantity,
            });
          });
      });

    // Aggregate outflows from sales orders
    salesOrders
      .filter(so => (item.warehouse === 'All' || so.warehouse === item.warehouse) && (so.status === 'completed' || so.status === 'pending'))
      .forEach(so => {
        so.items
          .filter(i => i.product === item.product && i.caliber === item.caliber)
          .forEach(i => {
            const client = (contacts as any[]).find(c => c.id === so.clientId);
            allTransactions.push({
              date: so.date,
              orderId: so.id,
              type: 'Salida',
              contact: client?.name || 'N/A',
              quantity: i.quantity,
            });
          });
      });

    // Sort transactions: by date, then by type ('Entrada' first)
    allTransactions.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      // If dates are same, 'Entrada' comes before 'Salida'
      return a.type === 'Entrada' ? -1 : 1;
    });

    let runningBalance = 0;
    return allTransactions.map(tx => {
      if (tx.type === 'Entrada') {
        runningBalance += tx.quantity;
      } else {
        runningBalance -= tx.quantity;
      }
      return { ...tx, balance: runningBalance };
    });

  }, [item, purchaseOrders, salesOrders, contacts]);
  
  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Seguimiento Histórico: {item.product} - {item.caliber}</DialogTitle>
          <DialogDescription>
            Historial de transacciones y balance de stock para este ítem en la bodega: {item.warehouse}.
          </DialogDescription>
        </DialogHeader>
        <PrintableContent ref={componentRef} history={transactionHistory} />
        <DialogFooter className="no-print">
          <Button type="button" variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Historial
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
