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
import { PlusCircle, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PurchaseOrder, OrderItem, Contact } from '@/lib/types';
import { format } from 'date-fns';

type NewPurchaseOrderSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (order: PurchaseOrder | Omit<PurchaseOrder, 'id'>) => void;
  order: PurchaseOrder | null;
  suppliers: Contact[];
};

const initialFormData = {
    supplierId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    items: [{ id: 'temp-1', product: 'Cereza', caliber: '', quantity: 0 }],
    status: 'pending' as 'pending' | 'completed' | 'cancelled',
};

export function NewPurchaseOrderSheet({ isOpen, onOpenChange, onSave, order, suppliers }: NewPurchaseOrderSheetProps) {
  const [formData, setFormData] = useState<Omit<PurchaseOrder, 'id' | 'totalKilos' | 'totalAmount'>>(initialFormData);

  useEffect(() => {
    if (order) {
        const { totalKilos, totalAmount, ...rest } = order;
        setFormData({
            ...rest,
            date: format(new Date(order.date), 'yyyy-MM-dd'),
        });
    } else {
      setFormData(initialFormData);
    }
  }, [order, isOpen]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };
    (item[field] as any) = value; // Type assertion
    newItems[index] = item;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addNewItem = () => {
    setFormData(prev => ({
        ...prev,
        items: [...prev.items, { id: `temp-${Date.now()}`, product: 'Cereza', caliber: '', quantity: 0 }]
    }))
  }
  
  const removeItem = (index: number) => {
    setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const totalKilos = formData.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    // Simple price calculation for demo
    const totalAmount = totalKilos * 3000; 

    const orderToSave = {
        ...formData,
        totalKilos,
        totalAmount,
    }

    if(order) {
        onSave({ ...orderToSave, id: order.id });
    } else {
        onSave(orderToSave);
    }
  };

  const title = order ? 'Editar Orden de Compra' : 'Crear Orden de Compra';
  const description = order 
    ? 'Actualice la información de la orden.'
    : 'Complete la información para registrar una nueva orden de compra.';

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
       <Button onClick={() => onOpenChange(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Nueva Compra
      </Button>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
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
              <Label htmlFor="supplierId" className="text-right">
                Proveedor
              </Label>
              <Select
                required
                onValueChange={(value) => setFormData(prev => ({ ...prev, supplierId: value }))}
                value={formData.supplierId}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccione un proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="my-4">
              <h4 className="font-medium mb-2">Ítems de la Orden</h4>
                {formData.items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center mb-2 p-2 border rounded-md">
                        <div className="col-span-4">
                             <Label htmlFor={`item-caliber-${index}`} className="sr-only">Calibre</Label>
                             <Input id={`item-caliber-${index}`} value={item.caliber} onChange={(e) => handleItemChange(index, 'caliber', e.target.value)} placeholder="Calibre" required />
                        </div>
                         <div className="col-span-4">
                             <Label htmlFor={`item-quantity-${index}`} className="sr-only">Cantidad (kg)</Label>
                             <Input id={`item-quantity-${index}`} type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))} placeholder="Kilos" required />
                        </div>
                        <div className="col-span-3">
                            <Label htmlFor={`item-product-${index}`} className="sr_only sr-only">Producto</Label>
                            <Input id={`item-product-${index}`} value={item.product} readOnly disabled />
                        </div>
                        <div className='col-span-1'>
                             <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={formData.items.length <= 1}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    </div>
                ))}
                 <Button type="button" variant="outline" size="sm" onClick={addNewItem} className='mt-2'>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Agregar Ítem
                </Button>
            </div>


            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Estado
              </Label>
              <Select
                required
                onValueChange={(value: 'pending' | 'completed' | 'cancelled') => setFormData(prev => ({...prev, status: value}))}
                value={formData.status}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccione un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
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
