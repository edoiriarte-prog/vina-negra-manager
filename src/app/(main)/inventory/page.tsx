
"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { getInventory, inventoryAdjustments as initialInventoryAdjustments, purchaseOrders as initialPurchaseOrders, salesOrders as initialSalesOrders } from '@/lib/data';
import { PurchaseOrder, SalesOrder, InventoryItem, InventoryAdjustment } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PerformanceReports } from '../reports/components/performance-reports';
import { useMasterData } from '@/hooks/use-master-data';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InventoryHistoryDialog } from './components/inventory-history-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Printer, Download } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { useReactToPrint } from 'react-to-print';

export default function InventoryPage() {
  const [purchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
  const [salesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
  const [inventoryAdjustments] = useLocalStorage<InventoryAdjustment[]>('inventoryAdjustments', initialInventoryAdjustments);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isClient, setIsClient] = useState(false);
  const { warehouses } = useMasterData();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('All');
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const { toast } = useToast();

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
      content: () => printRef.current,
  });

  useEffect(() => {
    setIsClient(true);
    // Set the date only on the client side to avoid hydration mismatch
    setFilterDate(new Date());
  }, []);

  useEffect(() => {
    if (isClient) {
        const endDate = filterDate ? startOfDay(filterDate) : new Date();

        const filteredPurchases = purchaseOrders.filter(po => new Date(po.date) <= endDate);
        const filteredSales = salesOrders.filter(so => new Date(so.date) <= endDate);
        const filteredAdjustments = inventoryAdjustments.filter(adj => new Date(adj.date) <= endDate);

        setInventory(getInventory(filteredPurchases, filteredSales, filteredAdjustments));
    }
  }, [purchaseOrders, salesOrders, inventoryAdjustments, isClient, filterDate]);
  
  const formatKilos = (value: number) => new Intl.NumberFormat('es-CL').format(value) + ' kg';

  const filteredInventory = useMemo(() => {
    if (selectedWarehouse === 'All') {
      const combined = new Map<string, InventoryItem>();
      inventory.forEach(item => {
        const key = `${item.product} - ${item.caliber}`;
        const existing = combined.get(key) || { 
            key, 
            product: item.product, 
            caliber: item.caliber, 
            warehouse: 'All', 
            kilosPurchased: 0, 
            kilosSold: 0, 
            stock: 0 
        };
        existing.kilosPurchased += item.kilosPurchased;
        existing.kilosSold += item.kilosSold;
        existing.stock += item.stock;
        combined.set(key, existing);
      });
      return Array.from(combined.values());
    }
    return inventory.filter(item => item.warehouse === selectedWarehouse);
  }, [inventory, selectedWarehouse]);

  const totals = useMemo(() => {
    return filteredInventory.reduce(
      (acc, item) => {
        acc.kilosPurchased += item.kilosPurchased;
        acc.kilosSold += item.kilosSold;
        acc.stock += item.stock;
        return acc;
      },
      { kilosPurchased: 0, kilosSold: 0, stock: 0 }
    );
  }, [filteredInventory]);

  const handleShowHistory = (item: InventoryItem) => {
    setHistoryItem(item);
  };
  
  const handleExportSummary = () => {
    if (filteredInventory.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'No hay datos de inventario para exportar.' });
      return;
    }
    const dataForSheet = filteredInventory.map(item => ({
      'Producto': item.product,
      'Calibre': item.caliber,
      'Bodega': selectedWarehouse,
      'Kilos Comprados': item.kilosPurchased,
      'Kilos Vendidos': item.kilosSold,
      'Stock Actual': item.stock,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen de Inventario');
    XLSX.writeFile(workbook, `Resumen_Inventario_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({ title: 'Exportación Exitosa', description: 'El resumen de inventario ha sido exportado.' });
  }

  const renderInventoryRows = () => {
    if (!isClient) {
      // Render skeleton rows on the server and initial client render
      return Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        </TableRow>
      ));
    }
    
    return filteredInventory.map((item) => (
        <TableRow key={item.key} onClick={() => handleShowHistory(item)} className="cursor-pointer">
            <TableCell className="font-medium">{item.product}</TableCell>
            <TableCell>{item.caliber}</TableCell>
            <TableCell className="text-right">{formatKilos(item.kilosPurchased)}</TableCell>
            <TableCell className="text-right">{formatKilos(item.kilosSold)}</TableCell>
            <TableCell className="text-right font-bold text-primary">{formatKilos(item.stock)}</TableCell>
        </TableRow>
    ));
  }

  return (
    <>
      <div className="flex flex-col gap-6">
       <div className="flex justify-between items-start no-print">
          <div>
            <h1 className="font-headline text-3xl">Inventario y Rendimiento</h1>
            <p className="text-muted-foreground">Analiza el stock actual y el rendimiento de tus productos.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportSummary} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar Resumen
            </Button>
            <Button onClick={handlePrint} variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir Inventario
            </Button>
          </div>
        </div>

      <Tabs defaultValue="stock">
        <TabsList className="grid w-full grid-cols-2 no-print">
          <TabsTrigger value="stock">Stock Actual</TabsTrigger>
          <TabsTrigger value="performance">Rendimiento de Productos</TabsTrigger>
        </TabsList>
        <TabsContent value="stock">
            <div className="no-print">
                <Card className="mt-6 print:shadow-none print:border-none">
                  <CardHeader>
                      <div className="no-print">
                        <CardTitle className="font-headline text-2xl">Inventario en Tiempo Real</CardTitle>
                        <CardDescription>
                          Stock disponible calculado a partir de las compras y ventas completadas.
                          <span className="no-print"> Haz clic en una fila para ver el historial.</span>
                        </CardDescription>
                      </div>
                  </CardHeader>
                  <CardContent>
                      <div className="flex items-center gap-4 mb-4 no-print">
                        <div>
                          <Label>Bodega</Label>
                          <div className="flex items-center gap-2">
                            <Button
                              variant={selectedWarehouse === 'All' ? 'default' : 'outline'}
                              onClick={() => setSelectedWarehouse('All')}
                            >
                              Todas las bodegas
                            </Button>
                            {warehouses.map(w => (
                              <Button
                                key={w}
                                variant={selectedWarehouse === w ? 'default' : 'outline'}
                                onClick={() => setSelectedWarehouse(w)}
                              >
                                {w}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Ver inventario al</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-[280px] justify-start text-left font-normal", !filterDate && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filterDate ? format(filterDate, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={filterDate || undefined}
                                    onSelect={(date) => setFilterDate(date || null)}
                                    initialFocus
                                  />
                                </PopoverContent>
                            </Popover>
                        </div>
                      </div>
                      <div className="rounded-md border">
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead className='font-bold'>Producto</TableHead>
                                      <TableHead className='font-bold'>Calibre</TableHead>
                                      <TableHead className='text-right font-bold'>Kilos Comprados</TableHead>
                                      <TableHead className='text-right font-bold'>Kilos Vendidos</TableHead>
                                      <TableHead className='text-right font-bold text-primary'>Stock Actual</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {renderInventoryRows()}
                              </TableBody>
                              {isClient && (
                              <TableFooter>
                                  <TableRow>
                                  <TableHead colSpan={2} className="font-bold text-lg">Total ({selectedWarehouse === 'All' ? 'Global' : selectedWarehouse})</TableHead>
                                  <TableHead className="text-right font-bold text-lg">{formatKilos(totals.kilosPurchased)}</TableHead>
                                  <TableHead className="text-right font-bold text-lg">{formatKilos(totals.kilosSold)}</TableHead>
                                  <TableHead className="text-right font-bold text-lg text-primary">{formatKilos(totals.stock)}</TableHead>
                                  </TableRow>
                              </TableFooter>
                              )}
                          </Table>
                      </div>
                  </CardContent>
              </Card>
            </div>
            {/* Hidden printable content */}
            <div className="hidden">
                 <div ref={printRef} className="p-4">
                    <Card className="mt-6 print:shadow-none print:border-none">
                        <CardHeader>
                            <div className="print-only hidden print:block">
                                <CardTitle className="font-headline text-2xl">Inventario al {filterDate ? format(filterDate, "PPP", { locale: es }) : ""}</CardTitle>
                                <CardDescription>Bodega: {selectedWarehouse === 'All' ? 'Todas' : selectedWarehouse}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className='font-bold'>Producto</TableHead>
                                            <TableHead className='font-bold'>Calibre</TableHead>
                                            <TableHead className='text-right font-bold'>Kilos Comprados</TableHead>
                                            <TableHead className='text-right font-bold'>Kilos Vendidos</TableHead>
                                            <TableHead className='text-right font-bold text-primary'>Stock Actual</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isClient ? (
                                          filteredInventory.map((item) => (
                                              <TableRow key={item.key}>
                                                  <TableCell className="font-medium">{item.product}</TableCell>
                                                  <TableCell>{item.caliber}</TableCell>
                                                  <TableCell className="text-right">{formatKilos(item.kilosPurchased)}</TableCell>
                                                  <TableCell className="text-right">{formatKilos(item.kilosSold)}</TableCell>
                                                  <TableCell className="text-right font-bold text-primary">{formatKilos(item.stock)}</TableCell>
                                              </TableRow>
                                          ))
                                        ) : null}
                                    </TableBody>
                                    {isClient && (
                                    <TableFooter>
                                        <TableRow>
                                        <TableHead colSpan={2} className="font-bold text-lg">Total ({selectedWarehouse === 'All' ? 'Global' : selectedWarehouse})</TableHead>
                                        <TableHead className="text-right font-bold text-lg">{formatKilos(totals.kilosPurchased)}</TableHead>
                                        <TableHead className="text-right font-bold text-lg">{formatKilos(totals.kilosSold)}</TableHead>
                                        <TableHead className="text-right font-bold text-lg text-primary">{formatKilos(totals.stock)}</TableHead>
                                        </TableRow>
                                    </TableFooter>
                                    )}
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TabsContent>
        <TabsContent value="performance">
             <PerformanceReports
                salesOrders={salesOrders}
                purchaseOrders={purchaseOrders}
            />
        </TabsContent>
      </Tabs>
      </div>
      <InventoryHistoryDialog
        item={historyItem}
        isOpen={!!historyItem}
        onOpenChange={() => setHistoryItem(null)}
      />
    </>
  );
}
