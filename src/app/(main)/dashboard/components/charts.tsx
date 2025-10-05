
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
} from 'recharts';
import { FinancialMovement, PurchaseOrder, SalesOrder, InventoryItem } from '@/lib/types';
import { format, getWeek, parseISO } from 'date-fns';

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
    const chartData = data.filter(item => item.stock > 0).map(item => ({ name: item.caliber, value: item.stock }));
    const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
    
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
            const RADIAN = Math.PI / 180;
            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
            const x = cx + radius * Math.cos(-midAngle * RADIAN);
            const y = cy + radius * Math.sin(-midAngle * RADIAN);
            return (
              <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                {`${(percent * 100).toFixed(0)}%`}
              </text>
            );
          }}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatKilos(value)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

    