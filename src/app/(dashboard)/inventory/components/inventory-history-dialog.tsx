
"use client";

import { useMemo, useRef, forwardRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InventoryItem, PurchaseOrder, SalesOrder, InventoryAdjustment, Contact } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Printer, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type InventoryHistoryDialogProps = {
  item: InventoryItem | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  inventoryAdjustments: InventoryAdjustment[];
  contacts: Contact[];
};

type Transaction = {
  date: string;
  orderId: string;
  type: 'Entrada' | 'Salida' | 'Ajuste Aumento' | 'Ajuste Disminución';
  contact: string;
  inflow: number;
  outflow: number;
  inflowPackages: number;
  outflowPackages: number;
};

const formatKilos = (value: number) => new Intl.NumberFormat('es-CL').format(value) + ' kg';
const formatPackages = (value: number) => new Intl.NumberFormat('es-CL').format(value);


type PrintableContentProps = {
  history: (Transaction & { balance: number, balancePackages: number })[];
  item: InventoryItem;
}

const PrintableContent = forwardRef<HTMLDivElement, PrintableContentProps>(({ history, item }, ref) => {
    return (
        <div ref={ref} className="max-h-[60vh] overflow-y-auto p-1">
            <h3 className="text-lg font-semibold print:block hidden mb-2">Historial: {item.product} - {item.caliber}</h3>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Documento/Motivo</TableHead>
                            <TableHead>Contacto/Origen</TableHead>
                            <TableHead className="text-right">Mov. Envase</TableHead>
                            <TableHead className="text-right">Mov. Kilos</TableHead>
                            <TableHead className="text-right">Saldo Envase</TableHead>
                            <TableHead className="text-right">Saldo Kilos</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {history.length === 0 && <TableRow><TableCell colSpan={8} className="h-24 text-center">Sin transacciones.</TableCell></TableRow>}
                        {history.map((tx, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium">{format(parseISO(tx.date), 'dd-MM-yyyy', { locale: es })}</TableCell>
                                <TableCell>
                                    <Badge 
                                        variant={
                                            tx.type === 'Entrada' ? 'secondary' : 
                                            tx.type === 'Salida' ? 'destructive' :
                                            tx.type === 'Ajuste Aumento' ? 'default' : 'outline'
                                        }
                                    >
                                        {tx.type}
                                    </Badge>
                                </TableCell>
                                <TableCell>{tx.orderId}</TableCell>
                                <TableCell>{tx.contact}</TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                    {tx.inflowPackages > 0 ? `+${formatPackages(tx.inflowPackages)}` : tx.outflowPackages > 0 ? `-${formatPackages(tx.outflowPackages)}` : '-'}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                    {tx.inflow > 0 ? `+${formatKilos(tx.inflow)}` : tx.outflow > 0 ? `-${formatKilos(tx.outflow)}` : '-'}
                                </TableCell>
                                <TableCell className="text-right font-bold text-primary">
                                    {formatPackages(tx.balancePackages)}
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
    );
});
PrintableContent.displayName = 'PrintableContent';

export function InventoryHistoryDialog({ item, isOpen, onOpenChange, purchaseOrders, salesOrders, inventoryAdjustments, contacts }: InventoryHistoryDialogProps) {
  const { toast } = useToast();

  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });
  
  const transactionHistory = useMemo(() => {
    if (!item) return [];

    const allTransactions: Transaction[] = [];

    // Aggregate inflows from purchase orders
    purchaseOrders
      .filter(po => (item.warehouse === 'All' || po.warehouse === item.warehouse) && (po.status === 'completed' || po.status === 'received'))
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
              inflow: i.unit === 'Kilos' ? i.quantity : 0,
              outflow: 0,
              inflowPackages: i.packagingQuantity || 0,
              outflowPackages: 0,
            });
          });
      });

    // Aggregate outflows from sales orders
    salesOrders
      .filter(so => (item.warehouse === 'All' || so.warehouse === item.warehouse) && (so.status === 'completed' || so.status === 'pending' || so.status === 'dispatched' || so.status === 'invoiced'))
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
              inflow: 0,
              outflow: i.unit === 'Kilos' ? i.quantity : 0,
              inflowPackages: 0,
              outflowPackages: i.packagingQuantity || 0,
            });
          });
      });
      
    // Aggregate adjustments
    inventoryAdjustments
      .filter(adj => (item.warehouse === 'All' || adj.warehouse === item.warehouse) && adj.product === item.product && adj.caliber === item.caliber)
      .forEach(adj => {
          allTransactions.push({
              date: adj.date,
              orderId: adj.reason,
              type: adj.type === 'increase' ? 'Ajuste Aumento' : 'Ajuste Disminución',
              contact: 'Ajuste Interno',
              inflow: adj.type === 'increase' ? adj.quantity : 0,
              outflow: adj.type === 'decrease' ? adj.quantity : 0,
              inflowPackages: adj.type === 'increase' ? (adj.packagingQuantity || 0) : 0,
              outflowPackages: adj.type === 'decrease' ? (adj.packagingQuantity || 0) : 0,
          });
      });

    // Sort transactions: by date, then by type ('Entrada' and 'Ajuste Aumento' first)
    allTransactions.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      // Inflows first
      const aIsInflow = a.type === 'Entrada' || a.type === 'Ajuste Aumento';
      const bIsInflow = b.type === 'Entrada' || b.type === 'Ajuste Aumento';
      if (aIsInflow && !bIsInflow) return -1;
      if (!aIsInflow && bIsInflow) return 1;
      return 0;
    });

    let runningBalance = 0;
    let runningBalancePackages = 0;
    return allTransactions.map(tx => {
        runningBalance += tx.inflow - tx.outflow;
        runningBalancePackages += tx.inflowPackages - tx.outflowPackages;
        return { ...tx, balance: runningBalance, balancePackages: runningBalancePackages };
    });

  }, [item, purchaseOrders, salesOrders, inventoryAdjustments, contacts]);
  
  const handleExportHistory = () => {
    if (!item || transactionHistory.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'No hay historial para exportar.' });
      return;
    }
    const dataForSheet = transactionHistory.map(tx => ({
      'Fecha': format(parseISO(tx.date), 'dd-MM-yyyy'),
      'Tipo': tx.type,
      'Documento/Motivo': tx.orderId,
      'Contacto/Origen': tx.contact,
      'Entradas (kg)': tx.inflow,
      'Salidas (kg)': tx.outflow,
      'Saldo (kg)': tx.balance,
      'Entradas (envases)': tx.inflowPackages,
      'Salidas (envases)': tx.outflowPackages,
      'Saldo (envases)': tx.balancePackages,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Historial_${item.product}_${item.caliber}`);
    XLSX.writeFile(workbook, `Historial_Inventario_${item.product}_${item.caliber}.xlsx`);
    toast({ title: 'Exportación Exitosa', description: 'El historial del ítem ha sido exportado.' });
  }

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Seguimiento Histórico: {item.product} - {item.caliber}</DialogTitle>
          <DialogDescription>
            Historial de transacciones y balance de stock para este ítem en la bodega: {item.warehouse}.
          </DialogDescription>
        </DialogHeader>
        <PrintableContent ref={componentRef} history={transactionHistory} item={item}/>
        <DialogFooter className="no-print gap-2">
          <Button type="button" variant="outline" onClick={handleExportHistory}>
            <Download className="mr-2 h-4 w-4" />
            Exportar a Excel
          </Button>
          <Button onClick={handlePrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Historial
          </Button>
          <DialogClose asChild>
            <Button type="button">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
