"use client";

import React, { useState, useMemo } from 'react';
import { useOperations } from '@/hooks/use-operations';
import { useMasterData } from '@/hooks/use-master-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth, endOfMonth, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Search, Package, Filter, Download, History,
  ArrowUp, ArrowDown, Wand2, Calendar as CalendarIcon
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { InventoryHistoryDialog } from './components/inventory-history-dialog';
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';

// TYPES
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

// HELPERS
const formatKilos = (val: number) => new Intl.NumberFormat('es-CL').format(Math.round(val)) + ' kg';
const normalize = (str?: string) => (str || '').trim().toUpperCase();

export default function InventoryPage() {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  
  // 1. DATA LOADING
  const { purchaseOrders, salesOrders, inventoryAdjustments, isLoading: loadingOps } = useOperations();
  const { warehouses, products, contacts, isLoading: loadingMaster } = useMasterData();
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

  // 3. KARDEX CALCULATION ENGINE
  const inventoryReport = useMemo(() => {
    if (isLoading || !purchaseOrders || !salesOrders || !inventoryAdjustments) return [];
    
    const start = dateRange?.from ? startOfDay(dateRange.from) : new Date(0);
    const end = dateRange?.to ? endOfDay(dateRange.to) : new Date();

    const reportMap = new Map<string, InventoryReportItem>();

    const allMovements = [
      // Purchase Orders (Entries)
      ...purchaseOrders
        .filter(o => o.status === 'received' || o.status === 'completed')
        .flatMap(o => o.items.map(i => ({
          date: new Date(o.date),
          type: 'IN',
          qty: Number(i.quantity || 0),
          product: i.product,
          caliber: i.caliber,
          warehouse: o.warehouse
        }))),
      
      // Sales Orders (Outputs)
      ...salesOrders
        .filter(o => o.status === 'dispatched' || o.status === 'completed' || o.status === 'invoiced')
        .flatMap(o => {
          if (o.saleType === 'Traslado Bodega Interna') {
            return o.items.flatMap(i => [
              { // Out from origin
                date: new Date(o.date),
                type: 'OUT',
                qty: Number(i.quantity || 0),
                product: i.product,
                caliber: i.caliber,
                warehouse: o.warehouse
              },
              { // In to destination
                date: new Date(o.date),
                type: 'IN',
                qty: Number(i.quantity || 0),
                product: i.product,
                caliber: i.caliber,
                warehouse: o.destinationWarehouse
              }
            ]);
          }
          // Normal Sale
          return o.items.map(i => ({
            date: new Date(o.date),
            type: 'OUT',
            qty: Number(i.quantity || 0),
            product: i.product,
            caliber: i.caliber,
            warehouse: o.warehouse
          }));
        }),

      // Manual Adjustments
      ...inventoryAdjustments.map(adj => ({
        date: new Date(adj.date),
        type: adj.type === 'increase' ? 'IN' : 'OUT',
        qty: Number(adj.quantity || 0),
        product: adj.product,
        caliber: adj.caliber,
        warehouse: adj.warehouse
      }))
    ];

    allMovements.forEach(mv => {
      if (!mv.product || !mv.caliber || !mv.warehouse) return;
      const key = `${normalize(mv.product)}::${normalize(mv.caliber)}::${normalize(mv.warehouse)}`;
      
      if (!reportMap.has(key)) {
        reportMap.set(key, {
            id: key, product: mv.product, caliber: mv.caliber, warehouse: mv.warehouse,
            initialStock: 0, purchases: 0, sales: 0, adjustments: 0, finalStock: 0
        });
      }
      const item = reportMap.get(key)!;

      if (isBefore(mv.date, start)) { // Historical movement
        item.initialStock += (mv.type === 'IN' ? mv.qty : -mv.qty);
      } else if (!isAfter(mv.date, end)) { // Movement within period
        if (mv.type === 'IN') item.purchases += mv.qty;
        else item.sales += mv.qty;
      }
    });

    // Calculate final stock based on movements
    reportMap.forEach(item => {
        item.finalStock = item.initialStock + item.purchases - item.sales;
    });

    return Array.from(reportMap.values());
  }, [purchaseOrders, salesOrders, inventoryAdjustments, isLoading, dateRange]);
  

  // 4. Filtering for display
  const { filteredData, totalIn, totalOut, netRotation, totalStockVal } = useMemo(() => {
    const data = inventoryReport.filter(item => {
        const matchWarehouse = selectedWarehouse === "All" || item.warehouse === selectedWarehouse;
        const matchProduct = selectedProduct === "All" || normalize(item.product) === normalize(selectedProduct);
        const matchSearch = searchTerm === "" || 
                            item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.caliber?.toLowerCase().includes(searchTerm.toLowerCase());
        const hasData = item.initialStock !== 0 || item.purchases !== 0 || item.sales !== 0 || item.finalStock !== 0;
        return matchWarehouse && matchProduct && matchSearch && hasData;
    }).sort((a,b) => a.product.localeCompare(b.product) || a.caliber.localeCompare(b.caliber));

    const totals = data.reduce((acc, item) => {
        acc.totalIn += item.purchases;
        acc.totalOut += item.sales;
        acc.totalStockVal += item.finalStock;
        return acc;
    }, { totalIn: 0, totalOut: 0, totalStockVal: 0 });

    return { filteredData: data, ...totals, netRotation: totals.totalIn - totals.totalOut };
  }, [inventoryReport, selectedWarehouse, selectedProduct, searchTerm]);

  // 5. Handlers
  const handleExport = () => {
    toast({ title: "Exportando...", description: "Generando archivo Excel del reporte." });
    const dataToExport = filteredData.map(item => ({
        'Producto': item.product, 'Calibre': item.caliber, 'Bodega': item.warehouse,
        'Stock Inicial (Kg)': item.initialStock, 'Entradas (Kg)': item.purchases,
        'Salidas (Kg)': item.sales, 'Stock Final (Kg)': item.finalStock,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte de Inventario');
    XLSX.writeFile(workbook, `Reporte_Inventario_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handleNormalization = async () => {
    if (!firestore || !purchaseOrders) return;
    toast({ title: "Iniciando Normalización..." });

    const updates: Promise<void>[] = [];
    let updatedCount = 0;

    purchaseOrders.forEach(po => {
        let hasChanges = false;
        const updatedItems = po.items.map(item => {
            if (!item.product) return item;
            let newName = item.product;
            const normalized = normalize(item.product);
            
            if (normalized === 'PALTAS') newName = 'PALTA HASS';
            if (normalized === 'MANDARINA') newName = 'MANDARINAS';

            if (newName !== item.product) {
                hasChanges = true;
                return { ...item, product: newName };
            }
            return item;
        });

        if (hasChanges) {
            updatedCount++;
            updates.push(updateDoc(doc(firestore, 'purchaseOrders', po.id), { items: updatedItems }));
        }
    });
    
    if (updates.length > 0) {
        await Promise.all(updates);
        toast({ title: "Normalización Completa", description: `${updatedCount} órdenes de compra actualizadas.` });
    } else {
        toast({ title: "Sin Cambios", description: "Los nombres de productos ya estaban normalizados." });
    }
  };

  const renderContent = () => {
    if (isLoading) return <Skeleton className="h-96 w-full bg-slate-800" />;
    return (
       <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto relative">
            <Table>
                <TableHeader className="bg-slate-950/50 sticky top-0 z-10">
                    <TableRow className="border-slate-800 hover:bg-slate-900">
                        <TableHead className="text-slate-400 font-bold w-[250px]">Producto / Calibre</TableHead>
                        <TableHead className="text-slate-400 font-bold w-[150px]">Bodega</TableHead>
                        <TableHead className="text-right text-slate-500 font-bold">Stock Inicial</TableHead>
                        <TableHead className="text-right text-emerald-400 font-bold">Entradas</TableHead>
                        <TableHead className="text-right text-red-400 font-bold">Salidas</TableHead>
                        <TableHead className="text-right text-blue-400 font-bold text-lg">Stock Final</TableHead>
                        <TableHead className="text-center">Historial</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredData.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center h-32 text-slate-500">Sin movimientos en este período.</TableCell></TableRow>
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
                                    {item.purchases > 0 && <ArrowUp size={14}/>} {formatKilos(item.purchases)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-red-400 flex justify-end items-center gap-1">
                                    {item.sales > 0 && <ArrowDown size={14}/>} {formatKilos(item.sales)}
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
            <p className="text-slate-400 mt-1">Análisis de movimientos y trazabilidad del inventario.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={handleNormalization} variant="outline" className="border-purple-500/30 bg-purple-950/20 text-purple-300 hover:bg-purple-950/60 hover:text-purple-200">
                <Wand2 className="mr-2 h-4 w-4" /> Normalizar Nombres
            </Button>
            <Button onClick={handleExport} variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
                <Download className="mr-2 h-4 w-4" /> Exportar Excel
            </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-slate-900 border-slate-800"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-emerald-400">Total Entradas (Periodo)</CardTitle><ArrowUp/></CardHeader><CardContent><div className="text-2xl font-bold">{formatKilos(totalIn)}</div></CardContent></Card>
          <Card className="bg-slate-900 border-slate-800"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-red-400">Total Salidas (Periodo)</CardTitle><ArrowDown/></CardHeader><CardContent><div className="text-2xl font-bold">{formatKilos(totalOut)}</div></CardContent></Card>
          <Card className="bg-slate-900 border-slate-800"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-blue-400">Stock Final Actual</CardTitle><Package/></CardHeader><CardContent><div className="text-2xl font-bold">{formatKilos(totalStockVal)}</div></CardContent></Card>
      </div>
      
      <Card className="bg-slate-900 border-slate-800 shadow-lg">
        <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input placeholder="Buscar calibre o variedad..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-slate-950 border-slate-800 text-slate-100" />
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button id="date" variant={"outline"} className={cn("justify-start text-left font-normal bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white", !dateRange && "text-muted-foreground" )}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Seleccione rango</span>)}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700" align="start"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/></PopoverContent>
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
