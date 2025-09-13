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

const PRODUCTS = ["PALTAS", "UVAS", "DURAZNOS", "CLEMENTINAS", "MANDARINAS"];
const CALIBERS = ["EXTRA", "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "DESCARTES"];
const UNITS = ["Kilos", "Cajas"];

const getInitialFormData = (): Omit<PurchaseOrder, 'id' | 'totalAmount' | 'totalKilos'> => ({
    supplierId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    items: [{ id: `temp-${Date.now()}`, product: '', caliber: '', quantity: 0, unit: 'Kilos', price: 0 }],
    status: 'pending' as 'pending' | 'completed' | 'cancelled',
});

export function NewPurchaseOrderSheet({ isOpen, onOpenChange, onSave, order, suppliers }: NewPurchaseOrderSheetProps) {
  const [formData, setFormData] = useState<Omit<PurchaseOrder, 'id' | 'totalAmount' | 'totalKilos'>>(getInitialFormData());

  useEffect(() => {
    if (order) {
        const { totalAmount, totalKilos, ...rest } = order;
        setFormData({
            ...rest,
            date: format(new Date(order.date), 'yyyy-MM-dd'),
        });
    } else {
      setFormData(getInitialFormData());
    }
  }, [order, isOpen]);
  
  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };
    (item[field] as any) = value; // Type assertion
    newItems[index] = item;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleSelectChange = (name: keyof typeof formData | `items.${number}.${keyof OrderItem}`, value: any) => {
    if (name.startsWith('items.')) {
        const [_, indexStr, field] = name.split('.');
        const index = parseInt(indexStr);
        handleItemChange(index, field as keyof OrderItem, value);
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };


  const addNewItem = () => {
    setFormData(prev => ({
        ...prev,
        items: [...prev.items, { id: `temp-${Date.now()}`, product: '', caliber: '', quantity: 0, unit: 'Kilos', price: 0 }]
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
    const totalAmount = formData.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0);
    const totalKilos = formData.items.reduce((sum, item) => {
      // Assuming 'Kilos' is the primary unit for total weight calculation
      if (item.unit === 'Kilos') {
        return sum + Number(item.quantity || 0);
      }
      // You might need a conversion factor if 'Cajas' should be included in total kilos
      return sum;
    }, 0);


    const orderToSave = {
        ...formData,
        totalAmount,
        totalKilos,
    }

    if(order) {
        onSave({ ...orderToSave, id: order.id });
    } else {
        onSave(orderToSave);
    }
  };
  
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name.startsWith('items.')) {
        const [_, indexStr, field] = name.split('.');
        const index = parseInt(indexStr);
        handleItemChange(index, field as keyof OrderItem, field === 'quantity' || field === 'price' ? Number(value) : value);
    } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
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
      <SheetContent className="sm:max-w-3xl overflow-y-auto">
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
                onValueChange={(value) => handleSelectChange('supplierId', value)}
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
                {formData.items.map((item, index) => {
                  const subtotal = (item.quantity || 0) * (item.price || 0);
                  return (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center mb-2 p-3 border rounded-md">
                        {/* Product */}
                        <div className="col-span-12 sm:col-span-3">
                             <Label htmlFor={`item-product-${index}`}>Producto</Label>
                             <Select required onValueChange={(value) => handleSelectChange(`items.${index}.product`, value)} value={item.product}>
                                 <SelectTrigger><SelectValue placeholder="Producto" /></SelectTrigger>
                                 <SelectContent>
                                     {PRODUCTS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                 </SelectContent>
                             </Select>
                        </div>
                        {/* Caliber */}
                        <div className="col-span-12 sm:col-span-3">
                             <Label htmlFor={`item-caliber-${index}`}>Calibre</Label>
                             <Select required onValueChange={(value) => handleSelectChange(`items.${index}.caliber`, value)} value={item.caliber}>
                                 <SelectTrigger><SelectValue placeholder="Calibre" /></SelectTrigger>
                                 <SelectContent>
                                     {CALIBERS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                 </SelectContent>
                             </Select>
                        </div>
                        {/* Quantity */}
                         <div className="col-span-6 sm:col-span-2">
                             <Label htmlFor={`item-quantity-${index}`}>Cantidad</Label>
                             <Input id={`item-quantity-${index}`} name={`items.${index}.quantity`} type="number" value={item.quantity} onChange={handleInputChange} placeholder="Cant." required />
                        </div>
                        {/* Unit */}
                        <div className="col-span-6 sm:col-span-2">
                            <Label htmlFor={`item-unit-${index}`}>Unidad</Label>
                             <Select required onValueChange={(value) => handleSelectChange(`items.${index}.unit`, value)} value={item.unit}>
                                 <SelectTrigger><SelectValue placeholder="Unidad" /></SelectTrigger>
                                 <SelectContent>
                                     {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                 </SelectContent>
                             </Select>
                        </div>
                        {/* Price */}
                         <div className="col-span-6 sm:col-span-2">
                             <Label htmlFor={`item-price-${index}`}>Precio</Label>
                             <Input id={`item-price-${index}`} name={`items.${index}.price`} type="number" value={item.price} onChange={handleInputChange} placeholder="Precio" required />
                        </div>
                        {/* Subtotal */}
                         <div className="col-span-6 sm:col-span-3">
                             <Label>Subtotal</Label>
                             <Input value={new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(subtotal)} readOnly disabled />
                        </div>
                        {/* Remove button */}
                        <div className='col-span-12 sm:col-span-1 self-end'>
                             <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={formData.items.length <= 1}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    </div>
                )})}
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
                onValueChange={(value: 'pending' | 'completed' | 'cancelled') => handleSelectChange('status', value)}
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
          <SheetFooter className="mt-6">
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
