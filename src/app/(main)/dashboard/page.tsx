
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  purchaseOrders as initialPurchaseOrders,
  salesOrders as initialSalesOrders,
  serviceOrders as initialServiceOrders,
  financialMovements as initialFinancialMovements,
  getInventory,
  contacts as initialContacts
} from '@/lib/data';
import { PurchaseOrder, SalesOrder, ServiceOrder, FinancialMovement, BankAccount, InventoryItem, Contact } from '@/lib/types';
import KpiCard from './components/kpi-card';
import { Boxes, DollarSign, MinusCircle, PlusCircle, ShoppingBag, ShoppingCart, TrendingUp, Wallet, Scale, Users } from 'lucide-react';
import { WeeklyPurchasesChart, CaliberDistributionChart, IncomeVsExpenseChart, WeeklySalesChart, PurchasesBySupplierChart, PurchasesByProductCaliberChart } from './components/charts';
import AiSummary from './components/ai-summary';
import { Skeleton } from '@/components/ui/skeleton';
import { useMasterData } from '@/hooks/use-master-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DashboardPage() {
  const [purchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [salesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
  const [serviceOrders] = useLocalStorage<ServiceOrder[]>('serviceOrders', initialServiceOrders);
  const [financialMovements] = useLocalStorage<FinancialMovement[]>('financialMovements', initialFinancialMovements);
  const [contacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
  const [inventory, setInventory] = useLocalStorage<InventoryItem[]>('inventory', []);
  const { bankAccounts } = useMasterData();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Note: getInventory might be computationally expensive.
    // For a real app, this should be calculated on the backend or memoized more heavily.
    setInventory(getInventory(purchaseOrders, salesOrders));
  }, [purchaseOrders, salesOrders, isClient, setInventory]);
  
  const totalKilosPurchased = useMemo(() =>
    purchaseOrders
      .filter(po => po.status === 'completed')
      .reduce((sum, po) => sum + po.totalKilos, 0),
    [purchaseOrders]
  );

  const totalKilosSold = useMemo(() =>
    salesOrders
      .filter(so => so.status === 'completed')
      .reduce((sum, so) => sum + so.totalKilos, 0),
    [salesOrders]
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

  const totalSalesAmount = useMemo(() =>
    salesOrders
      .filter(so => so.status === 'completed')
      .reduce((sum, order) => sum + order.totalAmount, 0),
    [salesOrders]
  );
  
  const totalPurchasesAmount = useMemo(() =>
    purchaseOrders
      .filter(po => po.status === 'completed')
      .reduce((sum, order) => sum + order.totalAmount, 0),
    [purchaseOrders]
  );

  const totalPaidForPurchases = useMemo(() => {
    const purchaseOrderIds = new Set(purchaseOrders.filter(po => po.status === 'completed').map(po => po.id));
    return financialMovements
      .filter(fm => fm.type === 'expense' && fm.relatedDocument?.type === 'OC' && purchaseOrderIds.has(fm.relatedDocument.id))
      .reduce((sum, fm) => sum + fm.amount, 0);
  }, [financialMovements, purchaseOrders]);

  const supplierCount = useMemo(() => {
    return new Set(contacts.filter(c => c.type === 'supplier' || c.type === 'both').map(c => c.id)).size;
  }, [contacts]);


  const totalAccountBalance = useMemo(() => {
    const balanceByAccount: Record<string, number> = {};

    bankAccounts.forEach(acc => {
        balanceByAccount[acc.id] = acc.initialBalance;
    });

    financialMovements.forEach(mov => {
        if(mov.destinationAccountId && balanceByAccount[mov.destinationAccountId]) {
             if (mov.type === 'income' || mov.type === 'traspaso') {
                balanceByAccount[mov.destinationAccountId] += mov.amount;
            }
        }
        if(mov.sourceAccountId && balanceByAccount[mov.sourceAccountId]) {
            if (mov.type === 'expense' || mov.type === 'traspaso') {
                balanceByAccount[mov.sourceAccountId] -= mov.amount;
            }
        }
    });

    return Object.values(balanceByAccount).reduce((sum, balance) => sum + balance, 0);
  }, [financialMovements, bankAccounts]);
  
  const totalStockKilos = useMemo(() => 
    inventory.reduce((sum, item) => sum + item.stock, 0),
  [inventory]);
  
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
      <h1 className="font-headline text-3xl">Dashboard</h1>
      
      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="purchases">Compras</TabsTrigger>
          <TabsTrigger value="sales">Ventas</TabsTrigger>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="mt-6">
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
          <div className="grid gap-6 lg:grid-cols-3 mt-6">
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
          </div>
        </TabsContent>
        
        <TabsContent value="purchases" className="mt-6">
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {isClient ? (
                <>
                  <KpiCard
                    title="Monto Total Comprado"
                    value={formatCurrency(totalPurchasesAmount)}
                    icon={<ShoppingBag className="h-5 w-5 text-cyan-500" />}
                    description="Suma de todas las O/C completadas"
                  />
                  <KpiCard
                    title="Kilos Totales Comprados"
                    value={formatKilos(totalKilosPurchased)}
                    icon={<Scale className="h-5 w-5 text-cyan-500" />}
                    description="Total de kilos en O/C completadas"
                  />
                   <KpiCard
                    title="Total Pagado (Compras)"
                    value={formatCurrency(totalPaidForPurchases)}
                    icon={<DollarSign className="h-5 w-5 text-cyan-500" />}
                    description="Suma de pagos asociados a O/C"
                  />
                  <KpiCard
                    title="Nº de Proveedores"
                    value={supplierCount.toString()}
                    icon={<Users className="h-5 w-5 text-cyan-500" />}
                    description="Total de proveedores activos"
                  />
                </>
              ) : (
                 Array.from({ length: 4 }).map((_, i) => (
                   <Card key={`sk-p-${i}`}><CardHeader><Skeleton className="h-5 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /><Skeleton className="h-3 w-48 mt-2" /></CardContent></Card>
                ))
              )}
           </div>
           <div className="grid gap-6 mt-6 lg:grid-cols-2">
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
                  <CardTitle className='font-headline text-xl'>Kilos Comprados por Proveedor</CardTitle>
                </CardHeader>
                <CardContent>
                  {isClient ? <PurchasesBySupplierChart data={purchaseOrders} suppliers={contacts} /> : <Skeleton className="h-[300px] w-full" />}
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className='font-headline text-xl'>Monto de Compra por Producto y Calibre</CardTitle>
                </CardHeader>
                <CardContent>
                  {isClient ? <PurchasesByProductCaliberChart data={purchaseOrders} /> : <Skeleton className="h-[400px] w-full" />}
                </CardContent>
              </Card>
           </div>
        </TabsContent>
        
        <TabsContent value="sales" className="mt-6">
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {isClient ? (
                <>
                  <KpiCard
                    title="Monto Total Vendido"
                    value={formatCurrency(totalSalesAmount)}
                    icon={<ShoppingCart className="h-5 w-5 text-lime-500" />}
                    description="Suma de todas las O/V completadas"
                  />
                  <KpiCard
                    title="Kilos Totales Vendidos"
                    value={formatKilos(totalKilosSold)}
                    icon={<Scale className="h-5 w-5 text-lime-500" />}
                    description="Total de kilos en O/V completadas"
                  />
                </>
              ) : (
                 Array.from({ length: 2 }).map((_, i) => (
                   <Card key={`sk-s-${i}`}><CardHeader><Skeleton className="h-5 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /><Skeleton className="h-3 w-48 mt-2" /></CardContent></Card>
                ))
              )}
           </div>
           <div className="grid gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className='font-headline text-xl'>Ventas Semanales</CardTitle>
                </CardHeader>
                <CardContent>
                  {isClient ? <WeeklySalesChart data={salesOrders} /> : <Skeleton className="h-[300px] w-full" />}
                </CardContent>
              </Card>
           </div>
        </TabsContent>
        
        <TabsContent value="inventory" className="mt-6">
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {isClient ? (
                <>
                  <KpiCard
                    title="Kilos Totales en Stock"
                    value={formatKilos(totalStockKilos)}
                    icon={<Boxes className="h-5 w-5 text-amber-500" />}
                    description="Stock actual sumando todas las bodegas"
                  />
                </>
              ) : (
                 <Card><CardHeader><Skeleton className="h-5 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /><Skeleton className="h-3 w-48 mt-2" /></CardContent></Card>
              )}
           </div>
           <div className="grid gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className='font-headline text-xl'>Distribución por Calibre (Stock)</CardTitle>
                </CardHeader>
                <CardContent>
                  {isClient ? <CaliberDistributionChart data={inventory} /> : <Skeleton className="h-[300px] w-full" />}
                </CardContent>
              </Card>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

    
