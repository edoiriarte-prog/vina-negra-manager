"use client";

import React, { useMemo } from 'react';
import { useMasterData } from '@/hooks/use-master-data';
import { useOperations } from '@/hooks/use-operations'; // <--- IMPORTAMOS EL NUEVO HOOK
import KpiCard from './components/kpi-card';
import { 
  WeeklyPurchasesChart, 
  WeeklySalesChart, 
  IncomeVsExpenseChart, 
  PurchasesBySupplierChart,
  CaliberDistributionChart,
  PurchasesByProductCaliberChart,
  SalesByOrderChart
} from './components/charts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import AiSummary from './components/ai-summary';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    DollarSign, 
    ShoppingCart, 
    TrendingUp, 
    Warehouse,
} from "lucide-react";

// --- HELPERS ---
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

const formatKilos = (value: number) =>
  new Intl.NumberFormat('es-CL').format(value);

export default function DashboardPage() {
  // 1. Datos Maestros (Inventario, Contactos)
  const { 
      inventory,
      contacts,
      isLoading: loadingMaster 
  } = useMasterData();

  // 2. Datos Operacionales (Ventas, Compras, Finanzas) - NUEVO HOOK
  const {
      purchaseOrders,
      salesOrders,
      financialMovements,
      isLoading: loadingOps
  } = useOperations();

  const isLoading = loadingMaster || loadingOps;

  const { kpis, financialDataString } = useMemo(() => {
    // Verificamos que todo esté cargado
    if (isLoading || !purchaseOrders || !salesOrders || !financialMovements || !inventory) {
        return { kpis: null, financialDataString: '' };
    }

    // Filtramos solo las completadas para los cálculos
    const completedPurchases = purchaseOrders.filter(o => o.status === 'completed' || o.status === 'received');
    const completedSales = salesOrders.filter(o => o.status === 'completed' || o.status === 'dispatched' || o.status === 'invoiced');

    const totalKilosPurchased = completedPurchases.reduce((sum, order) => sum + (order.totalKilos || 0), 0);
    const totalKilosSold = completedSales.reduce((sum, order) => sum + (order.totalKilos || 0), 0);
    
    // Sumas monetarias
    const totalPurchaseAmount = completedPurchases.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalSalesAmount = completedSales.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    
    const totalIncome = financialMovements.filter(m => m.type === 'income').reduce((sum, m) => sum + (m.amount || 0), 0);
    const totalExpense = financialMovements.filter(m => m.type === 'expense').reduce((sum, m) => sum + (m.amount || 0), 0);
    const netCashflow = totalIncome - totalExpense;

    // Stock
    const availableStock = inventory.reduce((sum, item) => sum + (item.stock || 0), 0);

    const kpiData = {
      totalSalesAmount,
      totalPurchaseAmount,
      totalKilosSold,
      totalKilosPurchased,
      netCashflow,
      availableStock,
      completedSalesCount: completedSales.length,
      completedPurchasesCount: completedPurchases.length,
    };

    const financialString = `
        Ventas Totales: ${formatCurrency(totalSalesAmount)}
        Compras Totales: ${formatCurrency(totalPurchaseAmount)}
        Ingresos Registrados: ${formatCurrency(totalIncome)}
        Egresos Registrados: ${formatCurrency(totalExpense)}
        Flujo de Caja Neto: ${formatCurrency(netCashflow)}
        Kilos Vendidos: ${formatKilos(totalKilosSold)} kg
        Kilos Comprados: ${formatKilos(totalKilosPurchased)} kg
        Stock Disponible: ${formatKilos(availableStock)} kg
    `;
    
    return { kpis: kpiData, financialDataString: financialString.trim() };
  }, [purchaseOrders, salesOrders, financialMovements, inventory, isLoading]);


  if (isLoading || !kpis) {
      return (
        <div className="p-8 pt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl bg-slate-800" />)}
            <Skeleton className="h-80 rounded-xl md:col-span-2 lg:col-span-4 bg-slate-800" />
            <Skeleton className="h-80 rounded-xl md:col-span-2 lg:col-span-2 bg-slate-800" />
            <Skeleton className="h-80 rounded-xl md:col-span-2 lg:col-span-2 bg-slate-800" />
        </div>
      )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-950 min-h-screen">
      <div className="flex items-center justify-between space-y-2">
        <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard</h2>
            <p className="text-slate-400">Una vista general y en tiempo real de su operación.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Ventas Totales"
          value={formatCurrency(kpis.totalSalesAmount)}
          description={`${kpis.completedSalesCount} órdenes completadas`}
          icon={<TrendingUp className="text-emerald-500" />}
          isLoading={isLoading}
        />
        <KpiCard
          title="Compras Totales"
          value={formatCurrency(kpis.totalPurchaseAmount)}
          description={`${kpis.completedPurchasesCount} órdenes completadas`}
          icon={<ShoppingCart className="text-blue-500" />}
          isLoading={isLoading}
        />
        <KpiCard
          title="Flujo de Caja Neto"
          value={formatCurrency(kpis.netCashflow)}
          description="Ingresos menos egresos"
          icon={<DollarSign className="text-amber-500" />}
          isLoading={isLoading}
        />
        <KpiCard
          title="Stock Total Disponible"
          value={`${formatKilos(kpis.availableStock)} kg`}
          description="En todas las bodegas"
          icon={<Warehouse className="text-slate-500" />}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda (más ancha) */}
          <div className="lg:col-span-2 space-y-6">
             <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">Flujo de Caja Semanal</CardTitle>
                    <CardDescription className="text-slate-400">Comparativa de ingresos y egresos registrados por semana.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <IncomeVsExpenseChart data={financialMovements} />
                  </CardContent>
              </Card>
               <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-white">Ventas por Calibre (Kilos)</CardTitle>
                    <CardDescription className="text-slate-400">Kilos vendidos de cada calibre por orden de venta completada.</CardDescription>
                </CardHeader>
                <CardContent>
                    <SalesByOrderChart data={salesOrders} />
                </CardContent>
              </Card>
          </div>
          {/* Columna Derecha */}
          <div className="space-y-6">
              <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">Resumen Ejecutivo IA</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AiSummary financialData={financialDataString} />
                  </CardContent>
              </Card>
              <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">Compras por Proveedor (Top 5)</CardTitle>
                    <CardDescription className="text-slate-400">Total de Kilos comprados a cada proveedor.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <PurchasesBySupplierChart data={purchaseOrders} suppliers={contacts}/>
                  </CardContent>
              </Card>
          </div>
      </div>
      
      {/* Fila inferior de gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
         <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Compras Semanales ($)</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyPurchasesChart data={purchaseOrders} />
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Ventas Semanales ($)</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklySalesChart data={salesOrders} />
          </CardContent>
        </Card>
         <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
                <CardTitle className="text-white">Monto de Compras por Producto-Calibre</CardTitle>
                <CardDescription className="text-slate-400">Monto total gastado en cada tipo de producto y calibre.</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto">
                <PurchasesByProductCaliberChart data={purchaseOrders} />
            </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
                <CardTitle className="text-white">Stock Actual por Calibre</CardTitle>
                <CardDescription className="text-slate-400">Distribución de Kilos disponibles en inventario.</CardDescription>
            </CardHeader>
            <CardContent>
                <CaliberDistributionChart data={inventory} />
            </CardContent>
        </Card>
      </div>

    </div>
  );
}