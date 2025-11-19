'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { FinancialMovement, PurchaseOrder, SaleOrder } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, TrendingDown, Wallet, ShoppingCart, ShoppingBag } from 'lucide-react';

// Función simple para formatear dinero
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);

export default function DashboardPage() {
  const { firestore } = useFirebase();

  // 1. Cargar datos vitales de Firebase
  const movementsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'financialMovements') : null, [firestore]);
  const { data: movements, isLoading: loadingMovements } = useCollection<FinancialMovement>(movementsQuery);

  const purchasesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'purchaseOrders') : null, [firestore]);
  const { data: purchases, isLoading: loadingPurchases } = useCollection<PurchaseOrder>(purchasesQuery);

  const salesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'salesOrders') : null, [firestore]);
  const { data: sales, isLoading: loadingSales } = useCollection<SaleOrder>(salesQuery);

  const isLoading = loadingMovements || loadingPurchases || loadingSales;

  // 2. Calcular KPIs (Indicadores Clave)
  const kpis = useMemo(() => {
    if (!movements) return { ingresos: 0, egresos: 0, balance: 0 };
    
    const ingresos = movements
      .filter(m => m.type === 'income')
      .reduce((acc, curr) => acc + curr.amount, 0);
      
    const egresos = movements
      .filter(m => m.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0);

    return {
      ingresos,
      egresos,
      balance: ingresos - egresos
    };
  }, [movements]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>

      {/* Pestañas de Navegación Rápida */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="analytics">Analítica</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          
          {/* TARJETAS DE KPI PRINCIPALES */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            
            {/* Tarjeta 1: Ingresos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(kpis.ingresos)}</div>
                <p className="text-xs text-muted-foreground">Registrados en movimientos</p>
              </CardContent>
            </Card>

            {/* Tarjeta 2: Egresos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Egresos Totales</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(kpis.egresos)}</div>
                <p className="text-xs text-muted-foreground">Gastos operativos y compras</p>
              </CardContent>
            </Card>

            {/* Tarjeta 3: Balance */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Balance Neto</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${kpis.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(kpis.balance)}
                </div>
                <p className="text-xs text-muted-foreground">Utilidad actual</p>
              </CardContent>
            </Card>

             {/* Tarjeta 4: Operaciones */}
             <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Operaciones</CardTitle>
                <ActivityIcon />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{purchases?.length || 0} Compras</div>
                <p className="text-xs text-muted-foreground">{(sales?.length || 0)} Ventas registradas</p>
              </CardContent>
            </Card>
          </div>

          {/* SECCIÓN DE RESUMEN RÁPIDO */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Resumen Ejecutivo</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[200px] flex items-center justify-center text-gray-400">
                   {/* Aquí iría un gráfico en el futuro */}
                   <p>Gráfico de rendimiento (Próximamente)</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {/* Lista simple de últimos 3 movimientos */}
                  {movements?.slice(0, 3).map((mov) => (
                    <div key={mov.id} className="flex items-center">
                      <div className={`ml-4 space-y-1`}>
                        <p className="text-sm font-medium leading-none">{mov.description || 'Sin descripción'}</p>
                        <p className="text-sm text-muted-foreground">{new Date(mov.date).toLocaleDateString()}</p>
                      </div>
                      <div className={`ml-auto font-medium ${mov.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {mov.type === 'income' ? '+' : '-'}{formatCurrency(mov.amount)}
                      </div>
                    </div>
                  ))}
                  {!movements?.length && <p className="text-sm text-muted-foreground">No hay movimientos recientes.</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
            <Card>
                <CardHeader><CardTitle>Análisis Avanzado</CardTitle></CardHeader>
                <CardContent><p>Módulo en construcción...</p></CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ActivityIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    )
}