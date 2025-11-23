"use client";

import React from 'react';
import { PurchaseOrder, Contact } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useMasterData } from '@/hooks/use-master-data';
import { Separator } from '@/components/ui/separator';

interface PreviewContentProps {
    order: PurchaseOrder;
    supplier: Contact | null;
}

export const PreviewContent = React.forwardRef<HTMLDivElement, PreviewContentProps>(({ order, supplier }, ref) => {
    const { calibers } = useMasterData();

    const getCaliberCode = (caliberName: string) => {
        const caliber = calibers.find(c => c.name === caliberName);
        return caliber ? caliber.code : 'N/A';
    }

    // Formateadores
    const currency = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    });

    const numberFormat = new Intl.NumberFormat('es-CL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
    });

    // --- CÁLCULOS GENERALES ---
    const calculatedNetTotal = order.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
    const calculatedVat = calculatedNetTotal * 0.19;
    const calculatedGrossTotal = calculatedNetTotal + calculatedVat;

    const totalPackages = order.items.reduce((sum, item) => sum + (item.packagingQuantity || 0), 0);
    const totalKilos = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);

    // Determinamos la fecha de vencimiento a mostrar
    const displayDueDate = order.balanceDueDate || order.advanceDueDate;

    return (
        <div ref={ref} className="p-8 bg-white text-black font-sans max-w-[210mm] mx-auto min-h-[297mm] relative text-xs">
            
            {/* --- HEADER --- */}
            <div className="flex justify-between items-start mb-6 border-b-2 border-gray-800 pb-4">
                <div className="w-1/2">
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 uppercase">Viña Negra SpA</h1>
                    <p className="text-xs text-gray-600 font-semibold tracking-widest uppercase">Agrocomercial</p>
                </div>
                <div className='text-right w-1/2'>
                    <h2 className="text-3xl font-bold text-gray-900 mb-1">ORDEN DE COMPRA</h2>
                    <div className="inline-block bg-gray-100 border border-gray-300 px-3 py-1 rounded-md mb-1">
                        <p className="text-lg font-mono font-bold text-gray-800">{order.id}</p>
                    </div>
                    <p className="text-sm font-bold text-black">
                        Fecha: {order.date ? format(parseISO(order.date), "dd 'de' MMMM, yyyy", { locale: es }) : 'N/A'}
                    </p>
                </div>
            </div>

            {/* --- INFO EMPRESAS (De / Para) --- */}
            <div className="grid grid-cols-2 gap-6 mb-6">
                {/* DE: VIÑA NEGRA */}
                <div className="border rounded-lg p-4 bg-gray-50/50">
                    <h3 className="text-xs font-bold text-gray-500 uppercase border-b pb-1 mb-2">Datos de la Empresa</h3>
                    <p className='font-bold text-sm text-gray-800'>AGROCOMERCIAL VIÑA NEGRA SpA</p>
                    <div className="mt-1 space-y-0.5 text-gray-700">
                        <p><span className="font-semibold">RUT:</span> 78.261.683-8</p>
                        <p><span className="font-semibold">Dirección:</span> L. Gallardo 1346, Ovalle</p>
                        <p><span className="font-semibold">Región:</span> Coquimbo, Chile</p>
                        <p><span className="font-semibold">Email:</span> eduardoiriarte@agrocomercialavn.com</p>
                    </div>
                </div>

                {/* PARA: PROVEEDOR */}
                <div className="border rounded-lg p-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase border-b pb-1 mb-2">Datos del Proveedor</h3>
                    <p className="font-bold text-sm text-gray-800">{supplier?.name || 'Proveedor Desconocido'}</p>
                    <div className="mt-1 space-y-0.5 text-gray-700">
                        <p><span className="font-semibold">RUT:</span> {supplier?.rut || 'N/A'}</p>
                        <p><span className="font-semibold">Dirección:</span> {supplier?.address || ''} {supplier?.commune ? `, ${supplier.commune}` : ''}</p>
                        <p><span className="font-semibold">Contacto:</span> {supplier?.contactPerson || 'N/A'}</p>
                        <p><span className="font-semibold">Email:</span> {supplier?.email || 'N/A'}</p>
                    </div>
                </div>
            </div>

            {/* --- TABLA DE ITEMS --- */}
            <div className="mb-6">
                <Table className="text-xs border border-gray-200 table-fixed w-full">
                    <TableHeader className="bg-gray-100">
                        <TableRow className="border-b border-gray-300">
                            <TableHead className="text-gray-900 font-bold h-8 w-[6%]">CÓD.</TableHead>
                            <TableHead className="text-gray-900 font-bold h-8 w-[28%]">DESCRIPCIÓN</TableHead>
                            <TableHead className="text-center text-gray-900 font-bold h-8 w-[6%]">ENV.</TableHead>
                            <TableHead className="text-right text-gray-900 font-bold h-8 w-[8%]">KGS</TableHead>
                            {/* CAMBIO AQUÍ: Headers igualados en estilo */}
                            <TableHead className="text-right text-gray-900 font-bold h-8 w-[10%]">P. NETO</TableHead>
                            <TableHead className="text-right text-gray-900 font-bold h-8 w-[10%]">P. C/IVA</TableHead>
                            <TableHead className="text-right text-gray-900 font-bold h-8 w-[12%]">SUBT. NETO</TableHead>
                            <TableHead className="text-right text-gray-900 font-bold h-8 w-[14%]">TOTAL C/IVA</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {order.items.map((item, idx) => {
                            const netPrice = item.price || 0;
                            const grossPrice = netPrice * 1.19;
                            const subTotalNet = netPrice * (item.quantity || 0);
                            const totalLineGross = subTotalNet * 1.19;

                            return (
                                <TableRow key={item.id || idx} className="border-b border-gray-100 hover:bg-transparent">
                                    <TableCell className="font-medium text-gray-600 py-1.5">{getCaliberCode(item.caliber)}</TableCell>
                                    <TableCell className="text-gray-800 py-1.5">
                                        <span className="font-bold block">{item.product}</span>
                                        <span className="text-gray-500 block text-[10px]">Calibre: {item.caliber}</span>
                                        {item.packagingType && (
                                            <span className="text-gray-400 italic text-[10px]">{item.packagingType} ({item.packagingQuantity})</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center py-1.5">{item.packagingQuantity || 0}</TableCell>
                                    <TableCell className="text-right font-medium py-1.5">{numberFormat.format(item.quantity)}</TableCell>
                                    
                                    {/* CAMBIO AQUÍ: Celdas igualadas en estilo (text-gray-700, font-mono, sin texto pequeño) */}
                                    <TableCell className="text-right text-gray-700 py-1.5 font-mono">{currency.format(netPrice)}</TableCell>
                                    <TableCell className="text-right text-gray-700 py-1.5 font-mono">{currency.format(grossPrice)}</TableCell>
                                    
                                    <TableCell className="text-right font-semibold text-gray-800 py-1.5 font-mono">{currency.format(subTotalNet)}</TableCell>
                                    <TableCell className="text-right font-bold text-gray-900 py-1.5 font-mono bg-gray-50">{currency.format(totalLineGross)}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                    {/* Footer de la tabla */}
                    <tfoot className="bg-gray-50 font-bold text-gray-700">
                        <tr>
                            <TableCell colSpan={2} className="text-right py-1.5 uppercase text-[10px]">Totales:</TableCell>
                            <TableCell className="text-center py-1.5">{numberFormat.format(totalPackages)}</TableCell>
                            <TableCell className="text-right py-1.5">{numberFormat.format(totalKilos)}</TableCell>
                            <TableCell colSpan={4}></TableCell>
                        </tr>
                    </tfoot>
                </Table>
            </div>

            {/* --- TOTALES Y CONDICIONES --- */}
            <div className="flex justify-between items-start mt-2">
                
                {/* Condiciones Comerciales (Izquierda) */}
                <div className="w-3/5 pr-6">
                    <div className="border rounded-md p-3 bg-white">
                        <h4 className="font-bold text-xs text-gray-800 mb-2 border-b pb-1 uppercase">Condiciones Comerciales y Logísticas</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
                            <div>
                                <span className="font-semibold">Forma de Pago:</span> <span className="font-medium">{order.paymentMethod}</span>
                            </div>
                             <div>
                                <span className="font-semibold">Estado:</span> <span className="font-medium capitalize">{order.status === 'completed' ? 'Recepcionada' : 'Pendiente'}</span>
                            </div>
                            {displayDueDate && (
                                <div>
                                    <span className="font-semibold">Vencimiento:</span> <span className="font-medium">{format(parseISO(displayDueDate), "dd/MM/yyyy")}</span>
                                </div>
                            )}
                            <div>
                                <span className="font-semibold">Bodega Destino:</span> <span className="font-medium">{order.warehouse}</span>
                            </div>
                            {(order.creditDays || 0) > 0 && (
                                 <div>
                                    <span className="font-semibold">Días Crédito:</span> <span className="font-medium">{order.creditDays}</span>
                                </div>
                            )}
                        </div>

                        {order.notes && (
                            <div className="mt-3 pt-2 border-t">
                                <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Observaciones:</span>
                                <p className="text-xs text-gray-600 italic leading-tight bg-gray-50 p-1 rounded">
                                    {order.notes}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Totales (Derecha) */}
                <div className="w-2/5">
                    <div className="bg-gray-50 rounded-lg p-3 border">
                        <div className="flex justify-between py-1 text-xs text-gray-600">
                            <span>Subtotal Neto:</span>
                            <span className="font-medium font-mono">{currency.format(calculatedNetTotal)}</span>
                        </div>
                        <div className="flex justify-between py-1 text-xs text-gray-600 mb-2">
                            <span>IVA (19%):</span>
                            <span className="font-medium font-mono">{currency.format(calculatedVat)}</span>
                        </div>
                        <Separator className="bg-gray-300" />
                        <div className="flex justify-between py-2 text-base font-bold text-gray-900">
                            <span>TOTAL A PAGAR:</span>
                            <span className="font-mono">{currency.format(calculatedGrossTotal)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- FIRMAS --- */}
            <div className="absolute bottom-16 left-8 right-8 grid grid-cols-2 gap-20">
                <div className="text-center">
                    <div className="border-b border-black mb-1 h-12"></div>
                    <p className="font-bold text-[10px] uppercase">AGROCOMERCIAL VIÑA NEGRA SpA</p>
                    <p className="text-[9px] text-gray-500">Firma Autorizada</p>
                </div>
                <div className="text-center">
                    <div className="border-b border-black mb-1 h-12"></div>
                    <p className="font-bold text-[10px] uppercase">{supplier?.name || 'PROVEEDOR'}</p>
                    <p className="text-[9px] text-gray-500">Recepción Conforme</p>
                </div>
            </div>

            {/* --- FOOTER --- */}
            <div className="absolute bottom-4 left-0 right-0 text-center border-t pt-1">
                <p className="text-[9px] text-gray-400">Documento generado electrónicamente por Viña Negra Manager. No válido como factura.</p>
            </div>
        </div>
    );
});

PreviewContent.displayName = 'PreviewContent';