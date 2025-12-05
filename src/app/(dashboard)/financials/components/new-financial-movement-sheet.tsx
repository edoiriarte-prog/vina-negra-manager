
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FinancialMovement, PurchaseOrder, SalesOrder, ServiceOrder, Contact } from '@/lib/types';
import { format, parseISO, startOfYear } from 'date-fns';
import { suggestTransactionDescription } from '@/ai/flows/suggest-transaction-descriptions';
import { Loader2, Sparkles, CalendarIcon, Trash2, ArrowRight, ArrowDownLeft, ArrowUpRight, GitCompareArrows, Banknote, User, Building, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMasterData } from '@/hooks/use-master-data';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { es } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

type NewFinancialMovementSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (movement: FinancialMovement | Omit<FinancialMovement, 'id'>) => void;
  movement: FinancialMovement | null;
  onDelete?: (movement: FinancialMovement) => void;
  allMovements: FinancialMovement[];
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  contacts: Contact[];
};

type PaymentMode = 'total' | 'balance' | 'partial';

const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

const getInitialFormData = (movement: FinancialMovement | null): Omit<FinancialMovement, 'id'> => {
    if (movement) {
        return {
            ...movement,
            date: format(new Date(movement.date), 'yyyy-MM-dd'),
        };
    }
    return {
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'expense',
        description: '',
        amount: 0,
        paymentMethod: 'Transferencia',
        contactId: undefined,
        relatedDocument: undefined,
        sourceAccountId: undefined,
        destinationAccountId: undefined,
        reference: ''
    };
};

