
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Contact, SalesOrder, FinancialMovement, PaymentInstallment } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  contacts as initialContacts,
  salesOrders as initialSalesOrders,
  financialMovements as initialFinancialMovements,
} from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { CalendarIcon } from 'lucide-react';


const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

type InstallmentStatus = 'Pendiente' | 'Pagada' | 'Vencida';

type ExtendedInstallment = {
    id: string;
    dueDate: string;
    clientName: string;
    salesOrderId: string;
    concept: string;
    amount: number;
    totalOrderAmount: number;
    status: InstallmentStatus;
};

export default function UpcomingPaymentsPage() {
  const [contacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
  const [salesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
  const [financialMovements] = useLocalStorage<FinancialMovement[]>('financialMovements', initialFinancialMovements);
  
  const [installments, setInstallments] = useState<ExtendedInstallment[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [clientFilter, setClientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<InstallmentStatus | 'Todos'>('Todos');


  useEffect(() => {
    setIsClient(true);
  }, []);


  useEffect(() => {
    if (isClient) {
        const allInstallments: ExtendedInstallment[] = [];
        const today = startOfDay(new Date());

        salesOrders.forEach(order => {
            const client = contacts.find(c => c.id === order.clientId);
            if (!client) return;

            const paymentsForOrder = financialMovements.filter(fm => fm.relatedOrder?.id === order.id && fm.type === 'income');
            const totalPaidForOrder = paymentsForOrder.reduce((sum, p) => sum + p.amount, 0);

            if (order.paymentMethod === 'Pago con Anticipo y Saldo' && order.advanceDueDate && order.balanceDueDate) {
                const advanceAmount = order.totalAmount * ((order.advancePercentage || 0) / 100);
                const balanceAmount = order.totalAmount - advanceAmount;

                // Advance Installment
                const advancePaid = Math.min(totalPaidForOrder, advanceAmount);
                const isAdvancePaid = advancePaid >= advanceAmount;
                let advanceStatus: InstallmentStatus = 'Pendiente';
                if (isAdvancePaid) {
                    advanceStatus = 'Pagada';
                } else if (parseISO(order.advanceDueDate) < today) {
                    advanceStatus = 'Vencida';
                }

                allInstallments.push({
                    id: `${order.id}-advance`,
                    dueDate: order.advanceDueDate,
                    clientName: client.name,
                    salesOrderId: order.id,
                    concept: `Anticipo ${order.advancePercentage}%`,
                    amount: advanceAmount,
                    totalOrderAmount: order.totalAmount,
                    status: advanceStatus,
                });

                // Balance Installment
                const paidAfterAdvance = totalPaidForOrder - advanceAmount;
                const isBalancePaid = paidAfterAdvance >= balanceAmount;
                 let balanceStatus: InstallmentStatus = 'Pendiente';
                if (isBalancePaid) {
                    balanceStatus = 'Pagada';
                } else if (parseISO(order.balanceDueDate) < today) {
                    balanceStatus = 'Vencida';
                }
                
                allInstallments.push({
                    id: `${order.id}-balance`,
                    dueDate: order.balanceDueDate,
                    clientName: client.name,
                    salesOrderId: order.id,
                    concept: `Saldo ${100 - (order.advancePercentage || 0)}%`,
                    amount: balanceAmount,
                    totalOrderAmount: order.totalAmount,
                    status: balanceStatus,
                });

            } else {
                // For 'Contado' or 'Crédito', create a single installment
                const dueDate = order.date; // Or another logic for credit due date if available
                const isPaid = totalPaidForOrder >= order.totalAmount;
                 let status: InstallmentStatus = 'Pendiente';
                if (isPaid) {
                    status = 'Pagada';
                } else if (parseISO(dueDate) < today) {
                    status = 'Vencida';
                }

                 allInstallments.push({
                    id: `${order.id}-full`,
                    dueDate: dueDate,
                    clientName: client.name,
                    salesOrderId: order.id,
                    concept: `Total ${order.paymentMethod}`,
                    amount: order.totalAmount,
                    totalOrderAmount: order.totalAmount,
                    status: status,
                });
            }
        });

        setInstallments(allInstallments.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
    }
  }, [contacts, salesOrders, financialMovements, isClient]);

  const filteredInstallments = useMemo(() => {
    return installments.filter(item => {
        const dueDate = parseISO(item.dueDate);
        
        const dateMatch = !dateRange?.from || !dateRange?.to || isWithinInterval(dueDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
        const clientMatch = !clientFilter || item.clientName.toLowerCase().includes(clientFilter.toLowerCase());
        const statusMatch = statusFilter === 'Todos' || item.status === statusFilter;

        return dateMatch && clientMatch && statusMatch;
    });
  }, [installments, dateRange, clientFilter, statusFilter]);

  const handlePrint = () => {
    window.print();
  }
  
  const renderReportRows = () => {
    if (!isClient) {
        return (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={`skeleton-${index}`} className="h-8 w-full my-2" />
                ))}
              </TableCell>
            </TableRow>
        );
    }
    
    return filteredInstallments.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{format(parseISO(item.dueDate), "dd-MM-yyyy", { locale: es })}</TableCell>
        <TableCell className="font-medium">{item.clientName}</TableCell>
        <TableCell>{item.salesOrderId}</TableCell>
        <TableCell>{item.concept}</TableCell>
        <TableCell className="text-right font-semibold">{formatCurrency(item.amount)}</TableCell>
        <TableCell className="text-right">{formatCurrency(item.totalOrderAmount)}</TableCell>
        <TableCell className="text-center">
          <Badge variant={ item.status === 'Pagada' ? 'default' : item.status === 'Pendiente' ? 'secondary' : 'destructive' }>{item.status}</Badge>
        </TableCell>
      </TableRow>
    ));
  };
  
  return (
    <div className="flex flex-col gap-6 print:gap-0">
       <style jsx global>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none; }
          .print-container { padding: 0; margin: 0; box-shadow: none; border: none; }
        }
      `}</style>
      
      <Card className="print-container">
        <CardHeader className='no-print'>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="font-headline text-2xl">Informe de Vencimientos por Cobrar</CardTitle>
                    <CardDescription>Visualiza todas las cuotas (anticipos y saldos) que están por vencer.</CardDescription>
                </div>
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <div className="no-print my-4 flex flex-wrap gap-4 items-center">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className="w-[280px] justify-start text-left font-normal"
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                        dateRange.to ? (
                            <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(dateRange.from, "LLL dd, y")
                        )
                        ) : (
                        <span>Seleccione rango de fechas</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>
                
                <Input 
                    placeholder="Filtrar por cliente..." 
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="max-w-sm"
                />

                <Select onValueChange={(value: 'Todos' | InstallmentStatus) => setStatusFilter(value)} value={statusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Estado de cuota" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Todos">Todos</SelectItem>
                        <SelectItem value="Pendiente">Pendiente</SelectItem>
                        <SelectItem value="Pagada">Pagada</SelectItem>
                        <SelectItem value="Vencida">Vencida</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha Venc.</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>O/V</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Monto a Pagar</TableHead>
                  <TableHead className="text-right">Monto Total O/V</TableHead>
                  <TableHead className="text-center w-[120px]">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderReportRows()}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
