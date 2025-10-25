

"use client";

import React from 'react';
import { SalesOrder, Contact, OrderItem, PurchaseOrder } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { contacts as initialContacts, purchaseOrders as initialPurchaseOrders } from '@/lib/data';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { useMasterData } from '@/hooks/use-master-data';

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

type SummarizedItem = {
    product: string;
    caliber: string;
    caliberCode: string;
    totalPackages: number;
    totalKilos: number;
    avgNetPrice: number;
    avgGrossPrice: number;
    netSubtotal: number;
    grossSubtotal: number;
    relatedPurchaseIds?: string[];
    lotNumbers?: string[];
    destinationLotNumber?: string;
}


export const SalesOrderPreviewContent = React.forwardRef<HTMLDivElement, PreviewContentProps>(({ order }, ref) => {
    const [contacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
    const [purchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
    const { calibers, bankAccounts } = useMasterData();
    const client = contacts.find(c => c.id === order.clientId);
    const carrier = contacts.find(c => c.id === order.carrierId);
    const destinationAccount = bankAccounts.find(acc => acc.id === order.destinationAccountId);

    const getCaliberCode = (caliberName: string) => {
        const caliber = calibers.find(c => c.name === caliberName);
        return caliber ? caliber.code : 'N/A';
    }

    const totalPackages = order.items.reduce((sum, item) => sum + (item.packagingQuantity || 0), 0);
    const totalKilos = order.items.reduce((sum, item) => item.unit === 'Kilos' ? sum + item.quantity : 0, 0);

    const summarizedItems = React.useMemo(() => {
        const summary = new Map<string, { totalPackages: number, totalKilos: number, totalGrossValue: number, product: string, relatedPurchaseIds: Set<string>, lotNumbers: Set<string>, destinationLotNumber?: string }>();
        const transferPurchaseOrder = order.movementType === 'Traslado Bodega Interna' 
            ? purchaseOrders.find(po => po.description?.includes(order.id))
            : undefined;

        order.items.forEach(item => {
            const key = item.caliber;
            const existing = summary.get(key) || { totalPackages: 0, totalKilos: 0, totalGrossValue: 0, product: item.product, relatedPurchaseIds: new Set(), lotNumbers: new Set() };
            
            existing.totalPackages += item.packagingQuantity || 0;
            existing.totalKilos += item.unit === 'Kilos' ? item.quantity : 0;
            existing.totalGrossValue += item.quantity * item.price;
            existing.product = item.product;
            if(order.relatedPurchaseIds) {
                order.relatedPurchaseIds.forEach(id => existing.relatedPurchaseIds.add(id));
            }
            if(item.lotNumber) {
                existing.lotNumbers.add(item.lotNumber);
            }
            
            if (transferPurchaseOrder) {
                const transferItem = transferPurchaseOrder.items.find(tItem => tItem.caliber === item.caliber && tItem.product === item.product);
                if (transferItem?.lotNumber) {
                    existing.destinationLotNumber = transferItem.lotNumber;
                }
            }


            summary.set(key, existing);
        });

        const result: SummarizedItem[] = [];
        summary.forEach((value, key) => {
            const grossAvgPrice = value.totalKilos > 0 ? value.totalGrossValue / value.totalKilos : 0;
            const netAvgPrice = order.includeVat ? grossAvgPrice / 1.19 : grossAvgPrice;

            result.push({
                product: value.product,
                caliber: key,
                caliberCode: getCaliberCode(key),
                totalPackages: value.totalPackages,
                totalKilos: value.totalKilos,
                avgNetPrice: netAvgPrice,
                avgGrossPrice: grossAvgPrice,
                netSubtotal: netAvgPrice * value.totalKilos,
                grossSubtotal: grossAvgPrice * value.totalKilos,
                relatedPurchaseIds: Array.from(value.relatedPurchaseIds),
                lotNumbers: Array.from(value.lotNumbers),
                destinationLotNumber: value.destinationLotNumber
            });
        });
        
        return result.sort((a,b) => {
            const caliberAIndex = calibers.findIndex(c => c.name === a.caliber);
            const caliberBIndex = calibers.findIndex(c => c.name === b.caliber);
            return caliberAIndex - caliberBIndex;
        });

    }, [order, calibers, purchaseOrders]);

    const netTotal = React.useMemo(() => {
        return summarizedItems.reduce((sum, item) => sum + item.netSubtotal, 0);
    }, [summarizedItems]);

    const vatAmount = order.includeVat ? netTotal * 0.19 : 0;
    const grossTotal = netTotal + vatAmount;
    
    const docTitle = order.orderType === 'dispatch' ? 'ORDEN DE SALIDA' : 'ORDEN DE VENTA';


    return (
        <div ref={ref} className="p-10 bg-white text-black font-sans text-base">
            {/* Header */}
            <div className="flex justify-between items-start pb-6 mb-8 border-b-2 border-gray-900">
                <div className='text-left'>
                    <h2 className="text-4xl font-bold text-gray-800">AVN</h2>
                    <p className="text-lg text-gray-600">AGROCOMERCIAL</p>
                    <div className="mt-4 text-xs space-y-px text-gray-600">
                        <p>RUT: 78.261.683-8</p>
                        <p>MONTE PATRIA, LIMARI, CUARTA REGION</p>
                    </div>
                </div>
                <div className='text-right'>
                    <h1 className="text-4xl font-bold text-gray-900 tracking-tight">{docTitle}</h1>
                    <div className="mt-2 space-y-1 text-sm">
                        <p><span className="font-semibold text-gray-600">Nº de Documento:</span> <span className="font-mono">{order.id}</span></p>
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
                        
                        {order.paymentMethod === 'Crédito' && order.creditDays && (
                            <>
                                <span className="font-semibold text-gray-600 col-span-1">Plazo Crédito (días):</span>
                                <span className="col-span-2">{order.creditDays}</span>
                            </>
                        )}
                        {order.paymentMethod === 'Crédito' && order.balanceDueDate && (
                             <>
                                <span className="font-semibold text-gray-600 col-span-1">Fecha Vencimiento:</span>
                                <span className="col-span-2">{format(parseISO(order.balanceDueDate), "dd-MM-yyyy", { locale: es })}</span>
                            </>
                        )}
                         {order.notes && (
                            <>
                                <span className="font-semibold text-gray-600 col-span-1">Notas:</span>
                                <span className="col-span-2 whitespace-pre-wrap">{order.notes}</span>
                            </>
                         )}
                    </div>
                </div>
            </div>


            {/* Items Table */}
            <Table className="text-black text-base">
                <TableHeader>
                    <TableRow className="bg-gray-100 hover:bg-gray-100 border-b-2 border-gray-300">
                        <TableHead className="text-black font-bold">Descripción</TableHead>
                        <TableHead className="text-right text-black font-bold">Cant. Envases</TableHead>
                        <TableHead className="text-right text-black font-bold">Cant. (Kg)</TableHead>
                        <TableHead className="text-right text-black font-bold">P. Unitario Neto</TableHead>
                        <TableHead className="text-right text-black font-bold">P. Unitario Total</TableHead>
                        <TableHead className="text-right text-black font-bold">SUB TOTAL</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {summarizedItems.map((item, index) => (
                    <TableRow key={index} className="border-gray-200">
                        <TableCell className="align-middle text-sm+">
                            {item.product} - {item.caliber} ({item.caliberCode})
                            <span className="text-xs text-gray-500 block">
                                {item.lotNumbers && item.lotNumbers.length > 0 && (
                                    ` (Lote Origen: ${item.lotNumbers.map(ln => ln.split('-').pop()).join(', ')})`
                                )}
                                {item.destinationLotNumber && (
                                    ` (Lote Destino: ${item.destinationLotNumber.split('-').pop()})`
                                )}
                            </span>
                        </TableCell>
                        <TableCell className="text-right align-middle text-sm+">{formatPackages(item.totalPackages)}</TableCell>
                        <TableCell className="text-right align-middle text-sm+">{item.totalKilos.toLocaleString('es-CL')} kg</TableCell>
                        <TableCell className="text-right align-middle text-sm+">{formatCurrency(item.avgNetPrice)}</TableCell>
                        <TableCell className="text-right align-middle text-sm+">{formatCurrency(item.avgGrossPrice)}</TableCell>
                        <TableCell className="text-right align-middle font-semibold text-sm+">{formatCurrency(item.grossSubtotal)}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
                <TableFooter>
                    <TableRow className="bg-gray-100 hover:bg-gray-100 border-t-2 border-gray-300">
                        <TableHead className="text-right text-black font-bold text-base">TOTALES</TableHead>
                        <TableHead className="text-right text-black font-bold text-base">{formatPackages(totalPackages)}</TableHead>
                        <TableHead className="text-right text-black font-bold text-base">{totalKilos.toLocaleString('es-CL')} kg</TableHead>
                        <TableHead colSpan={3} className="text-right text-black font-bold text-base">
                             <div className="flex justify-end mt-4">
                                <div className="w-full max-w-sm space-y-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="font-normal text-gray-600">Subtotal Neto:</span>
                                        <span>{formatCurrency(netTotal)}</span>
                                    </div>
                                    {order.includeVat && (
                                        <div className="flex justify-between items-center">
                                            <span className="font-normal text-gray-600">IVA (19%):</span>
                                            <span>{formatCurrency(vatAmount)}</span>
                                        </div>
                                    )}
                                     <div className="flex justify-between items-center text-base pt-1 border-t border-gray-400">
                                        <span className="font-bold">TOTAL A PAGAR:</span>
                                        <span className="font-bold">{formatCurrency(grossTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        </TableHead>
                    </TableRow>
                </TableFooter>
            </Table>
            
            {destinationAccount && (
                 <div className="mt-8 pt-6 border-t-2 border-gray-900 text-xs">
                    <h3 className="text-sm font-bold text-gray-800 mb-2">DATOS DE TRANSFERENCIA</h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 bg-gray-50 p-4 rounded-lg border">
                        <span className="font-semibold text-gray-600">Nombre:</span>
                        <span>{destinationAccount.owner || 'N/A'}</span>
                        
                        <span className="font-semibold text-gray-600">RUT:</span>
                        <span>{destinationAccount.ownerRUT || 'N/A'}</span>

                        <span className="font-semibold text-gray-600">Banco:</span>
                        <span>{destinationAccount.bankName || 'N/A'}</span>
                        
                        <span className="font-semibold text-gray-600">Tipo Cuenta:</span>
                        <span>{destinationAccount.accountType || 'N/A'}</span>

                        <span className="font-semibold text-gray-600">Nº Cuenta:</span>
                        <span className="font-mono">{destinationAccount.accountNumber || 'N/A'}</span>

                        <span className="font-semibold text-gray-600">Email:</span>
                        <span>{destinationAccount.ownerEmail || 'N/A'}</span>
                    </div>
                </div>
            )}

            <div className="text-center text-xs text-gray-500 pt-8 mt-8 border-t border-dashed">
                <p>Documento generado por Viña Negra Manager</p>
            </div>
        </div>
    );
});

SalesOrderPreviewContent.displayName = 'SalesOrderPreviewContent';

    

    
