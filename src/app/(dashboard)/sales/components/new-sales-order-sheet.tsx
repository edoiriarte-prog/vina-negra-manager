"use client";

import { useEffect, useMemo } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, addDays, parseISO } from 'date-fns';

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Users, Truck, Info, PackageCheck, DollarSign, CreditCard, CalendarIcon, Warehouse, Landmark, Loader2 } from "lucide-react";
import {
  SalesOrder,
  Contact,
  OrderItem,
  PurchaseOrder,
  InventoryAdjustment
} from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useMasterData } from "@/hooks/use-master-data";
import QuickContactDialog from "@/components/contacts/quick-contact-dialog";
import { cn } from "@/lib/utils";
import { LotSelectionDialog } from "./lot-selection-dialog";
import { useState } from 'react';

// --- Zod Schema for Validation ---
const orderItemSchema = z.object({
    product: z.string().min(1, "Seleccione un producto"),
    caliber: z.string().min(1, "Seleccione un calibre"),
    quantity: z.number().positive("La cantidad debe ser mayor a 0"),
    price: z.number().nonnegative("El precio no puede ser negativo"),
    lotNumber: z.string().optional(),
    packagingQuantity: z.number().optional(),
    unit: z.string().optional(),
});

const salesOrderSchema = z.object({
  clientId: z.string().min(1, "Debe seleccionar un cliente"),
  date: z.date(),
  warehouse: z.string().min(1, "Seleccione una bodega"),
  items: z.array(orderItemSchema).min(1, "Debe agregar al menos un producto."),
  number: z.string().optional(),
  status: z.string().optional(),
  includeVat: z.boolean().default(true),
  paymentMethod: z.string().optional(),
  creditDays: z.number().optional(),
  paymentDueDate: z.string().optional(),
  notes: z.string().optional(),
  saleType: z.string().optional(),
  advanceAmount: z.number().optional(),
  bankAccountId: z.string().optional(),
  driver: z.string().optional(),
  plate: z.string().optional(),
  // Nuevos campos para manejar el estado de despacho
  dispatchedDate: z.string().optional(),
});

type SalesOrderFormData = z.infer<typeof salesOrderSchema>;

// --- Component Props ---
interface NewSalesOrderSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (orderData: Omit<SalesOrder, "id">) => Promise<void>;
  order: SalesOrder | null;
  clients: Contact[];
  salesOrders?: SalesOrder[];
  purchaseOrders: PurchaseOrder[];
  inventoryAdjustments: InventoryAdjustment[];
  contacts: Contact[];
  sheetType: 'sale' | 'dispatch';
}

