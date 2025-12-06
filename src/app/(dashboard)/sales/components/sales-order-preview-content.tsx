"use client";

import React from 'react';
import { SalesOrder, Contact, BankAccount } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMasterData } from '@/hooks/use-master-data';
import { PDFDownloadButton } from '@/components/pdf/pdf-download-button'; 
import { Download } from 'lucide-react';

interface PreviewContentProps {
    order: SalesOrder;
    client: Contact | null; 
}

export const SalesOrderPreviewContent = React.forwardRef<HTMLDivElement, PreviewContentProps>(({ order, client }, ref) => {
    const { calibers, bankAccounts } = useMasterData();

    // 1. Helpers
    const getCaliberCode = (caliberName: string) => {
        const caliber = calibers.find(c => c.name === caliberName);
        return caliber ? caliber.code : 'N/A';
    }
    const currency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
    const numberFormat = (val: number) => new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(val || 0);
    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        try { return format(parseISO(dateString), "dd 'de' MMMM, yyyy", { locale: es }); } catch { return dateString; }
    }

    // 2. Banco y Cálculos
    const bankAccount = bankAccounts.find(b => b.id === (order as any).bankAccountId) 
                       || (order as any).bankAccount as BankAccount | undefined;

    const netAmount = order.totalAmount || 0;
    const vatAmount = order.includeVat !== false ? netAmount * 0.19 : 0;
    const grossAmount = netAmount + vatAmount;

    const fileName = `OV_${order.number || 'Borrador'}.pdf`;

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* BARRA SUPERIOR */}
            <div className="flex justify-between items-center p-4 bg-white border-b shadow-sm">
                <h2 className="text-lg font-bold text-gray-800">Vista Previa</h2>
                <PDFDownloadButton 
                    order={order} 
                    clientName={client?.name || 'Cliente'} 
                    clientRut={client?.rut || ''}
                    clientAddress={client?.address || ''}      
                    clientContact={client?.contactPerson || ''}
                    bankAccount={bankAccount}
                    type="VENTA" 
                    fileName={fileName} 
                />
            </div>

            {/* DOCUMENTO */}
            <div className="flex-1 overflow-y-auto p-8">
                <div ref={ref} className="bg-white text-black font-sans shadow-lg max-w-[210mm] mx-auto p-10 text-xs border border-gray-200">
                    
                    {/* CABECERA */}
                    <div className="flex justify-between items-start mb-8 border-b-2 border-gray-800 pb-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 uppercase tracking-tighter">VIÑA NEGRA SPA</h1>
                            <p className="text-xs text-gray-500 font-medium">RUT: 78.261.683-8</p>
                            <p className="text-xs text-gray-500">ventas@agrocomercialavn.com</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-bold text-gray-800">ORDEN DE VENTA</h2>
                            <div className="mt-1 inline-block bg-gray-100 border border-gray-300 px-4 py-1 rounded-md">
                                <p className="text-lg font-mono font-bold text-gray-800 tracking-wider">
                                    {order.number?.startsWith('OV-') ? order.number : `OV-${order.number || '---'}`}
                                </p>
                            </div>
                            <p className="text-sm mt-1"><span className="font-semibold">Fecha Emisión:</span> {formatDate(order.date)}</p>
                        </div>
                    </div>

                    {/* DATOS (3 COLUMNAS) */}
                    <div className="grid grid-cols-3 gap-4 mb-8 text-xs">
                        {/* Cliente */}
                        <div className="border rounded-sm p-3 space-y-1 bg-gray-50/50">
                            <h4 className="font-bold text-gray-600 uppercase border-b border-gray-200 pb-1 mb-2 text-[10px] tracking-wide">Datos del Cliente</h4>
                            <p className="font-bold text-sm text-gray-900 uppercase">{client?.name || 'Cliente Genérico'}</p>
                            <p><span className="font-semibold text-gray-600">RUT:</span> {client?.rut || 'S/I'}</p>
                            <p><span className="font-semibold text-gray-600">Dirección:</span> {client?.address || 'S/I'}</p>
                            <p><span className="font-semibold text-gray-600">Contacto:</span> {client?.contactPerson || '-'}</p>
                        </div>

                        {/* Despacho */}
                        <div className="border rounded-sm p-3 space-y-1 bg-gray-50/50">
                            <h4 className="font-bold text-gray-600 uppercase border-b border-gray-200 pb-1 mb-2 text-[10px] tracking-wide">Datos de Despacho</h4>
                            <p><span className="font-semibold text-gray-600">Bodega Origen:</span> <span className="font-medium text-gray-900">{order.warehouse || 'Bodega Central'}</span></p>
                            <p><span className="font-semibold text-gray-600">Transporte:</span> {(order as any).transport || 'Por definir'}</p>
                            <p><span className="font-semibold text-gray-600">Chofer:</span> {(order as any).driver || (order as any).driverName || '-'}</p>
                            <p><span className="font-semibold text-gray-600">Patente:</span> {(order as any).plate || (order as any).licensePlate || '-'}</p>
                        </div>

                        {/* Condiciones */}
                        <div className="border rounded-sm p-3 space-y-1 bg-gray-50/50">
                            <h4 className="font-bold text-gray-600 uppercase border-b border-gray-200 pb-1 mb-2 text-[10px] tracking-wide">Condiciones Comerciales</h4>
                            <p><span className="font-semibold text-gray-600">Operación:</span> {order.saleType || 'Venta en Firme'}</p>
                            <p><span className="font-semibold text-gray-600">Pago:</span> {(order as any).paymentMethod} {(order as any).creditDays ? `(${(order as any).creditDays} días)`: ''}</p>
                            <p><span className="font-semibold text-gray-600">Vencimiento:</span> {formatDate((order as any).paymentDueDate)}</p>
                            <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="font-bold text-gray-500 text-[10px] mb-1">DATOS DE TRANSFERENCIA:</p>
                                {bankAccount ? (
                                    <>
                                        <p><span className="font-semibold">Banco:</span> {bankAccount.bank || bankAccount.bankName}</p>
                                        <p><span className="font-semibold">Cta:</span> {(bankAccount as any).type || (bankAccount as any).accountType || 'Cta'} N° {bankAccount.accountNumber}</p>
                                    </>
                                ) : (
                                    <p className="italic text-gray-400">Sin datos bancarios</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* TABLA */}
                    <div className="mb-8">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-100 text-gray-700">
                                <tr className="border-b border-gray-300">
                                    <th className="py-2 px-2 text-left font-bold w-[5%]">CÓD.</th>
                                    <th className="py-2 px-2 text-left font-bold w-[30%]">DESCRIPCIÓN</th>
                                    <th className="py-2 px-2 text-center font-bold w-[10%]">ENV.</th>
                                    <th className="py-2 px-2 text-center font-bold w-[10%]">KGS</th>
                                    <th className="py-2 px-2 text-right font-bold w-[10%]">P. NETO</th>
                                    <th className="py-2 px-2 text-right font-bold w-[10%]">P. C/IVA</th>
                                    <th className="py-2 px-2 text-right font-bold w-[12%]">SUBT.</th>
                                    <th className="py-2 px-2 text-right font-bold w-[13%]">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {order.items.map((item, index) => {
                                    const price = item.price || 0; 
                                    const qty = item.quantity || 0;
                                    const lineNetoUnit = price; 
                                    const lineBrutoUnit = price * 1.19; 
                                    const lineSubtotalNeto = lineNetoUnit * qty;
                                    const lineTotalBruto = lineSubtotalNeto * 1.19;
                                    return (
                                    <tr key={index}>
                                        <td className="py-2 px-2 align-top text-gray-500">{(item as any).code || getCaliberCode(item.caliber) || (index+1)*10}</td>
                                        <td className="py-2 px-2 align-top">
                                            <p className="font-bold text-gray-900">{item.product}</p>
                                            <p className="text-gray-500 text-[10px]">Calibre: {item.caliber}</p>
                                        </td>
                                        <td className="py-2 px-2 align-top text-center text-gray-600">{item.packagingQuantity || '-'}</td>
                                        <td className="py-2 px-2 align-top text-center font-medium">{numberFormat(qty)}</td>
                                        <td className="py-2 px-2 align-top text-right font-mono text-gray-600">{currency(lineNetoUnit)}</td>
                                        <td className="py-2 px-2 align-top text-right font-mono text-gray-600">{currency(lineBrutoUnit)}</td>
                                        <td className="py-2 px-2 align-top text-right font-mono font-medium text-gray-800">{currency(lineSubtotalNeto)}</td>
                                        <td className="py-2 px-2 align-top text-right font-mono font-bold text-black">{currency(lineTotalBruto)}</td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>

                    {/* TOTALES */}
                    <div className="flex justify-between items-start mb-8 border-t border-gray-100 pt-4">
                        <div className="w-1/2 p-4 bg-gray-50 rounded border border-gray-100">
                            <h5 className="font-bold text-gray-500 text-[10px] uppercase mb-2 tracking-wider">Resumen Carga</h5>
                            <div className="text-xs text-gray-700 flex justify-between mb-1">
                                <span>Total Envases:</span>
                                <span className="font-bold">{numberFormat(order.items?.reduce((s,i)=>s+(i.packagingQuantity||0),0)||0)}</span>
                            </div>
                            <div className="text-xs text-gray-700 flex justify-between">
                                <span>Total Kilos:</span>
                                <span className="font-bold">{numberFormat(order.items?.reduce((s,i)=>s+(i.quantity||0),0)||0)}</span>
                            </div>
                        </div>
                        <div className="w-5/12">
                            <div className="flex justify-between text-xs py-1 border-b border-gray-100">
                                <span className="text-gray-600">Subtotal Neto:</span>
                                <span className="font-medium font-mono">{currency(netAmount)}</span>
                            </div>
                            <div className="flex justify-between text-xs py-1 mb-2">
                                <span className="text-gray-600">IVA (19%):</span>
                                <span className="font-medium font-mono">{currency(vatAmount)}</span>
                            </div>
                            <div className="flex justify-between items-center bg-gray-900 text-white p-3 rounded shadow-sm">
                                <span className="text-sm font-bold uppercase">Total a Pagar:</span>
                                <span className="text-lg font-bold font-mono">{currency(grossAmount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* OBSERVACIONES */}
                    <div className="mb-12">
                        <h5 className="font-bold text-gray-500 text-[10px] uppercase mb-1">Observaciones</h5>
                        <div className="text-xs italic text-gray-600 border border-gray-200 p-2 rounded bg-gray-50 min-h-[40px]">
                            {order.notes || 'Sin observaciones.'}
                        </div>
                    </div>

                    {/* FIRMAS ACTUALIZADAS */}
                    <div className="mt-16 grid grid-cols-3 gap-8 text-center text-[10px]">
                        
                        {/* VENTAS */}
                        <div className="flex flex-col items-center">
                            <div className="w-3/4 border-t border-black mb-2"></div>
                            <p className="font-bold text-gray-900 uppercase">GERENCIA VENTAS</p>
                            <p className="text-gray-500">JOSE ROJAS CARMONA</p>
                        </div>
                        
                        {/* OPERACIONES */}
                        <div className="flex flex-col items-center">
                            <div className="w-3/4 border-t border-black mb-2"></div>
                            <p className="font-bold text-gray-900 uppercase">OPERACIONES</p>
                            <p className="text-gray-500">JOAQUIN BOU CORTES</p>
                        </div>
                        
                        {/* CLIENTE */}
                        <div className="flex flex-col items-center">
                            <div className="w-3/4 border-t border-black mb-2"></div>
                            <p className="font-bold text-gray-900 uppercase">CLIENTE</p>
                            <p className="text-gray-500 uppercase">{client?.name || 'Recepción Conforme'}</p>
                        </div>

                    </div>

                    <p className="text-center text-[9px] text-gray-400 mt-12">
                        Documento interno de control. No válido como factura tributaria.
                    </p>
                </div>
            </div>
        </div>
    );
});

SalesOrderPreviewContent.displayName = 'SalesOrderPreviewContent';