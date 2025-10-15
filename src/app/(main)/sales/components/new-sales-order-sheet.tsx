

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
import { PlusCircle, Trash2, Eye, CalendarIcon, Wand2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { SalesOrder, OrderItem, Contact, InventoryItem, PurchaseOrder } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useMasterData } from '@/hooks/use-master-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ItemMatrixDialog } from './item-matrix-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';

type NewSalesOrderSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (order: SalesOrder | Omit<SalesOrder, 'id' | 'totalPackages'>, newItems?: OrderItem[]) => void;
  order: SalesOrder | null;
  clients: Contact[];
  carriers: Contact[];
  inventory: InventoryItem[];
  nextOrderId: string;
  getNextLotNumber: () => string;
  purchaseOrders: PurchaseOrder[];
};


const getInitialFormData = (order: SalesOrder | null): Omit<SalesOrder, 'id' | 'totalAmount' | 'totalKilos' | 'totalPackages'> => {
    if (order) {
        return {
            ...order,
            date: format(new Date(order.date), 'yyyy-MM-dd'),
            advanceDueDate: order.advanceDueDate ? format(new Date(order.advanceDueDate), 'yyyy-MM-dd') : undefined,
            balanceDueDate: order.balanceDueDate ? format(new Date(order.balanceDueDate), 'yyyy-MM-dd') : undefined,
        };
    }
    return {
        clientId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        items: [],
        relatedPurchaseIds: [],
        status: 'pending',
        paymentMethod: 'Contado',
        advancePercentage: 0,
        advanceDueDate: undefined,
        balanceDueDate: undefined,
        warehouse: '',
        saleType: 'Venta Firme',
        movementType: 'Venta Directa',
        destinationWarehouse: '',
        carrierId: '',
        driverName: '',
        licensePlate: '',
    };
};

