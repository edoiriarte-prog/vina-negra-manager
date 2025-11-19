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
import { PlusCircle, Trash2, Wand2, CalendarIcon } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { es } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';

type NewPurchaseOrderSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (order: PurchaseOrder | Omit<PurchaseOrder, 'id'>, newItems?: OrderItem[]) => void;
  order: PurchaseOrder | null;
  suppliers: Contact[];
  purchaseOrders?: PurchaseOrder[];
};

const getInitialFormData = (order: PurchaseOrder | null): Omit<PurchaseOrder, 'id' | 'totalAmount' | 'totalKilos' | 'totalPackages'> => {
    if (order) {
        const { totalAmount, totalKilos, totalPackages, ...rest } = order;
        const date = order.date ? parseISO(order.date) : new Date();

        return {
            ...rest,
            date: format(date, 'yyyy-MM-dd'),
            paymentDueDate: order.paymentDueDate ? format(parseISO(order.paymentDueDate), 'yyyy-MM-dd') : undefined,
            destinationWarehouse: rest.destinationWarehouse || undefined,
            description: rest.description || '',
        };
    }
    return {
        supplierId: '',
        date: '',
        items: [],
        status: 'pending',
        warehouse: 'Bodega Central',
        destinationWarehouse: undefined,
        paymentMethod: 'Contado',
        paymentDueDate: undefined,
        description: '',
    };
};

