
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
    paidAmount: number;
    pendingAmount: number;
    status: 'Pagado' | 'Pendiente' | 'Vencido';
    isSubtotal?: false;
};

type SubtotalItem = {
    id: string;
    date: string;
    amount: number;
    isSubtotal: true;
}

type ReportRow = DueDateItem | SubtotalItem;


const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

export function DueDatesReport({ salesOrders, financialMovements, contacts }: DueDatesReportProps) {
    const [reportData, setReportData] = useState<ReportRow[]>([]);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (isClient) {
            const allDueItems: DueDateItem[] = [];

            // 1. Generate all due items from sales orders
            salesOrders.forEach(order => {
                if (order.paymentMethod === 'Pago con Anticipo y Saldo' && order.status !== 'cancelled') {
                    const client = contacts.find(c => c.id === order.clientId);
                    const clientName = client ? client.name : 'Desconocido';
                    
                    if (order.advanceDueDate && order.advancePercentage) {
                        const advanceAmount = order.totalAmount * (order.advancePercentage / 100);
                        allDueItems.push({
                            id: `${order.id}-advance`,
                            clientId: order.clientId,
                            clientName,
                            orderId: order.id,
                            paymentType: 'Anticipo',
                            dueDate: order.advanceDueDate,
                            amount: advanceAmount,
                            paidAmount: 0,
                            pendingAmount: advanceAmount,
                            status: 'Pendiente', // Initial status
                        });
                    }

                    if (order.balanceDueDate) {
                        const advanceAmount = order.totalAmount * ((order.advancePercentage || 0) / 100);
                        const balanceAmount = order.totalAmount - advanceAmount;
                         allDueItems.push({
                            id: `${order.id}-balance`,
                            clientId: order.clientId,
                            clientName,
                            orderId: order.id,
                            paymentType: 'Saldo',
                            dueDate: order.balanceDueDate,
                            amount: balanceAmount,
                            paidAmount: 0,
                            pendingAmount: balanceAmount,
                            status: 'Pendiente', // Initial status
                        });
                    }
                }
            });

            // Group due items and payments by client
            const clientData: Record<string, { dues: DueDateItem[], payments: FinancialMovement[] }> = {};

            allDueItems.forEach(due => {
                if (!clientData[due.clientId]) {
                    clientData[due.clientId] = { dues: [], payments: [] };
                }
                clientData[due.clientId].dues.push(due);
            });

            financialMovements.forEach(fm => {
                if (fm.type === 'income' && fm.contactId && clientData[fm.contactId]) {
                    clientData[fm.contactId].payments.push(fm);
                }
            });
            
            // 2. Settle payments for each client
            Object.values(clientData).forEach(({ dues, payments }) => {
                const sortedDues = dues.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
                const sortedPayments = payments.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(p => ({ ...p, remaining: p.amount }));
                
                sortedDues.forEach(due => {
                    sortedPayments.forEach(payment => {
                        if (payment.remaining > 0 && due.pendingAmount > 0) {
                            const amountToApply = Math.min(payment.remaining, due.pendingAmount);
                            due.paidAmount += amountToApply;
                            due.pendingAmount -= amountToApply;
                            payment.remaining -= amountToApply;
                        }
                    });
                });
            });

            // 3. Update status for all due items
            allDueItems.forEach(due => {
                if (due.pendingAmount <= 0.01) { // Use a small epsilon for float comparison
                    due.status = 'Pagado';
                    due.pendingAmount = 0;
                } else if (isAfter(new Date(), parseISO(due.dueDate))) {
                    due.status = 'Vencido';
                } else {
                    due.status = 'Pendiente';
                }
            });


            // 4. Group by date and add subtotals
            const finalReportRows: ReportRow[] = [];
            const itemsByDate: Record<string, DueDateItem[]> = {};
            
            const pendingAndOverdueItems = allDueItems.filter(item => item.status === 'Pendiente' || item.status === 'Vencido');

            pendingAndOverdueItems.forEach(item => {
                if (!itemsByDate[item.dueDate]) {
                    itemsByDate[item.dueDate] = [];
                }
                itemsByDate[item.dueDate].push(item);
            });
            
            Object.keys(itemsByDate).sort((a,b) => new Date(a).getTime() - new Date(b).getTime()).forEach(date => {
                const items = itemsByDate[date].sort((a,b) => a.clientName.localeCompare(b.clientName));
                finalReportRows.push(...items);
                
                if (items.length > 1) {
                    const subtotalAmount = items.reduce((sum, item) => sum + item.pendingAmount, 0);
                    finalReportRows.push({
                        id: `subtotal-${date}`,
                        date: date,
                        amount: subtotalAmount,
                        isSubtotal: true,
                    });
                }
            });

            setReportData(finalReportRows);
        }
    }, [salesOrders, financialMovements, contacts, isClient]);

    const totalPending = useMemo(() => {
        return reportData
            .filter((item): item is DueDateItem => !item.isSubtotal)
            .reduce((sum, item) => sum + item.pendingAmount, 0);
    }, [reportData]);

    const renderReportRows = () => {
        if (!isClient) {
            return Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-due-${index}`}>
                    <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
            ));
        }

        if (reportData.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">No hay vencimientos pendientes.</TableCell>
                </TableRow>
            )
        }

        return reportData.map(item => {
            if (item.isSubtotal) {
                return (
                    <TableRow key={item.id} className="bg-muted/50 font-semibold">
                        <TableCell colSpan={3} className="text-right">Saldo Vencimientos {format(parseISO(item.date), "dd-MM-yyyy", { locale: es })}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                        <TableCell colSpan={2}></TableCell>
                    </TableRow>
                )
            }

            return (
                <TableRow key={item.id}>
                    <TableCell>{format(parseISO(item.dueDate), "dd-MM-yyyy", { locale: es })}</TableCell>
                    <TableCell className="font-medium">{item.clientName}</TableCell>
                    <TableCell>{item.orderId}</TableCell>
                    <TableCell>{item.paymentType}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                    <TableCell className="text-right font-bold text-destructive">{formatCurrency(item.pendingAmount)}</TableCell>
                    <TableCell className="text-center">
                        <Badge variant={item.status === 'Pagado' ? 'default' : item.status === 'Vencido' ? 'destructive' : 'secondary'}>
                            {item.status}
                        </Badge>
                    </TableCell>
                </TableRow>
            )
        });
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
                                <TableHead className="text-right">Monto Cuota</TableHead>
                                <TableHead className="text-right">Saldo Pendiente</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {renderReportRows()}
                        </TableBody>
                        {isClient && (
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={5} className="text-right font-bold text-lg">Total Pendiente</TableCell>
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
