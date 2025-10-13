
"use client";

import React from 'react';
import { SalesOrder, Contact } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { contacts as initialContacts } from '@/lib/data';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
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

const formatPackages = (value: number) => new Intl.NumberFormat('es-CL').format(value);

export const SalesOrderPreviewContent = React.forwardRef<HTMLDivElement, PreviewContentProps>(({ order }, ref) => {
    const [contacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
    const { calibers } = useMasterData();
    const client = contacts.find(c => c.id === order.clientId);
    const carrier = contacts.find(c => c.id === order.carrierId);

    const getCaliberCode = (caliberName: string) => {
        const caliber = calibers.find(c => c.name === caliberName);
        return caliber ? caliber.code : 'N/A';
    }

    const totalPackages = order.items.reduce((sum, item) => sum + (item.packagingQuantity || 0), 0);
    const totalKilos = order.items.reduce((sum, item) => item.unit === 'Kilos' ? sum + item.quantity : sum, 0);

    return (
        <div ref={ref} className="p-10 bg-white text-black font-sans text-base">
            {/* Header */}
            <div className="flex justify-between items-start pb-6 mb-8 border-b-2 border-gray-900">
                <div className='text-left'>
                    <h2 className="text-2xl font-bold text-gray-800">Viña Negra SpA</h2>
                    <p className="text-xs text-gray-600">AGROCOMERCIAL</p>
                    <div className="mt-4 text-xs space-y-px text-gray-600">
                        <p>RUT: 78.261.683-8</p>
                        <p>Tulahuen S/N, Monte Patria, Chile</p>
                        <p>comercial@vinanegra.cl</p>
                    </div>
                </div>
                <div className='text-right'>
                    <h1 className="text-4xl font-bold text-gray-900 tracking-tight">ORDEN DE VENTA</h1>
                    <div className="mt-2 space-y-1 text-sm">
                        <p><span className="font-semibold text-gray-600">Nº de OV:</span> <span className="font-mono">{order.id}</span></p>
                        <p><span className="font-semibold text-gray-600">Fecha Emisión:</span> {format(parseISO(order.date), "dd-MM-yyyy", { locale: es })}</p>
                    </div>
                </div>
            </div>

            {/* Client & Shipping Info */}
            <div className="grid grid-cols-2 gap-8 mb-8 text-xs">
                 <div className='space-y-1 bg-gray-50 p-4 rounded-lg border'>
                    <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-2">CLIENTE</h3>
                    <div className="grid grid-cols-3 gap-x-4">
                        <span className="font-semibold text-gray-600 col-span-1">Nombre:</span>
                        <span className="col-span-2">{client?.name}</span>
                        <span className="font-semibold text-gray-600 col-span-1">RUT:</span>
                        <span className="col-span-2">{client?.rut}</span>
                         <span className="font-semibold text-gray-600 col-span-1">Dirección:</span>
                        <span className="col-span-2">{client?.address}, {client?.commune}</span>
                         <span className="font-semibold text-gray-600 col-span-1">Atención:</span>
                        <span className="col-span-2">{client?.contactPerson || 'N/A'}</span>
                    </div>
                </div>
                <div className='space-y-4'>
                    <div className='space-y-1 bg-gray-50 p-4 rounded-lg border'>
                        <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-2">TRANSPORTE</h3>
                        <div className="grid grid-cols-3 gap-x-4">
                            <span className="font-semibold text-gray-600 col-span-1">Transportista:</span>
                            <span className="col-span-2">{carrier?.name || 'N/A'}</span>
                            <span className="font-semibold text-gray-600 col-span-1">Chofer:</span>
                            <span className="col-span-2">{order.driverName || 'N/A'}</span>
                            <span className="font-semibold text-gray-600 col-span-1">Patente:</span>
                            <span className="col-span-2">{order.licensePlate || 'N/A'}</span>
                        </div>
                    </div>
                     <div className='space-y-1 bg-gray-50 p-4 rounded-lg border'>
                        <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-2">BODEGAS</h3>
                        <div className="grid grid-cols-3 gap-x-4">
                            <span className="font-semibold text-gray-600 col-span-1">Bodega Origen:</span>
                            <span className="col-span-2">{order.warehouse || 'N/A'}</span>
                            <span className="font-semibold text-gray-600 col-span-1">Bodega Destino:</span>
                            <span className="col-span-2">{order.destinationWarehouse || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>

             <div className="mb-8 text-xs">
                <div className='space-y-1 bg-gray-50 p-4 rounded-lg border'>
                    <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-2">CONDICIONES COMERCIALES</h3>
                     <div className="grid grid-cols-3 gap-x-4">
                        <span className="font-semibold text-gray-600 col-span-1">Tipo Venta:</span>
                        <span className="col-span-2">{order.saleType || 'N/A'}</span>
                        <span className="font-semibold text-gray-600 col-span-1">Modalidad Pago:</span>
                        <span className="col-span-2">{order.paymentMethod}</span>
                    </div>
                </div>
            </div>


            {/* Items Table */}
            <Table className="text-black text-base">
                <TableHeader>
                    <TableRow className="bg-gray-100 hover:bg-gray-100 border-b-2 border-gray-300">
                        <TableHead className="text-black font-bold">Lote / Código de Barras</TableHead>
                        <TableHead className="text-black font-bold">Descripción</TableHead>
                        <TableHead className="text-right text-black font-bold">Cant. Envases</TableHead>
                        <TableHead className="text-right text-black font-bold">Cant. (Kg)</TableHead>
                        <TableHead className="text-right text-black font-bold">Precio Unit.</TableHead>
                        <TableHead className="text-right text-black font-bold">SUB TOTAL</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {order.items.map((item, index) => (
                    <TableRow key={item.id || index} className="border-gray-200">
                        <TableCell className="font-medium align-middle">
                            {item.lotNumber && (
                                <div className="flex flex-col items-center justify-center py-1">
                                    <Barcode value={item.lotNumber} height={30} width={1.5} fontSize={10} margin={0} />
                                </div>
                            )}
                        </TableCell>
                        <TableCell className="align-middle text-sm+">{item.product} - {item.caliber} ({getCaliberCode(item.caliber)})</TableCell>
                        <TableCell className="text-right align-middle text-sm+">{formatPackages(item.packagingQuantity || 0)}</TableCell>
                        <TableCell className="text-right align-middle text-sm+">{item.quantity.toLocaleString('es-CL')} kg</TableCell>
                        <TableCell className="text-right align-middle text-sm+">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="text-right align-middle font-semibold text-sm+">{formatCurrency(item.quantity * item.price)}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
                <TableFooter>
                    <TableRow className="bg-gray-100 hover:bg-gray-100 border-t-2 border-gray-300">
                        <TableHead colSpan={2} className="text-right text-black font-bold text-base">TOTALES</TableHead>
                        <TableHead className="text-right text-black font-bold text-base">{formatPackages(totalPackages)}</TableHead>
                        <TableHead className="text-right text-black font-bold text-base">{totalKilos.toLocaleString('es-CL')} kg</TableHead>
                        <TableHead colSpan={1} />
                        <TableHead className="text-right text-black font-bold text-base">{formatCurrency(order.totalAmount)}</TableHead>
                    </TableRow>
                </TableFooter>
            </Table>
            
            <div className="text-center text-xs text-gray-500 pt-8 mt-8 border-t border-dashed">
                <p>Documento generado por Viña Negra Manager</p>
            </div>
        </div>
    );
});

SalesOrderPreviewContent.displayName = 'SalesOrderPreviewContent';

    