export function NewFinancialMovementSheet({ 
    isOpen, onOpenChange, onSave, movement, onDelete, allMovements, 
    purchaseOrders, salesOrders, contacts 
}: NewFinancialMovementSheetProps) {
    
  const [formData, setFormData] = useState<Omit<FinancialMovement, 'id'>>(getInitialFormData(movement));
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('partial');
  
  const { toast } = useToast();
  const { bankAccounts, costCenters } = useMasterData();

  // --- DERIVED STATE & MEMOS ---
  const filteredContacts = useMemo(() => {
    if (formData.type === 'income') {
      return contacts.filter(c => c.type.includes('client') || c.type.includes('other_income'));
    }
    if (formData.type === 'expense') {
      return contacts.filter(c => c.type.includes('supplier') || c.type.includes('other_expense'));
    }
    return [];
  }, [formData.type, contacts]);

  const pendingDocuments = useMemo(() => {
    if (!formData.contactId) return [];
    if (formData.type === 'income') {
        return salesOrders.filter(o => o.clientId === formData.contactId && o.status !== 'cancelled');
    }
    if (formData.type === 'expense') {
        return purchaseOrders.filter(o => o.supplierId === formData.contactId && o.status !== 'cancelled');
    }
    return [];
  }, [formData.contactId, formData.type, salesOrders, purchaseOrders]);

  const selectedDocument = useMemo(() => {
    return [...salesOrders, ...purchaseOrders].find(d => d.id === selectedDocumentId);
  }, [selectedDocumentId, salesOrders, purchaseOrders]);

  const documentBalance = useMemo(() => {
    if (!selectedDocument) return { total: 0, paid: 0, pending: 0 };
    const total = selectedDocument.totalAmount;
    const payments = allMovements
        .filter(m => m.relatedDocument?.id === selectedDocument.id && m.id !== movement?.id)
        .reduce((sum, m) => sum + m.amount, 0);
    const pending = total - payments;
    return { total, paid: payments, pending };
  }, [selectedDocument, allMovements, movement]);

  // --- EFFECT HOOKS ---

  useEffect(() => {
    setFormData(getInitialFormData(movement));
    if (movement?.relatedDocument) {
        setSelectedDocumentId(movement.relatedDocument.id);
        setPaymentMode('partial');
    } else {
        setSelectedDocumentId('');
        setPaymentMode('partial');
    }
  }, [movement, isOpen]);

  useEffect(() => {
    if (!selectedDocumentId) {
        setFormData(p => ({ ...p, relatedDocument: undefined }));
        return;
    }
    const docType = salesOrders.some(s => s.id === selectedDocumentId) ? 'OV' : 'OC';
    setFormData(p => ({ ...p, relatedDocument: { id: selectedDocumentId, type: docType }}));
    setPaymentMode('balance');
  }, [selectedDocumentId, salesOrders]);

  useEffect(() => {
    if (!selectedDocument) return;
    switch(paymentMode) {
        case 'total':
            setFormData(p => ({ ...p, amount: documentBalance.total }));
            break;
        case 'balance':
            setFormData(p => ({ ...p, amount: documentBalance.pending }));
            break;
        case 'partial':
            // Allows manual input
            break;
    }
  }, [paymentMode, selectedDocument, documentBalance]);
  
  useEffect(() => {
      // Reset dependent fields when type changes
      setFormData(prev => ({ 
          ...getInitialFormData(null), 
          type: prev.type, 
          date: prev.date,
          amount: prev.amount, // Keep amount for quick re-entry
      }));
      setSelectedDocumentId('');
  }, [formData.type]);


  // --- HANDLERS ---

  const handleTypeChange = (type: 'income' | 'expense' | 'traspaso') => {
    setFormData(prev => ({...prev, type}));
  }
  
  const handleAmountChange = (value: string) => {
    const numericValue = parseInt(value.replace(/\D/g, ''), 10) || 0;
    setFormData(prev => ({...prev, amount: numericValue}));
    setPaymentMode('partial');
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formData.amount <= 0) {
        toast({ variant: "destructive", title: "Error", description: "El monto debe ser mayor a cero." });
        return;
    }
    if(selectedDocument && formData.amount > documentBalance.pending + 0.01) { // +0.01 for float issues
        toast({ variant: "destructive", title: "Monto excede saldo", description: `El pago ${formatCurrency(formData.amount)} supera el saldo pendiente de ${formatCurrency(documentBalance.pending)}.` });
        return;
    }
    onSave(movement ? { ...formData, id: movement.id } : formData);
  };
  
  const handleDeleteClick = () => {
    if (movement && onDelete) onDelete(movement);
  }
  
  // --- UI CONSTANTS & STYLES ---
  const title = movement ? `Editar Movimiento #${movement.id.slice(0, 6)}` : 'Registrar Movimiento';
  const darkInputClass = "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-blue-500";
  const darkCardClass = "bg-slate-900 border-slate-800 shadow-sm";
  const labelClass = "text-xs font-medium text-slate-400 uppercase tracking-wide";
  const getTabClass = (tabType: string) => cn(
    "flex-1 h-12 text-base font-bold transition-all disabled:opacity-50",
    formData.type === tabType
      ? (tabType === 'income' ? 'bg-emerald-600 shadow-lg shadow-emerald-900/20 text-white' : 
         tabType === 'expense' ? 'bg-rose-600 shadow-lg shadow-rose-900/20 text-white' :
         'bg-blue-600 shadow-lg shadow-blue-900/20 text-white')
      : 'bg-transparent text-slate-400 hover:bg-slate-800'
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full flex flex-col p-0 gap-0 bg-slate-950 border-l-slate-800 text-slate-100">
        <SheetHeader className="px-6 py-4 bg-slate-900/50 border-b border-slate-800">
          <SheetTitle className="text-xl font-bold">{title}</SheetTitle>
          <SheetDescription className="text-slate-400">Registra un nuevo ingreso, egreso o traspaso.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="overflow-y-auto p-6 space-y-6">
            
            <Tabs value={formData.type} onValueChange={(v) => handleTypeChange(v as any)} className='w-full'>
                <TabsList className='grid w-full grid-cols-3 gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800 h-auto'>
                    <TabsTrigger value='income' className={getTabClass('income')}><ArrowDownLeft className="mr-2"/> Ingreso</TabsTrigger>
                    <TabsTrigger value='expense' className={getTabClass('expense')}><ArrowUpRight className="mr-2"/> Egreso</TabsTrigger>
                    <TabsTrigger value='traspaso' className={getTabClass('traspaso')}><GitCompareArrows className="mr-2"/> Traspaso</TabsTrigger>
                </TabsList>
            </Tabs>
            
            <Card className={darkCardClass}>
                <CardContent className="p-4 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className={labelClass}>Fecha del Movimiento</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-12", darkInputClass, !formData.date && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formData.date ? format(parseISO(formData.date), "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800 text-slate-100" align="start">
                                <Calendar mode="single" selected={formData.date ? parseISO(formData.date) : undefined} onSelect={(d) => d && setFormData(p => ({...p, date: format(d, 'yyyy-MM-dd')}))} captionLayout="dropdown-buttons" fromYear={2023} toYear={2030} />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label className={labelClass}>Monto</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-3xl font-bold text-slate-500">$</span>
                            <Input 
                                id="amount" name="amount" type="text"
                                value={new Intl.NumberFormat('es-CL').format(formData.amount)}
                                onChange={(e) => handleAmountChange(e.target.value)}
                                className="h-12 text-3xl font-bold text-center tracking-tighter bg-slate-950 border-slate-800 placeholder:text-slate-700"
                                required placeholder="0"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className={darkCardClass}>
                <CardContent className="p-4 space-y-4">
                    {formData.type === 'traspaso' ? (
                         <div className="flex items-center gap-2">
                            <div className="flex-1 space-y-1">
                                <Label className={labelClass}>Desde Cuenta</Label>
                                <Select required onValueChange={(v) => setFormData(p => ({...p, sourceAccountId: v}))} value={formData.sourceAccountId}><SelectTrigger className={darkInputClass}><SelectValue placeholder="Origen"/></SelectTrigger><SelectContent className="bg-slate-900 border-slate-800 text-slate-100">{bankAccounts.filter(a => a.status === 'Activa').map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>))}</SelectContent></Select>
                            </div>
                            <ArrowRight className="mt-5 text-slate-600"/>
                            <div className="flex-1 space-y-1">
                                <Label className={labelClass}>Hacia Cuenta</Label>
                                <Select required onValueChange={(v) => setFormData(p => ({...p, destinationAccountId: v}))} value={formData.destinationAccountId}><SelectTrigger className={darkInputClass}><SelectValue placeholder="Destino"/></SelectTrigger><SelectContent className="bg-slate-900 border-slate-800 text-slate-100">{bankAccounts.filter(a => a.status === 'Activa' && a.id !== formData.sourceAccountId).map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>))}</SelectContent></Select>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className={labelClass}>{formData.type === 'income' ? 'Cuenta Destino' : 'Cuenta Origen'}</Label>
                                <Select required onValueChange={(v) => setFormData(p => ({...p, [formData.type === 'income' ? 'destinationAccountId' : 'sourceAccountId']: v}))} value={formData.type === 'income' ? formData.destinationAccountId : formData.sourceAccountId}>
                                    <SelectTrigger className={darkInputClass}><SelectValue placeholder="Seleccione cuenta..."/></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">{bankAccounts.filter(a => a.status === 'Activa').map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>))}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className={labelClass}>Forma de Pago</Label>
                                <Select required onValueChange={(v) => setFormData(p => ({...p, paymentMethod: v}))} value={formData.paymentMethod}>
                                    <SelectTrigger className={darkInputClass}><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                        <SelectItem value="Transferencia">Transferencia</SelectItem>
                                        <SelectItem value="Efectivo">Efectivo</SelectItem>
                                        <SelectItem value="Depósito">Depósito</SelectItem>
                                        <SelectItem value="Cheque">Cheque</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {formData.type !== 'traspaso' && (
            <Card className={darkCardClass}>
                <CardContent className="p-4 space-y-4">
                     <div className="flex items-center gap-2">
                        {formData.type === 'income' ? <User className="h-4 w-4 text-slate-400"/> : <Building className="h-4 w-4 text-slate-400"/>}
                        <Label className="font-medium text-slate-300">Asociación del Movimiento</Label>
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-1'>
                            <Label className={labelClass}>{formData.type === 'income' ? 'Cliente' : 'Proveedor'}</Label>
                            <Select onValueChange={(v) => { setFormData(p => ({...p, contactId: v})); setSelectedDocumentId(''); }} value={formData.contactId}>
                                <SelectTrigger className={darkInputClass}><SelectValue placeholder="Seleccione..."/></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                    {filteredContacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className='space-y-1'>
                            <Label className={labelClass}>Documento Asociado (OV/OC)</Label>
                            <Select onValueChange={setSelectedDocumentId} value={selectedDocumentId} disabled={!formData.contactId || pendingDocuments.length === 0}>
                                <SelectTrigger className={darkInputClass}><SelectValue placeholder={pendingDocuments.length > 0 ? "Seleccione documento..." : "Sin docs pendientes"}/></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                    {pendingDocuments.map(d => <SelectItem key={d.id} value={d.id}>{d.number || d.id} - {formatCurrency(d.totalAmount)}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {selectedDocument && (
                        <div className="space-y-3 pt-3">
                            <Alert className="bg-slate-950 border-slate-800">
                                <FileText className="h-4 w-4 !text-slate-400" />
                                <AlertDescription className="text-slate-300">
                                    <div className="flex justify-between items-center text-sm">
                                        <span>Total Documento:</span>
                                        <span className="font-mono font-bold">{formatCurrency(documentBalance.total)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span>Pagos Anteriores:</span>
                                        <span className="font-mono text-emerald-400">{formatCurrency(documentBalance.paid)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-lg mt-1 pt-1 border-t border-slate-700">
                                        <span className="font-bold">Saldo Pendiente:</span>
                                        <span className="font-mono font-bold text-amber-400">{formatCurrency(documentBalance.pending)}</span>
                                    </div>
                                </AlertDescription>
                            </Alert>
                             <RadioGroup value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)} className="flex gap-2">
                                <Label className={cn("flex-1 p-2 border rounded-md cursor-pointer text-center text-xs transition-all", paymentMode === 'balance' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800')}>
                                    <RadioGroupItem value="balance" id="r-balance" className="sr-only"/> Pagar Saldo
                                </Label>
                                <Label className={cn("flex-1 p-2 border rounded-md cursor-pointer text-center text-xs transition-all", paymentMode === 'total' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800')}>
                                    <RadioGroupItem value="total" id="r-total" className="sr-only"/> Pagar Total Doc.
                                </Label>
                                <Label className={cn("flex-1 p-2 border rounded-md cursor-pointer text-center text-xs transition-all", paymentMode === 'partial' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800')}>
                                    <RadioGroupItem value="partial" id="r-partial" className="sr-only"/> Abono Parcial
                                </Label>
                             </RadioGroup>
                        </div>
                    )}
                </CardContent>
            </Card>
            )}

            <Card className={darkCardClass}>
                <CardContent className="p-4 grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <Label className={labelClass}>Descripción / Centro de Costo</Label>
                        <Select onValueChange={(v) => setFormData(p => ({...p, description: v}))} value={formData.description} required>
                            <SelectTrigger className={darkInputClass}><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">{costCenters.map(c => (<SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>))}</SelectContent>
                        </Select>
                     </div>
                     <div className="space-y-1">
                        <Label className={labelClass}>Referencia</Label>
                         <Input name="reference" value={formData.reference || ''} onChange={(e) => setFormData(p => ({...p, reference: e.target.value}))} className={darkInputClass} placeholder='Ej: Nro. Factura, Nro. Cheque'/>
                     </div>
                </CardContent>
            </Card>

          </div>
          <SheetFooter className="p-4 bg-slate-900 border-t border-slate-800 mt-auto flex justify-between">
            <div>
              {movement && onDelete && (
                 <Button type="button" variant="destructive" onClick={handleDeleteClick}>
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <SheetClose asChild><Button type="button" variant="ghost" className="text-slate-400 hover:text-slate-100 hover:bg-slate-800">Cancelar</Button></SheetClose>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold">Guardar Movimiento</Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

