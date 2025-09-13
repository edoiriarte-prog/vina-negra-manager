import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  purchaseOrders,
  salesOrders,
  serviceOrders,
  getInventory,
  financialMovements,
} from '@/lib/data';
import KpiCard from './components/kpi-card';
import { Boxes, DollarSign, MinusCircle, PlusCircle, Truck } from 'lucide-react';
import { WeeklyRevenueChart, ExpenseBreakdownChart, KiloComparisonChart, CaliberDistributionChart } from './components/charts';
import AiSummary from './components/ai-summary';

export default function DashboardPage() {
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
  const inventory = getInventory();

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
        <KpiCard
          title="Ingresos"
          value={`$${(totalRevenue / 1000000).toFixed(1)}M`}
          icon={<PlusCircle className="h-5 w-5 text-green-500" />}
          description="Total de ingresos registrados"
        />
        <KpiCard
          title="Egresos"
          value={`$${(totalExpenses / 1000000).toFixed(1)}M`}
          icon={<MinusCircle className="h-5 w-5 text-red-500" />}
          description={`Compras: $${(totalPurchaseExpenses/1000000).toFixed(1)}M, Servicios: $${(totalServiceExpenses/1000000).toFixed(1)}M`}
        />
        <KpiCard
          title="Resultado Final"
          value={`$${(netResult / 1000000).toFixed(1)}M`}
          icon={<DollarSign className="h-5 w-5 text-blue-500" />}
          description="Ingresos menos egresos"
        />
         <KpiCard
          title="Kilos (Comprado/Vendido)"
          value={`${(totalKilosPurchased / 1000).toFixed(1)}k / ${(
            totalKilosSold / 1000
          ).toFixed(1)}k kg`}
          icon={<Boxes className="h-5 w-5 text-orange-500" />}
          description="Volumen total de fruta"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
         <Card>
          <CardHeader>
            <CardTitle className='font-headline text-xl'>Resumen Ejecutivo IA</CardTitle>
          </CardHeader>
          <CardContent>
            <AiSummary financialData={financialDataString} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='font-headline text-xl'>Ingresos Semanales</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyRevenueChart data={financialMovements} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='font-headline text-xl'>Desglose de Egresos</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseBreakdownChart purchases={totalPurchaseExpenses} services={totalServiceExpenses} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='font-headline text-xl'>Comparativa Semanal de Kilos</CardTitle>
          </CardHeader>
          <CardContent>
            <KiloComparisonChart purchases={purchaseOrders} sales={salesOrders} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='font-headline text-xl'>Distribución por Calibre (Stock)</CardTitle>
          </CardHeader>
          <CardContent>
            <CaliberDistributionChart data={inventory} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
