
"use client";

import { useState, useMemo, useCallback } from "react";
import { usePlanning } from "@/hooks/use-planning";
import { useMasterData } from "@/hooks/use-master-data";
import { PlannedOrder, SalesOrder } from "@/lib/types"; // Asegúrate que SalesOrder esté importado
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Clock, MoreHorizontal, ArrowRight, Trash2, Edit } from "lucide-react";
import { format, parseISO, endOfWeek, addDays, startOfToday } from "date-fns";
import { es } from 'date-fns/locale';
import { NewPlanningSheet } from "./components/new-planning-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Helper defensivo para moneda (evita NaN)
const formatCurrency = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return "$0";
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);
};

export default function PlanningPage() {
  const { plannedOrders, isLoading, createPlan, updatePlan, deletePlan, promoteToSale } = usePlanning();
  const { contacts = [], inventory = [] } = useMasterData(); 

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlannedOrder | null>(null);

  // Filtro de clientes
  const clients = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter(c => {
      const typeStr = Array.isArray(c.type) ? c.type.join(' ') : String(c.type || '');
      return typeStr.toLowerCase().includes('client') || typeStr.toLowerCase().includes('cliente');
    });
  }, [contacts]);

  // Vistas Semanales
  const weeklyView = useMemo(() => {
    if (!plannedOrders) return { thisWeek: [], nextWeek: [], later: [] };
    
    const today = startOfToday();
    const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 });
    const endOfNextWeek = endOfWeek(addDays(today, 7), { weekStartsOn: 1 });

    const thisWeek = plannedOrders.filter(p => parseISO(p.deliveryDate) <= endOfThisWeek && p.status !== 'entregado');
    const nextWeek = plannedOrders.filter(p => parseISO(p.deliveryDate) > endOfThisWeek && parseISO(p.deliveryDate) <= endOfNextWeek && p.status !== 'entregado');
    
    return { thisWeek, nextWeek };
  }, [plannedOrders]);

  const handleSavePlan = useCallback(async (data: Partial<Omit<PlannedOrder, 'id'>>) => {
    try {
        if (editingPlan) {
            await updatePlan(editingPlan.id, data);
        } else {
            await createPlan(data);
        }
        setIsSheetOpen(false);
        setEditingPlan(null);
    } catch (error) {
        console.error("Error al guardar el plan:", error);
    }
  }, [editingPlan, createPlan, updatePlan]);

  const handleEdit = useCallback((plan: PlannedOrder) => {
      setEditingPlan(plan);
      setIsSheetOpen(true);
  }, []);

  if (isLoading) return <div className="p-8"><Skeleton className="h-96 w-full bg-slate-800"/></div>;

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-950 min-h-screen text-slate-100">
      
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-3xl font-bold text-white">Planificación de Pedidos</h2>
            <p className="text-slate-400">Gestiona los compromisos de entrega y proyecciones de venta.</p>
        </div>
        <Button onClick={() => { setEditingPlan(null); setIsSheetOpen(true); }} className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/20">
            <Plus className="mr-2 h-4 w-4"/> Nuevo Pedido
        </Button>
      </div>

      <Tabs defaultValue="week" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="week">Vista Semanal</TabsTrigger>
            <TabsTrigger value="list">Lista Completa</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="grid md:grid-cols-2 gap-6">
            
            {/* COLUMNA: ESTA SEMANA */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="border-b border-slate-800 pb-3">
                    <CardTitle className="text-emerald-400 flex items-center gap-2 text-lg">
                        <Calendar className="h-5 w-5"/> Entregas Esta Semana
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                    {weeklyView.thisWeek.length === 0 && <p className="text-slate-500 text-sm italic py-4 text-center">No hay entregas pendientes esta semana.</p>}
                    {weeklyView.thisWeek.map(plan => (
                        <PlanCard 
                            key={plan.id} 
                            plan={plan} 
                            contacts={contacts} 
                            onEdit={() => handleEdit(plan)}
                            onDelete={() => deletePlan(plan.id)}
                            onPromote={() => promoteToSale(plan)}
                        />
                    ))}
                </CardContent>
            </Card>

            {/* COLUMNA: PRÓXIMA SEMANA */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="border-b border-slate-800 pb-3">
                    <CardTitle className="text-blue-400 flex items-center gap-2 text-lg">
                        <Clock className="h-5 w-5"/> Próxima Semana
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                      {weeklyView.nextWeek.length === 0 && <p className="text-slate-500 text-sm italic py-4 text-center">Nada planificado para la próxima semana.</p>}
                      {weeklyView.nextWeek.map(plan => (
                        <PlanCard 
                            key={plan.id} 
                            plan={plan} 
                            contacts={contacts} 
                            onEdit={() => handleEdit(plan)}
                            onDelete={() => deletePlan(plan.id)}
                            onPromote={() => promoteToSale(plan)}
                        />
                    ))}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="list">
            <div className="rounded-md border border-slate-800 bg-slate-900 p-8 text-center text-slate-500">
                Vista de lista completa (Próximamente)
            </div>
        </TabsContent>
      </Tabs>

      {isSheetOpen && (
        <NewPlanningSheet 
            isOpen={isSheetOpen}
            onOpenChange={(open) => !open && setIsSheetOpen(false)}
            onSave={handleSavePlan}
            order={editingPlan}
            clients={clients} 
            inventory={inventory || []} 
        />
      )}
    </div>
  );
}

