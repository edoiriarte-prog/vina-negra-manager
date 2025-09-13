
"use client";

import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Contact, SalesOrder, PurchaseOrder, FinancialMovement } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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
import { Printer } from 'lucide-react';
import { Logo } from '@/components/logo';

type ReportData = {
  contactId: string;
  contactName: string;
  totalBilled: number;
  totalPaid: number;
  pendingBalance: number;
  status: 'Pagado' | 'Pendiente' | 'Abono';
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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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

        return {
          contactId: client.id,
          contactName: client.name,
          totalBilled,
          totalPaid,
          pendingBalance,
          status
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
        
        return {
          contactId: supplier.id,
          contactName: supplier.name,
          totalBilled,
          totalPaid,
          pendingBalance,
          status,
        };
      });
      setSupplierReports(supplierReportData);
    }
  }, [contacts, salesOrders, purchaseOrders, financialMovements, isClient]);


  const renderReportRows = (data: ReportData[]) => {
    if (!isClient) {
      return Array.from({ length: 3 }).map((_, index) => (
        <TableRow key={`skeleton-${index}`}>
          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        </TableRow>
      ));
    }
    
    return data.map((item) => (
      <TableRow key={item.contactId}>
        <TableCell className="font-medium">{item.contactName}</TableCell>
        <TableCell className="text-right">{formatCurrency(item.totalBilled)}</TableCell>
        <TableCell className="text-right text-green-600">{formatCurrency(item.totalPaid)}</TableCell>
        <TableCell className="text-right font-bold">{formatCurrency(item.pendingBalance)}</TableCell>
        <TableCell className="text-center">
            <Badge variant={
                item.status === 'Pagado' ? 'default' : item.status === 'Abono' ? 'secondary' : 'destructive'
            }>{item.status}</Badge>
        </TableCell>
      </TableRow>
    ));
  };
  
  const handlePrint = () => {
    window.print();
  }


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
          }
          .print-header {
             background-color: transparent !important;
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Total Facturado</TableHead>
                  <TableHead className="text-right">Total Pagado</TableHead>
                  <TableHead className="text-right">Saldo Pendiente</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderReportRows(clientReports)}
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Total Comprado</TableHead>
                  <TableHead className="text-right">Total Pagado</TableHead>
                  <TableHead className="text-right">Saldo Pendiente</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderReportRows(supplierReports)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
