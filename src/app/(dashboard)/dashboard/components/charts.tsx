
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO, startOfWeek, getWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { PurchaseOrder, SalesOrder, FinancialMovement, InventoryItem, Contact } from '@/lib/types';

// --- PALETA DE COLORES DE ALTO CONTRASTE (MODO OSCURO) ---
const COLORS = {
    primary: "#3b82f6",   // Azul brillante (Ventas)
    success: "#10b981",   // Verde esmeralda (Ingresos/Montos)
    warning: "#f59e0b",   // Ámbar (Compras)
    danger: "#ef4444",    // Rojo (Egresos)
    purple: "#8b5cf6",    // Violeta (Stock)
    cyan: "#06b6d4",      // Cian (Proveedores)
    text: "#94a3b8",      // Gris claro (Ejes)
    grid: "#334155",      // Gris oscuro (Líneas de fondo)
    tooltipBg: "#1e293b", // Fondo oscuro para tooltip
    tooltipBorder: "#475569"
};

// --- TOOLTIP PERSONALIZADO ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: COLORS.tooltipBg, borderColor: COLORS.tooltipBorder }} className="p-2 border rounded-lg shadow-xl text-xs">
        <p className="font-bold text-slate-200 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.fill || entry.color }}>
            {entry.name}: {
                typeof entry.value === 'number' 
                ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(entry.value)
                : entry.value
            }
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// 1. COMPRAS SEMANALES
export function WeeklyPurchasesChart({ data }: { data: PurchaseOrder[] }) {
  const weeklyData = data
    .filter((order) => order.status === 'completed' || order.status === 'received')
    .reduce((acc, order) => {
      const week = getWeek(parseISO(order.date), { locale: es });
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
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="name" stroke={COLORS.text} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke={COLORS.text} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value) / 1000000}M`} />
        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
        <Legend wrapperStyle={{ color: COLORS.text, fontSize: "12px", paddingTop: "10px" }}/>
        <Bar dataKey="Compras" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// 2. VENTAS SEMANALES
export function WeeklySalesChart({ data }: { data: SalesOrder[] }) {
  const weeklyData = data
    .filter((order) => order.status === 'completed' || order.status === 'dispatched' || order.status === 'invoiced')
    .reduce((acc, order) => {
      const week = getWeek(parseISO(order.date), { locale: es });
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
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="name" stroke={COLORS.text} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke={COLORS.text} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value) / 1000000}M`} />
        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
        <Legend wrapperStyle={{ color: COLORS.text, fontSize: "12px", paddingTop: "10px" }}/>
        <Bar dataKey="Ventas" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// 3. VENTAS POR CALIBRE (KILOS)
export function SalesByOrderChart({ data }: { data: SalesOrder[] }) {
    // Simplificamos la lógica para agrupar todos los kilos por calibre globalmente
    const grouped = data
        .filter(order => order.status === 'completed' || order.status === 'dispatched' || order.status === 'invoiced')
        .reduce((acc, curr) => {
            curr.items.forEach(item => {
                const key = item.caliber || 'S/C';
                if (!acc[key]) acc[key] = 0;
                acc[key] += item.quantity;
            });
            return acc;
        }, {} as Record<string, number>);

    const chartData = Object.entries(grouped)
        .map(([name, value]) => ({ name, Kilos: value }))
        .sort((a,b) => b.Kilos - a.Kilos); // Ordenar de mayor a menor

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="name" stroke={COLORS.text} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke={COLORS.text} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
        <Tooltip 
            content={<CustomTooltip />} 
            cursor={{fill: 'rgba(255,255,255,0.05)'}} 
        />
        <Legend wrapperStyle={{ color: COLORS.text, fontSize: "12px", paddingTop: "10px" }}/>
        <Bar dataKey="Kilos" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// 4. FLUJO DE CAJA (INGRESOS VS EGRESOS)
export function IncomeVsExpenseChart({ data }: { data: FinancialMovement[] }) {
    const weeklyData: { [week: number]: { income: number; expense: number } } = {};

    data.forEach(mov => {
        const week = getWeek(parseISO(mov.date), { locale: es });
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
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="name" stroke={COLORS.text} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke={COLORS.text} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value) / 1000000}M`} />
        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
        <Legend wrapperStyle={{ color: COLORS.text, fontSize: "12px", paddingTop: "10px" }}/>
        <Bar dataKey="Ingresos" fill={COLORS.success} radius={[4, 4, 0, 0]} />
        <Bar dataKey="Egresos" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// 5. DISTRIBUCIÓN DE STOCK (CORREGIDO)
export function CaliberDistributionChart({ data }: { data: InventoryItem[] }) {
  const chartData = data
    .filter(item => item.stock > 0)
    .map(item => ({
        name: `${item.name ? item.name.substring(0,3) : 'S/N'}. ${item.caliber || 'S/C'}`,
        Stock: item.stock
    }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false}/>
        <XAxis dataKey="name" stroke={COLORS.text} fontSize={10} angle={-45} textAnchor="end" height={60} interval={0} tickLine={false} axisLine={false} />
        <YAxis stroke={COLORS.text} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
        <Legend wrapperStyle={{ color: COLORS.text, fontSize: "12px" }}/>
        <Bar dataKey="Stock" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// 6. COMPRAS POR PROVEEDOR
export function PurchasesBySupplierChart({ data, suppliers }: { data: PurchaseOrder[], suppliers: Contact[] }) {
  const supplierData = data
    .filter((order) => order.status === 'completed' || order.status === 'received')
    .reduce((acc, order) => {
      const supplierName = suppliers.find(s => s.id === order.supplierId)?.name || 'Desconocido';
      // Calcular kilos de la orden sumando los items
      const kilos = order.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      acc[supplierName] = (acc[supplierName] || 0) + kilos;
      return acc;
    }, {} as { [name: string]: number });

  const chartData = Object.entries(supplierData).map(([name, total]) => ({
    name,
    Kilos: total,
  })).sort((a, b) => b.Kilos - a.Kilos).slice(0, 5);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={true} vertical={false} />
        <XAxis type="number" stroke={COLORS.text} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
        <YAxis type="category" dataKey="name" stroke={COLORS.text} fontSize={11} width={100} interval={0} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
        <Legend wrapperStyle={{ color: COLORS.text, fontSize: "12px" }}/>
        <Bar dataKey="Kilos" fill={COLORS.cyan} radius={[0, 4, 4, 0]} barSize={25} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// 7. MONTO COMPRAS POR PRODUCTO/CALIBRE
export function PurchasesByProductCaliberChart({ data }: { data: PurchaseOrder[] }) {
  const productData = data
    .filter(order => order.status === 'completed' || order.status === 'received')
    .flatMap(order => order.items.map(item => ({...item, total: item.quantity * item.price})))
    .reduce((acc, item) => {
      const key = `${item.product} - ${item.caliber}`;
      acc[key] = (acc[key] || 0) + item.total;
      return acc;
    }, {} as Record<string, number>);

  const chartData = Object.entries(productData).map(([name, total]) => ({
    name,
    Monto: total,
  })).sort((a,b) => b.Monto - a.Monto).slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 30)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={true} vertical={false}/>
        <XAxis type="number" stroke={COLORS.text} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value) / 1000000}M`} />
        <YAxis type="category" dataKey="name" stroke={COLORS.text} fontSize={11} width={120} interval={0} tickLine={false} axisLine={false}/>
        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
        <Legend wrapperStyle={{ color: COLORS.text, fontSize: "12px" }}/>
        <Bar dataKey="Monto" fill={COLORS.success} radius={[0, 4, 4, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

    