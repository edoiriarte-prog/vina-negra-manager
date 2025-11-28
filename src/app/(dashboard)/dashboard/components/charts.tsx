"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart, Line, Cell, PieChart, Pie
} from 'recharts';
import { format, parseISO, startOfWeek, getWeek, addWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { PurchaseOrder, SalesOrder, FinancialMovement, InventoryItem, Contact } from '@/lib/types';

// --- TEMA DE COLORES (NEÓN/DARK) ---
const THEME = {
    sales: "#3b82f6",      // Azul
    purchases: "#f59e0b",  // Naranja
    income: "#10b981",     // Verde Esmeralda
    expense: "#ef4444",    // Rojo
    stock: "#8b5cf6",      // Violeta
    grid: "#1e293b",       // Gris muy oscuro
    text: "#94a3b8",       // Gris claro
    tooltip: "#0f172a",    // Fondo casi negro
};

// --- TOOLTIP PERSONALIZADO DE LUJO ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs">
        <p className="font-bold text-slate-200 mb-2 border-b border-slate-800 pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 mb-1">
              <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-slate-400 capitalize">{entry.name}:</span>
              </div>
              <span className="font-mono font-bold" style={{ color: entry.color }}>
                {typeof entry.value === 'number' 
                    ? (entry.name.includes('Kilos') || entry.name.includes('Stock') 
                        ? `${new Intl.NumberFormat('es-CL').format(entry.value)} kg`
                        : `$${new Intl.NumberFormat('es-CL').format(entry.value)}`)
                    : entry.value}
              </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- 1. COMPARATIVA FINANCIERA (COMPRAS VS VENTAS) ---
export function ComparativeFinancialChart({ sales, purchases }: { sales: SalesOrder[], purchases: PurchaseOrder[] }) {
    // Unificar datos por semana
    const dataMap: Record<string, any> = {};

    // Procesar Ventas
    sales.forEach(o => {
        if (o.status === 'cancelled') return;
        const week = `Sem ${getWeek(parseISO(o.date))}`;
        if (!dataMap[week]) dataMap[week] = { name: week, Ventas: 0, Compras: 0 };
        dataMap[week].Ventas += o.totalAmount;
    });

    // Procesar Compras
    purchases.forEach(o => {
        if (o.status === 'cancelled') return;
        const week = `Sem ${getWeek(parseISO(o.date))}`;
        if (!dataMap[week]) dataMap[week] = { name: week, Ventas: 0, Compras: 0 };
        dataMap[week].Compras += o.totalAmount;
    });

    const data = Object.values(dataMap).sort((a, b) => 
        parseInt(a.name.split(' ')[1]) - parseInt(b.name.split(' ')[1])
    ).slice(-10); // Últimas 10 semanas

    return (
        <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
                <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={THEME.sales} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={THEME.sales} stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} vertical={false} />
                <XAxis dataKey="name" stroke={THEME.text} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={THEME.text} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000000}M`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="circle" />
                
                {/* Barras para Compras (Costos) */}
                <Bar dataKey="Compras" fill={THEME.purchases} radius={[4, 4, 0, 0]} barSize={20} stackId="a" />
                
                {/* Área/Línea para Ventas (Ingresos) */}
                <Area type="monotone" dataKey="Ventas" stroke={THEME.sales} fillOpacity={1} fill="url(#colorVentas)" strokeWidth={3} />
            </ComposedChart>
        </ResponsiveContainer>
    );
}

// --- 2. MOVIMIENTO DE KILOS (ROTACIÓN DE PRODUCTO) ---
export function ProductFlowChart({ sales, purchases }: { sales: SalesOrder[], purchases: PurchaseOrder[] }) {
    const productMap: Record<string, { name: string, Comprados: number, Vendidos: number }> = {};

    purchases.forEach(o => {
        if (o.status === 'cancelled') return;
        o.items.forEach(item => {
            const key = item.product; // Agrupar por nombre de producto
            if (!productMap[key]) productMap[key] = { name: key, Comprados: 0, Vendidos: 0 };
            productMap[key].Comprados += item.quantity;
        });
    });

    sales.forEach(o => {
        if (o.status === 'cancelled') return;
        o.items.forEach(item => {
            const key = item.product;
            if (!productMap[key]) productMap[key] = { name: key, Comprados: 0, Vendidos: 0 };
            productMap[key].Vendidos += item.quantity;
        });
    });

    // Top 6 productos con más movimiento
    const data = Object.values(productMap)
        .sort((a, b) => (b.Comprados + b.Vendidos) - (a.Comprados + a.Vendidos))
        .slice(0, 6);

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} horizontal={true} vertical={false} />
                <XAxis type="number" stroke={THEME.text} fontSize={11} tickFormatter={(val) => `${val/1000}k`} />
                <YAxis dataKey="name" type="category" width={100} stroke={THEME.text} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.03)'}} />
                <Legend iconType="circle" />
                <Bar dataKey="Comprados" name="Kg Comprados" fill={THEME.stock} radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="Vendidos" name="Kg Vendidos" fill={THEME.income} radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
        </ResponsiveContainer>
    );
}

// --- 3. FLUJO DE CAJA NETO (INGRESOS VS EGRESOS) ---
export function CashFlowTrendChart({ data }: { data: FinancialMovement[] }) {
    const weeklyData: Record<string, any> = {};

    data.forEach(mov => {
        const week = `Sem ${getWeek(parseISO(mov.date))}`;
        if(!weeklyData[week]) weeklyData[week] = { name: week, Ingresos: 0, Egresos: 0, Neto: 0 };
        
        if (mov.type === 'income') weeklyData[week].Ingresos += mov.amount;
        else if (mov.type === 'expense') weeklyData[week].Egresos += mov.amount;
        
        weeklyData[week].Neto = weeklyData[week].Ingresos - weeklyData[week].Egresos;
    });

    const chartData = Object.values(weeklyData).sort((a, b) => 
        parseInt(a.name.split(' ')[1]) - parseInt(b.name.split(' ')[1])
    ).slice(-12);

    return (
        <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
                <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={THEME.income} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={THEME.income} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={THEME.expense} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={THEME.expense} stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} vertical={false} />
                <XAxis dataKey="name" stroke={THEME.text} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={THEME.text} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000000}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Ingresos" stroke={THEME.income} fillOpacity={1} fill="url(#colorIngresos)" strokeWidth={2} />
                <Area type="monotone" dataKey="Egresos" stroke={THEME.expense} fillOpacity={1} fill="url(#colorEgresos)" strokeWidth={2} />
            </AreaChart>
        </ResponsiveContainer>
    );
}

// --- 4. TOP PROVEEDORES (DONUT CHART) ---
export function TopSuppliersChart({ data, suppliers }: { data: PurchaseOrder[], suppliers: Contact[] }) {
  const supplierData = data
    .filter((order) => order.status === 'completed')
    .reduce((acc, order) => {
      const supplierName = suppliers.find(s => s.id === order.supplierId)?.name || 'Desconocido';
      const kilos = order.items.reduce((sum, item) => sum + item.quantity, 0);
      acc[supplierName] = (acc[supplierName] || 0) + kilos;
      return acc;
    }, {} as { [name: string]: number });

  const chartData = Object.entries(supplierData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const PIE_COLORS = [THEME.sales, THEME.purchases, THEME.income, THEME.stock, THEME.expense];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '11px', color: '#94a3b8'}}/>
      </PieChart>
    </ResponsiveContainer>
  );
}