"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { PurchaseOrder, SalesOrder, InventoryAdjustment, Contact } from "@/lib/types";

interface InventoryHistoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: any; // InventoryReportItem
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  inventoryAdjustments: InventoryAdjustment[];
  contacts: Contact[];
}

export function InventoryHistoryDialog({ 
  isOpen, 
  onOpenChange, 
  item, 
  purchaseOrders, 
  salesOrders, 
  inventoryAdjustments, 
  contacts 
}: InventoryHistoryDialogProps) {
  
  if (!item) return null;

  // Construir historial unificado
  const history: any[] = [];

  // 1. Entradas (Compras)
  purchaseOrders.forEach(po => {
    if (po.status === 'completed' || po.status === 'received') {
        const warehouse = po.destinationWarehouse || po.warehouse;
        // Filtrar por producto, calibre y bodega (si aplica)
        if (item.warehouse !== 'All' && item.warehouse !== warehouse) return;
        
        po.items.forEach(line => {
            if (line.product === item.product && line.caliber === item.caliber) {
                const supplier = contacts.find(c => c.id === po.supplierId)?.name || 'Desconocido';
                history.push({
                    date: po.date,
                    type: 'Compra',
                    doc: `OC-${po.number || po.id.substring(0,6)}`,
                    entity: supplier,
                    quantity: line.quantity,
                    isPositive: true
                });
            }
        });
    }
  });

  // 2. Salidas (Ventas)
  salesOrders.forEach(so => {
    if (so.status === 'completed' || so.status === 'dispatched' || so.status === 'invoiced') {
        // Si es traspaso interno
        if (so.saleType === 'Traslado Bodega Interna') {
            // Salida de origen
            if (item.warehouse === 'All' || item.warehouse === so.warehouse) {
                so.items.forEach(line => {
                    if (line.product === item.product && line.caliber === item.caliber) {
                        history.push({
                            date: so.date,
                            type: 'Traslado (Salida)',
                            doc: `OS-${so.number || so.id.substring(0,6)}`,
                            entity: 'Interno',
                            quantity: -line.quantity,
                            isPositive: false
                        });
                    }
                });
            }
            // Entrada a destino
            if (item.warehouse === 'All' || item.warehouse === so.destinationWarehouse) {
                 so.items.forEach(line => {
                    if (line.product === item.product && line.caliber === item.caliber) {
                        history.push({
                            date: so.date,
                            type: 'Traslado (Entrada)',
                            doc: `OS-${so.number || so.id.substring(0,6)}`,
                            entity: 'Interno',
                            quantity: line.quantity,
                            isPositive: true
                        });
                    }
                });
            }
        } else {
            // Venta normal
             if (item.warehouse === 'All' || item.warehouse === so.warehouse) {
                const client = contacts.find(c => c.id === so.clientId)?.name || 'Cliente';
                so.items.forEach(line => {
                    if (line.product === item.product && line.caliber === item.caliber) {
                        history.push({
                            date: so.date,
                            type: 'Venta',
                            doc: `OV-${so.number || so.id.substring(0,6)}`,
                            entity: client,
                            quantity: -line.quantity,
                            isPositive: false
                        });
                    }
                });
             }
        }
    }
  });

  // 3. Ajustes
  inventoryAdjustments.forEach(adj => {
     if (item.warehouse !== 'All' && item.warehouse !== adj.warehouse) return;
     if (adj.product === item.product && adj.caliber === item.caliber) {
         const isInc = adj.type === 'increase';
         history.push({
             date: adj.date,
             type: isInc ? 'Ajuste (+)' : 'Ajuste (-)',
             doc: 'Manual',
             entity: adj.reason || 'Sin motivo',
             quantity: isInc ? adj.quantity : -adj.quantity,
             isPositive: isInc
         });
     }
  });

  // Ordenar por fecha descendente
  history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle>Kardex: {item.product} {item.caliber}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Historial de movimientos {item.warehouse !== 'All' ? `en bodega ${item.warehouse}` : 'en todas las bodegas'}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto rounded-md border border-slate-800">
            <Table>
                <TableHeader className="bg-slate-900 sticky top-0">
                    <TableRow className="border-slate-800">
                        <TableHead className="text-slate-400">Fecha</TableHead>
                        <TableHead className="text-slate-400">Tipo</TableHead>
                        <TableHead className="text-slate-400">Documento</TableHead>
                        <TableHead className="text-slate-400">Entidad / Motivo</TableHead>
                        <TableHead className="text-right text-slate-400">Cantidad</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {history.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center text-slate-500 h-24">Sin movimientos recientes.</TableCell>
                        </TableRow>
                    ) : (
                        history.map((h, idx) => (
                            <TableRow key={idx} className="border-slate-800 hover:bg-slate-900/50">
                                <TableCell>{format(parseISO(h.date), 'dd/MM/yy')}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`border-opacity-50 ${h.isPositive ? 'text-emerald-400 border-emerald-500' : 'text-red-400 border-red-500'}`}>
                                        {h.type}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs font-mono text-slate-400">{h.doc}</TableCell>
                                <TableCell className="text-sm">{h.entity}</TableCell>
                                <TableCell className={`text-right font-bold ${h.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {h.isPositive ? '+' : ''}{new Intl.NumberFormat('es-CL').format(h.quantity)} kg
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}