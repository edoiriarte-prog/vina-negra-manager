"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, CalendarIcon, Truck, Warehouse, CreditCard, Info, PackageCheck, DollarSign, Barcode } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PurchaseOrder, OrderItem, Contact } from '@/lib/types';
import { format, addDays, parseISO } from 'date-fns';
import { useMasterData } from '@/hooks/use-master-data';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

// Definición de Props actualizada
interface NewPurchaseOrderSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (order: PurchaseOrder) => void;
  order: PurchaseOrder | null;
  suppliers: Contact[];
  inventory?: any[]; // Opcional por ahora
  nextOrderId?: string;
  purchaseOrders?: PurchaseOrder[];
}

type PurchaseOrderFormData = Omit<PurchaseOrder, 'id' | 'totalPackages' | 'totalKilos' | 'totalAmount'>;

const getInitialFormData = (order: PurchaseOrder | null): PurchaseOrderFormData => {
    if (order) {
        return {
            ...order,
            date: format(new Date(order.date), 'yyyy-MM-dd'),
            advanceDueDate: order.advanceDueDate ? format(new Date(order.advanceDueDate), 'yyyy-MM-dd') : undefined,
            balanceDueDate: order.balanceDueDate ? format(new Date(order.balanceDueDate), 'yyyy-MM-dd') : undefined,
            status: order.status,
        };
    }
    return {
        supplierId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        items: [],
        status: 'received', // Por defecto recibida para que sume stock
        paymentMethod: 'Contado',
        creditDays: 0,
        advancePercentage: 0,
        warehouse: 'Principal', // Default
        notes: '',
    };
};

