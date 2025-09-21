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
import { PlusCircle, Trash2, Eye, Calendar as CalendarIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { SalesOrder, OrderItem, Contact, InventoryItem } from '@/lib/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useMasterData } from '@/hooks/use-master-data';
import { SalesOrderPreview } from './sales-order-preview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ItemMatrixDialog } from '@/components/item-matrix-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type NewSalesOrderSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (order: SalesOrder | Omit<SalesOrder, 'id' | 'totalPackages'>, newItems?: OrderItem[]) => void;
  order: SalesOrder | null;
  clients: Contact[];
  inventory: InventoryItem[];
  nextOrderId: string;
};


const getInitialFormData = (order: SalesOrder | null): Omit<SalesOrder, 'id' | 'totalAmount' | 'totalKilos' | 'totalPackages'> => {
    if (order) {
        const { totalAmount, totalKilos, totalPackages, ...rest } = order;
        return {
            ...rest,
            date: format(new Date(order.date), 'yyyy-MM-dd'),
        };
    }
    return {
        clientId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        items: [],
        relatedPurchaseIds: [],
        status: 'pending' as 'pending' | 'completed' | 'cancelled',
        paymentMethod: 'Contado',
        advancePercentage: 0,
        advanceDueDate: undefined,
        balanceDueDate: undefined,
    };
};