export function NewSalesOrderSheet({ isOpen, onOpenChange, onSave, order, clients, carriers, inventory, nextOrderId, getNextLotNumber, purchaseOrders }: NewSalesOrderSheetProps) {
  const [formData, setFormData] = useState(() => getInitialFormData(order));
  const [newItem, setNewItem] = useState<Omit<OrderItem, 'id'>>({ product: '', caliber: '', quantity: 0, unit: 'Kilos', price: 0, packagingType: '', packagingQuantity: 0 });
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const { products, calibers, units, packagingTypes, warehouses } = useMasterData();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData(order));
      setNewItem({ product: '', caliber: '', quantity: 0, unit: 'Kilos', price: 0, packagingType: '', packagingQuantity: 0 });
    }
  }, [order, isOpen]);

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };
    (item[field] as any) = value; // Type assertion
    newItems[index] = item;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    if (newItem.product && newItem.caliber && newItem.quantity > 0 && newItem.price > 0) {
       // Stock validation
        const inventoryItem = inventory.find(i => i.product === newItem.product && i.caliber === newItem.caliber && i.warehouse === formData.warehouse);
        const currentStock = inventoryItem ? inventoryItem.stock : 0;
        
        if (newItem.quantity > currentStock) {
            toast({
                variant: "destructive",
                title: "Error de Stock",
                description: `No hay suficiente stock para ${newItem.product} - ${newItem.caliber}. Stock actual: ${currentStock} kg.`,
            });
            return;
        }

      if (order) {
        // If editing an existing order, we pass the new item up to be added
        onSave(formData, [{...newItem, id: `temp-${Date.now()}`}]);
      } else {
        // If creating a new order, we add it to local state
        setFormData(prev => ({
          ...prev,
          items: [...prev.items, { ...newItem, id: `temp-${Date.now()}` }],
        }));
      }
      setNewItem({ product: '', caliber: '', quantity: 0, unit: 'Kilos', price: 0, packagingType: '', packagingQuantity: 0 });
    }
  };

  const handleSelectChange = (name: keyof Omit<SalesOrder, 'id' | 'items' | 'totalAmount' | 'totalKilos' | 'totalPackages' > | `items.${number}.${keyof OrderItem}` | `newItem.${keyof OrderItem}`, value: any) => {
    if (name.startsWith('items.')) {
        const [_, indexStr, field] = name.split('.');
        const index = parseInt(indexStr);
        handleItemChange(index, field as keyof OrderItem, value);
    } else if (name.startsWith('newItem.')) {
        const field = name.split('.')[1] as keyof OrderItem;
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
    
    // --- VALIDATION START ---
    if (!formData.clientId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Por favor, seleccione un cliente.' });
        return;
    }
    if (!formData.warehouse) {
        toast({ variant: 'destructive', title: 'Error', description: 'Por favor, seleccione una bodega.' });
        return;
    }
    if (formData.items.length === 0) {
        toast({ variant: 'destructive', title: 'Error', description: 'La orden de venta debe tener al menos un ítem.' });
        return;
    }
    
    for (const [index, item] of formData.items.entries()) {
        if (!item.product || !item.caliber) {
            toast({ variant: 'destructive', title: 'Error en Ítem', description: `El ítem #${index + 1} no tiene producto o calibre seleccionado.` });
            return;
        }
        if (!item.quantity || item.quantity <= 0) {
            toast({ variant: 'destructive', title: 'Error en Ítem', description: `La cantidad del ítem #${index + 1} debe ser mayor a 0.` });
            return;
        }
        if (!item.unit) {
            toast({ variant: 'destructive', title: 'Error en Ítem', description: `La unidad del ítem #${index + 1} no ha sido seleccionada.` });
            return;
        }
        if (!item.price || item.price <= 0) {
            toast({ variant: 'destructive', title: 'Error en Ítem', description: `El precio del ítem #${index + 1} debe ser mayor a 0.` });
            return;
        }
        if ((item.packagingType && !item.packagingQuantity) || (!item.packagingType && item.packagingQuantity)) {
            toast({ variant: 'destructive', title: 'Error en Ítem', description: `El ítem #${index + 1} debe tener tipo y cantidad de envase.` });
            return;
        }
    }

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
      const inventoryItem = inventory.find(i => i.product === item.product && i.caliber === item.caliber && i.warehouse === formData.warehouse);
      const currentStock = inventoryItem ? inventoryItem.stock : 0;
      
      if (item.quantity > currentStock) {
          toast({
              variant: "destructive",
              title: "Error de Stock",
              description: `No hay stock para ${item.product} - ${item.caliber} en ${formData.warehouse}. Stock: ${currentStock} kg.`,
          });
          return;
      }
    }
    // --- VALIDATION END ---

    onSave(formData);
  };
  
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name.startsWith('items.')) {
        const [_, indexStr, field] = name.split('.');
        const index = parseInt(indexStr);
        handleItemChange(index, field as keyof OrderItem, ['quantity', 'price', 'advancePercentage', 'packagingQuantity', 'lotNumber'].includes(field) ? (field === 'lotNumber' ? value : Number(value)) : value);
    } else if (name.startsWith('newItem.')) {
        const field = name.split('.')[1] as keyof typeof newItem;
        setNewItem(prev => ({ ...prev, [field]: ['quantity', 'price', 'packagingQuantity'].includes(field) ? Number(value) : value }));
    } else {
        setFormData((prev) => ({ ...prev, [name]: ['advancePercentage'].includes(name) ? Number(value) : value }));
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

  const generateLotNumber = (itemIndex: number) => {
    const lot = getNextLotNumber();
    handleItemChange(itemIndex, 'lotNumber', lot);
    toast({
      title: 'Lote Generado',
      description: `Se ha asignado el lote: ${lot}`,
    });
  };

  const title = order ? 'Editar Orden de Venta' : 'Crear Orden de Venta';
  const description = order 
    ? 'Actualice la información de la orden.'
    : 'Complete la información para registrar una nueva orden de venta.';

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

  const handlePurchaseOrderSelect = (purchaseOrderId: string) => {
    const po = purchaseOrders.find(p => p.id === purchaseOrderId);
    if (po) {
      const newItems = po.items.map(item => ({
        ...item,
        price: 0, // Reset price to 0
        id: `temp-po-${po.id}-${item.id}-${Date.now()}`
      }));
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, ...newItems],
        relatedPurchaseIds: [...(prev.relatedPurchaseIds || []), po.id],
        purchaseOrder: purchaseOrderId
      }));
      toast({
        title: "Ítems Agregados",
        description: `Se agregaron ${newItems.length} ítems desde la O/C ${purchaseOrderId}.`,
      })
    }
  }

  if (!formData) return null;

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
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "col-span-3 justify-start text-left font-normal",
                            !formData.date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.date ? format(parseISO(formData.date), "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={formData.date ? parseISO(formData.date) : undefined}
                            onSelect={(date) => {
                                if (date) {
                                    handleSelectChange('date', format(date, 'yyyy-MM-dd'))
                                }
                            }}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
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
                   <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="saleType" className="text-right">
                        Tipo de Venta
                      </Label>
                      <Select
                        onValueChange={(value: 'Venta Firme' | 'Consignación' | 'Mínimo Garantizado') => handleSelectChange('saleType', value)}
                        value={formData.saleType}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Seleccione un tipo de venta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Venta Firme">Venta Firme</SelectItem>
                          <SelectItem value="Consignación">Consignación</SelectItem>
                          <SelectItem value="Mínimo Garantizado">Mínimo Garantizado</SelectItem>
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
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="warehouse" className="text-right">
                            Bodega Origen
                        </Label>
                        <Select
                            required
                            onValueChange={(value) => handleSelectChange('warehouse', value)}
                            value={formData.warehouse}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Seleccione bodega de origen" />
                            </SelectTrigger>
                            <SelectContent>
                                {warehouses.map(w => (
                                <SelectItem key={w} value={w}>{w}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="movementType" className="text-right">
                          Tipo Movimiento
                        </Label>
                        <Select
                          onValueChange={(value: 'Venta Directa' | 'Traslado a Bodega Externa') => handleSelectChange('movementType', value)}
                          value={formData.movementType}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Venta Directa">Venta Directa</SelectItem>
                            <SelectItem value="Traslado a Bodega Externa">Traslado a Bodega Externa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {formData.movementType === 'Traslado a Bodega Externa' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="destinationWarehouse" className="text-right">
                            Bodega Destino
                          </Label>
                          <Select
                            onValueChange={(value) => handleSelectChange('destinationWarehouse', value)}
                            value={formData.destinationWarehouse}
                          >
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Seleccione bodega de destino" />
                            </SelectTrigger>
                            <SelectContent>
                              {warehouses.filter(w => w !== formData.warehouse).map(w => (
                                <SelectItem key={w} value={w}>{w}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                </div>
              </div>
              
                <Card>
                    <CardHeader><CardTitle className="text-lg font-headline">Transporte</CardTitle></CardHeader>
                    <CardContent className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="carrierId">Transportista</Label>
                             <Select onValueChange={(value) => handleSelectChange('carrierId', value)} value={formData.carrierId}>
                                <SelectTrigger><SelectValue placeholder="Seleccione transportista" /></SelectTrigger>
                                <SelectContent>
                                    {carriers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="driverName">Nombre Chofer</Label>
                            <Input id="driverName" name="driverName" value={formData.driverName || ''} onChange={handleInputChange} />
                        </div>
                         <div>
                            <Label htmlFor="licensePlate">Patente</Label>
                            <Input id="licensePlate" name="licensePlate" value={formData.licensePlate || ''} onChange={handleInputChange} />
                        </div>
                    </CardContent>
                </Card>

              <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-headline">Ítems de la Orden</CardTitle>
                         <Button type="button" variant="outline" size="sm" onClick={() => setIsMatrixOpen(true)} disabled={!formData.warehouse}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Agregar Matriz de Items
                        </Button>
                    </div>
                     {!formData.warehouse && <p className="text-xs text-destructive">Seleccione una bodega para agregar items.</p>}
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 items-center gap-4 my-4">
                      <Label htmlFor="purchaseOrder" className="text-right">
                        Agregar desde O/C
                      </Label>
                      <Select onValueChange={handlePurchaseOrderSelect} value={formData.purchaseOrder || ''}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Seleccione una Orden de Compra para agregar sus ítems" />
                        </SelectTrigger>
                        <SelectContent>
                          {purchaseOrders.filter(po => po.status === 'completed').map(po => (
                            <SelectItem key={po.id} value={po.id}>{po.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No hay ítems en la orden.</p>}

                    {formData.items.map((item, index) => {
                        const subtotal = (item.quantity || 0) * (item.price || 0);
                        const inventoryItem = inventory.find(i => i.product === item.product && i.caliber === item.caliber && i.warehouse === formData.warehouse);
                        const stock = inventoryItem ? inventoryItem.stock : 0;
                        
                        return (
                        <div key={item.id} className="grid grid-cols-12 gap-2 items-end mb-2 p-3 border rounded-md relative">
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
                                <Select required onValueChange={(value) => handleSelectChange(`items.${index}.caliber`, value)} value={item.caliber}>
                                    <SelectTrigger><SelectValue placeholder="Calibre" /></SelectTrigger>
                                    <SelectContent>
                                        {calibers.map(c => <SelectItem key={c.name} value={c.name}>{`${c.name} (${c.code})`}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                             {/* Packaging Type */}
                             <div className="col-span-6 md:col-span-1">
                                <Label>T. Envase</Label>
                                <Select onValueChange={(value) => handleSelectChange(`items.${index}.packagingType`, value)} value={item.packagingType}>
                                    <SelectTrigger><SelectValue placeholder="Envase" /></SelectTrigger>
                                    <SelectContent>
                                        {packagingTypes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Packaging Quantity */}
                            <div className="col-span-6 md:col-span-1">
                                <Label># Envases</Label>
                                <Input name={`items.${index}.packagingQuantity`} type="number" value={item.packagingQuantity || ''} onChange={handleInputChange} placeholder="0" className="text-base"/>
                            </div>
                            {/* Quantity */}
                            <div className="col-span-6 md:col-span-1">
                                <Label>Cantidad</Label>
                                <Input name={`items.${index}.quantity`} type="number" value={item.quantity || ''} onChange={handleInputChange} placeholder="0" required className="text-base" />
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
                                <Input name={`items.${index}.price`} type="number" value={item.price || ''} onChange={handleInputChange} placeholder="0" required className="text-base" />
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
                             {/* Lot Number */}
                             <div className="col-span-10 mt-2">
                               <Label>Lote</Label>
                               <div className="flex gap-2">
                                <Input name={`items.${index}.lotNumber`} value={item.lotNumber || ''} onChange={handleInputChange} placeholder="Número de lote" />
                               </div>
                             </div>

                            {/* Remove button */}
                            <div className='col-span-2 mt-auto self-end'>
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
                                    <Input id="advancePercentage" name="advancePercentage" type="number" value={formData.advancePercentage || ''} onChange={handleInputChange} className="col-span-3" required min="0" max="100"/>
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
                                            {formData.advanceDueDate ? format(parseISO(formData.advanceDueDate), "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={formData.advanceDueDate ? parseISO(formData.advanceDueDate) : undefined}
                                            onSelect={(date) => {
                                                if (date) {
                                                    handleSelectChange('advanceDueDate', format(date, 'yyyy-MM-dd'))
                                                }
                                            }}
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
                                            {formData.balanceDueDate ? format(parseISO(formData.balanceDueDate), "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={formData.balanceDueDate ? parseISO(formData.balanceDueDate) : undefined}
                                            onSelect={(date) => {
                                                if (date) {
                                                    handleSelectChange('balanceDueDate', format(date, 'yyyy-MM-dd'))
                                                }
                                            }}
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
                                    <span className='font-medium'>{formData.advanceDueDate ? format(parseISO(formData.advanceDueDate), 'dd-MM-yyyy', { locale: es }) : '-'}</span>
                                </div>
                                <Separator className="my-2" />
                                 <div className='flex justify-between'>
                                    <span className="text-muted-foreground">Monto Saldo:</span>
                                    <span className='font-medium'>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(balanceAmount)}</span>
                                </div>
                                <div className='flex justify-between'>
                                    <span className="text-muted-foreground">Vencimiento:</span>
                                    <span className='font-medium'>{formData.balanceDueDate ? format(parseISO(formData.balanceDueDate), 'dd-MM-yyyy', { locale: es }) : '-'}</span>
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
              <Button type="submit">Guardar</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <ItemMatrixDialog 
        isOpen={isMatrixOpen}
        onOpenChange={setIsMatrixOpen}
        onSave={handleMatrixSave}
        orderType="sale"
        inventory={inventory.filter(i => i.warehouse === formData.warehouse)}
      />
    </>
  );
}
