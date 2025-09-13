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

// Weekly Revenue Chart
export function WeeklyRevenueChart({ data }: { data: FinancialMovement[] }) {
  const weeklyData = data
    .filter((m) => m.type === 'income')
    .reduce((acc, m) => {
      const week = getWeek(parseISO(m.date));
      acc[week] = (acc[week] || 0) + m.amount;
      return acc;
    }, {} as { [week: number]: number });

  const chartData = Object.entries(weeklyData).map(([week, revenue]) => ({
    name: `Semana ${week}`,
    Ingresos: revenue,
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
        <Bar dataKey="Ingresos" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Expense Breakdown Chart
export function ExpenseBreakdownChart({ purchases, services }: { purchases: number; services: number }) {
  const data = [
    { name: 'Compras', value: purchases },
    { name: 'Servicios', value: services },
  ];
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))'];
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Kilo Comparison Chart
export function KiloComparisonChart({ purchases, sales }: { purchases: PurchaseOrder[]; sales: SalesOrder[] }) {
    const weeklyData: { [week: number]: { purchased: number; sold: number } } = {};

    purchases.forEach(p => {
        const week = getWeek(parseISO(p.date));
        if(!weeklyData[week]) weeklyData[week] = { purchased: 0, sold: 0 };
        weeklyData[week].purchased += p.totalKilos;
    });

    sales.forEach(s => {
        const week = getWeek(parseISO(s.date));
        if(!weeklyData[week]) weeklyData[week] = { purchased: 0, sold: 0 };
        weeklyData[week].sold += s.totalKilos;
    });

    const chartData = Object.entries(weeklyData).map(([week, data]) => ({
        name: `Semana ${week}`,
        Comprados: data.purchased,
        Vendidos: data.sold,
    })).sort((a, b) => parseInt(a.name.split(' ')[1]) - parseInt(b.name.split(' ')[1]));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} />
        <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickFormatter={(value) => `${value / 1000}k`} />
        <Tooltip formatter={(value: number) => formatKilos(value)} />
        <Legend wrapperStyle={{fontSize: "12px"}}/>
        <Line type="monotone" dataKey="Comprados" stroke="hsl(var(--chart-1))" strokeWidth={2} />
        <Line type="monotone" dataKey="Vendidos" stroke="hsl(var(--chart-2))" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Caliber Distribution Chart
export function CaliberDistributionChart({ data }: { data: InventoryItem[] }) {
    const chartData = data.filter(item => item.stock > 0).map(item => ({ name: item.caliber, value: item.stock }));
    const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];
    
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
