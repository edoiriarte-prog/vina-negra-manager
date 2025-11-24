"use client";

import React, { useState, useMemo } from 'react';
import { useMasterData } from '@/hooks/use-master-data';
import { useOperations } from '@/hooks/use-operations';
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
  Wallet, 
  FileText, 
  ChevronRight,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  Truck,
  Briefcase
} from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { format, parseISO, compareDesc } from 'date-fns';
import { es } from 'date-fns/locale';

// --- FORMATO MONEDA ---
const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

// --- TIPOS DE DATO PARA LA VISTA ---
type Document = {
  id: string;
  date: string;
  type: 'O/V' | 'O/C' | 'O/S';
  amount: number;
};

type Payment = {
    id: string;
    date: string;
    description: string;
    amount: number;
    relatedDocumentId?: string;
};

type AccountSummary = {
  contact: Contact;
  documents: Document[];
  payments: Payment[];
  totalBilled: number;
  totalPaid: number;
  balance: number;
};

type DetailedMovement = {
    date: string;
    type: 'charge' | 'payment';
    description: string;
    charge: number;
    payment: number;
    balance: number;
};

export default function MercantileAccountPage() {
  // 1. CARGAR DATOS
  const { contacts, isLoading: l1 } = useMasterData();
  const { salesOrders, purchaseOrders, financialMovements, isLoading: l2 } = useOperations();
  
  // Placeholder para servicios (aún no implementado)
  const serviceOrders: any[] = []; 

  const isLoading = l1 || l2;

  // Estados de UI
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<AccountSummary | null>(null);

  // 2. PROCESAMIENTO DE DATOS
  const { clientsData, suppliersData } = useMemo(() => {
    if (isLoading || !contacts || !salesOrders || !purchaseOrders || !financialMovements) {
        return { clientsData: [], suppliersData: [] };
    }

    const calculateAccount = (contact: Contact, type: 'client' | 'supplier'): AccountSummary => {
        const documents: Document[] = [];
        const payments: Payment[] = [];

        if (type === 'client') {
            // --- CLIENTES ---
            // 1. Cargos (Ventas)
            salesOrders
              .filter(s => s.clientId === contact.id && (s.status === 'completed' || s.status === 'dispatched' || s.status === 'invoiced'))
              .forEach(s => documents.push({ id: s.id, date: s.date, type: 'O/V', amount: Number(s.totalAmount) || 0 }));
            
            // 2. Abonos (Pagos recibidos - Income)
            financialMovements
              .filter(fm => fm.contactId === contact.id && fm.type === 'income')
              .forEach(p => payments.push({ id: p.id, date: p.date, description: p.description, amount: Number(p.amount) || 0, relatedDocumentId: p.relatedOrderId }));

        } else { 
            // --- PROVEEDORES ---
            // 1. Cargos (Compras)
            purchaseOrders
              .filter(p => p.supplierId === contact.id && (p.status === 'completed' || p.status === 'received'))
              .forEach(p => documents.push({ id: p.id, date: p.date, type: 'O/C', amount: Number(p.totalAmount) || 0 }));

            // 2. Cargos (Servicios - Placeholder)
            serviceOrders
              .filter(s => s.supplierId === contact.id)
              .forEach(s => documents.push({ id: s.id, date: s.date, type: 'O/S', amount: Number(s.cost) || 0 }));

            // 3. Abonos (Pagos realizados - Expense)
            financialMovements
              .filter(fm => fm.contactId === contact.id && fm.type === 'expense')
              .forEach(p => payments.push({ id: p.id, date: p.date, description: p.description, amount: Number(p.amount) || 0, relatedDocumentId: p.relatedOrderId }));
        }

        const totalBilled = documents.reduce((sum, doc) => sum + doc.amount, 0);
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const balance = totalBilled - totalPaid;

        return { contact, documents, payments, totalBilled, totalPaid, balance };
    };

    // Filtrar clientes
    const clients = contacts
        .filter(c => (Array.isArray(c.type) ? c.type.includes('client') : c.type === 'client'))
        .map(c => calculateAccount(c, 'client'))
        .filter(acc => acc.totalBilled > 0 || acc.totalPaid > 0); 

    // Filtrar proveedores
    const suppliers = contacts
        .filter(c => (Array.isArray(c.type) ? c.type.includes('supplier') : c.type === 'supplier'))
        .map(c => calculateAccount(c, 'supplier'))
        .filter(acc => acc.totalBilled > 0 || acc.totalPaid > 0);

    return { clientsData: clients, suppliersData: suppliers };

  }, [contacts, salesOrders, purchaseOrders, serviceOrders, financialMovements, isLoading]);

  // 3. FILTRADO Y TOTALES
  const filterAccounts = (list: AccountSummary[]) => {
      if (!searchTerm) return list;
      return list.filter(acc => 
        acc.contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (acc.contact.rut || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
  };
  
  const clientTotals = useMemo(() => filterAccounts(clientsData).reduce((acc, curr) => ({
    billed: acc.billed + curr.totalBilled,
    paid: acc.paid + curr.totalPaid,
    balance: acc.balance + curr.balance
  }), { billed: 0, paid: 0, balance: 0}), [clientsData, searchTerm]); 
  
  const supplierTotals = useMemo(() => filterAccounts(suppliersData).reduce((acc, curr) => ({
    billed: acc.billed + curr.totalBilled,
    paid: acc.paid + curr.totalPaid,
    balance: acc.balance + curr.balance
  }), { billed: 0, paid: 0, balance: 0}), [suppliersData, searchTerm]);

  if (isLoading) return (
    <div className="p-8 space-y-4 bg-slate-950 min-h-screen">
        <Skeleton className="h-12 w-1/3 bg-slate-800"/>
        <Skeleton className="h-64 w-full bg-slate-800"/>
    </div>
  );

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-950 min-h-screen text-slate-100">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Cuenta Corriente Mercantil</h2>
            <p className="text-slate-400 mt-1">Estado de deudas y abonos de Clientes y Proveedores.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 w-full md:w-auto focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
            <Search className="h-4 w-4 text-slate-500 ml-2" />
            <Input 
                placeholder="Buscar empresa o persona..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-none bg-transparent focus-visible:ring-0 text-slate-200 placeholder:text-slate-600 h-8 w-full md:w-64"
            />
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <Tabs defaultValue="clients" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 h-auto">
            <TabsTrigger value="clients" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-900/30">
                Por Cobrar (Clientes)
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-900/30">
                Por Pagar (Proveedores)
            </TabsTrigger>
        </TabsList>

        {/* --- PESTAÑA CLIENTES --- */}
        <TabsContent value="clients" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
                <SummaryCard title="Total Facturado (Clientes)" value={formatCurrency(clientTotals.billed)} icon={<Briefcase className="text-blue-400" />} />
                <SummaryCard title="Total Recibido (Clientes)" value={formatCurrency(clientTotals.paid)} icon={<ArrowDownLeft className="text-emerald-400" />} />
                <SummaryCard title="Saldo por Cobrar" value={formatCurrency(clientTotals.balance)} icon={<Wallet className="text-amber-400" />} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterAccounts(clientsData).map((acc) => (
                    <AccountCard 
                        key={acc.contact.id} 
                        account={acc} 
                        type="client" 
                        onClick={() => setSelectedAccount(acc)} 
                    />
                ))}
                {clientsData.length === 0 && <p className="text-slate-500 col-span-full text-center py-10 border border-dashed border-slate-800 rounded-lg">No hay movimientos de clientes registrados.</p>}
            </div>
        </TabsContent>

        {/* --- PESTAÑA PROVEEDORES --- */}
        <TabsContent value="suppliers" className="space-y-4">
             <div className="grid gap-4 md:grid-cols-3">
                <SummaryCard title="Total Compras (Proveedores)" value={formatCurrency(supplierTotals.billed)} icon={<Truck className="text-orange-400" />} />
                <SummaryCard title="Total Pagado (Proveedores)" value={formatCurrency(supplierTotals.paid)} icon={<ArrowUpRight className="text-red-400" />} />
                <SummaryCard title="Saldo por Pagar" value={formatCurrency(supplierTotals.balance)} icon={<Wallet className="text-amber-400" />} />
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
                {suppliersData.length === 0 && <p className="text-slate-500 col-span-full text-center py-10 border border-dashed border-slate-800 rounded-lg">No hay movimientos de proveedores registrados.</p>}
            </div>
        </TabsContent>
      </Tabs>

      {/* --- DETALLE LATERAL (CARTOLA) --- */}
      {selectedAccount && (
        <AccountDetailSheet 
            account={selectedAccount} 
            isOpen={!!selectedAccount} 
            onOpenChange={() => setSelectedAccount(null)} 
        />
      )}
    </div>
  );
}

