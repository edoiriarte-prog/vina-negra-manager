"use client";

import React, { useState, useMemo } from 'react';
import { useMasterData } from '@/hooks/use-master-data';
import { useOperations } from '@/hooks/use-operations';
import { Contact, SalesOrder, PurchaseOrder, FinancialMovement, OrderItem, BankAccount } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { 
  Search, Wallet, FileText, ChevronRight, User, ArrowUpRight, ArrowDownLeft,
  Truck, Briefcase, Download, Printer, Package, Scale, Calendar as CalendarIcon, X
} from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { StatementDocument } from '@/components/pdf/StatementDocument';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';


// --- FORMATO MONEDA ---
const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

// --- TIPOS DE DATO PARA LA VISTA ---
type ProductVolume = {
  name: string;
  totalKilos: number;
};

type AccountSummary = {
  contact: Contact;
  totalBilled: number; // Monto bruto (c/IVA)
  totalPaid: number;
  balance: number;
  productVolumes: ProductVolume[];
};

type DetailedMovement = {
    date: string;
    type: 'Cargo' | 'Abono';
    documentType: 'O/V' | 'O/C' | 'Pago';
    reference: string;
    details: string | OrderItem[]; // String para pagos, OrderItem[] para ventas
    charge: number;
    payment: number;
    balance: number;
    paymentDueDate?: string; // Nuevo campo para vencimiento
};

export default function MercantileAccountPage() {
  const { contacts, isLoading: l1 } = useMasterData();
  const { salesOrders, purchaseOrders, financialMovements, isLoading: l2 } = useOperations();
  const isLoading = l1 || l2;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<AccountSummary | null>(null);

  // PROCESAMIENTO DE DATOS INTELIGENTE
  const { clientsData, suppliersData } = useMemo(() => {
    if (isLoading || !contacts || !salesOrders || !financialMovements || !purchaseOrders) {
        return { clientsData: [], suppliersData: [] };
    }

    const calculateAccount = (contact: Contact, type: 'client' | 'supplier'): AccountSummary => {
        let totalBilled = 0;
        let totalPaid = 0;
        const productVolumesMap = new Map<string, number>();
        
        if (type === 'client') {
            const clientSales = salesOrders.filter(s => s.clientId === contact.id && s.status !== 'cancelled' && s.status !== 'draft');
            clientSales.forEach(order => {
                const netAmount = order.totalAmount || 0;
                totalBilled += order.includeVat !== false ? Math.round(netAmount * 1.19) : netAmount;
                order.items.forEach(item => {
                    const currentKilos = productVolumesMap.get(item.product) || 0;
                    productVolumesMap.set(item.product, currentKilos + (item.quantity || 0));
                });
            });

            financialMovements
              .filter(fm => fm.contactId === contact.id && fm.type === 'income')
              .forEach(p => totalPaid += Number(p.amount) || 0);

        } else { // 'supplier'
            const supplierPurchases = purchaseOrders.filter(p => p.supplierId === contact.id && p.status !== 'cancelled' && p.status !== 'draft');
            supplierPurchases.forEach(order => {
                const netAmount = order.totalAmount || 0;
                totalBilled += order.includeVat !== false ? Math.round(netAmount * 1.19) : netAmount;
                 order.items.forEach(item => {
                    const currentKilos = productVolumesMap.get(item.product) || 0;
                    productVolumesMap.set(item.product, currentKilos + (item.quantity || 0));
                });
            });
            
            financialMovements
              .filter(fm => fm.contactId === contact.id && fm.type === 'expense')
              .forEach(p => totalPaid += Number(p.amount) || 0);
        }

        const balance = totalBilled - totalPaid;
        const productVolumes = Array.from(productVolumesMap.entries()).map(([name, totalKilos]) => ({ name, totalKilos }));

        return { contact, totalBilled, totalPaid, balance, productVolumes };
    };

    const clients = contacts
        .filter(c => Array.isArray(c.type) && c.type.includes('client'))
        .map(c => calculateAccount(c, 'client'))
        .filter(acc => acc.totalBilled > 0 || acc.totalPaid > 0);

    const suppliers = contacts
        .filter(c => Array.isArray(c.type) && c.type.includes('supplier'))
        .map(c => calculateAccount(c, 'supplier'))
        .filter(acc => acc.totalBilled > 0 || acc.totalPaid > 0);

    return { clientsData: clients, suppliersData: suppliers };

  }, [contacts, salesOrders, purchaseOrders, financialMovements, isLoading]);

  // Filtrado y totales
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

  if (isLoading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-1/3"/><Skeleton className="h-64 w-full"/></div>;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-950 min-h-screen text-slate-100">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Cuenta Corriente Mercantil</h2>
            <p className="text-slate-400 mt-1">Estado de deudas y abonos de Clientes y Proveedores.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 w-full md:w-auto focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20">
            <Search className="h-4 w-4 text-slate-500 ml-2" />
            <Input 
                placeholder="Buscar empresa o persona..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-none bg-transparent focus-visible:ring-0 text-slate-200 placeholder:text-slate-600 h-8 w-full md:w-64"
            />
        </div>
      </div>

      <Tabs defaultValue="clients" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 h-auto">
            <TabsTrigger value="clients" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-900/30">
                Por Cobrar (Clientes)
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-900/30">
                Por Pagar (Proveedores)
            </TabsTrigger>
        </TabsList>

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
                {clientsData.length === 0 && <p className="text-slate-500 col-span-full text-center py-10">No hay movimientos de clientes registrados.</p>}
            </div>
        </TabsContent>

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
                {suppliersData.length === 0 && <p className="text-slate-500 col-span-full text-center py-10">No hay movimientos de proveedores registrados.</p>}
            </div>
        </TabsContent>
      </Tabs>

      {selectedAccount && <AccountDetailSheet account={selectedAccount} isOpen={!!selectedAccount} onOpenChange={() => setSelectedAccount(null)} salesOrders={salesOrders} financialMovements={financialMovements} purchaseOrders={purchaseOrders} />}
    </div>
  );
}

