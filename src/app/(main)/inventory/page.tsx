

"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { PurchaseOrder, SalesOrder, InventoryAdjustment, Contact } from '@/lib/types';
import { purchaseOrders as initialPurchaseOrders, salesOrders as initialSalesOrders, inventoryAdjustments as initialInventoryAdjustments, contacts as initialContacts } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMasterData } from '@/hooks/use-master-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Eye, Download, Printer, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, startOfMonth, endOfMonth, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { InventoryHistoryDialog } from './components/inventory-history-dialog';
import { InventoryReportPreview } from './components/inventory-report-preview';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type InventoryReportItem = {
    key: string;
    product: string;
    caliber: string;
    caliberCode: string;
    initialStockKg: number;
    inflowKg: number;
    outflowKg: number;
    adjustmentsKg: number;
    finalStockKg: number;
    initialStockPackages: number;
    inflowPackages: number;
    outflowPackages: number;
    adjustmentsPackages: number;
    finalStockPackages: number;
};

type LotDispatch = {
    date: string;
    documentId: string; // SO id or adjustment reason
    clientName: string; // Or "Ajuste"
    packages: number;
    kilos: number;
};

type LotInventoryItem = {
    lotNumber: string;
    warehouse: string;
    product: string;
    caliber: string;
    purchaseOrderId: string;
    supplierId: string;
    supplierName: string;
    purchaseDate: string;
    initialPackages: number;
    initialKilos: number;
    availablePackages: number;
    availableKilos: number;
    avgWeight: number;
    dispatches: LotDispatch[];
};

const formatKilos = (value: number) => new Intl.NumberFormat('es-CL').format(value) + ' kg';
const formatPackages = (value: number) => new Intl.NumberFormat('es-CL').format(value);


