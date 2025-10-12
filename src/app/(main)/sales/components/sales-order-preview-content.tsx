
"use client";

import React from 'react';
import { SalesOrder, Contact } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ViñaNegraLogo } from '@/components/viña-negra-logo';
import { useMasterData } from '@/hooks/use-master-data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

interface PreviewContentProps {
  order: SalesOrder;
  client: Contact | null;
  carrier: Contact | null;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

export const PreviewContent = React.forwardRef<HTMLDivElement, PreviewContentProps>(({ order, client, carrier }, ref) => {
    const { calibers } = useMasterData();

    const getCaliberCode = (caliberName: string) => {
        const caliber = calibers.find(c => c.name === caliberName);
        return caliber ? caliber.code : 'N/A';
    }

    const subtotal = order.totalAmount;
    const iva = subtotal * 0.19;
    const totalConIva = subtotal + iva;

    const advanceAmount = order.paymentMethod === 'Pago con Anticipo y Saldo' && order.advancePercentage ? totalConIva * (order.advancePercentage / 100) : 0;
    const balanceAmount = order.paymentMethod === 'Pago con Anticipo y Saldo' ? totalConIva - advanceAmount : 0;


    return (
        <div ref={ref} className="p-8 bg-white text-black font-sans">
            {/* Header */}
            <div className="flex justify-between items-start pb-4 border-b-2 border-neutral-800">
                <div className="w-48">
                    <ViñaNegraLogo className="w-full h-auto" />
                </div>
                <div className='text-right'>
                    <h1 className="text-3xl font-bold text-neutral-900">ORDEN DE VENTA</h1>
                    <div className="mt-2 space-y-1 text-sm">
                        <p><span className="font-bold">Nº de OV:</span> {order.id}</p>
                        <p><span className="font-bold">Fecha de Emisión:</span> {format(parseISO(order.date), "dd-MM-yyyy", { locale: es })}</p>
                        <p><span className="font-bold">Condición de Pago:</span> {order.paymentMethod}</p>
                    </div>
                </div>
            </div>

            {/* Company & Client Info */}
            <div className="grid grid-cols-2 gap-8 my-8 text-sm">
                <div className='space-y-1'>
                    <h2 className="text-base font-bold text-neutral-800 border-b border-neutral-300 pb-1 mb-2">CLIENTE</h2>
                    <p className="font-bold">{client?.name}</p>
                    <p>RUT: {client?.rut}</p>
                    <p>{client?.address}, {client?.commune}</p>
                    <p>Atención: {client?.contactPerson || 'N/A'}</p>
                </div>
                 <div className='space-y-1'>
                    <h2 className="text-base font-bold text-neutral-800 border-b border-neutral-300 pb-1 mb-2">DATOS DE TRANSPORTE</h2>
                    <p><span className="font-bold">Transportista:</span> {carrier?.name || 'N/A'}</p>
                    <p><span className="font-bold">Conductor:</span> {order.driverName || 'N/A'}</p>
                    <p><span className="font-bold">Patente:</span> {order.licensePlate || 'N/A'}</p>
                    <p><span className="font-bold">Bodega Origen:</span> {order.warehouse || 'N/A'}</p>
                </div>
            </div>

            {/* Items Table */}
            <Table className="text-black">
                <TableHeader>
                    <TableRow className="bg-neutral-100 hover:bg-neutral-100 border-b-2 border-neutral-300">
                        <TableHead className="text-black font-bold">LOTE</TableHead>
                        <TableHead className="text-black font-bold">DESCRIPCIÓN</TableHead>
                        <TableHead className="text-black font-bold">ENVASE</TableHead>
                        <TableHead className="text-right text-black font-bold">CANT. ENVASES</TableHead>
                        <TableHead className="text-right text-black font-bold">KILOS</TableHead>
                        <TableHead className="text-right text-black font-bold">PRECIO UNIT.</TableHead>
                        <TableHead className="text-right text-black font-bold">TOTAL LÍNEA</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {order.items.map((item) => (
                    <TableRow key={item.id} className="border-neutral-200">
                        <TableCell className="font-medium">{item.lotNumber || 'N/A'}</TableCell>
                        <TableCell>{item.product} - {item.caliber}</TableCell>
                        <TableCell>{item.packagingType || 'N/A'}</TableCell>
                        <TableCell className="text-right">{item.packagingQuantity?.toLocaleString('es-CL') || '0'}</TableCell>
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
            
            {order.paymentMethod === 'Pago con Anticipo y Saldo' && (
                 <div className="mt-8 pt-4 border-t border-neutral-300 text-sm">
                    <h3 className="font-bold text-neutral-800 mb-2">Desglose de Pagos</h3>
                    <div className='flex justify-between'>
                       <p>Anticipo ({order.advancePercentage}%): <span className="font-bold">{formatCurrency(advanceAmount)}</span></p>
                       <p>Vencimiento: <span className="font-bold">{order.advanceDueDate ? format(parseISO(order.advanceDueDate), "dd-MM-yyyy") : 'N/A'}</span></p>
                    </div>
                     <div className='flex justify-between'>
                       <p>Saldo: <span className="font-bold">{formatCurrency(balanceAmount)}</span></p>
                       <p>Vencimiento: <span className="font-bold">{order.balanceDueDate ? format(parseISO(order.balanceDueDate), "dd-MM-yyyy") : 'N/A'}</span></p>
                    </div>
                </div>
            )}
            
            {/* Footer Info */}
            <div className="text-center text-xs text-neutral-500 pt-8 mt-8 border-t border-dashed">
                <p>Viña Negra SpA | www.vinanegra.cl</p>
            </div>
        </div>
    );
});

PreviewContent.displayName = 'PreviewContent';
