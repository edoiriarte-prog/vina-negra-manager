

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
import { ViñaNegraLogo } from '@/components/viña-negra-logo';


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
        <div ref={ref} className="p-8 bg-white text-black font-sans">
            {/* Header */}
            <div className="flex justify-between items-start pb-4 border-b-2 border-neutral-800">
                <div className="w-48">
                    <ViñaNegraLogo className="w-full h-auto" />
                </div>
                <div className='text-right'>
                    <h1 className="text-3xl font-bold text-neutral-900">ORDEN DE COMPRA</h1>
                    <div className="mt-2 space-y-1 text-sm">
                        <p><span className="font-bold">Nº de OC:</span> {order.id}</p>
                        <p><span className="font-bold">Fecha de Emisión:</span> {order.date ? format(parseISO(order.date), "dd-MM-yyyy", { locale: es }) : 'N/A'}</p>
                    </div>
                </div>
            </div>

            {/* Company & Supplier Info */}
            <div className="grid grid-cols-2 gap-8 my-8 text-sm">
                <div className='space-y-1'>
                    <h2 className="text-base font-bold text-neutral-800 border-b border-neutral-300 pb-1 mb-2">Datos de Viña Negra</h2>
                    <p className='font-bold'>Viña Negra SpA</p>
                    <p>RUT: 78.261.683-8</p>
                    <p>Tulahuen S/N, Monte Patria, Chile</p>
                    <p>compras@vinanegra.cl</p>
                </div>
                 <div className='space-y-1'>
                    <h2 className="text-base font-bold text-neutral-800 border-b border-neutral-300 pb-1 mb-2">PROVEEDOR</h2>
                    <p className="font-bold">{supplier?.name}</p>
                    <p>RUT: {supplier?.rut}</p>
                    <p>{supplier?.address}, {supplier?.commune}</p>
                    <p>Atención: {supplier?.contactPerson || 'N/A'}</p>
                </div>
            </div>

            {/* Items Table */}
            <Table className="text-black">
                <TableHeader>
                    <TableRow className="bg-neutral-100 hover:bg-neutral-100 border-b-2 border-neutral-300">
                        <TableHead className="text-black font-bold">CÓDIGO / SKU</TableHead>
                        <TableHead className="text-black font-bold">DESCRIPCIÓN</TableHead>
                        <TableHead className="text-right text-black font-bold">CANTIDAD</TableHead>
                        <TableHead className="text-right text-black font-bold">PRECIO UNIT.</TableHead>
                        <TableHead className="text-right text-black font-bold">TOTAL LÍNEA</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {order.items.map((item) => (
                    <TableRow key={item.id} className="border-neutral-200">
                        <TableCell className="font-medium">{getCaliberCode(item.caliber)}</TableCell>
                        <TableCell>{item.product} - {item.caliber}</TableCell>
                        <TableCell className="text-right">{item.quantity.toLocaleString('es-CL')} {item.unit}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.quantity * item.price)}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>

            {/* Totals Section */}
            <div className="flex justify-end mt-4">
                <div className="w-1/2 space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="font-bold">Subtotal:</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-bold">IVA (19%):</span>
                        <span>{formatCurrency(iva)}</span>
                    </div>
                     <Separator className="bg-neutral-300 my-2"/>
                     <div className="flex justify-between items-center text-base">
                        <span className="font-bold">TOTAL A PAGAR:</span>
                        <span className="font-bold">{formatCurrency(totalConIva)}</span>
                    </div>
                </div>
            </div>
            
            {/* Footer Info */}
            <div className="mt-12 pt-4 border-t border-neutral-300 text-xs text-neutral-600 space-y-2">
               <div>
                    <h3 className="font-bold text-neutral-800 mb-1">Notas o Instrucciones Especiales:</h3>
                    <p>N/A</p>
               </div>
                <div>
                    <h3 className="font-bold text-neutral-800 mb-1">Condiciones de Pago:</h3>
                    <p>Según acuerdo comercial.</p>
                </div>
            </div>

            <div className="text-center text-xs text-neutral-500 pt-8 mt-8 border-t border-dashed">
                <p>Viña Negra SpA | www.vinanegra.cl</p>
            </div>
        </div>
    );
});

PreviewContent.displayName = 'PreviewContent';
