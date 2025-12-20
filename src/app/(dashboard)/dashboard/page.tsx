
"use client";

import React, { useMemo } from 'react';
import { useMasterData } from '@/hooks/use-master-data';
import { useOperations } from '@/hooks/use-operations'; 
import { useSalesOrdersCRUD } from '@/hooks/use-sales-orders-crud';
import KpiCard from './components/kpi-card';
import { 
  ComparativeFinancialChart,
  ProductFlowChart,
  CashFlowTrendChart,
  TopSuppliersChart
} from './components/charts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import AiSummary from './components/ai-summary';
import { 
    DollarSign, 
    ShoppingCart, 
    TrendingUp, 
    Warehouse,
    BarChart3,
    PieChart,
    Activity
} from "lucide-react";
import { PurchaseOrder, SalesOrder } from '@/lib/types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
const formatKilos = (value: number) =>
  new Intl.NumberFormat('es-CL').format(value);

export default function DashboardPage() {
  const { contacts, inventory, isLoading: loadingMaster } = useMasterData();
  const { purchaseOrders, financialMovements, inventoryAdjustments, isLoading: loadingOps } = useOperations();
  const { salesOrders, isLoading: loadingSales } = useSalesOrdersCRUD();
  const isLoading = loadingMaster || loadingOps || loadingSales;

  const completedPurchases: PurchaseOrder[] = useMemo(() => {
    return (purchaseOrders || []).filter(o => o.status === 'completed' || o.status === 'received');
  }, [purchaseOrders]);
  
  const completedSales: SalesOrder[] = useMemo(() => {
    return (salesOrders || []).filter(o => o.status === 'dispatched' || o.status === 'invoiced');
  }, [salesOrders]);

  const availableStock = useMemo(() => {
      let stock = 0;
      completedPurchases.forEach(o => o.items.forEach(i => stock += i.quantity));
      completedSales.forEach(o => o.items.forEach(i => stock -= i.quantity));
      inventoryAdjustments.forEach(a => { stock += (a.type === 'increase' ? a.quantity : -a.quantity) });
      return stock;
  }, [completedPurchases, completedSales, inventoryAdjustments]);

  const { kpis, financialDataString } = useMemo(() => {
    if (isLoading) return { kpis: null, financialDataString: '' };

    const { totalNetAmount: totalSalesNet, totalVatAmount: totalSalesVat } = completedSales.reduce((acc, order) => {
        const net = order.totalAmount || 0;
        acc.totalNetAmount += net;
        if (order.includeVat !== false) {
            acc.totalVatAmount += net * 0.19;
        }
        return acc;
    }, { totalNetAmount: 0, totalVatAmount: 0 });

    const { totalNetAmount: totalPurchasesNet, totalVatAmount: totalPurchasesVat } = completedPurchases.reduce((acc, order) => {
        const net = order.totalAmount || 0;
        acc.totalNetAmount += net;
        if (order.includeVat !== false) {
            acc.totalVatAmount += net * 0.19;
        }
        return acc;
    }, { totalNetAmount: 0, totalVatAmount: 0 });

    
    const totalIncome = financialMovements.filter(m => m.type === 'income').reduce((sum, m) => sum + (m.amount || 0), 0);
    const totalExpense = financialMovements.filter(m => m.type === 'expense').reduce((sum, m) => sum + (m.amount || 0), 0);
    const netCashflow = totalIncome - totalExpense;

    const inventoryDetails = (inventory || []).map(item => 
      `- Producto: ${item.name}, Calibre: ${item.caliber}, Stock: ${item.stock} kg`
    ).join('\n');

    const kpiData = {
      totalSales: { net: totalSalesNet, vat: totalSalesVat },
      totalPurchases: { net: totalPurchasesNet, vat: totalPurchasesVat },
      netCashflow,
      availableStock,
      completedSalesCount: completedSales.length,
      completedPurchasesCount: completedPurchases.length,
    };

    const financialString = `
      DATOS FINANCIEROS:
      - Ventas Netas: ${formatCurrency(totalSalesNet)}
      - Compras Netas: ${formatCurrency(totalPurchasesNet)}
      - Flujo de Caja Neto (Ingresos - Egresos): ${formatCurrency(netCashflow)}
      
      DATOS DE INVENTARIO:
      - Stock Total Disponible (Kg): ${formatKilos(availableStock)}
      - Desglose de Inventario:
      ${inventoryDetails || "No hay datos de inventario detallado."}
    `;
    
    return { kpis: kpiData, financialDataString: financialString };
  }, [completedPurchases, completedSales, financialMovements, availableStock, isLoading, inventory]);


  if (isLoading || !kpis) {
      return null;
  }

  const cardClass = "bg-slate-900 border-slate-800 shadow-lg hover:border-slate-700 transition-all";

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-950 min-h-screen">
      <div className="flex justify-between items-end">
        <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard Gerencial</h2>
            <p className="text-slate-400">Resumen estratégico de operaciones y finanzas.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          title="Ventas Totales" 
          value={formatCurrency(kpis.totalSales.net)} 
          description={`en ${kpis.completedSalesCount} OP despachadas`}
          subValue={`(+ ${formatCurrency(kpis.totalSales.vat)} IVA) = ${formatCurrency(kpis.totalSales.net + kpis.totalSales.vat)}`}
          icon={<TrendingUp className="text-blue-500" />} 
          isLoading={isLoading} 
        />
        <KpiCard 
          title="Compras Totales" 
          value={formatCurrency(kpis.totalPurchases.net)} 
          description={`en ${kpis.completedPurchasesCount} OC recepcionadas`}
          subValue={`(+ ${formatCurrency(kpis.totalPurchases.vat)} IVA) = ${formatCurrency(kpis.totalPurchases.net + kpis.totalPurchases.vat)}`}
          icon={<ShoppingCart className="text-amber-500" />} 
          isLoading={isLoading} 
        />
        <KpiCard 
          title="Flujo de Caja Neto" 
          value={formatCurrency(kpis.netCashflow)} 
          description="Ingresos reales - Egresos" 
          icon={<DollarSign className={kpis.netCashflow >= 0 ? "text-emerald-500" : "text-red-500"} />} 
          isLoading={isLoading} 
        />
        <KpiCard 
          title="Stock Disponible" 
          value={`${formatKilos(kpis.availableStock)} kg`} 
          description="Inventario actual global" 
          icon={<Warehouse className="text-purple-500" />} 
          isLoading={isLoading} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
             <Card className={cardClass}>
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2"><BarChart3 className="h-5 w-5 text-blue-500"/> Rendimiento Comercial</CardTitle>
                    <CardDescription className="text-slate-400">Comparativa semanal de Ventas (Línea) vs. Compras (Barras).</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ComparativeFinancialChart sales={completedSales} purchases={completedPurchases} />
                  </CardContent>
              </Card>
          </div>
          
          <div className="space-y-6">
              <Card className="bg-gradient-to-br from-slate-900 to-blue-950 border-blue-900/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2"><Activity className="h-5 w-5 text-blue-400"/> Análisis IA</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AiSummary financialData={financialDataString} />
                  </CardContent>
              </Card>
              <Card className={cardClass}>
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2"><PieChart className="h-5 w-5 text-amber-500"/> Top Proveedores (Kg)</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <TopSuppliersChart data={completedPurchases} suppliers={contacts}/>
                  </CardContent>
              </Card>
          </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Card className={cardClass}>
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2"><Warehouse className="h-5 w-5 text-purple-500"/> Rotación de Inventario (Kilos)</CardTitle>
                <CardDescription className="text-slate-400">Productos más comprados vs. vendidos.</CardDescription>
            </CardHeader>
            <CardContent>
                <ProductFlowChart sales={completedSales} purchases={completedPurchases} />
            </CardContent>
        </Card>

        <Card className={cardClass}>
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
