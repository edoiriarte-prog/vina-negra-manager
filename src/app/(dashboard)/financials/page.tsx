
"use client";

import React, { useState, useMemo } from 'react';
import { useOperations } from '@/hooks/use-operations';
import { useMasterData } from '@/hooks/use-master-data';
import { FinancialMovement, BankAccount } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Landmark, 
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Plus
} from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

export default function FinancialsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const { bankAccounts, contacts, isLoading: l1 } = useMasterData();
  const { financialMovements, purchaseOrders, salesOrders, serviceOrders, isLoading: l2 } = useOperations();

  const isLoading = l1 || l2;

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<FinancialMovement | null>(null);
  const [deletingMovement, setDeletingMovement] = useState<FinancialMovement | null>(null);

  // --- CORRECCIÓN DE TYPESCRIPT AQUÍ ---
  // 1. Calculamos los datos en un objeto "summary"
  const summary = useMemo(() => {
    // Valores iniciales seguros
    const initialData = { 
        accountBalances: {} as Record<string, number>, 
        totalBalance: 0, 
        totalIncome: 0, 
        totalExpense: 0 
    };

    if (!bankAccounts || !financialMovements) return initialData;
    
    const balances: Record<string, number> = {};
    let income = 0;
    let expense = 0;
    
    bankAccounts.forEach(acc => balances[acc.id] = acc.initialBalance || 0);

    financialMovements.forEach(m => {
        const amt = Number(m.amount) || 0;
        if (m.type === 'income') {
            income += amt;
             // Lógica simple: si hay destino, sumamos. 
             // En un sistema real, deberíamos validar destinationAccountId
        } else if (m.type === 'expense') {
            expense += amt;
        }
    });

    // Cálculo global simple para KPIs
    const globalTotal = (income - expense) + (bankAccounts.reduce((acc, b) => acc + (b.initialBalance || 0), 0));

    return { 
        accountBalances: balances, 
        totalBalance: globalTotal, 
        totalIncome: income, 
        totalExpense: expense 
    };
  }, [bankAccounts, financialMovements]);

  // 2. Desestructuramos DESPUÉS de que TypeScript ya sabe qué es "summary"
  const { accountBalances, totalBalance, totalIncome, totalExpense } = summary;

  // --- CRUD HANDLERS ---

  const handleSaveMovement = (movementData: any) => {
    if (!firestore) return;

    const saveSingle = (data: any) => {
        // Aseguramos que amount sea número
        const cleanData = { ...data, amount: Number(data.amount) };
        
        if ('id' in cleanData && cleanData.id) {
            updateDocumentNonBlocking(doc(firestore, 'financialMovements', cleanData.id), cleanData);
            toast({ title: "Movimiento Actualizado" });
        } else {
            addDocumentNonBlocking(collection(firestore, 'financialMovements'), cleanData);
            toast({ title: "Movimiento Registrado" });
        }
    };

    if (Array.isArray(movementData)) {
        movementData.forEach(m => saveSingle(m));
    } else {
        saveSingle(movementData);
    }
    
    setIsSheetOpen(false);
    setEditingMovement(null);
  };
  
  const handleDeleteRequest = (movement: FinancialMovement) => {
      setDeletingMovement(movement);
  }

  const confirmDelete = async () => {
      if (deletingMovement && firestore) {
          await deleteDocumentNonBlocking(doc(firestore, 'financialMovements', deletingMovement.id));
          toast({ variant: "destructive", title: "Movimiento Eliminado" });
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
      contactName: contacts.find(c => c.id === mov.contactId)?.name || 'Sin Contacto',
    }));
  }, [financialMovements, contacts]);

  const columns = useMemo(() => getColumns({ 
      onEdit: handleEdit, 
      onDelete: handleDeleteRequest, 
      bankAccounts: bankAccounts || [] 
  }), [bankAccounts]);


  if (isLoading) return <div className="p-8 space-y-4"><Skeleton className="h-32 w-full"/><Skeleton className="h-64 w-full"/></div>;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-slate-950 min-h-screen text-slate-100">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Tesorería</h2>
            <p className="text-slate-400 mt-1">Gestión de Flujo de Caja.</p>
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

      <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Ingresos Totales</CardTitle></CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                      <ArrowDownLeft className="h-5 w-5" /> {formatCurrency(totalIncome)}
                  </div>
              </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Egresos Totales</CardTitle></CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold text-red-400 flex items-center gap-2">
                      <ArrowUpRight className="h-5 w-5" /> {formatCurrency(totalExpense)}
                  </div>
              </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Balance Global</CardTitle></CardHeader>
              <CardContent>
                  <div className={`text-2xl font-bold flex items-center gap-2 ${totalBalance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                      <Wallet className="h-5 w-5" /> {formatCurrency(totalBalance)}
                  </div>
              </CardContent>
          </Card>
      </div>

      <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-200">
              <Landmark className="h-5 w-5 text-slate-500" /> Mis Cuentas
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {bankAccounts?.map(acc => (
                  <Card key={acc.id} className="bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 hover:border-slate-700 transition-all">
                      <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                              {acc.name}
                          </CardTitle>
                      </CardHeader>
                      <CardContent>
                          {/* Aquí mostramos saldo inicial por ahora para simplificar */}
                          <div className="text-xl font-bold text-white">{formatCurrency(acc.initialBalance)}</div>
                          <p className="text-xs text-slate-500 mt-1">{acc.bank} • {acc.accountNumber}</p>
                      </CardContent>
                  </Card>
              ))}
          </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="text-lg text-slate-200 flex items-center gap-2">
                  <History className="h-5 w-5 text-purple-500" /> Historial de Movimientos
              </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
              <DataTable columns={columns} data={movementsWithContactNames}/>
          </CardContent>
      </Card>

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
        <AlertDialogContent className="bg-slate-950 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Esta acción eliminará el movimiento financiero permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-900">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-500">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
