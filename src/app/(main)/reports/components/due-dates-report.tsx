
"use client";

import { useState, useEffect, useMemo } from 'react';
import { SalesOrder, FinancialMovement, Contact } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

type DueDatesReportProps = {
    salesOrders: SalesOrder[];
    financialMovements: FinancialMovement[];
    contacts: Contact[];
}

type DueDateItem = {
    id: string;
    clientId: string;
    clientName: string;
    orderId: string;
    paymentType: 'Anticipo' | 'Saldo';
    dueDate: string;
    amount: number;
    status: 'Pagado' | 'Pendiente' | 'Vencido';
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

export function DueDatesReport({ salesOrders, financialMovements, contacts }: DueDatesReportProps) {
    const [reportData, setReportData] = useState<DueDateItem[]>([]);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (isClient) {
            const dueItems: DueDateItem[] = [];

            salesOrders.forEach(order => {
                if (order.paymentMethod === 'Pago con Anticipo y Saldo' && order.status !== 'cancelled') {
                    const client = contacts.find(c => c.id === order.clientId);
                    const clientName = client ? client.name : 'Desconocido';
                    
                    const paymentsForOrder = financialMovements.filter(
                        fm => fm.relatedOrder?.id === order.id && fm.type === 'income'
                    );
                    const totalPaid = paymentsForOrder.reduce((sum, p) => sum + p.amount, 0);

                    // Handle Advance Payment
                    if (order.advanceDueDate && order.advancePercentage) {
                        const advanceAmount = order.totalAmount * (order.advancePercentage / 100);
                        let advanceStatus: DueDateItem['status'] = 'Pendiente';
                        
                        if (totalPaid >= advanceAmount) {
                            advanceStatus = 'Pagado';
                        } else if (isAfter(new Date(), parseISO(order.advanceDueDate))) {
                            advanceStatus = 'Vencido';
                        }

                        dueItems.push({
                            id: `${order.id}-advance`,
                            clientId: order.clientId,
                            clientName,
                            orderId: order.id,
                            paymentType: 'Anticipo',
                            dueDate: order.advanceDueDate,
                            amount: advanceAmount,
                            status: advanceStatus,
                        });
                    }

                    // Handle Balance Payment
                    if (order.balanceDueDate) {
                        const advanceAmount = order.totalAmount * ((order.advancePercentage || 0) / 100);
                        const balanceAmount = order.totalAmount - advanceAmount;
                        let balanceStatus: DueDateItem['status'] = 'Pendiente';

                        if (totalPaid >= order.totalAmount) {
                            balanceStatus = 'Pagado';
                        } else if (isAfter(new Date(), parseISO(order.balanceDueDate))) {
                            balanceStatus = 'Vencido';
                        }

                        dueItems.push({
                            id: `${order.id}-balance`,
                            clientId: order.clientId,
                            clientName,
                            orderId: order.id,
                            paymentType: 'Saldo',
                            dueDate: order.balanceDueDate,
                            amount: balanceAmount,
                            status: balanceStatus,
                        });
                    }
                }
            });
            
            // Sort by due date
            dueItems.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

            setReportData(dueItems);
        }
    }, [salesOrders, financialMovements, contacts, isClient]);

    const totalPending = useMemo(() => {
        return reportData.filter(item => item.status === 'Pendiente' || item.status === 'Vencido').reduce((sum, item) => sum + item.amount, 0);
    }, [reportData]);

    const renderReportRows = () => {
        if (!isClient) {
            return Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-due-${index}`}>
                    <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
            ));
        }

        return reportData.map(item => (
            <TableRow key={item.id}>
                <TableCell>{format(parseISO(item.dueDate), "dd-MM-yyyy", { locale: es })}</TableCell>
                <TableCell className="font-medium">{item.clientName}</TableCell>
                <TableCell>{item.orderId}</TableCell>
                <TableCell>{item.paymentType}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                <TableCell className="text-center">
                    <Badge variant={item.status === 'Pagado' ? 'default' : item.status === 'Vencido' ? 'destructive' : 'secondary'}>
                        {item.status}
                    </Badge>
                </TableCell>
            </TableRow>
        ));
    }

    return (
        <Card className="print-container mt-6">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Informe de Vencimientos</CardTitle>
                <CardDescription>Seguimiento de los próximos vencimientos de pago de las órdenes de venta.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha Venc.</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Orden (O/V)</TableHead>
                                <TableHead>Tipo de Pago</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {renderReportRows()}
                        </TableBody>
                        {isClient && (
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={4} className="text-right font-bold text-lg">Total Pendiente</TableCell>
                                    <TableCell className="text-right font-bold text-lg">{formatCurrency(totalPending)}</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableFooter>
                        )}
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
