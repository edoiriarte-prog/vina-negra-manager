"use client";

import React, { useMemo } from 'react';
import { useMasterData } from '@/hooks/use-master-data';
import { useOperations } from '@/hooks/use-operations'; 
import KpiCard from './components/kpi-card';
import { 
  ComparativeFinancialChart,
  ProductFlowChart,
  CashFlowTrendChart,
  TopSuppliersChart
} from './components/charts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import AiSummary from './components/ai-summary';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    DollarSign, 
    ShoppingCart, 
    TrendingUp, 
    Warehouse,
    BarChart3,
    PieChart,
    Activity
} from "lucide-react";
import { InventoryItem } from '@/lib/types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
const formatKilos = (value: number) =>
  new Intl.NumberFormat('es-CL').format(value);

export default function DashboardPage() {
  const { contacts, isLoading: loadingMaster } = useMasterData();
  const { purchaseOrders, salesOrders, financialMovements, inventoryAdjustments, isLoading: loadingOps } = useOperations();
  const isLoading = loadingMaster || loadingOps;

  // Cálculo de Stock en tiempo real
  const availableStock = useMemo(() => {
      let stock = 0;
      purchaseOrders.forEach(o => { if(o.status === 'completed' || o.status === 'received') o.items.forEach(i => stock += i.quantity) });
      salesOrders.forEach(o => { if(o.status === 'completed' || o.status === 'dispatched' || o.status === 'invoiced') o.items.forEach(i => stock -= i.quantity) });
      inventoryAdjustments.forEach(a => { stock += (a.type === 'increase' ? a.quantity : -a.quantity) });
      return stock;
  }, [purchaseOrders, salesOrders, inventoryAdjustments]);

  const { kpis, financialDataString } = useMemo(() => {
    if (isLoading) return { kpis: null, financialDataString: '' };

    const completedPurchases = purchaseOrders.filter(o => o.status === 'completed' || o.status === 'received');
    const completedSales = salesOrders.filter(o => o.status === 'completed' || o.status === 'dispatched' || o.status === 'invoiced');

    const totalPurchaseAmount = completedPurchases.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalSalesAmount = completedSales.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    
    const totalIncome = financialMovements.filter(m => m.type === 'income').reduce((sum, m) => sum + (m.amount || 0), 0);
    const totalExpense = financialMovements.filter(m => m.type === 'expense').reduce((sum, m) => sum + (m.amount || 0), 0);
    const netCashflow = totalIncome - totalExpense;

    const kpiData = {
      totalSalesAmount,
      totalPurchaseAmount,
      netCashflow,
      availableStock,
      completedSalesCount: completedSales.length,
      completedPurchasesCount: completedPurchases.length,
    };

    // Texto para la IA
    const financialString = `Ventas: ${formatCurrency(totalSalesAmount)}. Compras: ${formatCurrency(totalPurchaseAmount)}. Flujo Neto: ${formatCurrency(netCashflow)}. Stock: ${formatKilos(availableStock)}kg.`;
    
    return { kpis: kpiData, financialDataString: financialString };
  }, [purchaseOrders, salesOrders, financialMovements, availableStock, isLoading]);


  if (isLoading || !kpis) {
      return <div className="p-8"><Skeleton className="h-96 w-full rounded-xl bg-slate-800" /></div>
  }

  const cardStyle = "bg-slate-900 border-slate-800 shadow-lg hover:border-slate-700 transition-all";

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-950 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard Gerencial</h2>
            <p className="text-slate-400">Resumen estratégico de operaciones y finanzas.</p>
        </div>
      </div>

      {/* 1. KPIs Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Ventas Totales" value={formatCurrency(kpis.totalSalesAmount)} description={`${kpis.completedSalesCount} OP completadas`} icon={<TrendingUp className="text-blue-500" />} isLoading={isLoading} />
        <KpiCard title="Compras Totales" value={formatCurrency(kpis.totalPurchaseAmount)} description={`${kpis.completedPurchasesCount} OC recepcionadas`} icon={<ShoppingCart className="text-amber-500" />} isLoading={isLoading} />
        <KpiCard title="Flujo de Caja Neto" value={formatCurrency(kpis.netCashflow)} description="Ingresos reales - Egresos" icon={<DollarSign className={kpis.netCashflow >= 0 ? "text-emerald-500" : "text-red-500"} />} isLoading={isLoading} />
        <KpiCard title="Stock Disponible" value={`${formatKilos(kpis.availableStock)} kg`} description="Inventario actual global" icon={<Warehouse className="text-purple-500" />} isLoading={isLoading} />
      </div>

      {/* 2. Gráficos Estratégicos (Fila Superior) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico Grande: Comparativa Comercial */}
          <div className="lg:col-span-2">
             <Card className={cardStyle}>
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2"><BarChart3 className="h-5 w-5 text-blue-500"/> Rendimiento Comercial</CardTitle>
                    <CardDescription className="text-slate-400">Comparativa semanal de Ventas (Línea) vs. Compras (Barras).</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ComparativeFinancialChart sales={salesOrders} purchases={purchaseOrders} />
                  </CardContent>
              </Card>
          </div>
          
          {/* Columna Derecha: IA + Proveedores */}
          <div className="space-y-6">
              <Card className="bg-gradient-to-br from-slate-900 to-blue-950 border-blue-900/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2"><Activity className="h-5 w-5 text-blue-400"/> Análisis IA</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AiSummary financialData={financialDataString} />
                  </CardContent>
              </Card>
              <Card className={cardStyle}>
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2"><PieChart className="h-5 w-5 text-amber-500"/> Top Proveedores (Kg)</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <TopSuppliersChart data={purchaseOrders} suppliers={contacts}/>
                  </CardContent>
              </Card>
          </div>
      </div>
      
      {/* 3. Gráficos Operativos (Fila Inferior) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Card className={cardStyle}>
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2"><Warehouse className="h-5 w-5 text-purple-500"/> Rotación de Inventario (Kilos)</CardTitle>
                <CardDescription className="text-slate-400">Productos más comprados vs. vendidos.</CardDescription>
            </CardHeader>
            <CardContent>
                <ProductFlowChart sales={salesOrders} purchases={purchaseOrders} />
            </CardContent>
        </Card>

        <Card className={cardStyle}>
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2"><DollarSign className="h-5 w-5 text-emerald-500"/> Flujo de Caja Real</CardTitle>
            <CardDescription className="text-slate-400">Ingresos y Egresos de Tesorería.</CardDescription>
          </CardHeader>
          <CardContent>
            <CashFlowTrendChart data={financialMovements} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}