
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
import { Textarea } from '@/components/ui/textarea';
import { ServiceOrder } from '@/lib/types';
import { format } from 'date-fns';

type NewServiceOrderSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (order: ServiceOrder | Omit<ServiceOrder, 'id'>) => void;
  order: ServiceOrder | null;
};

const getInitialFormData = (): Omit<ServiceOrder, 'id'> => ({
    provider: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    serviceType: '',
    cost: 0,
    description: '',
    relatedPurchaseId: '',
});

export function NewServiceOrderSheet({ isOpen, onOpenChange, onSave, order }: NewServiceOrderSheetProps) {
  const [formData, setFormData] = useState<Omit<ServiceOrder, 'id'>>(getInitialFormData());

  useEffect(() => {
    if (order) {
        setFormData({
            ...order,
            date: format(new Date(order.date), 'yyyy-MM-dd'),
        });
    } else {
      setFormData(getInitialFormData());
    }
  }, [order, isOpen]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: name === 'cost' ? Number(value) : value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (order) {
        onSave({ ...formData, id: order.id });
    } else {
        onSave(formData);
    }
  };
  
  const title = order ? 'Editar Orden de Servicio' : 'Crear Orden de Servicio';
  const description = order 
    ? 'Actualice la información de la orden de servicio.'
    : 'Complete la información para registrar un nuevo servicio.';

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
              <Label htmlFor="provider" className="text-right">
                Proveedor
              </Label>
              <Input id="provider" name="provider" value={formData.provider} onChange={handleInputChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="serviceType" className="text-right">
                Tipo Servicio
              </Label>
              <Input id="serviceType" name="serviceType" value={formData.serviceType} onChange={handleInputChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cost" className="text-right">
                Costo
              </Label>
              <Input id="cost" name="cost" type="number" value={formData.cost} onChange={handleInputChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Descripción
              </Label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} className="col-span-3" required />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="relatedPurchaseId" className="text-right">
                O/C Relacionada
              </Label>
              <Input id="relatedPurchaseId" name="relatedPurchaseId" value={formData.relatedPurchaseId} onChange={handleInputChange} className="col-span-3" placeholder="Ej: OC-1001" />
            </div>
          </div>
          <SheetFooter>
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
