
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { financialMovements as initialFinancialMovements, purchaseOrders as initialPurchaseOrders, salesOrders as initialSalesOrders, serviceOrders as initialServiceOrders, contacts as initialContacts } from '@/lib/data';
import { FinancialMovement, PurchaseOrder, SalesOrder, ServiceOrder, Contact, BankAccount } from '@/lib/types';
import { getColumns } from './components/columns';
import { DataTable } from './components/data-table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, FilterX, MoreHorizontal, ChevronDown, Eye, ArrowRightCircle, Wallet, Download, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useMasterData } from '@/hooks/use-master-data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

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

  useEffect(() => {
    setIsClient(true);
  }, []);

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


  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
            <div>
              <h1 className="font-headline text-3xl">Tesorería y Movimientos Bancarios</h1>
              <p className="text-muted-foreground">Registra todos los ingresos, egresos y traspasos de la empresa.</p>
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

        <Card>
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
        
        <Card>
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
    </>
  );
}

    
