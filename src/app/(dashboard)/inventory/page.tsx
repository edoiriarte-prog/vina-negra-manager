"use client";

import React, { useState, useMemo } from 'react';
import { useOperations } from '@/hooks/use-operations';
import { useMasterData } from '@/hooks/use-master-data';
import { InventoryItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Filter, Download, History } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export default function InventoryPage() {
  // 1. CARGAR DATOS DE LA NUBE
  const { purchaseOrders, salesOrders, inventoryAdjustments, isLoading: loadingOps } = useOperations();
  const { warehouses, products, isLoading: loadingMaster } = useMasterData();

  const isLoading = loadingOps || loadingMaster;

  // 2. ESTADOS DE FILTRO
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("All");
  const [selectedProduct, setSelectedProduct] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");

  // 3. CÁLCULO DE INVENTARIO EN TIEMPO REAL
  // (Misma lógica robusta del Dashboard)
  const inventoryData = useMemo(() => {
    if (isLoading) return [];

    const stockMap = new Map<string, InventoryItem>();

    // A. Sumar Compras (Entradas)
    purchaseOrders.forEach(order => {
        if (order.status === 'completed' || order.status === 'received') {
            order.items.forEach(item => {
                // La clave incluye la bodega para poder filtrar después
                const warehouse = order.warehouse || 'Principal';
                const key = `${item.product}-${item.caliber}-${warehouse}`;
                
                const current = stockMap.get(key) || {
                    id: key,
                    name: item.product,
                    caliber: item.caliber,
                    warehouse: warehouse,
                    stock: 0,
                    category: 'fruit',
                    unit: 'Kilos',
                    cost: 0
                };
                
                current.stock += item.quantity;
                stockMap.set(key, current);
            });
        }
    });

    // B. Restar Ventas (Salidas)
    salesOrders.forEach(order => {
        if (order.status === 'completed' || order.status === 'dispatched' || order.status === 'invoiced') {
            order.items.forEach(item => {
                const warehouse = order.warehouse || 'Principal'; // Bodega de origen
                const key = `${item.product}-${item.caliber}-${warehouse}`;
                
                if (stockMap.has(key)) {
                    const current = stockMap.get(key)!;
                    current.stock -= item.quantity;
                    stockMap.set(key, current);
                } else {
                    // Si vendemos algo que "no estaba" (inventario negativo), lo registramos igual
                    stockMap.set(key, {
                        id: key,
                        name: item.product,
                        caliber: item.caliber,
                        warehouse: warehouse,
                        stock: -item.quantity,
                        category: 'fruit',
                        unit: 'Kilos',
                        cost: 0
                    });
                }
            });
        }
    });

    // C. Ajustes Manuales
    inventoryAdjustments.forEach(adj => {
        const key = `${adj.product}-${adj.caliber}-${adj.warehouse}`;
        const current = stockMap.get(key) || {
            id: key,
            name: adj.product,
            caliber: adj.caliber,
            warehouse: adj.warehouse,
            stock: 0,
            category: 'fruit',
            unit: 'Kilos',
            cost: 0
        };

        if (adj.type === 'increase') current.stock += adj.quantity;
        else current.stock -= adj.quantity;
        
        stockMap.set(key, current);
    });

    return Array.from(stockMap.values());
  }, [purchaseOrders, salesOrders, inventoryAdjustments, isLoading]);

  // 4. FILTRADO PARA LA TABLA
  const filteredInventory = useMemo(() => {
      return inventoryData.filter(item => {
          const matchWarehouse = selectedWarehouse === "All" || item.warehouse === selectedWarehouse;
          const matchProduct = selectedProduct === "All" || item.name === selectedProduct;
          const matchSearch = searchTerm === "" || 
                              item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              item.caliber?.toLowerCase().includes(searchTerm.toLowerCase());
          
          // Opcional: Ocultar stock 0 para limpiar la vista
          const hasStock = item.stock !== 0;

          return matchWarehouse && matchProduct && matchSearch && hasStock;
      }).sort((a, b) => a.name.localeCompare(b.name)); // Ordenar alfabéticamente
  }, [inventoryData, selectedWarehouse, selectedProduct, searchTerm]);

  // 5. EXPORTAR EXCEL
  const handleExport = () => {
    const data = filteredInventory.map(item => ({
        'Producto': item.name,
        'Calibre': item.caliber,
        'Bodega': item.warehouse,
        'Stock Actual (Kg)': item.stock,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
    XLSX.writeFile(workbook, `Inventario_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  if (isLoading) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-slate-950 min-h-screen text-slate-100">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Inventario en Tiempo Real</h2>
            <p className="text-slate-400 mt-1">Consulta de stock consolidado por bodega y producto.</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
            <Download className="mr-2 h-4 w-4" /> Exportar Excel
        </Button>
      </div>

      {/* BARRA DE FILTROS */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input 
                        placeholder="Buscar calibre o variedad..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-slate-950 border-slate-800 text-slate-100"
                    />
                </div>
                
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-100">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-slate-500"/>
                            <SelectValue placeholder="Bodega" />
                        </div>
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                        <SelectItem value="All">Todas las Bodegas</SelectItem>
                        {/* AQUÍ ESTABA EL ERROR: Ahora mapeamos strings simples */}
                        {warehouses.map(w => (
                            <SelectItem key={w} value={w}>{w}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-100">
                        <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-slate-500"/>
                            <SelectValue placeholder="Producto" />
                        </div>
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                        <SelectItem value="All">Todos los Productos</SelectItem>
                        {products.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="flex items-center justify-end text-sm text-slate-400">
                    <span className="font-mono font-bold text-white mr-1">{filteredInventory.length}</span> registros encontrados
                </div>
            </div>
        </CardContent>
      </Card>

      {/* TABLA DE RESULTADOS */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
            <Table>
                <TableHeader className="bg-slate-950">
                    <TableRow className="border-slate-800 hover:bg-slate-900">
                        <TableHead className="text-slate-400 font-bold">Producto</TableHead>
                        <TableHead className="text-slate-400 font-bold">Calibre</TableHead>
                        <TableHead className="text-slate-400 font-bold">Bodega</TableHead>
                        <TableHead className="text-right text-slate-400 font-bold">Stock (Kg)</TableHead>
                        <TableHead className="text-center text-slate-400 font-bold">Estado</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredInventory.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-32 text-slate-500">
                                No hay stock disponible con los filtros actuales.
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredInventory.map((item) => (
                            <TableRow key={item.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                                <TableCell className="font-medium text-white">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-blue-500/10 rounded text-blue-500">
                                            <Package className="h-4 w-4"/>
                                        </div>
                                        {item.name}
                                    </div>
                                </TableCell>
                                <TableCell className="text-slate-300">
                                    <Badge variant="outline" className="border-slate-700 text-slate-400 font-mono text-xs">
                                        {item.caliber}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-slate-400 text-sm">{item.warehouse}</TableCell>
                                <TableCell className="text-right">
                                    <span className={`font-mono font-bold text-lg ${item.stock > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {new Intl.NumberFormat('es-CL').format(item.stock)}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">
                                    {item.stock > 0 ? (
                                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">Disponible</Badge>
                                    ) : (
                                        <Badge className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20">Sin Stock</Badge>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
      </Card>
    </div>
  );
}
