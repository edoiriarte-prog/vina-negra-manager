"use client";

import { useMemo, useRef, forwardRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InventoryItem, PurchaseOrder, SalesOrder, InventoryAdjustment, Contact } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Printer, Download, Package } from 'lucide-react';
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
  type: 'Entrada' | 'Salida' | 'Ajuste Aumento' | 'Ajuste Disminución' | 'Traslado (Entrada)' | 'Traslado (Salida)';
  contact: string;
  inflow: number;
  outflow: number;
  inflowPackages: number;
  outflowPackages: number;
};

const formatKilos = (value: number) => new Intl.NumberFormat('es-CL').format(value) + ' kg';
const formatPackages = (value: number) => new Intl.NumberFormat('es-CL').format(value);


// --- COMPONENTE IMPRIMIBLE ---
type PrintableContentProps = {
  history: (Transaction & { balance: number, balancePackages: number })[];
  item: InventoryItem;
}

const PrintableContent = forwardRef<HTMLDivElement, PrintableContentProps>(({ history, item }, ref) => {
    return (
        <div ref={ref} className="p-1 text-slate-900 dark:text-slate-100">
            {/* Encabezado solo visible al imprimir */}
            <div className="hidden print:block mb-4">
                <h1 className="text-xl font-bold">Kardex de Inventario</h1>
                {/* CORRECCIÓN: Usamos item.name en lugar de item.product */}
                <p>Producto: {item.name} | Calibre: {item.caliber}</p>
                <p>Bodega: {item.warehouse}</p>
                <p>Fecha Reporte: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
            </div>

            <div className="rounded-md border border-slate-800 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-900">
                        <TableRow className="border-slate-800 hover:bg-slate-900">
                            <TableHead className="text-slate-300 font-bold">Fecha</TableHead>
                            <TableHead className="text-slate-300 font-bold">Tipo</TableHead>
                            <TableHead className="text-slate-300 font-bold">Documento</TableHead>
                            <TableHead className="text-slate-300 font-bold">Origen / Destino</TableHead>
                            <TableHead className="text-right text-slate-300 font-bold">Entrada</TableHead>
                            <TableHead className="text-right text-slate-300 font-bold">Salida</TableHead>
                            <TableHead className="text-right text-white font-bold">Saldo</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {history.length === 0 && (
                            <TableRow><TableCell colSpan={7} className="h-24 text-center text-slate-500">Sin movimientos registrados.</TableCell></TableRow>
                        )}
                        {history.map((tx, index) => (
                            <TableRow key={index} className="border-slate-800 hover:bg-slate-900/50">
                                <TableCell className="font-medium text-slate-400">
                                    {format(parseISO(tx.date), 'dd-MM-yy')}
                                </TableCell>
                                <TableCell>
                                    <Badge 
                                        variant="outline"
                                        className={cn(
                                            "border-opacity-50 whitespace-nowrap",
                                            (tx.type === 'Entrada' || tx.type === 'Ajuste Aumento' || tx.type === 'Traslado (Entrada)') 
                                                ? 'text-emerald-400 border-emerald-500 bg-emerald-950/30' 
                                                : 'text-red-400 border-red-500 bg-red-950/30'
                                        )}
                                    >
                                        {tx.type.replace('Ajuste ', 'Aj. ')}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs font-mono text-slate-300">{tx.orderId}</TableCell>
                                <TableCell className="text-xs text-slate-400 max-w-[150px] truncate" title={tx.contact}>
                                    {tx.contact}
                                </TableCell>
                                <TableCell className="text-right text-emerald-400/70 font-mono text-xs">
                                    {tx.inflow > 0 ? `+${formatKilos(tx.inflow)}` : '-'}
                                </TableCell>
                                <TableCell className="text-right text-red-400/70 font-mono text-xs">
                                    {tx.outflow > 0 ? `-${formatKilos(tx.outflow)}` : '-'}
                                </TableCell>
                                <TableCell className="text-right font-bold text-white font-mono text-sm bg-slate-900/30">
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


// --- COMPONENTE PRINCIPAL ---
export function InventoryHistoryDialog({ 
    item, isOpen, onOpenChange, purchaseOrders, salesOrders, inventoryAdjustments, contacts 
}: InventoryHistoryDialogProps) {
  const { toast } = useToast();
  const componentRef = useRef<HTMLDivElement>(null);
  
  // Configuración de impresión
  const handlePrint = useReactToPrint({
    contentRef: componentRef, // CORRECCIÓN: Sintaxis nueva de react-to-print
    documentTitle: `Kardex_${item?.name}_${item?.caliber}`,
  });
  
  const transactionHistory = useMemo(() => {
    if (!item) return [];

    const allTransactions: Transaction[] = [];

    // 1. COMPRAS (Entradas)
    purchaseOrders
      .filter(po => (item.warehouse === 'All' || po.warehouse === item.warehouse) && (po.status === 'completed' || po.status === 'received'))
      .forEach(po => {
        po.items
          .filter(i => i.product === item.name && i.caliber === item.caliber) // CORRECCIÓN: item.name
          .forEach(i => {
            const supplier = contacts.find(c => c.id === po.supplierId);
            allTransactions.push({
              date: po.date,
              orderId: `OC-${po.number || po.id.substring(0,6)}`,
              type: 'Entrada',
              contact: supplier?.name || 'Proveedor Desconocido',
              inflow: i.quantity || 0,
              outflow: 0,
              inflowPackages: i.packagingQuantity || 0,
              outflowPackages: 0,
            });
          });
      });

    // 2. VENTAS (Salidas)
    salesOrders
      .filter(so => (so.status === 'completed' || so.status === 'dispatched' || so.status === 'invoiced'))
      .forEach(so => {
        // Caso especial: Traspaso Interno
        if (so.saleType === 'Traslado Bodega Interna') {
            // Si mi bodega actual es la de ORIGEN -> Es Salida
            if (item.warehouse === 'All' || so.warehouse === item.warehouse) {
                so.items.filter(i => i.product === item.name && i.caliber === item.caliber).forEach(i => {
                    allTransactions.push({
                        date: so.date,
                        orderId: `TRAS-${so.number || so.id.substring(0,6)}`,
                        type: 'Traslado (Salida)',
                        contact: `Hacia: ${so.destinationWarehouse}`,
                        inflow: 0,
                        outflow: i.quantity,
                        inflowPackages: 0,
                        outflowPackages: i.packagingQuantity || 0,
                    });
                });
            }
            // Si mi bodega actual es el DESTINO -> Es Entrada
            if (item.warehouse === 'All' || so.destinationWarehouse === item.warehouse) {
                 so.items.filter(i => i.product === item.name && i.caliber === item.caliber).forEach(i => {
                    allTransactions.push({
                        date: so.date,
                        orderId: `TRAS-${so.number || so.id.substring(0,6)}`,
                        type: 'Traslado (Entrada)',
                        contact: `Desde: ${so.warehouse}`,
                        inflow: i.quantity,
                        outflow: 0,
                        inflowPackages: i.packagingQuantity || 0,
                        outflowPackages: 0,
                    });
                });
            }
        } else {
            // Venta Normal (Salida)
            if (item.warehouse === 'All' || so.warehouse === item.warehouse) {
                 so.items.filter(i => i.product === item.name && i.caliber === item.caliber).forEach(i => {
                    const client = contacts.find(c => c.id === so.clientId);
                    allTransactions.push({
                        date: so.date,
                        orderId: `OV-${so.number || so.id.substring(0,6)}`,
                        type: 'Salida',
                        contact: client?.name || 'Cliente General',
                        inflow: 0,
                        outflow: i.quantity,
                        inflowPackages: 0,
                        outflowPackages: i.packagingQuantity || 0,
                    });
                });
            }
        }
      });
      
    // 3. AJUSTES (Ambos)
    inventoryAdjustments
      .filter(adj => (item.warehouse === 'All' || adj.warehouse === item.warehouse) && adj.product === item.name && adj.caliber === item.caliber)
      .forEach(adj => {
          const isInc = adj.type === 'increase';
          allTransactions.push({
            date: adj.date,
            orderId: 'AJUSTE',
            type: isInc ? 'Ajuste Aumento' : 'Ajuste Disminución',
            contact: adj.reason || 'Sin motivo',
            inflow: isInc ? adj.quantity : 0,
            outflow: !isInc ? adj.quantity : 0,
            inflowPackages: isInc ? (adj.packagingQuantity || 0) : 0,
            outflowPackages: !isInc ? (adj.packagingQuantity || 0) : 0,
          });
      });

    // Ordenar por fecha
    allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calcular saldo acumulado
    let runningBalance = 0;
    let runningBalancePackages = 0;
    return allTransactions.map(tx => {
        runningBalance += tx.inflow - tx.outflow;
        runningBalancePackages += tx.inflowPackages - tx.outflowPackages;
        return { ...tx, balance: runningBalance, balancePackages: runningBalancePackages };
    }).reverse(); // Mostrar lo más reciente arriba

  }, [item, purchaseOrders, salesOrders, inventoryAdjustments, contacts]);
  
  const handleExportHistory = () => {
    if (!item || transactionHistory.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'No hay historial para exportar.' });
      return;
    }
    const dataForSheet = transactionHistory.map(tx => ({
      'Fecha': format(parseISO(tx.date), 'dd-MM-yyyy'),
      'Tipo': tx.type,
      'Documento': tx.orderId,
      'Entidad': tx.contact,
      'Entradas (kg)': tx.inflow,
      'Salidas (kg)': tx.outflow,
      'Saldo (kg)': tx.balance,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Kardex`);
    // CORRECCIÓN: item.name
    XLSX.writeFile(workbook, `Kardex_${item.name}_${item.caliber}.xlsx`);
    toast({ title: 'Exportación Exitosa' });
  }

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl bg-slate-950 border-slate-800 text-slate-100 p-0 flex flex-col max-h-[85vh]">
        <DialogHeader className="px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-500/20 rounded text-purple-400">
                  <Package className="h-6 w-6" />
              </div>
              <div>
                  {/* CORRECCIÓN: item.name */}
                  <DialogTitle className="text-xl text-white">Kardex: {item.name} {item.caliber}</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Movimientos en bodega: <span className="text-white font-mono">{item.warehouse}</span>
                  </DialogDescription>
              </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
            <PrintableContent ref={componentRef} history={transactionHistory} item={item}/>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 gap-2">
          <Button type="button" variant="outline" onClick={handleExportHistory} className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button onClick={handlePrint} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <DialogClose asChild>
            <Button type="button" className="bg-blue-600 hover:bg-blue-500 text-white">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}