export default function InventoryPage() {
    const [purchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
    const [salesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', initialSalesOrders);
    const [inventoryAdjustments] = useLocalStorage<InventoryAdjustment[]>('inventoryAdjustments', initialInventoryAdjustments);
    const [contacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
    const { calibers: masterCalibers, warehouses, products: masterProducts } = useMasterData();

    const [isClient, setIsClient] = useState(false);
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('All');
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [inventoryData, setInventoryData] = useState<InventoryReportItem[]>([]);
    const [viewingHistory, setViewingHistory] = useState<any | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [lotFilter, setLotFilter] = useState('');
    const [openLotGroups, setOpenLotGroups] = useState<Record<string, boolean>>({});

    const { toast } = useToast();
    const printRef = useRef<HTMLDivElement>(null);
    
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
    });
    
    useEffect(() => {
        setIsClient(true);
    }, []);
    
    useEffect(() => {
        if (isClient && masterProducts.length > 0 && !selectedProduct) {
            setSelectedProduct(masterProducts[0]);
        }
    }, [isClient, masterProducts, selectedProduct]);


    useEffect(() => {
        if (isClient && selectedProduct) {
            const getStockAsOf = (date: Date) => {
                const stockMap = new Map<string, { kg: number, packages: number }>();

                // Process Purchases
                purchaseOrders
                    .filter(po => po.status === 'completed' && !isAfter(parseISO(po.date), date))
                    .forEach(po => {
                        const warehouse = po.destinationWarehouse || po.warehouse;
                         if (selectedWarehouse === 'All' || warehouse === selectedWarehouse) {
                            po.items.forEach(item => {
                                if (item.product === selectedProduct && item.unit === 'Kilos') {
                                    const key = `${item.product}-${item.caliber}`;
                                    const currentStock = stockMap.get(key) || { kg: 0, packages: 0 };
                                    currentStock.kg += item.quantity;
                                    currentStock.packages += (item.packagingQuantity || 0);
                                    stockMap.set(key, currentStock);
                                }
                            });
                        }
                    });

                // Process Sales and Transfers
                salesOrders
                    .filter(so => (so.status === 'completed' || so.status === 'pending') && !isAfter(parseISO(so.date), date))
                    .forEach(so => {
                         so.items.forEach(item => {
                            if (item.product === selectedProduct && item.unit === 'Kilos') {
                                // Decrease from source warehouse
                                if (selectedWarehouse === 'All' || so.warehouse === selectedWarehouse) {
                                    const key = `${item.product}-${item.caliber}`;
                                    const currentStock = stockMap.get(key) || { kg: 0, packages: 0 };
                                    currentStock.kg -= item.quantity;
                                    currentStock.packages -= (item.packagingQuantity || 0);
                                    stockMap.set(key, currentStock);
                                }

                                // Increase in destination warehouse (for internal transfers)
                                if (so.movementType === 'Traslado Bodega Interna' && so.destinationWarehouse) {
                                    if (selectedWarehouse === 'All' || so.destinationWarehouse === selectedWarehouse) {
                                        const key = `${item.product}-${item.caliber}`;
                                        const currentStock = stockMap.get(key) || { kg: 0, packages: 0 };
                                        currentStock.kg += item.quantity;
                                        currentStock.packages += (item.packagingQuantity || 0);
                                        stockMap.set(key, currentStock);
                                    }
                                }
                            }
                        });
                    });

                // Process Adjustments
                inventoryAdjustments
                    .filter(adj => adj.product === selectedProduct && !isAfter(parseISO(adj.date), date))
                    .forEach(adj => {
                        if (selectedWarehouse === 'All' || adj.warehouse === selectedWarehouse) {
                            const key = `${adj.product}-${adj.caliber}`;
                            const currentStock = stockMap.get(key) || { kg: 0, packages: 0 };
                            const sign = adj.type === 'increase' ? 1 : -1;
                            currentStock.kg += adj.quantity * sign;
                            currentStock.packages += (adj.packagingQuantity || 0) * sign;
                            stockMap.set(key, currentStock);
                        }
                    });

                return stockMap;
            };

            const initialStockMap = getStockAsOf(new Date(dateRange.from.getTime() - 86400000));
            const filterByDate = (dateStr: string) => !isBefore(parseISO(dateStr), dateRange.from) && !isAfter(parseISO(dateStr), dateRange.to);

            const inflowsMap = new Map<string, { kg: number, packages: number }>();
            const outflowsMap = new Map<string, { kg: number, packages: number }>();
            const adjustmentsMap = new Map<string, { kg: number, packages: number }>();
            const allCalibers = new Set<string>();

            // Calculate inflows, outflows, and adjustments for the selected period
            purchaseOrders.filter(po => po.status === 'completed' && filterByDate(po.date)).forEach(po => {
                const warehouse = po.destinationWarehouse || po.warehouse;
                if (selectedWarehouse === 'All' || warehouse === selectedWarehouse) {
                    po.items.forEach(item => {
                        if (item.product === selectedProduct && item.unit === 'Kilos') {
                            const key = `${item.product}-${item.caliber}`;
                            const current = inflowsMap.get(key) || { kg: 0, packages: 0 };
                            current.kg += item.quantity;
                            current.packages += item.packagingQuantity || 0;
                            inflowsMap.set(key, current);
                            allCalibers.add(item.caliber);
                        }
                    });
                }
            });

            salesOrders.filter(so => (so.status === 'completed' || so.status === 'pending') && filterByDate(so.date)).forEach(so => {
                so.items.forEach(item => {
                    if (item.product === selectedProduct && item.unit === 'Kilos') {
                        // Outflow from source
                        if (selectedWarehouse === 'All' || so.warehouse === selectedWarehouse) {
                            const key = `${item.product}-${item.caliber}`;
                            const current = outflowsMap.get(key) || { kg: 0, packages: 0 };
                            current.kg += item.quantity;
                            current.packages += (item.packagingQuantity || 0);
                            outflowsMap.set(key, current);
                            allCalibers.add(item.caliber);
                        }
                        // Inflow to destination for transfers
                        if (so.movementType === 'Traslado Bodega Interna' && so.destinationWarehouse) {
                            if (selectedWarehouse === 'All' || so.destinationWarehouse === selectedWarehouse) {
                                const key = `${item.product}-${item.caliber}`;
                                const current = inflowsMap.get(key) || { kg: 0, packages: 0 };
                                current.kg += item.quantity;
                                current.packages += (item.packagingQuantity || 0);
                                inflowsMap.set(key, current);
                                allCalibers.add(item.caliber);
                            }
                        }
                    }
                });
            });

            inventoryAdjustments.filter(adj => filterByDate(adj.date) && adj.product === selectedProduct).forEach(adj => {
                if (selectedWarehouse === 'All' || adj.warehouse === selectedWarehouse) {
                    const key = `${adj.product}-${adj.caliber}`;
                    const current = adjustmentsMap.get(key) || { kg: 0, packages: 0 };
                    const sign = adj.type === 'increase' ? 1 : -1;
                    current.kg += adj.quantity * sign;
                    current.packages += (adj.packagingQuantity || 0) * sign;
                    adjustmentsMap.set(key, current);
                    allCalibers.add(adj.caliber);
                }
            });

            initialStockMap.forEach((_, key) => allCalibers.add(key.split('-')[1]));
            inflowsMap.forEach((_, key) => allCalibers.add(key.split('-')[1]));
            outflowsMap.forEach((_, key) => allCalibers.add(key.split('-')[1]));
            adjustmentsMap.forEach((_, key) => allCalibers.add(key.split('-')[1]));

            const reportData: InventoryReportItem[] = Array.from(allCalibers).map(caliber => {
                const key = `${selectedProduct}-${caliber}`;
                const initialStock = initialStockMap.get(key) || { kg: 0, packages: 0 };
                const inflows = inflowsMap.get(key) || { kg: 0, packages: 0 };
                const outflows = outflowsMap.get(key) || { kg: 0, packages: 0 };
                const adjustments = adjustmentsMap.get(key) || { kg: 0, packages: 0 };

                return {
                    key,
                    product: selectedProduct,
                    caliber,
                    caliberCode: masterCalibers.find(c => c.name === caliber)?.code || 'N/A',
                    initialStockKg: initialStock.kg,
                    initialStockPackages: initialStock.packages,
                    inflowKg: inflows.kg,
                    inflowPackages: inflows.packages,
                    outflowKg: outflows.kg,
                    outflowPackages: outflows.packages,
                    adjustmentsKg: adjustments.kg,
                    adjustmentsPackages: adjustments.packages,
                    finalStockKg: initialStock.kg + inflows.kg - outflows.kg + adjustments.kg,
                    finalStockPackages: initialStock.packages + inflows.packages - outflows.packages + adjustments.packages,
                };
            }).sort((a, b) => {
                const caliberAIndex = masterCalibers.findIndex(c => c.code === a.caliberCode);
                const caliberBIndex = masterCalibers.findIndex(c => c.code === b.caliberCode);
                if (caliberAIndex === -1 && caliberBIndex === -1) return a.caliber.localeCompare(b.caliber);
                if (caliberAIndex === -1) return 1;
                if (caliberBIndex === -1) return -1;
                return caliberAIndex - caliberBIndex;
            });
            
            setInventoryData(reportData);
        }
    }, [isClient, dateRange, selectedWarehouse, selectedProduct, purchaseOrders, salesOrders, inventoryAdjustments, masterCalibers, masterProducts]);
    
    const lotInventory = useMemo(() => {
        if (!isClient) return [];
    
        const lotMap = new Map<string, LotInventoryItem>();
    
        // 1. Initialize lots from all purchase orders
        purchaseOrders.forEach(po => {
            if (po.status === 'completed') {
                po.items.forEach(item => {
                    if (item.lotNumber) {
                        const warehouse = po.destinationWarehouse || po.warehouse;
                        const lotKey = `${item.lotNumber}-${warehouse}`;

                        if (!lotMap.has(lotKey)) {
                            lotMap.set(lotKey, {
                                lotNumber: item.lotNumber,
                                warehouse: warehouse,
                                product: item.product,
                                caliber: item.caliber,
                                purchaseOrderId: po.id,
                                supplierId: po.supplierId,
                                supplierName: contacts.find(c => c.id === po.supplierId)?.name || 'N/A',
                                purchaseDate: po.date,
                                initialKilos: 0,
                                initialPackages: 0,
                                availableKilos: 0,
                                availablePackages: 0,
                                avgWeight: 0,
                                dispatches: [],
                            });
                        }
                        const lot = lotMap.get(lotKey)!;
                        lot.initialKilos += item.quantity;
                        lot.initialPackages += item.packagingQuantity || 0;
                        lot.availableKilos += item.quantity;
                        lot.availablePackages += item.packagingQuantity || 0;
                    }
                });
            }
        });
    
        // 2. Handle all movements (sales, transfers, adjustments)
        const allMovements: (SalesOrder | InventoryAdjustment)[] = [
            ...salesOrders,
            ...inventoryAdjustments
        ];

        allMovements.forEach(movement => {
            const isTransfer = 'movementType' in movement && (movement as SalesOrder).movementType === 'Traslado Bodega Interna';
            const fromWarehouse = 'warehouse' in movement ? (movement as SalesOrder | InventoryAdjustment).warehouse : '';
            const toWarehouse = isTransfer ? (movement as SalesOrder).destinationWarehouse : undefined;

            const itemsToProcess = 'items' in movement ? movement.items : [movement as InventoryAdjustment];

            itemsToProcess.forEach(item => {
                if (item.lotNumber && fromWarehouse) {
                    // Decrease from source warehouse
                    const sourceLotKey = `${item.lotNumber}-${fromWarehouse}`;
                    const sourceLot = lotMap.get(sourceLotKey);
                    if (sourceLot) {
                        const quantityKg = item.quantity;
                        const quantityPkg = item.packagingQuantity || 0;

                        sourceLot.availableKilos -= quantityKg;
                        sourceLot.availablePackages -= quantityPkg;

                        if ('orderType' in movement) { // It's a SalesOrder
                             sourceLot.dispatches.push({
                                date: (movement as SalesOrder).date,
                                documentId: movement.id,
                                clientName: contacts.find(c => c.id === (movement as SalesOrder).clientId)?.name || 'N/A',
                                packages: quantityPkg,
                                kilos: quantityKg,
                            });
                        } else if ('reason' in movement) { // It's an InventoryAdjustment
                             sourceLot.dispatches.push({
                                date: (movement as InventoryAdjustment).date,
                                documentId: `Ajuste (${(movement as InventoryAdjustment).reason})`,
                                clientName: 'Ajuste Interno',
                                packages: quantityPkg,
                                kilos: quantityKg,
                            });
                        }
                    }

                    // If it's a transfer, increase in destination warehouse
                    if (isTransfer && toWarehouse) {
                        const destLotKey = `${item.lotNumber}-${toWarehouse}`;
                        let destLot = lotMap.get(destLotKey);
                        if (!destLot) {
                            const originalLot = lotMap.get(sourceLotKey);
                             if (originalLot) {
                                destLot = {
                                    ...originalLot,
                                    warehouse: toWarehouse,
                                    initialKilos: 0,
                                    initialPackages: 0,
                                    availableKilos: 0,
                                    availablePackages: 0,
                                    dispatches: [],
                                };
                                lotMap.set(destLotKey, destLot);
                            }
                        }
                        if (destLot) {
                            destLot.availableKilos += item.quantity;
                            destLot.availablePackages += item.packagingQuantity || 0;
                        }
                    }
                }
            });
        });
    
        lotMap.forEach(lot => {
            if (lot.initialPackages > 0) {
                lot.avgWeight = lot.initialKilos / lot.initialPackages;
            }
        });
  
        return Array.from(lotMap.values()).sort((a,b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  
    }, [isClient, purchaseOrders, salesOrders, inventoryAdjustments, contacts]);

  const groupedLotInventory = useMemo(() => {
      const groups: Record<string, LotInventoryItem[]> = {};
      lotInventory.forEach(lot => {
          if (!groups[lot.purchaseOrderId]) {
              groups[lot.purchaseOrderId] = [];
          }
          groups[lot.purchaseOrderId].push(lot);
      });
      
      const filteredGroups: Record<string, LotInventoryItem[]> = {};
      if (lotFilter) {
          const lowercasedFilter = lotFilter.toLowerCase();
          for (const ocId in groups) {
              const matchingLots = groups[ocId].filter(lot =>
                  lot.lotNumber.toLowerCase().includes(lowercasedFilter) ||
                  lot.product.toLowerCase().includes(lowercasedFilter) ||
                  lot.caliber.toLowerCase().includes(lowercasedFilter) ||
                  lot.supplierName.toLowerCase().includes(lowercasedFilter)
              );
              if (matchingLots.length > 0) {
                  filteredGroups[ocId] = matchingLots;
              }
          }
           return filteredGroups;
      }
      return groups;
  }, [lotInventory, lotFilter]);
    
    
    const lotInventoryTotals = useMemo(() => {
      const lotsToSum = lotFilter ? Object.values(groupedLotInventory).flat() : lotInventory;
      return lotsToSum.reduce((acc, lot) => {
            acc.initialPackages += lot.initialPackages;
            acc.initialKilos += lot.initialKilos;
            acc.availablePackages += lot.availablePackages;
            acc.availableKilos += lot.availableKilos;
            return acc;
        }, { initialPackages: 0, initialKilos: 0, availablePackages: 0, availableKilos: 0 });
    }, [lotFilter, groupedLotInventory, lotInventory]);


    const handleExport = () => {
      if (!inventoryData.length) {
        toast({ variant: 'destructive', title: 'Sin datos', description: 'No hay datos de inventario para exportar.'});
        return;
      }

      const dataForSheet = inventoryData.map(item => ({
        'Producto': item.product,
        'Calibre': item.caliber,
        'Cód. Calibre': item.caliberCode,
        'Bodega': selectedWarehouse,
        'Stock Inicial (kg)': item.initialStockKg,
        'Entradas (kg)': item.inflowKg,
        'Salidas (kg)': item.outflowKg,
        'Ajustes (kg)': item.adjustmentsKg,
        'Stock Final (kg)': item.finalStockKg,
        'Stock Inicial (envases)': item.initialStockPackages,
        'Entradas (envases)': item.inflowPackages,
        'Salidas (envases)': item.outflowPackages,
        'Ajustes (envases)': item.adjustmentsPackages,
        'Stock Final (envases)': item.finalStockPackages,
      }));

      const summary = [
        ["Reporte de Inventario"],
        ["Producto", selectedProduct],
        ["Periodo", `${format(dateRange.from, 'dd-MM-yyyy')} al ${format(dateRange.to, 'dd-MM-yyyy')}`],
        ["Bodega", selectedWarehouse],
        []
      ];

      const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
      XLSX.utils.sheet_add_aoa(worksheet, summary, { origin: "A1" });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
      XLSX.writeFile(workbook, `Reporte_Inventario_${selectedProduct}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast({ title: 'Exportación Exitosa'});
    };

    const handleExportLots = () => {
        const lotsToExport = lotFilter ? Object.values(groupedLotInventory).flat() : lotInventory;
        if (lotsToExport.length === 0) {
            toast({ variant: 'destructive', title: 'Sin datos', description: 'No hay lotes para exportar.'});
            return;
        }

        const dataForSheet = lotsToExport.map(lot => ({
            'Lote': lot.lotNumber,
            'O/C': lot.purchaseOrderId,
            'Producto': lot.product,
            'Calibre': lot.caliber,
            'Proveedor': lot.supplierName,
            'Fecha Compra': format(parseISO(lot.purchaseDate), 'dd-MM-yyyy'),
            'Envases Iniciales': lot.initialPackages,
            'Kilos Iniciales': lot.initialKilos,
            'Envases Disponibles': lot.availablePackages,
            'Kilos Disponibles': lot.availableKilos,
            'Peso Promedio x Envase': lot.avgWeight.toFixed(2),
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario Por Lote');
        XLSX.writeFile(workbook, `Inventario_Por_Lote_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        toast({ title: 'Exportación Exitosa'});
    }
    
    const totals = useMemo(() => {
        return inventoryData.reduce((acc, item) => {
            acc.initialStockKg += item.initialStockKg;
            acc.inflowKg += item.inflowKg;
            acc.outflowKg += item.outflowKg;
            acc.adjustmentsKg += item.adjustmentsKg;
            acc.finalStockKg += item.finalStockKg;
            acc.initialStockPackages += item.initialStockPackages;
            acc.inflowPackages += item.inflowPackages;
            acc.outflowPackages += item.outflowPackages;
            acc.adjustmentsPackages += item.adjustmentsPackages;
            acc.finalStockPackages += item.finalStockPackages;
            return acc;
        }, { initialStockKg: 0, inflowKg: 0, outflowKg: 0, adjustmentsKg: 0, finalStockKg: 0, initialStockPackages: 0, inflowPackages: 0, outflowPackages: 0, adjustmentsPackages: 0, finalStockPackages: 0 });
    }, [inventoryData]);

    const renderReportContent = (isPrint = false) => {
        if (!isClient) {
            return <Skeleton className="h-96 w-full" />;
        }

        return (
            <div className={cn("rounded-md border", isPrint && "border-none")}>
                <Table className={cn(isPrint && "text-base")}>
                    <TableHeader>
                        <TableRow>
                            <TableHead rowSpan={2} className="align-bottom">Calibre</TableHead>
                            <TableHead rowSpan={2} className="align-bottom">Cód.</TableHead>
                            <TableHead colSpan={2} className="text-center border-b border-l">Stock Inicial</TableHead>
                            <TableHead colSpan={2} className="text-center border-b border-l">Entradas</TableHead>
                            <TableHead colSpan={2} className="text-center border-b border-l">Salidas</TableHead>
                            <TableHead colSpan={2} className="text-center border-b border-l">Ajustes</TableHead>
                            <TableHead colSpan={2} className="text-center border-b border-l font-bold">Stock Final</TableHead>
                            <TableHead rowSpan={2} className="align-bottom w-[50px] border-l no-print">Acciones</TableHead>
                        </TableRow>
                         <TableRow>
                            <TableHead className="text-right border-l">Envases</TableHead>
                            <TableHead className="text-right">Kg</TableHead>
                            <TableHead className="text-right border-l">Envases</TableHead>
                            <TableHead className="text-right">Kg</TableHead>
                            <TableHead className="text-right border-l">Envases</TableHead>
                            <TableHead className="text-right">Kg</TableHead>
                            <TableHead className="text-right border-l">Envases</TableHead>
                            <TableHead className="text-right">Kg</TableHead>
                            <TableHead className="text-right border-l font-bold">Envases</TableHead>
                            <TableHead className="text-right font-bold">Kg</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {inventoryData.length > 0 ? inventoryData.map(item => (
                             <TableRow key={item.key}>
                                <TableCell className="font-medium">{item.caliber}</TableCell>
                                <TableCell>{item.caliberCode}</TableCell>
                                <TableCell className={cn("text-right border-l", isPrint && "text-black")}>{formatPackages(item.initialStockPackages)}</TableCell>
                                <TableCell className={cn("text-right", isPrint && "text-black")}>{formatKilos(item.initialStockKg)}</TableCell>
                                <TableCell className={cn("text-right border-l text-green-500", isPrint && "text-black")}>{item.inflowPackages > 0 ? `+${formatPackages(item.inflowPackages)}` : '-'}</TableCell>
                                <TableCell className={cn("text-right text-green-500", isPrint && "text-black")}>{item.inflowKg > 0 ? `+${formatKilos(item.inflowKg)}` : '-'}</TableCell>
                                <TableCell className={cn("text-right border-l text-red-500", isPrint && "text-black")}>{item.outflowPackages > 0 ? `-${formatPackages(item.outflowPackages)}` : '-'}</TableCell>
                                <TableCell className={cn("text-right text-red-500", isPrint && "text-black")}>{item.outflowKg > 0 ? `-${formatKilos(item.outflowKg)}` : '-'}</TableCell>
                                <TableCell className={cn("text-right border-l", !isPrint && item.adjustmentsPackages !== 0 && (item.adjustmentsPackages > 0 ? "text-blue-500" : "text-orange-500"), isPrint && "text-black")}>{item.adjustmentsPackages !== 0 ? formatPackages(item.adjustmentsPackages) : '-'}</TableCell>
                                <TableCell className={cn("text-right", !isPrint && item.adjustmentsKg !== 0 && (item.adjustmentsKg > 0 ? "text-blue-500" : "text-orange-500"), isPrint && "text-black")}>{item.adjustmentsKg !== 0 ? formatKilos(item.adjustmentsKg) : '-'}</TableCell>
                                <TableCell className={cn("text-right font-bold border-l", isPrint && "text-black")}>{formatPackages(item.finalStockPackages)}</TableCell>
                                <TableCell className={cn("text-right font-bold", isPrint && "text-black")}>{formatKilos(item.finalStockKg)}</TableCell>
                                <TableCell className="border-l no-print">
                                    <Button variant="ghost" size="icon" onClick={() => setViewingHistory({ ...item, warehouse: selectedWarehouse })}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={13} className="text-center h-24">No hay datos de inventario para el período y filtros seleccionados.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                     <TableFooter>
                        <TableRow className={cn(isPrint && "bg-gray-100")}>
                            <TableHead colSpan={2} className="text-right font-bold text-lg">Totales</TableHead>
                            <TableHead className={cn("text-right font-bold text-lg border-l", isPrint && "text-base")}>{formatPackages(totals.initialStockPackages)}</TableHead>
                            <TableHead className={cn("text-right font-bold text-lg", isPrint && "text-base")}>{formatKilos(totals.initialStockKg)}</TableHead>
                            <TableHead className={cn("text-right font-bold text-lg border-l", isPrint && "text-base")}>{formatPackages(totals.inflowPackages)}</TableHead>
                            <TableHead className={cn("text-right font-bold text-lg", isPrint && "text-base")}>{formatKilos(totals.inflowKg)}</TableHead>
                            <TableHead className={cn("text-right font-bold text-lg border-l", isPrint && "text-base")}>{formatPackages(totals.outflowPackages)}</TableHead>
                            <TableHead className={cn("text-right font-bold text-lg", isPrint && "text-base")}>{formatKilos(totals.outflowKg)}</TableHead>
                            <TableHead className={cn("text-right font-bold text-lg border-l", isPrint && "text-base")}>{formatPackages(totals.adjustmentsPackages)}</TableHead>
                            <TableHead className={cn("text-right font-bold text-lg", isPrint && "text-base")}>{formatKilos(totals.adjustmentsKg)}</TableHead>
                            <TableHead className={cn("text-right font-bold text-lg border-l", isPrint && "text-base")}>{formatPackages(totals.finalStockPackages)}</TableHead>
                            <TableHead className={cn("text-right font-bold text-lg", isPrint && "text-base")}>{formatKilos(totals.finalStockKg)}</TableHead>
                             <TableHead className="no-print"></TableHead>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        );
    }
    
     const renderLotInventoryContent = () => {
        if (!isClient) return <Skeleton className="h-96 w-full" />;

        return (
            <>
                <div className="py-4 flex justify-between items-center">
                    <Input
                        placeholder="Filtrar por lote, producto, calibre o proveedor..."
                        value={lotFilter}
                        onChange={(e) => setLotFilter(e.target.value)}
                        className="max-w-md"
                    />
                    <Button onClick={handleExportLots} variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar a Excel
                    </Button>
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[250px]">Orden de Compra</TableHead>
                                <TableHead>Lote</TableHead>
                                <TableHead className="text-right">Stock Inicial</TableHead>
                                <TableHead className="text-right">Stock Disponible</TableHead>
                                <TableHead>Salidas del Lote</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.keys(groupedLotInventory).length > 0 ? Object.entries(groupedLotInventory).map(([ocId, lots]) => (
                                <React.Fragment key={ocId}>
                                    <TableRow className="bg-muted/50 cursor-pointer" onClick={() => setOpenLotGroups(p => ({...p, [ocId]: !p[ocId]}))}>
                                        <TableCell colSpan={5} className="font-bold">
                                            <div className="flex items-center gap-2">
                                                <ChevronDown className={cn("h-4 w-4 transition-transform", openLotGroups[ocId] && "rotate-180")} />
                                                {ocId} - {lots[0].supplierName}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    {openLotGroups[ocId] && lots.map(lot => (
                                        <TableRow key={`${lot.lotNumber}-${lot.warehouse}`}>
                                            <TableCell>
                                                <div className="text-xs text-muted-foreground">{lot.warehouse}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{lot.lotNumber}</Badge>
                                                <div className="text-xs text-muted-foreground">{lot.product} - {lot.caliber}</div>
                                            </TableCell>
                                            <TableCell className="text-right text-sm">
                                                {formatPackages(lot.initialPackages)}<br/>{formatKilos(lot.initialKilos)}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-sm">
                                                {formatPackages(lot.availablePackages)}<br/>{formatKilos(lot.availableKilos)}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {lot.dispatches.length > 0 ? (
                                                    <div className="space-y-1 max-w-xs">
                                                        {lot.dispatches.map((d, i) => (
                                                            <div key={i} className="flex justify-between gap-2 border-b last:border-b-0 py-1">
                                                                <div>
                                                                    <p>{d.documentId} ({d.clientName})</p>
                                                                    <p className="text-muted-foreground">{format(parseISO(d.date), 'dd-MM-yy')}</p>
                                                                </div>
                                                                <div className="text-right font-medium">
                                                                    <p>-{formatPackages(d.packages)}</p>
                                                                    <p>-{formatKilos(d.kilos)}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </React.Fragment>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24">No hay lotes que coincidan con la búsqueda.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableHead colSpan={2} className="text-right font-bold text-lg">Totales</TableHead>
                            <TableHead className="text-right font-bold text-lg">{formatPackages(lotInventoryTotals.initialPackages)} / {formatKilos(lotInventoryTotals.initialKilos)}</TableHead>
                            <TableHead className="text-right font-bold text-lg">{formatPackages(lotInventoryTotals.availablePackages)} / {formatKilos(lotInventoryTotals.availableKilos)}</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </>
        );
    }


    return (
        <>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="font-headline text-3xl">Inventario</h1>
                    <p className="text-muted-foreground">Consulta el stock por producto y calibre en un rango de fechas.</p>
                </div>
            </div>

            <Tabs defaultValue="report">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="report">Reporte de Inventario</TabsTrigger>
                    <TabsTrigger value="lots">Inventario por Lote</TabsTrigger>
                </TabsList>
                <TabsContent value="report">
                    <Card className="mt-6">
                        <CardHeader>
                             <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="font-headline text-2xl">Reporte de Inventario por Calibre</CardTitle>
                                    <CardDescription>Consulta el movimiento de stock por producto en un rango de fechas.</CardDescription>
                                </div>
                                <div className="flex gap-2 no-print">
                                <Button variant="outline" onClick={() => setIsPreviewOpen(true)}><Eye className="mr-2 h-4 w-4" />Vista Previa</Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col md:flex-row gap-4 items-end p-4 mb-4 border rounded-lg bg-muted/20 no-print">
                                <div className="flex-1 w-full">
                                    <Label>Producto</Label>
                                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {masterProducts.map(p => (
                                                <SelectItem key={p} value={p}>{p}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex-1 w-full">
                                    <Label>Bodega</Label>
                                    <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="All">Todas las Bodegas</SelectItem>
                                            {warehouses.map(w => (
                                                <SelectItem key={w} value={w}>{w}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex-1 w-full">
                                    <Label>Desde</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("w-full justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange.from ? format(dateRange.from, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={dateRange.from} onSelect={(date) => date && setDateRange(prev => ({...prev, from: date}))} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="flex-1 w-full">
                                    <Label>Hasta</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("w-full justify-start text-left font-normal", !dateRange.to && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange.to ? format(dateRange.to, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={dateRange.to} onSelect={(date) => date && setDateRange(prev => ({...prev, to: date}))} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            {renderReportContent()}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="lots">
                     <Card className="mt-6">
                        <CardHeader>
                            <CardTitle className="font-headline text-2xl">Inventario por Lote</CardTitle>
                            <CardDescription>Stock disponible para cada lote de compra recepcionado.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           {renderLotInventoryContent()}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
             {viewingHistory && (
                <InventoryHistoryDialog
                    item={viewingHistory}
                    isOpen={!!viewingHistory}
                    onOpenChange={() => setViewingHistory(null)}
                />
            )}
            {isPreviewOpen && (
                <InventoryReportPreview
                    isOpen={isPreviewOpen}
                    onOpenChange={setIsPreviewOpen}
                    onPrintRequest={handlePrint}
                    onExportRequest={handleExport}
                >
                    <div ref={printRef} className="p-8 bg-white text-black font-sans">
                        <div className="flex justify-between items-start pb-6 mb-8 border-b-2 border-gray-900">
                            <div className='text-left'>
                                <h2 className="text-2xl font-bold">Viña Negra SpA</h2>
                                <p className="text-xs">AGROCOMERCIAL</p>
                            </div>
                            <div className='text-right'>
                                <h1 className="text-4xl font-bold tracking-tight">REPORTE DE INVENTARIO</h1>
                                <p className='text-sm mt-2'>Período: {format(dateRange.from, 'dd-MM-yyyy')} al {format(dateRange.to, 'dd-MM-yyyy')}</p>
                            </div>
                        </div>
                        <div className="mb-8 text-sm">
                            <p><span className="font-semibold">Producto:</span> {selectedProduct}</p>
                            <p><span className="font-semibold">Bodega:</span> {selectedWarehouse}</p>
                        </div>
                        {renderReportContent(true)}
                        <div className="text-center text-xs pt-8 mt-8 border-t border-dashed">
                            <p>Documento generado por Viña Negra Manager</p>
                        </div>
                    </div>
                </InventoryReportPreview>
            )}
        </>
    );
}
