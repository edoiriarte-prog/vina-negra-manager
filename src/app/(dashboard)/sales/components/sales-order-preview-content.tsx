
"use client";

import React from 'react';
import { SalesOrder, Contact, BankAccount } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMasterData } from '@/hooks/use-master-data';

interface PreviewContentProps {
    order: SalesOrder;
    client: Contact | null; 
}

export const SalesOrderPreviewContent = React.forwardRef<HTMLDivElement, PreviewContentProps>(({ order, client }, ref) => {
    const { calibers, bankAccounts } = useMasterData();

    const getCaliberCode = (caliberName: string) => {
        const caliber = calibers.find(c => c.name === caliberName);
        return caliber ? caliber.code : 'N/A';
    }
    
    const bankAccount = bankAccounts.find(b => b.id === (order as any).bankAccountId) as BankAccount | undefined;

    const currency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
    const numberFormat = (val: number) => new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(val || 0);
    
    const netAmount = order.totalAmount || 0;
    const vatAmount = order.includeVat !== false ? netAmount * 0.19 : 0;
    const grossAmount = netAmount + vatAmount;

    const totalPackages = order.items.reduce((sum, item) => sum + (item.packagingQuantity || 0), 0);
    const totalKilos = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        try {
            return format(parseISO(dateString), "dd 'de' MMMM, yyyy", { locale: es });
        } catch {
            return dateString;
        }
    }

    return (
        <div ref={ref} className="p-10 bg-white text-black font-sans shadow-lg max-w-[210mm] mx-auto print:shadow-none print:p-8 text-xs">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-8 border-b-2 border-gray-800 pb-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 uppercase tracking-tighter">Viña Negra SpA</h1>
                    <p className="text-xs text-gray-500">RUT: 78.261.683-8</p>
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
                    <p><span className="font-semibold">Giro:</span> {client?.businessLine || 'N/A'}</p>
                    <p><span className="font-semibold">Contacto:</span> {client?.contactPerson || 'N/A'}</p>
                </div>
                <div className="border rounded-md p-3 space-y-1 bg-gray-50/50">
                    <h4 className="font-bold text-gray-500 uppercase border-b pb-1 mb-2">Despacho</h4>
                    <p><span className="font-semibold">Bodega Origen:</span> <span className="font-medium text-gray-800">{order.warehouse || 'N/A'}</span></p>
                    <p><span className="font-semibold">Dirección Retiro:</span> Fundo Viña Negra</p>
                    <p><span className="font-semibold">Chofer:</span> {(order as any).driverName || '--'}</p>
                    <p><span className="font-semibold">Patente:</span> {(order as any).licensePlate || '--'}</p>
                </div>
                <div className="border rounded-md p-3 space-y-1 bg-gray-50/50">
                    <h4 className="font-bold text-gray-500 uppercase border-b pb-1 mb-2">Condiciones Comerciales</h4>
                    <p><span className="font-semibold">Operación:</span> {order.saleType || 'Venta en Firme'}</p>
                    <p><span className="font-semibold">Pago:</span> {(order as any).paymentMethod} {(order as any).creditDays ? `(${(order as any).creditDays} días)`: ''}</p>
                    <p><span className="font-semibold">Vencimiento:</span> {formatDate((order as any).paymentDueDate)}</p>
                    <p className="font-semibold pt-1 mt-1 border-t">Datos de Transferencia:</p>
                    <p><span className="font-semibold">Banco:</span> {bankAccount?.bankName || '-'}</p>
                    <p><span className="font-semibold">Cuenta:</span> {bankAccount?.accountNumber ? `${bankAccount.accountType} N° ${bankAccount.accountNumber}`: '-'}</p>
                </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-xs">
                 <thead className="bg-gray-100">
                    <tr className="border-b border-gray-300">
                        <th className="p-1.5 text-left font-bold w-[5%]">CÓD.</th>
                        <th className="p-1.5 text-left font-bold w-[25%]">DESCRIPCIÓN</th>
                        <th className="p-1.5 text-left font-bold w-[15%]">ENVASE</th>
                        <th className="p-1.5 text-right font-bold w-[10%]">KGS</th>
                        <th className="p-1.5 text-right font-bold w-[10%]">P. NETO</th>
                        <th className="p-1.5 text-right font-bold w-[10%]">P. C/IVA</th>
                        <th className="p-1.5 text-right font-bold w-[12%]">SUBT. NETO</th>
                        <th className="p-1.5 text-right font-bold w-[13%]">TOTAL C/IVA</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map((item, index) => {
                        const netPrice = item.price || 0;
                        const grossPrice = netPrice * 1.19;
                        const subTotalNet = netPrice * (item.quantity || 0);
                        const totalLineGross = subTotalNet * 1.19;

                        return (
                        <tr key={index} className="border-b border-gray-100">
                            <td className="p-1.5 align-top">{getCaliberCode(item.caliber)}</td>
                            <td className="p-1.5 align-top">
                                <p className="font-bold text-gray-800">{item.product}</p>
                                <p className="text-gray-500 text-[10px]">Calibre: {item.caliber}</p>
                            </td>
                            <td className="p-1.5 align-top">
                                <p>{item.packagingType || 'S/E'}</p>
                                <p className="text-gray-500 text-[10px]">({item.packagingQuantity} uds)</p>
                            </td>
                            <td className="p-1.5 align-top text-right font-medium">{numberFormat(item.quantity)}</td>
                            <td className="p-1.5 align-top text-right font-mono">{currency(netPrice)}</td>
                            <td className="p-1.5 align-top text-right font-mono">{currency(grossPrice)}</td>
                            <td className="p-1.5 align-top text-right font-mono font-semibold text-gray-800">{currency(subTotalNet)}</td>
                            <td className="p-1.5 align-top text-right font-mono font-bold text-black bg-gray-50">{currency(totalLineGross)}</td>
                        </tr>
                    )})}
                </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-between items-start mt-6">
                <div className="w-1/2">
                    <h5 className="font-bold text-gray-500 text-xs uppercase mb-1">Resumen Carga</h5>
                    <div className="text-xs text-gray-700">
                        <p>Total Envases: {numberFormat(totalPackages)}</p>
                        <p>Total Kilos: {numberFormat(totalKilos)}</p>
                    </div>
                </div>
                <div className="w-2/5 space-y-1">
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Subtotal Neto:</span>
                        <span className="font-medium font-mono">{currency(netAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-600">IVA (19%):</span>
                        <span className="font-medium font-mono">{currency(vatAmount)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold border-t-2 border-black mt-2 pt-2">
                        <span>TOTAL A PAGAR:</span>
                        <span className="font-mono">{currency(grossAmount)}</span>
                    </div>
                </div>
            </div>

            {/* Observaciones */}
            <div className="mt-8">
                 <h5 className="font-bold text-gray-500 text-xs uppercase mb-1">Observaciones</h5>
                <p className="text-xs italic text-gray-600 border p-2 rounded-md bg-gray-50 min-h-[50px]">
                    {order.notes || 'Sin observaciones.'}
                </p>
            </div>


            {/* Signatures */}
            <div className="mt-24 grid grid-cols-3 gap-12 text-center text-[10px]">
                <div className="border-t border-black pt-2">
                    <p className="font-bold">JEFE DE OPERACIONES</p>
                    <p className="text-gray-500">JOAQUIN BOU CORTES</p>
                </div>
                 <div className="border-t border-black pt-2">
                    <p className="font-bold">GERENCIA DE VENTAS</p>
                    <p className="text-gray-500">JOSE ROJAS CARMONA</p>
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
    );
});

SalesOrderPreviewContent.displayName = 'SalesOrderPreviewContent';
