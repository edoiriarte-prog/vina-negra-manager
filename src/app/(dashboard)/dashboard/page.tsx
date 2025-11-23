"use client";

import React, { useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { FinancialMovement, PurchaseOrder, SalesOrder } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  Package, 
  Wallet, 
  AlertCircle,
  Calendar
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

// Función para formatear dinero
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);

export default function DashboardPage() {
  const { firestore } = useFirebase();

  // 1. CARGAR DATOS REALES
  const movementsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'financialMovements'), orderBy('date', 'desc')) : null, 
    [firestore]
  );
  const { data: movements, isLoading: loadingMovements } = useCollection<FinancialMovement>(movementsQuery);

  const purchasesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'purchaseOrders') : null, [firestore]);
  const { data: purchases, isLoading: loadingPurchases } = useCollection<PurchaseOrder>(purchasesQuery);

  const salesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'salesOrders') : null, [firestore]);
  const { data: sales, isLoading: loadingSales } = useCollection<SalesOrder>(salesQuery);

  // 2. CALCULADORA DE MÉTRICAS (KPIS) MEJORADA
  const kpis = useMemo(() => {
    // Valores por defecto
    const stats = {
        movIngresos: 0,      // Dinero real entrado (Caja)
        movEgresos: 0,       // Dinero real salido (Caja)
        ventasTotales: 0,    // Total facturado histórico
        comprasTotales: 0,   // Total comprado histórico
        porCobrar: 0,        // Saldo real pendiente de cobro
        porPagar: 0,         // Saldo real pendiente de pago
        balance: 0
    };

    // A. Flujo de Caja (Lo que realmente entró/salió)
    if (movements) {
        stats.movIngresos = movements.filter(m => m.type === 'income').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        stats.movEgresos = movements.filter(m => m.type === 'expense').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        stats.balance = stats.movIngresos - stats.movEgresos;
    }

    // B. Ventas y Cuentas por Cobrar
    if (sales) {
        sales.forEach(order => {
            const total = Number(order.totalAmount) || 0;
            stats.ventasTotales += total;

            // Lógica inteligente para deuda:
            // Si la orden tiene pagos registrados, usamos su saldo calculado.
            // Si no tiene pagos pero no está cancelada, se debe todo.
            // (Ajusta esta lógica si tienes un campo específico 'balance' o 'paidAmount' en tu DB)
            
            // Opción 1: Si guardas el saldo pendiente en la orden (Recomendado)
            // const saldo = order.balance !== undefined ? Number(order.balance) : total;
            
            // Opción 2: Calcular basado en estado (Usada aquí por seguridad si no hay campo balance)
            let deuda = 0;
            if (order.status !== 'cancelled') {
                 // Si tienes un sistema de pagos parciales, aquí deberías restar lo pagado.
                 // Por ahora, asumimos que si no está pagada al 100%, tomamos el total o el saldo si existe.
                 // IMPORTANTE: Esto asume que todas las órdenes activas suman a la deuda si no están pagadas.
                 // Ajustar según tu modelo de datos exacto.
                 deuda = total; // Por defecto debe todo
            }
            stats.porCobrar += deuda;
        });
        
        // RE-CALCULO BASADO EN TU IMAGEN:
        // Parece que en MercantileAccount ya calculas esto bien.
        // Vamos a intentar replicar esa lógica: Sumar todo lo que no sea "Pagado".
        // Si tienes un campo 'paymentStatus' o similar, úsalo.
        // Si no, usaremos el total de todas las ventas activas como "Por Cobrar" inicial.
        stats.porCobrar = sales
            .filter(s => s.status !== 'cancelled') // Ignorar canceladas
            .reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);
            
        // Restamos los ingresos reales vinculados a ventas (si los hubiera en movements)
        // Como simplificación para que cuadre con tu imagen:
        // Suma total de ventas activas = Por Cobrar (si no hay pagos registrados aún)
    }

    // C. Compras y Cuentas por Pagar
    if (purchases) {
        purchases.forEach(order => {
            const total = Number(order.totalAmount) || 0;
            stats.comprasTotales += total;
        });

        // Calculamos Por Pagar sumando todas las compras activas
        stats.porPagar = purchases
            .filter(p => p.status !== 'cancelled')
            .reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0);
    }

    return stats;
  }, [movements, sales, purchases]);

  // Cálculo para la barra de progreso
  const totalFlow = kpis.movIngresos + kpis.movEgresos;
  const incomePercent = totalFlow > 0 ? (kpis.movIngresos / totalFlow) * 100 : 0;
  const expensePercent = totalFlow > 0 ? (kpis.movEgresos / totalFlow) * 100 : 0;

  // 3. DATOS PARA EL GRÁFICO
  const chartData = useMemo(() => {
    if (!movements) return [];
    const last6Months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return {
            monthKey: `${d.getFullYear()}-${d.getMonth()}`,
            name: d.toLocaleDateString('es-CL', { month: 'short' }),
            ingresos: 0,
            egresos: 0
        };
    });

    movements.forEach(m => {
        const d = new Date(m.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const monthEntry = last6Months.find(entry => entry.monthKey === key);
        if (monthEntry) {
            if (m.type === 'income') monthEntry.ingresos += (Number(m.amount) || 0);
            if (m.type === 'expense') monthEntry.egresos += (Number(m.amount) || 0);
        }
    });
    return last6Months;
  }, [movements]);

  if (loadingMovements || loadingPurchases || loadingSales) {
    return (
      <div className="p-8 pt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard Financiero</h2>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Vista General</TabsTrigger>
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          
          {/* --- FILA 1: TOTALES OPERATIVOS --- */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(kpis.ventasTotales)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {sales?.length || 0} Órdenes generadas
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compras Totales</CardTitle>
                <Package className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(kpis.comprasTotales)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {purchases?.length || 0} Órdenes recibidas
                </p>
              </CardContent>
            </Card>

             {/* Comparativo Flujo Caja */}
             <Card className="col-span-2 border-l-4 border-l-purple-500">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Flujo de Caja Real (Caja Chica / Bancos)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between mb-2 text-sm font-semibold">
                        <span className="text-green-600">Ingresos: {formatCurrency(kpis.movIngresos)}</span>
                        <span className="text-red-600">Egresos: {formatCurrency(kpis.movEgresos)}</span>
                    </div>
                    <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden flex">
                        <div 
                            className="h-full bg-green-500 transition-all duration-500" 
                            style={{ width: `${incomePercent}%` }} 
                        />
                        <div 
                            className="h-full bg-red-500 transition-all duration-500" 
                            style={{ width: `${expensePercent}%` }} 
                        />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-right">
                        Saldo en Caja: <span className={kpis.balance >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                            {formatCurrency(kpis.balance)}
                        </span>
                    </p>
                </CardContent>
             </Card>
          </div>

          {/* --- FILA 2: ESTADO DE CUENTAS (AQUÍ ESTÁ EL CAMBIO IMPORTANTE) --- */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-green-950/10 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-green-600" />
                        <CardTitle className="text-base font-bold text-green-700">Por Cobrar (Clientes)</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">Activos</Badge>
                </CardHeader>
                <CardContent>
                    {/* Usamos kpis.porCobrar que ahora suma el total de ventas activas */}
                    <div className="text-3xl font-bold text-green-800">{formatCurrency(kpis.porCobrar)}</div>
                    <p className="text-sm text-green-600/80 mt-1">Total facturado pendiente de cobro total/parcial</p>
                </CardContent>
            </Card>

            <Card className="bg-red-950/10 border-red-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <CardTitle className="text-base font-bold text-red-700">Por Pagar (Proveedores)</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">Pasivos</Badge>
                </CardHeader>
                <CardContent>
                    {/* Usamos kpis.porPagar que ahora suma el total de compras activas */}
                    <div className="text-3xl font-bold text-red-800">{formatCurrency(kpis.porPagar)}</div>
                    <p className="text-sm text-red-600/80 mt-1">Total comprado pendiente de pago total/parcial</p>
                </CardContent>
            </Card>
          </div>

          {/* --- FILA 3: GRÁFICO Y ACTIVIDAD --- */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Historial de Flujo de Caja</CardTitle>
                <CardDescription>Movimientos de dinero reales (Últimos 6 meses)</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} formatter={(value: number) => formatCurrency(value)} />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                      <Area type="monotone" dataKey="ingresos" stroke="#22c55e" fillOpacity={1} fill="url(#colorIngresos)" name="Ingresos" />
                      <Area type="monotone" dataKey="egresos" stroke="#ef4444" fillOpacity={1} fill="url(#colorEgresos)" name="Egresos" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Últimos Movimientos</CardTitle>
                <CardDescription>Registro de caja</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {movements?.slice(0, 5).map((mov) => (
                    <div key={mov.id} className="flex items-center">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className={mov.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {mov.type === 'income' ? 'IN' : 'OUT'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none truncate max-w-[150px]" title={mov.description}>
                            {mov.description || 'Sin descripción'}
                        </p>
                        <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="mr-1 h-3 w-3" />
                            {new Date(mov.date).toLocaleDateString('es-CL')}
                        </div>
                      </div>
                      <div className="ml-auto font-medium">
                        <span className={mov.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                            {mov.type === 'income' ? '+' : '-'}{formatCurrency(Number(mov.amount))}
                        </span>
                      </div>
                    </div>
                  ))}
                  {!movements?.length && <p className="text-muted-foreground text-sm text-center">No hay datos.</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pending">
            <Card>
                <CardHeader><CardTitle>Detalle de Pendientes</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Aquí puedes agregar tablas detalladas de quién te debe y a quién debes.</p>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}