"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PurchaseOrder, Contact } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { Printer, MapPin, Calendar, CreditCard, Building2, Package, FileText, Download } from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { OrderDocument } from "@/components/pdf/order-document";
import { useMasterData } from "@/hooks/use-master-data";
import { Badge } from "@/components/ui/badge";

interface PurchaseOrderPreviewProps {
  order: PurchaseOrder | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Contact | null; 
}

export function PurchaseOrderPreview({ order, isOpen, onOpenChange, supplier }: PurchaseOrderPreviewProps) {
  
  if (!order) return null;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

  const formatKilos = (val: number) => 
    new Intl.NumberFormat('es-CL').format(val) + ' kg';

  const calculateItemTotal = (item: any) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      return qty * price;
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'completed': return <Badge className="bg-emerald-500 hover:bg-emerald-600">RECEPCIONADA</Badge>;
          case 'received': return <Badge className="bg-blue-500 hover:bg-blue-600">EN TRÁNSITO</Badge>;
          case 'pending': return <Badge className="bg-yellow-500 hover:bg-yellow-600">PENDIENTE</Badge>;
          case 'cancelled': return <Badge variant="destructive">ANULADA</Badge>;
          default: return <Badge variant="outline">{status}</Badge>;
      }
  };

  const netAmount = order.totalAmount || 0;
  const vatAmount = order.includeVat !== false ? netAmount * 0.19 : 0;
  const grossAmount = netAmount + vatAmount;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] bg-slate-950 border border-slate-800 text-slate-100 p-0 overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="bg-slate-900 p-6 border-b border-slate-800 flex justify-between items-start">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                    <span className="font-bold text-white text-xl">AVN</span>
                </div>
                <div>
                    <DialogTitle className="text-xl font-bold text-white tracking-tight">ORDEN DE COMPRA</DialogTitle>
                    <DialogDescription className="text-slate-400 font-mono">
                        #{order.number || order.id}
                    </DialogDescription>
                </div>
            </div>
            <div className="flex flex-col items-end gap-2">
                {getStatusBadge(order.status)}
                <span className="text-xs text-slate-500">
                    Emitida el {format(parseISO(order.date), "dd 'de' MMMM, yyyy", { locale: es })}
                </span>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-2 gap-12 mb-8">
                
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Building2 className="h-3 w-3" /> Datos del Proveedor
                    </h4>
                    <div className="space-y-1">
                        <p className="text-lg font-bold text-white">{supplier?.name || 'Proveedor Desconocido'}</p>
                        <p className="text-sm text-slate-400">RUT: {supplier?.rut || 'S/I'}</p>
                        <p className="text-sm text-slate-400">{supplier?.address || 'Dirección no registrada'}</p>
                        <p className="text-sm text-slate-400">{supplier?.email}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <FileText className="h-3 w-3" /> Detalles de la Operación
                    </h4>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                        <div className="flex flex-col">
                            <span className="text-slate-500 text-xs flex items-center gap-1"><MapPin className="h-3 w-3"/> Bodega Destino</span>
                            <span className="text-slate-200 font-medium">{order.warehouse || 'Principal'}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-slate-500 text-xs flex items-center gap-1"><CreditCard className="h-3 w-3"/> Forma de Pago</span>
                            <span className="text-slate-200 font-medium">{order.paymentMethod || 'Contado'}</span>
                        </div>
                        {order.creditDays && order.creditDays > 0 && (
                            <div className="flex flex-col">
                                <span className="text-slate-500 text-xs flex items-center gap-1"><Calendar className="h-3 w-3"/> Crédito</span>
                                <span className="text-slate-200 font-medium">{order.creditDays} días</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Separator className="bg-slate-800 my-6" />

            <div className="rounded-lg border border-slate-800 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase font-bold">
                        <tr>
                            <th className="px-4 py-3 text-left">Producto</th>
                            <th className="px-4 py-3 text-left">Calibre</th>
                            <th className="px-4 py-3 text-right">Cantidad</th>
                            <th className="px-4 py-3 text-right">Precio Unit.</th>
                            <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {order.items.map((item, index) => {
                            const totalRow = calculateItemTotal(item);
                            return (
                                <tr key={index} className="group hover:bg-slate-900/30">
                                    <td className="px-4 py-3 font-medium text-slate-200">
                                        {item.product}
                                        {item.lotNumber && <span className="ml-2 text-xs text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">LOTE: {item.lotNumber}</span>}
                                    </td>
                                    <td className="px-4 py-3 text-slate-400">{item.caliber}</td>
                                    <td className="px-4 py-3 text-right text-emerald-400 font-mono">
                                        {formatKilos(item.quantity)}
                                        {item.packagingQuantity ? <span className="block text-xs text-slate-500">({item.packagingQuantity} envases)</span> : null}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-400 font-mono">{formatCurrency(item.price)}</td>
                                    <td className="px-4 py-3 text-right text-slate-200 font-bold font-mono">
                                        {formatCurrency(totalRow)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 flex justify-end">
                <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm text-slate-400">
                        <span>Subtotal Neto</span>
                        <span className="font-mono text-slate-200">{formatCurrency(netAmount)}</span>
                    </div>
                    {order.includeVat !== false && (
                        <div className="flex justify-between text-sm text-slate-400">
                            <span>IVA (19%)</span>
                            <span className="font-mono text-slate-200">{formatCurrency(vatAmount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                        <span className="text-base font-bold text-white uppercase">Total a Pagar</span>
                        <span className="text-xl font-bold text-blue-400 font-mono">{formatCurrency(grossAmount)}</span>
                    </div>
                </div>
            </div>

            {order.notes && (
                <div className="mt-8 bg-slate-900/50 border border-slate-800 p-4 rounded-lg">
                    <h5 className="text-xs font-bold text-slate-500 uppercase mb-1">Observaciones / Notas</h5>
                    <p className="text-sm text-slate-300 italic">{order.notes}</p>
                </div>
            )}
        </div>

        <DialogFooter className="bg-slate-900 border-t border-slate-800 p-4 sm:justify-between items-center">
          <div className="text-xs text-slate-500 hidden sm:block">
             Documento generado por Sistema AVN Manager
          </div>
          <div className="flex gap-2">
             <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white">Cerrar</Button>
             
             <PDFDownloadLink
                document={
                <OrderDocument
                    order={order}
                    clientName={supplier?.name || 'Proveedor'}
                    clientRut={supplier?.rut}
                    clientAddress={supplier?.address}
                    clientContact={supplier?.contactPerson}
                    bankAccount={null}
                    type="COMPRA"
                />
                }
                fileName={`OC_${order.number || order.id}.pdf`}
            >
                {({ loading }) => (
                <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" disabled={loading}>
                    <Download className="h-4 w-4 mr-2" />
                    {loading ? 'Generando...' : 'Descargar PDF'}
                </Button>
                )}
            </PDFDownloadLink>

            <Button onClick={() => window.print()} variant="outline" className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800">
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
