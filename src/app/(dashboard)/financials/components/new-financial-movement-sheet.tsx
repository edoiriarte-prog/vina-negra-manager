"use client";

import { useState, useEffect } from 'react';
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
import { format, parseISO } from 'date-fns';
import { suggestTransactionDescription } from '@/ai/flows/suggest-transaction-descriptions';
import { Loader2, Sparkles, CalendarIcon, Trash2, PlusCircle, ArrowRight, ArrowDownLeft, ArrowUpRight, GitCompareArrows, Banknote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMasterData } from '@/hooks/use-master-data';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { es } from 'date-fns/locale';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';

type NewFinancialMovementSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (movement: FinancialMovement | Omit<FinancialMovement, 'id'> | Omit<FinancialMovement, 'id'>[]) => void;
  movement: FinancialMovement | null;
  onDelete?: (movement: FinancialMovement) => void;
  allMovements: FinancialMovement[];
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  serviceOrders: ServiceOrder[];
  contacts: Contact[];
};

type BatchMovement = Omit<FinancialMovement, 'id' | 'contactId' | 'type'> & { batchId: number };
type PaymentType = 'total' | 'abono';


const getInitialFormData = (): Omit<FinancialMovement, 'id'> => ({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'expense',
    description: '',
    amount: 0,
    paymentMethod: 'Transferencia',
    destinationAccountId: undefined,
    sourceAccountId: undefined,
    contactId: undefined,
    relatedDocument: undefined,
    internalConcept: undefined,
    productId: undefined,
    reference: '',
});


