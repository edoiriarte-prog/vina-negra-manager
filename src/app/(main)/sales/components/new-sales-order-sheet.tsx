"use client";

import { useState, useEffect, useMemo } from 'react';
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
import { SalesOrder, OrderItem, Contact, InventoryItem, PackagingItem } from '@/lib/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useMasterData } from '@/hooks/use-master-data';
import { SalesOrderPreview } from './sales-order-preview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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
    packaging: [{ id: `temp-pack-${Date.now()}`, type: '', quantity: 0 }],
    relatedPurchaseIds: [],
    status: 'pending' as 'pending' | 'completed' | 'cancelled',
    paymentMethod: 'Contado',
    advancePercentage: 0,
    advanceDueDate: undefined,
    balanceDueDate: undefined,
});

export function NewSalesOrderSheet({ isOpen, onOpenChange, onSave, order, clients, inventory, nextOrderId }: NewSalesOrderSheetProps) {
  const [formData, setFormData] = useState<Omit<SalesOrder, 'id' | 'totalAmount' | 'totalKilos'>>(getInitialFormData());
  const [isPreviewing, setIsPreviewing] = useState(false);
  const { products, calibers, units, packagingTypes } = useMasterData();

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
            packaging: rest.packaging && rest.packaging.length > 0 ? rest.packaging : getInitialFormData().packaging,
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
  
  const handlePackagingChange = (index: number, field: keyof PackagingItem, value: string | number) => {
    const newPackaging = [...formData.packaging];
    const item = { ...newPackaging[index] };
    (item[field] as any) = value;
    newPackaging[index] = item;
    setFormData(prev => ({ ...prev, packaging: newPackaging }));
  };

  const handleSelectChange = (name: keyof Omit<SalesOrder, 'id' | 'items' | 'totalAmount' | 'totalKilos' | 'packaging'> | `items.${number}.${keyof OrderItem}` | `packaging.${number}.${keyof PackagingItem}`, value: any) => {
    if (name.startsWith('items.')) {
        const [_, indexStr, field] = name.split('.');
        const index = parseInt(indexStr);
        handleItemChange(index, field as keyof OrderItem, value);
    } else if (name.startsWith('packaging.')) {
        const [_, indexStr, field] = name.split('.');
        const index = parseInt(indexStr);
        handlePackagingChange(index, field as keyof PackagingItem, value);
    }
     else {
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

  const addNewPackaging = () => {
    setFormData(prev => ({
        ...prev,
        packaging: [...prev.packaging, { id: `temp-pack-${Date.now()}`, type: '', quantity: 0 }]
    }))
  }

  const removePackaging = (index: number) => {
    setFormData(prev => ({
        ...prev,
        packaging: prev.packaging.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (formData.paymentMethod === 'Pago con Anticipo y Saldo') {
        if (!formData.advanceDueDate || !formData.balanceDueDate) {
            alert("Por favor complete las fechas de vencimiento.");
            return;
        }
        if (new Date(formData.balanceDueDate) < new Date(formData.advanceDueDate)) {
            alert("La fecha de vencimiento del saldo no puede ser anterior a la del anticipo.");
            return;
        }
    }

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
        handleItemChange(index, field as keyof OrderItem, field === 'quantity' || field === 'price' || field === 'advancePercentage' ? Number(value) : value);
    } else if (name.startsWith('packaging.')) {
        const [_, indexStr, field] = name.split('.');
        const index = parseInt(indexStr);
        handlePackagingChange(index, field as keyof PackagingItem, field === 'quantity' ? Number(value) : value);
    }
     else {
        setFormData((prev) => ({ ...prev, [name]: name === 'advancePercentage' ? Number(value) : value }));
    }
  };

  const title = order ? 'Editar Orden de Venta' : 'Crear Orden de Venta';
  const description = order 
    ? 'Actualice la información de la orden.'
    : 'Complete la información para registrar una nueva orden de venta.';
  
  const previewOrderData = getPreviewOrder();
  const previewClient = clients.find(c => c.id === previewOrderData.clientId) || null;

  const totalAmount = useMemo(() => {
    return formData.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0)
  }, [formData.items]);
  
  const advanceAmount = useMemo(() => {
    if (formData.paymentMethod !== 'Pago con Anticipo y Saldo' || !formData.advancePercentage) return 0;
    return totalAmount * (formData.advancePercentage / 100);
  }, [totalAmount, formData.paymentMethod, formData.advancePercentage]);

  const balanceAmount = useMemo(() => {
     if (formData.paymentMethod !== 'Pago con Anticipo y Saldo') return 0;
     return totalAmount - advanceAmount;
  }, [totalAmount, advanceAmount, formData.paymentMethod]);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-5xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 py-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
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
                </div>
                <div className="space-y-4">
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
              </div>
              
              <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-headline">Ítems de la Orden</CardTitle>
                </CardHeader>
                <CardContent>
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
                                <Input value={new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(subtotal)} readOnly disabled />
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
                </CardContent>
              </Card>

              <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-headline">Detalles de Embalaje</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {formData.packaging.map((pack, index) => (
                        <div key={pack.id} className="grid grid-cols-12 gap-2 items-center mb-2">
                            <div className="col-span-5">
                                <Label>Tipo de Envase</Label>
                                <Select required onValueChange={(value) => handleSelectChange(`packaging.${index}.type`, value)} value={pack.type}>
                                    <SelectTrigger><SelectValue placeholder="Seleccione envase" /></SelectTrigger>
                                    <SelectContent>
                                        {packagingTypes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-5">
                                <Label>Cantidad</Label>
                                <Input name={`packaging.${index}.quantity`} type="number" value={pack.quantity} onChange={handleInputChange} placeholder="Cant." required />
                            </div>
                            <div className="col-span-2 self-end">
                                <Button type="button" variant="ghost" size="icon" onClick={() => removePackaging(index)} disabled={formData.packaging.length <= 1}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    ))}
                     <Button type="button" variant="outline" size="sm" onClick={addNewPackaging} className='mt-2'>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Agregar Envase
                    </Button>
                  </CardContent>
              </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-headline">Condiciones de Pago</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="paymentMethod" className="text-right">
                                Modalidad
                            </Label>
                            <Select
                                required
                                onValueChange={(value: 'Contado' | 'Crédito' | 'Pago con Anticipo y Saldo') => handleSelectChange('paymentMethod', value)}
                                value={formData.paymentMethod}
                            >
                                <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Seleccione modalidad" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Contado">Contado</SelectItem>
                                    <SelectItem value="Crédito">Crédito</SelectItem>
                                    <SelectItem value="Pago con Anticipo y Saldo">Pago con Anticipo y Saldo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {formData.paymentMethod === 'Pago con Anticipo y Saldo' && (
                             <div className="space-y-4 pl-8 border-l-2 ml-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="advancePercentage" className="text-right">
                                        Anticipo (%)
                                    </Label>
                                    <Input id="advancePercentage" name="advancePercentage" type="number" value={formData.advancePercentage} onChange={handleInputChange} className="col-span-3" required min="0" max="100"/>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="advanceDueDate" className="text-right">
                                        Venc. Anticipo
                                    </Label>
                                    <Input id="advanceDueDate" name="advanceDueDate" type="date" value={formData.advanceDueDate || ''} onChange={handleInputChange} className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="balanceDueDate" className="text-right">
                                        Venc. Saldo
                                    </Label>
                                    <Input id="balanceDueDate" name="balanceDueDate" type="date" value={formData.balanceDueDate || ''} onChange={handleInputChange} className="col-span-3" required />
                                </div>
                            </div>
                        )}
                    </div>
                    {formData.paymentMethod === 'Pago con Anticipo y Saldo' && (
                        <div className="bg-muted p-4 rounded-lg">
                            <h4 className="font-semibold mb-3">Resumen de Pagos</h4>
                            <div className='text-sm space-y-2'>
                                <div className='flex justify-between'>
                                    <span className="text-muted-foreground">Monto Anticipo ({formData.advancePercentage}%):</span>
                                    <span className='font-medium'>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(advanceAmount)}</span>
                                </div>
                                <div className='flex justify-between'>
                                    <span className="text-muted-foreground">Vencimiento:</span>
                                    <span className='font-medium'>{formData.advanceDueDate ? format(new Date(formData.advanceDueDate), 'dd-MM-yyyy') : '-'}</span>
                                </div>
                                <Separator className="my-2" />
                                 <div className='flex justify-between'>
                                    <span className="text-muted-foreground">Monto Saldo:</span>
                                    <span className='font-medium'>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(balanceAmount)}</span>
                                </div>
                                <div className='flex justify-between'>
                                    <span className="text-muted-foreground">Vencimiento:</span>
                                    <span className='font-medium'>{formData.balanceDueDate ? format(new Date(formData.balanceDueDate), 'dd-MM-yyyy') : '-'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

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
