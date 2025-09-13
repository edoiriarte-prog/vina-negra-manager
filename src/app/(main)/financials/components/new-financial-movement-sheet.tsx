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
import { FinancialMovement, PurchaseOrder, SalesOrder, ServiceOrder } from '@/lib/types';
import { format } from 'date-fns';
import { suggestTransactionDescription } from '@/ai/flows/suggest-transaction-descriptions';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type NewFinancialMovementSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (movement: FinancialMovement | Omit<FinancialMovement, 'id'>) => void;
  movement: FinancialMovement | null;
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  serviceOrders: ServiceOrder[];
};

const getInitialFormData = (): Omit<FinancialMovement, 'id'> => ({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'expense',
    description: '',
    amount: 0,
    relatedOrder: undefined,
});


export function NewFinancialMovementSheet({ isOpen, onOpenChange, onSave, movement, purchaseOrders, salesOrders, serviceOrders }: NewFinancialMovementSheetProps) {
  const [formData, setFormData] = useState<Omit<FinancialMovement, 'id'>>(getInitialFormData());
  const [relatedOrderType, setRelatedOrderType] = useState<'OV' | 'OC' | 'OS' | ''>('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (movement) {
        setFormData({
            ...movement,
            date: format(new Date(movement.date), 'yyyy-MM-dd'),
        });
        setRelatedOrderType(movement.relatedOrder?.type || '');
    } else {
      setFormData(getInitialFormData());
      setRelatedOrderType('');
    }
  }, [movement, isOpen]);

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
    if (relatedOrderType === 'OC') {
        const order = purchaseOrders.find(o => o.id === orderId);
        if (order) orderAmount = order.totalAmount;
    } else if (relatedOrderType === 'OV') {
        const order = salesOrders.find(o => o.id === orderId);
        if (order) orderAmount = order.totalAmount;
    } else if (relatedOrderType === 'OS') {
        const order = serviceOrders.find(o => o.id === orderId);
        if (order) orderAmount = order.cost;
    }

    setFormData(prev => ({ 
        ...prev, 
        relatedOrder: { type: relatedOrderType, id: orderId },
        amount: orderAmount // Set amount to total by default
    }));
  }

  const handleSuggestDescription = async () => {
    if (!formData.relatedOrder) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Seleccione un documento relacionado para sugerir una descripción.',
        });
        return;
    }
    
    setIsSuggesting(true);
    try {
        let details = '';
        let totalAmount = 0;

        if (formData.relatedOrder.type === 'OC') {
            const order = purchaseOrders.find(o => o.id === formData.relatedOrder?.id);
            if (order) {
                details = `Orden de Compra ${order?.id}`;
                totalAmount = order.totalAmount;
            }
        } else if(formData.relatedOrder.type === 'OV') {
            const order = salesOrders.find(o => o.id === formData.relatedOrder?.id);
            if (order) {
                details = `Orden de Venta ${order?.id}`;
                totalAmount = order.totalAmount;
            }
        } else if(formData.relatedOrder.type === 'OS') {
            const order = serviceOrders.find(o => o.id === formData.relatedOrder?.id);
            if (order) {
                details = `Orden de Servicio ${order?.id} (${order.description})`;
                totalAmount = order.cost;
            }
        }

        if (formData.amount < totalAmount) {
            details += ` por un monto de ${formData.amount} de un total de ${totalAmount} (abono).`;
        } else {
            details += ` por un monto de ${formData.amount} (pago total).`;
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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (movement) {
        onSave({ ...formData, id: movement.id });
    } else {
        onSave(formData);
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

  const title = movement ? 'Editar Movimiento' : 'Crear Movimiento Financiero';
  const description = movement 
    ? 'Actualice la información del movimiento.'
    : 'Complete la información para registrar un nuevo ingreso o egreso.';

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Fecha
              </Label>
              <Input id="date" name="date" type="date" value={formData.date} onChange={handleInputChange} className="col-span-3" required />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Tipo
              </Label>
              <Select
                required
                onValueChange={(value: 'income' | 'expense') => handleSelectChange('type', value)}
                value={formData.type}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccione un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Ingreso</SelectItem>
                  <SelectItem value="expense">Egreso</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="relatedOrderType" className="text-right pt-2">
                    Doc. Relacionado
                </Label>
                <div className='col-span-3 grid grid-cols-2 gap-2'>
                    <Select onValueChange={(value: 'OV' | 'OC' | 'OS' | '') => setRelatedOrderType(value)} value={relatedOrderType}>
                        <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="OV">Venta (O/V)</SelectItem>
                            <SelectItem value="OC">Compra (O/C)</SelectItem>
                            <SelectItem value="OS">Servicio (O/S)</SelectItem>
                        </SelectContent>
                    </Select>
                     <Select onValueChange={handleRelatedOrderSelect} value={formData.relatedOrder?.id} disabled={!relatedOrderType}>
                        <SelectTrigger><SelectValue placeholder="ID Documento" /></SelectTrigger>
                        <SelectContent>
                            {getOrderOptions().map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Monto
              </Label>
              <Input id="amount" name="amount" type="number" value={formData.amount} onChange={handleInputChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Descripción
              </Label>
              <div className='col-span-3'>
                <Input id="description" name="description" value={formData.description} onChange={handleInputChange} className="w-full" required />
                <Button type="button" size="sm" variant="outline" className="mt-2" onClick={handleSuggestDescription} disabled={isSuggesting || !formData.relatedOrder}>
                    {isSuggesting ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Sparkles className='mr-2 h-4 w-4'/>}
                    Sugerir con IA
                </Button>
              </div>
            </div>
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
