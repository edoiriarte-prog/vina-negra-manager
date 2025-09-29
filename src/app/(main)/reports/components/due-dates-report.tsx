
"use client";

import { useState, useEffect, useMemo } from 'react';
import { SalesOrder, FinancialMovement, Contact } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isAfter, startOfDay, isEqual } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, DollarSign, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

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
    status: 'Pagado' | 'Pendiente' | 'Vencido' | 'Abonado';
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

export function DueDatesReport({ salesOrders, financialMovements, contacts }: DueDatesReportProps) {
    const [isClient, setIsClient] = useState(false);
    const [filterDate, setFilterDate] = useState<Date | undefined>(new Date());
    const [activeTab, setActiveTab] = useState('pending');

    useEffect(() => {
        setIsClient(true);
    }, []);
    
    const { pendingItems, paidItems, totalPending, totalPaid } = useMemo(() => {
        if (!isClient) return { pendingItems: [], paidItems: [], totalPending: 0, totalPaid: 0 };
        
        const allDueItems: DueDateItem[] = [];
        const endDate = filterDate ? startOfDay(filterDate) : new Date(9999, 11, 31);

        salesOrders.forEach(order => {
             if (order.status !== 'cancelled') {
                const client = contacts.find(c => c.id === order.clientId);
                const clientName = client ? client.name : 'Desconocido';
                
                const dueDateForCreditOrContado = order.balanceDueDate || order.date;

                if (order.paymentMethod === 'Pago con Anticipo y Saldo' && order.advancePercentage) {
                    if (order.advanceDueDate && new Date(order.advanceDueDate) <= endDate) {
                        const advanceAmount = order.totalAmount * (order.advancePercentage / 100);
                        allDueItems.push({
                            id: `${order.id}-advance`, clientId: order.clientId, clientName, orderId: order.id,
                            paymentType: 'Anticipo', dueDate: order.advanceDueDate, amount: advanceAmount,
                            paidAmount: 0, pendingAmount: advanceAmount, status: 'Pendiente',
                        });
                    }
                    if (order.balanceDueDate && new Date(order.balanceDueDate) <= endDate) {
                        const advanceAmount = order.totalAmount * (order.advancePercentage / 100);
                        const balanceAmount = order.totalAmount - advanceAmount;
                        allDueItems.push({
                            id: `${order.id}-balance`, clientId: order.clientId, clientName, orderId: order.id,
                            paymentType: 'Saldo', dueDate: order.balanceDueDate, amount: balanceAmount,
                            paidAmount: 0, pendingAmount: balanceAmount, status: 'Pendiente',
                        });
                    }
                } else if (order.paymentMethod === 'Crédito' && new Date(dueDateForCreditOrContado) <= endDate) {
                     allDueItems.push({
                        id: `${order.id}-balance`, clientId: order.clientId, clientName, orderId: order.id,
                        paymentType: 'Saldo', dueDate: dueDateForCreditOrContado, amount: order.totalAmount,
                        paidAmount: 0, pendingAmount: order.totalAmount, status: 'Pendiente',
                    });
                } else if (order.paymentMethod === 'Contado' && new Date(dueDateForCreditOrContado) <= endDate) {
                    allDueItems.push({
                        id: `${order.id}-balance`, clientId: order.clientId, clientName, orderId: order.id,
                        paymentType: 'Saldo', dueDate: dueDateForCreditOrContado, amount: order.totalAmount,
                        paidAmount: 0, pendingAmount: order.totalAmount, status: 'Pendiente',
                    });
                }
             }
        });
        
        const relevantPayments = financialMovements
            .filter(fm => fm.type === 'income' && new Date(fm.date) <= endDate)
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const clientData: Record<string, { dues: DueDateItem[], payments: FinancialMovement[] }> = {};
        
        allDueItems.forEach(due => {
            if (!clientData[due.clientId]) clientData[due.clientId] = { dues: [], payments: [] };
            clientData[due.clientId].dues.push(due);
        });

        relevantPayments.forEach(fm => {
            if (fm.contactId && clientData[fm.contactId]) {
                 clientData[fm.contactId].payments.push(fm);
            }
        });


        Object.values(clientData).forEach(({ dues, payments }) => {
            const sortedDues = dues.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
            const paymentPool = payments.map(p => ({ ...p, remaining: p.amount }));

            sortedDues.forEach(due => {
                paymentPool.forEach(payment => {
                    if (payment.remaining > 0 && due.pendingAmount > 0) {
                        const amountToApply = Math.min(payment.remaining, due.pendingAmount);
                        due.paidAmount += amountToApply;
                        due.pendingAmount -= amountToApply;
                        payment.remaining -= amountToApply;
                    }
                });
            });
        });

        allDueItems.forEach(due => {
            if (due.pendingAmount <= 1) { // Use a small epsilon for float comparison
                due.status = 'Pagado';
                due.pendingAmount = 0;
            } else if (due.paidAmount > 0) {
                due.status = 'Abonado';
            } else if (isAfter(startOfDay(new Date()), parseISO(due.dueDate)) && !isEqual(startOfDay(new Date()), parseISO(due.dueDate))) {
                due.status = 'Vencido';
            } else {
                due.status = 'Pendiente';
            }
        });

        const pending = allDueItems
            .filter(item => item.status === 'Pendiente' || item.status === 'Vencido' || item.status === 'Abonado')
            .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        
        const paid = allDueItems
            .filter(item => item.status === 'Pagado')
            .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
            
        const totalPending = pending.reduce((sum, item) => sum + item.pendingAmount, 0);
        const totalPaid = allDueItems.reduce((sum, item) => sum + item.paidAmount, 0);

        return { pendingItems: pending, paidItems: paid, totalPending, totalPaid };

    }, [salesOrders, financialMovements, contacts, isClient, filterDate]);


    const renderReportRows = (data: DueDateItem[]) => {
        if (!isClient) {
            return Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-due-${index}`}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            ));
        }
        if (data.length === 0) {
            return ( <TableRow><TableCell colSpan={7} className="h-24 text-center">No hay datos que mostrar para esta selección.</TableCell></TableRow> )
        }
        return data.map(item => (
            <TableRow key={item.id}>
                <TableCell>{format(parseISO(item.dueDate), "dd-MM-yyyy", { locale: es })}</TableCell>
                <TableCell className="font-medium">{item.clientName}</TableCell>
                <TableCell>{item.orderId}</TableCell>
                <TableCell>{item.paymentType}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                <TableCell className="text-right font-bold text-destructive">{item.pendingAmount > 0 ? formatCurrency(item.pendingAmount) : '-'}</TableCell>
                <TableCell className="text-center">
                    <Badge variant={item.status === 'Pagado' ? 'default' : item.status === 'Vencido' ? 'destructive' : 'secondary'}>
                        {item.status}
                    </Badge>
                </TableCell>
            </TableRow>
        ));
    }
    
    const renderTable = (items: DueDateItem[], total: number, caption: string) => (
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
                    {renderReportRows(items)}
                </TableBody>
                {isClient && items.length > 0 && (
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={6} className="text-right font-bold text-lg">{caption}</TableCell>
                            <TableCell className="text-right font-bold text-lg">{formatCurrency(total)}</TableCell>
                        </TableRow>
                    </TableFooter>
                )}
            </Table>
        </div>
    )

    return (
        <Card className="print-container mt-6">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Informe de Vencimientos</CardTitle>
                <CardDescription>Seguimiento de vencimientos de pago. Seleccione una fecha para ver el balance a ese día.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="md:col-span-1">
                        <Label>Ver balance al:</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal", !filterDate && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filterDate ? format(filterDate, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={filterDate} onSelect={setFilterDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="md:col-span-2 grid grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Pendiente / Vencido</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {isClient ? <div className="text-2xl font-bold">{formatCurrency(totalPending)}</div> : <Skeleton className="h-8 w-3/4" />}
                                <p className="text-xs text-muted-foreground">a la fecha seleccionada</p>
                            </CardContent>
                        </Card>
                        <Card>
                             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {isClient ? <div className="text-2xl font-bold">{formatCurrency(totalPaid)}</div> : <Skeleton className="h-8 w-3/4" />}
                                <p className="text-xs text-muted-foreground">en cuotas hasta la fecha</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                
                 <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="pending">Pendientes y Vencidos</TabsTrigger>
                        <TabsTrigger value="paid">Pagados</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pending" className="mt-4">
                        {renderTable(pendingItems, totalPending, 'Total Pendiente')}
                    </TabsContent>
                    <TabsContent value="paid" className="mt-4">
                        {renderTable(paidItems, totalPaid, 'Total Pagado')}
                    </TabsContent>
                </Tabs>

            </CardContent>
        </Card>
    )

    
}
