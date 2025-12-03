"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, ShoppingCart, Truck, AlertCircle } from "lucide-react";
import { 
  SalesOrder, 
  Contact, 
  InventoryItem, 
  OrderItem, 
  PurchaseOrder, 
  InventoryAdjustment 
} from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useMasterData } from "@/hooks/use-master-data";
import { ItemMatrixDialog } from "@/components/item-matrix-dialog";

// LISTA DE RESPALDO DE CALIBRES (Por si no hay en inventario)
const DEFAULT_CALIBERS = [
  "Sin Calibre", "Pre-calibre", 
  "12", "14", "16", "18", "20", "22", "24", "26", "28", "30", "32", "34", "36", 
  "40", "50", "60", "70", "80", "90", 
  "Cat. I", "Cat. II", "Descarte"
];

interface NewSalesOrderSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (orderData: SalesOrder | Omit<SalesOrder, "id">) => void;
  order: SalesOrder | null;
  clients: Contact[];
  inventory: InventoryItem[]; 
  sheetType?: 'sale' | 'dispatch'; 
  carriers?: Contact[]; 
  nextOrderId?: string;
  purchaseOrders?: PurchaseOrder[];
  salesOrders?: SalesOrder[];
  inventoryAdjustments?: InventoryAdjustment[];
  contacts?: Contact[];
}

