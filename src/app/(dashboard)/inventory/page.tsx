"use client";

import React, { useState, useMemo, useRef } from 'react';
import { useOperations } from '@/hooks/use-operations';
import { useMasterData } from '@/hooks/use-master-data';
import { InventoryItem, PurchaseOrder, SalesOrder, InventoryAdjustment, Contact } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Search, Package, Filter, Download, History,
  ArrowUp, ArrowDown, TrendingUp, Calendar as CalendarIcon 
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { InventoryHistoryDialog } from './components/inventory-history-dialog';

// --- TYPES ---
type InventoryReportItem = {
    id: string;
    product: string;
    caliber: string;
    warehouse: string;
    initialStock: number;
    purchases: number;
    sales: number;
    adjustments: number;
    finalStock: number;
};

// --- HELPERS ---
const formatKilos = (val: number) => new Intl.NumberFormat('es-CL').format(Math.round(val)) + ' kg';

// --- COMPONENT ---
export default function InventoryPage() {
  const { toast } = useToast();
  // 1. DATA LOADING
  const { purchaseOrders, salesOrders, inventoryAdjustments, isLoading: loadingOps } = useOperations();
  const { warehouses, products, calibers, contacts, isLoading: loadingMaster } = useMasterData();
  const isLoading = loadingOps || loadingMaster;
  
  // 2. FILTERS STATE
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("All");
  const [selectedProduct, setSelectedProduct] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<InventoryReportItem | null>(null);

  // 3. CORE LOGIC: INVENTORY CALCULATION ENGINE
  const inventoryReport = useMemo(() => {
    if (isLoading) return [];
    
    const interval = dateRange?.from && dateRange.to ? { start: dateRange.from, end: dateRange.to } : null;
    
    // Create a map to hold all product/caliber/warehouse combinations
    const reportMap = new Map<string, InventoryReportItem>();

    const allItems = new Set<string>();
    
    const normalize = (name: string) => (name || '').trim().toUpperCase();

    // Populate all unique items from all sources
    [...(purchaseOrders || []), ...(salesOrders || []), ...(inventoryAdjustments || [])].forEach(op => {
        (op.items || [op]).forEach((item: any) => {
            if (!item.product) return;
            const warehouse = (op as PurchaseOrder | SalesOrder).warehouse || (op as InventoryAdjustment).warehouse || 'Principal';
            const key = `${normalize(item.product)}::${item.caliber}::${warehouse}`;
            if (!allItems.has(key)) {
                allItems.add(key);
                reportMap.set(key, {
                    id: key, product: item.product, caliber: item.caliber, warehouse,
                    initialStock: 0, purchases: 0, sales: 0, adjustments: 0, finalStock: 0
                });
            }
        });
    });

    // Calculate Final Stock (based on ALL history)
    purchaseOrders.forEach(po => {
        if(po.status === 'completed' || po.status === 'received') {
            po.items.forEach(item => {
                const key = `${normalize(item.product)}::${item.caliber}::${po.warehouse || 'Principal'}`;
                if (reportMap.has(key)) reportMap.get(key)!.finalStock += item.quantity;
            });
        }
    });
    salesOrders.forEach(so => {
       if (so.status === 'completed' || so.status === 'dispatched' || so.status === 'invoiced') {
            so.items.forEach(item => {
                const key = `${normalize(item.product)}::${item.caliber}::${so.warehouse || 'Principal'}`;
                if (reportMap.has(key)) reportMap.get(key)!.finalStock -= item.quantity;
            });
        }
    });
    inventoryAdjustments.forEach(adj => {
        const key = `${normalize(adj.product)}::${adj.caliber}::${adj.warehouse}`;
        if (reportMap.has(key)) {
            const multiplier = adj.type === 'increase' ? 1 : -1;
            reportMap.get(key)!.finalStock += adj.quantity * multiplier;
        }
    });

    // Calculate movements WITHIN the date range
    if (interval) {
        purchaseOrders.forEach(po => {
            if((po.status === 'completed' || po.status === 'received') && isWithinInterval(parseISO(po.date), interval)) {
                po.items.forEach(item => {
                    const key = `${normalize(item.product)}::${item.caliber}::${po.warehouse || 'Principal'}`;
                    if(reportMap.has(key)) reportMap.get(key)!.purchases += item.quantity;
                });
            }
        });
        salesOrders.forEach(so => {
            if((so.status === 'completed' || so.status === 'dispatched' || so.status === 'invoiced') && isWithinInterval(parseISO(so.date), interval)) {
                so.items.forEach(item => {
                    const key = `${normalize(item.product)}::${item.caliber}::${so.warehouse || 'Principal'}`;
                    if(reportMap.has(key)) reportMap.get(key)!.sales += item.quantity;
                });
            }
        });
        inventoryAdjustments.forEach(adj => {
            if (isWithinInterval(parseISO(adj.date), interval)) {
                const key = `${normalize(adj.product)}::${adj.caliber}::${adj.warehouse}`;
                 if(reportMap.has(key)) {
                    const multiplier = adj.type === 'increase' ? 1 : -1;
                    reportMap.get(key)!.adjustments += adj.quantity * multiplier;
                }
            }
        });
    }

    // Calculate Initial Stock retroactively
    reportMap.forEach(item => {
        item.initialStock = item.finalStock - (item.purchases + item.adjustments) + item.sales;
    });

    return Array.from(reportMap.values());
  }, [purchaseOrders, salesOrders, inventoryAdjustments, isLoading, dateRange]);

  // 4. Filtering for Display
  const { filteredData, totalIn, totalOut, netRotation } = useMemo(() => {
    const data = inventoryReport.filter(item => {
        const matchWarehouse = selectedWarehouse === "All" || item.warehouse === selectedWarehouse;
        const matchProduct = selectedProduct === "All" || item.product === selectedProduct;
        const matchSearch = searchTerm === "" || 
                            item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.caliber?.toLowerCase().includes(searchTerm.toLowerCase());
        const hasMovement = item.initialStock !== 0 || item.purchases !== 0 || item.sales !== 0 || item.finalStock !== 0;
        return matchWarehouse && matchProduct && matchSearch && hasMovement;
    }).sort((a,b) => a.product.localeCompare(b.product) || a.caliber.localeCompare(b.caliber));

    const totals = data.reduce((acc, item) => {
        acc.totalIn += item.purchases + (item.adjustments > 0 ? item.adjustments : 0);
        acc.totalOut += item.sales + (item.adjustments < 0 ? Math.abs(item.adjustments) : 0);
        return acc;
    }, { totalIn: 0, totalOut: 0 });

    return { filteredData: data, ...totals, netRotation: totals.totalIn - totals.totalOut };
  }, [inventoryReport, selectedWarehouse, selectedProduct, searchTerm]);

  // 5. Handlers
  const handleExport = () => {
    toast({ title: "Exportando...", description: "Generando archivo Excel del reporte." });
    const dataToExport = filteredData.map(item => ({
        'Producto': item.product,
        'Calibre': item.caliber,
        'Bodega': item.warehouse,
        'Stock Inicial (Kg)': item.initialStock,
        'Entradas (Kg)': item.purchases + (item.adjustments > 0 ? item.adjustments : 0),
        'Salidas (Kg)': item.sales + (item.adjustments < 0 ? Math.abs(item.adjustments) : 0),
        'Stock Final (Kg)': item.finalStock,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte de Inventario');
    XLSX.writeFile(workbook, `Reporte_Inventario_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const renderContent = () => {
    if (isLoading) return <Skeleton className="h-96 w-full" />;
    return (
       <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
            <Table>
                <TableHeader className="bg-slate-950">
                    <TableRow className="border-slate-800 hover:bg-slate-900">
                        <TableHead className="text-slate-400 font-bold w-[250px]">Producto / Calibre</TableHead>
                        <TableHead className="text-slate-400 font-bold w-[150px]">Bodega</TableHead>
                        <TableHead className="text-right text-slate-400 font-bold">Stock Inicial</TableHead>
                        <TableHead className="text-right text-emerald-400 font-bold">Entradas</TableHead>
                        <TableHead className="text-right text-red-400 font-bold">Salidas</TableHead>
                        <TableHead className="text-right text-blue-400 font-bold">Stock Final</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredData.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center h-32 text-slate-500">Sin datos de inventario para los filtros seleccionados.</TableCell></TableRow>
                    ) : (
                        filteredData.map((item) => (
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
                                <TableCell className="text-right font-mono text-slate-500">{formatKilos(item.initialStock)}</TableCell>
                                <TableCell className="text-right font-mono text-emerald-400 flex justify-end items-center gap-1">
                                    <ArrowUp size={14}/> {formatKilos(item.purchases + (item.adjustments > 0 ? item.adjustments : 0))}
                                </TableCell>
                                <TableCell className="text-right font-mono text-red-400 flex justify-end items-center gap-1">
                                    <ArrowDown size={14}/> {formatKilos(item.sales + (item.adjustments < 0 ? Math.abs(item.adjustments) : 0))}
                                </TableCell>
                                <TableCell className="text-right font-mono text-lg text-blue-400 font-bold">{formatKilos(item.finalStock)}</TableCell>
                                <TableCell className="text-center">
                                    <Button variant="ghost" size="icon" onClick={() => setSelectedItemForHistory(item)} title="Ver Kardex">
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
    );
  }

  return (
    <>
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-950 min-h-screen text-slate-100">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Control de Stock (Kardex)</h2>
            <p className="text-slate-400 mt-1">Análisis de movimientos y estado del inventario por período.</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
            <Download className="mr-2 h-4 w-4" /> Exportar a Excel
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-slate-900 border-slate-800"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-emerald-400">Total Entradas</CardTitle><ArrowUp/></CardHeader><CardContent><div className="text-2xl font-bold">{formatKilos(totalIn)}</div></CardContent></Card>
          <Card className="bg-slate-900 border-slate-800"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-red-400">Total Salidas</CardTitle><ArrowDown/></CardHeader><CardContent><div className="text-2xl font-bold">{formatKilos(totalOut)}</div></CardContent></Card>
          <Card className="bg-slate-900 border-slate-800"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-blue-400">Rotación Neta</CardTitle><TrendingUp/></CardHeader><CardContent><div className="text-2xl font-bold">{formatKilos(netRotation)}</div></CardContent></Card>
      </div>
      
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input placeholder="Buscar calibre o variedad..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-slate-950 border-slate-800 text-slate-100" />
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button id="date" variant={"outline"} className={cn("justify-start text-left font-normal bg-slate-950 border-slate-800", !dateRange && "text-muted-foreground" )}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Seleccione rango</span>)}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/></PopoverContent>
                </Popover>
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}><SelectTrigger className="bg-slate-950 border-slate-800 text-slate-100"><div className="flex items-center gap-2"><Filter className="h-4 w-4 text-slate-500"/><SelectValue placeholder="Bodega" /></div></SelectTrigger><SelectContent className="bg-slate-900 border-slate-800 text-slate-100"><SelectItem value="All">Todas las Bodegas</SelectItem>{warehouses.map(w => (<SelectItem key={w} value={w}>{w}</SelectItem>))}</SelectContent></Select>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}><SelectTrigger className="bg-slate-950 border-slate-800 text-slate-100"><div className="flex items-center gap-2"><Package className="h-4 w-4 text-slate-500"/><SelectValue placeholder="Producto" /></div></SelectTrigger><SelectContent className="bg-slate-900 border-slate-800 text-slate-100"><SelectItem value="All">Todos los Productos</SelectItem>{products.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select>
            </div>
        </CardContent>
      </Card>

      {renderContent()}
    </div>
    {selectedItemForHistory && (
      <InventoryHistoryDialog 
        isOpen={!!selectedItemForHistory}
        onOpenChange={(open) => !open && setSelectedItemForHistory(null)}
        item={selectedItemForHistory}
        purchaseOrders={purchaseOrders}
        salesOrders={salesOrders}
        inventoryAdjustments={inventoryAdjustments}
        contacts={contacts}
      />
    )}
    </>
  );
}
