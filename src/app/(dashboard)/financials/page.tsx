"use client";

import React, { useState, useMemo } from 'react';
import { useOperations } from '@/hooks/use-operations';
import { useMasterData } from '@/hooks/use-master-data';
import { useFinancialsCRUD } from '@/hooks/use-financials-crud'; 
import { FinancialMovement, BankAccount } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "./components/data-table";
import { getColumns } from "./components/columns";
import { NewFinancialMovementSheet } from './components/new-financial-movement-sheet';
import { AccountStatementDialog } from './components/account-statement-dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Wallet, Landmark, History, ArrowUpRight, ArrowDownLeft, Plus, Banknote } from "lucide-react";

const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

export default function FinancialsPage() {
  const { bankAccounts, contacts } = useMasterData();
  const { financialMovements, purchaseOrders, salesOrders, serviceOrders } = useOperations();
  const { createFinancialMovement, updateFinancialMovement, deleteFinancialMovement } = useFinancialsCRUD();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<FinancialMovement | null>(null);
  const [deletingMovement, setDeletingMovement] = useState<FinancialMovement | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

  const { totalBalance, totalIncome, totalExpense } = useMemo(() => {
    if (!bankAccounts || !financialMovements) return { totalBalance: 0, totalIncome: 0, totalExpense: 0 };
    
    let income = 0;
    let expense = 0;
    
    financialMovements.forEach(m => {
        const amt = Number(m.amount) || 0;
        if (m.type === 'income') income += amt;
        else if (m.type === 'expense') expense += amt;
    });

    const bankInitial = bankAccounts.reduce((acc, b) => acc + (Number(b.initialBalance) || 0), 0);
    const globalTotal = bankInitial + income - expense;

    return { totalBalance: globalTotal, totalIncome: income, totalExpense: expense };
  }, [bankAccounts, financialMovements]);

  const handleSaveMovement = async (movementData: FinancialMovement | Omit<FinancialMovement, 'id'>) => {
    if ('id' in movementData && movementData.id) {
        await updateFinancialMovement(movementData.id, movementData);
    } else {
        await createFinancialMovement(movementData);
    }
    
    setIsSheetOpen(false);
    setEditingMovement(null);
  };
  
  const confirmDelete = async () => {
      if (deletingMovement) {
          await deleteFinancialMovement(deletingMovement.id);
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
    if (!contacts || !financialMovements) return [];
    return (financialMovements || []).map(mov => ({
      ...mov,
      contactName: contacts.find(c => c.id === mov.contactId)?.name || '-',
    }));
  }, [financialMovements, contacts]);

  const columns = useMemo(() => getColumns({ 
      onEdit: handleEdit, 
      onDelete: setDeletingMovement, 
      bankAccounts: bankAccounts || [] 
  }), [bankAccounts, handleEdit]);

  return (
    <>
    <div className="flex-1 space-y-6 p-8 pt-6 bg-slate-950 min-h-screen text-slate-100">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Tesorería</h2>
            <p className="text-slate-400 mt-1">Gestión de Flujo de Caja y conciliación.</p>
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
          <Card className="bg-slate-900 border-slate-800 shadow-lg hover:border-emerald-500/30 transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm text-slate-400">Ingresos Totales</CardTitle><ArrowDownLeft className="h-5 w-5 text-emerald-400"/></CardHeader>
              <CardContent><div className="text-3xl font-bold text-emerald-400 flex items-center gap-2">{formatCurrency(totalIncome)}</div></CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800 shadow-lg hover:border-rose-500/30 transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm text-slate-400">Egresos Totales</CardTitle><ArrowUpRight className="h-5 w-5 text-rose-400"/></CardHeader>
              <CardContent><div className="text-3xl font-bold text-rose-400 flex items-center gap-2">{formatCurrency(totalExpense)}</div></CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800 shadow-lg hover:border-blue-500/30 transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm text-slate-400">Balance Global</CardTitle><Wallet className="h-5 w-5 text-blue-400"/></CardHeader>
              <CardContent><div className={`text-3xl font-bold flex items-center gap-2 ${totalBalance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{formatCurrency(totalBalance)}</div></CardContent>
          </Card>
      </div>

      <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-200">
              <Landmark className="h-5 w-5 text-slate-500" /> Mis Cuentas
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {bankAccounts?.map(acc => {
                  const accIncome = financialMovements?.filter(m => m.destinationAccountId === acc.id).reduce((sum, m) => sum + Number(m.amount), 0) || 0;
                  const accExpense = financialMovements?.filter(m => m.sourceAccountId === acc.id).reduce((sum, m) => sum + Number(m.amount), 0) || 0;
                  const currentBalance = (acc.initialBalance || 0) + accIncome - accExpense;

                  return (
                    <Card key={acc.id} onClick={() => setSelectedAccount(acc)} className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-800 hover:border-slate-700 transition-all shadow-md group cursor-pointer">
                        <CardContent className="p-4 flex flex-col justify-between h-full">
                           <div>
                             <div className="flex justify-between items-center">
                                <p className="font-bold text-slate-200">{acc.name}</p>
                                <Banknote className="h-5 w-5 text-slate-600 group-hover:text-slate-500 transition-colors" />
                             </div>
                             <p className="text-xs text-slate-500">{acc.bankName} - {acc.accountType}</p>
                           </div>
                           <div className="text-center my-3">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Saldo Disponible</p>
                                <p className={`text-2xl font-bold font-mono tracking-tighter ${currentBalance >= 0 ? 'text-white' : 'text-red-400'}`}>{formatCurrency(currentBalance)}</p>
                           </div>
                           <div className="text-xs space-y-1 text-slate-400 border-t border-slate-800/50 pt-2">
                               <div className="flex justify-between items-center">
                                   <span className='flex items-center gap-1'><ArrowDownLeft className='h-3 w-3 text-emerald-500'/> Ingresos</span>
                                   <span className='font-mono'>{formatCurrency(accIncome)}</span>
                               </div>
                                <div className="flex justify-between items-center">
                                   <span className='flex items-center gap-1'><ArrowUpRight className='h-3 w-3 text-rose-500'/> Egresos</span>
                                   <span className='font-mono'>{formatCurrency(accExpense)}</span>
                               </div>
                           </div>
                        </CardContent>
                    </Card>
                  );
              })}
          </div>
      </div>

      <Card className="bg-slate-900 border-slate-800 shadow-lg">
          <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="text-lg text-slate-200 flex items-center gap-2">
                  <History className="h-5 w-5 text-purple-500" /> Historial de Movimientos
              </CardTitle>
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
        onDelete={(m) => setDeletingMovement(m)}
        allMovements={financialMovements}
        purchaseOrders={purchaseOrders}
        salesOrders={salesOrders}
        serviceOrders={serviceOrders}
        contacts={contacts}
    />

    {selectedAccount && (
        <AccountStatementDialog
            isOpen={!!selectedAccount}
            onOpenChange={() => setSelectedAccount(null)}
            account={selectedAccount}
            movements={financialMovements}
        />
    )}
      
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
    </>
  );
}