export function NewSalesOrderSheet({
  isOpen,
  onOpenChange,
  onSave,
  order,
  clients,
  inventory,
  sheetType = 'sale' 
}: NewSalesOrderSheetProps) {
  
  const { toast } = useToast();
  const { products: masterProducts, warehouses } = useMasterData(); 
  const isDispatch = sheetType === 'dispatch';

  const [formData, setFormData] = useState<Partial<SalesOrder>>({
    clientId: "",
    warehouse: "", 
    date: new Date().toISOString().split('T')[0],
    status: isDispatch ? "dispatched" : "pending",
    includeVat: false,
    items: [],
    destinationWarehouse: "", 
  });

  const [items, setItems] = useState<OrderItem[]>([]);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  
  const [currentItem, setCurrentItem] = useState<Partial<OrderItem>>({
    product: "",
    caliber: "",
    format: "",
    quantity: 0,
    packagingQuantity: 0,
    price: 0,
  });

  const availableWarehouses = useMemo(() => {
    return warehouses || ["Principal"]; 
  }, [warehouses]);

  useEffect(() => {
    if (availableWarehouses.length > 0 && !formData.warehouse) {
        setFormData(prev => ({...prev, warehouse: typeof availableWarehouses[0] === 'string' ? availableWarehouses[0] : (availableWarehouses[0] as any).name }));
    }
  }, [availableWarehouses, formData.warehouse]);

  useEffect(() => {
    if (order) {
      setFormData({ ...order });
      setItems(order.items || []);
    } else {
      setFormData({
        clientId: "",
        warehouse: typeof availableWarehouses[0] === 'string' ? availableWarehouses[0] : (availableWarehouses[0] as any).name || "Principal",
        date: new Date().toISOString().split('T')[0],
        status: isDispatch ? "dispatched" : "pending",
        includeVat: false,
        destinationWarehouse: "",
      });
      setItems([]);
    }
  }, [order, isOpen, isDispatch, availableWarehouses]);

  // --- MANEJO DE ITEMS ---

  const availableProducts = useMemo(() => {
    return masterProducts || [];
  }, [masterProducts]);

  const availableCalibers = useMemo(() => {
    if (!currentItem.product) return [];
    
    // 1. Buscamos en el inventario real
    const relevantItems = inventory.filter(i => i.name === currentItem.product);
    const inventoryCalibers = Array.from(new Set(relevantItems.map(i => i.caliber).filter(Boolean)));
    
    // 2. Si hay calibres en inventario, los usamos. Si no, usamos la lista estándar.
    if (inventoryCalibers.length > 0) {
      return inventoryCalibers.sort();
    } else {
      return DEFAULT_CALIBERS;
    }
  }, [inventory, currentItem.product]);

  const currentStockItem = inventory.find(i => 
    i.name === currentItem.product && 
    i.caliber === currentItem.caliber && 
    i.warehouse === formData.warehouse
  );
  
  const handleMatrixSave = (matrixItems: Omit<OrderItem, 'id'>[]) => {
    const newItems: OrderItem[] = matrixItems.map(item => ({
        ...item,
        id: `temp-${Date.now()}-${Math.random()}`,
    }));
    setItems(prev => ([...prev, ...newItems]));
    setIsMatrixOpen(false);
  }

  const addItem = () => {
    if (!currentItem.product || !currentItem.caliber || !currentItem.quantity || currentItem.quantity <= 0) {
      toast({ variant: "destructive", title: "Faltan datos", description: "Completa producto, calibre y cantidad." });
      return;
    }

    if (currentStockItem && currentItem.quantity! > currentStockItem.stock) {
        toast({
            variant: "destructive",
            title: "Advertencia de Stock",
            description: `En ${formData.warehouse} solo hay ${currentStockItem.stock} kg. Se permitirá la venta.`
        });
    }

    const newItem: OrderItem = {
      product: currentItem.product,
      caliber: currentItem.caliber,
      quantity: Number(currentItem.quantity),
      packagingQuantity: Number(currentItem.packagingQuantity || 0),
      price: Number(currentItem.price || 0),
      total: Number(currentItem.quantity) * Number(currentItem.price || 0),
      unit: 'Kilos',
      format: currentItem.format || 'Estándar',
      lotNumber: currentItem.lotNumber || '' 
    };

    setItems([...items, newItem]);
    setCurrentItem(prev => ({ ...prev, caliber: "", quantity: 0, packagingQuantity: 0 }));
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!formData.clientId && !isDispatch) {
        toast({ variant: "destructive", title: "Falta Cliente", description: "Selecciona un cliente." });
        return;
    }
    
    if (items.length === 0 && currentItem.product && currentItem.quantity && currentItem.quantity > 0) {
       toast({ 
         variant: "default", 
         title: "Item agregado automáticamente", 
         description: "Se agregó el producto que estaba en edición." 
       });
       const autoItem: OrderItem = {
          product: currentItem.product,
          caliber: currentItem.caliber || "Sin Calibre",
          quantity: Number(currentItem.quantity),
          packagingQuantity: Number(currentItem.packagingQuantity || 0),
          price: Number(currentItem.price || 0),
          total: Number(currentItem.quantity) * Number(currentItem.price || 0),
          unit: 'Kilos',
          format: currentItem.format || 'Estándar',
          lotNumber: currentItem.lotNumber || '' 
       };
       const finalOrder: any = {
          ...formData,
          items: [autoItem],
          clientId: formData.clientId || (isDispatch ? 'internal_transfer' : ''), 
      };
      onSave(finalOrder);
      return;
    }

    if (items.length === 0) {
        toast({ variant: "destructive", title: "Orden Vacía", description: "Agrega al menos un producto." });
        return;
    }

    const finalOrder: any = {
        ...formData,
        items: items,
        clientId: formData.clientId || (isDispatch ? 'internal_transfer' : ''), 
    };

    onSave(finalOrder);
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const totalAmount = formData.includeVat ? subtotal * 1.19 : subtotal;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl bg-slate-950 border-l-slate-800 text-slate-100 overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
             {isDispatch ? <Truck className="text-blue-500"/> : <ShoppingCart className="text-emerald-500"/>}
             <SheetTitle className="text-white">{order ? 'Editar' : 'Nueva'} {isDispatch ? 'Orden de Despacho' : 'Venta'}</SheetTitle>
          </div>
          <SheetDescription className="text-slate-400">
            {isDispatch 
                ? 'Registra una salida de stock o traspaso de bodega.' 
                : 'Genera una nueva venta comercial.'}
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-6 py-6">
            {/* --- DATOS GENERALES --- */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-slate-300">Cliente / Destino</Label>
                    <Select 
                        value={formData.clientId} 
                        onValueChange={(v) => setFormData(prev => ({...prev, clientId: v}))}
                    >
                        <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100">
                            <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                            {clients.map((c, index) => (
                                <SelectItem key={c.id || index} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-slate-300">Fecha</Label>
                    <Input 
                        type="date" 
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({...prev, date: e.target.value}))}
                        className="bg-slate-900 border-slate-800 text-slate-100"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label className="text-slate-300">Bodega Origen</Label>
                    <Select 
                        value={formData.warehouse} 
                        onValueChange={(v) => setFormData(prev => ({...prev, warehouse: v}))}
                    >
                        <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100">
                            <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                            {availableWarehouses.map((w, index) => (
                                <SelectItem key={index} value={typeof w === 'string' ? w : (w as any).name || 'Bodega'}>
                                    {typeof w === 'string' ? w : (w as any).name || 'Bodega'}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {!isDispatch && (
                    <div className="flex items-center space-x-2 pt-8">
                        <Switch 
                            id="vat" 
                            checked={formData.includeVat}
                            onCheckedChange={(c) => setFormData(prev => ({...prev, includeVat: c}))}
                        />
                        <Label htmlFor="vat" className="text-slate-300">Incluir IVA (19%)</Label>
                    </div>
                )}
            </div>

            <Separator className="bg-slate-800" />

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h4 className="font-medium text-slate-200">Agregar Productos</h4>
                    <Button onClick={() => setIsMatrixOpen(true)} variant="link" className="text-blue-500">
                        <Plus className="h-4 w-4 mr-1"/> Carga Rápida (Matriz)
                    </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-slate-400">Producto</Label>
                        <Select 
                            value={currentItem.product} 
                            onValueChange={(v) => setCurrentItem(prev => ({...prev, product: v, caliber: ''}))}
                        >
                            <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100 h-8">
                                <SelectValue placeholder="Producto" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                {availableProducts.map((p, index) => (
                                    <SelectItem key={p} value={p as string}>{p as string}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-slate-400">Calibre</Label>
                        <Select 
                            value={currentItem.caliber} 
                            onValueChange={(v) => setCurrentItem(prev => ({...prev, caliber: v}))}
                            disabled={!currentItem.product}
                        >
                            <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100 h-8">
                                <SelectValue placeholder="Calibre" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100 max-h-60">
                                {availableCalibers.map((c, index) => (
                                    <SelectItem key={`${c}-${index}`} value={c as string}>
                                        {c as string}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-slate-400">Kilos</Label>
                        <Input 
                            type="number" 
                            className="bg-slate-900 border-slate-800 text-slate-100 h-8" 
                            placeholder="0"
                            value={currentItem.quantity || ''}
                            onChange={(e) => setCurrentItem(prev => ({...prev, quantity: Number(e.target.value)}))}
                        />
                        {currentStockItem ? (
                            <p className="text-[10px] text-slate-500 text-right">Disponible: {currentStockItem.stock}</p>
                        ) : (
                            <p className="text-[10px] text-slate-500 text-right text-yellow-500 flex justify-end gap-1 items-center">
                               <AlertCircle className="w-3 h-3"/> Sin stock (se permite venta)
                            </p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-slate-400">Envases (Cajas)</Label>
                        <Input 
                            type="number" 
                            className="bg-slate-900 border-slate-800 text-slate-100 h-8" 
                            placeholder="0"
                            value={currentItem.packagingQuantity || ''}
                            onChange={(e) => setCurrentItem(prev => ({...prev, packagingQuantity: Number(e.target.value)}))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-slate-400">Precio/Kg</Label>
                        <Input 
                            type="number" 
                            className="bg-slate-900 border-slate-800 text-slate-100 h-8" 
                            placeholder="$"
                            value={currentItem.price || ''}
                            onChange={(e) => setCurrentItem(prev => ({...prev, price: Number(e.target.value)}))}
                        />
                    </div>
                </div>
                <Button onClick={addItem} variant="secondary" className="w-full bg-slate-800 text-slate-200 hover:bg-slate-700">
                    <Plus className="h-4 w-4 mr-2"/> Agregar Item a la lista
                </Button>
            </div>

            <div className="space-y-2">
                {items.length === 0 ? (
                   <div className="text-center p-4 border border-dashed border-slate-800 rounded text-slate-500 text-sm">
                      No hay productos agregados.
                   </div>
                ) : (
                  items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-900/50 rounded border border-slate-800 text-sm">
                        <div>
                            <span className="text-white font-medium">{item.product} {item.caliber}</span>
                            <div className="text-slate-500 text-xs">
                                {item.quantity} kg • {item.packagingQuantity} cajas • ${item.price}/kg
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-emerald-400 font-mono">${(item.total).toLocaleString('es-CL')}</span>
                            <button onClick={() => removeItem(idx)} className="text-slate-500 hover:text-red-400">
                                <Trash2 className="h-4 w-4"/>
                            </button>
                        </div>
                    </div>
                  ))
                )}
                
                {items.length > 0 && (
                    <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                        <span className="text-lg font-bold text-white">Total</span>
                        <span className="text-lg font-bold text-emerald-400">
                            ${Math.round(totalAmount).toLocaleString('es-CL')}
                        </span>
                    </div>
                )}
            </div>

        </div>

        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline" className="border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800">Cancelar</Button>
          </SheetClose>
          <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-500 text-white">
            {order ? 'Guardar Cambios' : `Crear ${isDispatch ? 'Despacho' : 'Venta'}`}
          </Button>
        </SheetFooter>
      </SheetContent>

      <ItemMatrixDialog
        isOpen={isMatrixOpen}
        onOpenChange={setIsMatrixOpen}
        onSave={handleMatrixSave}
        orderType={sheetType}
        inventory={inventory}
      />
    </Sheet>
  );
}