export function NewFinancialMovementSheet({ 
    isOpen, onOpenChange, onSave, movement, onDelete, allMovements, 
    purchaseOrders, salesOrders, serviceOrders, contacts 
}: NewFinancialMovementSheetProps) {
  const [formData, setFormData] = useState<Omit<FinancialMovement, 'id'>>(getInitialFormData());
  const [associationType, setAssociationType] = useState<'document' | 'anticipo' | 'concept'>('document');
  const [relatedOrderType, setRelatedOrderType] = useState<'OV' | 'OC' | 'OS' | ''>('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>('abono');
  const [batchMovements, setBatchMovements] = useState<BatchMovement[]>([]);
  const { toast } = useToast();
  const { bankAccounts, internalConcepts, costCenters } = useMasterData();
  const [pendingBalance, setPendingBalance] = useState<number | null>(null);

  const calculatePendingBalance = (docType: 'OV' | 'OC' | 'OS', docId: string) => {
    let orderAmount = 0;
    let paymentsMade = 0;

    const otherPayments = allMovements
        .filter(m => m.relatedDocument?.id === docId && m.id !== movement?.id); // Exclude current movement if editing

    paymentsMade = otherPayments.reduce((sum, m) => sum + m.amount, 0);

    if (docType === 'OC') {
        const order = purchaseOrders.find(o => o.id === docId);
        if (order) orderAmount = order.totalAmount;
    } else if (docType === 'OV') {
        const order = salesOrders.find(o => o.id === docId);
        if (order) orderAmount = order.totalAmount;
    } else if (docType === 'OS') {
        const order = serviceOrders.find(o => o.id === docId);
        if (order) orderAmount = order.cost;
    }

    setPendingBalance(orderAmount - paymentsMade);
  };

  useEffect(() => {
    if (movement) { // Editing mode
        setIsBatchMode(false);
        setFormData({
            ...movement,
            date: format(new Date(movement.date), 'yyyy-MM-dd'),
        });
        if (movement.relatedDocument) {
            setAssociationType('document');
            setRelatedOrderType(movement.relatedDocument.type);
            calculatePendingBalance(movement.relatedDocument.type, movement.relatedDocument.id);
        } else if (movement.contactId) {
            setAssociationType('anticipo');
        } else {
            setAssociationType('concept');
        }
    } else { // Creating mode
      setFormData(getInitialFormData());
      setRelatedOrderType('');
      setAssociationType('document');
      setIsBatchMode(false);
      setBatchMovements([]);
      setPendingBalance(null);
      setPaymentType('abono');
    }
  }, [movement, isOpen]);
  
  useEffect(() => {
      if (isBatchMode) {
          setAssociationType('anticipo');
      } else if (formData.type !== 'traspaso') {
          setAssociationType('document');
      } else {
          setAssociationType('concept');
      }
      setPendingBalance(null);
  }, [isBatchMode, formData.type]);
  
  useEffect(() => {
    if (paymentType === 'total' && pendingBalance !== null) {
      const balanceForTotal = movement ? (pendingBalance || 0) + movement.amount : (pendingBalance || 0);
      setFormData(prev => ({...prev, amount: balanceForTotal}));
    }
  }, [paymentType, pendingBalance, movement]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleAmountChange = (value: string) => {
    const numericValue = parseInt(value.replace(/\D/g, ''), 10) || 0;
    setFormData(prev => ({...prev, amount: numericValue}));
    setPaymentType('abono');
  }
  
  const handleBatchAmountChange = (batchId: number, value: string) => {
    const numericValue = parseInt(value.replace(/\D/g, ''), 10) || 0;
    handleBatchChange(batchId, 'amount', numericValue);
  }

  const handleSelectChange = (name: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'contactId' && associationType === 'document') {
        setRelatedOrderType('');
        setFormData(p => ({...p, relatedDocument: undefined}));
        setPendingBalance(null);
    }
  };

  const handleRelatedOrderSelect = (orderId: string) => {
    if (!relatedOrderType) return;
    
    calculatePendingBalance(relatedOrderType, orderId);
    setPaymentType('abono');
    setFormData(prev => ({ 
        ...prev, 
        relatedDocument: { type: relatedOrderType, id: orderId },
        amount: 0, 
        internalConcept: undefined,
        productId: undefined,
    }));
  }

  const handleSuggestDescription = async () => {
    // ... (logic is correct, not changing it)
  }

  const addBatchMovement = () => {
    setBatchMovements(prev => [...prev, { 
        batchId: Date.now(), 
        date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        amount: 0,
        paymentMethod: 'Transferencia',
        sourceAccountId: formData.type === 'expense' ? formData.sourceAccountId : '',
        destinationAccountId: formData.type === 'income' ? formData.destinationAccountId : '',
    }]);
  }

  const removeBatchMovement = (batchId: number) => {
    setBatchMovements(prev => prev.filter(m => m.batchId !== batchId));
  }

  const handleBatchChange = (batchId: number, field: keyof BatchMovement, value: any) => {
    setBatchMovements(prev => prev.map(m => m.batchId === batchId ? { ...m, [field]: value } : m));
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBatchMode) {
        if (!formData.contactId) {
            toast({ variant: "destructive", title: "Error", description: "Debe seleccionar un contacto para el registro múltiple." });
            return;
        }
        if (batchMovements.length === 0 || batchMovements.some(m => m.amount <= 0 || !m.description || (!m.sourceAccountId && !m.destinationAccountId))) {
            toast({ variant: "destructive", title: "Error", description: "Todos los movimientos deben tener descripción, monto positivo y cuenta." });
            return;
        }
        const movementsToSave = batchMovements.map(bm => ({
            ...bm,
            type: formData.type,
            contactId: formData.contactId,
        }));
        onSave(movementsToSave);
    } else {
        if (!formData.date) {
            toast({ variant: "destructive", title: "Error", description: "Debe seleccionar una fecha." });
            return;
        }
        if (movement) {
            onSave({ ...formData, id: movement.id });
        } else {
            onSave(formData);
        }
    }
  };
  
  const getOrderOptions = () => {
    if (!formData.contactId || !relatedOrderType) return [];
    
    switch (relatedOrderType) {
        case 'OC': return purchaseOrders.filter(o => o.supplierId === formData.contactId).map(o => ({ value: o.id, label: `${o.number || o.id}` }));
        case 'OV': return salesOrders.filter(o => o.clientId === formData.contactId).map(o => ({ value: o.id, label: `${o.number || o.id}` }));
        case 'OS': 
          const contact = contacts.find(c => c.id === formData.contactId);
          if (!contact) return [];
          return serviceOrders.filter(o => o.provider === contact.name).map(o => ({ value: o.id, label: `${o.id} - ${o.description}`}));
        default: return [];
    }
  }

  const title = movement ? 'Editar Movimiento' : 'Registrar Movimiento';
  const description = movement ? 'Actualice los detalles del registro.' : 'Registra un nuevo ingreso, egreso o traspaso.';

  const filteredContacts = formData.type === 'income' 
    ? contacts.filter(c => c.type.includes('client') || c.type.includes('other_income')) 
    : contacts.filter(c => c.type.includes('supplier') || c.type.includes('other_expense'));

  const onAssociationChange = (value: 'document' | 'anticipo' | 'concept') => {
      setAssociationType(value);
      setFormData(prev => ({
          ...prev,
          relatedDocument: undefined,
          contactId: undefined,
          internalConcept: undefined,
          productId: undefined,
          description: '',
      }));
      if (value === 'concept' && costCenters.length > 0) {
        setFormData(prev => ({
            ...prev,
            description: costCenters[0].name
        }));
      }
      setPendingBalance(null);
  }

  const onTypeChange = (value: 'income' | 'expense' | 'traspaso') => {
      setFormData(prev => ({
          ...getInitialFormData(),
          date: prev.date,
          type: value,
      }));
  }
  
  const handleDeleteClick = () => {
    if (movement && onDelete) {
        onDelete(movement);
    }
  }
  
  const darkInputClass = "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-blue-500";
  const darkCardClass = "bg-slate-900 border-slate-800 shadow-sm";
  const labelClass = "text-xs font-medium text-slate-400 uppercase tracking-wide";


  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full flex flex-col p-0 gap-0 bg-slate-950 border-l-slate-800 text-slate-100">
        <SheetHeader className="px-6 py-4 bg-slate-900/50 border-b border-slate-800">
          <SheetTitle className="text-xl font-bold">{title}</SheetTitle>
          <SheetDescription className="text-slate-400">{description}</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="overflow-y-auto p-6 space-y-6">
            
            {/* TYPE SELECTOR */}
            <div className='grid grid-cols-3 gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800'>
                <Button type="button" onClick={() => onTypeChange('income')} className={`h-11 text-base font-bold transition-all ${formData.type === 'income' ? 'bg-emerald-600 shadow-lg shadow-emerald-900/20 text-white' : 'bg-transparent text-slate-400 hover:bg-slate-800'}`}>
                    <ArrowDownLeft className="mr-2"/> Ingreso
                </Button>
                <Button type="button" onClick={() => onTypeChange('expense')} className={`h-11 text-base font-bold transition-all ${formData.type === 'expense' ? 'bg-rose-600 shadow-lg shadow-rose-900/20 text-white' : 'bg-transparent text-slate-400 hover:bg-slate-800'}`}>
                    <ArrowUpRight className="mr-2"/> Egreso
                </Button>
                <Button type="button" onClick={() => onTypeChange('traspaso')} className={`h-11 text-base font-bold transition-all ${formData.type === 'traspaso' ? 'bg-blue-600 shadow-lg shadow-blue-900/20 text-white' : 'bg-transparent text-slate-400 hover:bg-slate-800'}`}>
                    <GitCompareArrows className="mr-2"/> Traspaso
                </Button>
            </div>

            {/* MAIN DATA: DATE & AMOUNT */}
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
                            <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800 text-slate-100">
                                <Calendar mode="single" selected={formData.date ? parseISO(formData.date) : undefined} onSelect={(d) => d && handleSelectChange('date', format(d, 'yyyy-MM-dd'))} initialFocus />
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
                                disabled={paymentType === 'total'}
                            />
                        </div>
                     </div>
                </CardContent>
            </Card>

            {/* ORIGIN / DESTINATION */}
             <Card className={darkCardClass}>
                <CardContent className="p-4 space-y-4">
                     {formData.type === 'traspaso' ? (
                         <div className="flex items-center gap-2">
                            <div className="flex-1 space-y-1">
                                <Label className={labelClass}>Desde Cuenta</Label>
                                <Select required onValueChange={(v) => handleSelectChange('sourceAccountId', v)} value={formData.sourceAccountId}><SelectTrigger className={darkInputClass}><SelectValue placeholder="Origen"/></SelectTrigger><SelectContent className="bg-slate-900 border-slate-800 text-slate-100">{bankAccounts.filter(a => a.status === 'Activa').map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>))}</SelectContent></Select>
                            </div>
                            <ArrowRight className="mt-5 text-slate-600"/>
                            <div className="flex-1 space-y-1">
                                <Label className={labelClass}>Hacia Cuenta</Label>
                                <Select required onValueChange={(v) => handleSelectChange('destinationAccountId', v)} value={formData.destinationAccountId}><SelectTrigger className={darkInputClass}><SelectValue placeholder="Destino"/></SelectTrigger><SelectContent className="bg-slate-900 border-slate-800 text-slate-100">{bankAccounts.filter(a => a.status === 'Activa' && a.id !== formData.sourceAccountId).map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>))}</SelectContent></Select>
                            </div>
                        </div>
                     ) : (
                         <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <Label className={labelClass}>{formData.type === 'income' ? 'Cuenta Destino' : 'Cuenta Origen'}</Label>
                                <Select required onValueChange={(v) => handleSelectChange(formData.type === 'income' ? 'destinationAccountId' : 'sourceAccountId', v)} value={formData.type === 'income' ? formData.destinationAccountId : formData.sourceAccountId}>
                                    <SelectTrigger className={darkInputClass}><SelectValue placeholder="Seleccione una cuenta"/></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">{bankAccounts.filter(a => a.status === 'Activa').map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>))}</SelectContent>
                                </Select>
                             </div>
                             <div className="space-y-1">
                                <Label className={labelClass}>Forma de Pago</Label>
                                <Select required onValueChange={(v) => handleSelectChange('paymentMethod', v)} value={formData.paymentMethod}>
                                    <SelectTrigger className={darkInputClass}><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                        <SelectItem value="Transferencia">Transferencia</SelectItem>
                                        <SelectItem value="Efectivo">Efectivo</SelectItem>
                                        <SelectItem value="Depósito Bancario">Depósito Bancario</SelectItem>
                                        <SelectItem value="Cheque">Cheque</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                         </div>
                     )}
                </CardContent>
            </Card>

            {/* CLASSIFICATION */}
             <Card className={darkCardClass}>
                <CardContent className="p-4 grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <Label className={labelClass}>Centro de Costo</Label>
                        <Select onValueChange={(v) => handleSelectChange('description', v)} value={formData.description} required>
                            <SelectTrigger className={darkInputClass}><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">{costCenters.map(c => (<SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>))}</SelectContent>
                        </Select>
                     </div>
                     <div className="space-y-1">
                        <Label className={labelClass}>Referencia</Label>
                         <Input name="reference" value={formData.reference || ''} onChange={handleInputChange} className={darkInputClass} placeholder='Ej: Nro. Factura, Nro. Cheque'/>
                     </div>
                </CardContent>
            </Card>

            {/* ASSOCIATION */}
            {formData.type !== 'traspaso' && (
            <Card className={darkCardClass}>
                <CardContent className="p-4 space-y-4">
                     <Label className="font-medium text-slate-300">Asociación del Movimiento</Label>
                      <RadioGroup value={associationType} onValueChange={onAssociationChange} className="flex gap-4">
                          <div className="flex items-center space-x-2">
                              <RadioGroupItem value="document" id="r-doc" />
                              <Label htmlFor="r-doc">A Documento</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                              <RadioGroupItem value="anticipo" id="r-anticipo" />
                              <Label htmlFor="r-anticipo">Anticipo a Contacto</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                              <RadioGroupItem value="concept" id="r-concept" />
                              <Label htmlFor="r-concept">Concepto Interno</Label>
                          </div>
                      </RadioGroup>
                      
                       <div className='pt-2 space-y-2'>
                        {associationType === 'document' && ( /* ... */ )}
                        {associationType === 'anticipo' && ( /* ... */ )}
                        {associationType === 'concept' && ( /* ... */ )}
                      </div>
                      {pendingBalance !== null && ( /* ... */ )}
                </CardContent>
            </Card>
            )}

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
