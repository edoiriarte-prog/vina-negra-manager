
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

type InventoryHistoryDialogProps = {
  item: InventoryItem | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

const formatKilos = (value: number) => new Intl.NumberFormat('es-CL').format(value) + ' kg';

export function InventoryHistoryDialog({ item, isOpen, onOpenChange }: InventoryHistoryDialogProps) {
  const [purchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [salesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
  const [contacts] = useLocalStorage<Contact[]>('contacts', initialContacts);

  const history = useMemo(() => {
    if (!item) return { inflows: [], outflows: [] };

    const inflows = purchaseOrders
      .flatMap(po => 
        po.items
          .filter(i => i.product === item.product && i.caliber === item.caliber && (item.warehouse === 'All' || po.warehouse === item.warehouse))
          .map(i => ({
            orderId: po.id,
            date: po.date,
            contactName: contacts.find(c => c.id === po.supplierId)?.name || 'N/A',
            quantity: i.quantity,
          }))
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const outflows = salesOrders
      .flatMap(so => 
        so.items
          .filter(i => i.product === item.product && i.caliber === item.caliber && (item.warehouse === 'All' || so.warehouse === item.warehouse))
          .map(i => ({
            orderId: so.id,
            date: so.date,
            contactName: contacts.find(c => c.id === so.clientId)?.name || 'N/A',
            quantity: i.quantity,
          }))
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { inflows, outflows };
  }, [item, purchaseOrders, salesOrders, contacts]);
  
  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Historial de Movimientos: {item.product} - {item.caliber}</DialogTitle>
          <DialogDescription>
            Seguimiento de todas las entradas y salidas para este ítem en la bodega: {item.warehouse}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto p-1">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2 text-green-600">
                <ArrowUpCircle className="h-5 w-5" />
                Entradas (Compras)
            </h3>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>O/C</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Proveedor</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {history.inflows.length === 0 && <TableRow><TableCell colSpan={4} className="h-24 text-center">Sin entradas.</TableCell></TableRow>}
                        {history.inflows.map(inflow => (
                            <TableRow key={inflow.orderId}>
                                <TableCell>{inflow.orderId}</TableCell>
                                <TableCell>{format(parseISO(inflow.date), 'dd-MM-yy')}</TableCell>
                                <TableCell className="text-xs truncate">{inflow.contactName}</TableCell>
                                <TableCell className="text-right font-medium">{formatKilos(inflow.quantity)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2 text-red-600">
                <ArrowDownCircle className="h-5 w-5" />
                Salidas (Ventas)
            </h3>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>O/V</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {history.outflows.length === 0 && <TableRow><TableCell colSpan={4} className="h-24 text-center">Sin salidas.</TableCell></TableRow>}
                        {history.outflows.map(outflow => (
                            <TableRow key={outflow.orderId}>
                                <TableCell>{outflow.orderId}</TableCell>
                                <TableCell>{format(parseISO(outflow.date), 'dd-MM-yy')}</TableCell>
                                <TableCell className="text-xs truncate">{outflow.contactName}</TableCell>
                                <TableCell className="text-right font-medium">{formatKilos(outflow.quantity)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
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
