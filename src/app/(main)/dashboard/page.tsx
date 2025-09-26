"use client";

import { useState, useEffect, useMemo } from 'react';
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
import { PurchaseOrder, SalesOrder, ServiceOrder, FinancialMovement, BankAccount } from '@/lib/types';
import KpiCard from './components/kpi-card';
import { Boxes, DollarSign, MinusCircle, PlusCircle, ShoppingBag, ShoppingCart, TrendingUp, Wallet } from 'lucide-react';
import { WeeklyPurchasesChart, ExpenseBreakdownChart, KiloComparisonChart, CaliberDistributionChart, IncomeVsExpenseChart } from './components/charts';
import AiSummary from './components/ai-summary';
import { Skeleton } from '@/components/ui/skeleton';
import { useMasterData } from '@/hooks/use-master-data';

export default function DashboardPage() {
  const [purchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [salesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
  const [serviceOrders] = useLocalStorage<ServiceOrder[]>('serviceOrders', initialServiceOrders);
  const [financialMovements] = useLocalStorage<FinancialMovement[]>('financialMovements', initialFinancialMovements);
  const { bankAccounts } = useMasterData();
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
  
  const totalIncome = useMemo(() => 
    financialMovements
        .filter((m) => m.type === 'income')
        .reduce((sum, m) => sum + m.amount, 0),
    [financialMovements]
  );
  
  const totalExpense = useMemo(() =>
    financialMovements
        .filter((m) => m.type === 'expense')
        .reduce((sum, m) => sum + m.amount, 0),
    [financialMovements]
  );
  
  const grossProfit = totalIncome - totalExpense;

  const totalSalesAmount = salesOrders.reduce(
    (sum, order) => sum + order.totalAmount,
    0
  );
  const totalPurchasesAmount = purchaseOrders.reduce(
    (sum, order) => sum + order.totalAmount,
    0
  );

  const totalAccountBalance = useMemo(() => {
    const balanceByAccount: Record<string, number> = {};

    bankAccounts.forEach(acc => {
        balanceByAccount[acc.id] = acc.initialBalance;
    });

    financialMovements.forEach(mov => {
        if(balanceByAccount[mov.accountId]) {
            if (mov.type === 'income') {
                balanceByAccount[mov.accountId] += mov.amount;
            } else {
                balanceByAccount[mov.accountId] -= mov.amount;
            }
        }
    });

    return Object.values(balanceByAccount).reduce((sum, balance) => sum + balance, 0);
  }, [financialMovements, bankAccounts]);
  
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(value);

  const formatKilos = (value: number) =>
    `${new Intl.NumberFormat('es-CL').format(value)} kg`;


  const financialDataString = `
    Ingresos Totales: ${formatCurrency(totalIncome)}
    Egresos Totales: ${formatCurrency(totalExpense)}
    Utilidad Bruta: ${formatCurrency(grossProfit)}
    Saldo en Cuentas: ${formatCurrency(totalAccountBalance)}
    Kilos Comprados: ${formatKilos(totalKilosPurchased)}
    Kilos Vendidos: ${formatKilos(totalKilosSold)}
    Total O/V: ${formatCurrency(totalSalesAmount)}
    Total O/C: ${formatCurrency(totalPurchasesAmount)}
  `;


  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isClient ? (
          <>
            <KpiCard
              title="Ingresos (Pagos)"
              value={formatCurrency(totalIncome)}
              icon={<PlusCircle className="h-5 w-5 text-green-500" />}
              description="Total de ingresos registrados"
            />
            <KpiCard
              title="Egresos (Pagos)"
              value={formatCurrency(totalExpense)}
              icon={<MinusCircle className="h-5 w-5 text-red-500" />}
              description={`Suma de todos los pagos de egresos.`}
            />
             <KpiCard
              title="Utilidad Bruta"
              value={formatCurrency(grossProfit)}
              icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
              description="Ingresos menos egresos."
            />
            <KpiCard
              title="Saldo en Cuentas"
              value={formatCurrency(totalAccountBalance)}
              icon={<Wallet className="h-5 w-5 text-indigo-500" />}
              description="Suma de saldos de todas las cuentas."
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
             <Card key={i}><CardHeader><Skeleton className="h-5 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /><Skeleton className="h-3 w-48 mt-2" /></CardContent></Card>
          ))
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
            <CardTitle className='font-headline text-xl'>Ingresos vs Egresos (Semanal)</CardTitle>
          </CardHeader>
          <CardContent>
            {isClient ? <IncomeVsExpenseChart data={financialMovements} /> : <Skeleton className="h-[300px] w-full" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='font-headline text-xl'>Compras Semanales</CardTitle>
          </CardHeader>
          <CardContent>
            {isClient ? <WeeklyPurchasesChart data={purchaseOrders} /> : <Skeleton className="h-[300px] w-full" />}
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
