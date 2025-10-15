

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
import { PlusCircle, Trash2, Wand2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PurchaseOrder, OrderItem, Contact } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { useMasterData } from '@/hooks/use-master-data';
import { ItemMatrixDialog } from '@/components/item-matrix-dialog';
import { productCaliberMatrix } from '@/lib/master-data';
import { useToast } from '@/hooks/use-toast';

type NewPurchaseOrderSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (order: PurchaseOrder | Omit<PurchaseOrder, 'id'>, newItems?: OrderItem[]) => void;
  order: PurchaseOrder | null;
  suppliers: Contact[];
};


const getInitialFormData = (order: PurchaseOrder | null): Omit<PurchaseOrder, 'id' | 'totalAmount' | 'totalKilos' | 'totalPackages'> => {
    if (order) {
        const { totalAmount, totalKilos, totalPackages, ...rest } = order;
        // The date from the order is already a 'yyyy-MM-dd' string from local storage.
        // To avoid timezone issues, parse it as UTC.
        const date = parseISO(order.date);

        return {
            ...rest,
            date: format(date, 'yyyy-MM-dd'),
        };
    }
    return {
        supplierId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        items: [],
        status: 'pending' as 'pending' | 'completed' | 'cancelled',
        warehouse: 'Bodega Principal',
    };
};

