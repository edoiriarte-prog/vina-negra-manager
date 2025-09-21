
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Contact, SalesOrder } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  contacts as initialContacts,
  salesOrders as initialSalesOrders,
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

type DispatchStatus = 'Pendiente' | 'Programado' | 'En Tránsito' | 'Entregado' | 'Incidencia';

export default function DispatchControlPage() {
  const [contacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
  const [salesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
  
  const [isClient, setIsClient] = useState(false);

  // Filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [clientFilter, setClientFilter] = useState('');
  const [carrierFilter, setCarrierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<DispatchStatus | 'Todos'>('Todos');

  useEffect(() => {
    setIsClient(true);
  }, []);

  const filteredDispatches = useMemo(() => {
    return salesOrders.filter(order => {
        const dispatchDate = order.scheduledDispatchDate ? parseISO(order.scheduledDispatchDate) : null;
        
        const dateMatch = !dateRange?.from || !dispatchDate || (dateRange.to && isWithinInterval(dispatchDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) }));
        
        const client = contacts.find(c => c.id === order.clientId);
        const clientMatch = !clientFilter || (client && client.name.toLowerCase().includes(clientFilter.toLowerCase()));

        const carrier = contacts.find(c => c.id === order.carrierId);
        const carrierMatch = !carrierFilter || (carrier && carrier.name.toLowerCase().includes(carrierFilter.toLowerCase()));

        const statusMatch = statusFilter === 'Todos' || order.dispatchStatus === statusFilter;

        return dateMatch && clientMatch && carrierMatch && statusMatch;
    }).sort((a,b) => {
        const dateA = a.scheduledDispatchDate ? new Date(a.scheduledDispatchDate).getTime() : 0;
        const dateB = b.scheduledDispatchDate ? new Date(b.scheduledDispatchDate).getTime() : 0;
        return dateB - dateA;
    });
  }, [salesOrders, contacts, dateRange, clientFilter, carrierFilter, statusFilter]);

  const handlePrint = () => {
    window.print();
  }
  
  const renderReportRows = () => {
    if (!isClient) {
        return (
            <TableRow>
              <TableCell colSpan={10} className="h-24 text-center">
                {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={`skeleton-${index}`} className="h-8 w-full my-2" />
                ))}
              </TableCell>
            </TableRow>
        );
    }
    
    return filteredDispatches.map((order) => {
        const client = contacts.find(c => c.id === order.clientId);
        const carrier = contacts.find(c => c.id === order.carrierId);
        return (
            <TableRow key={order.id}>
                <TableCell>{order.scheduledDispatchDate ? format(parseISO(order.scheduledDispatchDate), "dd-MM-yyyy", { locale: es }) : '-'}</TableCell>
                <TableCell>{order.id}</TableCell>
                <TableCell>{client?.name}</TableCell>
                <TableCell>{order.dispatchGuideNumber}</TableCell>
                <TableCell>{carrier?.name}</TableCell>
                <TableCell>{order.driverName}</TableCell>
                <TableCell>{order.truckLicensePlate}</TableCell>
                <TableCell className="text-right">{order.freightCost ? formatCurrency(order.freightCost) : '-'}</TableCell>
                 <TableCell className="text-center">
                    <Badge variant={ order.dispatchStatus === 'Entregado' ? 'default' : order.dispatchStatus === 'Incidencia' ? 'destructive' : 'secondary' }>{order.dispatchStatus}</Badge>
                </TableCell>
                <TableCell>{client?.commune}</TableCell>
            </TableRow>
        )
    });
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
                    <CardTitle className="font-headline text-2xl">Control de Fletes y Despachos</CardTitle>
                    <CardDescription>Visualiza y audita todas las operaciones de transporte.</CardDescription>
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
                            {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                            {format(dateRange.to, "LLL dd, y", { locale: es })}
                            </>
                        ) : (
                            format(dateRange.from, "LLL dd, y", { locale: es })
                        )
                        ) : (
                        <span>Rango de Fechas Despacho</span>
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
                        locale={es}
                    />
                    </PopoverContent>
                </Popover>
                
                <Input 
                    placeholder="Filtrar por cliente..." 
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="max-w-xs"
                />

                 <Input 
                    placeholder="Filtrar por transportista..." 
                    value={carrierFilter}
                    onChange={(e) => setCarrierFilter(e.target.value)}
                    className="max-w-xs"
                />

                <Select onValueChange={(value: 'Todos' | DispatchStatus) => setStatusFilter(value)} value={statusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Estado Despacho" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Todos">Todos</SelectItem>
                        <SelectItem value="Pendiente">Pendiente</SelectItem>
                        <SelectItem value="Programado">Programado</SelectItem>
                        <SelectItem value="En Tránsito">En Tránsito</SelectItem>
                        <SelectItem value="Entregado">Entregado</SelectItem>
                        <SelectItem value="Incidencia">Incidencia</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha Desp.</TableHead>
                  <TableHead>O/V</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Guía Desp.</TableHead>
                  <TableHead>Transportista</TableHead>
                  <TableHead>Chofer</TableHead>
                  <TableHead>Patente</TableHead>
                  <TableHead className="text-right">Costo Flete</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead>Destino</TableHead>
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
