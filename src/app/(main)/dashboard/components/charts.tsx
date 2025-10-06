
'use client';

import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Pie,
  PieChart,
  Cell,
  CartesianGrid,
} from 'recharts';
import { FinancialMovement, PurchaseOrder, SalesOrder, InventoryItem } from '@/lib/types';
import { format, getWeek, parseISO } from 'date-fns';
import { useMasterData } from '@/hooks/use-master-data';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

const formatKilos = (value: number) =>
  `${new Intl.NumberFormat('es-CL').format(value)} kg`;

// Weekly Purchases Chart
export function WeeklyPurchasesChart({ data }: { data: PurchaseOrder[] }) {
  const weeklyData = data
    .filter((order) => order.status === 'completed')
    .reduce((acc, order) => {
      const week = getWeek(parseISO(order.date));
      acc[week] = (acc[week] || 0) + order.totalAmount;
      return acc;
    }, {} as { [week: number]: number });

  const chartData = Object.entries(weeklyData).map(([week, total]) => ({
    name: `Semana ${week}`,
    Compras: total,
  })).sort((a, b) => parseInt(a.name.split(' ')[1]) - parseInt(b.name.split(' ')[1]));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} />
        <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickFormatter={(value) => `$${Number(value) / 1000000}M`} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))',
          }}
          formatter={(value: number) => formatCurrency(value)}
        />
        <Legend wrapperStyle={{fontSize: "12px"}}/>
        <Bar dataKey="Compras" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Weekly Sales Chart
export function WeeklySalesChart({ data }: { data: SalesOrder[] }) {
  const weeklyData = data
    .filter((order) => order.status === 'completed')
    .reduce((acc, order) => {
      const week = getWeek(parseISO(order.date));
      acc[week] = (acc[week] || 0) + order.totalAmount;
      return acc;
    }, {} as { [week: number]: number });

  const chartData = Object.entries(weeklyData).map(([week, total]) => ({
    name: `Semana ${week}`,
    Ventas: total,
  })).sort((a, b) => parseInt(a.name.split(' ')[1]) - parseInt(b.name.split(' ')[1]));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} />
        <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickFormatter={(value) => `$${Number(value) / 1000000}M`} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))',
          }}
          formatter={(value: number) => formatCurrency(value)}
        />
        <Legend wrapperStyle={{fontSize: "12px"}}/>
        <Bar dataKey="Ventas" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Sales by Order Chart (New)
export function SalesByOrderChart({ data }: { data: SalesOrder[] }) {
    const { calibers } = useMasterData();
    const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

    const chartData = data
        .filter(order => order.status === 'completed')
        .map(order => {
            const orderData: { [key: string]: string | number } = { name: order.id };
            calibers.forEach(caliber => {
                const totalKilosForCaliber = order.items
                    .filter(item => item.caliber === caliber.name && item.unit === 'Kilos')
                    .reduce((sum, item) => sum + item.quantity, 0);
                if (totalKilosForCaliber > 0) {
                    orderData[`${caliber.name} (${caliber.code})`] = totalKilosForCaliber;
                }
            });
            return orderData;
        })
        .filter(d => Object.keys(d).length > 1) // Only include orders with items
        .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} />
        <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickFormatter={(value) => `${Number(value) / 1000}k`} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))',
          }}
          formatter={(value: number, name: string) => [`${formatKilos(value)}`, name]}
        />
        <Legend />
        {calibers.map((caliber, index) => (
            <Bar key={caliber.name} dataKey={`${caliber.name} (${caliber.code})`} stackId="a" fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}


// Income vs Expense Chart
export function IncomeVsExpenseChart({ data }: { data: FinancialMovement[] }) {
    const weeklyData: { [week: number]: { income: number; expense: number } } = {};

    data.forEach(mov => {
        const week = getWeek(parseISO(mov.date));
        if(!weeklyData[week]) weeklyData[week] = { income: 0, expense: 0 };
        
        if (mov.type === 'income') {
            weeklyData[week].income += mov.amount;
        } else if (mov.type === 'expense') {
            weeklyData[week].expense += mov.amount;
        }
    });

    const chartData = Object.entries(weeklyData).map(([week, data]) => ({
        name: `Semana ${week}`,
        Ingresos: data.income,
        Egresos: data.expense,
    })).sort((a, b) => parseInt(a.name.split(' ')[1]) - parseInt(b.name.split(' ')[1]));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} />
        <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickFormatter={(value) => `$${Number(value) / 1000000}M`} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))',
          }}
          formatter={(value: number) => formatCurrency(value)}
        />
        <Legend wrapperStyle={{fontSize: "12px"}}/>
        <Bar dataKey="Ingresos" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Egresos" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}