export function NewPurchaseOrderSheet({ isOpen, onOpenChange, onSave, order, suppliers }: NewPurchaseOrderSheetProps) {
  const [formData, setFormData] = useState<Omit<PurchaseOrder, 'id' | 'totalAmount' | 'totalKilos' | 'totalPackages'>>(getInitialFormData(order));
  const [newItem, setNewItem] = useState<Omit<OrderItem, 'id'>>({ product: '', caliber: '', quantity: 0, unit: 'Kilos', price: 0 });
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const { products, calibers, units, warehouses, packagingTypes } = useMasterData();
  const { toast } = useToast();

  useEffect(() => {
    setFormData(getInitialFormData(order));
  }, [order, isOpen]);
  
  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };
    (item[field] as any) = value; // Type assertion

    // If product changes, reset caliber
    if (field === 'product') {
        item.caliber = '';
    }

    newItems[index] = item;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleSelectChange = (name: keyof typeof formData | `items.${number}.${keyof OrderItem}` | `newItem.${keyof typeof newItem}`, value: any) => {
    if (name.startsWith('items.')) {
        const [_, indexStr, field] = name.split('.');
        const index = parseInt(indexStr);
        handleItemChange(index, field as keyof OrderItem, value);
    } else if (name.startsWith('newItem.')) {
        const field = name.split('.')[1] as keyof typeof newItem;
        setNewItem(prev => ({ ...prev, [field]: value }));
    } else {
        setFormData(prev => ({ ...prev, [name as keyof typeof formData]: value }));
    }
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(formData);
  };
  
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name.startsWith('items.')) {
        const [_, indexStr, field] = name.split('.');
        const index = parseInt(indexStr);
        handleItemChange(index, field as keyof OrderItem, ['quantity', 'price', 'packagingQuantity'].includes(field) ? Number(value) : value);
    } else if (name.startsWith('newItem.')) {
        const field = name.split('.')[1] as keyof typeof newItem;
        setNewItem(prev => ({ ...prev, [field]: field === 'quantity' || field === 'price' || field === 'packagingQuantity' ? Number(value) : value }));
    } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleMatrixSave = (matrixItems: Omit<OrderItem, 'id'>[]) => {
    const newItems: OrderItem[] = matrixItems.map(item => ({
        ...item,
        id: `temp-${Date.now()}-${Math.random()}`
    }));

    if (order) {
        // If editing, we just call onSave with the new items to be added
        onSave(formData, newItems);
    } else {
        // If creating, we add the items to the current form state
        setFormData(prev => ({...prev, items: [...prev.items, ...newItems]}));
    }
    setIsMatrixOpen(false);
  }

  const title = order ? 'Editar Orden de Compra' : 'Crear Orden de Compra';
  const description = order 
    ? 'Actualice la información de la orden.'
    : 'Complete la información para registrar una nueva orden de compra.';

  const getCaliberDisplayName = (caliberName: string) => {
    const caliber = calibers.find(c => c.name === caliberName);
    return caliber ? `${caliber.name} (${caliber.code})` : caliberName;
  }
  
  const getCaliberCode = (caliberName: string) => {
    const caliber = calibers.find(c => c.name === caliberName);
    return caliber ? caliber.code : 'N/A';
  }

  return (
    <>
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-5xl overflow-y-auto">
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
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Ítems de la Orden</h4>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsMatrixOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Agregar Matriz de Items
                </Button>
              </div>

                {formData.items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No hay ítems en la orden.</p>}
                
                {formData.items.map((item, index) => {
                  const subtotal = (item.quantity || 0) * (item.price || 0);
                  const availableCaliberNames = productCaliberMatrix[item.product] || [];
                  const sortedAvailableCalibers = calibers
                    .filter(c => availableCaliberNames.includes(c.name))
                    .sort((a,b) => calibers.findIndex(cal => cal.name === a.name) - calibers.findIndex(cal => cal.name === b.name));

                  return (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-end mb-2 p-3 border rounded-md">
                        {/* Product */}
                        <div className="col-span-6 md:col-span-2">
                             <Label>Producto</Label>
                             <Select required onValueChange={(value) => handleSelectChange(`items.${index}.product`, value)} value={item.product}>
                                 <SelectTrigger><SelectValue placeholder="Producto" /></SelectTrigger>
                                 <SelectContent>
                                     {products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                 </SelectContent>
                             </Select>
                        </div>
                        {/* Caliber */}
                        <div className="col-span-6 md:col-span-2">
                             <Label>Calibre</Label>
                             <Select required onValueChange={(value) => handleSelectChange(`items.${index}.caliber`, value)} value={item.caliber} disabled={!item.product}>
                                 <SelectTrigger><SelectValue placeholder="Calibre" /></SelectTrigger>
                                 <SelectContent>
                                     {sortedAvailableCalibers.map(c => <SelectItem key={`${item.id}-${c.name}-${c.code}`} value={c.name}>{`${c.name} (${c.code})`}</SelectItem>)}
                                 </SelectContent>
                             </Select>
                        </div>
                         {/* Packaging Type */}
                         <div className="col-span-6 md:col-span-2">
                            <Label>T. Envase</Label>
                            <Select onValueChange={(value) => handleSelectChange(`items.${index}.packagingType`, value)} value={item.packagingType || ''}>
                                <SelectTrigger><SelectValue placeholder="Envase" /></SelectTrigger>
                                <SelectContent>
                                    {packagingTypes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Packaging Quantity */}
                        <div className="col-span-6 md:col-span-1">
                            <Label># Envases</Label>
                            <Input name={`items.${index}.packagingQuantity`} type="number" value={item.packagingQuantity || ''} onChange={handleInputChange} placeholder="0" />
                        </div>
                        {/* Quantity */}
                         <div className="col-span-6 md:col-span-1">
                             <Label>Cantidad</Label>
                             <Input name={`items.${index}.quantity`} type="number" value={item.quantity} onChange={handleInputChange} placeholder="Cant." required />
                        </div>
                        {/* Unit */}
                        <div className="col-span-6 md:col-span-1">
                            <Label>Unidad</Label>
                             <Select required onValueChange={(value) => handleSelectChange(`items.${index}.unit`, value)} value={item.unit}>
                                 <SelectTrigger><SelectValue placeholder="Unidad" /></SelectTrigger>
                                 <SelectContent>
                                     {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                 </SelectContent>
                             </Select>
                        </div>
                        {/* Price */}
                         <div className="col-span-6 md:col-span-1">
                            <Label>Precio</Label>
                             <Input name={`items.${index}.price`} type="number" value={item.price} onChange={handleInputChange} placeholder="Precio" required />
                        </div>
                        {/* Subtotal */}
                         <div className="col-span-6 md:col-span-1">
                            <Label>Subtotal</Label>
                             <Input value={new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(subtotal)} readOnly disabled />
                        </div>
                        {/* Remove button */}
                        <div className='col-span-6 md:col-span-1'>
                             <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                         {/* Lot */}
                         <div className="col-span-12 mt-2">
                           <Label>Lote</Label>
                           <div className="flex gap-2">
                              <Input name={`items.${index}.lotNumber`} value={item.lotNumber || ''} onChange={handleInputChange} placeholder="Número de lote (se genera en la pestaña 'Generar Lotes')" readOnly/>
                           </div>
                         </div>
                    </div>
                )})}
            </div>


            <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="warehouse" className="text-right">
                  Bodega
                </Label>
                <Select
                  required
                  onValueChange={(value) => handleSelectChange('warehouse', value)}
                  value={formData.warehouse}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccione bodega" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => (
                      <SelectItem key={w} value={w}>{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </SheetClose>
            <Button type="submit" disabled={formData.items.length === 0}>Guardar</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
    <ItemMatrixDialog 
        isOpen={isMatrixOpen}
        onOpenChange={setIsMatrixOpen}
        onSave={handleMatrixSave}
        orderType="purchase"
    />
    </>
  );
}

    