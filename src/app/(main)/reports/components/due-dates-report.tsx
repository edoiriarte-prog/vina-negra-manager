
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
import { CalendarIcon, DollarSign, Clock, Forward, FileText, Download, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type DueDatesReportProps = {
    salesOrders: SalesOrder[];
    financialMovements: FinancialMovement[];
    contacts: Contact[];
    onPrint: () => void;
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

export function DueDatesReport({ salesOrders, financialMovements, contacts, onPrint }: DueDatesReportProps) {
    const [isClient, setIsClient] = useState(false);
    const [filterDate, setFilterDate] = useState<Date | undefined>(new Date());
    const [selectedClientId, setSelectedClientId] = useState<string>('all');
    const { toast } = useToast();
    
    useEffect(() => {
        setIsClient(true);
    }, []);

    const clientOptions = useMemo(() => {
        return contacts.filter(c => c.type.includes('client'));
    }, [contacts]);
    
    const selectedClient = useMemo(() => {
        if (selectedClientId === 'all') return null;
        return contacts.find(c => c.id === selectedClientId);
    }, [selectedClientId, contacts]);

    const { pendingItems, paidItems, upcomingItems, totalPending, totalPaidInPeriod, totalUpcoming, totalBilled, totalPaid } = useMemo(() => {
        if (!isClient) return { pendingItems: [], paidItems: [], upcomingItems: [], totalPending: 0, totalPaidInPeriod: 0, totalUpcoming: 0, totalBilled: 0, totalPaid: 0 };
        
        const isAllClients = selectedClientId === 'all';
        const endDate = filterDate ? startOfDay(filterDate) : new Date(9999, 11, 31);
        
        const filteredSalesOrders = salesOrders.filter(o => {
            return isAllClients ? true : o.clientId === selectedClientId;
        });

        const allDueItems: DueDateItem[] = [];
        
        filteredSalesOrders.forEach(order => {
             if (order.status !== 'cancelled') {
                const clientName = contacts.find(c => c.id === order.clientId)?.name || 'Desconocido';
                
                if (order.paymentMethod === 'Pago con Anticipo y Saldo' && order.advancePercentage) {
                    if (order.advanceDueDate) {
                        const advanceAmount = order.totalAmount * (order.advancePercentage / 100);
                        allDueItems.push({
                            id: `${order.id}-advance`, clientId: order.clientId, clientName, orderId: order.id,
                            paymentType: 'Anticipo', dueDate: order.advanceDueDate, amount: advanceAmount,
                            paidAmount: 0, pendingAmount: advanceAmount, status: 'Pendiente',
                        });
                    }
                    if (order.balanceDueDate) {
                        const advanceAmount = order.totalAmount * (order.advancePercentage / 100);
                        const balanceAmount = order.totalAmount - advanceAmount;
                         allDueItems.push({
                            id: `${order.id}-balance`, clientId: order.clientId, clientName, orderId: order.id,
                            paymentType: 'Saldo', dueDate: order.balanceDueDate, amount: balanceAmount,
                            paidAmount: 0, pendingAmount: balanceAmount, status: 'Pendiente',
                        });
                    }
                } else if (order.paymentMethod === 'Crédito' || order.paymentMethod === 'Contado') {
                     const dueDate = order.balanceDueDate || order.date;
                     allDueItems.push({
                        id: `${order.id}-balance`, clientId: order.clientId, clientName, orderId: order.id,
                        paymentType: 'Saldo', dueDate: dueDate, amount: order.totalAmount,
                        paidAmount: 0, pendingAmount: order.totalAmount, status: 'Pendiente',
                    });
                }
             }
        });
        
        // Sort all dues chronologically
        const sortedDues = allDueItems.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        
        const clientMovements = financialMovements
            .filter(fm => fm.type === 'income' && (isAllClients ? true : fm.contactId === selectedClientId) && new Date(fm.date) <= endDate)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
        let paymentPool = clientMovements.reduce((sum, mov) => sum + mov.amount, 0);

        sortedDues.forEach(due => {
            if (paymentPool > 0) {
                const amountToApply = Math.min(paymentPool, due.pendingAmount);
                due.paidAmount += amountToApply;
                due.pendingAmount -= amountToApply;
                paymentPool -= amountToApply;
            }
        });
        
        const upcoming = sortedDues
            .filter(item => isAfter(parseISO(item.dueDate), endDate))
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        const pastAndPresentItems = sortedDues.filter(item => !isAfter(parseISO(item.dueDate), endDate));
        
        const totalBilled = filteredSalesOrders
            .filter(order => order.status !== 'cancelled' && new Date(order.date) <= endDate)
            .reduce((sum, order) => sum + order.totalAmount, 0);

        const totalUpcoming = upcoming.reduce((sum, item) => sum + item.pendingAmount, 0);

        pastAndPresentItems.forEach(due => {
            if (due.pendingAmount <= 1) { // Use a small epsilon for float comparison
                due.status = 'Pagado';
                due.pendingAmount = 0; // Ensure it's exactly zero
            } else if (due.paidAmount > 0) {
                due.status = 'Abonado';
            } else if (isAfter(startOfDay(new Date()), parseISO(due.dueDate)) && !isEqual(startOfDay(new Date()), parseISO(due.dueDate))) {
                due.status = 'Vencido';
            } else {
                due.status = 'Pendiente';
            }
        });

        const pending = pastAndPresentItems
            .filter(item => item.status === 'Pendiente' || item.status === 'Vencido' || item.status === 'Abonado')
            .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        
        const paid = pastAndPresentItems
            .filter(item => item.status === 'Pagado')
            .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
            
        const totalPending = pending.reduce((sum, item) => sum + item.pendingAmount, 0);
        
        const totalPaid = financialMovements
            .filter(fm => fm.type === 'income' && new Date(fm.date) <= endDate && (isAllClients || fm.contactId === selectedClientId))
            .reduce((sum, mov) => sum + mov.amount, 0);

        const totalPaidInPeriod = paid.reduce((sum, item) => sum + item.amount, 0);

        return { pendingItems: pending, paidItems: paid, upcomingItems: upcoming, totalPending, totalPaidInPeriod, totalUpcoming, totalBilled, totalPaid };

    }, [salesOrders, financialMovements, contacts, isClient, filterDate, selectedClientId]);


    const handleExport = () => {
        if (!pendingItems.length && !paidItems.length && !upcomingItems.length) {
            toast({
                variant: 'destructive',
                title: 'Error de Exportación',
                description: 'No hay datos para exportar.',
            });
            return;
        }

        const workbook = XLSX.utils.book_new();
        
        // Summary Sheet
        const summaryData = [
            ["Informe de Vencimientos"],
            ["Balance al:", filterDate ? format(filterDate, "PPP", { locale: es }) : "N/A"],
            ["Cliente:", selectedClient ? selectedClient.name : "Todos los clientes"],
            [], // Empty row
            ["Concepto", "Monto"],
            ["Total Facturado", totalBilled],
            ["Total Pagado", totalPaid],
            ["Pendiente / Vencido", totalPending],
            ["Total por Vencer", totalUpcoming]
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');


        const formatForSheet = (items: DueDateItem[]) => items.map(item => ({
            'Fecha Vencimiento': format(parseISO(item.dueDate), "dd-MM-yyyy"),
            'Cliente': item.clientName,
            'Orden (O/V)': item.orderId,
            'Tipo de Pago': item.paymentType,
            'Monto Cuota': item.amount,
            'Saldo Pendiente': item.pendingAmount,
            'Estado': item.status,
        }));
        
        if (pendingItems.length > 0) {
            const pendingSheet = XLSX.utils.json_to_sheet(formatForSheet(pendingItems));
            XLSX.utils.book_append_sheet(workbook, pendingSheet, 'Pendientes y Vencidos');
        }
        if (paidItems.length > 0) {
            const paidSheet = XLSX.utils.json_to_sheet(formatForSheet(paidItems));
            XLSX.utils.book_append_sheet(workbook, paidSheet, 'Pagados');
        }
        if (upcomingItems.length > 0) {
            const upcomingSheet = XLSX.utils.json_to_sheet(formatForSheet(upcomingItems));
            XLSX.utils.book_append_sheet(workbook, upcomingSheet, 'Próximos Vencimientos');
        }

        XLSX.writeFile(workbook, `Informe_Vencimientos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        toast({
            title: 'Exportación Exitosa',
            description: 'El informe de vencimientos ha sido exportado a Excel.',
        });
    };

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
                <TableCell className="text-right font-bold text-orange-500">{item.pendingAmount > 0 ? formatCurrency(item.pendingAmount) : '-'}</TableCell>
                <TableCell className="text-center">
                    <Badge variant={item.status === 'Pagado' ? 'default' : item.status === 'Vencido' ? 'destructive' : item.status === 'Abonado' ? 'secondary' : 'outline'}>
                        {item.status}
                    </Badge>
                </TableCell>
            </TableRow>
        ));
    }
    
    const renderTable = (items: DueDateItem[], total: number, caption: string, title: string) => (
         <div className="rounded-md border print-container">
            <h3 className="font-headline text-xl mb-2 p-4">{title}</h3>
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
            <CardHeader className="no-print">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="font-headline text-2xl">Informe de Vencimientos</CardTitle>
                        <CardDescription>Seguimiento de vencimientos de pago. Seleccione una fecha para ver el balance a ese día.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="mb-6 space-y-4 print:mb-8">
                     <div className="hidden print:block mb-8">
                        <div className="flex flex-row items-center justify-between">
                             <div>
                                <h3 className="text-lg font-bold">VIÑA NEGRA SpA</h3>
                                <p className="text-sm">RUT: 78.261.683-8</p>
                                <p className="text-sm">TULAHUEN S/N</p>
                                <p className="text-sm">MONTE PATRIA, CHILE</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-2xl font-bold font-headline mb-1">INFORME DE VENCIMIENTOS</h2>
                                <p className="text-sm">Balance al: {filterDate ? format(filterDate, "PPP", { locale: es }) : 'N/A'}</p>
                            </div>
                        </div>
                         {selectedClient && (
                            <div className="mt-6 border-t pt-4">
                                <h3 className="font-semibold mb-1">Cliente</h3>
                                <div className="text-sm">
                                    <p className="font-bold">{selectedClient.name}</p>
                                    <p>RUT: {selectedClient.rut}</p>
                                    <p>{selectedClient.address}, {selectedClient.commune}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-4">
                         <div className="flex flex-col md:flex-row gap-4 items-end no-print">
                            <div className="flex-1 min-w-48">
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
                            <div className="flex-1 min-w-48">
                                <Label>Cliente:</Label>
                                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos los clientes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los clientes</SelectItem>
                                        {clientOptions.map(client => (
                                            <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-2 no-print">
                                <Button onClick={handleExport} variant="outline">
                                    <Download className="mr-2 h-4 w-4" />
                                    Exportar a Excel
                                </Button>
                                <Button onClick={onPrint} variant="outline">
                                    <Printer className="mr-2 h-4 w-4" />
                                    Imprimir Informe
                                </Button>
                            </div>
                        </div>

                         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    {isClient ? <div className="text-2xl font-bold">{formatCurrency(totalBilled)}</div> : <Skeleton className="h-8 w-3/4" />}
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
                                    <p className="text-xs text-muted-foreground">a la fecha seleccionada</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Pendiente / Vencido</CardTitle>
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    {isClient ? <div className="text-2xl font-bold text-destructive">{formatCurrency(totalPending)}</div> : <Skeleton className="h-8 w-3/4" />}
                                    <p className="text-xs text-muted-foreground">a la fecha seleccionada</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total por Vencer</CardTitle>
                                    <Forward className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    {isClient ? <div className="text-2xl font-bold text-blue-500">{formatCurrency(totalUpcoming)}</div> : <Skeleton className="h-8 w-3/4" />}
                                    <p className="text-xs text-muted-foreground">después de la fecha</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
                
                <div className="space-y-8">
                    {renderTable(pendingItems, totalPending, 'Total Pendiente', 'Pendientes y Vencidos')}
                    {renderTable(paidItems, totalPaidInPeriod, 'Total Pagado', 'Pagados')}
                    {renderTable(upcomingItems, totalUpcoming, 'Total por Vencer', 'Próximos Vencimientos')}
                </div>

            </CardContent>
        </Card>
    )

    
}

    