// Caliber Distribution Chart
export function CaliberDistributionChart({ data }: { data: InventoryItem[] }) {
    const { calibers } = useMasterData();
    const caliberMap = new Map(calibers.map((c, i) => [c.name, i]));
    
    const chartData = data
        .filter(item => item.stock > 0)
        .map(item => {
            const caliberInfo = calibers.find(c => c.name === item.caliber);
            return {
                name: caliberInfo ? `${item.product.substring(0,3)}. ${caliberInfo.name} (${caliberInfo.code})` : `${item.product.substring(0,3)}. ${item.caliber}`,
                value: item.stock,
                caliberName: item.caliber,
            };
        })
        .sort((a, b) => {
            const orderA = caliberMap.get(a.caliberName) ?? Infinity;
            const orderB = caliberMap.get(b.caliberName) ?? Infinity;
            return orderA - orderB;
        });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={10} angle={-45} textAnchor="end" height={80} interval={0} />
        <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickFormatter={(value) => `${Number(value) / 1000}k`} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))',
          }}
          formatter={(value: number) => formatKilos(value)}
        />
        <Bar dataKey="value" name="Stock" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Purchases by Supplier Chart
export function PurchasesBySupplierChart({ data, suppliers }: { data: PurchaseOrder[], suppliers: {id: string, name: string}[] }) {
  const supplierData = data
    .filter((order) => order.status === 'completed')
    .reduce((acc, order) => {
      const supplierName = suppliers.find(s => s.id === order.supplierId)?.name || 'Desconocido';
      acc[supplierName] = (acc[supplierName] || 0) + order.totalKilos;
      return acc;
    }, {} as { [name: string]: number });

  const chartData = Object.entries(supplierData).map(([name, total]) => ({
    name,
    Kilos: total,
  })).sort((a, b) => b.Kilos - a.Kilos);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" stroke="hsl(var(--foreground))" fontSize={12} tickFormatter={(value) => `${Number(value) / 1000}k`} />
        <YAxis type="category" dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} width={120} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))',
          }}
          formatter={(value: number) => formatKilos(value)}
        />
        <Bar dataKey="Kilos" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Purchases by Product/Caliber Chart
export function PurchasesByProductCaliberChart({ data }: { data: PurchaseOrder[] }) {
  const { calibers } = useMasterData();
  const caliberMap = new Map(calibers.map((c, i) => [c.name, i]));

  const productData = data
    .filter(order => order.status === 'completed')
    .flatMap(order => order.items.map(item => ({...item, total: item.quantity * item.price})))
    .reduce((acc, item) => {
      const key = `${item.product} - ${item.caliber}`;
      acc[key] = {
        total: (acc[key]?.total || 0) + item.total,
        caliberName: item.caliber,
      };
      return acc;
    }, {} as Record<string, { total: number, caliberName: string }>);

  const chartData = Object.entries(productData).map(([name, data]) => ({
    name,
    Monto: data.total,
    caliberName: data.caliberName,
  })).sort((a,b) => {
      const orderA = caliberMap.get(a.caliberName) ?? Infinity;
      const orderB = caliberMap.get(b.caliberName) ?? Infinity;
      return orderA - orderB;
  });

  return (
    <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 30)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" stroke="hsl(var(--foreground))" fontSize={12} tickFormatter={(value) => `$${Number(value) / 1000000}M`} />
        <YAxis type="category" dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))',
          }}
          formatter={(value: number) => formatCurrency(value)}
        />
        <Bar dataKey="Monto" fill="hsl(var(--chart-5))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
