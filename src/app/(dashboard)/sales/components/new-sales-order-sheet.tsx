
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, Users, Truck, Info, PackageCheck, DollarSign, CreditCard, CalendarIcon, Warehouse } from "lucide-react";
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
import { ItemMatrixDialog } from "./item-matrix-dialog";
import { format } from 'date-fns';

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

type SalesOrderFormData = Partial<Omit<SalesOrder, 'id' | 'items'>> & {
  items: OrderItem[];
};


const getInitialFormData = (order: SalesOrder | null, allSalesOrders: SalesOrder[]): SalesOrderFormData => {
    if (order) {
        return {
            ...order,
            date: order.date ? format(new Date(order.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            items: (order.items || []).map(item => ({...item, total: (item.quantity || 0) * (item.price || 0)}))
        };
    }
    
    const existingIds = (allSalesOrders || [])
        .map(o => o.number ? parseInt(o.number.replace(/OV-|\D/g, ''), 10) : 0)
        .filter(n => !isNaN(n) && n > 0);
    
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 2100;
    const nextNum = maxId < 2100 ? 2101 : maxId + 1;
    const newId = `OV-${nextNum}`;

    return {
        number: newId,
        clientId: "",
        date: format(new Date(), 'yyyy-MM-dd'),
        items: [],
        status: 'pending',
        includeVat: true,
        warehouse: 'Bodega Central',
        paymentMethod: 'Contado',
        creditDays: 0,
        notes: '',
        saleType: 'Venta Firme',
    };
};


export function NewSalesOrderSheet({
  isOpen,
  onOpenChange,
  onSave,
  order,
  clients,
  inventory,
  sheetType = 'sale',
  salesOrders = []
}: NewSalesOrderSheetProps) {
  
  const { toast } = useToast();
  const { warehouses } = useMasterData(); 
  const isDispatch = sheetType === 'dispatch';

  const [formData, setFormData] = useState<SalesOrderFormData>(() => getInitialFormData(order, salesOrders));
  const [items, setItems] = useState<OrderItem[]>(order?.items || []);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initialData = getInitialFormData(order, salesOrders);
      setFormData(initialData);
      setItems(initialData.items || []);
    }
  }, [order, isOpen, salesOrders]);


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
    setItems(prev => [...prev, ...newItems]);
    setIsMatrixOpen(false);
  }
  
  const handleSelectChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.clientId && !isDispatch) {
        toast({ variant: "destructive", title: "Falta Cliente", description: "Selecciona un cliente." });
        return;
    }
    if (items.length === 0) {
        toast({ variant: "destructive", title: "Orden Vacía", description: "Agrega al menos un producto." });
        return;
    }
    
    const netAmount = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const totalKilos = items.reduce((acc, item) => acc + (item.quantity || 0), 0);
    const totalPackages = items.reduce((acc, item) => acc + (item.packagingQuantity || 0), 0);

    const safeNumber = formData.number || `OV-${Date.now()}`;

    const finalOrder: any = {
        ...formData,
        id: order?.id || safeNumber,
        number: safeNumber,
        items: items,
        totalAmount: netAmount, 
        totalKilos,
        totalPackages,
        status: formData.status || 'pending',
    };

    Object.keys(finalOrder).forEach(key => {
        if (finalOrder[key] === undefined) {
            delete finalOrder[key];
        }
    });

    onSave(finalOrder);
  };

  const netTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.total || 0), 0);
  }, [items]);
  
  const { vatAmount, finalTotalWithVat } = useMemo(() => {
      const vat = formData.includeVat ? netTotal * 0.19 : 0;
      const total = netTotal + vat;
      return { vatAmount: vat, finalTotalWithVat: total };
  }, [netTotal, formData.includeVat]);

  const title = order ? `Editar OV ${order.number}` : `Nueva Orden de Venta`;
  const darkInputClass = "bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500 placeholder:text-slate-600";
  const darkCardClass = "bg-slate-900 border-slate-800 shadow-sm";
  const labelClass = "text-xs font-medium text-slate-400 uppercase tracking-wide";
  
  if (!formData) return null;

  return (
    <>
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-7xl w-[95vw] overflow-y-auto p-0 flex flex-col gap-0 bg-slate-950 border-l-slate-800 text-slate-100">
        <SheetHeader className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-10">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="bg-emerald-600/20 p-2.5 rounded-xl border border-emerald-600/30">
                        <Truck className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div>
                        <SheetTitle className="text-xl font-bold text-slate-100 tracking-tight">{title}</SheetTitle>
                        <SheetDescription className="text-xs text-slate-400 font-mono mt-0.5">
                            {formData.number ? `ID: ${formData.number}` : 'Calculando ID...'}
                        </SheetDescription>
                    </div>
                </div>
            </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-8">
            
            <div className="grid md:grid-cols-3 gap-5">
                <Card className={darkCardClass}>
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                            <Users className="h-4 w-4 text-blue-500" /> Cliente
                        </div>
                        <Select required onValueChange={(value) => handleSelectChange('clientId', value)} value={formData.clientId}>
                            <SelectTrigger className={darkInputClass}><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                {clients?.map((c) => (
                                    <SelectItem key={c.id} value={c.id} className="focus:bg-slate-800 focus:text-slate-100">
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card className={darkCardClass}>
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                            <CalendarIcon className="h-4 w-4 text-orange-500" /> Fecha Emisión
                        </div>
                        <Input type="date" name="date" value={formData.date} onChange={handleInputChange} className={`${darkInputClass} [color-scheme:dark]`} required />
                    </CardContent>
                </Card>

                <Card className={darkCardClass}>
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                            <Warehouse className="h-4 w-4 text-emerald-500" /> Bodega Origen
                        </div>
                        <Select required onValueChange={(v) => handleSelectChange('warehouse', v)} value={formData.warehouse}>
                            <SelectTrigger className={darkInputClass}><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                {warehouses.map((w, index) => (
                                    <SelectItem key={index} value={w} className="focus:bg-slate-800 focus:text-slate-100">{w}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>
            </div>
            
            <div className={`rounded-xl border border-slate-800 overflow-hidden ${darkCardClass}`}>
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-400" /> Detalle de Productos
                    </h3>
                    <Button type="button" onClick={() => setIsMatrixOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white border-none shadow-md shadow-blue-900/20 transition-all">
                        <Plus className="mr-2 h-4 w-4" /> Carga Masiva (Matriz)
                    </Button>
                </div>
                 <div className="p-0">
                    {items.length === 0 ? (
                        <div className="py-16 text-center text-slate-500 bg-slate-950/50 flex flex-col items-center">
                            <PackageCheck className="h-12 w-12 mb-3 opacity-20" />
                            <p className="text-lg font-medium">No hay productos agregados</p>
                            <p className="text-sm opacity-70">Use el botón de "Carga Masiva" para comenzar.</p>
                        </div>
                    ) : (
                         <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-400 uppercase bg-slate-950 border-b border-slate-800">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Producto</th>
                                        <th className="px-4 py-3 font-semibold">Calibre</th>
                                        <th className="px-4 py-3 text-center font-semibold">Kilos</th>
                                        <th className="px-4 py-3 text-right font-semibold">Precio Unit.</th>
                                        <th className="px-4 py-3 text-right font-semibold">Total</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                                    {items.map((item, index) => (
                                        <tr key={index} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-2 font-medium text-slate-200">{item.product}</td>
                                            <td className="px-4 py-2 text-slate-400">{item.caliber}</td>
                                            <td className="px-4 py-2">
                                                <Input type="number" value={item.quantity || ''} onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))} className="h-7 text-center font-bold bg-slate-950 border-slate-700 focus:border-blue-500 text-slate-100" />
                                            </td>
                                            <td className="px-4 py-2">
                                                <Input type="number" value={item.price || ''} onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))} className="h-7 text-right font-mono text-blue-400 bg-slate-950 border-slate-700 focus:border-blue-500" />
                                            </td>
                                            <td className="px-4 py-2 text-right font-medium text-slate-300 font-mono">
                                                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(item.total || 0)}
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-7 w-7 text-slate-500 hover:text-red-400 hover:bg-red-950/30">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            
             <div className="grid md:grid-cols-12 gap-6 items-start">
                 <div className="md:col-span-7 space-y-4">
                    <Card className={darkCardClass}>
                        <CardContent className="p-5 space-y-4">
                             <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-indigo-400" /> Condiciones Comerciales
                            </h4>
                            <div className="space-y-2">
                                <Label className={labelClass}>Notas / Observaciones</Label>
                                <Textarea name="notes" value={formData.notes || ''} onChange={handleInputChange} className="min-h-[80px] resize-none bg-slate-950 border-slate-800 text-slate-300 focus:border-slate-600" placeholder="Instrucciones especiales para el despacho..." />
                            </div>
                        </CardContent>
                    </Card>
                 </div>
                 <div className="md:col-span-5">
                      <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl">
                          <CardContent className="p-6 space-y-4">
                              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                                  <h4 className="font-semibold text-slate-100 flex items-center gap-2">
                                      <DollarSign className="h-4 w-4 text-emerald-500" /> Totales
                                  </h4>
                                  <div className="flex items-center gap-2 bg-slate-950/50 px-3 py-1 rounded-full border border-slate-800">
                                      <Switch id="includeVat" checked={formData.includeVat} onCheckedChange={(checked) => setFormData(prev => ({...prev, includeVat: checked}))} className="data-[state=checked]:bg-emerald-500" />
                                      <Label htmlFor="includeVat" className="text-[10px] cursor-pointer text-slate-400 uppercase font-bold">Ver con IVA</Label>
                                  </div>
                              </div>
                              <div className="space-y-3">
                                  <div className="flex justify-between text-slate-400 text-sm">
                                      <span>Subtotal Neto</span>
                                      <span className="font-mono text-slate-200">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(netTotal)}</span>
                                  </div>
                                  {formData.includeVat && (
                                      <div className="flex justify-between text-slate-400 text-sm">
                                          <span>IVA (19%)</span>
                                          <span className="font-mono text-slate-200">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(vatAmount)}</span>
                                      </div>
                                  )}
                                  <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 flex justify-between items-end mt-2">
                                      <span className="text-sm text-slate-400 font-medium uppercase tracking-wider mb-1">Total a Pagar</span>
                                      <span className="text-2xl font-bold text-white tracking-tight">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(finalTotalWithVat)}</span>
                                  </div>
                              </div>
                          </CardContent>
                      </Card>
                 </div>
            </div>

            </div>

            <SheetFooter className="sticky bottom-0 bg-slate-900 border-t border-slate-800 p-4 sm:justify-end z-10 shadow-[0_-5px_10px_rgba(0,0,0,0.2)]">
              <SheetClose asChild><Button variant="ghost" className="mr-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800">Cancelar</Button></SheetClose>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-8 shadow-lg shadow-blue-900/20 font-semibold" disabled={items.length === 0}>
                  {order ? 'Guardar Cambios' : `Crear ${isDispatch ? 'Despacho' : 'Venta'}`}
              </Button>
            </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
    
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
