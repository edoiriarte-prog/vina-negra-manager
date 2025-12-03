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
import { PurchaseOrder, OrderItem, Contact, InventoryItem } from '@/lib/types';
import { format, addDays, parseISO } from 'date-fns';
import { useMasterData } from '@/hooks/use-master-data';
import { Card, CardContent } from '@/components/ui/card';
import { ItemMatrixDialog } from '@/components/item-matrix-dialog';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

type NewPurchaseOrderSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (order: PurchaseOrder) => void;
  order: PurchaseOrder | null;
  suppliers: Contact[];
  inventory: InventoryItem[];
  nextOrderId: string;
  purchaseOrders: PurchaseOrder[];
};

type PurchaseOrderFormData = Omit<PurchaseOrder, 'id' | 'totalPackages' | 'totalKilos' | 'totalAmount' | 'status'> & {
    status: any; 
};

const getInitialFormData = (order: PurchaseOrder | null): PurchaseOrderFormData => {
    if (order) {
        return {
            ...order,
            date: format(new Date(order.date), 'yyyy-MM-dd'),
            advanceDueDate: order.advanceDueDate ? format(new Date(order.advanceDueDate), 'yyyy-MM-dd') : undefined,
            balanceDueDate: order.balanceDueDate ? format(new Date(order.balanceDueDate), 'yyyy-MM-dd') : undefined,
            status: order.status,
            notes: order.notes || '',
        };
    }
    return {
        supplierId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        items: [],
        status: 'pending',
        paymentMethod: 'Contado',
        creditDays: 0,
        advancePercentage: 0,
        advanceDueDate: undefined,
        balanceDueDate: undefined,
        warehouse: 'Bodega Central',
        orderType: 'purchase',
        notes: '',
        number: '', 
    };
};

