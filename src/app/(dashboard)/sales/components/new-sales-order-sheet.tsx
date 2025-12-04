
"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { ItemMatrixDialog } from "./item-matrix-dialog"; // Corregido

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
  sheetType = 'sale',
  salesOrders
}: NewSalesOrderSheetProps) {
  
  const { toast } = useToast();
  const { products: masterProducts, warehouses } = useMasterData(); 
  const isDispatch = sheetType === 'dispatch';

  const [formData, setFormData] = useState<Partial<SalesOrder>>({});
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
        if (order) {
            setFormData({ ...order, date: order.date.split('T')[0] });
            setItems(order.items || []);
        } else {
            const existingIds = (salesOrders || [])
                .map(o => o.number ? parseInt(o.number.replace(/OV-|\D/g, ''), 10) : 0)
                .filter(n => !isNaN(n) && n > 0);
            
            const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 2100;
            const nextNum = maxId < 2100 ? 2101 : maxId + 1;
            const newId = `OV-${nextNum}`;

            setFormData({
                number: newId,
                clientId: "",
                warehouse: warehouses[0] || "Principal",
                date: new Date().toISOString().split('T')[0],
                status: isDispatch ? "dispatched" : "pending",
                includeVat: true,
                items: [],
                destinationWarehouse: "",
            });
            setItems([]);
        }
    }
  }, [order, isOpen, isDispatch, warehouses, salesOrders]);

  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index] };
    (item as any)[field] = value;
    item.total = (item.quantity || 0) * (item.price || 0);
    newItems[index] = item;
    setItems(newItems);
  };

  const handleMatrixSave = (matrixItems: Omit<OrderItem, 'id'>[]) => {
    const newItems: OrderItem[] = matrixItems.map(item => ({
        ...item,
        id: `temp-${Date.now()}-${Math.random()}`,
        total: (item.quantity || 0) * (item.price || 0)
    }));
    setItems(prev => ([...prev, ...newItems]));
    setIsMatrixOpen(false);
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!formData.clientId && !isDispatch) {
        toast({ variant: "destructive", title: "Falta Cliente", description: "Selecciona un cliente." });
        return;
    }
    if (items.length === 0) {
        toast({ variant: "destructive", title: "Orden Vacía", description: "Agrega al menos un producto." });
        return;
    }

    const netAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    // Objeto final sanitizado
    const finalOrder: any = {
        ...formData,
        id: order?.id || formData.number, // Usar ID existente o el nuevo número
        number: formData.number,
        items: items,
        totalAmount: netAmount, // Guardar siempre el neto
        totalKilos: items.reduce((acc, item) => acc + item.quantity, 0),
        totalPackages: items.reduce((acc, item) => acc + (item.packagingQuantity || 0), 0),
        clientId: formData.clientId || (isDispatch ? 'internal_transfer' : ''),
        status: formData.status || (isDispatch ? 'dispatched' : 'pending'),
    };

    // Limpiar campos undefined
    Object.keys(finalOrder).forEach(key => {
        if (finalOrder[key] === undefined) {
            delete finalOrder[key];
        }
    });

    onSave(finalOrder);
  };

  const netTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  }, [items]);
  
  const { vatAmount, finalTotalWithVat } = useMemo(() => {
      const vat = formData.includeVat ? netTotal * 0.19 : 0;
      const total = netTotal + vat;
      return { vatAmount: vat, finalTotalWithVat: total };
  }, [netTotal, formData.includeVat]);


  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-4xl bg-slate-950 border-l-slate-800 text-slate-100">
        <SheetHeader>
          <div className="flex items-center gap-2">
             {isDispatch ? <Truck className="text-blue-500"/> : <ShoppingCart className="text-emerald-500"/>}
             <SheetTitle className="text-white">{order ? 'Editar' : 'Nueva'} {isDispatch ? 'Orden de Despacho' : 'Venta'}</SheetTitle>
          </div>
          <SheetDescription className="text-slate-400">
            {isDispatch ? 'Registra una salida de stock o traspaso de bodega.' : 'Genera una nueva venta comercial.'}
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-6 py-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-slate-300">Cliente / Destino</Label>
                    <Select value={formData.clientId} onValueChange={(v) => setFormData(prev => ({...prev, clientId: v}))}>
                        <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                            {clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-slate-300">Fecha</Label>
                    <Input type="date" value={formData.date} onChange={(e) => setFormData(prev => ({...prev, date: e.target.value}))} className="bg-slate-900 border-slate-800 text-slate-100"/>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-end">
                 <div className="space-y-2">
                    <Label className="text-slate-300">Bodega Origen</Label>
                    <Select value={formData.warehouse} onValueChange={(v) => setFormData(prev => ({...prev, warehouse: v}))}>
                        <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                            {warehouses.map((w) => (<SelectItem key={w} value={w}>{w}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center space-x-2 pb-2">
                    <Switch id="vat" checked={formData.includeVat} onCheckedChange={(c) => setFormData(prev => ({...prev, includeVat: c}))} />
                    <Label htmlFor="vat" className="text-slate-300">Calcular con IVA (19%)</Label>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h4 className="font-medium text-slate-200">Productos</h4>
                    <Button onClick={() => setIsMatrixOpen(true)} variant="link" className="text-blue-500">
                        <Plus className="h-4 w-4 mr-1"/> Carga Rápida (Matriz)
                    </Button>
                </div>
                <div className="p-4 border rounded-md border-slate-800 bg-slate-900/50 space-y-3">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                            <div>
                                <span className="text-white font-medium">{item.product} {item.caliber}</span>
                                <div className="text-slate-500 text-xs">
                                    {item.quantity} kg @ ${item.price}/kg
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-emerald-400 font-mono">${(item.total).toLocaleString('es-CL')}</span>
                                <button onClick={() => removeItem(idx)} className="text-slate-500 hover:text-red-400">
                                    <Trash2 className="h-4 w-4"/>
                                </button>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && <p className="text-center text-slate-500 text-sm py-4">No hay productos agregados.</p>}
                </div>
            </div>
            
            {items.length > 0 && (
                 <div className="space-y-2 mt-4 ml-auto w-1/2">
                    <div className="flex justify-between text-slate-400"><p>Subtotal Neto:</p> <p className="font-mono">${netTotal.toLocaleString('es-CL')}</p></div>
                    {formData.includeVat && <div className="flex justify-between text-slate-400"><p>IVA (19%):</p> <p className="font-mono">${vatAmount.toLocaleString('es-CL')}</p></div>}
                    <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-slate-700"><p>TOTAL:</p> <p className="font-mono">${finalTotalWithVat.toLocaleString('es-CL')}</p></div>
                </div>
            )}
        </div>

        <SheetFooter>
          <SheetClose asChild><Button variant="outline" className="border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800">Cancelar</Button></SheetClose>
          <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-500 text-white">
            {order ? 'Guardar Cambios' : `Crear ${isDispatch ? 'Despacho' : 'Venta'}`}
          </Button>
        </SheetFooter>
      </SheetContent>

      <ItemMatrixDialog
        isOpen={isMatrixOpen}
        onOpenChange={setIsMatrixOpen}
        onSave={handleMatrixSave}
        orderType="sale"
        inventory={inventory}
      />
    </Sheet>
  );
}
