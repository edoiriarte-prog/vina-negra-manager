

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
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useMasterData } from '@/hooks/use-master-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import KpiCard from '../dashboard/components/kpi-card';


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
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  const incomeData = useMemo(() => dataWithContactNames.filter(m => m.type === 'income'), [dataWithContactNames]);
  const expenseData = useMemo(() => dataWithContactNames.filter(m => m.type === 'expense'), [dataWithContactNames]);

  const totalIncome = useMemo(() => incomeData.reduce((sum, m) => sum + m.amount, 0), [incomeData]);
  const totalExpense = useMemo(() => expenseData.reduce((sum, m) => sum + m.amount, 0), [expenseData]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(value);

  const columns = getColumns({ onEdit: handleEdit, onDelete: handleDelete, bankAccounts });

  const accountBalances = useMemo(() => {
    if (!isClient) return [];
    
    const balances = bankAccounts.map(account => {
        const balance = financialMovements.reduce((acc, mov) => {
            if (mov.accountId === account.id) {
                return acc + (mov.type === 'income' ? mov.amount : -mov.amount);
            }
            return acc;
        }, account.initialBalance);
        return { ...account, balance };
    });

    return balances;
  }, [isClient, bankAccounts, financialMovements]);

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
            <div>
              <h1 className="font-headline text-3xl">Tesorería y Movimientos Bancarios</h1>
              <p className="text-muted-foreground">Registra todos los ingresos y egresos de la empresa.</p>
            </div>
            <Button onClick={openNewMovementSheet}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Movimiento
            </Button>
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Resumen por Cuenta</CardTitle>
                <CardDescription>Saldos actuales de cada cuenta bancaria y de efectivo.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {isClient ? (
                        accountBalances.map(acc => (
                            <KpiCard
                                key={acc.id}
                                title={acc.name}
                                value={formatCurrency(acc.balance)}
                                icon={<Wallet className="h-5 w-5 text-blue-500" />}
                                description={`Tipo: ${acc.accountType}`}
                            />
                        ))
                    ) : (
                         Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-32 w-full" />
                        ))
                    )}
                </div>
            </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
            {isClient ? (
                <>
                <KpiCard
                    title="Total Ingresos"
                    value={formatCurrency(totalIncome)}
                    icon={<ArrowUpCircle className="h-5 w-5 text-green-500" />}
                    description="Suma de todos los movimientos de ingreso registrados."
                />
                <KpiCard
                    title="Total Egresos"
                    value={formatCurrency(totalExpense)}
                    icon={<ArrowDownCircle className="h-5 w-5 text-red-500" />}
                    description="Suma de todos los movimientos de egreso registrados."
                />
                </>
            ) : (
                <>
                 <Skeleton className="h-32 w-full" />
                 <Skeleton className="h-32 w-full" />
                </>
            )}
        </div>

        <Tabs defaultValue="income">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="income">Ingresos</TabsTrigger>
            <TabsTrigger value="expenses">Egresos</TabsTrigger>
          </TabsList>
          <TabsContent value="income">
            <Card>
              <CardHeader>
                <CardTitle>Ingresos Registrados</CardTitle>
                <CardDescription>Todos los movimientos de entrada de dinero.</CardDescription>
              </CardHeader>
              <CardContent>
                {isClient ? <DataTable columns={columns} data={incomeData} filterPlaceholder="Filtrar por centro de costo..." /> : <Skeleton className="h-64 w-full" />}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle>Egresos Registrados</CardTitle>
                <CardDescription>Todos los movimientos de salida de dinero.</CardDescription>
              </CardHeader>
              <CardContent>
                {isClient ? <DataTable columns={columns} data={expenseData} filterPlaceholder="Filtrar por centro de costo..." /> : <Skeleton className="h-64 w-full" />}
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
