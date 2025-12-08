
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import { useToast } from '@/hooks/use-toast';
import { useMasterData } from '@/hooks/use-master-data';
import { useOperations } from '@/hooks/use-operations';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QuickContactDialog } from '@/components/contacts/quick-contact-dialog';

import { FinancialMovement, PurchaseOrder, SalesOrder, ServiceOrder } from '@/lib/types';
import { cn } from '@/lib/utils';
import { 
    CalendarIcon, Trash2, ArrowDownLeft, ArrowUpRight, GitCompareArrows, 
    FileText, Plus, RefreshCw, UserPlus, Calculator, Wallet, Percent, AlertTriangle
} from 'lucide-react';

// --- Esquema de Validación con Zod ---
const movementItemSchema = z.object({
  concept: z.string().min(1, "El concepto es requerido."),
  amount: z.number().min(1, "El monto debe ser mayor a 0."),
});

const formSchema = z.object({
  voucherNumber: z.string().optional(),
  date: z.date({ required_error: "La fecha es requerida." }),
  type: z.enum(['income', 'expense', 'traspaso']),
  contactId: z.string().optional().nullable(),
  costCenter: z.string().min(1, "Debe seleccionar un centro de costos."),
  
  documentType: z.enum(['pending', 'manual']).optional(),
  pendingDocumentId: z.string().optional().nullable(),
  manualDteType: z.string().optional().nullable(),
  manualDteFolio: z.string().optional().nullable(),
  
  items: z.array(movementItemSchema).min(1, "Debe agregar al menos un ítem."),
  
  paymentMethod: z.string().min(1, "Seleccione una forma de pago."),
  sourceAccountId: z.string().optional().nullable(),
  destinationAccountId: z.string().optional().nullable(),
  notes: z.string().optional(),
}).refine(data => {
    if (data.type === 'traspaso') {
        return !!data.sourceAccountId && !!data.destinationAccountId;
    }
    if (data.type === 'income') {
        return !!data.destinationAccountId;
    }
    if (data.type === 'expense') {
        return !!data.sourceAccountId;
    }
    return true;
}, {
    message: "Debe seleccionar la cuenta bancaria correspondiente.",
    path: ['destinationAccountId']
});

type FormData = z.infer<typeof formSchema>;

type NewFinancialMovementSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (movement: FinancialMovement | Omit<FinancialMovement, 'id'>) => void;
  movement: FinancialMovement | null;
  allMovements: FinancialMovement[];
  onDelete: (movement: FinancialMovement) => void;
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  serviceOrders: ServiceOrder[];
  contacts: any[]; // Consider using a more specific type if possible
};

