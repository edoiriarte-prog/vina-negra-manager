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
import { Boxes, DollarSign, MinusCircle, PlusCircle, Truck } from 'lucide-react';
import { WeeklyRevenueChart, ExpenseBreakdownChart, KiloComparisonChart, CaliberDistributionChart } from './components/charts';
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
  const netResult = totalRevenue - totalExpenses;

  const financialDataString = `
    Ingresos Totales: ${totalRevenue.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
    Egresos Totales: ${totalExpenses.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
    - Costo Compras: ${totalPurchaseExpenses.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
    - Costo Servicios: ${totalServiceExpenses.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
    Resultado Final: ${netResult.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
    Kilos Comprados: ${totalKilosPurchased.toLocaleString('es-CL')} kg
    Kilos Vendidos: ${totalKilosSold.toLocaleString('es-CL')} kg
  `;


  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isClient ? (
          <>
            <KpiCard
              title="Ingresos"
              value={`$${(totalRevenue / 1000000).toFixed(1)}M`}
              icon={<PlusCircle className="h-5 w-5 text-primary" />}
              description="Total de ingresos registrados"
            />
            <KpiCard
              title="Egresos"
              value={`$${(totalExpenses / 1000000).toFixed(1)}M`}
              icon={<MinusCircle className="h-5 w-5 text-destructive" />}
              description={`Compras: $${(totalPurchaseExpenses/1000000).toFixed(1)}M, Servicios: $${(totalServiceExpenses/1000000).toFixed(1)}M`}
            />
            <KpiCard
              title="Resultado Neto"
              value={`$${(netResult / 1000000).toFixed(1)}M`}
              icon={<DollarSign className="h-5 w-5 text-accent-foreground" />}
              description="Ingresos menos egresos"
            />
             <KpiCard
              title="Kilos (Comprado/Vendido)"
              value={`${(totalKilosPurchased / 1000).toFixed(1)}k / ${(
                totalKilosSold / 1000
              ).toFixed(1)}k kg`}
              icon={<Boxes className="h-5 w-5 text-muted-foreground" />}
              description="Volumen total de fruta"
            />
          </>
        ) : (
          <>
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
            <CardTitle className='font-headline text-xl'>Ingresos Semanales</CardTitle>
          </CardHeader>
          <CardContent>
            {isClient ? <WeeklyRevenueChart data={financialMovements} /> : <Skeleton className="h-[300px] w-full" />}
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
