

"use client";

import { useState, useEffect, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { financialMovements as initialFinancialMovements, purchaseOrders as initialPurchaseOrders, salesOrders as initialSalesOrders, serviceOrders as initialServiceOrders, contacts as initialContacts } from '@/lib/data';
import { FinancialMovement, PurchaseOrder, SalesOrder, ServiceOrder, Contact, BankAccount } from '@/lib/types';
import { getColumns } from './components/columns';
import { DataTable } from './components/data-table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, FilterX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useMasterData } from '@/hooks/use-master-data';

type AccountSummary = {
    id: string;
    name: string;
    owner?: string;
    initialBalance: number;
    totalIncome: number;
    totalExpense: number;
    finalBalance: number;
}

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
  const [filter, setFilter] = useState<{ type: 'income' | 'expense', accountId: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const accountSummariesByOwner = useMemo((): Record<string, AccountSummary[]> => {
    if (!isClient) return {};
    
    const summaries = bankAccounts.map(account => {
        const totalIncome = financialMovements
            .filter(m => m.destinationAccountId === account.id)
            .reduce((sum, m) => sum + m.amount, 0);

        const totalExpense = financialMovements
            .filter(m => m.sourceAccountId === account.id)
            .reduce((sum, m) => sum + m.amount, 0);
            
        const finalBalance = account.initialBalance + totalIncome - totalExpense;

        return {
            id: account.id,
            name: account.name,
            owner: account.owner,
            initialBalance: account.initialBalance,
            totalIncome,
            totalExpense,
            finalBalance,
        };
    });

    return summaries.reduce((acc, summary) => {
        const owner = summary.owner || 'General';
        if (!acc[owner]) {
            acc[owner] = [];
        }
        acc[owner].push(summary);
        return acc;
    }, {} as Record<string, AccountSummary[]>);

  }, [financialMovements, bankAccounts, isClient]);


  const handleSaveMovement = (data: FinancialMovement | Omit<FinancialMovement, 'id'> | Omit<FinancialMovement, 'id'>[]) => {
    const lastId = financialMovements.reduce((max, m) => Math.max(max, parseInt(m.id.split('-')[1])), 0);
    let nextId = lastId + 1;

    if (Array.isArray(data)) {
        const newMovements: FinancialMovement[] = data.map((movement, index) => ({
            ...movement,
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
      contactName: contacts.find(c => c.id === m.contactId)?.name || ''
    }));
  }, [financialMovements, contacts]);

  const filteredData = useMemo(() => {
    if (!filter) {
        return dataWithContactNames;
    }
    if (filter.type === 'income') {
        return dataWithContactNames.filter(m => m.destinationAccountId === filter.accountId);
    } else {
        return dataWithContactNames.filter(m => m.sourceAccountId === filter.accountId);
    }
  }, [dataWithContactNames, filter]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(value);

  const columns = getColumns({ onEdit: handleEdit, onDelete: handleDelete, bankAccounts });

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
            <div>
              <h1 className="font-headline text-3xl">Tesorería y Movimientos Bancarios</h1>
              <p className="text-muted-foreground">Registra todos los ingresos, egresos y transferencias de la empresa.</p>
            </div>
            <Button onClick={openNewMovementSheet}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Movimiento
            </Button>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Resumen por Cuenta</CardTitle>
                <CardDescription>Saldos y movimientos totales para cada cuenta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 {!isClient ? Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-48" />) :
                 Object.entries(accountSummariesByOwner).map(([owner, summaries]) => (
                     <div key={owner}>
                         <h3 className="text-lg font-semibold mb-2 font-headline">{owner}</h3>
                         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {summaries.map(acc => (
                                <Card key={acc.id} className="flex flex-col">
                                    <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">{acc.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <p className="text-2xl font-bold">{formatCurrency(acc.finalBalance)}</p>
                                            <p className="text-xs text-muted-foreground">Saldo Actual</p>
                                        </div>
                                        <div className="mt-4 text-sm space-y-1">
                                            <div 
                                                className="flex justify-between items-center hover:bg-muted p-1 rounded-md cursor-pointer"
                                                onClick={() => setFilter({ type: 'income', accountId: acc.id })}
                                            >
                                                <span className="flex items-center gap-1 text-green-600"><ArrowUpCircle className="h-4 w-4" /> Ingresos</span>
                                                <span>{formatCurrency(acc.totalIncome)}</span>
                                            </div>
                                            <div 
                                                className="flex justify-between items-center hover:bg-muted p-1 rounded-md cursor-pointer"
                                                onClick={() => setFilter({ type: 'expense', accountId: acc.id })}
                                            >
                                                <span className="flex items-center gap-1 text-red-600"><ArrowDownCircle className="h-4 w-4" /> Egresos</span>
                                                <span>{formatCurrency(acc.totalExpense)}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                         </div>
                     </div>
                 ))
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
                                Mostrando {filter.type === 'income' ? 'ingresos' : 'egresos'} de la cuenta "{bankAccounts.find(a => a.id === filter.accountId)?.name}"
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
                {isClient ? <DataTable columns={columns} data={filteredData} filterPlaceholder="Filtrar por centro de costo..." /> : <Skeleton className="h-64 w-full" />}
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

    

    