export function NewFinancialMovementSheet({ isOpen, onOpenChange, onSave, movement, allMovements, purchaseOrders, salesOrders }: NewFinancialMovementSheetProps) {
  const { toast } = useToast();
  const { bankAccounts, contacts, products, costCenters } = useMasterData();
  
  const [isQuickContactOpen, setIsQuickContactOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'income',
      items: [{ concept: '', amount: 0 }],
      documentType: 'pending',
      paymentMethod: 'Transferencia'
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const watchedItems = useWatch({ control: form.control, name: "items" });
  const movementType = form.watch('type');
  const contactId = form.watch('contactId');
  const pendingDocId = form.watch('pendingDocumentId');

  // --- Efectos y Lógica ---
  useEffect(() => {
    if (isOpen) {
      if (movement) {
        form.reset({
          voucherNumber: (movement as any).voucherNumber || '',
          date: parseISO(movement.date),
          type: movement.type,
          contactId: movement.contactId,
          costCenter: (movement as any).costCenter || '',
          pendingDocumentId: movement.relatedDocument?.id,
          documentType: movement.relatedDocument ? 'pending' : 'manual',
          items: (movement as any).items || [{ concept: movement.description, amount: movement.amount }],
          paymentMethod: movement.paymentMethod || 'Transferencia',
          sourceAccountId: movement.sourceAccountId,
          destinationAccountId: movement.destinationAccountId,
          notes: (movement as any).notes || ''
        });
      } else {
        form.reset({
          date: new Date(),
          type: 'income',
          items: [{ concept: '', amount: 0 }],
          documentType: 'pending',
          paymentMethod: 'Transferencia'
        });
      }
    }
  }, [isOpen, movement, form]);

  useEffect(() => {
    if (!movement && isOpen) {
        const prefix = movementType === 'income' ? 'ING' : movementType === 'expense' ? 'EGR' : 'TR';
        const countByType = allMovements.filter(m => m.type === movementType).length;
        const nextNumber = countByType + 1;
        const autoVoucher = `${prefix}-${String(nextNumber).padStart(4, '0')}`;
        form.setValue('voucherNumber', autoVoucher);
    }
  }, [movementType, allMovements, isOpen, movement, form]);

  useEffect(() => {
      if (!movement) {
          form.setValue('contactId', null);
          form.setValue('pendingDocumentId', null);
          form.setValue('sourceAccountId', null);
          form.setValue('destinationAccountId', null);
      }
  }, [movementType, form, movement]);

  const totalAmount = useMemo(() => {
    return (watchedItems || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [watchedItems]);

  const filteredContacts = useMemo(() => {
    if (movementType === 'income') {
      return contacts.filter(c => c.type?.includes('client') || c.type?.includes('other_income'));
    }
    if (movementType === 'expense') {
      return contacts.filter(c => c.type?.includes('supplier') || c.type?.includes('other_expense'));
    }
    return [];
  }, [movementType, contacts]);

  const pendingDocuments = useMemo(() => {
    if (!contactId) return [];
    if (movementType === 'income') return salesOrders.filter(o => o.clientId === contactId && (o.status === 'dispatched' || o.status === 'invoiced'));
    if (movementType === 'expense') return purchaseOrders.filter(o => o.supplierId === contactId && (o.status === 'completed' || o.status === 'received'));
    return [];
  }, [contactId, movementType, salesOrders, purchaseOrders]);

  // --- LÓGICA DE CONTROL DE SALDOS Y IVA ---
  const documentBalance = useMemo(() => {
    const doc = [...salesOrders, ...purchaseOrders].find(d => d.id === pendingDocId);
    if (!doc) return { total: 0, paid: 0, pending: 0, vat: 0, net: 0, isComplete: false };
    
    // Cálculo seguro del IVA
    const netAmount = doc.totalAmount || 0;
    // Si no tiene la flag o es true, asumimos que totalAmount es NETO y sumamos IVA. Si es false, es bruto.
    const grossTotal = doc.includeVat !== false ? Math.round(netAmount * 1.19) : netAmount;
    const vatAmount = grossTotal - netAmount;

    // Pagos previos
    const payments = allMovements
        .filter(m => m.relatedDocument?.id === doc.id && m.id !== movement?.id)
        .reduce((sum, m) => sum + m.amount, 0);
    
    const pending = grossTotal - payments;
    
    return { 
        net: netAmount,
        vat: vatAmount,
        total: grossTotal, 
        paid: payments, 
        pending: Math.max(0, pending),
        isComplete: pending <= 0 
    };
  }, [pendingDocId, salesOrders, purchaseOrders, allMovements, movement]);
  
  const combinedCostCenters = useMemo(() => {
      const productNames = products.map(p => ({ name: p }));
      return [...(costCenters || []), ...productNames];
  }, [costCenters, products]);

  // Función para aplicar montos rápidos
  const applyPaymentAmount = (amountToPay: number, concept: string) => {
      update(0, { 
          concept: concept, 
          amount: amountToPay 
      });
      if (fields.length > 1) {
          form.setValue('items', [{ concept: concept, amount: amountToPay }]);
      }
  };

  const onSubmit = (data: FormData) => {
    const totalFromItems = data.items.reduce((sum, item) => sum + item.amount, 0);
    
    if (data.pendingDocumentId && documentBalance.total > 0) {
        if (totalFromItems > documentBalance.pending + 100) { 
            toast({
                variant: "destructive",
                title: "Exceso de Pago",
                description: `El monto (${formatCurrency(totalFromItems)}) supera el saldo pendiente (${formatCurrency(documentBalance.pending)}).`
            });
            return;
        }
    }

    const cleanData = {
      type: data.type,
      costCenter: data.costCenter,
      date: format(data.date, 'yyyy-MM-dd'),
      amount: totalFromItems,
      description: data.items.map(i => i.concept).join(', '),
      contactId: data.contactId || null,
      voucherNumber: data.voucherNumber || null,
      paymentMethod: data.paymentMethod || null,
      sourceAccountId: data.sourceAccountId || null,
      destinationAccountId: data.destinationAccountId || null,
      notes: data.notes || null,
      manualDteType: data.manualDteType || null,
      manualDteFolio: data.manualDteFolio || null,
      relatedDocument: data.pendingDocumentId ? {
        id: data.pendingDocumentId,
        type: salesOrders.some(s => s.id === data.pendingDocumentId) ? 'OV' : 'OC',
      } : null,
      items: data.items,
    };
    
    Object.keys(cleanData).forEach(key => { if ((cleanData as any)[key] === undefined) (cleanData as any)[key] = null; });

    if (movement) {
        onSave({ ...cleanData, id: movement.id });
    } else {
        onSave(cleanData);
    }
  };
  
  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);
  const title = movement ? `Editar Movimiento` : 'Registrar Movimiento';
  const darkInputClass = "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-blue-500";
  const darkCardClass = "bg-slate-900 border-slate-800 shadow-sm";
  const labelClass = "text-xs font-medium text-slate-400 uppercase tracking-wide";
  const getTabClass = (tabType: string) => cn(
    "flex-1 h-12 text-base font-bold transition-all disabled:opacity-50",
    movementType === tabType
      ? (tabType === 'income' ? 'bg-emerald-600 shadow-lg shadow-emerald-900/20 text-white' : 
         tabType === 'expense' ? 'bg-rose-600 shadow-lg shadow-rose-900/20 text-white' :
         'bg-blue-600 shadow-lg shadow-blue-900/20 text-white')
      : 'bg-transparent text-slate-400 hover:bg-slate-800'
  );

  return (
    <>
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-4xl w-full flex flex-col p-0 gap-0 bg-slate-950 border-l-slate-800 text-slate-100">
        <SheetHeader className="px-6 py-4 bg-slate-900/50 border-b border-slate-800">
          <SheetTitle className="text-xl font-bold">{title}</SheetTitle>
          <SheetDescription className="text-slate-400">Registra un nuevo ingreso, egreso o traspaso de tesorería.</SheetDescription>
        </SheetHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            <Controller control={form.control} name="type" render={({ field }) => (
                <RadioGroup value={field.value} onValueChange={field.onChange} className='grid grid-cols-3 gap-2'>
                    <Label className={getTabClass('income')}>
                        <RadioGroupItem value='income' className='sr-only' /> <ArrowDownLeft className="mr-2"/> Ingreso
                    </Label>
                    <Label className={getTabClass('expense')}>
                        <RadioGroupItem value='expense' className='sr-only' /> <ArrowUpRight className="mr-2"/> Egreso
                    </Label>
                    <Label className={getTabClass('traspaso')}>
                        <RadioGroupItem value='traspaso' className='sr-only' /> <GitCompareArrows className="mr-2"/> Traspaso
                    </Label>
                </RadioGroup>
            )} />
            
            <Card className={darkCardClass}>
                <CardHeader><CardTitle className="text-lg text-slate-200">Información General</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label className={labelClass}>N° Voucher</Label>
                        <div className="relative">
                            <Input {...form.register('voucherNumber')} className={`${darkInputClass} pr-8`} placeholder='(Autogenerado)' readOnly />
                            <div className="absolute right-2 top-2.5 text-slate-500"><RefreshCw className="h-3 w-3 animate-pulse" /></div>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label className={labelClass}>Fecha</Label>
                        <Controller control={form.control} name="date" render={({ field }) => (
                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", darkInputClass, !field.value && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800 text-slate-100" align="start">
                                    <Calendar 
                                        mode="single" 
                                        selected={field.value} 
                                        onSelect={(date) => {
                                            field.onChange(date);
                                            setIsCalendarOpen(false); // Cierra el calendario al seleccionar
                                        }} 
                                        captionLayout="dropdown-buttons" 
                                        fromYear={2023} 
                                        toYear={2030} 
                                        locale={es} 
                                    />
                                </PopoverContent>
                            </Popover>
                        )} />
                    </div>
                    <div className="space-y-2">
                        <Label className={labelClass}>Centro de Costo</Label>
                        <Controller control={form.control} name="costCenter" render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className={darkInputClass}><SelectValue placeholder="Seleccione..."/></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">{combinedCostCenters.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                        )} />
                    </div>
                </CardContent>
            </Card>

            <Card className={darkCardClass}>
                <CardHeader><CardTitle className="text-lg text-slate-200">Asociación y Detalle</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    {movementType !== 'traspaso' ? (
                        <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className={labelClass}>{movementType === 'income' ? 'Cliente' : 'Proveedor'}</Label>
                                <div className="flex gap-2">
                                    <Controller control={form.control} name="contactId" render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                            <SelectTrigger className={darkInputClass}><SelectValue placeholder="Seleccione..."/></SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                                {filteredContacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )}/>
                                    <Button type="button" variant="outline" className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300" onClick={() => setIsQuickContactOpen(true)}>
                                        <UserPlus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className={labelClass}>Asociar a</Label>
                                <Controller control={form.control} name="documentType" render={({ field }) => (
                                    <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-2 items-center h-10">
                                        <RadioGroupItem value="pending" id="doc-pending" className="sr-only"/>
                                        <Label htmlFor="doc-pending" className={cn("flex-1 text-center py-2 border rounded-md cursor-pointer", field.value === 'pending' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-transparent border-slate-700 text-slate-400')}>Doc. Pendiente</Label>
                                        <RadioGroupItem value="manual" id="doc-manual" className="sr-only"/>
                                        <Label htmlFor="doc-manual" className={cn("flex-1 text-center py-2 border rounded-md cursor-pointer", field.value === 'manual' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-transparent border-slate-700 text-slate-400')}>Otro (Manual)</Label>
                                    </RadioGroup>
                                )}/>
                            </div>
                        </div>

                        {form.watch('documentType') === 'pending' ? (
                            <div className='space-y-4'>
                                <div className="space-y-2">
                                    <Label className={labelClass}>Documento Pendiente (OV/OC)</Label>
                                    <Controller control={form.control} name="pendingDocumentId" render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value || ''} disabled={!contactId || pendingDocuments.length === 0}>
                                            <SelectTrigger className={darkInputClass}><SelectValue placeholder={!contactId ? "Seleccione un contacto primero" : "Seleccione documento..."}/></SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                                {pendingDocuments.map(d => <SelectItem key={d.id} value={d.id}>{d.number || d.id} - {formatCurrency(d.totalAmount)} (Neto)</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )}/>
                                </div>
                               
                               {pendingDocId && (
                                   <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 space-y-4">
                                      <div className="flex items-start gap-3">
                                          <div className="p-2 bg-blue-500/10 rounded-md border border-blue-500/20">
                                              <FileText className="h-5 w-5 text-blue-400" />
                                          </div>
                                          <div className="flex-1 space-y-1">
                                              <h4 className="text-sm font-semibold text-slate-200">Resumen del Documento</h4>
                                              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                                                  <div className="flex justify-between">
                                                      <span className="text-slate-500">Monto Neto:</span>
                                                      <span className="font-mono text-slate-300">{formatCurrency(documentBalance.net)}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                      <span className="text-slate-500">IVA (19%):</span>
                                                      <span className="font-mono text-slate-300">{formatCurrency(documentBalance.vat)}</span>
                                                  </div>
                                                  <div className="flex justify-between border-t border-slate-700 pt-1 mt-1">
                                                      <span className="text-slate-400 font-bold">Total Bruto:</span>
                                                      <span className="font-mono font-bold text-white">{formatCurrency(documentBalance.total)}</span>
                                                  </div>
                                                  <div className="flex justify-between border-t border-slate-700 pt-1 mt-1">
                                                      <span className="text-slate-400 font-bold">Pagado:</span>
                                                      <span className="font-mono font-bold text-emerald-400">{formatCurrency(documentBalance.paid)}</span>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>

                                      <div className="pt-2 border-t border-slate-800">
                                          <div className="flex justify-between items-center mb-3">
                                              <span className="text-xs uppercase font-bold text-amber-500">Saldo Pendiente</span>
                                              <span className="text-xl font-bold text-amber-400 font-mono">{formatCurrency(documentBalance.pending)}</span>
                                          </div>
                                          
                                          <div className="grid grid-cols-3 gap-2">
                                              <Button 
                                                type="button" 
                                                variant="outline" 
                                                className="bg-slate-800 border-slate-700 hover:bg-emerald-900/30 hover:text-emerald-400 hover:border-emerald-800 text-xs"
                                                onClick={() => applyPaymentAmount(documentBalance.pending, `Pago Total ${movementType === 'income' ? 'OV' : 'OC'}`)}
                                                disabled={documentBalance.isComplete}
                                              >
                                                  <Wallet className="w-3 h-3 mr-2" /> Pagar Total
                                              </Button>
                                              
                                              <Button 
                                                type="button" 
                                                variant="outline" 
                                                className="bg-slate-800 border-slate-700 hover:bg-blue-900/30 hover:text-blue-400 hover:border-blue-800 text-xs"
                                                onClick={() => applyPaymentAmount(documentBalance.vat, `Pago IVA ${movementType === 'income' ? 'OV' : 'OC'}`)}
                                                disabled={documentBalance.isComplete || documentBalance.pending < documentBalance.vat}
                                              >
                                                  <Percent className="w-3 h-3 mr-2" /> Pagar IVA
                                              </Button>

                                              <Button 
                                                type="button" 
                                                variant="outline" 
                                                className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-xs"
                                                onClick={() => applyPaymentAmount(0, `Abono ${movementType === 'income' ? 'OV' : 'OC'}`)}
                                                disabled={documentBalance.isComplete}
                                              >
                                                  <Calculator className="w-3 h-3 mr-2" /> Abonar
                                              </Button>
                                          </div>
                                      </div>
                                      
                                      {documentBalance.isComplete && (
                                          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-2 rounded flex items-center text-xs font-bold">
                                              <AlertTriangle className="h-4 w-4 mr-2" /> Este documento ya está pagado en su totalidad.
                                          </div>
                                      )}
                                   </div>
                               )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                    <Label className={labelClass}>Tipo DTE</Label>
                                    <Controller control={form.control} name="manualDteType" render={({ field }) => (
                                      <Select onValueChange={field.onChange} value={field.value || ''}>
                                        <SelectTrigger className={darkInputClass}><SelectValue placeholder="Seleccione tipo..."/></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                            <SelectItem value="Factura">Factura</SelectItem>
                                            <SelectItem value="Boleta">Boleta</SelectItem>
                                            <SelectItem value="Boleta Honorarios">Boleta Honorarios</SelectItem>
                                            <SelectItem value="Recibo">Recibo</SelectItem>
                                            <SelectItem value="Otro">Otro</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      )}/>
                               </div>
                               <div className="space-y-2"><Label className={labelClass}>Folio DTE</Label><Input {...form.register('manualDteFolio')} placeholder="N° de Folio" className={darkInputClass}/></div>
                            </div>
                        )}
                        </>
                    ) : (
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className={labelClass}>Desde Cuenta (Origen)</Label>
                                <Controller control={form.control} name="sourceAccountId" render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                        <SelectTrigger className={darkInputClass}><SelectValue placeholder="Seleccione Origen..."/></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">{bankAccounts.filter(a => a.status === 'Activa').map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.name} - {acc.bankName}</SelectItem>))}</SelectContent>
                                    </Select>
                                )}/>
                            </div>
                             <div className="space-y-2">
                                <Label className={labelClass}>Hacia Cuenta (Destino)</Label>
                                <Controller control={form.control} name="destinationAccountId" render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                        <SelectTrigger className={darkInputClass}><SelectValue placeholder="Seleccione Destino..."/></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">{bankAccounts.filter(a => a.status === 'Activa' && a.id !== form.watch('sourceAccountId')).map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.name} - {acc.bankName}</SelectItem>))}</SelectContent>
                                    </Select>
                                )}/>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className={darkCardClass}>
                <CardHeader><CardTitle className="text-lg text-slate-200">Información de Pago</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className={labelClass}>Forma de Pago</Label>
                         <Controller control={form.control} name="paymentMethod" render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                <SelectTrigger className={darkInputClass}><SelectValue placeholder="Seleccione..."/></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                                    <SelectItem value="Cheque">Cheque</SelectItem>
                                    <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                                    <SelectItem value="Otro">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                        )} />
                    </div>

                    {movementType === 'income' && (
                        <div className="space-y-2">
                            <Label className={labelClass}>Cuenta Destino (Donde entra el dinero)</Label>
                            <Controller control={form.control} name="destinationAccountId" render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <SelectTrigger className={darkInputClass}><SelectValue placeholder="Seleccione Cuenta..."/></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                        {bankAccounts.filter(a => a.status === 'Activa').map(acc => (
                                            <SelectItem key={acc.id} value={acc.id}>{acc.name} - {acc.bankName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )} />
                        </div>
                    )}

                    {movementType === 'expense' && (
                        <div className="space-y-2">
                            <Label className={labelClass}>Cuenta Origen (De donde sale el dinero)</Label>
                            <Controller control={form.control} name="sourceAccountId" render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <SelectTrigger className={darkInputClass}><SelectValue placeholder="Seleccione Cuenta..."/></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                        {bankAccounts.filter(a => a.status === 'Activa').map(acc => (
                                            <SelectItem key={acc.id} value={acc.id}>{acc.name} - {acc.bankName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )} />
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className={darkCardClass}>
                <CardHeader><CardTitle className="text-lg text-slate-200">Ítems del Movimiento</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-800 hover:bg-transparent">
                                <TableHead className="text-slate-400">Concepto / Producto</TableHead>
                                <TableHead className="w-[200px] text-right text-slate-400">Monto</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((field, index) => (
                                <TableRow key={field.id} className="border-slate-800 hover:bg-transparent">
                                    <TableCell>
                                        <Input {...form.register(`items.${index}.concept`)} placeholder="Ej: Pago Factura 123" className={darkInputClass}/>
                                    </TableCell>
                                    <TableCell>
                                        <Controller control={form.control} name={`items.${index}.amount`} render={({ field: { onChange, value, ...rest} }) => (
                                             <Input type="number" value={value || ''} onChange={e => onChange(Number(e.target.value))} {...rest} className={`${darkInputClass} text-right font-mono`} placeholder="0" />
                                        )}/>
                                    </TableCell>
                                    <TableCell>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ concept: '', amount: 0})} className="mt-4 border-slate-700 text-slate-300 hover:bg-slate-800">
                        <Plus className="mr-2 h-4 w-4"/> Agregar Fila
                    </Button>
                </CardContent>
                <CardContent className="pt-0 flex justify-end">
                    <div className="w-1/2 bg-slate-950 p-4 rounded-lg border border-slate-800 flex justify-between items-center">
                        <span className="text-lg font-bold text-white">TOTAL MOVIMIENTO</span>
                        <span className="text-2xl font-bold text-emerald-400 font-mono">{formatCurrency(totalAmount)}</span>
                    </div>
                </CardContent>
            </Card>

          </div>
          <SheetFooter className="p-4 bg-slate-900 border-t border-slate-800 mt-auto flex justify-between">
            <div>
              {movement && (
                 <Button type="button" variant="destructive" onClick={() => onSave(movement)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <SheetClose asChild><Button type="button" variant="ghost" className="text-slate-400 hover:text-slate-100 hover:bg-slate-800">Cancelar</Button></SheetClose>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold" disabled={!form.formState.isValid || documentBalance.isComplete && form.watch('documentType') === 'pending'}>Guardar Movimiento</Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>

    <QuickContactDialog 
        isOpen={isQuickContactOpen}
        onOpenChange={setIsQuickContactOpen}
        type={movementType === 'income' ? 'client' : 'supplier'}
        onSuccess={(newId) => {
            form.setValue('contactId', newId.id);
        }}
    />
    </>
  );
}

