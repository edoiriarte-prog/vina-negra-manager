"use client";

import React, { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc } from 'firebase/firestore';
import { FinancialMovement, BankAccount, Contact } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Landmark, 
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Link as LinkIcon
} from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Formato Moneda
const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

export default function FinancialsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  // --- CARGA DE DATOS ---
  // 1. Cuentas Bancarias
  const accountsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'bankAccounts') : null, [firestore]);
  const { data: accounts, isLoading: l1 } = useCollection<BankAccount>(accountsQuery);

  // 2. Movimientos
  const movementsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'financialMovements'), orderBy('date', 'desc')) : null, [firestore]);
  const { data: movements, isLoading: l2 } = useCollection<FinancialMovement>(movementsQuery);

  // 3. Contactos (Para asignar pagos)
  const contactsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'contacts') : null, [firestore]);
  const { data: contacts, isLoading: l3 } = useCollection<Contact>(contactsQuery);

  const isLoading = l1 || l2 || l3;

  // --- ESTADOS ---
  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
  const [searchTerm, setSearchTerm] = useState("");

  // --- FORMULARIO ---
  const [formData, setFormData] = useState<Partial<FinancialMovement>>({
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      description: '',
      category: 'Ventas',
      accountId: '',
      contactId: '' // Opcional
  });

  // --- LÓGICA DE SALDOS ---
  const accountBalances = useMemo(() => {
      if (!accounts || !movements) return {};
      
      const balances: Record<string, number> = {};
      
      // Inicializar en 0
      accounts.forEach(acc => balances[acc.id] = 0);

      // Calcular
      movements.forEach(m => {
          // Solo sumar si la cuenta existe (por seguridad)
          if (m.accountId) {
             const current = balances[m.accountId] || 0;
             if (m.type === 'income') balances[m.accountId] = current + (Number(m.amount) || 0);
             else balances[m.accountId] = current - (Number(m.amount) || 0);
          }
      });

      return balances;
  }, [accounts, movements]);

  // Total Global
  const totalBalance = Object.values(accountBalances).reduce((a, b) => a + b, 0);

  // --- HANDLERS ---
  const handleSaveTransaction = async () => {
      if (!firestore) return;
      if (!formData.amount || !formData.accountId || !formData.date) {
          toast({ variant: "destructive", title: "Faltan datos", description: "Monto, Cuenta y Fecha son obligatorios." });
          return;
      }

      try {
          await addDoc(collection(firestore, 'financialMovements'), {
              ...formData,
              type: transactionType,
              amount: Number(formData.amount),
              createdAt: new Date().toISOString()
          });

          toast({ title: "Movimiento Registrado", description: "El saldo ha sido actualizado." });
          setIsTransactionOpen(false);
          // Reset form
          setFormData({ 
              date: format(new Date(), 'yyyy-MM-dd'), 
              amount: 0, 
              description: '', 
              category: transactionType === 'income' ? 'Ventas' : 'Proveedores', 
              accountId: '', 
              contactId: '' 
          });
      } catch (error) {
          console.error(error);
          toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el movimiento." });
      }
  };

  // Filtro de historial
  const filteredMovements = useMemo(() => {
      if (!movements) return [];
      return movements.filter(m => 
          (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (m.category && m.category.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [movements, searchTerm]);


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
                className="bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 font-semibold"
                onClick={() => { setTransactionType('expense'); setIsTransactionOpen(true); }}
            >
                <TrendingDown className="mr-2 h-4 w-4" /> Registrar Gasto
            </Button>
            <Button 
                className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 font-semibold"
                onClick={() => { setTransactionType('income'); setIsTransactionOpen(true); }}
            >
                <TrendingUp className="mr-2 h-4 w-4" /> Registrar Ingreso
            </Button>
        </div>
      </div>

      {/* --- SECCIÓN 1: BILLETERA (TARJETAS DE CUENTAS) --- */}
      <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-200">
              <Wallet className="h-5 w-5 text-blue-500" /> Mis Cuentas
              <Badge variant="secondary" className="ml-2 bg-slate-800 text-slate-300 border-slate-700">
                  Global: {formatCurrency(totalBalance)}
              </Badge>
          </h3>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Tarjetas de Cuentas Reales */}
              {accounts?.map(acc => (
                  <Card key={acc.id} className="bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 hover:border-slate-600 transition-all group relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-1 h-full ${accountBalances[acc.id] >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                      <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider flex justify-between">
                              {acc.bankName}
                              <Landmark className="h-4 w-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
                          </CardTitle>
                      </CardHeader>
                      <CardContent>
                          <div className="text-2xl font-bold text-white">{formatCurrency(accountBalances[acc.id] || 0)}</div>
                          <p className="text-xs text-slate-500 mt-1 truncate">{acc.accountNumber} • {acc.accountType}</p>
                      </CardContent>
                  </Card>
              ))}
              
              {/* Botón visual para cuando no hay cuentas o para agregar */}
              {(!accounts || accounts.length === 0) && (
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
                  <div className="flex items-center justify-between">
                      <div className="space-y-1">
                          <CardTitle className="text-lg text-slate-200 flex items-center gap-2">
                              <History className="h-5 w-5 text-purple-500" /> Últimos Movimientos
                          </CardTitle>
                          <CardDescription>Registro cronológico de todas las transacciones.</CardDescription>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 w-full max-w-sm">
                          <Search className="h-4 w-4 text-slate-500 ml-2" />
                          <Input 
                              placeholder="Buscar por descripción o categoría..." 
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="border-none bg-transparent focus-visible:ring-0 text-slate-200 placeholder:text-slate-600 h-8"
                          />
                      </div>
                  </div>
              </CardHeader>
              <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                      <div className="divide-y divide-slate-800">
                          {filteredMovements.map((mov) => {
                              const accountName = accounts?.find(a => a.id === mov.accountId)?.bankName || 'Cuenta desconocida';
                              const contactName = contacts?.find(c => c.id === mov.contactId)?.name;

                              return (
                                  <div key={mov.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                                      <div className="flex items-center gap-4">
                                          <div className={`p-2 rounded-full border ${mov.type === 'income' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                              {mov.type === 'income' ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                                          </div>
                                          <div>
                                              <p className="font-medium text-slate-200">{mov.description}</p>
                                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                                  <span>{format(parseISO(mov.date), "dd MMM", { locale: es })}</span>
                                                  <span>•</span>
                                                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400 h-5 font-normal">{mov.category}</Badge>
                                                  {contactName && (
                                                      <>
                                                          <span>•</span>
                                                          <span className="text-blue-400 flex items-center gap-1"><LinkIcon className="h-3 w-3"/> {contactName}</span>
                                                      </>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <p className={`font-bold font-mono ${mov.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                              {mov.type === 'income' ? '+' : '-'}{formatCurrency(Number(mov.amount))}
                                          </p>
                                          <p className="text-xs text-slate-500">{accountName}</p>
                                      </div>
                                  </div>
                              );
                          })}
                          {filteredMovements.length === 0 && (
                              <div className="p-10 text-center text-slate-500 flex flex-col items-center">
                                  <History className="h-10 w-10 mb-3 opacity-20" />
                                  <p>No se encontraron movimientos.</p>
                              </div>
                          )}
                      </div>
                  </ScrollArea>
              </CardContent>
          </Card>
      </div>

      {/* --- MODAL NUEVA TRANSACCIÓN --- */}
      <Dialog open={isTransactionOpen} onOpenChange={setIsTransactionOpen}>
          <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 sm:max-w-[500px]">
              <DialogHeader>
                  <DialogTitle className="text-xl flex items-center gap-2">
                      {transactionType === 'income' ? <TrendingUp className="text-emerald-500"/> : <TrendingDown className="text-red-500"/>}
                      {transactionType === 'income' ? 'Registrar Ingreso' : 'Registrar Gasto'}
                  </DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label>Fecha</Label>
                          <Input 
                              type="date" 
                              className="bg-slate-900 border-slate-800 [color-scheme:dark] text-slate-200" 
                              value={formData.date} 
                              onChange={(e) => setFormData({...formData, date: e.target.value})}
                          />
                      </div>
                      <div className="space-y-2">
                          <Label>Monto</Label>
                          <div className="relative">
                              <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                              <Input 
                                  type="number" 
                                  className="bg-slate-900 border-slate-800 pl-7 font-bold text-lg text-white" 
                                  value={formData.amount || ''} 
                                  onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                              />
                          </div>
                      </div>
                  </div>

                  <div className="space-y-2">
                      <Label>Cuenta Afectada</Label>
                      <Select onValueChange={(v) => setFormData({...formData, accountId: v})} value={formData.accountId}>
                          <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-200"><SelectValue placeholder="Seleccione cuenta..." /></SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                              {accounts?.map(acc => (
                                  <SelectItem key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountNumber}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>

                  <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Input 
                          placeholder="Ej: Pago factura 123..." 
                          className="bg-slate-900 border-slate-800 text-slate-200" 
                          value={formData.description} 
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                      />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label>Categoría</Label>
                          <Select onValueChange={(v) => setFormData({...formData, category: v})} value={formData.category}>
                              <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-200"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                  {transactionType === 'income' ? (
                                      <>
                                          <SelectItem value="Ventas">Ventas</SelectItem>
                                          <SelectItem value="Aporte Capital">Aporte Capital</SelectItem>
                                          <SelectItem value="Devolución">Devolución</SelectItem>
                                          <SelectItem value="Otros">Otros</SelectItem>
                                      </>
                                  ) : (
                                      <>
                                          <SelectItem value="Proveedores">Proveedores</SelectItem>
                                          <SelectItem value="Remuneraciones">Remuneraciones</SelectItem>
                                          <SelectItem value="Impuestos">Impuestos</SelectItem>
                                          <SelectItem value="Arriendos">Arriendos</SelectItem>
                                          <SelectItem value="Gastos Generales">Gastos Generales</SelectItem>
                                          <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                                      </>
                                  )}
                              </SelectContent>
                          </Select>
                      </div>
                      
                      <div className="space-y-2">
                          <Label>Asignar a Contacto (Opcional)</Label>
                          <Select onValueChange={(v) => setFormData({...formData, contactId: v})} value={formData.contactId}>
                              <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-200"><SelectValue placeholder="Cliente/Prov..." /></SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                  <SelectItem value="none">-- Ninguno --</SelectItem>
                                  {contacts?.map(c => (
                                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                          <p className="text-[10px] text-slate-500">Esto actualizará la Cta. Corriente del contacto.</p>
                      </div>
                  </div>
              </div>

              <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsTransactionOpen(false)} className="text-slate-400 hover:text-white hover:bg-slate-800">Cancelar</Button>
                  <Button 
                      onClick={handleSaveTransaction}
                      className={transactionType === 'income' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}
                  >
                      Guardar Movimiento
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

    </div>
  );
}