export function NewPurchaseOrderSheet({ 
    isOpen, onOpenChange, onSave, order, suppliers 
}: NewPurchaseOrderSheetProps) {
  
  const [formData, setFormData] = useState<PurchaseOrderFormData>(() => getInitialFormData(order));
  const [includeVat, setIncludeVat] = useState(false); // IVA desactivado por defecto en compras fruta
  
  // Usamos useMasterData para llenar los selectores
  const { products, calibers, packagingTypes, warehouses } = useMasterData();
  const { toast } = useToast();

  // --- CÁLCULOS DE TOTALES ---
  const grossTotal = useMemo(() => {
    return formData.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0);
  }, [formData.items]);
  
  const { netTotal, vatAmount, finalTotal } = useMemo(() => {
      const net = grossTotal; 
      if (includeVat) {
          const vat = net * 0.19;
          const total = net + vat;
          return { netTotal: net, vatAmount: vat, finalTotal: total };
      }
      return { netTotal: net, vatAmount: 0, finalTotal: net };
  }, [grossTotal, includeVat]);

  const advanceAmount = useMemo(() => {
    if (formData.paymentMethod !== 'Pago con Anticipo y Saldo' || !formData.advancePercentage) return 0;
    return finalTotal * (formData.advancePercentage / 100);
  }, [finalTotal, formData.paymentMethod, formData.advancePercentage]);

  const balanceAmount = useMemo(() => {
     if (formData.paymentMethod !== 'Pago con Anticipo y Saldo') return 0;
     return finalTotal - advanceAmount;
  }, [finalTotal, advanceAmount, formData.paymentMethod]);

  // --- EFECTOS ---
  useEffect(() => {
    if (isOpen) {
        setFormData(getInitialFormData(order));
    }
  }, [isOpen, order]);

  // --- HANDLERS ---
  
  // Agregar un ítem vacío
  const addNewItem = () => {
      setFormData(prev => ({
          ...prev,
          items: [
              ...prev.items,
              {
                  product: '',
                  caliber: '',
                  quantity: 0,
                  price: 0,
                  total: 0,
                  unit: 'Kilos',
                  packagingQuantity: 0,
                  packagingType: ''
              }
          ]
      }));
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };
    
    // @ts-ignore
    item[field] = value;
    
    // Recalcular total del item
    if (field === 'quantity' || field === 'price') {
        item.total = (Number(item.quantity) || 0) * (Number(item.price) || 0);
    }

    newItems[index] = item;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({...prev, items: prev.items.filter((_, i) => i !== index)}));
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: ['advancePercentage', 'creditDays'].includes(name) ? Number(value) : value }));
  };

  const handleSelectChange = (name: string, value: any) => {
      setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.date) return toast({ variant: 'destructive', title: 'Error', description: 'Seleccione una fecha.' });
    if (!formData.supplierId) return toast({ variant: 'destructive', title: 'Error', description: 'Seleccione un proveedor.' });
    if (formData.items.length === 0) return toast({ variant: 'destructive', title: 'Error', description: 'Agregue al menos un ítem.' });
    
    const calculatedTotalPackages = formData.items.reduce((sum, item) => sum + (item.packagingQuantity || 0), 0);
    const calculatedTotalKilos = formData.items.reduce((sum, item) => sum + (item.quantity || 0), 0);

    const finalOrder: PurchaseOrder = {
        id: order ? order.id : '', // ID se genera en la página principal al guardar si es nuevo
        supplierId: formData.supplierId,
        date: formData.date,
        items: formData.items,
        totalPackages: calculatedTotalPackages,
        totalKilos: calculatedTotalKilos,
        totalAmount: finalTotal,
        status: formData.status,
        paymentMethod: formData.paymentMethod,
        warehouse: formData.warehouse,
        // @ts-ignore
        notes: formData.notes || '',
        creditDays: Number(formData.creditDays || 0),
        advancePercentage: Number(formData.advancePercentage || 0),
        includeVat: includeVat
    };

    onSave(finalOrder);
  };

  // --- RENDER HELPERS ---
  const darkInputClass = "bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500 placeholder:text-slate-600 h-8";
  const darkCardClass = "bg-slate-900 border-slate-800 shadow-sm";
  const labelClass = "text-xs font-medium text-slate-400 uppercase tracking-wide";

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-5xl w-[95vw] overflow-y-auto p-0 flex flex-col gap-0 bg-slate-950 border-l-slate-800 text-slate-100">
        
        <SheetHeader className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-10">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600/20 p-2.5 rounded-xl border border-blue-600/30">
                        <PackageCheck className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                        <SheetTitle className="text-xl font-bold text-slate-100 tracking-tight">{order ? 'Editar Compra' : 'Nueva Orden de Compra'}</SheetTitle>
                        <SheetDescription className="text-xs text-slate-400 font-mono mt-0.5">
                            Recepción de Fruta / Insumos
                        </SheetDescription>
                    </div>
                </div>
            </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">
            
            {/* CABECERA DEL FORMULARIO */}
            <div className="grid md:grid-cols-3 gap-5">
              <Card className={darkCardClass}>
                  <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                          <Truck className="h-4 w-4 text-blue-500" /> Proveedor
                      </div>
                      <Select required onValueChange={(value) => handleSelectChange('supplierId', value)} value={formData.supplierId}>
                          <SelectTrigger className={darkInputClass}><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                              {suppliers.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                          </SelectContent>
                      </Select>
                  </CardContent>
              </Card>

              <Card className={darkCardClass}>
                  <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                          <CalendarIcon className="h-4 w-4 text-orange-500" /> Fecha Recepción
                      </div>
                      <Input type="date" name="date" value={formData.date} onChange={handleInputChange} className={`${darkInputClass} [color-scheme:dark]`} required />
                  </CardContent>
              </Card>

              <Card className={darkCardClass}>
                  <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                          <Warehouse className="h-4 w-4 text-emerald-500" /> Bodega Destino
                      </div>
                      <Select required onValueChange={(v) => handleSelectChange('warehouse', v)} value={formData.warehouse}>
                          <SelectTrigger className={darkInputClass}><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                              {warehouses.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                              {/* Fallback si no hay bodegas configuradas */}
                              {warehouses.length === 0 && <SelectItem value="Principal">Principal</SelectItem>}
                          </SelectContent>
                      </Select>
                  </CardContent>
              </Card>
            </div>

            {/* LISTA DE PRODUCTOS (TABLA EDITABLE) */}
            <div className={`rounded-xl border border-slate-800 overflow-hidden ${darkCardClass}`}>
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                  <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-400" /> Detalle de Recepción
                  </h3>
                  <Button type="button" onClick={addNewItem} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border-none">
                      <Plus className="mr-2 h-3 w-3" /> Agregar Fila
                  </Button>
              </div>

              <div className="p-0 overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-400 uppercase bg-slate-950 border-b border-slate-800">
                          <tr>
                              <th className="px-4 py-3 font-semibold w-[200px]">Producto</th>
                              <th className="px-4 py-3 font-semibold w-[120px]">Calibre</th>
                              <th className="px-4 py-3 font-semibold w-[120px]">Lote</th>
                              <th className="px-4 py-3 font-semibold w-[100px] text-center">Kilos</th>
                              <th className="px-4 py-3 font-semibold w-[100px] text-right">Precio</th>
                              <th className="px-4 py-3 font-semibold w-[120px] text-right">Total</th>
                              <th className="px-4 py-3 w-[50px]"></th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                          {formData.items.map((item, index) => (
                              <tr key={index} className="hover:bg-slate-800/50 transition-colors group">
                                  <td className="px-4 py-2">
                                      {/* Selector de Productos Dinámico */}
                                      <Select 
                                          value={item.product} 
                                          onValueChange={(v) => handleItemChange(index, 'product', v)}
                                      >
                                          <SelectTrigger className="h-8 border-none bg-transparent p-0 text-slate-200 focus:ring-0"><SelectValue placeholder="Selec..." /></SelectTrigger>
                                          <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                              {products.length > 0 
                                                ? products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)
                                                : <SelectItem value="Cerezas">Cerezas (Default)</SelectItem>
                                              }
                                          </SelectContent>
                                      </Select>
                                  </td>
                                  <td className="px-4 py-2">
                                      <Select 
                                          value={item.caliber} 
                                          onValueChange={(v) => handleItemChange(index, 'caliber', v)}
                                      >
                                          <SelectTrigger className="h-8 border-none bg-transparent p-0 text-slate-400 focus:ring-0"><SelectValue placeholder="Selec..." /></SelectTrigger>
                                          <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                              {calibers.length > 0 
                                                ? calibers.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)
                                                : <SelectItem value="Jumbo">Jumbo (Default)</SelectItem>
                                              }
                                          </SelectContent>
                                      </Select>
                                  </td>
                                  <td className="px-4 py-2">
                                      <Input 
                                          value={item.lotNumber || ''} 
                                          onChange={(e) => handleItemChange(index, 'lotNumber', e.target.value)}
                                          className="h-7 bg-transparent border-none text-slate-300 uppercase placeholder:text-slate-700 text-xs" 
                                          placeholder="LOTE-001"
                                      />
                                  </td>
                                  <td className="px-4 py-2">
                                      <Input 
                                          type="number" 
                                          value={item.quantity || ''} 
                                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                          className="h-7 text-center font-bold bg-transparent border-none text-slate-100" 
                                          placeholder="0"
                                      />
                                  </td>
                                  <td className="px-4 py-2">
                                      <Input 
                                          type="number" 
                                          value={item.price || ''} 
                                          onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                          className="h-7 text-right font-mono text-blue-400 bg-transparent border-none" 
                                          placeholder="$"
                                      />
                                  </td>
                                  <td className="px-4 py-2 text-right font-mono text-slate-300">
                                      {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(item.total)}
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-7 w-7 text-slate-500 hover:text-red-400">
                                          <Trash2 className="h-4 w-4" />
                                      </Button>
                                  </td>
                              </tr>
                          ))}
                          {formData.items.length === 0 && (
                              <tr>
                                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 italic">
                                      No hay items. Agrega una fila para comenzar.
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
            </div>

            {/* TOTALES */}
            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Switch id="vat" checked={includeVat} onCheckedChange={setIncludeVat} />
                            <Label htmlFor="vat" className="text-slate-400 text-xs uppercase">Aplicar IVA</Label>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase mb-1">Total a Pagar</p>
                        <p className="text-2xl font-bold text-white">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(finalTotal)}</p>
                    </div>
                </CardContent>
            </Card>

          </div>

          <SheetFooter className="sticky bottom-0 bg-slate-900 border-t border-slate-800 p-4 sm:justify-end z-10">
            <SheetClose asChild><Button variant="ghost" className="mr-2 text-slate-400 hover:text-slate-100">Cancelar</Button></SheetClose>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-8" disabled={formData.items.length === 0}>
                Guardar Compra
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}