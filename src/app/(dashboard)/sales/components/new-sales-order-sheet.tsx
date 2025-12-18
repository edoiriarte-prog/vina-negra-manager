
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
import { Trash2, Plus, Users, Truck, Info, PackageCheck, DollarSign, CreditCard, CalendarIcon, Warehouse, Landmark, Loader2 } from "lucide-react";
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
import { format, addDays, parseISO } from 'date-fns';
import QuickContactDialog from "@/components/contacts/quick-contact-dialog";

interface NewSalesOrderSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (orderData: SalesOrder | Omit<SalesOrder, "id">) => Promise<void>;
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

const getInitialFormData = (order: SalesOrder | null): SalesOrderFormData => {
    if (order) {
        return {
            ...order,
            date: order.date ? format(new Date(order.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            items: (order.items || []).map(item => ({...item, total: (item.quantity || 0) * (item.price || 0)})),
            saleType: order.saleType || 'Venta en Firme',
            paymentMethod: order.paymentMethod || 'Contado',
            paymentDueDate: order.paymentDueDate ? format(new Date(order.paymentDueDate), 'yyyy-MM-dd') : undefined,
            driver: (order as any).driver || '',
            plate: (order as any).plate || '',
        };
    }
    
    // Devolvemos un estado inicial vacío para evitar discrepancias en el servidor
    return {
        number: '', // El número se generará en el cliente
        clientId: "",
        date: format(new Date(), 'yyyy-MM-dd'),
        items: [],
        status: 'pending',
        includeVat: true,
        warehouse: 'Bodega Central',
        paymentMethod: 'Contado',
        creditDays: 0,
        notes: '',
        saleType: 'Venta en Firme',
        advanceAmount: 0,
        bankAccountId: '',
        driver: '',
        plate: ''
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
  const { warehouses, bankAccounts } = useMasterData(); 
  const isDispatch = sheetType === 'dispatch';

  const [formData, setFormData] = useState<SalesOrderFormData>(() => getInitialFormData(order));
  const [items, setItems] = useState<OrderItem[]>(order?.items || []);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuickContactOpen, setIsQuickContactOpen] = useState(false);

  // LÓGICA DE GENERACIÓN DE ID MOVIDA A useEffect PARA EJECUTAR SOLO EN CLIENTE
  useEffect(() => {
    if (isOpen) {
      const initialData = getInitialFormData(order);
      if (!order) {
          // Generar ID solo si es una nueva orden y en el cliente
          const existingIds = (salesOrders || [])
              .map(o => o.number ? parseInt(o.number.replace(/OV-|\D/g, ''), 10) : 0)
              .filter(n => !isNaN(n) && n > 0);
          
          const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 2100;
          const nextNum = maxId < 2100 ? 2101 : maxId + 1;
          const newId = `OV-${nextNum}`;
          initialData.number = newId;
      }
      setFormData(initialData);
      setItems(initialData.items || []);
      setIsSubmitting(false);
    }
  }, [order, isOpen, salesOrders]);

  useEffect(() => {
      if (formData.paymentMethod === 'Crédito' && formData.creditDays && formData.creditDays > 0 && formData.date) {
          const dueDate = addDays(parseISO(formData.date), formData.creditDays);
          setFormData(prev => ({...prev, paymentDueDate: format(dueDate, 'yyyy-MM-dd')}))
      }
  }, [formData.creditDays, formData.date, formData.paymentMethod]);


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
    setFormData(prev => ({ ...prev, [name]: ['creditDays', 'advanceAmount'].includes(name) ? Number(value) : value }));
  };


  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleQuickContactSuccess = (newId: string) => {
    setFormData(prev => ({ ...prev, clientId: newId }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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

    // SOLUCIÓN CLAVE: Eliminar claves con valor `undefined` antes de guardar.
    Object.keys(finalOrder).forEach(key => {
        if (finalOrder[key] === undefined) {
            delete finalOrder[key];
        }
    });

    try {
        setIsSubmitting(true);
        await onSave(finalOrder);
    } catch (error) {
        console.error("Error al guardar desde el sheet:", error);
    } finally {
        setIsSubmitting(false);
    }
  };

  const netTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.total || 0), 0);
  }, [items]);
  
  const { vatAmount, finalTotalWithVat } = useMemo(() => {
      const vat = formData.includeVat ? netTotal * 0.19 : 0;
      const total = netTotal + vat;
      return { vatAmount: vat, finalTotalWithVat: total };
  }, [netTotal, formData.includeVat]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val || 0);

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
                {/* TARJETA CLIENTE */}
                <Card className={darkCardClass}>
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                                <Users className="h-4 w-4 text-blue-500" /> Cliente
                            </Label>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-blue-400 hover:bg-blue-900/50" onClick={() => setIsQuickContactOpen(true)}>
                                <Plus className="h-4 w-4" />
                            </Button>
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

                {/* TARJETA FECHA */}
                <Card className={darkCardClass}>
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                            <CalendarIcon className="h-4 w-4 text-orange-500" /> Fecha Emisión
                        </div>
                        <Input type="date" name="date" value={formData.date} onChange={handleInputChange} className={`${darkInputClass} [color-scheme:dark]`} required />
                    </CardContent>
                </Card>

                {/* TARJETA DESPACHO / BODEGA */}
                <Card className={darkCardClass}>
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                            <Warehouse className="h-4 w-4 text-emerald-500" /> Despacho y Logística
                        </div>
                        
                        <div className="space-y-1">
                            <Label className="text-[10px] text-slate-500 uppercase">Bodega Origen</Label>
                            <Select required onValueChange={(v) => handleSelectChange('warehouse', v)} value={formData.warehouse}>
                                <SelectTrigger className={darkInputClass}><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                    {warehouses.map((w, index) => (
                                        <SelectItem key={index} value={w} className="focus:bg-slate-800 focus:text-slate-100">{w}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="space-y-1">
                                <Label className="text-[10px] text-slate-500 uppercase">Chofer</Label>
                                <Input 
                                    name="driver" 
                                    placeholder="Nombre Chofer" 
                                    value={formData.driver || ''} 
                                    onChange={handleInputChange} 
                                    className={darkInputClass} 
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-slate-500 uppercase">Patente</Label>
                                <Input 
                                    name="plate" 
                                    placeholder="AB-CD-12" 
                                    value={formData.plate || ''} 
                                    onChange={handleInputChange} 
                                    className={`${darkInputClass} uppercase`} 
                                />
                            </div>
                        </div>

                    </CardContent>
                </Card>
            </div>
            
            {/* TABLA DE PRODUCTOS */}
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
                                                <div className="flex flex-col items-end">
                                                    <Input 
                                                        type="number" 
                                                        value={item.price || ''} 
                                                        onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))} 
                                                        className="h-7 text-right font-mono text-blue-400 bg-slate-950 border-slate-700 focus:border-blue-500 w-32" 
                                                        placeholder="Neto"
                                                    />
                                                    <span className="text-[10px] text-blue-500/70 font-mono mt-1 pr-1">
                                                        c/IVA: {formatCurrency((item.price || 0) * 1.19)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-right font-medium text-slate-300 font-mono align-top pt-3">
                                                {formatCurrency(item.total || 0)}
                                            </td>
                                            <td className="px-4 py-2 text-center align-top pt-2">
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
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className={labelClass}>Tipo de Venta</Label>
                                    <Select name="saleType" onValueChange={(v) => handleSelectChange('saleType', v)} value={formData.saleType}>
                                        <SelectTrigger className={darkInputClass}><SelectValue/></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                            <SelectItem value="Venta en Firme">Venta en Firme</SelectItem>
                                            <SelectItem value="Consignación">Consignación</SelectItem>
                                            <SelectItem value="Mínimo Garantizado">Mínimo Garantizado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className={labelClass}>Forma de Pago</Label>
                                    <Select name="paymentMethod" onValueChange={(v) => handleSelectChange('paymentMethod', v)} value={formData.paymentMethod}>
                                        <SelectTrigger className={darkInputClass}><SelectValue/></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                            <SelectItem value="Contado">Contado</SelectItem>
                                            <SelectItem value="Crédito">Crédito</SelectItem>
                                            <SelectItem value="Anticipo + Saldo">Anticipo + Saldo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            {formData.paymentMethod === 'Crédito' && (
                                <div className="space-y-1">
                                    <Label className={labelClass}>Vencimiento Crédito</Label>
                                    <div className="flex items-center gap-2">
                                        <Input type="number" name="creditDays" placeholder="Días" value={formData.creditDays || ''} onChange={handleInputChange} className={`${darkInputClass} w-24 text-center`}/>
                                        <Input type="date" name="paymentDueDate" value={formData.paymentDueDate || ''} onChange={handleInputChange} className={`${darkInputClass} flex-1 [color-scheme:dark]`}/>
                                    </div>
                                </div>
                            )}

                            {formData.paymentMethod === 'Anticipo + Saldo' && (
                                <div className="space-y-1">
                                    <Label className={labelClass}>Monto Anticipo</Label>
                                    <Input type="number" name="advanceAmount" placeholder="$" value={formData.advanceAmount || ''} onChange={handleInputChange} className={darkInputClass}/>
                                </div>
                            )}

                            <div className="space-y-1 pt-2">
                                <Label className={labelClass}>Cuenta Destino Fondos</Label>
                                <Select name="bankAccountId" onValueChange={(v) => handleSelectChange('bankAccountId', v)} value={formData.bankAccountId}>
                                    <SelectTrigger className={darkInputClass}>
                                        <div className="flex items-center gap-2">
                                            <Landmark className="h-4 w-4 text-slate-500"/>
                                            <SelectValue placeholder="Seleccione una cuenta..."/>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                        {bankAccounts.map(acc => (
                                            <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.bankName})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 pt-2">
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
                                      <span className="font-mono text-slate-200">{formatCurrency(netTotal)}</span>
                                  </div>
                                  {formData.includeVat && (
                                      <div className="flex justify-between text-slate-400 text-sm">
                                          <span>IVA (19%)</span>
                                          <span className="font-mono text-slate-200">{formatCurrency(vatAmount)}</span>
                                      </div>
                                  )}
                                  <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 flex justify-between items-end mt-2">
                                      <span className="text-sm text-slate-400 font-medium uppercase tracking-wider mb-1">Total a Pagar</span>
                                      <span className="text-2xl font-bold text-white tracking-tight">{formatCurrency(finalTotalWithVat)}</span>
                                  </div>
                              </div>
                          </CardContent>
                      </Card>
                 </div>
            </div>

            </div>

            <SheetFooter className="sticky bottom-0 bg-slate-900 border-t border-slate-800 p-4 sm:justify-end z-10 shadow-[0_-5px_10px_rgba(0,0,0,0.2)]">
              <SheetClose asChild><Button variant="ghost" className="mr-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800">Cancelar</Button></SheetClose>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 shadow-lg shadow-blue-900/20 font-semibold disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={items.length === 0 || isSubmitting}
              >
                  {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                    </>
                  ) : (
                    order ? 'Guardar Cambios' : `Crear ${isDispatch ? 'Despacho' : 'Venta'}`
                  )}
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
      
    <QuickContactDialog
        isOpen={isQuickContactOpen}
        onOpenChange={setIsQuickContactOpen}
        type="client"
        onSuccess={handleQuickContactSuccess}
    />
    </>
  );
}

