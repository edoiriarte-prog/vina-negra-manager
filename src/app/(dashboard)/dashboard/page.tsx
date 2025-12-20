"use client";

import React, { useMemo, useState } from 'react';
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
    Activity,
    Calendar as CalendarIcon,
    Boxes
} from "lucide-react";
import { PurchaseOrder, SalesOrder, InventoryItem } from '@/lib/types';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
const formatKilos = (value: number) =>
  new Intl.NumberFormat('es-CL').format(value);

export default function DashboardPage() {
  const { contacts, inventory, isLoading: loadingMaster } = useMasterData();
  const { purchaseOrders, financialMovements, inventoryAdjustments, isLoading: loadingOps } = useOperations();
  const { salesOrders, isLoading: loadingSales } = useSalesOrdersCRUD();

  const [filterDate, setFilterDate] = useState<Date | undefined>(new Date());
  
  const isLoading = loadingMaster || loadingOps || loadingSales;

  // --- CÁLCULOS FILTRADOS POR FECHA ---
  const { kpis, financialDataString } = useMemo(() => {
    if (isLoading || !filterDate) return { kpis: null, financialDataString: '' };

    const start = startOfMonth(filterDate);
    const end = endOfMonth(filterDate);
    
    const salesInPeriod = (salesOrders || []).filter(o => 
        (o.status === 'dispatched' || o.status === 'invoiced' || o.status === 'completed') && 
        isWithinInterval(parseISO(o.date), { start, end })
    );
    const purchasesInPeriod = (purchaseOrders || []).filter(o => 
        (o.status === 'completed' || o.status === 'received') &&
        isWithinInterval(parseISO(o.date), { start, end })
    );
    const financialsInPeriod = (financialMovements || []).filter(m => 
        isWithinInterval(parseISO(m.date), { start, end })
    );

    const { totalNetAmount: totalSalesNet, totalVatAmount: totalSalesVat } = salesInPeriod.reduce((acc, order) => {
        const net = order.totalAmount || 0;
        acc.totalNetAmount += net;
        if (order.includeVat !== false) acc.totalVatAmount += net * 0.19;
        return acc;
    }, { totalNetAmount: 0, totalVatAmount: 0 });

    const { totalNetAmount: totalPurchasesNet, totalVatAmount: totalPurchasesVat } = purchasesInPeriod.reduce((acc, order) => {
        const net = order.totalAmount || 0;
        acc.totalNetAmount += net;
        if (order.includeVat !== false) acc.totalVatAmount += net * 0.19;
        return acc;
    }, { totalNetAmount: 0, totalVatAmount: 0 });

    const totalIncome = financialsInPeriod.filter(m => m.type === 'income').reduce((sum, m) => sum + (m.amount || 0), 0);
    const totalExpense = financialsInPeriod.filter(m => m.type === 'expense').reduce((sum, m) => sum + (m.amount || 0), 0);
    const netCashflow = totalIncome - totalExpense;

    // El inventario SIEMPRE es el estado actual, no del período
    const inventorySummary = (inventory || []).reduce((acc, item) => {
        const stock = item.stock || 0;
        if (stock > 0) {
            if (!acc[item.name]) {
                acc[item.name] = { totalStock: 0, details: [] };
            }
            acc[item.name].totalStock += stock;
            acc[item.name].details.push(`- Calibre ${item.caliber}: ${formatKilos(stock)} kg`);
        }
        return acc;
    }, {} as Record<string, { totalStock: number, details: string[] }>);

    const inventoryDetailsString = Object.entries(inventorySummary).map(([name, data]) => 
      `Producto: ${name} (Total: ${formatKilos(data.totalStock)} kg)\n${data.details.join('\n')}`
    ).join('\n\n');
    
    const kpiData = {
      totalSales: { net: totalSalesNet, vat: totalSalesVat },
      totalPurchases: { net: totalPurchasesNet, vat: totalPurchasesVat },
      netCashflow,
      completedSalesCount: salesInPeriod.length,
      completedPurchasesCount: purchasesInPeriod.length,
    };

    const financialString = `
      DATOS FINANCIEROS (Período: ${format(filterDate, 'MMMM yyyy', {locale: es})}):
      - Ventas Netas: ${formatCurrency(totalSalesNet)}
      - Compras Netas: ${formatCurrency(totalPurchasesNet)}
      - Flujo de Caja Neto (Ingresos - Egresos): ${formatCurrency(netCashflow)}
      
      ESTADO ACTUAL DE INVENTARIO:
      ${inventoryDetailsString || "No hay datos de inventario."}
    `;
    
    return { kpis: kpiData, financialDataString: financialString };
  }, [salesOrders, purchaseOrders, financialMovements, inventory, isLoading, filterDate]);

  // --- CÁLCULO DE STOCK ACTUAL (INDEPENDIENTE DE FECHA) ---
  const { stockByProduct, totalStock } = useMemo(() => {
    if (!inventory) return { stockByProduct: [], totalStock: 0 };
    const summary = inventory.reduce((acc, item) => {
      const stock = item.stock || 0;
      if (stock > 0) {
        acc[item.name] = (acc[item.name] || 0) + stock;
      }
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(summary).reduce((sum, val) => sum + val, 0);
    const byProduct = Object.entries(summary).map(([name, stock]) => ({ name, stock, percentage: total > 0 ? (stock / total) * 100 : 0 }));

    return { stockByProduct: byProduct, totalStock: total };
  }, [inventory]);

  if (isLoading || !kpis) {
      return null;
  }

  const cardClass = "bg-slate-900 border-slate-800 shadow-lg hover:border-slate-700 transition-all";

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-950 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard Gerencial</h2>
            <p className="text-slate-400">Resumen estratégico de operaciones y finanzas.</p>
        </div>
        <Popover>
            <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-[260px] justify-start text-left font-normal bg-slate-900 border-slate-700 hover:bg-slate-800 hover:text-slate-100", !filterDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterDate ? format(filterDate, "MMMM yyyy", { locale: es }) : <span>Seleccione mes</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={filterDate} onSelect={setFilterDate} initialFocus month={filterDate} captionLayout="dropdown-buttons" fromYear={2020} toYear={2030} />
            </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          title="Ventas del Mes" 
          value={formatCurrency(kpis.totalSales.net)} 
          description={`en ${kpis.completedSalesCount} OP`}
          subValue={`(+ ${formatCurrency(kpis.totalSales.vat)} IVA) = ${formatCurrency(kpis.totalSales.net + kpis.totalSales.vat)}`}
          icon={<TrendingUp className="text-blue-500" />} 
          isLoading={isLoading} 
        />
        <KpiCard 
          title="Compras del Mes" 
          value={formatCurrency(kpis.totalPurchases.net)} 
          description={`en ${kpis.completedPurchasesCount} OC`}
          subValue={`(+ ${formatCurrency(kpis.totalPurchases.vat)} IVA) = ${formatCurrency(kpis.totalPurchases.net + kpis.totalPurchases.vat)}`}
          icon={<ShoppingCart className="text-amber-500" />} 
          isLoading={isLoading} 
        />
        <KpiCard 
          title="Flujo de Caja (Mes)" 
          value={formatCurrency(kpis.netCashflow)} 
          description="Ingresos reales - Egresos" 
          icon={<DollarSign className={kpis.netCashflow >= 0 ? "text-emerald-500" : "text-red-500"} />} 
          isLoading={isLoading} 
        />
        <Card className={cardClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Stock Actual</CardTitle>
            <Boxes className="text-purple-500 h-5 w-5"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatKilos(totalStock)} kg</div>
            <div className="space-y-1 mt-2 text-xs text-slate-400 max-h-[120px] overflow-y-auto pr-2">
              {stockByProduct.map(p => (
                <div key={p.name}>
                  <div className="flex justify-between">
                    <span>{p.name}</span>
                    <span className="font-mono">{formatKilos(p.stock)} kg</span>
                  </div>
                  <Progress value={p.percentage} className="h-1 bg-slate-800" indicatorClassName="bg-purple-500" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
             <Card className={cardClass}>
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2"><BarChart3 className="h-5 w-5 text-blue-500"/> Rendimiento Comercial</CardTitle>
                    <CardDescription className="text-slate-400">Comparativa semanal de Ventas (Línea) vs. Compras (Barras).</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ComparativeFinancialChart sales={salesOrders || []} purchases={purchaseOrders || []} />
                  </CardContent>
              </Card>
          </div>
          
          <div className="space-y-6">
              <Card className="bg-gradient-to-br from-slate-900 to-blue-950 border-blue-900/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2"><Activity className="h-5 w-5 text-blue-400"/> Análisis IA</CardTitle>
                    <CardDescription className="text-blue-200/50">Realiza consultas específicas sobre los datos del período y el stock actual.</CardDescription>
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
                      <TopSuppliersChart data={purchaseOrders || []} suppliers={contacts || []}/>
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
                <ProductFlowChart sales={salesOrders || []} purchases={purchaseOrders || []} />
            </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2"><DollarSign className="h-5 w-5 text-emerald-500"/> Flujo de Caja Real</CardTitle>
            <CardDescription className="text-slate-400">Ingresos y Egresos de Tesorería.</CardDescription>
          </CardHeader>
          <CardContent>
            <CashFlowTrendChart data={financialMovements || []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
