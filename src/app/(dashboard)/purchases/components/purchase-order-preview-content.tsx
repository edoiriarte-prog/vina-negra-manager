"use client";

import React from 'react';
import { Separator } from '@/components/ui/separator';
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
    TableFooter,
  } from '@/components/ui/table';
import { useMasterData } from '@/hooks/use-master-data';

interface PreviewContentProps {
  order: PurchaseOrder;
  supplier: Contact | null;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

export const PreviewContent = React.forwardRef<HTMLDivElement, PreviewContentProps>(({ order, supplier }, ref) => {
    const { calibers } = useMasterData();

    const getCaliberCode = (caliberName: string) => {
        const caliber = calibers.find(c => c.name === caliberName);
        return caliber ? caliber.code : 'N/A';
    }

    const subtotal = order.totalAmount;
    const iva = subtotal * 0.19; 
    const totalConIva = subtotal + iva;

    return (
        <div ref={ref} className="p-10 bg-white text-black font-sans max-w-[210mm] mx-auto min-h-[297mm] relative">
            
            {/* --- HEADER --- */}
            <div className="flex justify-between items-start mb-8 border-b-2 border-gray-800 pb-6">
                <div className="w-1/2">
                    <div className="flex flex-col justify-center h-full">
                         <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 uppercase">Viña Negra SpA</h1>
                         <p className="text-sm text-gray-600 font-semibold tracking-widest">AGROCOMERCIAL</p>
                    </div>
                </div>
                <div className='text-right w-1/2'>
                    <h2 className="text-4xl font-bold text-gray-900 mb-2">ORDEN DE COMPRA</h2>
                    <div className="inline-block bg-gray-100 border border-gray-300 px-4 py-2 rounded-md">
                        <p className="text-xl font-mono font-bold text-gray-800">{order.id}</p>
                    </div>
                    <p className="mt-2 text-sm font-medium text-gray-600">
                        Fecha Emisión: <span className="text-black">{order.date ? format(parseISO(order.date), "dd 'de' MMMM, yyyy", { locale: es }) : 'N/A'}</span>
                    </p>
                </div>
            </div>

            {/* --- INFO EMPRESAS --- */}
            <div className="grid grid-cols-2 gap-12 mb-10 text-sm">
                {/* EMISOR */}
                <div className="border p-5 rounded-lg bg-gray-50/50">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 border-b pb-1">De:</h3>
                    <p className='font-bold text-lg text-gray-800'>AGROCOMERCIAL VIÑA NEGRA SpA</p>
                    <div className="mt-2 space-y-1 text-gray-700">
                        <p><span className="font-semibold w-20 inline-block">RUT:</span> 78.261.683-8</p>
                        <p><span className="font-semibold w-20 inline-block">Dirección:</span> L. Gallardo 1346, Ovalle</p>
                        <p><span className="font-semibold w-20 inline-block">Región:</span> Coquimbo, Chile</p>
                        <p><span className="font-semibold w-20 inline-block">Email:</span> eduardoiriarte@agrocomercialavn.com</p>
                    </div>
                </div>

                {/* PROVEEDOR */}
                 <div className="border p-5 rounded-lg">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 border-b pb-1">Para Proveedor:</h3>
                    <p className="font-bold text-lg text-gray-800">{supplier?.name || 'Proveedor Desconocido'}</p>
                    <div className="mt-2 space-y-1 text-gray-700">
                        <p><span className="font-semibold w-20 inline-block">RUT:</span> {supplier?.rut || 'N/A'}</p>
                        <p><span className="font-semibold w-20 inline-block">Dirección:</span> {supplier?.address || ''} {supplier?.commune ? `, ${supplier.commune}` : ''}</p>
                        <p><span className="font-semibold w-20 inline-block">Contacto:</span> {supplier?.contactPerson || 'N/A'}</p>
                        <p><span className="font-semibold w-20 inline-block">Email:</span> {supplier?.email || 'N/A'}</p>
                    </div>
                </div>
            </div>

            {/* --- TABLA DE ITEMS --- */}
            <div className="mb-8">
                <Table className="text-sm border border-gray-200">
                    <TableHeader className="bg-gray-100">
                        <TableRow className="hover:bg-gray-100 border-b border-gray-300">
                            <TableHead className="text-gray-900 font-bold h-10 w-[80px]">CÓDIGO</TableHead>
                            <TableHead className="text-gray-900 font-bold h-10">DESCRIPCIÓN / PRODUCTO</TableHead>
                            <TableHead className="text-right text-gray-900 font-bold h-10 w-[100px]">CANTIDAD</TableHead>
                            <TableHead className="text-right text-gray-900 font-bold h-10 w-[80px]">UNIDAD</TableHead>
                            <TableHead className="text-right text-gray-900 font-bold h-10 w-[120px]">PRECIO UNIT.</TableHead>
                            <TableHead className="text-right text-gray-900 font-bold h-10 w-[120px]">TOTAL</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {order.items.map((item, idx) => (
                        <TableRow key={item.id || idx} className="border-b border-gray-100 hover:bg-transparent">
                            <TableCell className="font-medium text-gray-600">{getCaliberCode(item.caliber)}</TableCell>
                            <TableCell className="text-gray-800">
                                <span className="font-semibold">{item.product}</span>
                                {item.caliber && <span className="text-gray-500"> - Calibre {item.caliber}</span>}
                                {item.packagingType && <div className="text-xs text-gray-500 italic mt-0.5">Envase: {item.packagingType} ({item.packagingQuantity})</div>}
                            </TableCell>
                            <TableCell className="text-right font-medium">{item.quantity.toLocaleString('es-CL')}</TableCell>
                            <TableCell className="text-right text-gray-600">{item.unit}</TableCell>
                            <TableCell className="text-right text-gray-600">{formatCurrency(item.price)}</TableCell>
                            <TableCell className="text-right font-semibold text-gray-900">{formatCurrency(item.quantity * item.price)}</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </div>

            {/* --- TOTALES Y CONDICIONES --- */}
            <div className="flex justify-between items-start mt-4">
                
                {/* Condiciones Comerciales (Izquierda) */}
                <div className="w-1/2 pr-8">
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                        <h4 className="font-bold text-sm text-gray-800 mb-3 border-b border-gray-200 pb-1">CONDICIONES COMERCIALES</h4>
                        <div className="space-y-2 text-sm text-gray-700">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Forma de Pago:</span>
                                <span className="font-medium">{order.paymentMethod}</span>
                            </div>
                            {order.paymentDueDate && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Fecha Vencimiento:</span>
                                    <span className="font-medium">{format(parseISO(order.paymentDueDate), "dd/MM/yyyy")}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-500">Bodega Destino:</span>
                                <span className="font-medium">{order.warehouse}</span>
                            </div>
                        </div>
                        {order.description && (
                            <div className="mt-4 pt-2 border-t border-gray-200">
                                <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Notas / Observaciones:</span>
                                <p className="text-sm text-gray-700 italic bg-white p-2 rounded border border-gray-100">
                                    {order.description}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Totales (Derecha) */}
                <div className="w-5/12">
                    <div className="space-y-2">
                        <div className="flex justify-between py-1 text-sm text-gray-600">
                            <span>Subtotal Neto:</span>
                            <span className="font-medium">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between py-1 text-sm text-gray-600 border-b border-gray-300 pb-2">
                            <span>IVA (19%):</span>
                            <span className="font-medium">{formatCurrency(iva)}</span>
                        </div>
                        <div className="flex justify-between py-3 text-lg font-bold text-gray-900">
                            <span>TOTAL:</span>
                            <span>{formatCurrency(totalConIva)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- FIRMAS --- */}
            <div className="absolute bottom-20 left-10 right-10 grid grid-cols-2 gap-20">
                <div className="text-center">
                    <div className="border-b border-black mb-2 h-20"></div>
                    <p className="font-bold text-sm">AGROCOMERCIAL VIÑA NEGRA SpA</p>
                    <p className="text-xs text-gray-500">Firma Autorizada</p>
                </div>
                <div className="text-center">
                    <div className="border-b border-black mb-2 h-20"></div>
                    <p className="font-bold text-sm">{supplier?.name || 'PROVEEDOR'}</p>
                    <p className="text-xs text-gray-500">Recepción Conforme</p>
                </div>
            </div>

            {/* --- FOOTER --- */}
            <div className="absolute bottom-8 left-0 right-0 text-center">
                <p className="text-xs text-gray-400">Documento generado electrónicamente por Viña Negra Manager</p>
            </div>
        </div>
    );
});

PreviewContent.displayName = 'PreviewContent';