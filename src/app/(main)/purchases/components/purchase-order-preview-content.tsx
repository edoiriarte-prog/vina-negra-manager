
"use client";

import React, { useEffect } from 'react';
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

interface PreviewContentProps {
  order: PurchaseOrder;
  supplier: Contact | null;
  isPrinting: boolean;
  onPrintRequest: () => void;
}

export const PreviewContent = React.forwardRef<HTMLDivElement, PreviewContentProps>(({ order, supplier, isPrinting, onPrintRequest }, ref) => {

    useEffect(() => {
        if (isPrinting) {
            onPrintRequest();
        }
    }, [isPrinting, onPrintRequest]);
    
    return (
        <div ref={ref} className="p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-lg font-bold">VIÑA NEGRA SpA</h3>
                    <p className="text-sm text-muted-foreground">RUT: 78.261.683-8</p>
                    <p className="text-sm text-muted-foreground">TULAHUEN S/N</p>
                    <p className="text-sm text-muted-foreground">MONTE PATRIA, CHILE</p>
                </div>
                <div className='text-right'>
                    <h2 className="text-2xl font-bold font-headline mb-1">ORDEN DE COMPRA</h2>
                    <p className="text-muted-foreground font-mono">{order.id}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                <h3 className="font-semibold mb-2">Proveedor</h3>
                <div className="text-sm text-muted-foreground">
                    <p className="font-bold text-foreground">{supplier?.name}</p>
                    <p>RUT: {supplier?.rut}</p>
                    <p>{supplier?.address}</p>
                    <p>{supplier?.commune}</p>
                    <p>{supplier?.email}</p>
                </div>
                </div>
                <div className='text-right'>
                <h3 className="font-semibold mb-2">Detalles</h3>
                <div className="text-sm text-muted-foreground">
                    <p><strong>Fecha Emisión:</strong> {format(parseISO(order.date), "PPP", { locale: es })}</p>
                    <p><strong>Estado:</strong> <span className='capitalize'>{order.status}</span></p>
                </div>
                </div>
            </div>

            <Separator className="my-4" />

            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Calibre</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Precio Unitario</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {order.items.map((item) => (
                    <TableRow key={item.id}>
                    <TableCell>{item.product}</TableCell>
                    <TableCell>{item.caliber}</TableCell>
                    <TableCell className="text-right">{item.quantity.toLocaleString('es-CL')} {item.unit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.quantity * item.price)}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={4} className="text-right font-bold text-lg">Total</TableCell>
                        <TableCell className="text-right font-bold text-lg">{formatCurrency(order.totalAmount)}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>

            <Separator className="my-4" />
            
            <div className="mt-8 text-xs text-muted-foreground">
                <p><strong>Observaciones:</strong></p>
                <p>1. La presente orden de compra es válida por 30 días.</p>
                <p>2. En caso de discrepancia, favor contactar a nuestro departamento de compras.</p>
            </div>
        </div>
    );
});
PreviewContent.displayName = "PreviewContent";
