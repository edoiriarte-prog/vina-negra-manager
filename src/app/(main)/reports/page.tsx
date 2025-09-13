
"use client";

import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Contact, SalesOrder, PurchaseOrder, FinancialMovement } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  contacts as initialContacts,
  salesOrders as initialSalesOrders,
  purchaseOrders as initialPurchaseOrders,
  financialMovements as initialFinancialMovements,
} from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Printer, ChevronDown } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

type OrderDetail = {
  id: string;
  date: string;
  amount: number;
  paid: number;
  balance: number;
  status: 'Pagado' | 'Pendiente' | 'Abono';
};

type ReportData = {
  contactId: string;
  contactName: string;
  totalBilled: number;
  totalPaid: number;
  pendingBalance: number;
  status: 'Pagado' | 'Pendiente' | 'Abono';
  orders: OrderDetail[];
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

  const getOrderStatus = (orderTotal: number, totalPaid: number) : OrderDetail['status'] => {
      if (totalPaid <= 0 && orderTotal > 0) return 'Pendiente';
      if (totalPaid >= orderTotal) return 'Pagado';
      return 'Abono';
  }

  useEffect(() => {
    if (isClient) {
      // Client Reports
      const clients = contacts.filter(c => c.type === 'client');
      const clientReportData = clients.map(client => {
        const clientSalesOrders = salesOrders.filter(so => so.clientId === client.id);
        const totalBilled = clientSalesOrders.reduce((sum, order) => sum + order.totalAmount, 0);

        const clientSaleOrderIds = clientSalesOrders.map(so => so.id);
        const totalPaid = financialMovements
          .filter(fm => fm.type === 'income' && fm.relatedOrder && clientSaleOrderIds.includes(fm.relatedOrder.id))
          .reduce((sum, movement) => sum + movement.amount, 0);

        const pendingBalance = totalBilled - totalPaid;
        
        let status: ReportData['status'] = 'Pendiente';
        if (pendingBalance <= 0 && totalBilled > 0) {
          status = 'Pagado';
        } else if (totalPaid > 0 && pendingBalance > 0) {
          status = 'Abono';
        }

        const orders: OrderDetail[] = clientSalesOrders.map(order => {
          const payments = financialMovements.filter(fm => fm.relatedOrder?.id === order.id && fm.type === 'income');
          const totalPaidForOrder = payments.reduce((sum, p) => sum + p.amount, 0);
          const balance = order.totalAmount - totalPaidForOrder;
          return {
            id: order.id,
            date: order.date,
            amount: order.totalAmount,
            paid: totalPaidForOrder,
            balance: balance,
            status: getOrderStatus(order.totalAmount, totalPaidForOrder)
          }
        });

        return {
          contactId: client.id,
          contactName: client.name,
          totalBilled,
          totalPaid,
          pendingBalance,
          status,
          orders
        };
      });
      setClientReports(clientReportData);

      // Supplier Reports
      const suppliers = contacts.filter(c => c.type === 'supplier');
      const supplierReportData = suppliers.map(supplier => {
        const supplierPurchaseOrders = purchaseOrders.filter(po => po.supplierId === supplier.id);
        const totalBilled = supplierPurchaseOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        
        const supplierPurchaseOrderIds = supplierPurchaseOrders.map(po => po.id);
        const totalPaid = financialMovements
          .filter(fm => fm.type === 'expense' && fm.relatedOrder && supplierPurchaseOrderIds.includes(fm.relatedOrder.id))
          .reduce((sum, movement) => sum + movement.amount, 0);
          
        const pendingBalance = totalBilled - totalPaid;

        let status: ReportData['status'] = 'Pendiente';
        if (pendingBalance <= 0 && totalBilled > 0) {
          status = 'Pagado';
        } else if (totalPaid > 0 && pendingBalance > 0) {
          status = 'Abono';
        }

        const orders: OrderDetail[] = supplierPurchaseOrders.map(order => {
          const payments = financialMovements.filter(fm => fm.relatedOrder?.id === order.id && fm.type === 'expense');
          const totalPaidForOrder = payments.reduce((sum, p) => sum + p.amount, 0);
          const balance = order.totalAmount - totalPaidForOrder;
          return {
            id: order.id,
            date: order.date,
            amount: order.totalAmount,
            paid: totalPaidForOrder,
            balance: balance,
            status: getOrderStatus(order.totalAmount, totalPaidForOrder)
          }
        });
        
        return {
          contactId: supplier.id,
          contactName: supplier.name,
          totalBilled,
          totalPaid,
          pendingBalance,
          status,
          orders
        };
      });
      setSupplierReports(supplierReportData);
    }
  }, [contacts, salesOrders, purchaseOrders, financialMovements, isClient]);

  const handlePrint = () => window.print();

  const toggleCollapsible = (id: string) => {
    setOpenCollapsibles(prev => ({...prev, [id]: !prev[id]}));
  }

  const renderReportRows = (data: ReportData[], filter: string) => {
    const filteredData = data.filter(item => item.contactName.toLowerCase().includes(filter.toLowerCase()));
    
    if (!isClient) {
      return Array.from({ length: 3 }).map((_, index) => (
         <TableRow key={`skeleton-${index}`}>
          <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
        </TableRow>
      ));
    }
    
    return filteredData.map((item) => (
       <Collapsible asChild key={item.contactId} onOpenChange={() => toggleCollapsible(item.contactId)} open={openCollapsibles[item.contactId]}>
        <>
        <TableRow className="cursor-pointer hover:bg-muted/20">
          <CollapsibleTrigger asChild>
             <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                    <ChevronDown className={cn("h-4 w-4 transition-transform", openCollapsibles[item.contactId] && "rotate-180")} />
                    {item.contactName}
                </div>
            </TableCell>
          </CollapsibleTrigger>
          <TableCell className="text-right">{formatCurrency(item.totalBilled)}</TableCell>
          <TableCell className="text-right text-green-600 dark:text-green-500">{formatCurrency(item.totalPaid)}</TableCell>
          <TableCell className="text-right font-bold">{formatCurrency(item.pendingBalance)}</TableCell>
          <TableCell className="text-center">
              <Badge variant={ item.status === 'Pagado' ? 'default' : item.status === 'Abono' ? 'secondary' : 'destructive' }>{item.status}</Badge>
          </TableCell>
        </TableRow>
        <CollapsibleContent asChild>
            <tr className="bg-muted/20 hover:bg-muted/30">
                <TableCell colSpan={5} className="p-0">
                    <div className="p-4">
                        <h4 className="font-semibold mb-2">Detalle de Órdenes</h4>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Orden ID</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead className="text-right">Monto</TableHead>
                                    <TableHead className="text-right">Pagado</TableHead>
                                    <TableHead className="text-right">Saldo</TableHead>
                                    <TableHead className="text-center">Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {item.orders.map(order => (
                                    <TableRow key={order.id}>
                                        <TableCell>{order.id}</TableCell>
                                        <TableCell>{format(parseISO(order.date), "dd-MM-yyyy", { locale: es })}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(order.amount)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(order.paid)}</TableCell>
                                        <TableCell className="text-right font-semibold">{formatCurrency(order.balance)}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={ order.status === 'Pagado' ? 'default' : order.status === 'Abono' ? 'secondary' : 'destructive' }>{order.status}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TableCell>
            </tr>
        </CollapsibleContent>
        </>
      </Collapsible>
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
          /* Force collapsible content to be visible for printing */
          .print-force-open > div {
            display: table-row !important;
          }
        }
      `}</style>
      <div className="print-header no-print flex justify-between items-center">
        <div>
            <h1 className="font-headline text-2xl">Informes de Cuentas</h1>
            <p className="text-muted-foreground">Resumen de cuentas por cobrar y por pagar.</p>
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

      <Card className="print-container">
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
      
      <Card className="print-container">
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
    </div>
  );
}

    