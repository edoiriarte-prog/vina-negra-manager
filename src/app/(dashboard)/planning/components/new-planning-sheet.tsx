"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, Users, Info, DollarSign, CalendarIcon, Package, Loader2 } from "lucide-react";
import { 
  PlannedOrder, 
  Contact, 
  InventoryItem, 
  OrderItem,
} from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useMasterData } from "@/hooks/use-master-data";
import { ItemMatrixDialog } from "@/components/item-matrix-dialog";
import { format } from 'date-fns';
import QuickContactDialog from "@/components/contacts/quick-contact-dialog";

interface NewPlanningSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (orderData: Partial<Omit<PlannedOrder, 'id'>>) => Promise<void>;
  order: PlannedOrder | null;
  clients: Contact[];
  inventory: InventoryItem[]; 
}

const getInitialFormData = (order: PlannedOrder | null): Partial<Omit<PlannedOrder, 'id'>> => {
    if (order) {
        return {
            ...order,
            deliveryDate: order.deliveryDate ? format(new Date(order.deliveryDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            items: (order.items || []).map(item => ({...item, total: (item.quantity || 0) * (item.price || 0)})),
        };
    }
    
    return {
        clientId: "",
        deliveryDate: format(new Date(), 'yyyy-MM-dd'),
        items: [],
        status: 'borrador',
        notes: '',
    };
};

export function NewPlanningSheet({
  isOpen,
  onOpenChange,
  onSave,
  order,
  clients,
  inventory,
}: NewPlanningSheetProps) {
  
  const { toast } = useToast();
  const { products, calibers } = useMasterData();

  const [formData, setFormData] = useState(() => getInitialFormData(order));
  const [items, setItems] = useState<OrderItem[]>(order?.items || []);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuickContactOpen, setIsQuickContactOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
        const initialData = getInitialFormData(order);
        setFormData(initialData);
        setItems(initialData.items || []);
        setIsSubmitting(false);
    }
  }, [order, isOpen]);

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
  
  const handleQuickContactSuccess = (newId: string) => {
    setFormData(prev => ({ ...prev, clientId: newId }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!formData.clientId) {
        toast({ variant: "destructive", title: "Falta Cliente", description: "Selecciona un cliente." });
        return;
    }
    if (items.length === 0) {
        toast({ variant: "destructive", title: "Orden Vacía", description: "Agrega al menos un producto." });
        return;
    }
    
    const finalOrderData = {
        ...formData,
        items: items,
    };

    try {
        setIsSubmitting(true);
        await onSave(finalOrderData);
        onOpenChange(false);
    } catch (error) {
        console.error("Error al guardar desde el sheet:", error);
    } finally {
        setIsSubmitting(false);
    }
  };

  const netTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.total || 0), 0);
  }, [items]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val || 0);

  const title = order ? `Editar Planificación` : `Nuevo Pedido Planificado`;
  const darkInputClass = "bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500 placeholder:text-slate-600";
  const darkCardClass = "bg-slate-900 border-slate-800 shadow-sm";
  const labelClass = "text-xs font-medium text-slate-400 uppercase tracking-wide";
  
  if (!formData) return null;

  return (
    <>
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-4xl w-[95vw] overflow-y-auto p-0 flex flex-col gap-0 bg-slate-950 border-l-slate-800 text-slate-100">
        <SheetHeader className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-10">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-600/20 p-2.5 rounded-xl border border-indigo-600/30">
                        <Calendar className="h-6 w-6 text-indigo-400" />
                    </div>
                    <div>
                        <SheetTitle className="text-xl font-bold text-slate-100 tracking-tight">{title}</SheetTitle>
                    </div>
                </div>
            </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-8">
            
            <div className="grid md:grid-cols-2 gap-5">
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

                <Card className={darkCardClass}>
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                            <CalendarIcon className="h-4 w-4 text-orange-500" /> Fecha de Entrega
                        </div>
                        <Input type="date" name="deliveryDate" value={formData.deliveryDate} onChange={handleInputChange} className={`${darkInputClass} [color-scheme:dark]`} required />
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
                            <Package className="h-12 w-12 mb-3 opacity-20" />
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
                                                <Input type="number" value={item.price || ''} onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))} className="h-7 text-right font-mono text-blue-400 bg-slate-950 border-slate-700 focus:border-blue-500 w-32" />
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
            
             <div className="grid md:grid-cols-2 gap-6 items-start">
                 <div>
                     <Label className={labelClass}>Notas / Observaciones</Label>
                     <Textarea name="notes" value={formData.notes || ''} onChange={handleInputChange} className="min-h-[100px] resize-none bg-slate-950 border-slate-800 text-slate-300 focus:border-slate-600" placeholder="Detalles o requerimientos especiales del pedido..." />
                 </div>
                 <div className="space-y-4">
                     <h4 className="font-semibold text-slate-100 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-500" /> Totales Estimados
                    </h4>
                    <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 flex justify-between items-end">
                        <span className="text-sm text-slate-400 font-medium uppercase tracking-wider mb-1">Total Neto Estimado</span>
                        <span className="text-2xl font-bold text-white tracking-tight">{formatCurrency(netTotal)}</span>
                    </div>
                 </div>
            </div>

            </div>

            <SheetFooter className="sticky bottom-0 bg-slate-900 border-t border-slate-800 p-4 sm:justify-end z-10 shadow-[0_-5px_10px_rgba(0,0,0,0.2)]">
              <SheetClose asChild><Button variant="ghost" className="mr-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800">Cancelar</Button></SheetClose>
              <Button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 shadow-lg shadow-indigo-900/20 font-semibold disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={items.length === 0 || isSubmitting}
              >
                  {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                    </>
                  ) : (
                    order ? 'Guardar Cambios' : 'Crear Planificación'
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
