
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Contact, SalesOrder, PurchaseOrder, FinancialMovement, ServiceOrder } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from '@/components/ui/table';
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
import { Printer, ChevronDown, MoreHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type DocumentDetail = {
  id: string;
  date: string;
  type: 'O/V' | 'O/C' | 'O/S';
  amount: number;
  paidAmount: number;
  pendingBalance: number;
  status: 'Pagado' | 'Abonado' | 'Pendiente';
  paymentCompleteDate?: string;
  items?: any[];
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


export default function MercantileAccountPage() {
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
  const [printingReport, setPrintingReport] = useState<ReportData | null>(null);

  const printRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (printingReport) {
      setTimeout(() => {
        if (printRef.current) {
          const printContents = printRef.current.innerHTML;
          const printWindow = window.open('', '', 'height=800,width=800');
          
          if(printWindow){
            printWindow.document.write('<html><head><title>Estado de Cuenta</title>');
            const styles = Array.from(document.styleSheets)
              .map(s => s.href ? `<link rel="stylesheet" href="${s.href}">` : '')
              .join('');
            printWindow.document.write(styles);
            printWindow.document.write('<style>body { padding: 2rem; } .print-only { display: block !important; } .no-print { display: none !important; } .print-order-section { page-break-inside: avoid; }</style>');
            printWindow.document.write('</head><body class="bg-white">');
            printWindow.document.write(printContents);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
                setPrintingReport(null);
            }, 500);
          }
        }
      }, 100);
    }
  }, [printingReport]);

  useEffect(() => {
    if (isClient) {
      const clients = contacts.filter(c => c.type.includes('client'));
      const clientReportData = clients.map(client => {
        const clientSalesOrders = salesOrders
          .filter(so => so.clientId === client.id && (so.status === 'completed' || so.status === 'pending'))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const clientMovements = financialMovements
          .filter(fm => fm.type === 'income' && fm.contactId === client.id)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const paymentPool = clientMovements.map(p => ({ ...p, remaining: p.amount }));

        const clientDocuments: DocumentDetail[] = clientSalesOrders.map(order => {
            let paidAmount = 0;
            let lastPaymentDate: string | undefined = undefined;

            for (const payment of paymentPool) {
                if (payment.remaining > 0) {
                    const remainingOnOrder = order.totalAmount - paidAmount;
                    if (remainingOnOrder > 0) {
                        const amountToApply = Math.min(payment.remaining, remainingOnOrder);
                        paidAmount += amountToApply;
                        payment.remaining -= amountToApply;
                        lastPaymentDate = payment.date;
                    }
                }
            }

            const pendingBalance = order.totalAmount - paidAmount;
            let status: DocumentDetail['status'] = 'Pendiente';
            if (pendingBalance <= 1) { // Epsilon for float comparison
                status = 'Pagado';
            } else if (paidAmount > 0) {
                status = 'Abonado';
            }

            return {
                id: order.id,
                date: order.date,
                type: 'O/V',
                amount: order.totalAmount,
                paidAmount: paidAmount,
                pendingBalance: pendingBalance,
                status: status,
                paymentCompleteDate: status === 'Pagado' ? lastPaymentDate : undefined,
                items: order.items,
            };
        });

        const totalBilled = clientDocuments.reduce((sum, doc) => sum + doc.amount, 0);
        const totalPaid = clientDocuments.reduce((sum, doc) => sum + doc.paidAmount, 0);
        const overallPending = totalBilled - totalPaid;
        
        let overallStatus: ReportData['status'] = 'Pendiente';
        if (totalBilled > 0) {
            if (overallPending <= 1) {
                overallStatus = 'Pagado';
            } else if (totalPaid > 0) {
                overallStatus = 'Abono';
            }
        } else if (totalPaid > 0) {
             overallStatus = 'Abono';
        }

        return {
          contactId: client.id,
          contactName: client.name,
          totalBilled,
          totalPaid,
          pendingBalance: overallPending,
          status: overallStatus,
          documents: clientDocuments,
          payments: clientMovements.map(p => ({ id: p.id, date: p.date, description: p.description, amount: p.amount })),
        };
      }).filter(r => r.totalBilled > 0 || r.totalPaid > 0);
      setClientReports(clientReportData);

      // --- Supplier Reports ---
      const suppliers = contacts.filter(c => c.type.includes('supplier'));
      const supplierReportData = suppliers.map(supplier => {
        const supplierPurchaseOrders = purchaseOrders.filter(po => po.supplierId === supplier.id && (po.status === 'completed' || po.status === 'pending'));
        const supplierServiceOrders = serviceOrders.filter(so => {
            const contact = contacts.find(c => c.name === so.provider);
            return contact?.id === supplier.id;
        });

        const supplierDocsRaw = [
            ...supplierPurchaseOrders.map(po => ({ id: po.id, date: po.date, type: 'O/C' as const, amount: po.totalAmount, items: po.items })),
            ...supplierServiceOrders.map(so => ({ id: so.id, date: so.date, type: 'O/S' as const, amount: so.cost, items: [] })),
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


        const supplierMovements = financialMovements.filter(fm => fm.type === 'expense' && fm.contactId === supplier.id);
        const paymentPool = supplierMovements.map(p => ({ ...p, remaining: p.amount }));

        const supplierDocuments: DocumentDetail[] = supplierDocsRaw.map(doc => {
          let paidAmount = 0;
          let lastPaymentDate: string | undefined;

          for (const payment of paymentPool) {
            if (payment.remaining > 0) {
              const remainingOnDoc = doc.amount - paidAmount;
              if (remainingOnDoc > 0) {
                const amountToApply = Math.min(payment.remaining, remainingOnDoc);
                paidAmount += amountToApply;
                payment.remaining -= amountToApply;
                lastPaymentDate = payment.date;
              }
            }
          }
          
          const pendingBalance = doc.amount - paidAmount;
          let status: DocumentDetail['status'] = 'Pendiente';
          if (pendingBalance <= 1) {
            status = 'Pagado';
          } else if (paidAmount > 0) {
            status = 'Abonado';
          }

          return { ...doc, paidAmount, pendingBalance, status, paymentCompleteDate: status === 'Pagado' ? lastPaymentDate : undefined };
        });

        const totalBilled = supplierDocuments.reduce((sum, doc) => sum + doc.amount, 0);
        const totalPaid = supplierMovements.reduce((sum, movement) => sum + movement.amount, 0);
        const pendingBalance = totalBilled - totalPaid;

        let status: ReportData['status'] = 'Pendiente';
        if (totalBilled > 0) {
            if (pendingBalance <= 1) {
              status = 'Pagado';
            } else if (totalPaid > 0) {
              status = 'Abono';
            }
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

  const clientTotals = useMemo(() => {
    return clientReports.reduce((acc, report) => {
        acc.totalBilled += report.totalBilled;
        acc.totalPaid += report.totalPaid;
        acc.pendingBalance += report.pendingBalance;
        return acc;
    }, { totalBilled: 0, totalPaid: 0, pendingBalance: 0 });
  }, [clientReports]);

  const supplierTotals = useMemo(() => {
    return supplierReports.reduce((acc, report) => {
        acc.totalBilled += report.totalBilled;
        acc.totalPaid += report.totalPaid;
        acc.pendingBalance += report.pendingBalance;
        return acc;
    }, { totalBilled: 0, totalPaid: 0, pendingBalance: 0 });
  }, [supplierReports]);


  const handlePrintRequest = (report: ReportData) => {
    setPrintingReport(report);
  };
  
  const toggleCollapsible = (id: string) => {
    setOpenCollapsibles(prev => ({...prev, [id]: !prev[id]}));
  }

  const allDocuments = printingReport?.documents || [];
  const allItems = allDocuments.flatMap(doc => doc.items || []);
  const totalPackages = allItems.reduce((sum, item) => sum + (item.packagingQuantity || 0), 0);
  const totalKilos = allItems.reduce((sum, item) => item.unit === 'Kilos' ? sum + item.quantity : sum, 0);
  const totalValue = allItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const avgPricePerKg = totalKilos > 0 ? totalValue / totalKilos : 0;
  
  const groupedPayments = printingReport?.payments.reduce((acc, payment) => {
    const month = format(parseISO(payment.date), 'MMMM yyyy', { locale: es });
    if (!acc[month]) {
        acc[month] = {
            payments: [],
            total: 0,
        };
    }
    acc[month].payments.push(payment);
    acc[month].total += payment.amount;
    return acc;
  }, {} as Record<string, { payments: PaymentDetail[], total: number }>);
  
  const renderClientReportRows = (data: ReportData[], filter: string) => {
    const filteredData = data.filter(item => item.contactName.toLowerCase().includes(filter.toLowerCase()));
    
    if (!isClient) {
        return (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={`skeleton-${index}`} className="h-8 w-full my-2" />
                ))}
              </TableCell>
            </TableRow>
        );
    }
    
    return filteredData.map((item) => (
      <React.Fragment key={item.contactId}>
        <TableRow>
          <TableCell className="font-medium">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => toggleCollapsible(item.contactId)}>
                <ChevronDown className={cn("h-4 w-4 transition-transform", openCollapsibles[item.contactId] && "rotate-180")} />
              </Button>
              {item.contactName}
            </div>
          </TableCell>
          <TableCell className="text-right">{formatCurrency(item.totalBilled)}</TableCell>
          <TableCell className="text-right text-green-600 dark:text-green-500">{formatCurrency(item.totalPaid)}</TableCell>
          <TableCell className="text-right font-bold">{formatCurrency(item.pendingBalance)}</TableCell>
          <TableCell className="text-center">
            <Badge variant={ item.status === 'Pagado' ? 'default' : item.status === 'Abono' ? 'secondary' : 'destructive' }>{item.status}</Badge>
          </TableCell>
          <TableCell className="text-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menú</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handlePrintRequest(item)}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir Estado de Cuenta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
        {openCollapsibles[item.contactId] && (
          <tr className="bg-muted/20 hover:bg-muted/30">
            <TableCell colSpan={6} className="p-0">
                <div className="p-4">
                    <div className="col-span-3">
                        <h4 className="font-semibold mb-2">Detalle de Órdenes de Venta</h4>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>O/V</TableHead>
                                    <TableHead>Fecha O/V</TableHead>
                                    <TableHead>Monto O/V</TableHead>
                                    <TableHead>Monto Pagado</TableHead>
                                    <TableHead>Saldo</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Fecha Pago Final</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {item.documents.map(doc => (
                                    <TableRow key={doc.id}>
                                        <TableCell>{doc.id}</TableCell>
                                        <TableCell>{format(parseISO(doc.date), "dd-MM-yyyy", { locale: es })}</TableCell>
                                        <TableCell>{formatCurrency(doc.amount)}</TableCell>
                                        <TableCell className="text-green-600">{formatCurrency(doc.paidAmount)}</TableCell>
                                        <TableCell className="font-bold">{formatCurrency(doc.pendingBalance)}</TableCell>
                                        <TableCell>
                                             <Badge variant={doc.status === 'Pagado' ? 'default' : doc.status === 'Abonado' ? 'secondary' : 'destructive'}>{doc.status}</Badge>
                                        </TableCell>
                                        <TableCell>{doc.paymentCompleteDate ? format(parseISO(doc.paymentCompleteDate), "dd-MM-yyyy") : '-'}</TableCell>
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

   const renderSupplierReportRows = (data: ReportData[], filter: string) => {
    const filteredData = data.filter(item => item.contactName.toLowerCase().includes(filter.toLowerCase()));
    
    if (!isClient) {
        return (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={`skeleton-supp-${index}`} className="h-8 w-full my-2" />
                ))}
              </TableCell>
            </TableRow>
        );
    }
    
    return filteredData.map((item) => (
      <React.Fragment key={item.contactId}>
        <TableRow>
          <TableCell className="font-medium">
            <div className="flex items-center gap-2">
               <Button variant="ghost" size="sm" onClick={() => toggleCollapsible(item.contactId)}>
                <ChevronDown className={cn("h-4 w-4 transition-transform", openCollapsibles[item.contactId] && "rotate-180")} />
              </Button>
              {item.contactName}
            </div>
          </TableCell>
          <TableCell className="text-right">{formatCurrency(item.totalBilled)}</TableCell>
          <TableCell className="text-right text-green-600 dark:text-green-500">{formatCurrency(item.totalPaid)}</TableCell>
          <TableCell className="text-right font-bold">{formatCurrency(item.pendingBalance)}</TableCell>
          <TableCell className="text-center">
            <Badge variant={ item.status === 'Pagado' ? 'default' : item.status === 'Abono' ? 'secondary' : 'destructive' }>{item.status}</Badge>
          </TableCell>
           <TableCell className="text-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menú</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handlePrintRequest(item)}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir Estado de Cuenta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
        {openCollapsibles[item.contactId] && (
          <tr className="bg-muted/20 hover:bg-muted/30">
            <TableCell colSpan={6} className="p-0">
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
                                    <TableHead className="text-right">Monto</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {item.payments.map(payment => (
                                    <TableRow key={payment.id}>
                                        <TableCell>{format(parseISO(payment.date), "dd-MM-yyyy", { locale: es })}</TableCell>
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
    <div className="flex flex-col gap-6">
        <div>
            <h1 className="font-headline text-3xl">Cta. Corriente Mercantil</h1>
            <p className="text-muted-foreground">Analiza el estado de cuentas de clientes y proveedores.</p>
        </div>

        <Card>
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Cuentas por Cobrar (Clientes)</CardTitle>
              <CardDescription>Resumen de facturación, pagos y saldos pendientes de clientes.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="my-4">
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
                      <TableHead className="text-center w-[50px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renderClientReportRows(clientReports, clientFilter)}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableHead className="text-right font-bold text-lg">Total General</TableHead>
                      <TableHead className="text-right font-bold text-lg">{formatCurrency(clientTotals.totalBilled)}</TableHead>
                      <TableHead className="text-right font-bold text-lg">{formatCurrency(clientTotals.totalPaid)}</TableHead>
                      <TableHead className="text-right font-bold text-lg">{formatCurrency(clientTotals.pendingBalance)}</TableHead>
                      <TableHead colSpan={2}/>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
        </Card>
          
        <Card>
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Cuentas por Pagar (Proveedores)</CardTitle>
              <CardDescription>Resumen de compras, pagos y saldos pendientes a proveedores.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="my-4">
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
                      <TableHead className="text-center w-[50px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                   <TableBody>
                    {renderSupplierReportRows(supplierReports, supplierFilter)}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableHead className="text-right font-bold text-lg">Total General</TableHead>
                      <TableHead className="text-right font-bold text-lg">{formatCurrency(supplierTotals.totalBilled)}</TableHead>
                      <TableHead className="text-right font-bold text-lg">{formatCurrency(supplierTotals.totalPaid)}</TableHead>
                      <TableHead className="text-right font-bold text-lg">{formatCurrency(supplierTotals.pendingBalance)}</TableHead>
                      <TableHead colSpan={2} />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
        </Card>

        {/* Hidden container for printing */}
        <div className="hidden print-only">
          <div ref={printRef}>
              {printingReport && (
                  <div className="p-8 font-sans text-black">
                      <div className="grid grid-cols-2 gap-8 mb-8">
                          <div>
                              <h2 className="font-bold text-lg mb-2">{printingReport.documents.some(d => d.type === 'O/C') ? 'PROVEEDOR' : 'CLIENTE'}</h2>
                              <div className="text-sm">
                                  <p className="font-semibold text-base">{printingReport.contactName}</p>
                                  <p>RUT: {contacts.find(c=>c.id === printingReport.contactId)?.rut}</p>
                                  <p>{contacts.find(c=>c.id === printingReport.contactId)?.address}</p>
                                  <p>{contacts.find(c=>c.id === printingReport.contactId)?.commune}</p>
                              </div>
                          </div>
                          <div className='text-right'>
                              <h1 className="text-2xl font-bold">ESTADO DE CUENTA</h1>
                              <p className='text-sm'>Al {format(new Date(), "PPP", { locale: es })}</p>
                              <div className="mt-4">
                                  <h3 className="text-lg font-bold">VIÑA NEGRA SpA</h3>
                                  <p className="text-sm">RUT: 78.261.683-8</p>
                                  <p className="text-sm">TULAHUEN S/N</p>
                                  <p className="text-sm">MONTE PATRIA, CHILE</p>
                              </div>
                          </div>
                      </div>

                      {printingReport.documents.some(d => d.type === 'O/C') ? (
                        <>
                          <div className="grid grid-cols-2 gap-8 mt-8">
                              <div className="bg-gray-50 p-4 rounded-lg print-order-section">
                                  <h3 className="text-lg font-bold mb-2 text-center">Resumen Total de Compras</h3>
                                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                      <div className="font-bold">Total Kilos Comprados:</div>
                                      <div className="text-right font-bold">{totalKilos.toLocaleString('es-CL')} kg</div>
                                      <div className="font-bold">Total Envases:</div>
                                      <div className="text-right font-bold">{totalPackages.toLocaleString('es-CL')}</div>
                                      <div className="font-bold">Valor Total Compra:</div>
                                      <div className="text-right font-bold text-base">{formatCurrency(totalValue)}</div>
                                      <div className="font-bold">Precio Promedio por Kilo:</div>
                                      <div className="text-right font-bold text-base">{formatCurrency(avgPricePerKg)}</div>
                                  </div>
                              </div>
                              <div>
                                  <h3 className="text-lg font-bold mb-4 border-b pb-2">Resumen de Pagos</h3>
                                  {groupedPayments && Object.entries(groupedPayments).map(([month, data]) => (
                                  <div key={month} className="mb-4">
                                      <h4 className="font-bold text-md mb-2 capitalize">{month}</h4>
                                      <Table>
                                          <TableBody>
                                              {data.payments.map(payment => (
                                                  <TableRow key={payment.id}>
                                                      <TableCell className="w-[100px]">{format(parseISO(payment.date), "dd-MM-yyyy")}</TableCell>
                                                      <TableCell>{payment.description}</TableCell>
                                                      <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                                                  </TableRow>
                                              ))}
                                          </TableBody>
                                          <TableFooter>
                                              <TableRow>
                                                  <TableCell colSpan={2} className="text-right font-bold">Total {month}</TableCell>
                                                  <TableCell className="text-right font-bold">{formatCurrency(data.total)}</TableCell>
                                              </TableRow>
                                          </TableFooter>
                                      </Table>
                                  </div>
                                  ))}
                                  <div className="flex justify-between items-center bg-gray-100 p-2 mt-4 rounded-md">
                                      <span className="font-bold text-lg">Total Pagado</span>
                                      <span className="font-bold text-lg">{formatCurrency(printingReport.totalPaid)}</span>
                                  </div>
                              </div>
                          </div>
                          <div className="mt-8 bg-gray-100 p-4 rounded-lg self-center">
                                  <div className="flex justify-between items-center">
                                      <span className="text-xl font-bold">SALDO PENDIENTE TOTAL</span>
                                      <span className="text-xl font-bold">{formatCurrency(printingReport.pendingBalance)}</span>
                                  </div>
                              </div>

                          <div className="space-y-6 mt-8">
                              {allDocuments.filter(d => d.type === 'O/C').map(doc => {
                                  const docTotalKilos = doc.items?.reduce((sum, item) => item.unit === 'Kilos' ? sum + item.quantity : sum, 0) || 0;
                                  const docTotalPackages = doc.items?.reduce((sum, item) => sum + (item.packagingQuantity || 0), 0) || 0;
                                  return (
                                      <div key={doc.id} className="print-order-section">
                                          <h3 className="text-lg font-bold mb-2 border-b pb-2">Detalle Orden de Compra: {doc.id} <span className="text-base font-normal">({format(parseISO(doc.date), 'dd-MM-yyyy')})</span></h3>
                                          <Table>
                                              <TableHeader>
                                                  <TableRow>
                                                      <TableHead className="font-bold">Producto</TableHead>
                                                      <TableHead className="font-bold">Calibre</TableHead>
                                                      <TableHead className="text-right font-bold">Envases</TableHead>
                                                      <TableHead className="text-right font-bold">Kilos</TableHead>
                                                      <TableHead className="text-right font-bold">Precio/kg</TableHead>
                                                      <TableHead className="text-right font-bold">Subtotal</TableHead>
                                                  </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                  {doc.items?.map((item, idx) => (
                                                      <TableRow key={item.id || idx}>
                                                          <TableCell>{item.product}</TableCell>
                                                          <TableCell>{item.caliber}</TableCell>
                                                          <TableCell className="text-right">{item.packagingQuantity || 0}</TableCell>
                                                          <TableCell className="text-right">{item.quantity || 0}</TableCell>
                                                          <TableCell className="text-right">{item.unit === 'Kilos' ? formatCurrency(item.price) : '-'}</TableCell>
                                                          <TableCell className="text-right">{formatCurrency(item.quantity * item.price)}</TableCell>
                                                      </TableRow>
                                                  ))}
                                              </TableBody>
                                              <TableFooter>
                                                  <TableRow>
                                                      <TableHead colSpan={2} className="text-right font-bold text-base">Totales O/C</TableHead>
                                                      <TableHead className="text-right font-bold text-base">{docTotalPackages.toLocaleString('es-CL')}</TableHead>
                                                      <TableHead className="text-right font-bold text-base">{docTotalKilos.toLocaleString('es-CL')} kg</TableHead>
                                                      <TableHead colSpan={1}></TableHead>
                                                      <TableHead className="text-right font-bold text-base">{formatCurrency(doc.amount)}</TableHead>
                                                  </TableRow>
                                              </TableFooter>
                                          </Table>
                                      </div>
                                  )
                              })}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-8 mt-8">
                              <div className="bg-gray-50 p-4 rounded-lg print-order-section">
                                  <h3 className="text-lg font-bold mb-2 text-center">Resumen Total de Ventas</h3>
                                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                      <div className="font-bold">Total Kilos Vendidos:</div>
                                      <div className="text-right font-bold">{totalKilos.toLocaleString('es-CL')} kg</div>
                                      <div className="font-bold">Total Envases:</div>
                                      <div className="text-right font-bold">{totalPackages.toLocaleString('es-CL')}</div>
                                      <div className="font-bold">Valor Total Venta:</div>
                                      <div className="text-right font-bold text-base">{formatCurrency(totalValue)}</div>
                                      <div className="font-bold">Precio Promedio por Kilo:</div>
                                      <div className="text-right font-bold text-base">{formatCurrency(avgPricePerKg)}</div>
                                  </div>
                              </div>
                              <div>
                                  <h3 className="text-lg font-bold mb-4 border-b pb-2">Resumen de Pagos</h3>
                                  {groupedPayments && Object.entries(groupedPayments).map(([month, data]) => (
                                  <div key={month} className="mb-4">
                                      <h4 className="font-bold text-md mb-2 capitalize">{month}</h4>
                                      <Table>
                                          <TableBody>
                                              {data.payments.map(payment => (
                                                  <TableRow key={payment.id}>
                                                      <TableCell className="w-[100px]">{format(parseISO(payment.date), "dd-MM-yyyy")}</TableCell>
                                                      <TableCell>{payment.description}</TableCell>
                                                      <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                                                  </TableRow>
                                              ))}
                                          </TableBody>
                                          <TableFooter>
                                              <TableRow>
                                                  <TableCell colSpan={2} className="text-right font-bold">Total {month}</TableCell>
                                                  <TableCell className="text-right font-bold">{formatCurrency(data.total)}</TableCell>
                                              </TableRow>
                                          </TableFooter>
                                      </Table>
                                  </div>
                                  ))}
                                  <div className="flex justify-between items-center bg-gray-100 p-2 mt-4 rounded-md">
                                      <span className="font-bold text-lg">Total Pagado</span>
                                      <span className="font-bold text-lg">{formatCurrency(printingReport.totalPaid)}</span>
                                  </div>
                              </div>
                          </div>
                          <div className="mt-8 bg-gray-100 p-4 rounded-lg self-center">
                                  <div className="flex justify-between items-center">
                                      <span className="text-xl font-bold">SALDO PENDIENTE TOTAL</span>
                                      <span className="text-xl font-bold">{formatCurrency(printingReport.pendingBalance)}</span>
                                  </div>
                              </div>
                          <div className="space-y-6 mt-8">
                              {allDocuments.filter(d => d.type === 'O/V').map(doc => {
                                  const docTotalKilos = doc.items?.reduce((sum, item) => item.unit === 'Kilos' ? sum + item.quantity : sum, 0) || 0;
                                  const docTotalPackages = doc.items?.reduce((sum, item) => sum + (item.packagingQuantity || 0), 0) || 0;
                                  return (
                                      <div key={doc.id} className="print-order-section">
                                          <h3 className="text-lg font-bold mb-2 border-b pb-2">Detalle Orden de Venta: {doc.id} <span className="text-base font-normal">({format(parseISO(doc.date), 'dd-MM-yyyy')})</span></h3>
                                          <Table>
                                              <TableHeader>
                                                  <TableRow>
                                                      <TableHead className="font-bold">Producto</TableHead>
                                                      <TableHead className="font-bold">Calibre</TableHead>
                                                      <TableHead className="text-right font-bold">Envases</TableHead>
                                                      <TableHead className="text-right font-bold">Kilos</TableHead>
                                                      <TableHead className="text-right font-bold">Precio/kg</TableHead>
                                                      <TableHead className="text-right font-bold">Subtotal</TableHead>
                                                  </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                  {doc.items?.map((item, idx) => (
                                                      <TableRow key={item.id || idx}>
                                                          <TableCell>{item.product}</TableCell>
                                                          <TableCell>{item.caliber}</TableCell>
                                                          <TableCell className="text-right">{item.packagingQuantity || 0}</TableCell>
                                                          <TableCell className="text-right">{item.quantity || 0}</TableCell>
                                                          <TableCell className="text-right">{item.unit === 'Kilos' ? formatCurrency(item.price) : '-'}</TableCell>
                                                          <TableCell className="text-right">{formatCurrency(item.quantity * item.price)}</TableCell>
                                                      </TableRow>
                                                  ))}
                                              </TableBody>
                                              <TableFooter>
                                                  <TableRow>
                                                      <TableHead colSpan={2} className="text-right font-bold text-base">Totales O/V</TableHead>
                                                      <TableHead className="text-right font-bold text-base">{docTotalPackages.toLocaleString('es-CL')}</TableHead>
                                                      <TableHead className="text-right font-bold text-base">{docTotalKilos.toLocaleString('es-CL')} kg</TableHead>
                                                      <TableHead colSpan={1}></TableHead>
                                                      <TableHead className="text-right font-bold text-base">{formatCurrency(doc.amount)}</TableHead>
                                                  </TableRow>
                                              </TableFooter>
                                          </Table>
                                      </div>
                                  )
                              })}
                          </div>
                        </>
                      )}
                  </div>
              )}
          </div>
        </div>
    </div>
  );
}