function PlanCard({ plan, contacts, onEdit, onDelete, onPromote }: any) {
    const clientName = contacts?.find((c: any) => c.id === plan.clientId)?.name || 'Cliente Desconocido';
    const isConfirmed = plan.status === 'confirmado';

    const safeTotal = plan.totalAmount || (plan.items || []).reduce((acc: number, i: any) => acc + ((i.price||0) * (i.quantity||0)), 0);

    return (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 hover:border-slate-600 transition-all group relative shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wide">
                        {clientName}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${isConfirmed ? "text-emerald-400 border-emerald-900 bg-emerald-950/30" : "text-yellow-400 border-yellow-900 bg-yellow-950/30"}`}>
                            {plan.status}
                        </Badge>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                             <Calendar className="h-3 w-3"/> {format(parseISO(plan.deliveryDate), 'EEEE dd', { locale: es })}
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="font-bold text-emerald-400 text-sm">{formatCurrency(safeTotal)}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{(plan.totalKilos || 0).toLocaleString('es-CL')} kg</p>
                </div>
            </div>
            
            <div className="space-y-1 mt-3 border-t border-slate-800 pt-2">
                {plan.items.slice(0, 3).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs text-slate-300">
                        <span className="truncate max-w-[180px]">{item.product} <span className="text-slate-500 text-[10px]">{item.caliber}</span></span>
                        <span className="font-mono text-slate-400">{item.quantity}</span>
                    </div>
                ))}
                {plan.items.length > 3 && <p className="text-[10px] text-slate-500 italic text-right">+ {plan.items.length - 3} ítems más</p>}
            </div>

            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 shadow-lg rounded-md z-10">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-slate-800"><MoreHorizontal className="h-4 w-4 text-slate-400"/></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        
                        <DropdownMenuItem 
                            onSelect={(e) => {
                                e.preventDefault();
                                setTimeout(() => onPromote(), 100);
                            }}
                            className="cursor-pointer text-emerald-500 focus:text-emerald-400 focus:bg-emerald-950/20"
                        >
                            <ArrowRight className="mr-2 h-4 w-4" /> Convertir a Venta
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator className="bg-slate-800"/>
                        
                        <DropdownMenuItem 
                             onSelect={(e) => {
                                e.preventDefault();
                                setTimeout(() => onEdit(), 100);
                            }}
                            className="cursor-pointer focus:bg-slate-800"
                        >
                            <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                             onSelect={(e) => {
                                e.preventDefault();
                                setTimeout(() => onDelete(), 100);
                            }}
                            className="cursor-pointer text-red-500 focus:text-red-400 focus:bg-red-950/20"
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}