// --- COMPONENTES VISUALES ---

function SummaryCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
    return (
        <Card className="bg-slate-900 border-slate-800 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-slate-100">{value}</div>
            </CardContent>
        </Card>
    )
}

function AccountCard({ account, type, onClick }: { account: AccountSummary, type: 'client' | 'supplier', onClick: () => void }) {
    const isDebt = account.balance > 0;
    const balanceColor = type === 'client' 
        ? (isDebt ? 'text-amber-400' : 'text-emerald-400')
        : (isDebt ? 'text-red-400' : 'text-emerald-400');
    
    return (
        <Card 
            className="bg-slate-900 border-slate-800 hover:border-slate-600 transition-all cursor-pointer group shadow-lg"
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
                    {isDebt ? (
                        <Badge variant="outline" className={`border-opacity-30 ${type === 'client' ? 'text-amber-400 border-amber-400' : 'text-red-400 border-red-400'}`}>
                            {type === 'client' ? 'Por Cobrar' : 'Por Pagar'}
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-emerald-400 border-emerald-400 border-opacity-30">Al día</Badge>
                    )}
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between items-end">
                        <span className="text-xs text-slate-500 uppercase tracking-wider">Saldo</span>
                        <span className={`text-xl font-bold font-mono ${balanceColor}`}>
                            {formatCurrency(account.balance)}
                        </span>
                    </div>
                    <Separator className="bg-slate-800 my-2" />
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>{type === 'client' ? 'Facturado:' : 'Comprado:'}</span>
                        <span>{formatCurrency(account.totalBilled)}</span>
                    </div>
                     <div className="flex justify-between text-xs text-slate-400">
                        <span>{type === 'client' ? 'Recibido:' : 'Pagado:'}</span>
                        <span className="text-emerald-400">{formatCurrency(account.totalPaid)}</span>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/50">
                    <span>{account.documents.length + account.payments.length} movs.</span>
                    <div className="flex items-center group-hover:translate-x-1 transition-transform text-blue-500">
                        Ver cartola <ChevronRight className="h-3 w-3 ml-1" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function AccountDetailSheet({ account, isOpen, onOpenChange }: { account: AccountSummary, isOpen: boolean, onOpenChange: () => void }) {
    
    const detailedMovements: DetailedMovement[] = useMemo(() => {
        const movements: Omit<DetailedMovement, 'balance'>[] = [];
        // Documentos son CARGOS (Aumentan deuda)
        account.documents.forEach(d => movements.push({ date: d.date, type: 'charge', description: `Doc: ${d.type} ${d.id}`, charge: d.amount, payment: 0 }));
        // Pagos son ABONOS (Disminuyen deuda)
        account.payments.forEach(p => movements.push({ date: p.date, type: 'payment', description: `Pago: ${p.description}`, charge: 0, payment: p.amount }));

        // Ordenar por fecha descendente
        movements.sort((a,b) => compareDesc(parseISO(b.date), parseISO(a.date)));

        // Cálculo de saldo cronológico (de atrás hacia adelante para la vista de cartola)
        let balance = 0;
        const chronological = [...movements].reverse().map(m => {
            balance += m.charge - m.payment;
            return { ...m, balance };
        });
        
        // Retornamos ordenado descendente (lo más reciente arriba)
        return chronological.reverse();
    }, [account]);

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-3xl w-full flex flex-col p-0 gap-0 bg-slate-950 border-l-slate-800 text-slate-100">
                <SheetHeader className="px-6 py-4 bg-slate-900 border-b border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600/20 p-3 rounded-xl border border-blue-500/30">
                            <User className="h-6 w-6 text-blue-400" />
                        </div>
                        <div>
                            <SheetTitle className="text-xl text-white">{account.contact.name}</SheetTitle>
                            <SheetDescription className="text-slate-400">{account.contact.rut}</SheetDescription>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                            <p className="text-xs text-slate-500 uppercase">Total Operado</p>
                            <p className="text-lg font-bold">{formatCurrency(account.totalBilled)}</p>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                            <p className="text-xs text-slate-500 uppercase">Total Pagado</p>
                            <p className="text-lg font-bold text-emerald-400">{formatCurrency(account.totalPaid)}</p>
                        </div>
                         <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                            <p className="text-xs text-slate-500 uppercase">Saldo Actual</p>
                            <p className="text-lg font-bold text-amber-400">{formatCurrency(account.balance)}</p>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-6">
                    <h4 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Historial de Movimientos
                    </h4>
                    
                    <ScrollArea className="h-[calc(100vh-300px)]">
                        <div className="rounded-md border border-slate-800 bg-slate-900/50">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-900/80 sticky top-0">
                                    <tr className="border-b border-slate-800">
                                        <th className="px-4 py-3 text-left">Fecha</th>
                                        <th className="px-4 py-3 text-left">Descripción</th>
                                        <th className="px-4 py-3 text-right">Cargo</th>
                                        <th className="px-4 py-3 text-right">Abono</th>
                                        <th className="px-4 py-3 text-right">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {detailedMovements.map((mov, i) => (
                                        <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 text-slate-300">{format(parseISO(mov.date), 'dd/MM/yyyy')}</td>
                                            <td className="px-4 py-3 text-slate-400">{mov.description}</td>
                                            <td className="px-4 py-3 text-right font-mono text-red-400">
                                                {mov.charge > 0 ? formatCurrency(mov.charge) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-emerald-400">
                                                {mov.payment > 0 ? formatCurrency(mov.payment) : '-'}
                                            </td>
                                            <td className={`px-4 py-3 text-right font-mono font-medium ${mov.balance > 0 ? 'text-amber-400' : 'text-white'}`}>
                                                {formatCurrency(mov.balance)}
                                            </td>
                                        </tr>
                                    ))}
                                    {detailedMovements.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                                No hay movimientos registrados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </ScrollArea>
                </div>
            </SheetContent>
        </Sheet>
    )
}