
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { financialMovements as initialFinancialMovements, purchaseOrders as initialPurchaseOrders, salesOrders as initialSalesOrders, serviceOrders as initialServiceOrders, contacts as initialContacts } from '@/lib/data';
import { FinancialMovement, PurchaseOrder, SalesOrder, ServiceOrder, Contact, BankAccount } from '@/lib/types';
import { getColumns } from './components/columns';
import { NewFinancialMovementSheet } from './components/new-financial-movement-sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, FilterX, MoreHorizontal, ChevronDown, Eye, ArrowRightCircle, Wallet, Download, Trash2, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useMasterData } from '@/hooks/use-master-data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


type AccountSummary = {
    id: string;
    name: string;
    owner?: string;
    initialBalance: number;
    totalIncome: number;
    totalExpense: number;
    transfersIn: number;
    transfersOut: number;
    finalBalance: number;
}

type GroupedMovement = {
    contactName: string;
    movements: (FinancialMovement & { contactName?: string })[];
    subtotal: number;
};

type DocumentDetail = {
  id: string;
  date: string;
  type: 'O/C' | 'O/S' | 'O/V';
  amount: number;
  items?: any[]; // Simplified for this component
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

export default function FinancialsPage() {
  const [financialMovements, setFinancialMovements] = useLocalStorage<FinancialMovement[]>('financialMovements', initialFinancialMovements);
  const [purchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [salesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
  const [serviceOrders] = useLocalStorage<ServiceOrder[]>('serviceOrders', initialServiceOrders);
  const [contacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
  const { bankAccounts } = useMasterData();
  
  const [editingMovement, setEditingMovement] = useState<FinancialMovement | null>(null);
  const [deletingMovement, setDeletingMovement] = useState<FinancialMovement | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [filter, setFilter] = useState<{ type: 'income' | 'expense' | 'traspaso_in' | 'traspaso_out', accountId: string } | null>(null);
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const [clientReports, setClientReports] = useState<ReportData[]>([]);
  const [supplierReports, setSupplierReports] = useState<ReportData[]>([]);
  const [clientFilter, setClientFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
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
      }, 200);
    }
  }, [printingReport]);

  useEffect(() => {
    if (isClient) {
      const clients = contacts.filter(c => c.type.includes('client'));
      const clientReportData = clients.map(client => {
        const clientSalesOrders = salesOrders
          .filter(so => so.clientId === client.id && (so.status === 'completed' || so.status === 'pending'))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const clientDocuments: DocumentDetail[] = clientSalesOrders
            .map(so => ({ id: so.id, date: so.date, type: 'O/V' as const, amount: so.totalAmount, items: so.items }));

        const totalBilled = clientDocuments.reduce((sum, doc) => sum + doc.amount, 0);
        
        const clientMovements = financialMovements.filter(fm => fm.type === 'income' && fm.contactId === client.id);
        const totalPaid = clientMovements.reduce((sum, movement) => sum + movement.amount, 0);
          
        const pendingBalance = totalBilled - totalPaid;

        let status: ReportData['status'] = 'Pendiente';
        if (totalBilled > 0) {
            if (pendingBalance <= 1) { // Use epsilon for float comparison
              status = 'Pagado';
            } else if (totalPaid > 0) {
              status = 'Abono';
            }
        } else if (totalPaid > 0) {
            status = 'Abono'; // Paid more than billed
        }

         return {
          contactId: client.id,
          contactName: client.name,
          totalBilled,
          totalPaid,
          pendingBalance,
          status,
          documents: clientDocuments.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
          payments: clientMovements.map(p => ({ id: p.id, date: p.date, description: p.description, amount: p.amount })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        };
      }).filter(r => r.totalBilled > 0 || r.totalPaid > 0);
      setClientReports(clientReportData);

      const suppliers = contacts.filter(c => c.type.includes('supplier'));
      const supplierReportData = suppliers.map(supplier => {
        const supplierPurchaseOrders = purchaseOrders.filter(po => po.supplierId === supplier.id && (po.status === 'completed' || po.status === 'pending'));
        const supplierServiceOrders = serviceOrders.filter(so => {
            const contact = contacts.find(c => c.name === so.provider);
            return contact?.id === supplier.id;
        });

        const supplierDocuments: DocumentDetail[] = [
            ...supplierPurchaseOrders.map(po => ({ id: po.id, date: po.date, type: 'O/C' as const, amount: po.totalAmount, items: po.items })),
            ...supplierServiceOrders.map(so => ({ id: so.id, date: so.date, type: 'O/S' as const, amount: so.cost })),
        ];

        const totalBilled = supplierDocuments.reduce((sum, doc) => sum + doc.amount, 0);
        
        const supplierMovements = financialMovements.filter(fm => fm.type === 'expense' && fm.contactId === supplier.id);
        const totalPaid = supplierMovements.reduce((sum, movement) => sum + movement.amount, 0);
          
        const pendingBalance = totalBilled - totalPaid;

        let status: ReportData['status'] = 'Pendiente';
        if (totalBilled > 0) {
            if (pendingBalance <= 1) { // Use epsilon for float comparison
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
          documents: supplierDocuments.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
          payments: supplierMovements.map(p => ({ id: p.id, date: p.date, description: p.description, amount: p.amount })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        };
      }).filter(r => r.totalBilled > 0 || r.totalPaid > 0);
      setSupplierReports(supplierReportData);
    }
  }, [contacts, purchaseOrders, salesOrders, serviceOrders, financialMovements, isClient]);

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

  const { accountSummariesByOwner } = useMemo(() => {
    if (!isClient) return { accountSummariesByOwner: {} };
    
    const summaries = bankAccounts.map(account => {
        const totalIncome = financialMovements
            .filter(m => m.destinationAccountId === account.id && m.type === 'income')
            .reduce((sum, m) => sum + m.amount, 0);

        const totalExpense = financialMovements
            .filter(m => m.sourceAccountId === account.id && m.type === 'expense')
            .reduce((sum, m) => sum + m.amount, 0);

        const transfersIn = financialMovements
            .filter(m => m.destinationAccountId === account.id && m.type === 'traspaso')
            .reduce((sum, m) => sum + m.amount, 0);
        
        const transfersOut = financialMovements
            .filter(m => m.sourceAccountId === account.id && m.type === 'traspaso')
            .reduce((sum, m) => sum + m.amount, 0);
            
        const finalBalance = account.initialBalance + totalIncome - totalExpense + transfersIn - transfersOut;

        return {
            id: account.id,
            name: account.name,
            owner: account.owner,
            initialBalance: account.initialBalance,
            totalIncome,
            totalExpense,
            transfersIn,
            transfersOut,
            finalBalance,
        };
    });
    
    const groupedByOwner = summaries.reduce((acc, summary) => {
        const owner = summary.owner || 'General';
        if (!acc[owner]) {
            acc[owner] = [];
        }
        acc[owner].push(summary);
        return acc;
    }, {} as Record<string, AccountSummary[]>);
    
    if (groupedByOwner['Viña Negra SpA']) {
        const mainAccounts = groupedByOwner['Viña Negra SpA'];
        const generalSummaryData = mainAccounts.reduce((acc, summary) => {
            acc.initialBalance += summary.initialBalance;
            acc.totalIncome += summary.totalIncome;
            acc.totalExpense += summary.totalExpense;
            acc.transfersIn += summary.transfersIn;
            acc.transfersOut += summary.transfersOut;
            acc.finalBalance += summary.finalBalance;
            return acc;
        }, {
            id: 'general', name: 'Resumen General (Cuentas Principales)', initialBalance: 0, totalIncome: 0, totalExpense: 0, transfersIn: 0, transfersOut: 0, finalBalance: 0, owner: 'Viña Negra SpA'
        });
        // Add general summary to the beginning of the array
        groupedByOwner['Viña Negra SpA'] = [generalSummaryData, ...mainAccounts];
    }


    return { accountSummariesByOwner: groupedByOwner };

  }, [financialMovements, bankAccounts, isClient]);


  const handleSaveMovement = (data: FinancialMovement | Omit<FinancialMovement, 'id'> | Omit<FinancialMovement, 'id'>[]) => {
    const lastId = financialMovements.reduce((max, m) => Math.max(max, parseInt(m.id.split('-')[1])), 0);
    let nextId = lastId + 1;

    if (Array.isArray(data)) {
        const newMovements: FinancialMovement[] = data.map((movement, index) => ({
            ...(movement as Omit<FinancialMovement, 'id'>),
            id: `M-${nextId + index}`,
        }));
        setFinancialMovements(prev => [...prev, ...newMovements]);
        toast({ title: `${newMovements.length} Movimientos Creados` });

    } else if ('id' in data) {
      // Update
      setFinancialMovements(prev => prev.map(m => m.id === data.id ? data : m));
      toast({ title: "Movimiento Actualizado" });
    } else {
      // Add single
      const newMovement = {
        ...data,
        id: `M-${nextId}`,
      };
      setFinancialMovements(prev => [...prev, newMovement]);
      toast({ title: "Movimiento Creado" });
    }

    setIsSheetOpen(false);
    setEditingMovement(null);
  };

  const handleEdit = (movement: FinancialMovement) => {
    setEditingMovement(movement);
    setIsSheetOpen(true);
  };

  const handleDelete = (movement: FinancialMovement) => {
    setDeletingMovement(movement);
  };
  
  const confirmDelete = () => {
    if (deletingMovement) {
      setFinancialMovements((prev) => prev.filter((m) => m.id !== deletingMovement.id));
      toast({ variant: "destructive", title: "Movimiento Eliminado" });
      setDeletingMovement(null);
      setIsSheetOpen(false);
      setEditingMovement(null);
    }
  }

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setEditingMovement(null);
    }
  }
  
  const openNewMovementSheet = () => {
    setEditingMovement(null);
    setIsSheetOpen(true);
  }

  const dataWithContactNames = useMemo(() => {
    return financialMovements.map(m => ({
      ...m,
      contactName: contacts.find(c => c.id === m.contactId)?.name || 'Sin Contacto Asociado'
    }));
  }, [financialMovements, contacts]);

  const filteredData = useMemo(() => {
    if (!filter) {
        return dataWithContactNames;
    }
    switch (filter.type) {
        case 'income':
            return dataWithContactNames.filter(m => m.destinationAccountId === filter.accountId && m.type === 'income');
        case 'expense':
            return dataWithContactNames.filter(m => m.sourceAccountId === filter.accountId && m.type === 'expense');
        case 'traspaso_in':
            return dataWithContactNames.filter(m => m.destinationAccountId === filter.accountId && m.type === 'traspaso');
        case 'traspaso_out':
            return dataWithContactNames.filter(m => m.sourceAccountId === filter.accountId && m.type === 'traspaso');
        default:
            return dataWithContactNames;
    }
  }, [dataWithContactNames, filter]);

  const { groupedIncome, totalIncome } = useMemo(() => {
    const incomeMovements = filteredData.filter(m => m.type === 'income');
    const groups: Record<string, GroupedMovement> = {};

    incomeMovements.forEach(m => {
      const contactName = m.contactName || 'Ingresos sin contacto';
      if (!groups[contactName]) {
        groups[contactName] = { contactName, movements: [], subtotal: 0 };
      }
      groups[contactName].movements.push(m);
      groups[contactName].subtotal += m.amount;
    });

    const totalIncome = incomeMovements.reduce((sum, m) => sum + m.amount, 0);
    return { groupedIncome: Object.values(groups).sort((a,b) => a.contactName.localeCompare(b.contactName)), totalIncome };
  }, [filteredData]);

  const { groupedExpenses, totalExpenses } = useMemo(() => {
    const expenseMovements = filteredData.filter(m => m.type === 'expense');
    const groups: Record<string, GroupedMovement> = {};

    expenseMovements.forEach(m => {
      const contactName = m.contactName || 'Egresos sin contacto';
      if (!groups[contactName]) {
        groups[contactName] = { contactName, movements: [], subtotal: 0 };
      }
      groups[contactName].movements.push(m);
      groups[contactName].subtotal += m.amount;
    });

    const totalExpenses = expenseMovements.reduce((sum, m) => sum + m.amount, 0);
    return { groupedExpenses: Object.values(groups).sort((a,b) => a.contactName.localeCompare(b.contactName)), totalExpenses };
  }, [filteredData]);
  
  const { traspasos, totalTraspasado } = useMemo(() => {
    const traspasoMovements = filteredData.filter(m => m.type === 'traspaso');
    const total = traspasoMovements.reduce((sum, m) => sum + m.amount, 0);
    return { traspasos: traspasoMovements.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), totalTraspasado: total };
  }, [filteredData]);

  const handleExport = () => {
    if (dataWithContactNames.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'No hay movimientos para exportar.' });
      return;
    }

    const formatMovement = (m: FinancialMovement & { contactName?: string }) => ({
      'ID Movimiento': m.id,
      'Fecha': format(parseISO(m.date), 'dd-MM-yyyy'),
      'Tipo': m.type,
      'Centro de Costo': m.description,
      'Monto': m.amount,
      'Forma de Pago': m.paymentMethod,
      'Cuenta Origen': bankAccounts.find(a => a.id === m.sourceAccountId)?.name || '',
      'Cuenta Destino': bankAccounts.find(a => a.id === m.destinationAccountId)?.name || '',
      'Contacto Asociado': m.contactName,
      'Documento Relacionado': m.relatedDocument ? `${m.relatedDocument.type}-${m.relatedDocument.id}` : '',
      'Concepto Interno': m.internalConcept || '',
      'Referencia': m.reference || '',
    });

    const incomeSheet = dataWithContactNames.filter(m => m.type === 'income').map(formatMovement);
    const expenseSheet = dataWithContactNames.filter(m => m.type === 'expense').map(formatMovement);
    const transferSheet = dataWithContactNames.filter(m => m.type === 'traspaso').map(formatMovement);

    const wb = XLSX.utils.book_new();

    const addSheet = (data: any[], name: string) => {
        if (data.length === 0) return;
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, name);
    };

    addSheet(incomeSheet, 'Ingresos');
    addSheet(expenseSheet, 'Egresos');
    addSheet(transferSheet, 'Traspasos');

    XLSX.writeFile(wb, `Tesorería_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({ title: 'Exportación Exitosa', description: 'Se ha exportado la base de datos de tesorería.' });
  };


  const toggleCollapsible = (id: string) => {
    setOpenCollapsibles(prev => ({ ...prev, [id]: !prev[id] }));
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(value);

  const columns = getColumns({ onEdit: handleEdit, onDelete: handleDelete, bankAccounts });

  const renderMovementGroup = (groups: GroupedMovement[], type: 'income' | 'expense') => {
    return groups.map(group => (
      <React.Fragment key={`${type}-${group.contactName}`}>
        <TableRow className="cursor-pointer bg-muted/20 hover:bg-muted/30" onClick={() => toggleCollapsible(`${type}-${group.contactName}`)}>
          <TableCell className='font-bold' colSpan={5}>
            <div className="flex items-center gap-2">
              <ChevronDown className={cn("h-4 w-4 transition-transform", openCollapsibles[`${type}-${group.contactName}`] && "rotate-180")} />
              {group.contactName}
            </div>
          </TableCell>
          <TableCell className='text-right font-bold'>{formatCurrency(group.subtotal)}</TableCell>
        </TableRow>
        {openCollapsibles[`${type}-${group.contactName}`] && (
          group.movements.map(m => (
            <TableRow key={m.id} className="bg-background hover:bg-muted/50 cursor-pointer" onClick={() => handleEdit(m)}>
              <TableCell className="pl-12">{format(parseISO(m.date), 'dd-MM-yyyy', { locale: es })}</TableCell>
              <TableCell>{m.description}</TableCell>
              <TableCell>{m.paymentMethod}</TableCell>
              <TableCell>
                {m.relatedDocument ? `${m.relatedDocument.type}-${m.relatedDocument.id}` : m.internalConcept || '-'}
              </TableCell>
              <TableCell>{bankAccounts.find(a => a.id === (type === 'income' ? m.destinationAccountId : m.sourceAccountId))?.name || 'N/A'}</TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(m.amount)}</TableCell>
            </TableRow>
          ))
        )}
      </React.Fragment>
    ));
  };

  const handlePrintRequest = (report: ReportData) => {
    setPrintingReport(report);
  };
  
    const totalKilosForChart = printingReport?.documents.flatMap(d => d.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

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
  
  const renderGenericReportRows = (data: ReportData[], filter: string) => {
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
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-semibold mb-2 text-sm">Documentos Emitidos</h4>
                        <div className="border rounded-md max-h-60 overflow-y-auto">
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
                                            <TableCell className="text-xs">{doc.type}-{doc.id.split('-')[1]}</TableCell>
                                            <TableCell className="text-xs">{format(parseISO(doc.date), "dd-MM-yyyy", { locale: es })}</TableCell>
                                            <TableCell className="text-right text-xs">{formatCurrency(doc.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2 text-sm">Pagos {item.documents.some(d => d.type === 'O/V') ? 'Recibidos' : 'Realizados'}</h4>
                         <div className="border rounded-md max-h-60 overflow-y-auto">
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
                                            <TableCell className="text-xs">{format(parseISO(payment.date), "dd-MM-yyyy", { locale: es })}</TableCell>
                                            <TableCell className="text-right text-xs">{formatCurrency(payment.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </TableCell>
          </tr>
        )}
      </React.Fragment>
    ));
  };


  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
            <div>
              <h1 className="font-headline text-3xl">Tesorería y Cuentas</h1>
              <p className="text-muted-foreground">Registra movimientos bancarios y gestiona las cuentas corrientes comerciales.</p>
            </div>
             <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Exportar a Excel
              </Button>
              <Button onClick={openNewMovementSheet}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Movimiento
              </Button>
            </div>
        </div>

        <Tabs defaultValue="movements">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="movements">Movimientos de Tesorería</TabsTrigger>
            <TabsTrigger value="accounts">Cuentas Corrientes</TabsTrigger>
          </TabsList>
          <TabsContent value="movements">
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Resumen por Cuenta</CardTitle>
                    <CardDescription>Saldos y movimientos totales para cada cuenta. Haga clic en un total para filtrar los movimientos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {!isClient ? Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-48" />) :
                    <>
                        {Object.entries(accountSummariesByOwner).map(([owner, summaries]) => (
                            <div key={owner}>
                                <h3 className="text-lg font-semibold mb-2 font-headline">{owner}</h3>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {summaries.map(acc => (
                                        <Card key={acc.id} className="flex flex-col">
                                            <CardHeader className="pb-2">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                {acc.id === 'general' && <Wallet className="h-5 w-5"/>}
                                                {acc.name}
                                            </CardTitle>
                                            </CardHeader>
                                            <CardContent className="flex-1 flex flex-col justify-between">
                                                <div>
                                                    <p className="text-2xl font-bold">{formatCurrency(acc.finalBalance)}</p>
                                                    <p className="text-xs text-muted-foreground">Saldo Actual</p>
                                                </div>
                                                <div className="mt-4 text-sm space-y-1">
                                                    <div 
                                                        className={cn("flex justify-between items-center hover:bg-muted p-1 rounded-md", acc.id !== 'general' && 'cursor-pointer')}
                                                        onClick={() => acc.id !== 'general' && setFilter({ type: 'income', accountId: acc.id })}
                                                    >
                                                        <span className="flex items-center gap-1 text-green-600"><ArrowUpCircle className="h-4 w-4" /> Ingresos</span>
                                                        <span>{formatCurrency(acc.totalIncome)}</span>
                                                    </div>
                                                    <div 
                                                        className={cn("flex justify-between items-center hover:bg-muted p-1 rounded-md", acc.id !== 'general' && 'cursor-pointer')}
                                                        onClick={() => acc.id !== 'general' && setFilter({ type: 'expense', accountId: acc.id })}
                                                    >
                                                        <span className="flex items-center gap-1 text-red-600"><ArrowDownCircle className="h-4 w-4" /> Egresos</span>
                                                        <span>{formatCurrency(acc.totalExpense)}</span>
                                                    </div>
                                                    <div 
                                                        className={cn("flex justify-between items-center hover:bg-muted p-1 rounded-md", acc.id !== 'general' && 'cursor-pointer')}
                                                        onClick={() => acc.id !== 'general' && setFilter({ type: 'traspaso_in', accountId: acc.id })}
                                                    >
                                                        <span className="flex items-center gap-1 text-blue-500"><ArrowRightCircle className="h-4 w-4" /> Traspasos (Recibidos)</span>
                                                        <span className='text-blue-500'>{formatCurrency(acc.transfersIn)}</span>
                                                    </div>
                                                    <div 
                                                        className={cn("flex justify-between items-center hover:bg-muted p-1 rounded-md", acc.id !== 'general' && 'cursor-pointer')}
                                                        onClick={() => acc.id !== 'general' && setFilter({ type: 'traspaso_out', accountId: acc.id })}
                                                    >
                                                        <span className="flex items-center gap-1 text-orange-500"><ArrowRightCircle className="h-4 w-4 -rotate-180" /> Traspasos (Enviados)</span>
                                                        <span className='text-orange-500'>{formatCurrency(acc.transfersOut)}</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </>
                    }
                </CardContent>
            </Card>
            
            <Card className="mt-6">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Movimientos Registrados</CardTitle>
                            {filter ? (
                                <CardDescription>
                                    Mostrando {filter.type.startsWith('traspaso') ? 'traspasos' : filter.type === 'income' ? 'ingresos' : 'egresos'} en la cuenta "{bankAccounts.find(a => a.id === filter.accountId)?.name}"
                                </CardDescription>
                            ) : (
                                <CardDescription>Todos los movimientos registrados en el período.</CardDescription>
                            )}
                        </div>
                        {filter && (
                            <Button variant="outline" size="sm" onClick={() => setFilter(null)}>
                                <FilterX className="mr-2 h-4 w-4" />
                                Limpiar Filtro
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                {!isClient ? <Skeleton className="h-64 w-full" /> : (
                    <div className="space-y-8">
                        {/* Income Table */}
                        <div>
                            <h3 className="font-headline text-xl mb-2">Ingresos</h3>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[120px]">Fecha</TableHead>
                                            <TableHead>Descripción</TableHead>
                                            <TableHead>Forma Pago</TableHead>
                                            <TableHead>Doc/Concepto</TableHead>
                                            <TableHead>Cta. Destino</TableHead>
                                            <TableHead className="text-right">Monto</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groupedIncome.length > 0 ? renderMovementGroup(groupedIncome, 'income') : <TableRow><TableCell colSpan={6} className="h-24 text-center">No hay ingresos que mostrar.</TableCell></TableRow>}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableHead colSpan={5} className="text-right font-bold text-lg">Total Ingresos</TableHead>
                                            <TableHead className="text-right font-bold text-lg">{formatCurrency(totalIncome)}</TableHead>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </div>
                        </div>

                        {/* Expenses Table */}
                        <div>
                            <h3 className="font-headline text-xl mb-2">Egresos</h3>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[120px]">Fecha</TableHead>
                                            <TableHead>Descripción</TableHead>
                                            <TableHead>Forma Pago</TableHead>
                                            <TableHead>Doc/Concepto</TableHead>
                                            <TableHead>Cta. Origen</TableHead>
                                            <TableHead className="text-right">Monto</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groupedExpenses.length > 0 ? renderMovementGroup(groupedExpenses, 'expense') : <TableRow><TableCell colSpan={6} className="h-24 text-center">No hay egresos que mostrar.</TableCell></TableRow>}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableHead colSpan={5} className="text-right font-bold text-lg">Total Egresos</TableHead>
                                            <TableHead className="text-right font-bold text-lg">{formatCurrency(totalExpenses)}</TableHead>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </div>
                        </div>

                        {/* Traspasos Table */}
                        <div>
                            <h3 className="font-headline text-xl mb-2">Traspasos entre Cuentas</h3>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[120px]">Fecha</TableHead>
                                            <TableHead>Descripción</TableHead>
                                            <TableHead>Cta. Origen</TableHead>
                                            <TableHead>Cta. Destino</TableHead>
                                            <TableHead className="text-right">Monto</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {traspasos.length > 0 ? (
                                            traspasos.map(m => (
                                                <TableRow key={m.id} className="cursor-pointer" onClick={() => handleEdit(m)}>
                                                    <TableCell>{format(parseISO(m.date), 'dd-MM-yyyy')}</TableCell>
                                                    <TableCell>{m.description}</TableCell>
                                                    <TableCell>{bankAccounts.find(a => a.id === m.sourceAccountId)?.name || 'N/A'}</TableCell>
                                                    <TableCell>{bankAccounts.find(a => a.id === m.destinationAccountId)?.name || 'N/A'}</TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(m.amount)}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay traspasos que mostrar.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableHead colSpan={4} className="text-right font-bold text-lg">Total Traspasado</TableHead>
                                            <TableHead className="text-right font-bold text-lg">{formatCurrency(totalTraspasado)}</TableHead>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </div>
                        </div>

                    </div>
                )}
                </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="accounts">
             <Card className="mt-6">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Cuentas por Cobrar (Clientes)</CardTitle>
                <CardDescription>Resumen de ventas, pagos y saldos pendientes de clientes.</CardDescription>
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
                      {renderGenericReportRows(clientReports, clientFilter)}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableHead className="text-right font-bold text-lg">Total General</TableHead>
                        <TableHead className="text-right font-bold text-lg">{formatCurrency(clientTotals.totalBilled)}</TableHead>
                        <TableHead className="text-right font-bold text-lg">{formatCurrency(clientTotals.totalPaid)}</TableHead>
                        <TableHead className="text-right font-bold text-lg">{formatCurrency(clientTotals.pendingBalance)}</TableHead>
                        <TableHead colSpan={2} />
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="font-headline text-2xl">Cuentas por Pagar (Proveedores)</CardTitle>
                  <CardDescription>Resumen de compras, servicios, pagos y saldos pendientes a proveedores.</CardDescription>
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
                          <TableHead className="text-right">Total Comprado/Servicios</TableHead>
                          <TableHead className="text-right">Total Pagado</TableHead>
                          <TableHead className="text-right">Saldo Pendiente</TableHead>
                          <TableHead className="text-center w-[100px]">Estado</TableHead>
                          <TableHead className="text-center w-[50px]">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {renderGenericReportRows(supplierReports, supplierFilter)}
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
          </TabsContent>
        </Tabs>
      </div>
      
      <NewFinancialMovementSheet 
        isOpen={isSheetOpen}
        onOpenChange={handleSheetOpenChange}
        onSave={handleSaveMovement}
        movement={editingMovement}
        allMovements={financialMovements}
        purchaseOrders={purchaseOrders}
        salesOrders={salesOrders}
        serviceOrders={serviceOrders}
        contacts={contacts}
        onDelete={handleDelete}
      />

      <AlertDialog open={!!deletingMovement} onOpenChange={(open) => !open && setDeletingMovement(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de que quieres eliminar este movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el movimiento
               "{deletingMovement?.description}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingMovement(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    </>
  );
}