export function NewPurchaseOrderSheet({ isOpen, onOpenChange, onSave, order, suppliers, purchaseOrders = [] }: NewPurchaseOrderSheetProps) {
  const [formData, setFormData] = useState(getInitialFormData(order));
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [nextIdDisplay, setNextIdDisplay] = useState(''); 
  const [hasInitialized, setHasInitialized] = useState(false);

  const { products, calibers, units, warehouses, packagingTypes, productCaliberAssociations } = useMasterData();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
        if (!hasInitialized) {
            if (!order) {
                const existingIds = purchaseOrders
                    .map(p => {
                        const match = p.id.match(/OC:(\d+)/);
                        return match ? parseInt(match[1], 10) : 0;
                    })
                    .filter(n => !isNaN(n));
                
                const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 1099;
                setNextIdDisplay(`OC:${maxId + 1}`);
                
                const initialData = getInitialFormData(null);
                initialData.date = format(new Date(), 'yyyy-MM-dd');
                setFormData(initialData);
            } else {
                setNextIdDisplay(order.id);
                setFormData(getInitialFormData(order));
            }
            setHasInitialized(true);
        }
    } else {
        setHasInitialized(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order, hasInitialized]); // Eliminamos purchaseOrders de deps para evitar loop
  
  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };
    (item[field] as any) = value; 

    if (field === 'product') {
        item.caliber = '';
    }
    newItems[index] = item;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleSelectChange = (name: string, value: any) => {
      if (name.startsWith('items.')) {
          const [_, indexStr, field] = name.split('.');
          handleItemChange(parseInt(indexStr), field as keyof OrderItem, value);
      } else if (name === 'destinationWarehouse') {
          setFormData(prev => ({ ...prev, destinationWarehouse: value === 'none' ? undefined : value }));
      } else {
          setFormData(prev => ({ ...prev, [name]: value }));
      }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        if (name.startsWith('items.')) {
            const [_, indexStr, field] = name.split('.');
            const index = parseInt(indexStr);
            handleItemChange(index, field as keyof OrderItem, ['quantity', 'price', 'packagingQuantity'].includes(field) ? Number(value) : value);
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
    }))
  }

  // --- CORRECCIÓN APLICADA AQUÍ ---
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Convertimos cualquier 'undefined' a 'null' para que Firebase no falle
    const sanitizedData = {
        ...formData,
        destinationWarehouse: formData.destinationWarehouse || null,
        paymentDueDate: formData.paymentDueDate || null,
        description: formData.description || null,
    };
    
    if (order) {
        onSave(sanitizedData);
    } else {
        const newOrder = {
            ...sanitizedData,
            id: nextIdDisplay
        };
        onSave(newOrder);
    }
  };
  // --------------------------------

  const handleMatrixSave = (matrixItems: Omit<OrderItem, 'id'>[]) => {
    const newItems: OrderItem[] = matrixItems.map(item => ({
        ...item,
        id: `temp-${Date.now()}-${Math.random()}`
    }));
    if (order) {
        onSave(formData, newItems);
    } else {
        setFormData(prev => ({...prev, items: [...prev.items, ...newItems]}));
    }
    setIsMatrixOpen(false);
  }
  
  const generateLotNumber = (itemIndex: number) => {
    if (!formData.date) return;
    const datePart = format(new Date(formData.date), 'ddMMyy');
    const lot = `LOTE-${datePart}-${itemIndex + 1}`;
    handleItemChange(itemIndex, 'lotNumber', lot);
    toast({ title: "Lote Generado", description: lot });
  };

  const title = order ? `Editar Orden ${order.id}` : 'Crear Orden de Compra';

  return (
    <>
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-5xl overflow-y-auto">
        <SheetHeader>
          <div className="flex justify-between items-center mr-8">
              <SheetTitle>{title}</SheetTitle>
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-md font-mono font-bold border border-primary/20">
                  {nextIdDisplay || 'Generando...'}
              </div>
          </div>
          <SheetDescription>Complete la información para registrar la compra.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">Fecha</Label>
              <Input id="date" name="date" type="date" value={formData.date} onChange={handleInputChange} className="col-span-3" required />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="supplierId" className="text-right">Proveedor</Label>
              <Select required onValueChange={(value) => handleSelectChange('supplierId', value)} value={formData.supplierId}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Seleccione un proveedor" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (<SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            
             <div className="my-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Ítems de la Orden</h4>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsMatrixOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Agregar Matriz
                </Button>
              </div>
                {formData.items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No hay ítems en la orden.</p>}
                {formData.items.map((item, index) => {
                   const subtotal = (item.quantity || 0) * (item.price || 0);
                   const availableCaliberNames = productCaliberAssociations.find(a => a.id === item.product)?.calibers || [];
                   const sortedAvailableCalibers = calibers.filter(c => availableCaliberNames.includes(c.name)).sort();

                   return (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-end mb-2 p-3 border rounded-md bg-muted/10">
                         <div className="col-span-6 md:col-span-2">
                             <Label className="text-xs">Producto</Label>
                             <Select required onValueChange={(value) => handleSelectChange(`items.${index}.product`, value)} value={item.product}>
                                 <SelectTrigger className="h-8"><SelectValue/></SelectTrigger>
                                 <SelectContent>{products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                             </Select>
                        </div>
                        <div className="col-span-6 md:col-span-2">
                             <Label className="text-xs">Calibre</Label>
                             <Select required onValueChange={(value) => handleSelectChange(`items.${index}.caliber`, value)} value={item.caliber} disabled={!item.product}>
                                 <SelectTrigger className="h-8"><SelectValue/></SelectTrigger>
                                 <SelectContent>{sortedAvailableCalibers.map(c => <SelectItem key={`${item.id}-${c.name}`} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                             </Select>
                        </div>
                        <div className="col-span-6 md:col-span-2">
                            <Label className="text-xs">Envase</Label>
                            <Select onValueChange={(value) => handleSelectChange(`items.${index}.packagingType`, value)} value={item.packagingType || ''}>
                                <SelectTrigger className="h-8"><SelectValue/></SelectTrigger>
                                <SelectContent>{packagingTypes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-6 md:col-span-1">
                            <Label className="text-xs">Cant. Env</Label>
                            <Input name={`items.${index}.packagingQuantity`} type="number" value={item.packagingQuantity || ''} onChange={handleInputChange} className="h-8" />
                        </div>
                         <div className="col-span-6 md:col-span-1">
                             <Label className="text-xs">Kilos</Label>
                             <Input name={`items.${index}.quantity`} type="number" value={item.quantity} onChange={handleInputChange} className="h-8" required />
                        </div>
                         <div className="col-span-6 md:col-span-1">
                            <Label className="text-xs">Precio</Label>
                             <Input name={`items.${index}.price`} type="number" value={item.price} onChange={handleInputChange} className="h-8" required />
                        </div>
                         <div className="col-span-6 md:col-span-2">
                            <Label className="text-xs">Subtotal</Label>
                             <Input value={new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(subtotal)} readOnly disabled className="h-8 font-bold" />
                        </div>
                        <div className='col-span-6 md:col-span-1'>
                             <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    </div>
                   )
                })}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-4 mt-4">
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentMethod" className="text-right">Cond. Pago</Label>
                <Select onValueChange={(v) => handleSelectChange('paymentMethod', v)} value={formData.paymentMethod}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Contado">Contado</SelectItem>
                    <SelectItem value="Crédito">Crédito</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                 <Label className="text-right">Vencimiento</Label>
                 <div className="col-span-3">
                    <Input type="date" value={formData.paymentDueDate || ''} onChange={(e) => handleSelectChange('paymentDueDate', e.target.value)} />
                 </div>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Estado</Label>
                <Select required onValueChange={(v) => handleSelectChange('status', v)} value={formData.status}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="completed">Completada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Bodega</Label>
                <Select required onValueChange={(v) => handleSelectChange('warehouse', v)} value={formData.warehouse}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>{warehouses.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              
              <div className="col-span-2 mt-2">
                  <Label htmlFor="description">Notas / Condiciones Comerciales</Label>
                  <Textarea 
                    id="description" 
                    name="description" 
                    value={formData.description || ''} 
                    onChange={handleInputChange} 
                    placeholder="Especifique lugar de entrega, condiciones especiales, etc."
                    className="mt-1"
                  />
              </div>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <SheetClose asChild><Button variant="outline">Cancelar</Button></SheetClose>
            <Button type="submit" disabled={formData.items.length === 0}>Guardar Orden</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
    <ItemMatrixDialog isOpen={isMatrixOpen} onOpenChange={setIsMatrixOpen} onSave={handleMatrixSave} orderType="purchase"/>
    </>
  );
}