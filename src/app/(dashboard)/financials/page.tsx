"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase"; 
import { collection, query, orderBy } from "firebase/firestore";

export default function FinancialsPage() {
  const { firestore } = useFirebase();
  
  // Conexión a Firebase (Asegúrate de que la colección se llame 'financialMovements')
  const q = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, "financialMovements"), orderBy("date", "desc"));
  }, [firestore]);

  const { data: movements, isLoading } = useCollection<any>(q);

  // Cálculos rápidos
  const totalIngresos = movements?.filter((m: any) => m.type === 'income').reduce((sum: number, m: any) => sum + Number(m.amount), 0) || 0;
  const totalEgresos = movements?.filter((m: any) => m.type === 'expense').reduce((sum: number, m: any) => sum + Number(m.amount), 0) || 0;
  const saldo = totalIngresos - totalEgresos;

  const cardClass = "bg-slate-900 border-slate-800 shadow-sm";

  return (
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-slate-100">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-white">Tesorería</h2>
                <p className="text-slate-400 mt-1">Control de flujo de caja y movimientos bancarios.</p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20">
                <Plus className="mr-2 h-4 w-4" /> Registrar Movimiento
            </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
            <Card className={cardClass}>
                <CardContent className="p-6">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Saldo Actual</p>
                    <h3 className={`text-3xl font-bold ${saldo >= 0 ? 'text-white' : 'text-red-400'}`}>
                        ${new Intl.NumberFormat('es-CL').format(saldo)}
                    </h3>
                </CardContent>
            </Card>
            <Card className={cardClass}>
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Ingresos Totales</p>
                        <h3 className="text-2xl font-bold text-emerald-400">${new Intl.NumberFormat('es-CL').format(totalIngresos)}</h3>
                    </div>
                    <div className="bg-emerald-500/10 p-3 rounded-full"><TrendingUp className="h-6 w-6 text-emerald-500"/></div>
                </CardContent>
            </Card>
            <Card className={cardClass}>
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Egresos Totales</p>
                        <h3 className="text-2xl font-bold text-red-400">${new Intl.NumberFormat('es-CL').format(totalEgresos)}</h3>
                    </div>
                    <div className="bg-red-500/10 p-3 rounded-full"><TrendingDown className="h-6 w-6 text-red-500"/></div>
                </CardContent>
            </Card>
        </div>

        <Card className={cardClass}>
            <CardHeader><CardTitle className="text-white">Últimos Movimientos</CardTitle></CardHeader>
            <CardContent>
                {isLoading ? <p className="text-slate-500">Cargando...</p> : (
                    <div className="space-y-4">
                        {movements?.map((mov: any) => (
                            <div key={mov.id} className="flex justify-between items-center p-3 bg-slate-950/50 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
                                <div>
                                    <p className="font-medium text-slate-200">{mov.description || 'Movimiento General'}</p>
                                    <p className="text-xs text-slate-500">{mov.date}</p>
                                </div>
                                <span className={`font-mono font-bold ${mov.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {mov.type === 'income' ? '+' : '-'}${new Intl.NumberFormat('es-CL').format(mov.amount)}
                                </span>
                            </div>
                        ))}
                        {(!movements || movements.length === 0) && <p className="text-slate-500 text-center py-8">No hay movimientos registrados.</p>}
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}