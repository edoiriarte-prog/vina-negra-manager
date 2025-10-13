
"use client";

import React from 'react';
import { SalesOrder, Contact } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { contacts as initialContacts } from '@/lib/data';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { ViñaNegraLogo } from '@/components/viña-negra-logo';
import { useMasterData } from '@/hooks/use-master-data';
import Barcode from 'react-barcode';

interface PreviewContentProps {
  order: SalesOrder;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

export const SalesOrderPreviewContent = React.forwardRef<HTMLDivElement, PreviewContentProps>(({ order }, ref) => {
    const [contacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
    const { calibers } = useMasterData();
    const client = contacts.find(c => c.id === order.clientId);

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
                    <h1 className="text-3xl font-bold text-neutral-900">ORDEN DE VENTA</h1>
                    <div className="mt-2 space-y-1 text-sm">
                        <p><span className="font-bold">Nº de OV:</span> {order.id}</p>
                        <p><span className="font-bold">Fecha de Emisión:</span> {format(parseISO(order.date), "dd-MM-yyyy", { locale: es })}</p>
                    </div>
                </div>
            </div>

            {/* Company & Client Info */}
            <div className="grid grid-cols-2 gap-8 my-8 text-sm">
                <div className='space-y-1'>
                    <h2 className="text-base font-bold text-neutral-800 border-b border-neutral-300 pb-1 mb-2">Vendedor</h2>
                    <p className='font-bold'>Viña Negra SpA</p>
                    <p>RUT: 78.261.683-8</p>
                    <p>Tulahuen S/N, Monte Patria, Chile</p>
                    <p>comercial@vinanegra.cl</p>
                </div>
                 <div className='space-y-1'>
                    <h2 className="text-base font-bold text-neutral-800 border-b border-neutral-300 pb-1 mb-2">Cliente</h2>
                    <p className="font-bold">{client?.name}</p>
                    <p>RUT: {client?.rut}</p>
                    <p>{client?.address}, {client?.commune}</p>
                    <p>Atención: {client?.contactPerson || 'N/A'}</p>
                </div>
            </div>

            {/* Items Table */}
            <Table className="text-black">
                <TableHeader>
                    <TableRow className="bg-neutral-100 hover:bg-neutral-100 border-b-2 border-neutral-300">
                        <TableHead className="text-black font-bold">Lote / Barcode</TableHead>
                        <TableHead className="text-black font-bold">DESCRIPCIÓN</TableHead>
                        <TableHead className="text-right text-black font-bold">CANTIDAD</TableHead>
                        <TableHead className="text-right text-black font-bold">PRECIO UNIT.</TableHead>
                        <TableHead className="text-right text-black font-bold">TOTAL LÍNEA</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {order.items.map((item, index) => (
                    <TableRow key={item.id || index} className="border-neutral-200">
                        <TableCell className="font-medium">
                            {item.lotNumber && (
                                <div className="flex flex-col items-center">
                                    <Barcode value={item.lotNumber} height={30} width={1.5} fontSize={10} />
                                </div>
                            )}
                        </TableCell>
                        <TableCell>{item.product} - {item.caliber}</TableCell>
                        <TableCell className="text-right">{item.quantity.toLocaleString('es-CL')} {item.unit}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.quantity * item.price)}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>

            {/* Totals Section */}
            <div className="flex justify-between mt-4">
                 <div className="w-1/2 space-y-2 text-sm">
                    <h3 className="font-bold text-neutral-800 mb-1">Condiciones de Pago:</h3>
                    <p>{order.paymentMethod}</p>
                    {order.paymentMethod === 'Pago con Anticipo y Saldo' && (
                        <div className="text-xs">
                            <p>Anticipo ({order.advancePercentage}%): {formatCurrency(order.totalAmount * (order.advancePercentage || 0) / 100)} (Vence: {order.advanceDueDate ? format(parseISO(order.advanceDueDate), "dd-MM-yyyy") : 'N/A'})</p>
                            <p>Saldo: {formatCurrency(order.totalAmount - (order.totalAmount * (order.advancePercentage || 0) / 100))} (Vence: {order.balanceDueDate ? format(parseISO(order.balanceDueDate), "dd-MM-yyyy") : 'N/A'})</p>
                        </div>
                    )}
                 </div>
                <div className="w-1/2 max-w-sm space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="font-bold">Subtotal:</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-bold">IVA (19%):</span>
                        <span>{formatCurrency(iva)}</span>
                    </div>
                     <div className="flex justify-between items-center text-base pt-2 border-t mt-2">
                        <span className="font-bold">TOTAL A PAGAR:</span>
                        <span className="font-bold">{formatCurrency(totalConIva)}</span>
                    </div>
                </div>
            </div>
            
            <div className="text-center text-xs text-neutral-500 pt-8 mt-8 border-t border-dashed">
                <p>Viña Negra SpA | www.vinanegra.cl</p>
            </div>
        </div>
    );
});

SalesOrderPreviewContent.displayName = 'SalesOrderPreviewContent';

    