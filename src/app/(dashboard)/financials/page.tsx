
"use client";

import React, { useState, useMemo, useId } from 'react';
import { useOperations } from '@/hooks/use-operations';
import { useMasterData } from '@/hooks/use-master-data';
import { FinancialMovement, BankAccount, Contact, PurchaseOrder, SalesOrder, ServiceOrder } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "./components/data-table";
import { getColumns } from "./components/columns";
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
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Landmark, 
  History,
  ArrowUpRight,
  ArrowDownLeft
} from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

// Formato Moneda
const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

export default function FinancialsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  // --- CARGA DE DATOS ---
  const { bankAccounts, contacts, isLoading: l1 } = useMasterData();
  const { financialMovements, purchaseOrders, salesOrders, serviceOrders, isLoading: l2 } = useOperations();

  const isLoading = l1 || l2;

  // --- ESTADOS ---
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<FinancialMovement | null>(null);
  const [deletingMovement, setDeletingMovement] = useState<FinancialMovement | null>(null);

  // --- CÁLCULOS DE SALDOS ---
  const { accountBalances, totalBalance, totalIncome, totalExpense } = useMemo(() => {
    if (!bankAccounts || !financialMovements) {
        return { accountBalances: {}, totalBalance: 0, totalIncome: 0, totalExpense: 0 };
    }
    
    const balances: Record<string, number> = {};
    let income = 0;
    let expense = 0;
    
    bankAccounts.forEach(acc => balances[acc.id] = acc.initialBalance || 0);

    financialMovements.forEach(m => {
        if (m.type === 'income' && m.destinationAccountId) {
            balances[m.destinationAccountId] += m.amount;
            income += m.amount;
        } else if (m.type === 'expense' && m.sourceAccountId) {
            balances[m.sourceAccountId] -= m.amount;
            expense += m.amount;
        } else if (m.type === 'traspaso' && m.sourceAccountId && m.destinationAccountId) {
            balances[m.sourceAccountId] -= m.amount;
            balances[m.destinationAccountId] += m.amount;
        }
    });

    const globalTotal = Object.values(balances).reduce((a, b) => a + b, 0);

    return { accountBalances: balances, totalBalance: globalTotal, totalIncome: income, totalExpense: expense };
  }, [bankAccounts, financialMovements]);

  // --- MANEJADORES ---
  const handleSaveMovement = (movementData: (FinancialMovement | Omit<FinancialMovement, 'id'>)[] | FinancialMovement | Omit<FinancialMovement, 'id'>) => {
    if (!firestore) return;

    if (Array.isArray(movementData)) {
        // Guardado en Lote
        movementData.forEach(mov => addDocumentNonBlocking(collection(firestore, 'financialMovements'), { ...mov, createdAt: new Date().toISOString() }));
        toast({ title: "Movimientos en Lote Guardados" });
    } else {
        // Guardado Individual
        const mov = { ...movementData, amount: Number(movementData.amount) || 0 };
        if ('id' in mov) {
            updateDocumentNonBlocking(doc(firestore, 'financialMovements', mov.id), mov);
            toast({ title: "Movimiento Actualizado" });
        } else {
            addDocumentNonBlocking(collection(firestore, 'financialMovements'), { ...mov, createdAt: new Date().toISOString() });
            toast({ title: "Movimiento Creado" });
        }
    }
    setIsSheetOpen(false);
    setEditingMovement(null);
  };
  
  const handleDeleteRequest = (movement: FinancialMovement) => {
      setDeletingMovement(movement);
  }

  const confirmDelete = () => {
      if (deletingMovement && firestore) {
          deleteDocumentNonBlocking(doc(firestore, 'financialMovements', deletingMovement.id));
          toast({ variant: 'destructive', title: 'Movimiento Eliminado' });
          setDeletingMovement(null);
      }
  }

  const handleEdit = (movement: FinancialMovement) => {
      setEditingMovement(movement);
      setIsSheetOpen(true);
  }
  
  const openNewMovementSheet = () => {
      setEditingMovement(null);
      setIsSheetOpen(true);
  }

  const movementsWithContactNames = useMemo(() => {
    return (financialMovements || []).map(mov => ({
      ...mov,
      contactName: contacts.find(c => c.id === mov.contactId)?.name,
    }));
  }, [financialMovements, contacts]);

  const columns = useMemo(() => getColumns({ onEdit: handleEdit, onDelete: handleDeleteRequest, bankAccounts }), [bankAccounts]);


  if (isLoading) return <div className="p-8 space-y-4"><Skeleton className="h-32 w-full"/><Skeleton className="h-64 w-full"/></div>;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-slate-950 min-h-screen text-slate-100">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Tesorería</h2>
            <p className="text-slate-400 mt-1">Gestión de Cajas y Bancos.</p>
        </div>
        <div className="flex gap-3">
            <Button 
                className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 font-semibold"
                onClick={openNewMovementSheet}
            >
                <Plus className="mr-2 h-4 w-4" /> Registrar Movimiento
            </Button>
        </div>
      </div>

      {/* --- SECCIÓN 1: BILLETERA (TARJETAS DE CUENTAS) --- */}
      <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-200">
              <Wallet className="h-5 w-5 text-blue-500" /> Mis Cuentas
              <div className="ml-auto flex gap-6 text-sm">
                  <div className="flex items-center gap-2"><ArrowDownLeft className="h-4 w-4 text-emerald-500" /> Ingresos: <span className="font-bold text-emerald-400">{formatCurrency(totalIncome)}</span></div>
                  <div className="flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-red-500" /> Egresos: <span className="font-bold text-red-400">{formatCurrency(totalExpense)}</span></div>
                  <div className="flex items-center gap-2"><Landmark className="h-4 w-4 text-slate-400" /> Saldo Global: <span className="font-bold text-white">{formatCurrency(totalBalance)}</span></div>
              </div>
          </h3>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {bankAccounts?.map(acc => (
                  <Card key={acc.id} className="bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 hover:border-slate-600 transition-all group relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-1 h-full ${(accountBalances[acc.id] || 0) >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                      <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider flex justify-between">
                              {acc.name}
                              <Landmark className="h-4 w-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
                          </CardTitle>
                      </CardHeader>
                      <CardContent>
                          <div className="text-2xl font-bold text-white">{formatCurrency(accountBalances[acc.id] || 0)}</div>
                          <p className="text-xs text-slate-500 mt-1 truncate">{acc.bankName} • {acc.accountNumber}</p>
                      </CardContent>
                  </Card>
              ))}
              
              {(!bankAccounts || bankAccounts.length === 0) && (
                  <div className="h-full min-h-[120px] border border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                      <Landmark className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">No hay cuentas bancarias.</p>
                      <p className="text-xs">Agrégalas en Configuración.</p>
                  </div>
              )}
          </div>
      </div>

      {/* --- SECCIÓN 2: HISTORIAL DE MOVIMIENTOS --- */}
      <div className="grid gap-4">
          <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="border-b border-slate-800 pb-4">
                  <div className="space-y-1">
                      <CardTitle className="text-lg text-slate-200 flex items-center gap-2">
                          <History className="h-5 w-5 text-purple-500" /> Historial de Movimientos
                      </CardTitle>
                      <CardDescription>Registro cronológico de todas las transacciones.</CardDescription>
                  </div>
              </CardHeader>
              <CardContent className="p-4">
                  <DataTable columns={columns} data={movementsWithContactNames}/>
              </CardContent>
          </Card>
      </div>

      <NewFinancialMovementSheet 
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onSave={handleSaveMovement}
        movement={editingMovement}
        onDelete={handleDeleteRequest}
        allMovements={financialMovements}
        purchaseOrders={purchaseOrders}
        salesOrders={salesOrders}
        serviceOrders={serviceOrders}
        contacts={contacts}
      />
      
      <AlertDialog open={!!deletingMovement} onOpenChange={() => setDeletingMovement(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de eliminar este movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
