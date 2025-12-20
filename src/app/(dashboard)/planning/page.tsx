
"use client";

import { useState, useMemo } from "react";
import { usePlanning } from "@/hooks/use-planning";
import { useMasterData } from "@/hooks/use-master-data";
import { PlannedOrder, OrderItem } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, Plus, Clock, CheckCircle2, MoreVertical, 
  Trash2, Edit, Send
} from "lucide-react";
import { format, parseISO, endOfWeek, addDays, isPast, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { NewSalesOrderSheet } from "../sales/components/new-sales-order-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Helper
const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val || 0);

export default function PlanningPage() {
  const { 
    plannedOrders, isLoading, createPlan, updatePlan, deletePlan, promoteToSale 
  } = usePlanning();
  
  const { contacts = [], inventory = [] } = useMasterData(); 

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlannedOrder | null>(null);

  const clients = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter(c => Array.isArray(c.type) && c.type.includes('client'));
  }, [contacts]);

  const weeklyView = useMemo(() => {
    if (!plannedOrders) return { thisWeek: [], nextWeek: [], later: [] };
    
    const today = new Date();
    const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 });
    const endOfNextWeek = endOfWeek(addDays(today, 7), { weekStartsOn: 1 });

    const thisWeek = plannedOrders.filter(p => parseISO(p.deliveryDate) <= endOfThisWeek && p.status !== 'entregado' && p.status !== 'cancelado');
    const nextWeek = plannedOrders.filter(p => parseISO(p.deliveryDate) > endOfThisWeek && parseISO(p.deliveryDate) <= endOfNextWeek && p.status !== 'entregado' && p.status !== 'cancelado');
    const later = plannedOrders.filter(p => parseISO(p.deliveryDate) > endOfNextWeek && p.status !== 'entregado' && p.status !== 'cancelado');
    
    return { thisWeek, nextWeek, later };
  }, [plannedOrders]);

  const handleSavePlan = async (data: Partial<Omit<PlannedOrder, 'id'>>) => {
    if (editingPlan) {
        await updatePlan(editingPlan.id, data);
    } else {
        await createPlan(data);
    }
    setIsSheetOpen(false);
    setEditingPlan(null);
  };
  
  const handleEdit = (plan: PlannedOrder) => {
    setEditingPlan(plan);
    setIsSheetOpen(true);
  };

  const toggleStatus = (plan: PlannedOrder) => {
      const newStatus = plan.status === 'borrador' ? 'confirmado' : plan.status === 'confirmado' ? 'entregado' : 'borrador';
      updatePlan(plan.id, { status: newStatus });
  };

  if (isLoading) return <div className="p-8"><Skeleton className="h-96 w-full"/></div>;

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-950 min-h-screen text-slate-100">
      
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-3xl font-bold text-white">Planificación de Entregas</h2>
            <p className="text-slate-400">Gestiona los compromisos de venta y proyecciones de despacho.</p>
        </div>
        <Button onClick={() => { setEditingPlan(null); setIsSheetOpen(true); }} className="bg-indigo-600 hover:bg-indigo-500">
            <Plus className="mr-2 h-4 w-4"/> Nuevo Plan
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="border-b border-slate-800 pb-3">
                    <CardTitle className="text-emerald-400 flex items-center gap-2">
                        <Calendar className="h-5 w-5"/> Esta Semana
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                    {weeklyView.thisWeek.length === 0 && <p className="text-slate-500 text-sm italic py-8 text-center">No hay entregas para esta semana.</p>}
                    {weeklyView.thisWeek.map(plan => (
                        <PlanCard key={plan.id} plan={plan} contacts={contacts} onEdit={handleEdit} onDelete={deletePlan} onPromote={promoteToSale} onToggleStatus={toggleStatus} />
                    ))}
                </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="border-b border-slate-800 pb-3">
                    <CardTitle className="text-blue-400 flex items-center gap-2">
                        <Clock className="h-5 w-5"/> Próxima Semana
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                      {weeklyView.nextWeek.length === 0 && <p className="text-slate-500 text-sm italic py-8 text-center">Nada planificado aún.</p>}
                      {weeklyView.nextWeek.map(plan => (
                        <PlanCard key={plan.id} plan={plan} contacts={contacts} onEdit={handleEdit} onDelete={deletePlan} onPromote={promoteToSale} onToggleStatus={toggleStatus} />
                    ))}
                </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="border-b border-slate-800 pb-3">
                    <CardTitle className="text-purple-400 flex items-center gap-2">
                        <Clock className="h-5 w-5"/> Más Adelante
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                      {weeklyView.later.length === 0 && <p className="text-slate-500 text-sm italic py-8 text-center">Nada planificado aún.</p>}
                      {weeklyView.later.map(plan => (
                        <PlanCard key={plan.id} plan={plan} contacts={contacts} onEdit={handleEdit} onDelete={deletePlan} onPromote={promoteToSale} onToggleStatus={toggleStatus} />
                    ))}
                </CardContent>
            </Card>
      </div>
      
      {isSheetOpen && (
        <NewSalesOrderSheet 
            isOpen={isSheetOpen}
            onOpenChange={(open) => { if (!open) setIsSheetOpen(false) }}
            onSave={(data) => handleSavePlan(data)}
            order={editingPlan as any}
            clients={clients} 
            inventory={inventory || []} 
            sheetType="sale" 
        />
      )}
    </div>
  );
}

