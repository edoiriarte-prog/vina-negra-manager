"use client";

import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  purchaseOrders as initialPurchaseOrders,
  salesOrders as initialSalesOrders,
  serviceOrders as initialServiceOrders,
  financialMovements as initialFinancialMovements,
  getInventory,
} from '@/lib/data';
import { PurchaseOrder, SalesOrder, ServiceOrder, FinancialMovement } from '@/lib/types';
import KpiCard from './components/kpi-card';
import { Boxes, DollarSign, MinusCircle, PlusCircle, ShoppingBag, ShoppingCart } from 'lucide-react';
import { WeeklyPurchasesChart, ExpenseBreakdownChart, KiloComparisonChart, CaliberDistributionChart } from './components/charts';
import AiSummary from './components/ai-summary';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const [purchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [salesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
  const [serviceOrders] = useLocalStorage<ServiceOrder[]>('serviceOrders', initialServiceOrders);
  const [financialMovements] = useLocalStorage<FinancialMovement[]>('financialMovements', initialFinancialMovements);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const inventory = getInventory(purchaseOrders, salesOrders);

  const totalKilosPurchased = purchaseOrders.reduce(
    (sum, po) => sum + po.totalKilos,
    0
  );
  const totalKilosSold = salesOrders.reduce(
    (sum, so) => sum + so.totalKilos,
    0
  );
  const totalRevenue = financialMovements
    .filter((m) => m.type === 'income')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalPurchaseExpenses = financialMovements
    .filter((m) => m.type === 'expense' && m.relatedOrder?.type === 'OC')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalServiceExpenses = serviceOrders.reduce(
    (sum, so) => sum + so.cost,
    0
  );
  const totalExpenses = totalPurchaseExpenses + totalServiceExpenses;

  const totalSalesAmount = salesOrders.reduce(
    (sum, order) => sum + order.totalAmount,
    0
  );
  const totalPurchasesAmount = purchaseOrders.reduce(
    (sum, order) => sum + order.totalAmount,
    0
  );
  
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(value);

  const formatKilos = (value: number) =>
    `${new Intl.NumberFormat('es-CL').format(value)} kg`;


  const financialDataString = `
    Ingresos Totales: ${formatCurrency(totalRevenue)}
    Egresos Totales: ${formatCurrency(totalExpenses)}
    - Costo Compras: ${formatCurrency(totalPurchaseExpenses)}
    - Costo Servicios: ${formatCurrency(totalServiceExpenses)}
    Kilos Comprados: ${formatKilos(totalKilosPurchased)}
    Kilos Vendidos: ${formatKilos(totalKilosSold)}
    Total O/V: ${formatCurrency(totalSalesAmount)}
    Total O/C: ${formatCurrency(totalPurchasesAmount)}
  `;


  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isClient ? (
          <>
            <KpiCard
              title="Ingresos (Pagos)"
              value={formatCurrency(totalRevenue)}
              icon={<PlusCircle className="h-5 w-5 text-green-500" />}
              description="Total de ingresos registrados"
            />
            <KpiCard
              title="Egresos (Pagos)"
              value={formatCurrency(totalExpenses)}
              icon={<MinusCircle className="h-5 w-5 text-red-500" />}
              description={`Compras: ${formatCurrency(totalPurchaseExpenses)}, Servicios: ${formatCurrency(totalServiceExpenses)}`}
            />
             <KpiCard
              title="Kilos Comprados"
              value={formatKilos(totalKilosPurchased)}
              icon={<ShoppingBag className="h-5 w-5 text-muted-foreground" />}
              description="Volumen total de fruta comprada"
            />
             <KpiCard
              title="Kilos Vendidos"
              value={formatKilos(totalKilosSold)}
              icon={<ShoppingCart className="h-5 w-5 text-muted-foreground" />}
              description="Volumen total de fruta vendida"
            />
             <KpiCard
              title="Total Ventas (O/V)"
              value={formatCurrency(totalSalesAmount)}
              icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
              description="Suma total de órdenes de venta"
            />
             <KpiCard
              title="Total Compras (O/C)"
              value={formatCurrency(totalPurchasesAmount)}
              icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
              description="Suma total de órdenes de compra"
            />
          </>
        ) : (
          <>
            <Card><CardHeader><Skeleton className="h-5 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /><Skeleton className="h-3 w-48 mt-2" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-5 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /><Skeleton className="h-3 w-48 mt-2" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-5 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /><Skeleton className="h-3 w-48 mt-2" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-5 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /><Skeleton className="h-3 w-48 mt-2" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-5 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /><Skeleton className="h-3 w-48 mt-2" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-5 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /><Skeleton className="h-3 w-48 mt-2" /></CardContent></Card>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
         <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className='font-headline text-xl'>Resumen Ejecutivo IA</CardTitle>
          </CardHeader>
          <CardContent>
            {isClient ? <AiSummary financialData={financialDataString} /> : <Skeleton className="h-24 w-full" />}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className='font-headline text-xl'>Compras Semanales</CardTitle>
          </CardHeader>
          <CardContent>
            {isClient ? <WeeklyPurchasesChart data={purchaseOrders} /> : <Skeleton className="h-[300px] w-full" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='font-headline text-xl'>Desglose de Egresos</CardTitle>
          </CardHeader>
          <CardContent>
            {isClient ? <ExpenseBreakdownChart purchases={totalPurchaseExpenses} services={totalServiceExpenses} /> : <Skeleton className="h-[300px] w-full" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='font-headline text-xl'>Comparativa Semanal de Kilos</CardTitle>
          </CardHeader>
          <CardContent>
            {isClient ? <KiloComparisonChart purchases={purchaseOrders} sales={salesOrders} /> : <Skeleton className="h-[300px] w-full" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='font-headline text-xl'>Distribución por Calibre (Stock)</CardTitle>
          </CardHeader>
          <CardContent>
            {isClient ? <CaliberDistributionChart data={inventory} /> : <Skeleton className="h-[300px] w-full" />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
