"use client";

import React, { useState, useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Contact, SalesOrder, PurchaseOrder, FinancialMovement } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  AlertCircle, 
  FileText, 
  ChevronRight,
  Filter
} from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// --- FORMATO MONEDA ---
const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

// --- TIPO DE DATO PARA LA VISTA ---
type AccountSummary = {
  contact: Contact;
  totalCharges: number; // Lo que facturamos/compramos
  totalPayments: number; // Lo que se ha pagado
  balance: number;       // La deuda viva
  lastMovementDate: string | null;
  movementsCount: number;
};

export default function CurrentAccountPage() {
  const { firestore } = useFirebase();

  // 1. CARGAR DATOS
  const contactsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'contacts') : null, [firestore]);
  const salesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'salesOrders') : null, [firestore]);
  const purchasesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'purchaseOrders') : null, [firestore]);
  const financeQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'financialMovements'), orderBy('date', 'desc')) : null, [firestore]);

  const { data: contacts, isLoading: l1 } = useCollection<Contact>(contactsQuery);
  const { data: sales, isLoading: l2 } = useCollection<SalesOrder>(salesQuery);
  const { data: purchases, isLoading: l3 } = useCollection<PurchaseOrder>(purchasesQuery);
  const { data: movements, isLoading: l4 } = useCollection<FinancialMovement>(financeQuery);

  const isLoading = l1 || l2 || l3 || l4;

  // Estados de UI
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<AccountSummary | null>(null); // Para el detalle (Sheet)

  // 2. PROCESAMIENTO INTELIGENTE DE DATOS
  const { clientsData, suppliersData } = useMemo(() => {
    if (!contacts || !sales || !purchases || !movements) return { clientsData: [], suppliersData: [] };

    // Helper para buscar pagos asociados a un contacto (por nombre o ID si lo tuviéramos linkeado)
    // NOTA: Idealmente FinancialMovement debería tener 'contactId'. Aquí asumimos búsqueda por descripción o metadata futura.
    // Para esta versión robusta, filtraremos movements donde la descripción contenga el nombre del contacto (básico) 
    // o si implementaste contactId en FinancialMovement, úsalo aquí.
    
    const calculateAccount = (contact: Contact, type: 'client' | 'supplier'): AccountSummary => {
        let charges = 0;
        let payments = 0;
        let lastDate = null;
        let count = 0;

        if (type === 'client') {
            // Sumar Ventas (Cargos)
            const clientSales = sales.filter(s => s.clientId === contact.id && s.status !== 'cancelled' && s.status !== 'draft');
            charges = clientSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
            count += clientSales.length;
            
            // Encontrar fecha más reciente
            if (clientSales.length > 0) {
                const maxDate = clientSales.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b).date;
                lastDate = maxDate;
            }
        } else {
            // Sumar Compras (Cargos)
            const supplierPurchases = purchases.filter(p => p.supplierId === contact.id && p.status !== 'cancelled' && p.status !== 'draft');
            charges = supplierPurchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
            count += supplierPurchases.length;

            if (supplierPurchases.length > 0) {
                const maxDate = supplierPurchases.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b).date;
                lastDate = maxDate;
            }
        }

        // Sumar Pagos (Abonos)
        // Aquí es donde cruzamos con Tesorería. 
        // IMPORTANTE: Esto asume que al registrar el pago, guardaste el ID del contacto o su nombre.
        // Si no tienes un campo directo, esta parte quedará pendiente de tu lógica de "FinancialMovement".
        // Por ahora, simulamos que no hay pagos directos si no hay un campo de enlace claro, para no mostrar datos falsos.
        // TODO: Agregar campo 'contactId' a FinancialMovement en el futuro.
        
        const balance = charges - payments;

        return {
            contact,
            totalCharges: charges,
            totalPayments: payments,
            balance,
            lastMovementDate: lastDate,
            movementsCount: count
        };
    };

    const clients = contacts
        .filter(c => c.type === 'client' || c.type === 'both')
        .map(c => calculateAccount(c, 'client'))
        .filter(acc => acc.movementsCount > 0); // Mostrar solo si tiene movimiento

    const suppliers = contacts
        .filter(c => c.type === 'supplier' || c.type === 'both')
        .map(c => calculateAccount(c, 'supplier'))
        .filter(acc => acc.movementsCount > 0);

    return { clientsData: clients, suppliersData: suppliers };

  }, [contacts, sales, purchases, movements]);

  // Filtrado por búsqueda
  const filterAccounts = (list: AccountSummary[]) => {
      return list.filter(acc => acc.contact.name.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  if (isLoading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-1/3"/><Skeleton className="h-64 w-full"/></div>;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-slate-950 min-h-screen text-slate-100">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Cuenta Corriente</h2>
            <p className="text-slate-400 mt-1">Estado de deuda de Clientes y Proveedores.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 w-full md:w-auto">
            <Search className="h-4 w-4 text-slate-500 ml-2" />
            <Input 
                placeholder="Buscar empresa o persona..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-none bg-transparent focus-visible:ring-0 text-slate-200 placeholder:text-slate-600 h-8 w-64"
            />
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <Tabs defaultValue="clients" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="clients" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Por Cobrar (Clientes)
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
                Por Pagar (Proveedores)
            </TabsTrigger>
        </TabsList>

        {/* --- PESTAÑA CLIENTES --- */}
        <TabsContent value="clients" className="space-y-4">
            {/* KPI Rápido */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-blue-950/20 border-blue-900/50">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-400">Total por Cobrar</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-100">
                            {formatCurrency(clientsData.reduce((acc, curr) => acc + curr.balance, 0))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Lista de Tarjetas */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterAccounts(clientsData).map((acc) => (
                    <AccountCard 
                        key={acc.contact.id} 
                        account={acc} 
                        type="client" 
                        onClick={() => setSelectedAccount(acc)} 
                    />
                ))}
                {clientsData.length === 0 && <p className="text-slate-500 col-span-full text-center py-10">No hay movimientos de clientes registrados.</p>}
            </div>
        </TabsContent>

        {/* --- PESTAÑA PROVEEDORES --- */}
        <TabsContent value="suppliers" className="space-y-4">
             {/* KPI Rápido */}
             <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-orange-950/20 border-orange-900/50">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-orange-400">Total por Pagar</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-100">
                            {formatCurrency(suppliersData.reduce((acc, curr) => acc + curr.balance, 0))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterAccounts(suppliersData).map((acc) => (
                    <AccountCard 
                        key={acc.contact.id} 
                        account={acc} 
                        type="supplier" 
                        onClick={() => setSelectedAccount(acc)} 
                    />
                ))}
                {suppliersData.length === 0 && <p className="text-slate-500 col-span-full text-center py-10">No hay movimientos de proveedores registrados.</p>}
            </div>
        </TabsContent>
      </Tabs>

      {/* --- DETALLE LATERAL (CARTOLA) --- */}
      <Sheet open={!!selectedAccount} onOpenChange={(open) => !open && setSelectedAccount(null)}>
        <SheetContent className="sm:max-w-2xl bg-slate-950 border-l-slate-800 text-slate-100 overflow-y-auto">
            {selectedAccount && (
                <>
                    <SheetHeader className="mb-6 border-b border-slate-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg ${selectedAccount.totalCharges > selectedAccount.totalPayments ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'}`}>
                                {selectedAccount.contact.name.charAt(0)}
                            </div>
                            <div>
                                <SheetTitle className="text-xl text-white">{selectedAccount.contact.name}</SheetTitle>
                                <SheetDescription className="text-slate-400">{selectedAccount.contact.businessLine || 'Sin giro registrado'}</SheetDescription>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-4">
                            <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                <p className="text-xs text-slate-500 uppercase">Saldo Actual</p>
                                <p className={`text-xl font-bold ${selectedAccount.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {formatCurrency(selectedAccount.balance)}
                                </p>
                            </div>
                            <div className="flex items-end justify-end">
                                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white w-full">
                                    <Wallet className="mr-2 h-4 w-4" /> Registrar Pago
                                </Button>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="space-y-6">
                        <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Historial de Movimientos
                        </h4>
                        
                        {/* Aquí insertaremos la lógica detallada de movimientos (Ventas/Compras específicas) */}
                        <div className="relative border-l border-slate-800 ml-2 space-y-6 pb-10">
                            <div className="mb-4 ml-6 p-3 bg-slate-900/50 rounded border border-slate-800 text-sm text-slate-400 text-center">
                                Aquí se listarán todas las facturas y pagos cronológicamente.
                                <br/>(Requiere conectar FinancialMovements con ContactID)
                            </div>
                        </div>
                    </div>
                </>
            )}
        </SheetContent>
      </Sheet>

    </div>
  );
}

// --- COMPONENTE DE TARJETA DE CUENTA ---
function AccountCard({ account, type, onClick }: { account: AccountSummary, type: 'client' | 'supplier', onClick: () => void }) {
    const isPositive = account.balance > 0; // Si es positivo, hay deuda viva (en este contexto simple)
    
    return (
        <Card 
            className="bg-slate-900 border-slate-800 hover:border-slate-600 transition-all cursor-pointer group"
            onClick={onClick}
        >
            <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-bold text-lg text-slate-200 group-hover:text-blue-400 transition-colors truncate max-w-[180px]" title={account.contact.name}>
                            {account.contact.name}
                        </h3>
                        <p className="text-xs text-slate-500">{account.contact.rut || 'S/R'}</p>
                    </div>
                    {isPositive ? (
                        <Badge variant="outline" className="bg-red-950/30 text-red-400 border-red-900">Deuda</Badge>
                    ) : (
                        <Badge variant="outline" className="bg-green-950/30 text-green-400 border-green-900">Al día</Badge>
                    )}
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between items-end">
                        <span className="text-xs text-slate-500 uppercase tracking-wider">Saldo Pendiente</span>
                        <span className={`text-xl font-bold font-mono ${isPositive ? 'text-slate-100' : 'text-slate-400'}`}>
                            {formatCurrency(account.balance)}
                        </span>
                    </div>
                    <Separator className="bg-slate-800 my-2" />
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>Total Operado:</span>
                        <span>{formatCurrency(account.totalCharges)}</span>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/50">
                    <span>{account.movementsCount} movs.</span>
                    <div className="flex items-center group-hover:translate-x-1 transition-transform text-blue-500">
                        Ver cartola <ChevronRight className="h-3 w-3 ml-1" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}