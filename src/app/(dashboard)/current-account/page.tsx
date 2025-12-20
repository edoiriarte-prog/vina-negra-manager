"use client";

import React, { useState, useMemo } from 'react';
import { useMasterData } from '@/hooks/use-master-data';
import { useOperations } from '@/hooks/use-operations';
import { useSalesOrdersCRUD } from '@/hooks/use-sales-orders-crud';
import { Contact, SalesOrder, FinancialMovement, OrderItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Search, Wallet, FileText, ChevronRight, User, ArrowUpRight, ArrowDownLeft,
  Briefcase, Download, Printer, Package, Scale, Calendar as CalendarIcon, X
} from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth, isBefore, addDays } from 'date-fns';
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
    documentType: 'O/V' | 'Pago';
    reference: string;
    details: string | OrderItem[]; // String para pagos, OrderItem[] para ventas
    charge: number;
    payment: number;
    balance: number;
    paymentDueDate?: string; 
};

export default function CurrentAccountPage() {
  const { contacts, isLoading: l1 } = useMasterData();
  const { salesOrders, isLoading: loadingSales } = useSalesOrdersCRUD();
  const { financialMovements, isLoading: l2 } = useOperations();
  const isLoading = l1 || l2 || loadingSales;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<AccountSummary | null>(null);

  // PROCESAMIENTO DE DATOS INTELIGENTE
  const clientsData = useMemo(() => {
    if (isLoading || !contacts || !salesOrders || !financialMovements) {
        return [];
    }

    const clientContacts = contacts.filter(c => Array.isArray(c.type) && c.type.includes('client'));

    return clientContacts.map(contact => {
        let totalBilled = 0;
        let totalPaid = 0;
        const productVolumesMap = new Map<string, number>();
        
        const clientSales = salesOrders.filter(s => s.clientId === contact.id && s.status !== 'cancelled' && s.status !== 'draft');
        clientSales.forEach(order => {
            const netAmount = order.totalAmount || 0;
            totalBilled += order.includeVat !== false ? Math.round(netAmount * 1.19) : netAmount;
            (order.items || []).forEach(item => {
                const currentKilos = productVolumesMap.get(item.product) || 0;
                productVolumesMap.set(item.product, currentKilos + (item.quantity || 0));
            });
        });

        financialMovements
          .filter(fm => fm.contactId === contact.id && fm.type === 'income')
          .forEach(p => totalPaid += Number(p.amount) || 0);
        
        const balance = totalBilled - totalPaid;
        const productVolumes = Array.from(productVolumesMap.entries()).map(([name, totalKilos]) => ({ name, totalKilos }));

        return { contact, totalBilled, totalPaid, balance, productVolumes };
    }).filter(acc => acc.totalBilled > 0 || acc.totalPaid > 0);

  }, [contacts, salesOrders, financialMovements, isLoading]);

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
  
  if (isLoading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-1/3"/><Skeleton className="h-64 w-full"/></div>;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-950 min-h-screen text-slate-100">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Cuenta Corriente de Clientes</h2>
            <p className="text-slate-400 mt-1">Estado de deudas y abonos por cobrar.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 w-full md:w-auto focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20">
            <Search className="h-4 w-4 text-slate-500 ml-2" />
            <Input 
                placeholder="Buscar cliente..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-none bg-transparent focus-visible:ring-0 text-slate-200 placeholder:text-slate-600 h-8 w-full md:w-64"
            />
        </div>
      </div>

        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
                <SummaryCard title="Total Vendido (Clientes)" value={formatCurrency(clientTotals.billed)} icon={<Briefcase className="text-blue-400" />} />
                <SummaryCard title="Total Cobrado (Clientes)" value={formatCurrency(clientTotals.paid)} icon={<ArrowDownLeft className="text-emerald-400" />} />
                <SummaryCard title="Saldo por Cobrar" value={formatCurrency(clientTotals.balance)} icon={<Wallet className="text-amber-400" />} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterAccounts(clientsData).map((acc) => (
                    <AccountCard 
                        key={acc.contact.id} 
                        account={acc} 
                        onClick={() => setSelectedAccount(acc)} 
                    />
                ))}
                {clientsData.length === 0 && <p className="text-slate-500 col-span-full text-center py-10">No hay movimientos de clientes registrados.</p>}
            </div>
        </div>

      {selectedAccount && <AccountDetailSheet account={selectedAccount} isOpen={!!selectedAccount} onOpenChange={() => setSelectedAccount(null)} salesOrders={salesOrders || []} financialMovements={financialMovements || []} />}
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

function AccountCard({ account, onClick }: { account: AccountSummary, onClick: () => void }) {
    const isDebt = account.balance > 1; 
    const balanceColor = isDebt ? 'text-amber-400' : 'text-emerald-400';
    
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
                        <Badge variant="outline" className={'border-opacity-30 text-amber-400 border-amber-400'}>
                            Por Cobrar
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-emerald-400 border-emerald-400 border-opacity-30">Al día</Badge>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                    <div className="bg-slate-950 p-2 rounded-md border border-slate-800"><p className="text-xs text-slate-500 uppercase">Vendido</p><p className="font-bold text-slate-200 text-sm">{formatCurrency(account.totalBilled)}</p></div>
                    <div className="bg-slate-950 p-2 rounded-md border border-slate-800"><p className="text-xs text-slate-500 uppercase">Cobrado</p><p className="font-bold text-emerald-400 text-sm">{formatCurrency(account.totalPaid)}</p></div>
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

function AccountDetailSheet({ account, isOpen, onOpenChange, salesOrders, financialMovements }: { account: AccountSummary, isOpen: boolean, onOpenChange: () => void, salesOrders: SalesOrder[], financialMovements: FinancialMovement[]}) {
    
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    });

    const { filteredMovements, initialBalance, finalBalance } = useMemo(() => {
        if (!account) return { filteredMovements: [], initialBalance: 0, finalBalance: 0 };

        const allMovements: Omit<DetailedMovement, 'balance'>[] = [];
        const relevantOrders = salesOrders.filter(o => o.clientId === account.contact.id && o.status !== 'cancelled' && o.status !== 'draft');
        const relevantPayments = financialMovements.filter(f => f.contactId === account.contact.id && f.type === 'income');

        relevantOrders.forEach(o => {
            const grossAmount = o.includeVat !== false ? Math.round((o.totalAmount || 0) * 1.19) : (o.totalAmount || 0);
            let dueDate = o.paymentDueDate;
            if (!dueDate && o.creditDays) {
                dueDate = format(addDays(parseISO(o.date), o.creditDays!), 'yyyy-MM-dd');
            }
            
            allMovements.push({
                date: o.date,
                type: 'Cargo',
                documentType: 'O/V',
                reference: `OV-${o.number}`,
                details: o.items || [],
                charge: grossAmount,
                payment: 0,
                paymentDueDate: dueDate,
            });
        });

        relevantPayments.forEach(f => {
            let description = f.description || "Abono general";
            if (f.relatedDocument) {
              const order = salesOrders.find(o => o.id === f.relatedDocument!.id);
              description = `Pago OV-${order?.number || f.relatedDocument!.id}`;
            }
            allMovements.push({
                date: f.date,
                type: 'Abono',
                documentType: 'Pago',
                reference: f.voucherNumber || f.id,
                details: description,
                charge: 0,
                payment: f.amount || 0
            });
        });

        const sortedMovements = allMovements.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
        const fromDate = dateRange?.from ? startOfDay(dateRange.from) : null;
        
        const initialBal = fromDate ? sortedMovements
            .filter(m => isBefore(parseISO(m.date), fromDate))
            .reduce((balance, mov) => balance + mov.charge - mov.payment, 0) : 0;

        let runningBalance = initialBal;
        const filtered = sortedMovements
            .filter(m => {
                if (!fromDate) return true;
                const toDate = dateRange?.to ? endOfDay(dateRange.to) : endOfDay(fromDate);
                return isWithinInterval(parseISO(m.date), { start: fromDate, end: toDate });
            })
            .map(m => {
                runningBalance += m.charge - m.payment;
                return { ...m, balance: runningBalance };
            });

        return { filteredMovements: filtered, initialBalance: initialBal, finalBalance: runningBalance };
    }, [account, salesOrders, financialMovements, dateRange]);


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
                                    initialBalance={initialBalance}
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
                            <Button variant="outline" className="border-slate-700" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2"/> Imprimir</Button>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800"><p className="text-xs text-slate-500 uppercase">Total Vendido</p><p className="text-lg font-bold">{formatCurrency(account.totalBilled)}</p></div>
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
                                        {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                                        {format(dateRange.to, "LLL dd, y", { locale: es })}
                                      </>
                                    ) : (
                                      format(dateRange.from, "LLL dd, y", { locale: es })
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
                            <TableHeader className="sticky top-0 bg-slate-900/80 backdrop-blur-sm z-10"><TableRow className="border-slate-800 hover:bg-slate-900"><TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Referencia</TableHead><TableHead>Detalle</TableHead><TableHead className="text-right">Cargo</TableHead><TableHead className="text-right">Abono</TableHead><TableHead className="text-right">Saldo</TableHead></TableRow></TableHeader>
                            <TableBody>
                                <TableRow className="border-slate-800/50 bg-slate-900 font-bold">
                                    <TableCell colSpan={6} className="text-slate-400">Saldo Anterior</TableCell>
                                    <TableCell className="text-right text-slate-400 font-mono">{formatCurrency(initialBalance)}</TableCell>
                                </TableRow>

                                {filteredMovements.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-slate-500">No hay movimientos en el período seleccionado.</TableCell></TableRow>
                                ) : (
                                    filteredMovements.map((mov, i) => (
                                        <TableRow key={i} className={`border-slate-800/50 ${mov.type === "Abono" ? "bg-emerald-950/20" : ""}`}>
                                            <TableCell className="text-slate-400 text-xs">{format(parseISO(mov.date), 'dd-MM-yy', { locale: es })}</TableCell>
                                            <TableCell><Badge variant={mov.type === 'Cargo' ? 'outline' : 'default'} className={mov.type === 'Abono' ? 'bg-emerald-500/80 border-emerald-700' : 'border-slate-700'}>{mov.documentType}</Badge></TableCell>
                                            <TableCell className="font-mono text-xs">{mov.reference.replace('OV-OV-', 'OV-')}</TableCell>
                                            <TableCell className="text-xs max-w-xs">
                                                {typeof mov.details === 'string' ? (
                                                    mov.details
                                                ) : (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild><span className="cursor-help underline decoration-dotted">{mov.details.length} ítem(s) de producto</span></TooltipTrigger>
                                                            <TooltipContent className="bg-slate-900 border-slate-800 text-slate-200">
                                                                <div className="space-y-1 p-2">
                                                                    {mov.details.map((item: OrderItem, idx: number) => <p key={idx} className="text-xs">• {item.product} ({item.caliber}): {item.quantity}kg a {formatCurrency(item.price * 1.19)}</p>)}
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-red-400">{mov.charge > 0 ? formatCurrency(mov.charge) : '-'}</TableCell>
                                            <TableCell className="text-right font-mono text-emerald-400">{mov.payment > 0 ? formatCurrency(mov.payment) : '-'}</TableCell>
                                            <TableCell className="text-right font-mono font-semibold">{formatCurrency(mov.balance)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                             <TableBody>
                                <TableRow className="border-t-2 border-slate-700 bg-slate-900 font-bold">
                                    <TableCell colSpan={6} className="text-right text-lg text-white">SALDO FINAL</TableCell>
                                    <TableCell className="text-right text-lg font-mono text-amber-400">{formatCurrency(finalBalance)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </SheetContent>
        </Sheet>
    )
}