// --- COMPONENTES VISUALES ---

function SummaryCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
    return (
        <Card className="bg-slate-900 border-slate-800 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>{icon}</CardHeader>
            <CardContent><div className="text-2xl font-bold text-slate-100">{value}</div></CardContent>
        </Card>
    )
}

function AccountCard({ account, type, onClick }: { account: AccountSummary, type: 'client' | 'supplier', onClick: () => void }) {
    const isDebt = account.balance > 1; // Usar un umbral pequeño para evitar problemas de flotantes
    const balanceColor = type === 'client' 
        ? (isDebt ? 'text-amber-400' : 'text-emerald-400')
        : (isDebt ? 'text-red-400' : 'text-emerald-400');
    
    return (
        <Card className="bg-slate-900 border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer group shadow-lg flex flex-col" onClick={onClick}>
            <CardContent className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-bold text-lg text-slate-200 group-hover:text-blue-400 transition-colors truncate max-w-[200px]" title={account.contact.name}>
                            {account.contact.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono">{account.contact.rut || 'S/R'}</p>
                    </div>
                    {isDebt ? (
                        <Badge variant="outline" className={`border-opacity-30 ${type === 'client' ? 'text-amber-400 border-amber-400' : 'text-red-400 border-red-400'}`}>
                            {type === 'client' ? 'Por Cobrar' : 'Por Pagar'}
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-emerald-400 border-emerald-400 border-opacity-30">Al día</Badge>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                    <div className="bg-slate-950 p-2 rounded-md border border-slate-800"><p className="text-xs text-slate-500 uppercase">Facturado</p><p className="font-bold text-slate-200 text-sm">{formatCurrency(account.totalBilled)}</p></div>
                    <div className="bg-slate-950 p-2 rounded-md border border-slate-800"><p className="text-xs text-slate-500 uppercase">Pagado</p><p className="font-bold text-emerald-400 text-sm">{formatCurrency(account.totalPaid)}</p></div>
                    <div className="bg-slate-950 p-2 rounded-md border border-slate-800"><p className="text-xs text-slate-500 uppercase">Saldo</p><p className={`font-bold ${balanceColor} text-sm`}>{formatCurrency(account.balance)}</p></div>
                </div>
                
                <Separator className="bg-slate-800 my-3"/>

                <div className="space-y-2 flex-1">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Scale className="h-3 w-3"/>Resumen de Kilos</h4>
                    {account.productVolumes.length > 0 ? (
                        account.productVolumes.map(pv => (
                            <div key={pv.name} className="flex justify-between text-sm text-slate-300">
                                <span><Package className="h-3 w-3 mr-1 inline-block text-slate-600"/>{pv.name}</span>
                                <span className="font-mono">{new Intl.NumberFormat('es-CL').format(pv.totalKilos)} kg</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-slate-600 italic">Sin movimiento de productos.</p>
                    )}
                </div>

                <div className="mt-4 flex items-center justify-end text-xs text-slate-500 pt-2 border-t border-slate-800/50">
                    <div className="flex items-center group-hover:translate-x-1 transition-transform text-blue-500">
                        Ver cartola detallada <ChevronRight className="h-3 w-3 ml-1" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function AccountDetailSheet({ account, isOpen, onOpenChange, salesOrders, financialMovements, purchaseOrders }: { account: AccountSummary, isOpen: boolean, onOpenChange: () => void, salesOrders: SalesOrder[], financialMovements: FinancialMovement[], purchaseOrders: PurchaseOrder[] }) {
    
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    });

    const allMovements: DetailedMovement[] = useMemo(() => {
        if (!account) return [];
        const movements: Omit<DetailedMovement, 'balance'>[] = [];

        const isClient = (account.contact.type || []).includes('client');
        const relevantOrders = isClient ? salesOrders : purchaseOrders;
        const relevantPayments = financialMovements.filter(f => f.contactId === account.contact.id && (isClient ? f.type === 'income' : f.type === 'expense'));
        
        // Cargos (Ventas o Compras)
        relevantOrders.filter(o => ((isClient ? (o as SalesOrder).clientId : (o as PurchaseOrder).supplierId) === account.contact.id) && o.status !== 'cancelled' && o.status !== 'draft').forEach(o => {
            const grossAmount = o.includeVat !== false ? Math.round((o.totalAmount || 0) * 1.19) : (o.totalAmount || 0);
            movements.push({
                date: o.date,
                type: 'Cargo',
                documentType: isClient ? 'O/V' : 'O/C',
                reference: o.number || o.id,
                details: o.items,
                charge: grossAmount,
                payment: 0,
                paymentDueDate: (o as SalesOrder).paymentDueDate
            });
        });

        // Abonos (Pagos)
        relevantPayments.forEach(f => {
            let description = f.description || "Abono general";
            if (f.relatedDocument) {
              const docType = f.relatedDocument.type;
              const docId = f.relatedDocument.id;
              const order = [...salesOrders, ...purchaseOrders].find(o => o.id === docId);
              description = `Pago ${docType} ${order?.number || docId}`;
            }
            movements.push({
                date: f.date,
                type: 'Abono',
                documentType: 'Pago',
                reference: f.voucherNumber || f.id,
                details: description,
                charge: 0,
                payment: f.amount || 0
            });
        });

        return movements.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    }, [account, salesOrders, purchaseOrders, financialMovements]);
    
    const filteredMovements = useMemo(() => {
        let balance = 0;
        const filtered = allMovements.filter(m => {
            if (!dateRange?.from) return true;
            const date = parseISO(m.date);
            const to = dateRange.to || dateRange.from;
            return isWithinInterval(date, { start: startOfDay(dateRange.from), end: endOfDay(to) });
        });

        return filtered.map(m => {
            balance += m.charge - m.payment;
            return { ...m, balance };
        });
    }, [allMovements, dateRange]);


    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-4xl w-full flex flex-col p-0 gap-0 bg-slate-950 border-l-slate-800 text-slate-100">
                <SheetHeader className="px-6 py-4 bg-slate-900 border-b border-slate-800">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="bg-blue-600/20 p-3 rounded-xl border border-blue-500/30"> <User className="h-6 w-6 text-blue-400" /> </div>
                            <div>
                                <SheetTitle className="text-xl text-white">{account.contact.name}</SheetTitle>
                                <SheetDescription className="text-slate-400">{account.contact.rut}</SheetDescription>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <PDFDownloadLink
                                document={
                                <StatementDocument
                                    account={account}
                                    movements={filteredMovements}
                                    dateRange={dateRange}
                                />
                                }
                                fileName={`Estado_Cuenta_${account.contact.name.replace(/ /g, '_')}.pdf`}
                            >
                                {({ loading }) => (
                                <Button variant="outline" className="border-slate-700" disabled={loading}>
                                    <Download className="h-4 w-4 mr-2" />
                                    {loading ? 'Generando...' : 'PDF'}
                                </Button>
                                )}
                            </PDFDownloadLink>
                            <Button variant="outline" className="border-slate-700"><Printer className="h-4 w-4 mr-2"/> Imprimir</Button>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800"><p className="text-xs text-slate-500 uppercase">Total Facturado</p><p className="text-lg font-bold">{formatCurrency(account.totalBilled)}</p></div>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800"><p className="text-xs text-slate-500 uppercase">Total Pagado</p><p className="text-lg font-bold text-emerald-400">{formatCurrency(account.totalPaid)}</p></div>
                         <div className="bg-slate-950 p-3 rounded-lg border border-slate-800"><p className="text-xs text-slate-500 uppercase">Saldo Actual</p><p className="text-lg font-bold text-amber-400">{formatCurrency(account.balance)}</p></div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2"><FileText className="h-4 w-4" /> Cartola Histórica de Movimientos</h4>
                        <div className="flex items-center gap-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  id="date"
                                  variant={"outline"}
                                  className={cn(
                                    "w-[260px] justify-start text-left font-normal bg-slate-900 border-slate-700 hover:bg-slate-800 hover:text-slate-100",
                                    !dateRange && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {dateRange?.from ? (
                                    dateRange.to ? (
                                      <>
                                        {format(dateRange.from, "LLL dd, y")} -{" "}
                                        {format(dateRange.to, "LLL dd, y")}
                                      </>
                                    ) : (
                                      format(dateRange.from, "LLL dd, y")
                                    )
                                  ) : (
                                    <span>Seleccionar rango</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                  initialFocus
                                  mode="range"
                                  defaultMonth={dateRange?.from}
                                  selected={dateRange}
                                  onSelect={setDateRange}
                                  numberOfMonths={2}
                                />
                              </PopoverContent>
                            </Popover>
                             <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-white" onClick={() => setDateRange(undefined)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <ScrollArea className="h-[calc(100vh-350px)]">
                        <Table>
                            <TableHeader className="sticky top-0 bg-slate-900/80 backdrop-blur-sm z-10"><TableRow className="border-slate-800 hover:bg-slate-900"><TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Referencia</TableHead><TableHead>Detalle</TableHead><TableHead className="text-right">Cargos (-)</TableHead><TableHead className="text-right">Abonos (+)</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredMovements.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-slate-500">No hay movimientos para este contacto en el período seleccionado.</TableCell></TableRow>
                                ) : (
                                    filteredMovements.map((mov, i) => (
                                        <TableRow key={i} className={`border-slate-800/50 ${mov.type === 'Abono' ? 'bg-emerald-950/20' : ''}`}>
                                            <TableCell className="text-slate-400 text-xs">{format(parseISO(mov.date), 'dd-MM-yy')}</TableCell>
                                            <TableCell><Badge variant={mov.type === 'Cargo' ? 'outline' : 'default'} className={mov.type === 'Abono' ? 'bg-emerald-500/80 border-emerald-700' : 'border-slate-700'}>{mov.documentType}</Badge></TableCell>
                                            <TableCell className="font-mono text-xs">{mov.reference}</TableCell>
                                            <TableCell className="text-xs max-w-xs">
                                                {typeof mov.details === 'string' ? (
                                                    mov.details
                                                ) : (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild><span className="cursor-help underline decoration-dotted">{mov.details.length} ítem(s) de producto</span></TooltipTrigger>
                                                            <TooltipContent className="bg-slate-900 border-slate-800 text-slate-200">
                                                                <div className="space-y-1 p-2">
                                                                    {mov.details.map((item, idx) => <p key={idx} className="text-xs">• {item.product} ({item.caliber}): {item.quantity}kg a {formatCurrency(item.price)}</p>)}
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-red-400">{mov.charge > 0 ? formatCurrency(mov.charge) : '-'}</TableCell>
                                            <TableCell className="text-right font-mono text-emerald-400">{mov.payment > 0 ? formatCurrency(mov.payment) : '-'}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </SheetContent>
        </Sheet>
    )
}
