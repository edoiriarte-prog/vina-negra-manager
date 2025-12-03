"use client";

import { useState, useMemo } from "react";
import { usePlanning } from "@/hooks/use-planning";
import { useMasterData } from "@/hooks/use-master-data";
import { PlannedOrder } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Clock, CheckCircle2 } from "lucide-react";
import { format, parseISO, endOfWeek, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { NewSalesOrderSheet } from "../sales/components/new-sales-order-sheet"; 
import { Skeleton } from "@/components/ui/skeleton";

// Helper
const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

export default function PlanningPage() {
  const { plannedOrders, isLoading, createPlan, updatePlan } = usePlanning();
  
  // Datos maestros con valores por defecto
  const { contacts = [], inventory = [] } = useMasterData(); 

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlannedOrder | null>(null);

  // --- CORRECCIÓN DEL FILTRO DE CLIENTES ---
  const clients = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter(c => {
      // Convertimos el tipo a string seguro, ya sea que venga como array o texto
      const typeStr = Array.isArray(c.type) ? c.type.join(' ') : String(c.type || '');
      return typeStr.toLowerCase().includes('client') || typeStr.toLowerCase().includes('cliente');
    });
  }, [contacts]);

  // --- LÓGICA DE VISUALIZACIÓN SEMANAL ---
  const weeklyView = useMemo(() => {
    if (!plannedOrders) return { thisWeek: [], nextWeek: [], later: [] };
    
    const today = new Date();
    const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 });
    const endOfNextWeek = endOfWeek(addDays(today, 7), { weekStartsOn: 1 });

    const thisWeek = plannedOrders.filter(p => parseISO(p.deliveryDate) <= endOfThisWeek && p.status !== 'entregado');
    const nextWeek = plannedOrders.filter(p => parseISO(p.deliveryDate) > endOfThisWeek && parseISO(p.deliveryDate) <= endOfNextWeek);
    
    return { thisWeek, nextWeek };
  }, [plannedOrders]);

  // --- HANDLER: Guardar Planificación ---
  const handleSavePlan = (data: any) => {
    const planData: any = {
        ...data,
        deliveryDate: data.date, 
        status: editingPlan ? editingPlan.status : 'borrador', 
        totalKilos: data.items.reduce((acc: number, i: any) => acc + i.quantity, 0),
    };

    delete planData.paymentStatus;
    delete planData.saleType;

    if (editingPlan) {
        updatePlan(editingPlan.id, planData);
    } else {
        createPlan(planData);
    }
    setIsSheetOpen(false);
    setEditingPlan(null);
  };

  const toggleStatus = (plan: PlannedOrder) => {
      const newStatus = plan.status === 'borrador' ? 'confirmado' : 'entregado';
      updatePlan(plan.id, { status: newStatus });
  };

  if (isLoading) return <div className="p-8"><Skeleton className="h-96 w-full"/></div>;

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-950 min-h-screen text-slate-100">
      
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-3xl font-bold text-white">Planificación de Pedidos</h2>
            <p className="text-slate-400">Gestiona los compromisos de entrega y proyecciones de venta.</p>
        </div>
        <Button onClick={() => { setEditingPlan(null); setIsSheetOpen(true); }} className="bg-indigo-600 hover:bg-indigo-500">
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
                    <CardTitle className="text-emerald-400 flex items-center gap-2">
                        <Calendar className="h-5 w-5"/> Entregas Esta Semana
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                    {weeklyView.thisWeek.length === 0 && <p className="text-slate-500 text-sm italic">No hay entregas para esta semana.</p>}
                    {weeklyView.thisWeek.map(plan => (
                        <PlanCard key={plan.id} plan={plan} contacts={contacts} onToggle={() => toggleStatus(plan)} onEdit={() => { setEditingPlan(plan); setIsSheetOpen(true); }} />
                    ))}
                </CardContent>
            </Card>

            {/* COLUMNA: PRÓXIMA SEMANA */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="border-b border-slate-800 pb-3">
                    <CardTitle className="text-blue-400 flex items-center gap-2">
                        <Clock className="h-5 w-5"/> Próxima Semana
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                      {weeklyView.nextWeek.length === 0 && <p className="text-slate-500 text-sm italic">Nada planificado aún.</p>}
                      {weeklyView.nextWeek.map(plan => (
                        <PlanCard key={plan.id} plan={plan} contacts={contacts} onToggle={() => toggleStatus(plan)} onEdit={() => { setEditingPlan(plan); setIsSheetOpen(true); }} />
                    ))}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="list">
            <div className="rounded-md border border-slate-800 bg-slate-900">
                <div className="p-8 text-center text-slate-500">Vista de lista completa (Histórico)</div>
            </div>
        </TabsContent>
      </Tabs>

      {isSheetOpen && (
        <NewSalesOrderSheet 
            isOpen={isSheetOpen}
            onOpenChange={(open) => !open && setIsSheetOpen(false)}
            onSave={handleSavePlan}
            // @ts-ignore
            order={editingPlan ? { ...editingPlan, date: editingPlan.deliveryDate } : null}
            clients={clients} 
            inventory={inventory || []} 
            sheetType="sale" 
        />
      )}
    </div>
  );
}

function PlanCard({ plan, contacts, onToggle, onEdit }: any) {
    const clientName = contacts?.find((c: any) => c.id === plan.clientId)?.name || 'Desconocido';
    const isConfirmed = plan.status === 'confirmado';

    return (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-all group relative">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className="font-bold text-white flex items-center gap-2">
                        {clientName}
                        <Badge variant="outline" className={isConfirmed ? "text-emerald-400 border-emerald-900 bg-emerald-950/30" : "text-yellow-400 border-yellow-900 bg-yellow-950/30"}>
                            {plan.status}
                        </Badge>
                    </h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3"/> Entrega: {format(parseISO(plan.deliveryDate), 'EEEE dd MMM', { locale: es })}
                    </p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-white">{formatCurrency(plan.totalAmount)}</p>
                    <p className="text-xs text-slate-500">{plan.totalKilos.toLocaleString('es-CL')} kg</p>
                </div>
            </div>
            
            <div className="space-y-1 mt-3 border-t border-slate-800 pt-2">
                {plan.items.slice(0, 3).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs text-slate-300">
                        <span>{item.product} {item.caliber}</span>
                        <span>{item.quantity} kg</span>
                    </div>
                ))}
                {plan.items.length > 3 && <p className="text-[10px] text-slate-500 italic">+ {plan.items.length - 3} más...</p>}
            </div>

            <div className="mt-4 flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="ghost" onClick={onEdit} className="h-7 text-xs">Editar</Button>
                {plan.status !== 'entregado' && (
                    <Button size="sm" onClick={onToggle} className={`h-7 text-xs ${isConfirmed ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'} text-white`}>
                        {isConfirmed ? <><CheckCircle2 className="h-3 w-3 mr-1"/> Marcar Entregado</> : "Confirmar"}
                    </Button>
                )}
            </div>
        </div>
    )
}