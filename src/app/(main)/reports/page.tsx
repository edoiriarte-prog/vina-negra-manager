

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Contact, SalesOrder, PurchaseOrder, FinancialMovement, ServiceOrder } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  contacts as initialContacts,
  salesOrders as initialSalesOrders,
  purchaseOrders as initialPurchaseOrders,
  financialMovements as initialFinancialMovements,
  serviceOrders as initialServiceOrders,
} from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Printer, ChevronDown } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PerformanceReports } from './components/performance-reports';
import { DueDatesReport } from './components/due-dates-report';

type DocumentDetail = {
  id: string;
  date: string;
  type: 'O/V' | 'O/C' | 'O/S';
  amount: number;
};

type PaymentDetail = {
    id: string;
    date: string;
    description: string;
    amount: number;
}

type ReportData = {
  contactId: string;
  contactName: string;
  totalBilled: number;
  totalPaid: number;
  pendingBalance: number;
  status: 'Pagado' | 'Pendiente' | 'Abono';
  documents: DocumentDetail[];
  payments: PaymentDetail[];
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);


export default function ReportsPage() {
  const [contacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
  const [salesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
  const [purchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [serviceOrders] = useLocalStorage<ServiceOrder[]>('serviceOrders', initialServiceOrders);
  const [financialMovements] = useLocalStorage<FinancialMovement[]>('financialMovements', initialFinancialMovements);
  
  const [clientReports, setClientReports] = useState<ReportData[]>([]);
  const [supplierReports, setSupplierReports] = useState<ReportData[]>([]);
  const [clientFilter, setClientFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      // Client Reports
      const clients = contacts.filter(c => c.type === 'client');
      const clientReportData = clients.map(client => {
        const clientSalesOrders = salesOrders.filter(so => so.clientId === client.id);
        const clientDocuments: DocumentDetail[] = clientSalesOrders.map(so => ({ id: so.id, date: so.date, type: 'O/V', amount: so.totalAmount }));
        const totalBilled = clientDocuments.reduce((sum, doc) => sum + doc.amount, 0);

        const clientMovements = financialMovements.filter(
          fm => fm.type === 'income' && fm.contactId === client.id
        );
        const totalPaid = clientMovements.reduce((sum, movement) => sum + movement.amount, 0);
        
        const pendingBalance = totalBilled - totalPaid;
        
        let status: ReportData['status'] = 'Pendiente';
        if (pendingBalance <= 0 && totalBilled > 0) {
          status = 'Pagado';
        } else if (totalPaid > 0 && pendingBalance > 0) {
          status = 'Abono';
        }

        return {
          contactId: client.id,
          contactName: client.name,
          totalBilled,
          totalPaid,
          pendingBalance,
          status,
          documents: clientDocuments,
          payments: clientMovements.map(p => ({ id: p.id, date: p.date, description: p.description, amount: p.amount })),
        };
      }).filter(r => r.totalBilled > 0 || r.totalPaid > 0);
      setClientReports(clientReportData);

      // Supplier Reports
      const suppliers = contacts.filter(c => c.type === 'supplier');
      const supplierReportData = suppliers.map(supplier => {
        const supplierPurchaseOrders = purchaseOrders.filter(po => po.supplierId === supplier.id);
        const supplierServiceOrders = serviceOrders.filter(so => {
            const contact = contacts.find(c => c.id === supplier.id);
            return contact && so.provider.toLowerCase() === contact.name.toLowerCase();
        });

        const supplierDocuments: DocumentDetail[] = [
            ...supplierPurchaseOrders.map(po => ({ id: po.id, date: po.date, type: 'O/C' as const, amount: po.totalAmount })),
            ...supplierServiceOrders.map(so => ({ id: so.id, date: so.date, type: 'O/S' as const, amount: so.cost })),
        ];

        const totalBilled = supplierDocuments.reduce((sum, doc) => sum + doc.amount, 0);
        
        const supplierMovements = financialMovements.filter(
            fm => fm.type === 'expense' && fm.contactId === supplier.id
        );
        const totalPaid = supplierMovements.reduce((sum, movement) => sum + movement.amount, 0);
          
        const pendingBalance = totalBilled - totalPaid;

        let status: ReportData['status'] = 'Pendiente';
        if (pendingBalance <= 0 && totalBilled > 0) {
          status = 'Pagado';
        } else if (totalPaid > 0 && pendingBalance > 0) {
          status = 'Abono';
        }

         return {
          contactId: supplier.id,
          contactName: supplier.name,
          totalBilled,
          totalPaid,
          pendingBalance,
          status,
          documents: supplierDocuments,
          payments: supplierMovements.map(p => ({ id: p.id, date: p.date, description: p.description, amount: p.amount })),
        };
      }).filter(r => r.totalBilled > 0 || r.totalPaid > 0);
      setSupplierReports(supplierReportData);
    }
  }, [contacts, salesOrders, purchaseOrders, serviceOrders, financialMovements, isClient]);

  const handlePrint = () => {
    const allIds = [...clientReports, ...supplierReports].reduce((acc, report) => {
        acc[report.contactId] = true;
        return acc;
    }, {} as Record<string, boolean>);
    setOpenCollapsibles(allIds);

    setTimeout(() => {
        window.print();
    }, 100);
  }

  const toggleCollapsible = (id: string) => {
    setOpenCollapsibles(prev => ({...prev, [id]: !prev[id]}));
  }
  
  const renderReportRows = (data: ReportData[], filter: string) => {
    const filteredData = data.filter(item => item.contactName.toLowerCase().includes(filter.toLowerCase()));
    
    if (!isClient) {
        return (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={`skeleton-${index}`} className="h-8 w-full my-2" />
                ))}
              </TableCell>
            </TableRow>
        );
    }
    
    return filteredData.map((item) => (
      <React.Fragment key={item.contactId}>
        <TableRow className="cursor-pointer hover:bg-muted/20" onClick={() => toggleCollapsible(item.contactId)}>
          <TableCell className="font-medium">
            <div className="flex items-center gap-2">
              <ChevronDown className={cn("h-4 w-4 transition-transform", openCollapsibles[item.contactId] && "rotate-180")} />
              {item.contactName}
            </div>
          </TableCell>
          <TableCell className="text-right">{formatCurrency(item.totalBilled)}</TableCell>
          <TableCell className="text-right text-green-600 dark:text-green-500">{formatCurrency(item.totalPaid)}</TableCell>
          <TableCell className="text-right font-bold">{formatCurrency(item.pendingBalance)}</TableCell>
          <TableCell className="text-center">
            <Badge variant={ item.status === 'Pagado' ? 'default' : item.status === 'Abono' ? 'secondary' : 'destructive' }>{item.status}</Badge>
          </TableCell>
        </TableRow>
        {openCollapsibles[item.contactId] && (
          <tr className="bg-muted/20 hover:bg-muted/30">
            <TableCell colSpan={5} className="p-0">
                <div className="p-4 grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-semibold mb-2">Documentos</h4>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead className="text-right">Monto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {item.documents.map(doc => (
                                    <TableRow key={doc.id}>
                                        <TableCell>{doc.id}</TableCell>
                                        <TableCell>{format(parseISO(doc.date), "dd-MM-yyyy", { locale: es })}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(doc.amount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Pagos</h4>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead className="text-right">Monto</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {item.payments.map(payment => (
                                    <TableRow key={payment.id}>
                                        <TableCell>{format(parseISO(payment.date), "dd-MM-yyyy", { locale: es })}</TableCell>
                                        <TableCell className='max-w-[200px] truncate'>{payment.description}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </TableCell>
          </tr>
        )}
      </React.Fragment>
    ));
  };
  
  return (
    <div className="flex flex-col gap-6 print:gap-0">
       <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none;
          }
          .print-container {
            padding: 0;
            margin: 0;
            box-shadow: none;
            border: none;
            page-break-inside: avoid;
          }
           .print-header {
             background-color: transparent !important;
          }
        }
      `}</style>
      <div className="print-header no-print flex justify-between items-center">
        <div>
            <h1 className="font-headline text-2xl">Informes de Gestión</h1>
            <p className="text-muted-foreground">Analiza el estado de cuentas y el rendimiento de tu negocio.</p>
        </div>
        <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
        </Button>
      </div>
      
      <div className="hidden print:block print:mb-8">
        <Logo />
        <h1 className="font-headline text-2xl text-center mt-4">Informes de Cuentas</h1>
      </div>

      <Tabs defaultValue="accounts" className="no-print">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="accounts">Estado de Cuentas</TabsTrigger>
          <TabsTrigger value="due-dates">Vencimientos</TabsTrigger>
          <TabsTrigger value="performance">Rendimiento</TabsTrigger>
        </TabsList>
        <TabsContent value="accounts">
          <Card className="print-container mt-6">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Cuentas por Cobrar (Clientes)</CardTitle>
              <CardDescription>Resumen de facturación, pagos y saldos pendientes de clientes.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="no-print my-4">
                <Input 
                    placeholder="Filtrar por cliente..." 
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="max-w-sm"
                  />
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Cliente</TableHead>
                      <TableHead className="text-right">Total Facturado</TableHead>
                      <TableHead className="text-right">Total Pagado</TableHead>
                      <TableHead className="text-right">Saldo Pendiente</TableHead>
                      <TableHead className="text-center w-[100px]">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renderReportRows(clientReports, clientFilter)}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          
          <Card className="print-container mt-6">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Cuentas por Pagar (Proveedores)</CardTitle>
              <CardDescription>Resumen de compras, pagos y saldos pendientes a proveedores.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="no-print my-4">
                <Input 
                    placeholder="Filtrar por proveedor..." 
                    value={supplierFilter}
                    onChange={(e) => setSupplierFilter(e.target.value)}
                    className="max-w-sm"
                  />
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Proveedor</TableHead>
                      <TableHead className="text-right">Total Comprado</TableHead>
                      <TableHead className="text-right">Total Pagado</TableHead>
                      <TableHead className="text-right">Saldo Pendiente</TableHead>
                      <TableHead className="text-center w-[100px]">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                   <TableBody>
                    {renderReportRows(supplierReports, supplierFilter)}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="due-dates">
            <DueDatesReport 
                salesOrders={salesOrders}
                financialMovements={financialMovements}
                contacts={contacts}
            />
        </TabsContent>
        <TabsContent value="performance">
            <PerformanceReports
                salesOrders={salesOrders}
                purchaseOrders={purchaseOrders}
            />
        </TabsContent>
      </Tabs>
    </div>
  );
}
