"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Calendar, TrendingUp, DollarSign, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// --- IMPORTACIÓN DE TUS COMPONENTES EXISTENTES ---
import { PerformanceReports } from "./components/performance-reports";
import { ProfitabilityReport } from "./components/profitability-report";
import { DueDatesReport } from "./components/due-dates-report";

export default function ReportsPage() {
  const [period, setPeriod] = useState("this_year");

  // Estilos Enterprise reutilizables
  const tabTriggerClass = "data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 hover:text-slate-200 flex-1";

  return (
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-slate-100">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Reportes y Analítica</h2>
          <p className="text-slate-400 mt-1">Visión estratégica del rendimiento del negocio.</p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-md px-3 py-2">
                <Calendar className="h-4 w-4 text-slate-500 mr-2" />
                <span className="text-sm text-slate-300 capitalize">{format(new Date(), "MMMM yyyy", { locale: es })}</span>
            </div>
            {/* El botón de exportar ahora usa la función nativa de imprimir */}
            <Button 
                variant="outline" 
                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white bg-slate-900 shadow-sm"
                onClick={() => window.print()}
            >
                <Download className="mr-2 h-4 w-4" /> Exportar / Imprimir
            </Button>
        </div>
      </div>

      {/* --- CONTROLES DE PESTAÑAS --- */}
      <Tabs defaultValue="performance" className="space-y-6">
        
        {/* Barra de Navegación de Reportes */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/50 p-1 rounded-xl border border-slate-800/50">
            <TabsList className="bg-transparent border-none p-0 h-10 w-full sm:w-auto flex gap-2">
                <TabsTrigger value="performance" className={tabTriggerClass}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Rendimiento
                </TabsTrigger>
                <TabsTrigger value="financial" className={tabTriggerClass}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Rentabilidad
                </TabsTrigger>
                <TabsTrigger value="duedates" className={tabTriggerClass}>
                    <FileText className="h-4 w-4 mr-2" />
                    Vencimientos
                </TabsTrigger>
            </TabsList>

            {/* Selector de Periodo Global */}
            <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-full sm:w-[200px] bg-slate-950 border-slate-800 text-slate-300 h-9">
                    <SelectValue placeholder="Seleccionar periodo" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                    <SelectItem value="this_month">Este Mes</SelectItem>
                    <SelectItem value="last_month">Mes Pasado</SelectItem>
                    <SelectItem value="this_quarter">Este Trimestre</SelectItem>
                    <SelectItem value="this_year">Este Año</SelectItem>
                </SelectContent>
            </Select>
        </div>

        {/* --- CONTENIDO DE LAS PESTAÑAS --- */}
        
        {/* 1. RENDIMIENTO OPERATIVO */}
        <TabsContent value="performance" className="space-y-6 mt-0">
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 shadow-sm">
                <PerformanceReports />
            </div>
        </TabsContent>

        {/* 2. RENTABILIDAD FINANCIERA */}
        <TabsContent value="financial" className="space-y-6 mt-0">
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 shadow-sm">
                <ProfitabilityReport />
            </div>
        </TabsContent>

        {/* 3. CONTROL DE VENCIMIENTOS */}
        <TabsContent value="duedates" className="space-y-6 mt-0">
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 shadow-sm">
                {/* CORRECCIÓN APLICADA AQUÍ: Se pasa la función onPrint */}
                <DueDatesReport onPrint={() => window.print()} />
            </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}