export function NewSalesOrderSheet({
  isOpen,
  onOpenChange,
  onSave,
  order,
  clients,
  salesOrders = [],
  purchaseOrders,
  inventoryAdjustments,
  contacts,
  sheetType,
}: NewSalesOrderSheetProps) {

  const { toast } = useToast();
  const { warehouses, bankAccounts, products, calibers, productCaliberAssociations } = useMasterData();
  const [isQuickContactOpen, setIsQuickContactOpen] = useState(false);
  const [isLotSelectionOpen, setIsLotSelectionOpen] = useState(false);
  
  const form = useForm<SalesOrderFormData>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: {
      date: new Date(),
      items: [],
      includeVat: true,
      warehouse: "Bodega Central",
      paymentMethod: "Contado",
      saleType: "Venta en Firme",
      status: 'pending',
    },
  });

  const { control, handleSubmit, register, watch, setValue, formState: { errors, isSubmitting } } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });
  
  // -- Effects to Sync Form with Props --
  useEffect(() => {
    if (isOpen) {
      if (order) {
        form.reset({
          ...order,
          date: order.date ? parseISO(order.date) : new Date(),
          items: (order.items || []).map(item => ({
            product: item.product,
            caliber: item.caliber,
            quantity: Number(item.quantity || 0),
            price: Number(item.price || 0),
            lotNumber: item.lotNumber,
            packagingQuantity: item.packagingQuantity,
            unit: item.unit
          })),
        });
      } else {
        const idPrefix = sheetType === 'dispatch' ? 'TR-' : 'OV-';
        const relevantOrders = salesOrders.filter(o => o.number?.startsWith(idPrefix));
        const existingIds = relevantOrders
          .map(o => o.number ? parseInt(o.number.replace(idPrefix, ''), 10) : 0)
          .filter(n => !isNaN(n) && n > 0);
        
        const baseId = sheetType === 'dispatch' ? 3000 : 2100;
        const maxId = existingIds.length > 0 ? Math.max(...existingIds) : baseId;
        const nextNum = maxId < baseId ? baseId + 1 : maxId + 1;
        const newId = `${idPrefix}${nextNum}`;

        form.reset({
          number: newId,
          date: new Date(),
          items: [],
          includeVat: true,
          warehouse: "Bodega Central",
          paymentMethod: "Contado",
          saleType: sheetType === 'dispatch' ? "Traslado Bodega Interna" : "Venta en Firme",
          // REQUERIMIENTO 1: Estado inicial despachado con fecha de hoy
          status: 'dispatched',
          dispatchedDate: new Date().toISOString(),
        });
      }
    }
  }, [order, isOpen, salesOrders, form, sheetType]);
  
  // -- Real-time Calculations --
  const watchedItems = watch("items");
  const includeVat = watch("includeVat");

  const { netTotal, vatAmount, finalTotal } = useMemo(() => {
    const net = (watchedItems || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
    const vat = includeVat ? net * 0.19 : 0;
    const total = net + vat;
    return { netTotal: net, vatAmount: vat, finalTotal: total };
  }, [watchedItems, includeVat]);

  // --- Handlers ---
  const handleFormSubmit = async (data: SalesOrderFormData) => {
    const totalKilos = data.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    const finalOrderData: Omit<SalesOrder, 'id'> = {
      number: data.number || '',
      clientId: data.clientId,
      date: format(data.date, 'yyyy-MM-dd'),
      // Si es una orden nueva, su estado ya viene como 'despachada' desde el `reset`.
      // Si es una edición, mantenemos el estado que ya tiene.
      status: (order?.status || data.status) as SalesOrder['status'],
      items: data.items.map(item => ({
          product: item.product,
          caliber: item.caliber,
          quantity: item.quantity,
          price: item.price,
          lotNumber: item.lotNumber,
          packagingQuantity: item.packagingQuantity,
          unit: 'Kilos'
      })),
      totalAmount: netTotal,
      totalKilos: totalKilos,
      warehouse: data.warehouse,
      includeVat: data.includeVat,
      paymentMethod: data.paymentMethod,
      creditDays: data.creditDays || 0,
      paymentDueDate: data.paymentDueDate || '',
      saleType: data.saleType,
      advanceAmount: data.advanceAmount || 0,
      bankAccountId: data.bankAccountId || '',
      driver: data.driver || '',
      plate: data.plate || '',
      notes: data.notes || '',
      dispatchedDate: order?.dispatchedDate || data.dispatchedDate, // Aseguramos que se mantenga o se asigne
    };

    try {
      await onSave(finalOrderData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error al guardar desde el sheet:", error);
    }
  };
  
  const handleAddLotItem = (item: OrderItem) => {
    append({
        product: item.product,
        caliber: item.caliber,
        quantity: item.quantity,
        price: item.price,
        lotNumber: item.lotNumber,
        packagingQuantity: item.packagingQuantity,
        unit: 'Kilos'
    });
  };

  const title = order 
    ? (sheetType === 'dispatch' ? `Editar Traspaso ${order.number}` : `Editar OV ${order.number}`)
    : (sheetType === 'dispatch' ? 'Nuevo Traspaso de Bodega' : 'Nueva Orden de Venta');
  const darkInputClass = "bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500 placeholder:text-slate-600";
  const darkCardClass = "bg-slate-900 border-slate-800 shadow-sm";
  const labelClass = "text-xs font-medium text-slate-400 uppercase tracking-wide";
  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val || 0);

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
                    {watch("number") ? `ID: ${watch("number")}` : 'Calculando ID...'}
                  </SheetDescription>
                </div>
              </div>
            </div>
          </SheetHeader>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-8">
              <div className="grid md:grid-cols-3 gap-5">
                <Card className={darkCardClass}>
                  <CardContent className="p-4 space-y-3">
                    <Label className="flex items-center justify-between text-sm font-semibold text-slate-300">
                      <span className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-500" /> Cliente</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-blue-400 hover:bg-blue-900/50" onClick={() => setIsQuickContactOpen(true)}><Plus className="h-4 w-4" /></Button>
                    </Label>
                    <Controller name="clientId" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={darkInputClass}><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                    {errors.clientId && <p className="text-red-500 text-xs">{errors.clientId.message}</p>}
                  </CardContent>
                </Card>

                <Card className={darkCardClass}>
                    <CardContent className="p-4 space-y-3">
                        <Label className="flex items-center gap-2 text-sm font-semibold text-slate-300"><CalendarIcon className="h-4 w-4 text-orange-500" /> Fecha Emisión</Label>
                        <Controller name="date" control={control} render={({ field }) => (
                           <Input type="date" value={format(field.value, 'yyyy-MM-dd')} onChange={e => field.onChange(parseISO(e.target.value))} className={`${darkInputClass} [color-scheme:dark]`} />
                        )} />
                    </CardContent>
                </Card>

                <Card className={darkCardClass}>
                    <CardContent className="p-4 space-y-3">
                        <Label className="flex items-center gap-2 text-sm font-semibold text-slate-300"><Warehouse className="h-4 w-4 text-emerald-500" /> Despacho y Logística</Label>
                         <Controller name="warehouse" control={control} render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className={darkInputClass}><SelectValue placeholder="Bodega Origen..." /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">{warehouses.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                            </Select>
                        )} />
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Input {...register("driver")} placeholder="Chofer" className={darkInputClass} />
                          <Input {...register("plate")} placeholder="Patente" className={`${darkInputClass} uppercase`} />
                        </div>
                    </CardContent>
                </Card>
              </div>
              
              <div className={cn("rounded-xl border", darkCardClass)}>
                <CardHeader className="border-b border-slate-800 py-4 px-6 flex justify-between items-center">
                  <h3 className="font-semibold text-slate-200 flex items-center gap-2"><Info className="h-4 w-4 text-blue-400" /> Detalle de Productos</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsLotSelectionOpen(true)} className="border-blue-500/30 bg-blue-950/20 text-blue-300 hover:bg-blue-900/50 hover:text-blue-200">
                    <PackageCheck className="mr-2 h-4 w-4" /> Agregar desde Lote
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="w-[25%] text-slate-400">Producto</TableHead>
                        <TableHead className="w-[15%] text-slate-400">Calibre</TableHead>
                        <TableHead className="w-[15%] text-slate-400">Lote</TableHead>
                        <TableHead className="w-[10%] text-center text-slate-400">Kilos</TableHead>
                        <TableHead className="w-[15%] text-right text-slate-400">Precio Neto</TableHead>
                        <TableHead className="w-[15%] text-right text-slate-400">Subtotal</TableHead>
                        <TableHead className="w-[5%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => {
                          const productValue = watch(`items.${index}.product`);
                          const associatedCalibers = productCaliberAssociations.find(p => p.id === productValue)?.calibers || [];

                          return (
                            <TableRow key={field.id} className="border-slate-800 hover:bg-slate-800/20 align-top">
                              <TableCell className="p-2">
                                <Controller name={`items.${index}.product`} control={control} render={({ field }) => (
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="h-9 border-slate-700 bg-slate-900"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">{products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                  </Select>
                                )}/>
                                {errors.items?.[index]?.product && <p className="text-red-500 text-xs mt-1">{errors.items[index]?.product?.message}</p>}
                              </TableCell>
                              <TableCell className="p-2">
                                 <Controller name={`items.${index}.caliber`} control={control} render={({ field }) => (
                                  <Select onValueChange={field.onChange} value={field.value} disabled={!productValue}>
                                    <SelectTrigger className="h-9 border-slate-700 bg-slate-900"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">{associatedCalibers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                  </Select>
                                )}/>
                                {errors.items?.[index]?.caliber && <p className="text-red-500 text-xs mt-1">{errors.items[index]?.caliber?.message}</p>}
                              </TableCell>
                              <TableCell className="p-2">
                                <Input {...register(`items.${index}.lotNumber`)} className={cn(darkInputClass, "h-9")} placeholder="Lote (opcional)" />
                              </TableCell>
                              <TableCell className="p-2">
                                <Controller name={`items.${index}.quantity`} control={control} render={({ field }) => (
                                  <Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className={cn(darkInputClass, "text-center h-9")} />
                                )} />
                                {errors.items?.[index]?.quantity && <p className="text-red-500 text-xs mt-1">{errors.items[index]?.quantity?.message}</p>}
                              </TableCell>
                              <TableCell className="p-2">
                                 <Controller name={`items.${index}.price`} control={control} render={({ field }) => (
                                  <Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className={cn(darkInputClass, "text-right font-mono h-9")} />
                                )} />
                                {errors.items?.[index]?.price && <p className="text-red-500 text-xs mt-1">{errors.items[index]?.price?.message}</p>}
                              </TableCell>
                              <TableCell className="p-2 text-right font-mono text-slate-300 align-middle pt-4">
                                {formatCurrency((watch(`items.${index}.quantity`) || 0) * (watch(`items.${index}.price`) || 0))}
                              </TableCell>
                              <TableCell className="p-2 text-center align-middle pt-2">
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-9 w-9 text-slate-500 hover:text-red-500 hover:bg-red-950/30"><Trash2 className="h-4 w-4" /></Button>
                              </TableCell>
                            </TableRow>
                          )
                      })}
                    </TableBody>
                  </Table>
                  {errors.items?.root && <p className="text-red-500 text-xs p-4">{errors.items.root.message}</p>}
                   <div className="p-4 border-t border-slate-800">
                     <Button type="button" variant="outline" size="sm" onClick={() => append({ product: '', caliber: '', quantity: 0, price: 0 })} className="border-slate-700 text-slate-300 hover:bg-slate-800"><Plus className="mr-2 h-4 w-4" /> Agregar Producto</Button>
                   </div>
                </CardContent>
              </div>
              
              <div className="grid md:grid-cols-12 gap-6 items-start">
                 <div className="md:col-span-7 space-y-4">
                    <Card className={darkCardClass}>
                        <CardContent className="p-5 space-y-4">
                             <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2"><CreditCard className="h-4 w-4 text-indigo-400" /> Condiciones Comerciales</h4>
                            <div className="space-y-2 pt-2">
                                <Label className={labelClass}>Notas / Observaciones</Label>
                                <Textarea {...register("notes")} className="min-h-[80px] resize-none bg-slate-950 border-slate-800 text-slate-300 focus:border-slate-600" placeholder="Instrucciones especiales para el despacho..." />
                            </div>
                        </CardContent>
                    </Card>
                 </div>
                 <div className="md:col-span-5">
                      <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl">
                          <CardContent className="p-6 space-y-4">
                              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                                  <h4 className="font-semibold text-slate-100 flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-500" /> Totales</h4>
                                  <div className="flex items-center gap-2 bg-slate-950/50 px-3 py-1 rounded-full border border-slate-800">
                                      <Controller name="includeVat" control={control} render={({ field }) => (
                                         <Switch id="includeVat" checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-emerald-500" />
                                      )} />
                                      <Label htmlFor="includeVat" className="text-[10px] cursor-pointer text-slate-400 uppercase font-bold">Ver con IVA</Label>
                                  </div>
                              </div>
                              <div className="space-y-3">
                                  <div className="flex justify-between text-slate-400 text-sm">
                                      <span>Subtotal Neto</span>
                                      <span className="font-mono text-slate-200">{formatCurrency(netTotal)}</span>
                                  </div>
                                  {includeVat && (
                                      <div className="flex justify-between text-slate-400 text-sm">
                                          <span>IVA (19%)</span>
                                          <span className="font-mono text-slate-200">{formatCurrency(vatAmount)}</span>
                                      </div>
                                  )}
                                  <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 flex justify-between items-end mt-2">
                                      <span className="text-sm text-slate-400 font-medium uppercase tracking-wider mb-1">Total a Pagar</span>
                                      <span className="text-2xl font-bold text-white tracking-tight">{formatCurrency(finalTotal)}</span>
                                  </div>
                              </div>
                          </CardContent>
                      </Card>
                 </div>
              </div>
            </div>

            <SheetFooter className="sticky bottom-0 bg-slate-900 border-t border-slate-800 p-4 sm:justify-end z-10 shadow-[0_-5px_10px_rgba(0,0,0,0.2)]">
              <SheetClose asChild><Button type="button" variant="ghost" className="mr-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800">Cancelar</Button></SheetClose>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-8 shadow-lg shadow-blue-900/20 font-semibold" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : (order ? 'Guardar Cambios' : 'Crear Venta')}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
      
      <QuickContactDialog isOpen={isQuickContactOpen} onOpenChange={setIsQuickContactOpen} type="client" onSuccess={(newId) => setValue('clientId', newId, { shouldValidate: true })} />

      <LotSelectionDialog 
        isOpen={isLotSelectionOpen}
        onOpenChange={setIsLotSelectionOpen}
        onSave={handleAddLotItem}
        purchaseOrders={purchaseOrders}
        salesOrders={salesOrders}
        inventoryAdjustments={inventoryAdjustments}
        contacts={contacts}
        warehouse={watch('warehouse')}
      />
    </>
  );
}
