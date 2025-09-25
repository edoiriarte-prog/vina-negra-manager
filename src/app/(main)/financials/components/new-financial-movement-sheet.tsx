
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
import { Loader2, Sparkles, CalendarIcon, Trash2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMasterData } from '@/hooks/use-master-data';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { es } from 'date-fns/locale';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type NewFinancialMovementSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (movement: FinancialMovement | Omit<FinancialMovement, 'id'> | Omit<FinancialMovement, 'id'>[]) => void;
  movement: FinancialMovement | null;
  allMovements: FinancialMovement[];
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  serviceOrders: ServiceOrder[];
  contacts: Contact[];
};

type BatchMovement = Omit<FinancialMovement, 'id' | 'contactId' | 'type'> & { batchId: number };

const getInitialFormData = (): Omit<FinancialMovement, 'id'> => ({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'expense',
    description: '',
    amount: 0,
    paymentMethod: 'Transferencia',
    accountId: '',
    contactId: undefined,
    relatedDocument: undefined,
    internalConcept: undefined,
    reference: '',
});


export function NewFinancialMovementSheet({ 
    isOpen, onOpenChange, onSave, movement, allMovements, 
    purchaseOrders, salesOrders, serviceOrders, contacts 
}: NewFinancialMovementSheetProps) {
  const [formData, setFormData] = useState<Omit<FinancialMovement, 'id'>>(getInitialFormData());
  const [associationType, setAssociationType] = useState<'document' | 'contact' | 'concept'>('document');
  const [relatedOrderType, setRelatedOrderType] = useState<'OV' | 'OC' | 'OS' | ''>('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchMovements, setBatchMovements] = useState<BatchMovement[]>([]);
  const { toast } = useToast();
  const { bankAccounts } = useMasterData();

  useEffect(() => {
    if (movement) {
        setIsBatchMode(false);
        setFormData({
            ...movement,
            date: format(new Date(movement.date), 'yyyy-MM-dd'),
        });
        if (movement.relatedDocument) {
            setAssociationType('document');
            setRelatedOrderType(movement.relatedDocument.type);
        } else if (movement.contactId) {
            setAssociationType('contact');
        } else {
            setAssociationType('concept');
        }
    } else {
      setFormData(getInitialFormData());
      setRelatedOrderType('');
      setAssociationType('document');
      setIsBatchMode(false);
      setBatchMovements([]);
    }
  }, [movement, isOpen]);
  
  useEffect(() => {
      if (isBatchMode) {
          setAssociationType('contact');
      } else {
          setAssociationType('document');
      }
  }, [isBatchMode]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: name === 'amount' ? Number(value) : value }));
  };

  const handleSelectChange = (name: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRelatedOrderSelect = (orderId: string) => {
    if (!relatedOrderType) return;
    
    let orderAmount = 0;
    let newDescription = '';
    let contactId: string | undefined = undefined;

    if (relatedOrderType === 'OC') {
        const order = purchaseOrders.find(o => o.id === orderId);
        if (order) {
            const paymentsMade = allMovements
                .filter(m => m.relatedDocument?.id === orderId && m.type === 'expense')
                .reduce((sum, m) => sum + m.amount, 0);
            orderAmount = order.totalAmount - paymentsMade;
            newDescription = `Pago O/C ${order.id}`;
            contactId = order.supplierId;
        }
    } else if (relatedOrderType === 'OV') {
        const order = salesOrders.find(o => o.id === orderId);
        if (order) {
            const paymentsMade = allMovements
                .filter(m => m.relatedDocument?.id === orderId && m.type === 'income')
                .reduce((sum, m) => sum + m.amount, 0);
            orderAmount = order.totalAmount - paymentsMade;
            newDescription = `Pago O/V ${order.id}`;
            contactId = order.clientId;
        }
    } else if (relatedOrderType === 'OS') {
        const order = serviceOrders.find(o => o.id === orderId);
        if (order) {
            const paymentsMade = allMovements
                .filter(m => m.relatedDocument?.id === orderId && m.type === 'expense')
                .reduce((sum, m) => sum + m.amount, 0);
            orderAmount = order.cost - paymentsMade;
            newDescription = `Pago O/S ${order.id} - ${order.description}`;
        }
    }

    setFormData(prev => ({ 
        ...prev, 
        relatedDocument: { type: relatedOrderType, id: orderId },
        contactId: contactId,
        amount: orderAmount > 0 ? orderAmount : 0,
        description: newDescription,
        internalConcept: undefined,
    }));
  }

  const handleSuggestDescription = async () => {
    let details = '';
    let totalAmount = 0;
    let isOrderRelated = false;

    if (associationType === 'document' && formData.relatedDocument) {
        isOrderRelated = true;
        if (formData.relatedDocument.type === 'OC') {
            const order = purchaseOrders.find(o => o.id === formData.relatedDocument?.id);
            if (order) { details = `Orden de Compra ${order?.id}`; totalAmount = order.totalAmount; }
        } else if(formData.relatedDocument.type === 'OV') {
            const order = salesOrders.find(o => o.id === formData.relatedDocument?.id);
            if (order) { details = `Orden de Venta ${order?.id}`; totalAmount = order.totalAmount; }
        } else if(formData.relatedDocument.type === 'OS') {
            const order = serviceOrders.find(o => o.id === formData.relatedDocument?.id);
            if (order) { details = `Orden de Servicio ${order?.id} (${order.description})`; totalAmount = order.cost; }
        }
    } else if (associationType === 'contact' && formData.contactId) {
        const contact = contacts.find(c => c.id === formData.contactId);
        details = `Movimiento para ${contact?.name}`;
    } else if (associationType === 'concept' && formData.internalConcept) {
        details = `Concepto interno: ${formData.internalConcept}`;
    } else {
         toast({ variant: 'destructive', title: 'Error', description: 'Seleccione una asociación para sugerir una descripción.' });
        return;
    }
    
    setIsSuggesting(true);
    try {
        if (isOrderRelated) {
            const paymentsMade = allMovements
                .filter(m => m.relatedDocument?.id === formData.relatedDocument?.id)
                .reduce((sum, m) => sum + m.amount, 0);
            
            const newTotalPaid = paymentsMade + formData.amount;
            details += (newTotalPaid < totalAmount) ? ` (abono).` : ` (pago final).`;
        }

        const result = await suggestTransactionDescription({
            transactionType: formData.type,
            transactionDetails: details,
        });

        setFormData(prev => ({...prev, description: result.suggestedDescription}));
    } catch(e) {
        toast({
            variant: 'destructive',
            title: 'Error de IA',
            description: 'No se pudo sugerir una descripción.',
        })
    } finally {
        setIsSuggesting(false);
    }
  }

  const addBatchMovement = () => {
    setBatchMovements(prev => [...prev, { 
        batchId: Date.now(), 
        date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        amount: 0,
        paymentMethod: 'Transferencia',
        accountId: '',
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
        if (batchMovements.length === 0 || batchMovements.some(m => m.amount <= 0 || !m.description || !m.accountId)) {
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
        if (movement) {
            onSave({ ...formData, id: movement.id });
        } else {
            onSave(formData);
        }
    }
  };
  
  const getOrderOptions = () => {
    switch (relatedOrderType) {
        case 'OC': return purchaseOrders.map(o => ({ value: o.id, label: `${o.id}` }));
        case 'OV': return salesOrders.map(o => ({ value: o.id, label: `${o.id}` }));
        case 'OS': return serviceOrders.map(o => ({ value: o.id, label: `${o.id} - ${o.description}`}));
        default: return [];
    }
  }

  const title = movement ? 'Editar Movimiento' : 'Registrar Nuevo Movimiento';
  const description = movement 
    ? 'Actualice la información del movimiento.'
    : 'Complete la información para registrar un nuevo ingreso o egreso.';

  const filteredContacts = formData.type === 'income' 
    ? contacts.filter(c => c.type === 'client') 
    : contacts.filter(c => c.type === 'supplier');

  const onAssociationChange = (value: 'document' | 'contact' | 'concept') => {
      setAssociationType(value);
      setFormData(prev => ({
          ...prev,
          relatedDocument: undefined,
          contactId: undefined,
          internalConcept: undefined,
      }));
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            
            <div className='flex justify-between items-center p-2 bg-muted rounded-md'>
                <div className='flex gap-2'>
                    <Button type="button" variant={formData.type === 'income' ? 'default' : 'secondary'} onClick={() => handleSelectChange('type', 'income')}>Ingreso</Button>
                    <Button type="button" variant={formData.type === 'expense' ? 'default' : 'secondary'} onClick={() => handleSelectChange('type', 'expense')}>Egreso</Button>
                </div>
                 {!movement && (
                    <div className="flex items-center space-x-2">
                        <Switch id="batch-mode" checked={isBatchMode} onCheckedChange={setIsBatchMode} />
                        <Label htmlFor="batch-mode">Registro Múltiple</Label>
                    </div>
                )}
            </div>

            {isBatchMode ? (
            <div>
                 <div className="grid grid-cols-4 items-center gap-4 mb-4">
                    <Label className="text-right">Contacto</Label>
                     <Select
                        onValueChange={(value) => handleSelectChange('contactId', value)}
                        value={formData.contactId}
                        required
                        className="col-span-3"
                     >
                         <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Seleccione un contacto para el lote" />
                         </SelectTrigger>
                         <SelectContent>
                            {filteredContacts.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                         </SelectContent>
                     </Select>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Monto</TableHead>
                                <TableHead>Forma Pago</TableHead>
                                <TableHead>Cuenta</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {batchMovements.map(bm => (
                                <TableRow key={bm.batchId}>
                                    <TableCell className='min-w-[150px]'>
                                        <Input type="date" value={bm.date} onChange={(e) => handleBatchChange(bm.batchId, 'date', e.target.value)} />
                                    </TableCell>
                                    <TableCell className='min-w-[150px]'>
                                        <Input type="number" placeholder="$" value={bm.amount || ''} onChange={(e) => handleBatchChange(bm.batchId, 'amount', Number(e.target.value))} />
                                    </TableCell>
                                    <TableCell className='min-w-[180px]'>
                                         <Select onValueChange={(value) => handleBatchChange(bm.batchId, 'paymentMethod', value)} value={bm.paymentMethod}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Transferencia">Transferencia</SelectItem>
                                                <SelectItem value="Efectivo">Efectivo</SelectItem>
                                                <SelectItem value="Depósito Bancario">Depósito</SelectItem>
                                                <SelectItem value="Cheque">Cheque</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                     <TableCell className='min-w-[200px]'>
                                         <Select onValueChange={(value) => handleBatchChange(bm.batchId, 'accountId', value)} value={bm.accountId}>
                                            <SelectTrigger><SelectValue placeholder="Seleccione..."/></SelectTrigger>
                                            <SelectContent>
                                            {bankAccounts.filter(a => a.status === 'Activa').map(acc => (
                                                <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                            ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className='min-w-[250px]'>
                                        <Input placeholder="Descripción del movimiento" value={bm.description} onChange={(e) => handleBatchChange(bm.batchId, 'description', e.target.value)} />
                                    </TableCell>
                                    <TableCell>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeBatchMovement(bm.batchId)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addBatchMovement}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Agregar Movimiento
                </Button>
            </div>
            ) : (
            <div className="grid gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="date" className="text-right">
                        Fecha
                    </Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "col-span-3 justify-start text-left font-normal",
                            !formData.date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.date ? format(parseISO(formData.date), "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={formData.date ? parseISO(formData.date) : undefined}
                            onSelect={(date) => {
                                if (date) {
                                    handleSelectChange('date', format(date, 'yyyy-MM-dd'))
                                }
                            }}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="amount" className="text-right">
                        Monto
                    </Label>
                    <Input id="amount" name="amount" type="number" value={formData.amount} onChange={handleInputChange} className="col-span-3" required placeholder="$" />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentMethod" className="text-right">
                    Forma Pago
                </Label>
                <Select required onValueChange={(value) => handleSelectChange('paymentMethod', value)} value={formData.paymentMethod}>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="Depósito Bancario">Depósito Bancario</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">
                    {formData.type === 'income' ? 'Cta. Destino' : 'Cta. Origen'}
                </Label>
                <Select required onValueChange={(value) => handleSelectChange('accountId', value)} value={formData.accountId}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Seleccione una cuenta"/></SelectTrigger>
                    <SelectContent>
                    {bankAccounts.filter(a => a.status === 'Activa').map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                </div>

                <div className="space-y-2 p-3 border rounded-md">
                    <Label>Asociar a:</Label>
                    <RadioGroup value={associationType} onValueChange={onAssociationChange} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="document" id="r-doc" />
                            <Label htmlFor="r-doc">Documento</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="contact" id="r-contact" />
                            <Label htmlFor="r-contact">Contacto</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="concept" id="r-concept" />
                            <Label htmlFor="r-concept">Concepto Interno</Label>
                        </div>
                    </RadioGroup>
                    
                    <div className='pt-2'>
                    {associationType === 'document' && (
                        <div className='grid grid-cols-2 gap-2'>
                            <Select 
                                onValueChange={(value: 'OV' | 'OC' | 'OS' | '') => {
                                    setRelatedOrderType(value);
                                    setFormData(prev => ({...prev, relatedDocument: undefined, contactId: undefined}));
                                }} 
                                value={relatedOrderType}
                            >
                                <SelectTrigger><SelectValue placeholder="Tipo Doc." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OV">Venta (O/V)</SelectItem>
                                    <SelectItem value="OC">Compra (O/C)</SelectItem>
                                    <SelectItem value="OS">Servicio (O/S)</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select onValueChange={handleRelatedOrderSelect} value={formData.relatedDocument?.id} disabled={!relatedOrderType}>
                                <SelectTrigger><SelectValue placeholder="ID Documento" /></SelectTrigger>
                                <SelectContent>
                                    {getOrderOptions().map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {associationType === 'contact' && (
                        <Select
                            onValueChange={(value) => handleSelectChange('contactId', value)}
                            value={formData.contactId}
                            required
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione un contacto" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredContacts.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {associationType === 'concept' && (
                        <Select
                            onValueChange={(value) => handleSelectChange('internalConcept', value)}
                            value={formData.internalConcept}
                            required
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione un concepto" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Retiro de Socios">Retiro de Socios</SelectItem>
                                <SelectItem value="Pago de Impuestos">Pago de Impuestos</SelectItem>
                                <SelectItem value="Comisión Bancaria">Comisión Bancaria</SelectItem>
                                <SelectItem value="Préstamo Interno">Préstamo Interno</SelectItem>
                                <SelectItem value="Otro">Otro</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                    </div>
                </div>

                <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right pt-2">
                    Descripción
                </Label>
                <div className='col-span-3'>
                    <Input id="description" name="description" value={formData.description} onChange={handleInputChange} className="w-full" required />
                    <Button type="button" size="sm" variant="outline" className="mt-2" onClick={handleSuggestDescription} disabled={isSuggesting}>
                        {isSuggesting ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Sparkles className='mr-2 h-4 w-4'/>}
                        Sugerir con IA
                    </Button>
                </div>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="reference" className="text-right pt-2">
                    Referencia
                </Label>
                <Input id="reference" name="reference" value={formData.reference || ''} onChange={handleInputChange} className="col-span-3" placeholder='Ej: Nro. Transferencia'/>
                </div>
            </div>
            )}
          </div>
          <SheetFooter className="mt-4">
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </SheetClose>
            <Button type="submit">Guardar</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

    