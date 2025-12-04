
"use client";

import React, { useState, useMemo, useRef } from 'react';
import { useOperations } from '@/hooks/use-operations';
import { useMasterData } from '@/hooks/use-master-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth, endOfMonth, isBefore, isAfter, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Search, Package, Filter, Download, History,
  ArrowUp, ArrowDown, Calendar as CalendarIcon, TrendingUp, TrendingDown, Boxes
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { InventoryHistoryDialog } from './components/inventory-history-dialog';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { Calendar } from '@/components/ui/calendar';


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
type ProductSummaryItem = {
    name: string;
    stockFinal: number;
    entradas: number;
    salidas: number;
};
type FilterMode = "day" | "range" | "month";


const parseDateAsLocal = (dateString: string) => {
    if (!dateString) return new Date(0);
    // Agrega T12:00:00 para forzar la interpretación en la zona horaria local
    // y evitar que se mueva al día anterior.
    return new Date(`${dateString}T12:00:00`);
};

// --- AYUDAS VISUALES ---
const formatKilos = (val: number) => new Intl.NumberFormat('es-CL').format(Math.round(val)) + ' kg';
const normalize = (str?: string) => (str || '').trim().toUpperCase();

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

  // 3. MOTOR DE CÁLCULO "TRANSACTIONAL PURO"
  const kardexData = useMemo(() => {
    if (isLoading || !purchaseOrders || !salesOrders || !inventoryAdjustments) return [];
    
    let fechaInicio: Date, fechaFin: Date;
    switch (filterMode) {
        case 'day':
            fechaInicio = parseDateAsLocal(format(date || new Date(), 'yyyy-MM-dd'));
            fechaFin = fechaInicio;
            break;
        case 'range':
            fechaInicio = parseDateAsLocal(format(dateRange?.from || new Date(0), 'yyyy-MM-dd'));
            fechaFin = parseDateAsLocal(format(dateRange?.to || new Date(), 'yyyy-MM-dd'));
            break;
        case 'month':
            fechaInicio = startOfMonth(month || new Date());
            fechaFin = endOfMonth(month || new Date());
            break;
        default:
            fechaInicio = new Date(0);
            fechaFin = new Date();
    }
    
    const reportMap = new Map<string, InventoryReportItem>();

    const allMovements: { date: Date, product: string, caliber: string, warehouse: string, quantity: number, type: 'ENTRADA' | 'SALIDA' }[] = [];

    purchaseOrders.forEach(oc => {
        if (oc.status === 'received' || oc.status === 'completed') {
            oc.items.forEach(linea => {
                allMovements.push({
                    date: parseDateAsLocal(oc.date),
                    product: linea.product, caliber: linea.caliber, warehouse: oc.warehouse,
                    quantity: Number(linea.quantity), type: 'ENTRADA'
                });
            });
        }
    });

    salesOrders.forEach(ov => {
        if (ov.status === 'dispatched' || ov.status === 'completed' || ov.status === 'invoiced') {
            if (ov.saleType === 'Traslado Bodega Interna') {
                 ov.items.forEach(linea => {
                    allMovements.push({ date: parseDateAsLocal(ov.date), product: linea.product, caliber: linea.caliber, warehouse: ov.warehouse!, quantity: Number(linea.quantity), type: 'SALIDA' });
                    allMovements.push({ date: parseDateAsLocal(ov.date), product: linea.product, caliber: linea.caliber, warehouse: ov.destinationWarehouse!, quantity: Number(linea.quantity), type: 'ENTRADA' });
                 });
            } else {
                ov.items.forEach(linea => {
                    allMovements.push({ date: parseDateAsLocal(ov.date), product: linea.product, caliber: linea.caliber, warehouse: ov.warehouse!, quantity: Number(linea.quantity), type: 'SALIDA' });
                });
            }
        }
    });

    inventoryAdjustments.forEach(adj => {
        allMovements.push({
            date: parseDateAsLocal(adj.date), product: adj.product, caliber: adj.caliber, warehouse: adj.warehouse,
            quantity: Number(adj.quantity), type: adj.type === 'increase' ? 'ENTRADA' : 'SALIDA'
        });
    });

    allMovements.forEach(mov => {
        if (!mov.product || !mov.caliber || !mov.warehouse) return;
        
        const clave = `${normalize(mov.product)}|${normalize(mov.caliber)}|${normalize(mov.warehouse)}`;
        if (!reportMap.has(clave)) {
            reportMap.set(clave, {
                id: clave, product: mov.product, caliber: mov.caliber, warehouse: mov.warehouse,
                stockInicial: 0, entradas: 0, salidas: 0, stockFinal: 0
            });
        }
        
        const item = reportMap.get(clave)!;
        const movDate = mov.date;
        
        if (isBefore(movDate, fechaInicio)) {
            item.stockInicial += (mov.type === 'ENTRADA' ? mov.quantity : -mov.quantity);
        } else if (movDate >= fechaInicio && movDate <= fechaFin) {
            if (mov.type === 'ENTRADA') item.entradas += mov.quantity;
            else item.salidas += mov.quantity;
        }
    });

    const reporte: InventoryReportItem[] = [];
    reportMap.forEach(item => {
        item.stockFinal = item.stockInicial + item.entradas - item.salidas;
        if (item.stockInicial !== 0 || item.entradas !== 0 || item.salidas !== 0 || item.stockFinal !== 0) {
            reporte.push(item);
        }
    });

    return reporte.sort((a, b) => a.product.localeCompare(b.product) || a.caliber.localeCompare(b.caliber));
  }, [purchaseOrders, salesOrders, inventoryAdjustments, isLoading, date, dateRange, month, filterMode]);
  
  // 4. FILTRADO VISUAL Y AGRUPACIONES
  const { datosFiltrados, resumenPorProducto, totalEntradas, totalSalidas, stockFinalTotal } = useMemo(() => {
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

    const resumenProducto = data.reduce((acc, item) => {
        const prodName = item.product;
        if (!acc[prodName]) {
            acc[prodName] = { name: prodName, stockFinal: 0, entradas: 0, salidas: 0 };
        }
        acc[prodName].stockFinal += item.stockFinal;
        acc[prodName].entradas += item.entradas;
        acc[prodName].salidas += item.salidas;
        return acc;
    }, {} as Record<string, ProductSummaryItem>);

    return { 
        datosFiltrados: data, 
        resumenPorProducto: Object.values(resumenProducto),
        totalEntradas: totales.entradas, 
        totalSalidas: totales.salidas, 
        stockFinalTotal: totales.stock 
    };
  }, [kardexData, filtroBodega, filtroProducto, busqueda]);

  const handleExport = () => {
    const dataToExport = datosFiltrados.map(item => ({
        'Producto': item.product, 'Calibre': item.caliber, 'Bodega': item.warehouse,
        'Stock Inicial': item.stockInicial, 'Entradas (+)': item.entradas,
        'Salidas (-)': item.salidas, 'Stock Final': item.stockFinal,
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kardex');
    XLSX.writeFile(wb, `Kardex_AVN_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({ title: "Exportado", description: "Reporte generado correctamente." });
  };
  
  const displayDate = useMemo(() => {
    switch (filterMode) {
      case 'day': return date ? format(date, "dd 'de' MMMM, yyyy", { locale: es }) : "Seleccione día";
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
            <p className="text-slate-400 mt-1">Análisis de movimientos de inventario por periodo.</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
            <Download className="mr-2 h-4 w-4" /> Exportar a Excel
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">Entradas (Periodo)</CardTitle>
                  <TrendingUp className="text-emerald-500 h-5 w-5"/>
              </CardHeader>
              <CardContent><div className="text-3xl font-bold text-emerald-400">{formatKilos(totalEntradas)}</div></CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">Salidas (Periodo)</CardTitle>
                  <TrendingDown className="text-red-500 h-5 w-5"/>
              </CardHeader>
              <CardContent><div className="text-3xl font-bold text-red-400">{formatKilos(totalSalidas)}</div></CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">Stock Final Calculado</CardTitle>
                  <Boxes className="text-blue-500 h-5 w-5"/>
              </CardHeader>
              <CardContent><div className="text-3xl font-bold text-blue-400">{formatKilos(stockFinalTotal)}</div></CardContent>
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
                            <TabsContent value="day"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus /></TabsContent>
                            <TabsContent value="range"><Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} /></TabsContent>
                            <TabsContent value="month"><Calendar mode="single" onSelect={setMonth} selected={month} fromDate={startOfMonth(new Date(2020, 0))} toDate={endOfMonth(new Date(2030, 11))} captionLayout="dropdown-buttons" /></TabsContent>
                        </Tabs>
                    </PopoverContent>
                </Popover>
                
                <Select value={filtroBodega} onValueChange={setFiltroBodega}><SelectTrigger className="bg-slate-950 border-slate-800 text-slate-100"><SelectValue placeholder="Bodega" /></SelectTrigger><SelectContent className="bg-slate-900 border-slate-800 text-slate-100"><SelectItem value="All">Todas las Bodegas</SelectItem>{warehouses.map(w => (<SelectItem key={w} value={w}>{w}</SelectItem>))}</SelectContent></Select>
                <Select value={filtroProducto} onValueChange={setFiltroProducto}><SelectTrigger className="bg-slate-950 border-slate-800 text-slate-100"><SelectValue placeholder="Producto" /></SelectTrigger><SelectContent className="bg-slate-900 border-slate-800 text-slate-100"><SelectItem value="All">Todos los Productos</SelectItem>{products.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select>
            </div>
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-200">Resumen por Producto</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumenPorProducto.map(prod => (
            <Card key={prod.name} className="bg-slate-900 border-slate-800 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white flex items-center justify-between">
                  {prod.name}
                  <Badge variant="secondary" className="bg-slate-800 text-slate-300">{formatKilos(prod.stockFinal)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm text-emerald-400"><span>Entradas Periodo:</span><span>{formatKilos(prod.entradas)}</span></div>
                <div className="flex justify-between text-sm text-red-400"><span>Salidas Periodo:</span><span>{formatKilos(prod.salidas)}</span></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-lg">
        <CardHeader><CardTitle className="text-lg text-slate-200">Detalle Completo (Kardex)</CardTitle></CardHeader>
        <div className="overflow-x-auto relative">
            <Table>
                <TableHeader className="bg-slate-950/50 sticky top-0 z-10"><TableRow className="border-slate-800 hover:bg-slate-900"><TableHead className="text-slate-400 font-bold w-[250px]">Producto / Calibre</TableHead><TableHead className="text-slate-400 font-bold">Bodega</TableHead><TableHead className="text-right text-slate-500 font-bold">Stock Inicial</TableHead><TableHead className="text-right text-emerald-400 font-bold">Entradas</TableHead><TableHead className="text-right text-red-400 font-bold">Salidas</TableHead><TableHead className="text-right text-blue-400 font-bold text-lg">Stock Final</TableHead><TableHead className="text-center">Detalle</TableHead></TableRow></TableHeader>
                <TableBody>
                    {datosFiltrados.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center h-32 text-slate-500">No hay movimientos registrados.</TableCell></TableRow>
                    ) : (
                        datosFiltrados.map((item) => (
                            <TableRow key={item.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                                <TableCell className="font-medium text-white"><div className="flex items-center gap-2"><div className="p-1.5 bg-blue-500/10 rounded text-blue-500"><Package className="h-4 w-4"/></div><div>{item.product}<span className="ml-2 text-xs text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700">{item.caliber}</span></div></div></TableCell>
                                <TableCell className="text-slate-400 text-sm">{item.warehouse}</TableCell>
                                <TableCell className="text-right font-mono text-slate-500">{formatKilos(item.stockInicial)}</TableCell>
                                <TableCell className="text-right font-mono text-emerald-400">{item.entradas > 0 ? `+ ${formatKilos(item.entradas)}` : '-'}</TableCell>
                                <TableCell className="text-right font-mono text-red-400">{item.salidas > 0 ? `- ${formatKilos(item.salidas)}` : '-'}</TableCell>
                                <TableCell className="text-right font-mono text-lg text-blue-400 font-bold">{formatKilos(item.stockFinal)}</TableCell>
                                <TableCell className="text-center"><Button variant="ghost" size="icon" onClick={() => setItemSeleccionado(item)} title="Ver Historial"><History className="h-4 w-4 text-slate-500 hover:text-slate-200" /></Button></TableCell>
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
