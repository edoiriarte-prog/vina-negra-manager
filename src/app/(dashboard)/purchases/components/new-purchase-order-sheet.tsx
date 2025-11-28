"use client";

import { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PurchaseOrder, OrderItem, Contact } from '@/lib/types';
import { useMasterData } from '@/hooks/use-master-data';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ItemMatrixDialog } from './item-matrix-dialog';
import { PackageCheck, CalendarIcon, Truck, CreditCard, Grid3X3, DollarSign, Warehouse, Plus, Trash2 } from 'lucide-react';

interface NewPurchaseOrderSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (order: PurchaseOrder) => void;
  order: PurchaseOrder | null;
  suppliers: Contact[];
}

export function NewPurchaseOrderSheet({ isOpen, onOpenChange, onSave, order, suppliers }: NewPurchaseOrderSheetProps) {
  const { warehouses, products, calibers, packagingTypes } = useMasterData();
  const { toast } = useToast();
  
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [includeVat, setIncludeVat] = useState(false);
  
  const [formData, setFormData] = useState<Partial<PurchaseOrder>>({
    supplierId: "",
    warehouse: "Principal",
    date: new Date().toISOString().split('T')[0],
    status: "received",
    items: [],
    paymentMethod: "Contado",
    creditDays: 0,
    notes: ""
  });

  useEffect(() => {
    if (isOpen) {
        if (order) {
            setFormData({ ...order });
            setIncludeVat(order.includeVat || false);
        } else {
            setFormData({
                supplierId: "",
                warehouse: "Principal",
                date: new Date().toISOString().split('T')[0],
                status: "received",
                items: [],
                paymentMethod: "Contado",
                creditDays: 0,
                notes: ""
            });
            setIncludeVat(false);
        }
    }
  }, [isOpen, order]);

  // Cálculos
  const subtotal = (formData.items || []).reduce((sum, item) => sum + (item.total || 0), 0);
  const totalVat = includeVat ? Math.round(subtotal * 0.19) : 0;
  const totalFinal = subtotal + totalVat;

  // --- HANDLERS ---

  const handleSelectChange = (key: string, value: string) => {
      setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleInputChange = (key: string, value: string | number) => {
      setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
      const newItems = [...(formData.items || [])];
      const item = { ...newItems[index], [field]: value };
      
      // Recalcular total línea
      item.total = (Number(item.quantity) || 0) * (Number(item.price) || 0);
      
      newItems[index] = item;
      setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleDeleteItem = (index: number) => {
      const newItems = (formData.items || []).filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleMatrixImport = (newItems: any[]) => {
      setFormData(prev => ({
          ...prev,
          items: [...(prev.items || []), ...newItems]
      }));
  };

  // Agregar fila manual vacía
  const addManualRow = () => {
      setFormData(prev => ({
          ...prev,
          items: [...(prev.items || []), {
              product: products[0] || '',
              caliber: calibers[0]?.name || '',
              quantity: 0,
              packagingQuantity: 0,
              packagingType: packagingTypes[0] || '',
              price: 0,
              total: 0,
              unit: 'Kilos'
          }]
      }));
  }

  const handleSubmit = () => {
    if (!formData.supplierId || !formData.date) {
        toast({ variant: "destructive", title: "Falta información", description: "Proveedor y Fecha son obligatorios." });
        return;
    }
    
    const finalOrder = {
        ...formData,
        totalAmount: totalFinal,
        includeVat,
        items: formData.items?.map(i => ({
            ...i,
            quantity: Number(i.quantity),
            packagingQuantity: Number(i.packagingQuantity),
            price: Number(i.price),
            total: Number(i.quantity) * Number(i.price)
        }))
    } as PurchaseOrder;

    onSave(finalOrder);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-5xl bg-slate-950 border-l-slate-800 text-slate-100 overflow-y-auto p-0 flex flex-col">
            
            {/* HEADER CORREGIDO: SheetHeader contiene explícitamente SheetTitle */}
            <SheetHeader className="px-8 py-6 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/50">
                            <PackageCheck className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-left">
                            <SheetTitle className="text-xl font-bold text-white">
                                {order ? `Editar OC-${order.id}` : "Nueva Compra"}
                            </SheetTitle>
                            <SheetDescription className="text-sm text-slate-400">
                                Recepción de Fruta / Insumos
                            </SheetDescription>
                        </div>
                    </div>
                    <div className="bg-slate-950 px-4 py-1 rounded-full border border-slate-800 text-xs font-mono text-slate-500">
                        {order?.status || "PENDING"}
                    </div>
                </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-12 gap-8">
                {/* COLUMNA IZQUIERDA (DATOS Y TABLA) */}
                <div className="col-span-8 space-y-8">
                    {/* Inputs Superiores */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-blue-400 font-bold uppercase flex items-center gap-2"><Truck className="h-3 w-3"/> Proveedor</Label>
                            <Select value={formData.supplierId} onValueChange={(v) => handleSelectChange('supplierId', v)}>
                                <SelectTrigger className="bg-slate-900 border-slate-800 h-10"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-blue-400 font-bold uppercase flex items-center gap-2"><CalendarIcon className="h-3 w-3"/> Fecha Emisión</Label>
                            <Input type="date" value={formData.date} onChange={e => handleInputChange('date', e.target.value)} className="bg-slate-900 border-slate-800 h-10 [color-scheme:dark]" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-blue-400 font-bold uppercase flex items-center gap-2"><Warehouse className="h-3 w-3"/> Bodega Destino</Label>
                            <Select value={formData.warehouse} onValueChange={(v) => handleSelectChange('warehouse', v)}>
                                <SelectTrigger className="bg-slate-900 border-slate-800 h-10"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                    {warehouses.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                                    <SelectItem value="Principal">Principal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Área de Items */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                            <h3 className="font-semibold text-slate-200">Detalle de Productos</h3>
                            <div className="flex gap-2">
                                <Button onClick={addManualRow} variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                                    <Plus className="mr-2 h-4 w-4" /> Fila Manual
                                </Button>
                                <Button onClick={() => setIsMatrixOpen(true)} variant="outline" size="sm" className="border-blue-500/50 text-blue-400 hover:bg-blue-950/50">
                                    <Grid3X3 className="mr-2 h-4 w-4" /> Carga por Matriz
                                </Button>
                            </div>
                        </div>

                        {(!formData.items || formData.items.length === 0) ? (
                            <div className="h-40 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-500 bg-slate-900/30">
                                <PackageCheck className="h-8 w-8 mb-2 opacity-50"/>
                                <p>No hay productos agregados</p>
                                <p className="text-xs">Use el botón de "Carga Masiva" para comenzar.</p>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-slate-800 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-900 text-xs text-slate-400 uppercase font-bold">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Producto</th>
                                            <th className="px-4 py-3 text-left">Calibre</th>
                                            <th className="px-4 py-3 text-right">Kilos</th>
                                            <th className="px-4 py-3 text-right">Precio</th>
                                            <th className="px-4 py-3 text-right">Total</th>
                                            <th className="w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                                        {formData.items.map((item, idx) => (
                                            <tr key={idx} className="group hover:bg-slate-800/50 transition-colors">
                                                <td className="px-4 py-2 font-medium text-white">
                                                    <Select value={item.product} onValueChange={(v) => handleItemChange(idx, 'product', v)}>
                                                        <SelectTrigger className="h-7 border-none bg-transparent p-0 text-slate-200"><SelectValue /></SelectTrigger>
                                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                                            {products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="px-4 py-2 text-slate-400">
                                                     <Select value={item.caliber} onValueChange={(v) => handleItemChange(idx, 'caliber', v)}>
                                                        <SelectTrigger className="h-7 border-none bg-transparent p-0 text-slate-400"><SelectValue /></SelectTrigger>
                                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                                            {calibers.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="px-4 py-2 text-right font-mono text-emerald-400">
                                                    <Input 
                                                        type="number" 
                                                        value={item.quantity} 
                                                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} 
                                                        className="h-7 w-20 text-right bg-transparent border-none text-emerald-400 font-bold p-0" 
                                                    />
                                                </td>
                                                <td className="px-4 py-2 text-right font-mono text-slate-300">
                                                    <Input 
                                                        type="number" 
                                                        value={item.price} 
                                                        onChange={(e) => handleItemChange(idx, 'price', e.target.value)} 
                                                        className="h-7 w-20 text-right bg-transparent border-none text-blue-400 p-0" 
                                                    />
                                                </td>
                                                <td className="px-4 py-2 text-right font-mono font-bold text-white">
                                                    ${new Intl.NumberFormat('es-CL').format(item.total)}
                                                </td>
                                                <td className="px-2 text-center">
                                                    <button onClick={() => handleDeleteItem(idx)} className="text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Condiciones Comerciales */}
                    <div className="space-y-3 pt-4 border-t border-slate-800">
                        <h4 className="text-sm font-semibold text-slate-400 flex items-center gap-2"><CreditCard className="h-4 w-4"/> Condiciones Comerciales</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-[10px] text-slate-500 uppercase mb-1 block">Método de Pago</Label>
                                <Select value={formData.paymentMethod} onValueChange={v => setFormData({...formData, paymentMethod: v})}>
                                    <SelectTrigger className="bg-slate-900 border-slate-800 h-9"><SelectValue/></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                        <SelectItem value="Contado">Contado</SelectItem>
                                        <SelectItem value="Crédito">Crédito</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2">
                                <Label className="text-[10px] text-slate-500 uppercase mb-1 block">Notas / Observaciones</Label>
                                <Textarea 
                                    value={formData.notes || ''} 
                                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                                    className="bg-slate-900 border-slate-800 min-h-[60px] resize-none text-sm"
                                    placeholder="Instrucciones especiales para recepción..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA (TOTALES) */}
                <div className="col-span-4">
                    <div className="sticky top-6 space-y-6">
                        <Card className="bg-slate-900 border-slate-800">
                            <div className="h-1 w-full bg-emerald-500 rounded-t-xl"></div>
                            <CardContent className="p-6 space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                                    <h3 className="font-bold text-white flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-500"/> Totales</h3>
                                    <div className="flex items-center gap-2">
                                        <Switch id="vat" checked={includeVat} onCheckedChange={setIncludeVat} />
                                        <Label htmlFor="vat" className="text-[10px] uppercase font-bold text-slate-500 cursor-pointer">Ver con IVA</Label>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between text-slate-400">
                                        <span>Subtotal Neto</span>
                                        <span className="font-mono text-white">${new Intl.NumberFormat('es-CL').format(subtotal)}</span>
                                    </div>
                                    {includeVat && (
                                        <div className="flex justify-between text-slate-400">
                                            <span>IVA (19%)</span>
                                            <span className="font-mono text-white">${new Intl.NumberFormat('es-CL').format(totalVat)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 mt-2 border-t border-slate-800">
                                    <div className="flex justify-between items-end bg-slate-950 p-3 rounded-lg border border-slate-800">
                                        <span className="text-xs font-bold text-slate-500 uppercase">TOTAL A PAGAR</span>
                                        <span className="text-2xl font-bold text-white tracking-tighter">${new Intl.NumberFormat('es-CL').format(totalFinal)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex flex-col gap-3">
                            <Button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 text-lg shadow-lg shadow-blue-900/20">
                                Guardar Orden
                            </Button>
                            <SheetClose asChild>
                                <Button variant="ghost" className="w-full text-slate-500 hover:text-white">Cancelar</Button>
                            </SheetClose>
                        </div>
                    </div>
                </div>
            </div>
        </SheetContent>
      </Sheet>
      
      {/* COMPONENTE MATRIZ */}
      <ItemMatrixDialog 
          isOpen={isMatrixOpen} 
          onOpenChange={setIsMatrixOpen} 
          onSave={handleMatrixImport} 
      />
    </>
  );
}