function PlanCard({ plan, contacts, onEdit, onDelete, onPromote, onToggleStatus }: { plan: PlannedOrder, contacts: Contact[], onEdit: (p: PlannedOrder) => void, onDelete: (id: string) => void, onPromote: (p: PlannedOrder) => void, onToggleStatus: (p: PlannedOrder) => void }) {
    const clientName = contacts?.find((c: any) => c.id === plan.clientId)?.name || 'Desconocido';
    const deliveryDate = parseISO(plan.deliveryDate);
    const isOverdue = isPast(deliveryDate) && !isToday(deliveryDate);
    const isConfirmed = plan.status === 'confirmado';

    const statusStyles = {
        borrador: 'border-yellow-500/50 bg-yellow-950/50 text-yellow-400',
        confirmado: 'border-blue-500/50 bg-blue-950/50 text-blue-400',
        entregado: 'border-green-500/50 bg-green-950/50 text-green-400',
    };

    return (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-all group relative">
            <div className="absolute top-2 right-2">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 group-hover:opacity-100 opacity-20"><MoreVertical className="h-4 w-4"/></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
                        <DropdownMenuItem onClick={() => onPromote(plan)} className="text-emerald-400 focus:bg-slate-800 focus:text-emerald-300">
                            <Send className="mr-2 h-4 w-4"/> Convertir a Venta
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(plan)} className="focus:bg-slate-800">
                            <Edit className="mr-2 h-4 w-4"/> Editar Plan
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(plan.id)} className="text-red-500 focus:bg-slate-800 focus:text-red-400">
                            <Trash2 className="mr-2 h-4 w-4"/> Eliminar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            
            <div className="flex justify-between items-start mb-2 pr-8">
                <div>
                    <h4 className="font-bold text-white flex items-center gap-2">
                        {clientName}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={cn("capitalize", statusStyles[plan.status])}>
                            {plan.status}
                        </Badge>
                        <p className={cn("text-xs text-slate-400 flex items-center gap-1", isOverdue && "text-red-400 font-bold")}>
                            <Calendar className="h-3 w-3"/> {format(deliveryDate, 'EEEE dd MMM', { locale: es })}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="font-bold text-white text-lg">{formatCurrency(plan.totalAmount)}</p>
                    <p className="text-xs text-slate-500">{plan.totalKilos.toLocaleString('es-CL')} kg</p>
                </div>
            </div>
            
            <div className="space-y-1 mt-3 border-t border-slate-800 pt-2">
                {plan.items.slice(0, 3).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs text-slate-300">
                        <span>• {item.product} {item.caliber}</span>
                        <span className="font-mono">{item.quantity} kg a {formatCurrency((item.price || 0))}</span>
                    </div>
                ))}
                {plan.items.length > 3 && <p className="text-[10px] text-slate-500 italic text-right">+ {plan.items.length - 3} más...</p>}
            </div>

             <div className="mt-4 flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                {plan.status !== 'entregado' && (
                    <Button size="sm" onClick={() => onToggleStatus(plan)} className={`h-7 text-xs ${isConfirmed ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'} text-white`}>
                        <CheckCircle2 className="h-3 w-3 mr-1"/> Marcar como {isConfirmed ? 'Entregado' : "Confirmado"}
                    </Button>
                )}
            </div>
        </div>
    )
}
