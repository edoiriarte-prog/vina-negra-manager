
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useOperations } from '@/hooks/use-operations';
import { useMasterData } from '@/hooks/use-master-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth, endOfMonth, isBefore, isAfter, startOfDay, endOfDay, isEqual, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Search, Package, Filter, Download, History,
  ArrowUp, ArrowDown, Calendar as CalendarIcon
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { InventoryHistoryDialog } from './components/inventory-history-dialog';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { InventoryItem } from '@/lib/types';


// --- DEFINICIÓN DE TIPOS LIMPIA ---
type InventoryReportItem = {
    id: string; 
    product: string;
    caliber: string;
    warehouse: string;
    stockInicial: number;
    entradas: number;
    salidas: number;
    stockFinal: number;
};
type FilterMode = "day" | "range" | "month";

// --- AYUDAS VISUALES ---
const formatKilos = (val: number) => new Intl.NumberFormat('es-CL').format(Math.round(val)) + ' kg';
const normalize = (str?: string) => (str || '').trim().toUpperCase();
const parseDateAsLocal = (dateString: string) => new Date(`${dateString}T12:00:00`);


export default function InventoryPage() {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  
  // 1. OBTENER DATOS
  const { purchaseOrders, salesOrders, inventoryAdjustments, isLoading: loadingOps } = useOperations();
  const { warehouses, products, contacts, isLoading: loadingMaster } = useMasterData();
  const isLoading = loadingOps || loadingMaster;
  
  // 2. FILTROS
  const [filterMode, setFilterMode] = useState<FilterMode>("day");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
  const [month, setMonth] = useState<Date | undefined>(new Date());

  const [filtroBodega, setFiltroBodega] = useState<string>("All");
  const [filtroProducto, setFiltroProducto] = useState<string>("All");
  const [busqueda, setBusqueda] = useState("");
  const [itemSeleccionado, setItemSeleccionado] = useState<InventoryReportItem | null>(null);

  // 3. MOTOR DE CÁLCULO "AUDITABLE"
  const kardexData = useMemo(() => {
    if (isLoading || !purchaseOrders || !salesOrders || !inventoryAdjustments) return [];
    
    let fechaInicio: Date, fechaFin: Date;
    
    switch (filterMode) {
        case 'day':
            fechaInicio = startOfDay(date || new Date());
            fechaFin = endOfDay(date || new Date());
            break;
        case 'range':
            fechaInicio = startOfDay(dateRange?.from || new Date(0));
            fechaFin = endOfDay(dateRange?.to || new Date());
            break;
        case 'month':
            fechaInicio = startOfMonth(month || new Date());
            fechaFin = endOfMonth(month || new Date());
            break;
        default:
            fechaInicio = new Date(0);
            fechaFin = new Date();
    }

    const mapaKardex = new Map<string, InventoryReportItem>();

    const procesarMovimiento = (
        fechaStr: string, 
        producto: string,
        calibre: string, 
        bodega: string, 
        cantidad: number, 
        tipo: 'ENTRADA' | 'SALIDA'
    ) => {
        if (!producto || !calibre || !bodega || !fechaStr) return;
        const prodNorm = normalize(producto);
        const calNorm = normalize(calibre);
        const bodNorm = normalize(bodega);
        
        const clave = `${prodNorm}|${calNorm}|${bodNorm}`;

        if (!mapaKardex.has(clave)) {
            mapaKardex.set(clave, {
                id: clave,
                product: producto, 
                caliber: calibre,
                warehouse: bodega,
                stockInicial: 0,
                entradas: 0,
                salidas: 0,
                stockFinal: 0
            });
        }

        const item = mapaKardex.get(clave)!;
        const fechaMov = parseDateAsLocal(fechaStr);

        if (isBefore(fechaMov, fechaInicio)) {
            if (tipo === 'ENTRADA') item.stockInicial += cantidad;
            else item.stockInicial -= cantidad;
        } else if (!isAfter(fechaMov, fechaFin)) {
            if (tipo === 'ENTRADA') item.entradas += cantidad;
            else item.salidas += cantidad;
        }
    };

    purchaseOrders.forEach(oc => {
        if (oc.status === 'received' || oc.status === 'completed') {
            oc.items.forEach(linea => procesarMovimiento(oc.date, linea.product, linea.caliber, oc.warehouse, Number(linea.quantity), 'ENTRADA'));
        }
    });
    salesOrders.forEach(ov => {
        if (ov.status === 'dispatched' || ov.status === 'completed' || ov.status === 'invoiced') {
            if (ov.saleType === 'Traslado Bodega Interna') {
                 ov.items.forEach(linea => {
                    procesarMovimiento(ov.date, linea.product, linea.caliber, ov.warehouse!, Number(linea.quantity), 'SALIDA');
                    procesarMovimiento(ov.date, linea.product, linea.caliber, ov.destinationWarehouse!, Number(linea.quantity), 'ENTRADA');
                 });
            } else {
                ov.items.forEach(linea => procesarMovimiento(ov.date, linea.product, linea.caliber, ov.warehouse!, Number(linea.quantity), 'SALIDA'));
            }
        }
    });
    inventoryAdjustments.forEach(adj => {
        const tipo = adj.type === 'increase' ? 'ENTRADA' : 'SALIDA';
        procesarMovimiento(adj.date, adj.product, adj.caliber, adj.warehouse, Number(adj.quantity), tipo);
    });

    const reporte: InventoryReportItem[] = [];
    mapaKardex.forEach(item => {
        item.stockFinal = item.stockInicial + item.entradas - item.salidas;
        if (item.stockInicial !== 0 || item.entradas !== 0 || item.salidas !== 0 || item.stockFinal !== 0) {
            reporte.push(item);
        }
    });

    return reporte.sort((a,b) => a.product.localeCompare(b.product) || a.caliber.localeCompare(b.caliber));

  }, [purchaseOrders, salesOrders, inventoryAdjustments, isLoading, date, dateRange, month, filterMode]);
  

  // 4. FILTRADO VISUAL Y TOTALES
  const { datosFiltrados, totalEntradas, totalSalidas, stockFinalTotal } = useMemo(() => {
    let data = kardexData;

    if (filtroBodega !== "All") data = data.filter(i => i.warehouse === filtroBodega);
    if (filtroProducto !== "All") data = data.filter(i => normalize(i.product) === normalize(filtroProducto));
    if (busqueda) {
        const q = busqueda.toUpperCase();
        data = data.filter(i => i.product.toUpperCase().includes(q) || i.caliber.toUpperCase().includes(q));
    }

    const totales = data.reduce((acc, item) => ({
        entradas: acc.entradas + item.entradas,
        salidas: acc.salidas + item.salidas,
        stock: acc.stock + item.stockFinal
    }), { entradas: 0, salidas: 0, stock: 0 });

    return { 
        datosFiltrados: data, 
        totalEntradas: totales.entradas, 
        totalSalidas: totales.salidas, 
        stockFinalTotal: totales.stock 
    };
  }, [kardexData, filtroBodega, filtroProducto, busqueda]);

  const handleExport = () => {
    const dataToExport = datosFiltrados.map(item => ({
        'Producto': item.product,
        'Calibre': item.caliber,
        'Bodega': item.warehouse,
        'Stock Inicial': item.stockInicial,
        'Entradas (+)': item.entradas,
        'Salidas (-)': item.salidas,
        'Stock Final': item.stockFinal,
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kardex');
    XLSX.writeFile(wb, `Kardex_AVN_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({ title: "Exportado", description: "Reporte generado correctamente." });
  };
  
  const displayDate = useMemo(() => {
    switch (filterMode) {
      case 'day': return date ? format(date, "dd 'de' MMM, yyyy", { locale: es }) : "Seleccione día";
      case 'range': return dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "dd MMM")} - ${format(dateRange.to, "dd MMM, yyyy")}` : format(dateRange.from, "dd MMM, yyyy")) : "Seleccione rango";
      case 'month': return month ? format(month, "MMMM yyyy", { locale: es }) : "Seleccione mes";
      default: return "Seleccione fecha";
    }
  }, [filterMode, date, dateRange, month]);
  
  if (isLoading) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-950 min-h-screen text-slate-100">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Auditoría de Stock (Kardex)</h2>
            <p className="text-slate-400 mt-1">Cálculo en tiempo real basado en Órdenes de Compra y Venta.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
                <Download className="mr-2 h-4 w-4" /> Exportar Excel
            </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-400">Entradas (Periodo)</CardTitle>
                  <ArrowUp className="text-emerald-500 h-4 w-4"/>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{formatKilos(totalEntradas)}</div></CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-red-400">Salidas (Periodo)</CardTitle>
                  <ArrowDown className="text-red-500 h-4 w-4"/>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{formatKilos(totalSalidas)}</div></CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-400">Stock Final Calculado</CardTitle>
                  <Package className="text-blue-500 h-4 w-4"/>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{formatKilos(stockFinalTotal)}</div></CardContent>
          </Card>
      </div>
      
      <Card className="bg-slate-900 border-slate-800 shadow-lg">
        <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-9 bg-slate-950 border-slate-800 text-slate-100" />
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button id="date" variant={"outline"} className={cn("justify-start text-left font-normal bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800", !date && !dateRange && !month && "text-muted-foreground" )}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {displayDate}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700" align="start">
                        <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 bg-slate-950 border-b border-slate-800 rounded-b-none">
                                <TabsTrigger value="day">Día</TabsTrigger>
                                <TabsTrigger value="range">Rango</TabsTrigger>
                                <TabsTrigger value="month">Mes</TabsTrigger>
                            </TabsList>
                            <TabsContent value="day">
                                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                            </TabsContent>
                            <TabsContent value="range">
                                <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                            </TabsContent>
                            <TabsContent value="month">
                                <Calendar mode="single" onSelect={setMonth} selected={month} fromDate={startOfMonth(new Date(2020, 0))} toDate={endOfMonth(new Date(2030, 11))} captionLayout="dropdown-buttons" />
                            </TabsContent>
                        </Tabs>
                    </PopoverContent>
                </Popover>
                
                <Select value={filtroBodega} onValueChange={setFiltroBodega}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-100"><SelectValue placeholder="Bodega" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                        <SelectItem value="All">Todas las Bodegas</SelectItem>
                        {warehouses.map(w => (<SelectItem key={w} value={w}>{w}</SelectItem>))}
                    </SelectContent>
                </Select>

                <Select value={filtroProducto} onValueChange={setFiltroProducto}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-100"><SelectValue placeholder="Producto" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                        <SelectItem value="All">Todos los Productos</SelectItem>
                        {products.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                    </SelectContent>
                </Select>
            </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto relative">
            <Table>
                <TableHeader className="bg-slate-950/50 sticky top-0 z-10">
                    <TableRow className="border-slate-800 hover:bg-slate-900">
                        <TableHead className="text-slate-400 font-bold w-[250px]">Producto / Calibre</TableHead>
                        <TableHead className="text-slate-400 font-bold">Bodega</TableHead>
                        <TableHead className="text-right text-slate-500 font-bold">Stock Inicial</TableHead>
                        <TableHead className="text-right text-emerald-400 font-bold">Entradas</TableHead>
                        <TableHead className="text-right text-red-400 font-bold">Salidas</TableHead>
                        <TableHead className="text-right text-blue-400 font-bold text-lg">Stock Final</TableHead>
                        <TableHead className="text-center">Detalle</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {datosFiltrados.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center h-32 text-slate-500">No hay movimientos registrados.</TableCell></TableRow>
                    ) : (
                        datosFiltrados.map((item) => (
                            <TableRow key={item.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                                <TableCell className="font-medium text-white">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-blue-500/10 rounded text-blue-500"><Package className="h-4 w-4"/></div>
                                        <div>
                                          {item.product}
                                          <span className="ml-2 text-xs text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700">{item.caliber}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-slate-400 text-sm">{item.warehouse}</TableCell>
                                <TableCell className="text-right font-mono text-slate-500">{formatKilos(item.stockInicial)}</TableCell>
                                <TableCell className="text-right font-mono text-emerald-400">
                                    {item.entradas > 0 ? `+ ${formatKilos(item.entradas)}` : '-'}
                                </TableCell>
                                <TableCell className="text-right font-mono text-red-400">
                                    {item.salidas > 0 ? `- ${formatKilos(item.salidas)}` : '-'}
                                </TableCell>
                                <TableCell className="text-right font-mono text-lg text-blue-400 font-bold">{formatKilos(item.stockFinal)}</TableCell>
                                <TableCell className="text-center">
                                    <Button variant="ghost" size="icon" onClick={() => setItemSeleccionado(item as any)} title="Ver Historial">
                                        <History className="h-4 w-4 text-slate-500 hover:text-slate-200" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
      </Card>
    </div>

    {itemSeleccionado && (
      <InventoryHistoryDialog 
        isOpen={!!itemSeleccionado}
        onOpenChange={(open) => !open && setItemSeleccionado(null)}
        item={itemSeleccionado}
        purchaseOrders={purchaseOrders}
        salesOrders={salesOrders}
        inventoryAdjustments={inventoryAdjustments}
        contacts={contacts}
      />
    )}
    </>
  );
}

    