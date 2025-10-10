
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InventoryAdjustment } from '@/lib/types';
import { format } from 'date-fns';
import { useMasterData } from '@/hooks/use-master-data';

type NewAdjustmentSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (adjustment: InventoryAdjustment | Omit<InventoryAdjustment, 'id'>) => void;
  adjustment: InventoryAdjustment | null;
};

const getInitialFormData = (): Omit<InventoryAdjustment, 'id'> => ({
    date: format(new Date(), 'yyyy-MM-dd'),
    product: '',
    caliber: '',
    warehouse: '',
    type: 'decrease',
    quantity: 0,
    packagingQuantity: 0,
    reason: '',
});

export function NewAdjustmentSheet({ isOpen, onOpenChange, onSave, adjustment }: NewAdjustmentSheetProps) {
  const [formData, setFormData] = useState<Omit<InventoryAdjustment, 'id'>>(getInitialFormData());
  const { products, calibers, warehouses } = useMasterData();

  useEffect(() => {
    if (adjustment) {
        setFormData({
            ...adjustment,
            date: format(new Date(adjustment.date), 'yyyy-MM-dd'),
        });
    } else {
      setFormData(getInitialFormData());
    }
  }, [adjustment, isOpen]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: name === 'quantity' || name === 'packagingQuantity' ? Number(value) : value }));
  };

  const handleSelectChange = (name: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (adjustment) {
        onSave({ ...formData, id: adjustment.id });
    } else {
        onSave(formData);
    }
  };
  
  const title = adjustment ? 'Editar Ajuste' : 'Crear Ajuste de Inventario';
  const description = adjustment 
    ? 'Actualice la información del ajuste.'
    : 'Complete la información para registrar un nuevo ajuste de stock.';

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
              <Label htmlFor="product" className="text-right">
                Producto
              </Label>
               <Select required onValueChange={(value) => handleSelectChange('product', value)} value={formData.product}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Seleccione un producto" /></SelectTrigger>
                  <SelectContent>
                      {products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="caliber" className="text-right">
                Calibre
              </Label>
               <Select required onValueChange={(value) => handleSelectChange('caliber', value)} value={formData.caliber}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Seleccione un calibre" /></SelectTrigger>
                  <SelectContent>
                      {calibers.map(c => <SelectItem key={c.name} value={c.name}>{`${c.name} (${c.code})`}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="warehouse" className="text-right">
                Bodega
              </Label>
               <Select required onValueChange={(value) => handleSelectChange('warehouse', value)} value={formData.warehouse}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Seleccione una bodega" /></SelectTrigger>
                  <SelectContent>
                      {warehouses.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Tipo
              </Label>
              <Select
                required
                onValueChange={(value: 'increase' | 'decrease') => handleSelectChange('type', value)}
                value={formData.type}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccione un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="decrease">Disminución</SelectItem>
                  <SelectItem value="increase">Aumento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Cantidad (kg)
              </Label>
              <Input id="quantity" name="quantity" type="number" value={formData.quantity} onChange={handleInputChange} className="col-span-3" required min="0" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="packagingQuantity" className="text-right">
                Cant. Envases
              </Label>
              <Input id="packagingQuantity" name="packagingQuantity" type="number" value={formData.packagingQuantity || ''} onChange={handleInputChange} className="col-span-3" placeholder="Opcional" min="0" />
            </div>
             <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="reason" className="text-right pt-2">
                Motivo
              </Label>
              <Textarea id="reason" name="reason" value={formData.reason} onChange={handleInputChange} className="col-span-3" required />
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
