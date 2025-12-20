
"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO } from 'date-fns';

import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Users, CalendarIcon, Package, Loader2, DollarSign } from "lucide-react";
import { 
  PlannedOrder, 
  Contact, 
  OrderItem,
} from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useMasterData } from "@/hooks/use-master-data";
import QuickContactDialog from "@/components/contacts/quick-contact-dialog";
import { cn } from "@/lib/utils";

// --- Zod Schema for Validation ---
const plannedOrderItemSchema = z.object({
    product: z.string().min(1, "Requerido"),
    caliber: z.string().min(1, "Requerido"),
    quantity: z.number().positive("Debe ser > 0"),
    price: z.number().nonnegative("No puede ser negativo"),
});

const plannedOrderSchema = z.object({
  clientId: z.string().min(1, "Debe seleccionar un cliente"),
  deliveryDate: z.date({ required_error: "La fecha es requerida."}),
  items: z.array(plannedOrderItemSchema).min(1, "Debe agregar al menos un ítem."),
  notes: z.string().optional(),
});

type PlannedOrderFormData = z.infer<typeof plannedOrderSchema>;

// --- Component Props ---
interface NewPlanningSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (orderData: Partial<Omit<PlannedOrder, 'id'>>) => Promise<void>;
  order: PlannedOrder | null;
  clients: Contact[];
}

export function NewPlanningSheet({
  isOpen,
  onOpenChange,
  onSave,
  order,
  clients,
}: NewPlanningSheetProps) {
  
  const { toast } = useToast();
  const { products, calibers, productCaliberAssociations } = useMasterData();
  const [isQuickContactOpen, setIsQuickContactOpen] = useState(false);

  const form = useForm<PlannedOrderFormData>({
    resolver: zodResolver(plannedOrderSchema),
    defaultValues: {
      deliveryDate: new Date(),
      items: [],
      notes: '',
    },
  });

  const { control, handleSubmit, register, watch, setValue, formState: { errors, isSubmitting } } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  // --- Effects ---
  useEffect(() => {
    if (isOpen) {
      if (order) {
        // Editing existing order
        form.reset({
          clientId: order.clientId,
          deliveryDate: order.deliveryDate ? parseISO(order.deliveryDate) : new Date(),
          notes: order.notes || '',
          items: (order.items || []).map(item => ({
            product: item.product,
            caliber: item.caliber,
            quantity: Number(item.quantity || 0),
            price: Number(item.price || 0),
          })),
        });
      } else {
        // Creating new order
        form.reset({
          clientId: '',
          deliveryDate: new Date(),
          items: [],
          notes: '',
        });
      }
    }
  }, [order, isOpen, form]);

  // --- Real-time Calculations ---
  const watchedItems = watch("items");
  const netTotal = useMemo(() => {
    return (watchedItems || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
  }, [watchedItems]);

  // --- Handlers ---
  const handleFormSubmit = async (data: PlannedOrderFormData) => {
    const finalOrderData: Partial<Omit<PlannedOrder, 'id'>> = {
      clientId: data.clientId,
      deliveryDate: format(data.deliveryDate, 'yyyy-MM-dd'),
      items: data.items,
      notes: data.notes,
      // Los totales se calculan en el hook use-planning
    };

    try {
      await onSave(finalOrderData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error al guardar desde el sheet de planificación:", error);
    }
  };

  // --- UI Constants ---
  const title = order ? `Editar Planificación` : `Nuevo Pedido Planificado`;
  const darkInputClass = "bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500 placeholder:text-slate-600";
  const darkCardClass = "bg-slate-900 border-slate-800 shadow-sm";
  const labelClass = "text-xs font-medium text-slate-400 uppercase tracking-wide";
  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val || 0);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-4xl w-[95vw] overflow-y-auto p-0 flex flex-col gap-0 bg-slate-950 border-l-slate-800 text-slate-100">
          <SheetHeader className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600/20 p-2.5 rounded-xl border border-indigo-600/30">
                  <CalendarIcon className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <SheetTitle className="text-xl font-bold text-slate-100 tracking-tight">{title}</SheetTitle>
                </div>
              </div>
            </div>
          </SheetHeader>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-8">
            
              <div className="grid md:grid-cols-2 gap-5">
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
                    {errors.clientId && <p className="text-red-500 text-xs mt-1">{errors.clientId.message}</p>}
                  </CardContent>
                </Card>

                <Card className={darkCardClass}>
                  <CardContent className="p-4 space-y-3">
                    <Label className="flex items-center gap-2 text-sm font-semibold text-slate-300"><CalendarIcon className="h-4 w-4 text-orange-500" /> Fecha de Entrega</Label>
                    <Controller name="deliveryDate" control={control} render={({ field }) => (
                       <Input type="date" value={format(field.value, 'yyyy-MM-dd')} onChange={e => field.onChange(parseISO(e.target.value))} className={`${darkInputClass} [color-scheme:dark]`} />
                    )} />
                    {errors.deliveryDate && <p className="text-red-500 text-xs mt-1">{errors.deliveryDate.message}</p>}
                  </CardContent>
                </Card>
              </div>
            
              <div className={cn("rounded-xl border", darkCardClass)}>
                <CardHeader className="border-b border-slate-800 py-4 px-6">
                  <h3 className="font-semibold text-slate-200 flex items-center gap-2"><Package className="h-4 w-4 text-blue-400" /> Detalle de Productos</h3>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="w-[25%] text-slate-400">Producto</TableHead>
                        <TableHead className="w-[15%] text-slate-400">Calibre</TableHead>
                        <TableHead className="w-[15%] text-center text-slate-400">Kilos</TableHead>
                        <TableHead className="w-[20%] text-right text-slate-400">Precio Unit.</TableHead>
                        <TableHead className="w-[20%] text-right text-slate-400">Subtotal</TableHead>
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
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ product: '', caliber: '', quantity: 0, price: 0 })} className="border-slate-700 text-slate-300 hover:bg-slate-800"><Plus className="mr-2 h-4 w-4" /> Agregar Ítem</Button>
                  </div>
                </CardContent>
              </div>

              <div className="grid md:grid-cols-2 gap-6 items-start">
                <div>
                  <Label className={labelClass}>Notas / Observaciones</Label>
                  <Textarea {...register("notes")} className="min-h-[100px] resize-none bg-slate-950 border-slate-800 text-slate-300 focus:border-slate-600" placeholder="Detalles o requerimientos especiales del pedido..." />
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-100 flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-500" /> Totales Estimados</h4>
                  <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 flex justify-between items-end">
                    <span className="text-sm text-slate-400 font-medium uppercase tracking-wider mb-1">Total Neto Estimado</span>
                    <span className="text-2xl font-bold text-white tracking-tight">{formatCurrency(netTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            <SheetFooter className="sticky bottom-0 bg-slate-900 border-t border-slate-800 p-4 sm:justify-end z-10 shadow-[0_-5px_10px_rgba(0,0,0,0.2)]">
              <SheetClose asChild><Button type="button" variant="ghost" className="mr-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800">Cancelar</Button></SheetClose>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 shadow-lg shadow-indigo-900/20 font-semibold" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : (order ? 'Guardar Cambios' : 'Crear Planificación')}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
      
      <QuickContactDialog isOpen={isQuickContactOpen} onOpenChange={setIsQuickContactOpen} type="client" onSuccess={(newId) => setValue('clientId', newId, { shouldValidate: true })} />
    </>
  );
}
