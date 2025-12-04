"use client";

import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SalesOrder, Contact, BankAccount } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Printer, Download } from "lucide-react";
import { useMasterData } from "@/hooks/use-master-data";
import { useReactToPrint } from 'react-to-print';

interface SalesOrderPreviewProps {
  order: SalesOrder | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onExportRequest?: () => void;
}

const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

const formatKilos = (val: number) => 
    new Intl.NumberFormat('es-CL').format(val) + ' kg';

const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
        return format(parseISO(dateString), "dd 'de' MMMM, yyyy", { locale: es });
    } catch {
        return dateString;
    }
}

export function SalesOrderPreview({ order, isOpen, onOpenChange, onExportRequest }: SalesOrderPreviewProps) {
  const { contacts, bankAccounts } = useMasterData();
  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  if (!order) return null;

  const client = contacts.find(c => c.id === order.clientId);
  // @ts-ignore
  const bankAccount = bankAccounts.find(b => b.id === order.bankAccountId) as BankAccount | undefined;

  const netAmount = order.totalAmount || 0;
  const vatAmount = order.includeVat !== false ? netAmount * 0.19 : 0;
  const grossAmount = netAmount + vatAmount;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[890px] w-full p-0 flex flex-col h-[95vh] bg-slate-200">
        
        <DialogHeader className="p-4 bg-white border-b no-print">
          <DialogTitle>Orden de Venta: #{order.number || order.id}</DialogTitle>
          <DialogDescription>Vista previa del documento para impresión o descarga.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-slate-200 p-6" id="printable-content-wrapper">
          <div ref={printRef} className="p-10 bg-white text-black font-sans shadow-lg max-w-[210mm] mx-auto print:shadow-none print:p-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 border-b-2 border-gray-800 pb-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 uppercase tracking-tighter">Viña Negra SpA</h1>
                    <p className="text-xs text-gray-500">RUT: 76.123.456-7</p>
                    <p className="text-xs text-gray-500">Fundo Viña Negra, Tulahuén, Monte Patria</p>
                    <p className="text-xs text-gray-500">contacto@vinanegra.cl</p>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-bold text-gray-800">ORDEN DE VENTA</h2>
                    <div className="mt-1 inline-block bg-gray-100 border border-gray-300 px-4 py-1 rounded-md">
                        <p className="text-lg font-mono font-bold text-gray-800 tracking-wider">{order.number || order.id}</p>
                    </div>
                    <p className="text-sm mt-1">
                        <span className="font-semibold">Fecha Emisión:</span> {formatDate(order.date)}
                    </p>
                </div>
            </div>

            {/* Info Blocks */}
            <div className="grid grid-cols-3 gap-4 mb-6 text-xs">
                <div className="border rounded-md p-3 space-y-1 bg-gray-50/50">
                    <h4 className="font-bold text-gray-500 uppercase border-b pb-1 mb-2">Cliente</h4>
                    <p className="font-bold text-sm text-gray-800">{client?.name || 'N/A'}</p>
                    <p><span className="font-semibold">RUT:</span> {client?.rut || 'N/A'}</p>
                    <p><span className="font-semibold">Dirección:</span> {client?.address || 'N/A'}</p>
                    {/* @ts-ignore */}
                    <p><span className="font-semibold">Giro:</span> {client?.businessLine || 'N/A'}</p>
                    <p><span className="font-semibold">Contacto:</span> {client?.contactPerson || 'N/A'}</p>
                </div>
                <div className="border rounded-md p-3 space-y-1 bg-gray-50/50">
                    <h4 className="font-bold text-gray-500 uppercase border-b pb-1 mb-2">Despacho</h4>
                    <p><span className="font-semibold">Bodega Origen:</span> {order.warehouse || 'N/A'}</p>
                    <p><span className="font-semibold">Dirección Retiro:</span> Fundo Viña Negra</p>
                    {/* @ts-ignore */}
                    <p><span className="font-semibold">Chofer:</span> {order.driverName || '--'}</p>
                     {/* @ts-ignore */}
                    <p><span className="font-semibold">Patente:</span> {order.licensePlate || '--'}</p>
                </div>
                <div className="border rounded-md p-3 space-y-1 bg-gray-50/50">
                    <h4 className="font-bold text-gray-500 uppercase border-b pb-1 mb-2">Condiciones Comerciales</h4>
                    <p><span className="font-semibold">Operación:</span> {order.saleType || 'Venta en Firme'}</p>
                    {/* @ts-ignore */}
                    <p><span className="font-semibold">Pago:</span> {order.paymentMethod} {order.creditDays ? `(${order.creditDays} días)`: ''}</p>
                    {/* @ts-ignore */}
                    <p><span className="font-semibold">Vencimiento:</span> {formatDate(order.paymentDueDate)}</p>
                    <p className="font-semibold pt-1 mt-1 border-t">Datos de Transferencia:</p>
                    <p><span className="font-semibold">Banco:</span> {bankAccount?.bankName || '-'}</p>
                    <p><span className="font-semibold">Cuenta:</span> {bankAccount?.accountNumber ? `${bankAccount.accountType} N° ${bankAccount.accountNumber}`: '-'}</p>
                </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-xs">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="p-2 text-left font-semibold">Cód.</th>
                        <th className="p-2 text-left font-semibold">Producto</th>
                        <th className="p-2 text-left font-semibold">Calibre</th>
                        <th className="p-2 text-left font-semibold">Envase</th>
                        <th className="p-2 text-center font-semibold">Cant.</th>
                        <th className="p-2 text-right font-semibold">Kilos</th>
                        <th className="p-2 text-right font-semibold">Precio Unit.</th>
                        <th className="p-2 text-right font-semibold">Total Neto</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100">
                            <td className="p-2">{(index + 1) * 10}</td>
                            <td className="p-2 font-bold">{item.product}</td>
                            <td className="p-2">{item.caliber}</td>
                            {/* @ts-ignore */}
                            <td className="p-2">{item.packagingType || 'N/A'}</td>
                            <td className="p-2 text-center">{item.packagingQuantity || 0}</td>
                            <td className="p-2 text-right font-medium">{formatKilos(item.quantity)}</td>
                            <td className="p-2 text-right font-mono">{formatCurrency(item.price)}</td>
                            <td className="p-2 text-right font-bold font-mono">{formatCurrency(item.total || 0)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-between items-start mt-6">
                <div className="w-1/2">
                    <h5 className="font-bold text-gray-500 text-xs uppercase mb-1">Observaciones</h5>
                    <p className="text-xs italic text-gray-600 border p-2 rounded-md bg-gray-50 min-h-[50px]">
                        {order.notes || 'Sin observaciones.'}
                    </p>
                </div>
                <div className="w-2/5 space-y-1">
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Subtotal Neto:</span>
                        <span className="font-medium font-mono">{formatCurrency(netAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-600">IVA (19%):</span>
                        <span className="font-medium font-mono">{formatCurrency(vatAmount)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold border-t-2 border-black mt-2 pt-2">
                        <span>TOTAL A PAGAR:</span>
                        <span className="font-mono">{formatCurrency(grossAmount)}</span>
                    </div>
                </div>
            </div>

            {/* Signatures */}
            <div className="mt-24 grid grid-cols-3 gap-12 text-center text-[10px]">
                <div className="border-t border-black pt-2">
                    <p className="font-bold">AUTORIZADO POR</p>
                    <p className="text-gray-500">Viña Negra SpA</p>
                </div>
                 <div className="border-t border-black pt-2">
                    <p className="font-bold">TRANSPORTISTA</p>
                    <p className="text-gray-500">Nombre, RUT y Firma</p>
                </div>
                <div className="border-t border-black pt-2">
                    <p className="font-bold">RECIBÍ CONFORME</p>
                    <p className="text-gray-500">Cliente</p>
                </div>
            </div>
            
            <p className="text-center text-[9px] text-gray-400 mt-10">
                Documento interno de control y despacho. No válido como factura tributaria.
            </p>

          </div>
        </div>

        <DialogFooter className="p-4 bg-white border-t sm:justify-end no-print">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cerrar</Button>
            {onExportRequest && (
                <Button onClick={onExportRequest} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" /> Excel
                </Button>
            )}
            <Button onClick={handlePrint} variant="default" className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