export function NewSalesOrderSheet({ isOpen, onOpenChange, onSave, order, clients, inventory, nextOrderId }: NewSalesOrderSheetProps) {
  const [formData, setFormData] = useState<Omit<SalesOrder, 'id' | 'totalAmount' | 'totalKilos' | 'totalPackages'>>(getInitialFormData(order));
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const { products, calibers, units, packagingTypes } = useMasterData();
  const { toast } = useToast();

  const getPreviewOrder = (): SalesOrder => {
    const totalAmount = formData.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0);
    const totalKilos = formData.items.reduce((sum, item) => {
      if (item.unit === 'Kilos') {
        return sum + Number(item.quantity || 0);
      }
      return sum;
    }, 0);
    const totalPackages = formData.items.reduce((sum, item) => sum + (Number(item.packagingQuantity || 0)), 0);

    return {
        id: order?.id || nextOrderId,
        ...formData,
        totalAmount,
        totalKilos,
        totalPackages,
    };
  };

  useEffect(() => {
    setFormData(getInitialFormData(order));
  }, [order, isOpen]);
  
  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };
    (item[field] as any) = value; // Type assertion
    newItems[index] = item;
    setFormData(prev => ({ ...prev, items: newItems }));
  };
  

  const handleSelectChange = (name: keyof Omit<SalesOrder, 'id' | 'items' | 'totalAmount' | 'totalKilos' | 'totalPackages' > | `items.${number}.${keyof OrderItem}`, value: any) => {
    if (name.startsWith('items.')) {
        const [_, indexStr, field] = name.split('.');
        const index = parseInt(indexStr);
        handleItemChange(index, field as keyof OrderItem, value);
    }
     else {
        setFormData(prev => ({ ...prev, [name as keyof typeof formData]: value }));
    }
  };

  const handleDateSelect = (field: 'advanceDueDate' | 'balanceDueDate', date: Date | undefined) => {
      if (date) {
        setFormData(prev => ({ ...prev, [field]: format(date, 'yyyy-MM-dd') }));
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

    if (formData.paymentMethod === 'Pago con Anticipo y Saldo') {
        if (!formData.advanceDueDate || !formData.balanceDueDate) {
            toast({
                variant: 'destructive',
                title: 'Error de validación',
                description: 'Por favor complete las fechas de vencimiento para la modalidad de pago seleccionada.',
            });
            return;
        }
        if (new Date(formData.balanceDueDate) < new Date(formData.advanceDueDate)) {
            toast({
                variant: 'destructive',
                title: 'Error de validación',
                description: 'La fecha de vencimiento del saldo no puede ser anterior a la del anticipo.',
            });
            return;
        }
    }
    
    // Stock validation
    for (const item of formData.items) {
      const inventoryItem = inventory.find(i => i.caliber === `${item.product} - ${item.caliber}`);
      const currentStock = inventoryItem ? inventoryItem.stock : 0;
      
      if (item.quantity > currentStock) {
          toast({
              variant: "destructive",
              title: "Error de Stock",
              description: `No hay suficiente stock para ${item.product} - ${item.caliber}. Stock disponible: ${currentStock} kg.`,
          });
          return;
      }
    }


    onSave(formData);
  };
  
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name.startsWith('items.')) {
        const [_, indexStr, field] = name.split('.');
        const index = parseInt(indexStr);
        handleItemChange(index, field as keyof OrderItem, ['quantity', 'price', 'advancePercentage', 'packagingQuantity'].includes(field) ? Number(value) : value);
    }
     else {
        setFormData((prev) => ({ ...prev, [name]: name === 'advancePercentage' ? Number(value) : value }));
    }
  };

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
        <SheetContent className="sm:max-w-7xl overflow-y-auto">
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
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-headline">Ítems de la Orden</CardTitle>
                         <Button type="button" variant="outline" size="sm" onClick={() => setIsMatrixOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Agregar Matriz de Items
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {formData.items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No hay ítems en la orden.</p>}

                    {formData.items.map((item, index) => {
                        const subtotal = (item.quantity || 0) * (item.price || 0);
                        const inventoryItem = inventory.find(i => i.caliber === `${item.product} - ${item.caliber}`);
                        const stock = inventoryItem ? inventoryItem.stock : 0;
                        
                        return (
                        <div key={item.id} className="grid grid-cols-12 gap-2 items-end mb-2 p-3 border rounded-md relative">
                            {/* Product */}
                            <div className="col-span-6 md:col-span-2">
                                <Label htmlFor={`item-product-${index}`}>Producto</Label>
                                <Select required onValueChange={(value) => handleSelectChange(`items.${index}.product`, value)} value={item.product}>
                                    <SelectTrigger><SelectValue placeholder="Producto" /></SelectTrigger>
                                    <SelectContent>
                                        {products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Caliber */}
                            <div className="col-span-6 md:col-span-1">
                                <Label htmlFor={`item-caliber-${index}`}>Calibre</Label>
                                <Select required onValueChange={(value) => handleSelectChange(`items.${index}.caliber`, value)} value={item.caliber}>
                                    <SelectTrigger><SelectValue placeholder="Calibre" /></SelectTrigger>
                                    <SelectContent>
                                        {calibers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                             {/* Packaging Type */}
                             <div className="col-span-6 md:col-span-2">
                                <Label>Tipo Envase</Label>
                                <Select onValueChange={(value) => handleSelectChange(`items.${index}.packagingType`, value)} value={item.packagingType}>
                                    <SelectTrigger><SelectValue placeholder="Envase" /></SelectTrigger>
                                    <SelectContent>
                                        {packagingTypes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Packaging Quantity */}
                            <div className="col-span-6 md:col-span-1">
                                <Label>Cant. Envases</Label>
                                <Input name={`items.${index}.packagingQuantity`} type="number" value={item.packagingQuantity || ''} onChange={handleInputChange} placeholder="Cant."/>
                            </div>
                            {/* Quantity */}
                            <div className="col-span-6 md:col-span-1">
                                <Label htmlFor={`item-quantity-${index}`}>Cantidad</Label>
                                <Input id={`item-quantity-${index}`} name={`items.${index}.quantity`} type="number" value={item.quantity} onChange={handleInputChange} placeholder="Cant." required />
                            </div>
                            {/* Unit */}
                            <div className="col-span-6 md:col-span-1">
                                <Label htmlFor={`item-unit-${index}`}>Unidad</Label>
                                <Select required onValueChange={(value) => handleSelectChange(`items.${index}.unit`, value)} value={item.unit}>
                                    <SelectTrigger><SelectValue placeholder="Unidad" /></SelectTrigger>
                                    <SelectContent>
                                        {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Price */}
                            <div className="col-span-6 md:col-span-1">
                                <Label htmlFor={`item-price-${index}`}>Precio</Label>
                                <Input id={`item-price-${index}`} name={`items.${index}.price`} type="number" value={item.price} onChange={handleInputChange} placeholder="Precio" required />
                            </div>
                            {/* Subtotal */}
                            <div className="col-span-6 md:col-span-1">
                                <Label>Subtotal</Label>
                                <Input value={new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(subtotal)} readOnly disabled />
                            </div>
                            <div className="col-span-6 md:col-span-1 flex flex-col">
                                <Label>Stock</Label>
                                <Badge variant={stock >= (item.quantity || 0) ? 'default' : 'destructive'} className="mt-2 w-fit">
                                    {stock.toLocaleString('es-CL')} kg
                                </Badge>
                            </div>

                            {/* Remove button */}
                            <div className='col-span-12 md:col-span-1 self-center'>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    )})}
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
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                            "col-span-3 justify-start text-left font-normal",
                                            !formData.advanceDueDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.advanceDueDate ? format(new Date(formData.advanceDueDate), "PPP") : <span>Seleccione fecha</span>}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={formData.advanceDueDate ? new Date(formData.advanceDueDate) : undefined}
                                            onSelect={(date) => handleDateSelect('advanceDueDate', date)}
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="balanceDueDate" className="text-right">
                                        Venc. Saldo
                                    </Label>
                                     <Popover>
                                        <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                            "col-span-3 justify-start text-left font-normal",
                                            !formData.balanceDueDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.balanceDueDate ? format(new Date(formData.balanceDueDate), "PPP") : <span>Seleccione fecha</span>}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={formData.balanceDueDate ? new Date(formData.balanceDueDate) : undefined}
                                            onSelect={(date) => handleDateSelect('balanceDueDate', date)}
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
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
              <Button type="submit" disabled={formData.items.length === 0}>Guardar</Button>
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
      <ItemMatrixDialog 
        isOpen={isMatrixOpen}
        onOpenChange={setIsMatrixOpen}
        onSave={handleMatrixSave}
        orderType="sale"
        inventory={inventory}
      />
    </>
  );
}
