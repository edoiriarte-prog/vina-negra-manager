"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

const data = [
  { name: 'Ene', utilidad: 4000 },
  { name: 'Feb', utilidad: 3000 },
  { name: 'Mar', utilidad: 2000 },
  { name: 'Abr', utilidad: 2780 },
  { name: 'May', utilidad: 1890 },
  { name: 'Jun', utilidad: 2390 },
  { name: 'Jul', utilidad: 3490 },
];

export function ProfitabilityReport() {
  const cardClass = "bg-slate-900 border-slate-800 shadow-sm";

  return (
    <Card className={cardClass}>
        <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-500" /> 
                Rentabilidad Neta Acumulada
            </CardTitle>
            <CardDescription className="text-slate-400">
                Evolución de la utilidad operativa después de costos.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorUtilidad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9', borderRadius: '8px' }}
                        />
                        <Area type="monotone" dataKey="utilidad" stroke="#10b981" fillOpacity={1} fill="url(#colorUtilidad)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </CardContent>
    </Card>
  );
}