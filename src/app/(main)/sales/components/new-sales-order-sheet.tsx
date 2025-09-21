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
import { PlusCircle, Trash2, Eye } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SalesOrder, OrderItem, Contact, InventoryItem } from '@/lib/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useMasterData } from '@/hooks/use-master-data';
import { SalesOrderPreview } from './sales-order-preview';

type NewSalesOrderSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (order: SalesOrder | Omit<SalesOrder, 'id'>) => void;
  order: SalesOrder | null;
  clients: Contact[];
  inventory: InventoryItem[];
  nextOrderId: string;
};


const getInitialFormData = (): Omit<SalesOrder, 'id' | 'totalAmount' | 'totalKilos'> => ({
    clientId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    items: [{ id: `temp-${Date.now()}`, product: '', caliber: '', quantity: 0, unit: 'Kilos', price: 0 }],
    relatedPurchaseIds: [],
    status: 'pending' as 'pending' | 'completed' | 'cancelled',
});

export function NewSalesOrderSheet({ isOpen, onOpenChange, onSave, order, clients, inventory, nextOrderId }: NewSalesOrderSheetProps) {
  const [formData, setFormData] = useState<Omit<SalesOrder, 'id' | 'totalAmount' | 'totalKilos'>>(getInitialFormData());
  const [isPreviewing, setIsPreviewing] = useState(false);
  const { products, calibers, units } = useMasterData();

  const getPreviewOrder = (): SalesOrder => {
    const totalAmount = formData.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0);
    const totalKilos = formData.items.reduce((sum, item) => {
      if (item.unit === 'Kilos') {
        return sum + Number(item.quantity || 0);
      }
      return sum;
    }, 0);

    return {
        id: order?.id || nextOrderId,
        ...formData,
        totalAmount,
        totalKilos,
    };
  };

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

  const handleSelectChange = (name: keyof Omit<SalesOrder, 'id' | 'items' | 'totalAmount' | 'totalKilos'> | `items.${number}.${keyof OrderItem}`, value: any) => {
    if (name.startsWith('items.')) {
        const [_, indexStr, field] = name.split('.');
        const index = parseInt(indexStr);
        handleItemChange(index, field as keyof OrderItem, value);
    } else {
        setFormData(prev => ({ ...prev, [name as keyof typeof formData]: value }));
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
    const orderToSave = getPreviewOrder();

    if(order) {
        onSave({ ...orderToSave, id: order.id });
    } else {
        const { id, ...rest } = orderToSave;
        onSave(rest);
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

  const title = order ? 'Editar Orden de Venta' : 'Crear Orden de Venta';
  const description = order 
    ? 'Actualice la información de la orden.'
    : 'Complete la información para registrar una nueva orden de venta.';
  
  const previewOrderData = getPreviewOrder();
  const previewClient = clients.find(c => c.id === previewOrderData.clientId) || null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
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
                <Label htmlFor="clientId" className="text-right">
                  Cliente
                </Label>
                <Select
                  required
                  onValueChange={(value) => handleSelectChange('clientId', value)}
                  value={formData.clientId}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccione un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="my-4">
                <h4 className="font-medium mb-2">Ítems de la Orden</h4>
                  {formData.items.map((item, index) => {
                    const subtotal = (item.quantity || 0) * (item.price || 0);
                    const inventoryItem = inventory.find(i => i.caliber === `${item.product} - ${item.caliber}`);
                    const stock = inventoryItem ? inventoryItem.stock : 0;
                    
                    return (
                      <div key={item.id} className="grid grid-cols-12 gap-2 items-start mb-2 p-3 border rounded-md relative">
                          {/* Product */}
                          <div className="col-span-12 sm:col-span-3">
                               <Label htmlFor={`item-product-${index}`}>Producto</Label>
                               <Select required onValueChange={(value) => handleSelectChange(`items.${index}.product`, value)} value={item.product}>
                                   <SelectTrigger><SelectValue placeholder="Producto" /></SelectTrigger>
                                   <SelectContent>
                                       {products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                   </SelectContent>
                               </Select>
                          </div>
                          {/* Caliber */}
                          <div className="col-span-12 sm:col-span-3">
                               <Label htmlFor={`item-caliber-${index}`}>Calibre</Label>
                               <Select required onValueChange={(value) => handleSelectChange(`items.${index}.caliber`, value)} value={item.caliber}>
                                   <SelectTrigger><SelectValue placeholder="Calibre" /></SelectTrigger>
                                   <SelectContent>
                                       {calibers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                                       {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
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
                          <div className="col-span-6 sm:col-span-3 flex flex-col">
                              <Label>Stock Disponible</Label>
                              <Badge variant={stock > (item.quantity || 0) ? 'default' : 'destructive'} className="mt-2 w-fit">
                                {stock.toLocaleString('es-CL')} kg
                              </Badge>
                          </div>

                          {/* Remove button */}
                          <div className='col-span-12 sm:col-span-1 self-center'>
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
              <Button type="button" variant="secondary" onClick={() => setIsPreviewing(true)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Previsualizar
              </Button>
              <Button type="submit">Guardar</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
      {isPreviewing && (
        <SalesOrderPreview 
            order={previewOrderData}
            client={previewClient}
            isOpen={isPreviewing}
            onOpenChange={setIsPreviewing}
        />
      )}
    </>
  );
}