export function NewPurchaseOrderSheet({ 
    isOpen, onOpenChange, onSave, order, suppliers, inventory, purchaseOrders 
}: NewPurchaseOrderSheetProps) {
  
  const [formData, setFormData] = useState<PurchaseOrderFormData>(() => getInitialFormData(order));
  const [includeVat, setIncludeVat] = useState(true); 
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [nextIdDisplay, setNextIdDisplay] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);

  const { products, calibers, packagingTypes, warehouses } = useMasterData();
  const { toast } = useToast();

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

  // Lógica ID (Base 1100)
  useEffect(() => {
    if (isOpen) {
        if (!hasInitialized) {
            if (!order) {
                const existingIds = (purchaseOrders || [])
                    .map(o => o.number ? parseInt(o.number.replace(/OC-|\D/g, ''), 10) : 0)
                    .filter(n => !isNaN(n) && n > 0);
                
                const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 1101;
                const nextNum = maxId < 1101 ? 1102 : maxId + 1;
                const newId = `OC-${nextNum}`;
                
                setNextIdDisplay(newId);
                setFormData(prev => ({...getInitialFormData(null), number: newId}));
                setIncludeVat(true); 
            } else {
                setNextIdDisplay(order.number || order.id);
                setFormData(getInitialFormData(order));
                setIncludeVat(true); 
            }
            setHasInitialized(true);
        }
    } else {
        setHasInitialized(false);
    }
  }, [isOpen, order, hasInitialized, purchaseOrders]);

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };
    (item[field] as any) = value; 
    newItems[index] = item;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleSelectChange = (name: string, value: any) => {
    if (name.startsWith('items.')) {
        const [_, indexStr, field] = name.split('.');
        const index = parseInt(indexStr);
        handleItemChange(index, field as keyof OrderItem, value);
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
        setFormData((prev) => ({ ...prev, [name]: ['advancePercentage', 'creditDays'].includes(name) ? Number(value) : value }));
    }
  };

  useEffect(() => {
      if (formData.paymentMethod === 'Crédito' && formData.creditDays && formData.creditDays > 0 && formData.date) {
          const dueDate = addDays(parseISO(formData.date), formData.creditDays);
          setFormData(prev => ({...prev, balanceDueDate: format(dueDate, 'yyyy-MM-dd')}))
      }
  }, [formData.creditDays, formData.date, formData.paymentMethod]);

  const removeItem = (index: number) => {
    setFormData(prev => ({...prev, items: prev.items.filter((_, i) => i !== index)}));
  }

  const handleMatrixSave = (matrixItems: Omit<OrderItem, 'id'>[]) => {
    const newItems: OrderItem[] = matrixItems.map(item => ({
        ...item,
        id: `temp-${Date.now()}-${Math.random()}`,
    }));
    setFormData(prev => ({...prev, items: [...prev.items, ...newItems]}));
    setIsMatrixOpen(false);
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.date) return toast({ variant: 'destructive', title: 'Error', description: 'Seleccione una fecha.' });
    if (!formData.supplierId) return toast({ variant: 'destructive', title: 'Error', description: 'Seleccione un proveedor.' });
    if (formData.items.length === 0) return toast({ variant: 'destructive', title: 'Error', description: 'Agregue al menos un ítem.' });
    
    // CORRECCIÓN ITEMS: Usamos null en lugar de undefined
    const sanitizedItems = formData.items.map(item => ({
        ...item,
        packagingType: item.packagingType || null,
        packagingQuantity: Number(item.packagingQuantity) || 0,
        lotNumber: item.lotNumber || null,
        quantity: Number(item.quantity) || 0,
        price: Number(item.price) || 0,
    }));

    const calculatedTotalPackages = sanitizedItems.reduce((sum, item) => sum + (item.packagingQuantity || 0), 0);
    const calculatedTotalKilos = sanitizedItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

    const finalId = order?.id || nextIdDisplay || `OC-${Date.now()}`;

    // CORRECCIÓN OBJETO FINAL: Usamos 'any' para evitar que TS bloquee los 'null'
    // Firebase NECESITA 'null' en lugar de 'undefined'
    const finalOrder: any = {
        id: finalId,
        number: order ? order.number : nextIdDisplay,
        supplierId: formData.supplierId,
        date: formData.date,
        items: sanitizedItems,
        totalPackages: calculatedTotalPackages,
        totalKilos: calculatedTotalKilos,
        totalAmount: finalTotal,
        status: formData.status,
        paymentMethod: formData.paymentMethod,
        warehouse: formData.warehouse,
        orderType: formData.orderType || 'purchase',
        
        // AQUÍ ESTABA EL ERROR: Cambiamos undefined por null
        advanceDueDate: formData.advanceDueDate || null,
        balanceDueDate: formData.balanceDueDate || null,
        notes: formData.notes || null,
        
        creditDays: Number(formData.creditDays || 0),
        advancePercentage: Number(formData.advancePercentage || 0),
    };

    onSave(finalOrder);
  };

  const title = order ? `Editar OC ${order.number}` : `Nueva Compra`;

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
          case 'received': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
          case 'draft': return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
          case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/30';
          default: return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      }
  };

  const getStatusLabel = (status: string) => {
      switch(status) {
          case 'completed': return 'Recepcionada';
          case 'received': return 'En Tránsito';
          case 'draft': return 'Borrador';
          case 'pending': return 'Pendiente';
          case 'cancelled': return 'Anulada';
          default: return status;
      }
  };

  if (!formData) return null;

  const darkInputClass = "bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500 placeholder:text-slate-600";
  const darkCardClass = "bg-slate-900 border-slate-800 shadow-sm";
  const labelClass = "text-xs font-medium text-slate-400 uppercase tracking-wide";

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-7xl w-[95vw] overflow-y-auto p-0 flex flex-col gap-0 bg-slate-950 border-l-slate-800 text-slate-100">
          
          {/* HEADER */}
          <SheetHeader className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-10">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600/20 p-2.5 rounded-xl border border-blue-600/30">
                        <PackageCheck className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                        <SheetTitle className="text-xl font-bold text-slate-100 tracking-tight">{title}</SheetTitle>
                        <SheetDescription className="text-xs text-slate-400 font-mono mt-0.5">
                            {nextIdDisplay ? `ID: ${nextIdDisplay}` : 'Calculando ID...'}
                        </SheetDescription>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`capitalize border-slate-700 ${getStatusColor(formData.status)}`}>
                        {getStatusLabel(formData.status)}
                    </Badge>
                </div>
            </div>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-8">
              
              {/* SECCIÓN 1: DATOS GENERALES */}
              <div className="grid md:grid-cols-3 gap-5">
                <Card className={darkCardClass}>
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                            <Truck className="h-4 w-4 text-blue-500" /> Proveedor
                        </div>
                        <Select required onValueChange={(value) => handleSelectChange('supplierId', value)} value={formData.supplierId}>
                            <SelectTrigger className={darkInputClass}><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                {suppliers?.map((s, idx) => (
                                    <SelectItem key={s.id || idx} value={s.id || `temp-${idx}`} className="focus:bg-slate-800 focus:text-slate-100">
                                        {s.name}
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
                            <Warehouse className="h-4 w-4 text-emerald-500" /> Bodega Destino
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

              {/* SECCIÓN 2: ITEMS */}
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
                    {formData.items.length === 0 ? (
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
                                        <th className="px-4 py-3 font-semibold w-[120px]">Lote</th> 
                                        <th className="px-4 py-3 font-semibold">Envase</th>
                                        <th className="px-4 py-3 text-center font-semibold">Cant.</th>
                                        <th className="px-4 py-3 text-center font-semibold">Kilos</th>
                                        <th className="px-4 py-3 text-right text-blue-400 font-semibold">P. Neto</th>
                                        <th className="px-4 py-3 text-right text-emerald-400 font-semibold">P. c/IVA</th>
                                        <th className="px-4 py-3 text-right font-semibold">Total</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                                    {formData.items.map((item, index) => {
                                        const subtotal = (item.quantity || 0) * (item.price || 0);
                                        return (
                                            <tr key={index} className="hover:bg-slate-800/50 transition-colors group">
                                                <td className="px-4 py-2">
                                                    <Select onValueChange={(v) => handleSelectChange(`items.${index}.product`, v)} value={item.product}>
                                                        <SelectTrigger className="h-8 border-none shadow-none bg-transparent p-0 font-medium text-slate-200 focus:ring-0"><SelectValue /></SelectTrigger>
                                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                                            {products?.map((p, idx) => (
                                                                <SelectItem key={p} value={p}>
                                                                    {p}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <Select onValueChange={(v) => handleSelectChange(`items.${index}.caliber`, v)} value={item.caliber}>
                                                        <SelectTrigger className="h-8 border-none shadow-none bg-transparent p-0 text-slate-400 focus:ring-0"><SelectValue /></SelectTrigger>
                                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                                            {calibers?.map((c, idx) => (
                                                                <SelectItem key={idx} value={c.name}>{c.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-1">
                                                        <Barcode className="h-3 w-3 text-slate-500" />
                                                        <Input 
                                                            value={item.lotNumber || ''} 
                                                            onChange={(e) => handleItemChange(index, 'lotNumber', e.target.value)} 
                                                            className="h-7 text-xs bg-slate-950 border-transparent group-hover:border-slate-700 focus:border-blue-500 text-slate-300 uppercase placeholder:text-slate-700" 
                                                            placeholder="LOTE-001"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <Select onValueChange={(v) => handleSelectChange(`items.${index}.packagingType`, v)} value={item.packagingType || ''}>
                                                        <SelectTrigger className="h-8 border-none shadow-none bg-transparent p-0 text-xs text-slate-400 focus:ring-0"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">{packagingTypes?.map((p, idx) => <SelectItem key={idx} value={p}>{p}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <Input type="number" value={item.packagingQuantity || ''} onChange={(e) => handleItemChange(index, 'packagingQuantity', Number(e.target.value))} className="h-7 text-center bg-slate-950 border-transparent group-hover:border-slate-700 focus:border-blue-500 text-slate-300" />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <Input type="number" value={item.quantity || ''} onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))} className="h-7 text-center font-bold bg-slate-950 border-transparent group-hover:border-slate-700 focus:border-blue-500 text-slate-100" />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <Input type="number" value={item.price || ''} onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))} className="h-7 text-right font-mono text-blue-400 bg-slate-950 border-transparent group-hover:border-slate-700 focus:border-blue-500" />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <Input type="number" value={item.price ? Math.round(item.price * 1.19) : ''} onChange={(e) => handleItemChange(index, 'price', Math.round(Number(e.target.value) / 1.19))} className="h-7 text-right font-mono text-emerald-400 bg-slate-950 border-transparent group-hover:border-slate-700 focus:border-emerald-500" />
                                                </td>
                                                <td className="px-4 py-2 text-right font-medium text-slate-300 font-mono">
                                                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(subtotal)}
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-7 w-7 text-slate-500 hover:text-red-400 hover:bg-red-950/30">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
              </div>

              {/* SECCIÓN 3: PIE DE PÁGINA */}
              <div className="grid md:grid-cols-12 gap-6 items-start">
                  
                  {/* Izquierda: Condiciones */}
                  <div className="md:col-span-7 space-y-4">
                      <Card className={darkCardClass}>
                          <CardContent className="p-5 space-y-5">
                              <div className='flex justify-between items-center border-b border-slate-800 pb-2 mb-4'>
                                  <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                                      <CreditCard className="h-4 w-4 text-indigo-400" /> Condiciones Comerciales
                                  </h4>
                                  {/* SELECTOR DE ESTADO (NUEVO) */}
                                  <Select onValueChange={(v: any) => handleSelectChange('status', v)} value={formData.status}>
                                      <SelectTrigger className="h-7 w-36 text-xs bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger>
                                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                          <SelectItem value="draft">Borrador</SelectItem>
                                          <SelectItem value="pending">Pendiente</SelectItem>
                                          <SelectItem value="received">En Tránsito</SelectItem>
                                          <SelectItem value="completed">Recepcionada</SelectItem>
                                          <SelectItem value="cancelled">Anulada</SelectItem>
                                      </SelectContent>
                                  </Select>
                              </div>

                              <div className="grid grid-cols-2 gap-5">
                                  <div className="space-y-2">
                                      <Label className={labelClass}>Método de Pago</Label>
                                      <Select onValueChange={(v: any) => handleSelectChange('paymentMethod', v)} value={formData.paymentMethod}>
                                          <SelectTrigger className={darkInputClass}><SelectValue /></SelectTrigger>
                                          <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                              <SelectItem value="Contado">Contado</SelectItem>
                                              <SelectItem value="Crédito">Crédito</SelectItem>
                                              <SelectItem value="Pago con Anticipo y Saldo">Anticipo + Saldo</SelectItem>
                                          </SelectContent>
                                      </Select>
                                  </div>
                                  
                                  {(formData.paymentMethod === 'Crédito' || formData.paymentMethod === 'Pago con Anticipo y Saldo') && (
                                      <div className="space-y-2">
                                          <Label className={labelClass}>Días Crédito / Vencimiento</Label>
                                          <div className="flex gap-2">
                                              <Input type="number" placeholder="Días" value={formData.creditDays || ''} onChange={(e) => handleSelectChange('creditDays', Number(e.target.value))} className={`${darkInputClass} w-20 text-center`} />
                                              <Input type="date" className={`${darkInputClass} flex-1 [color-scheme:dark]`} value={formData.balanceDueDate || ''} onChange={(e) => handleSelectChange('balanceDueDate', e.target.value)} />
                                          </div>
                                      </div>
                                  )}
                              </div>

                              {formData.paymentMethod === 'Pago con Anticipo y Saldo' && (
                                  <div className="grid grid-cols-2 gap-4 bg-blue-950/30 p-3 rounded-lg border border-blue-900/50">
                                      <div className="space-y-1">
                                          <Label className="text-xs text-blue-400">% Anticipo</Label>
                                          <Input type="number" value={formData.advancePercentage || ''} onChange={(e) => handleSelectChange('advancePercentage', Number(e.target.value))} className="bg-slate-950 border-slate-800 h-8 text-blue-200" />
                                      </div>
                                      <div className="space-y-1">
                                          <Label className="text-xs text-blue-400">Fecha Anticipo</Label>
                                          <Input type="date" value={formData.advanceDueDate || ''} onChange={(e) => handleSelectChange('advanceDueDate', e.target.value)} className="bg-slate-950 border-slate-800 h-8 text-blue-200 [color-scheme:dark]" />
                                      </div>
                                  </div>
                              )}

                              <div className="space-y-2 pt-2">
                                  <Label className={labelClass}>Notas / Observaciones</Label>
                                  <Textarea 
                                      name="notes" 
                                      value={formData.notes || ''} 
                                      onChange={handleInputChange} 
                                      className="min-h-[80px] resize-none bg-slate-950 border-slate-800 text-slate-300 focus:border-slate-600"
                                      placeholder="Instrucciones especiales para recepción..."
                                  />
                              </div>
                          </CardContent>
                      </Card>
                  </div>

                  {/* Derecha: Resumen Financiero */}
                  <div className="md:col-span-5">
                      <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-emerald-500"></div>
                          <CardContent className="p-6 space-y-6">
                              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                                  <h4 className="font-semibold text-slate-100 flex items-center gap-2">
                                      <DollarSign className="h-4 w-4 text-emerald-500" /> Totales
                                  </h4>
                                  <div className="flex items-center gap-2 bg-slate-950/50 px-3 py-1 rounded-full border border-slate-800">
                                      <Switch id="includeVat" checked={includeVat} onCheckedChange={setIncludeVat} className="data-[state=checked]:bg-emerald-500" />
                                      <Label htmlFor="includeVat" className="text-[10px] cursor-pointer text-slate-400 uppercase font-bold">Ver con IVA</Label>
                                  </div>
                              </div>

                              <div className="space-y-4">
                                  <div className="flex justify-between text-slate-400 text-sm">
                                      <span>Subtotal Neto</span>
                                      <span className="font-mono text-slate-200">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(netTotal)}</span>
                                  </div>
                                  {includeVat && (
                                      <div className="flex justify-between text-slate-400 text-sm">
                                          <span>IVA (19%)</span>
                                          <span className="font-mono text-slate-200">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(vatAmount)}</span>
                                      </div>
                                  )}
                                  
                                  <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 flex justify-between items-end mt-2">
                                      <span className="text-sm text-slate-400 font-medium uppercase tracking-wider mb-1">Total a Pagar</span>
                                      <span className="text-2xl font-bold text-white tracking-tight">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(finalTotal)}</span>
                                  </div>
                              </div>

                              {formData.paymentMethod === 'Pago con Anticipo y Saldo' && (
                                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                                      <div className="bg-blue-950/20 border border-blue-900/30 p-2 rounded text-center">
                                          <p className="text-blue-400 mb-1 uppercase font-bold text-[10px]">Anticipo</p>
                                          <p className="font-bold text-blue-100 text-sm">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(advanceAmount)}</p>
                                      </div>
                                      <div className="bg-red-950/20 border border-red-900/30 p-2 rounded text-center">
                                          <p className="text-red-400 mb-1 uppercase font-bold text-[10px]">Saldo Final</p>
                                          <p className="font-bold text-red-100 text-sm">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(balanceAmount)}</p>
                                      </div>
                                  </div>
                              )}
                          </CardContent>
                      </Card>
                  </div>
              </div>

            </div>

            {/* FOOTER DE ACCIONES FIJO */}
            <SheetFooter className="sticky bottom-0 bg-slate-900 border-t border-slate-800 p-4 sm:justify-end z-10 shadow-[0_-5px_10px_rgba(0,0,0,0.2)]">
              <SheetClose asChild><Button variant="ghost" className="mr-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800">Cancelar</Button></SheetClose>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-8 shadow-lg shadow-blue-900/20 font-semibold" disabled={formData.items.length === 0}>
                  Guardar Orden
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <ItemMatrixDialog
        isOpen={isMatrixOpen}
        onOpenChange={setIsMatrixOpen}
        onSave={handleMatrixSave}
        orderType="purchase"
        inventory={inventory}
      />
    </>
  );
}
