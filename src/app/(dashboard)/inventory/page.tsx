
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
// Usamos los hooks de la librería principal de tu proyecto
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase'; 
import { collection } from 'firebase/firestore';
import { PurchaseOrder, SalesOrder, InventoryAdjustment, Contact } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMasterData } from '@/hooks/use-master-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Eye, Download, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, startOfMonth, endOfMonth, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { InventoryHistoryDialog } from './components/inventory-history-dialog'; // Asume que este componente maneja el modo oscuro internamente
import { InventoryReportPreview } from './components/inventory-report-preview'; // Asume que este componente maneja el modo oscuro internamente
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

type LotMovement = {
    date: string;
    type: 'Entrada Inicial' | 'Salida' | 'Ajuste';
    documentId: string;
    warehouse: string;
    packages: number;
    kilos: number;
    balancePackages: number;
    balanceKilos: number;
    clientId?: string;
};

type LotTraceability = {
    lotNumber: string;
    product: string;
    caliber: string;
    purchaseOrderId: string;
    supplierName: string;
    purchaseDate: string;
    movements: LotMovement[];
    totalInitialPackages: number;
    totalInitialKilos: number;
    currentAvailablePackages: number;
    currentAvailableKilos: number;
};

const formatKilos = (value: number) => new Intl.NumberFormat('es-CL').format(value) + ' kg';
const formatPackages = (value: number) => new Intl.NumberFormat('es-CL').format(value);

// Helpers para verificar estados válidos
const isValidPurchase = (status: string) => status === 'completed' || status === 'received';
const isValidSale = (status: string) => status === 'dispatched' || status === 'invoiced' || status === 'pending';

export default function InventoryPage() {
    const { firestore } = useFirebase();
    const purchaseOrdersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'purchaseOrders') : null, [firestore]);
    const salesOrdersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'salesOrders') : null, [firestore]);
    const inventoryAdjustmentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'inventoryAdjustments') : null, [firestore]);
    const contactsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'contacts') : null, [firestore]);

    const { data: purchaseOrders, isLoading: isLoadingPO } = useCollection<PurchaseOrder>(purchaseOrdersQuery);
    const { data: salesOrders, isLoading: isLoadingSO } = useCollection<SalesOrder>(salesOrdersQuery);
    const { data: inventoryAdjustments, isLoading: isLoadingIA } = useCollection<InventoryAdjustment>(inventoryAdjustmentsQuery);
    const { data: contacts, isLoading: isLoadingContacts } = useCollection<Contact>(contactsQuery);
    
    // Obtenemos los datos maestros (productos, calibres, bodegas)
    const { calibers: masterCalibers, warehouses, products: masterProducts } = useMasterData();

    const [isClient, setIsClient] = useState(false);
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('All');
    const [selectedLotWarehouse, setSelectedLotWarehouse] = useState<string>('All');
    const [inventoryData, setInventoryData] = useState<InventoryReportItem[]>([]);
    const [viewingHistory, setViewingHistory] = useState<any | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [lotFilter, setLotFilter] = useState('');
    const [openLotGroups, setOpenLotGroups] = useState<Record<string, boolean>>({});

    const { toast } = useToast();
    const printRef = useRef<HTMLDivElement>(null);
    
    // Esto es necesario si el hook useReactToPrint no está bien tipado o si estamos en un contexto no React nativo
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
    } as any);
    
    useEffect(() => {
        setIsClient(true);
    }, []);

    const isLoading = isLoadingPO || isLoadingSO || isLoadingIA || isLoadingContacts;

    useEffect(() => {
      if (isClient && !isLoading && masterProducts.length > 0 && purchaseOrders && salesOrders && inventoryAdjustments) {
        
        const allProducts = masterProducts.map(p => p.name);
        let fullReportData: InventoryReportItem[] = [];

        allProducts.forEach(productName => {
            const getStockAsOf = (date: Date, product: string) => {
                const stockMap = new Map<string, { kg: number, packages: number }>();

                purchaseOrders
                    .filter(po => isValidPurchase(po.status) && !isAfter(parseISO(po.date), date))
                    .forEach(po => {
                        const warehouse = po.destinationWarehouse || po.warehouse;
                        if (selectedWarehouse === 'All' || warehouse === selectedWarehouse) {
                            po.items.forEach(item => {
                                if (item.product === product && (item.unit === 'Kilos' || !item.unit)) {
                                    const key = `${item.product}-${item.caliber}`;
                                    const currentStock = stockMap.get(key) || { kg: 0, packages: 0 };
                                    currentStock.kg += item.quantity;
                                    currentStock.packages += (item.packagingQuantity || 0);
                                    stockMap.set(key, currentStock);
                                }
                            });
                        }
                    });

                salesOrders
                    .filter(so => isValidSale(so.status) && !isAfter(parseISO(so.date), date))
                    .forEach(so => {
                        so.items.forEach(item => {
                            if (item.product === product && (item.unit === 'Kilos' || !item.unit)) {
                                if (selectedWarehouse === 'All' || so.warehouse === selectedWarehouse) {
                                    const key = `${item.product}-${item.caliber}`;
                                    const currentStock = stockMap.get(key) || { kg: 0, packages: 0 };
                                    currentStock.kg -= item.quantity;
                                    currentStock.packages -= (item.packagingQuantity || 0);
                                    stockMap.set(key, currentStock);
                                }
                                if (so.saleType === 'Traslado Bodega Interna' && so.destinationWarehouse) {
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

                inventoryAdjustments
                    .filter(adj => adj.product === product && !isAfter(parseISO(adj.date), date))
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

            const initialStockMap = getStockAsOf(new Date(dateRange.from.getTime() - 86400000), productName);
            const filterByDate = (dateStr: string) => !isBefore(parseISO(dateStr), dateRange.from) && !isAfter(parseISO(dateStr), dateRange.to);

            const inflowsMap = new Map<string, { kg: number, packages: number }>();
            const outflowsMap = new Map<string, { kg: number, packages: number }>();
            const adjustmentsMap = new Map<string, { kg: number, packages: number }>();
            const allCalibers = new Set<string>();

            purchaseOrders.filter(po => isValidPurchase(po.status) && filterByDate(po.date)).forEach(po => {
                const warehouse = po.destinationWarehouse || po.warehouse;
                if (selectedWarehouse === 'All' || warehouse === selectedWarehouse) {
                    po.items.forEach(item => {
                        if (item.product === productName) {
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

            salesOrders.filter(so => isValidSale(so.status) && filterByDate(so.date)).forEach(so => {
                so.items.forEach(item => {
                    if (item.product === productName) {
                        if (selectedWarehouse === 'All' || so.warehouse === selectedWarehouse) {
                            const key = `${item.product}-${item.caliber}`;
                            const current = outflowsMap.get(key) || { kg: 0, packages: 0 };
                            current.kg += item.quantity;
                            current.packages += (item.packagingQuantity || 0);
                            outflowsMap.set(key, current);
                            allCalibers.add(item.caliber);
                        }
                        if (so.saleType === 'Traslado Bodega Interna' && so.destinationWarehouse) {
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

            inventoryAdjustments.filter(adj => filterByDate(adj.date) && adj.product === productName).forEach(adj => {
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

            const productReportData: InventoryReportItem[] = Array.from(allCalibers).map(caliber => {
                const key = `${productName}-${caliber}`;
                const initialStock = initialStockMap.get(key) || { kg: 0, packages: 0 };
                const inflows = inflowsMap.get(key) || { kg: 0, packages: 0 };
                const outflows = outflowsMap.get(key) || { kg: 0, packages: 0 };
                const adjustments = adjustmentsMap.get(key) || { kg: 0, packages: 0 };

                return {
                    key, product: productName, caliber,
                    caliberCode: masterCalibers.find(c => c.name === caliber)?.code || 'N/A',
                    initialStockKg: initialStock.kg, initialStockPackages: initialStock.packages,
                    inflowKg: inflows.kg, inflowPackages: inflows.packages,
                    outflowKg: outflows.kg, outflowPackages: outflows.packages,
                    adjustmentsKg: adjustments.kg, adjustmentsPackages: adjustments.packages,
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
            
            fullReportData = [...fullReportData, ...productReportData];
        });

        setInventoryData(fullReportData);
      }
    }, [isClient, isLoading, dateRange, selectedWarehouse, masterProducts, purchaseOrders, salesOrders, inventoryAdjustments, masterCalibers]);
    
    const lotTraceabilityData = useMemo(() => {
        if (!isClient || isLoading || !purchaseOrders || !salesOrders || !inventoryAdjustments || !contacts) return [];
    
        const lots = new Map<string, LotTraceability>();
    
        // 1. Initialize all lots from purchase orders
        purchaseOrders.forEach(po => {
            if (!isValidPurchase(po.status)) return;
    
            po.items.forEach(item => {
                if (item.lotNumber) {
                    if (!lots.has(item.lotNumber)) {
                        lots.set(item.lotNumber, {
                            lotNumber: item.lotNumber,
                            product: item.product,
                            caliber: item.caliber,
                            purchaseOrderId: po.id,
                            supplierName: contacts.find(c => c.id === po.supplierId)?.name || 'N/A',
                            purchaseDate: po.date,
                            movements: [],
                            totalInitialKilos: 0,
                            totalInitialPackages: 0,
                            currentAvailableKilos: 0,
                            currentAvailablePackages: 0,
                        });
                    }
                    const lotData = lots.get(item.lotNumber)!;
                    lotData.totalInitialKilos += item.quantity;
                    lotData.totalInitialPackages += item.packagingQuantity || 0;
                    lotData.currentAvailableKilos += item.quantity;
                    lotData.currentAvailablePackages += item.packagingQuantity || 0;
    
                    lotData.movements.push({
                        date: po.date,
                        type: 'Entrada Inicial',
                        documentId: po.id,
                        warehouse: po.destinationWarehouse || po.warehouse,
                        packages: item.packagingQuantity || 0,
                        kilos: item.quantity,
                        balancePackages: 0, 
                        balanceKilos: 0,
                    });
                }
            });
        });
    
        // 2. Process all sales and adjustments
        const allOutflows: {item: (SalesOrder['items'][0] & {warehouse: string}) | InventoryAdjustment, movement: SalesOrder | InventoryAdjustment}[] = [
            ...salesOrders.filter(so => isValidSale(so.status)).flatMap(so => so.items.map(i => ({item: {...i, warehouse: so.warehouse!}, movement: so}))),
            ...inventoryAdjustments.map(adj => ({item: adj, movement: adj}))
        ];
    
        allOutflows.forEach(({item, movement}) => {
            if ('lotNumber' in item && item.lotNumber && lots.has(item.lotNumber)) {
                const lotData = lots.get(item.lotNumber)!;
                const warehouse = item.warehouse;
                const date = 'date' in movement ? movement.date : '';
                const kilos = item.quantity;
                const packages = item.packagingQuantity || 0;
                
                if ('orderType' in movement) { // SalesOrder
                    lotData.currentAvailableKilos -= kilos;
                    lotData.currentAvailablePackages -= packages;
                    lotData.movements.push({
                        date,
                        type: 'Salida',
                        documentId: movement.id,
                        warehouse: warehouse,
                        packages: -packages,
                        kilos: -kilos,
                        balanceKilos: 0,
                        balancePackages: 0,
                        clientId: movement.clientId,
                    });
                } else if ('reason' in movement) { // InventoryAdjustment
                    const sign = movement.type === 'increase' ? 1 : -1;
                    lotData.currentAvailableKilos += kilos * sign;
                    lotData.currentAvailablePackages += packages * sign;
                    lotData.movements.push({
                        date,
                        type: 'Ajuste',
                        documentId: (movement as InventoryAdjustment).reason,
                        warehouse: warehouse,
                        packages: packages * sign,
                        kilos: kilos * sign,
                        balanceKilos: 0,
                        balancePackages: 0,
                    });
                }
            }
        });
    
        // 3. Sort movements and calculate running balance
        lots.forEach(lot => {
            lot.movements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            let runningKilos = 0;
            let runningPackages = 0;
            lot.movements.forEach(mov => {
                runningKilos += mov.kilos;
                runningPackages += mov.packages;
                mov.balanceKilos = runningKilos;
                mov.balancePackages = runningPackages;
            });
        });
        
        return Array.from(lots.values()).sort((a,b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());
    
    }, [isClient, isLoading, purchaseOrders, salesOrders, inventoryAdjustments, contacts]);

    const filteredLotTraceabilityData = useMemo(() => {
        let filtered = lotTraceabilityData;

        if (selectedLotWarehouse !== 'All') {
             filtered = filtered.filter(lot => lot.movements.some(m => m.warehouse === selectedLotWarehouse));
        }

        if (lotFilter) {
            const lowercasedFilter = lotFilter.toLowerCase();
            filtered = filtered.filter(lot =>
                lot.lotNumber.toLowerCase().includes(lowercasedFilter) ||
                lot.product.toLowerCase().includes(lowercasedFilter) ||
                lot.caliber.toLowerCase().includes(lowercasedFilter) ||
                lot.supplierName.toLowerCase().includes(lowercasedFilter) ||
                lot.purchaseOrderId.toLowerCase().includes(lowercasedFilter)
            );
        }

        return filtered;
    }, [lotTraceabilityData, selectedLotWarehouse, lotFilter]);
    
    
    const lotInventoryTotals = useMemo(() => {
        return filteredLotTraceabilityData.reduce((acc, lot) => {
            acc.initialPackages += lot.totalInitialPackages;
            acc.initialKilos += lot.totalInitialKilos;
            acc.availablePackages += lot.currentAvailablePackages;
            acc.availableKilos += lot.currentAvailableKilos;
            return acc;
        }, { initialPackages: 0, initialKilos: 0, availablePackages: 0, availableKilos: 0 });
    }, [filteredLotTraceabilityData]);


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
        ["Periodo", `${format(dateRange.from, 'dd-MM-yyyy')} al ${format(dateRange.to, 'dd-MM-yyyy')}`],
        ["Bodega", selectedWarehouse],
        []
      ];

      const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
      XLSX.utils.sheet_add_aoa(worksheet, summary, { origin: "A1" });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
      XLSX.writeFile(workbook, `Reporte_Inventario_General_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast({ title: 'Exportación Exitosa'});
    };

    const handleExportAll = () => {
        if (!isClient || isLoading || !purchaseOrders || !salesOrders || !inventoryAdjustments) {
            toast({ variant: 'destructive', title: 'Datos no listos', description: 'Espere a que los datos se carguen completamente.' });
            return;
        }

        type Transaction = {
            'ID Producto': string,
            'Producto': string,
            'Calibre': string,
            'Bodega': string,
            'Fecha': string,
            'Tipo Movimiento': 'Entrada' | 'Salida' | 'Ajuste Aumento' | 'Ajuste Disminución',
            'Documento/Motivo': string,
            'Contacto': string,
            'Lote': string,
            'Mov. Envases': number,
            'Mov. Kilos': number,
            'Saldo Envases'?: number,
            'Saldo Kilos'?: number
        };

        let allTransactions: Transaction[] = [];
        const inventoryMap = new Map<string, { balancePackages: number, balanceKilos: number }>();

        // Aggregate all movements
        purchaseOrders.filter(po => isValidPurchase(po.status)).forEach(po => {
            po.items.forEach(item => {
                allTransactions.push({
                    'ID Producto': `${item.product}-${item.caliber}-${po.warehouse}`,
                    'Producto': item.product, 'Calibre': item.caliber, 'Bodega': po.warehouse, 'Fecha': po.date,
                    'Tipo Movimiento': 'Entrada', 'Documento/Motivo': po.id,
                    'Contacto': contacts?.find(c => c.id === po.supplierId)?.name || 'N/A', 'Lote': item.lotNumber || '',
                    'Mov. Envases': item.packagingQuantity || 0, 'Mov. Kilos': item.quantity
                });
            });
        });

        salesOrders.filter(so => isValidSale(so.status)).forEach(so => {
            so.items.forEach(item => {
                // Outflow from source warehouse
                allTransactions.push({
                    'ID Producto': `${item.product}-${item.caliber}-${so.warehouse}`,
                    'Producto': item.product, 'Calibre': item.caliber, 'Bodega': so.warehouse!, 'Fecha': so.date,
                    'Tipo Movimiento': 'Salida', 'Documento/Motivo': so.id,
                    'Contacto': contacts?.find(c => c.id === so.clientId)?.name || 'N/A', 'Lote': item.lotNumber || '',
                    'Mov. Envases': -(item.packagingQuantity || 0), 'Mov. Kilos': -item.quantity
                });
                // Inflow for transfers
                if (so.saleType === 'Traslado Bodega Interna' && so.destinationWarehouse) {
                    allTransactions.push({
                        'ID Producto': `${item.product}-${item.caliber}-${so.destinationWarehouse}`,
                        'Producto': item.product, 'Calibre': item.caliber, 'Bodega': so.destinationWarehouse, 'Fecha': so.date,
                        'Tipo Movimiento': 'Entrada', 'Documento/Motivo': `Traspaso desde ${so.id}`,
                        'Contacto': 'Interno', 'Lote': item.lotNumber || '',
                        'Mov. Envases': item.packagingQuantity || 0, 'Mov. Kilos': item.quantity
                    });
                }
            });
        });

        inventoryAdjustments.forEach(adj => {
            allTransactions.push({
                'ID Producto': `${adj.product}-${adj.caliber}-${adj.warehouse}`,
                'Producto': adj.product, 'Calibre': adj.caliber, 'Bodega': adj.warehouse, 'Fecha': adj.date,
                'Tipo Movimiento': adj.type === 'increase' ? 'Ajuste Aumento' : 'Ajuste Disminución',
                'Documento/Motivo': adj.reason, 'Contacto': 'Interno', 'Lote': adj.lotNumber || '',
                'Mov. Envases': adj.type === 'increase' ? (adj.packagingQuantity || 0) : -(adj.packagingQuantity || 0),
                'Mov. Kilos': adj.type === 'increase' ? adj.quantity : -adj.quantity
            });
        });

        // Sort all transactions chronologically
        allTransactions.sort((a, b) => new Date(a.Fecha).getTime() - new Date(b.Fecha).getTime());

        // Calculate running balance
        allTransactions.forEach(tx => {
            const key = tx['ID Producto'];
            const currentBalance = inventoryMap.get(key) || { balancePackages: 0, balanceKilos: 0 };
            currentBalance.balancePackages += tx['Mov. Envases'];
            currentBalance.balanceKilos += tx['Mov. Kilos'];
            tx['Saldo Envases'] = currentBalance.balancePackages;
            tx['Saldo Kilos'] = currentBalance.balanceKilos;
            inventoryMap.set(key, currentBalance);
        });

        if (allTransactions.length === 0) {
            toast({ variant: 'destructive', title: 'Sin Datos', description: 'No hay movimientos de inventario para exportar.' });
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(allTransactions);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Historial General');
        XLSX.writeFile(workbook, `Historial_Inventario_General_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        toast({ title: 'Exportación Exitosa', description: 'El historial completo del inventario ha sido exportado.' });
    };

    const handleExportLots = () => {
        if (filteredLotTraceabilityData.length === 0) {
            toast({ variant: 'destructive', title: 'Sin datos', description: 'No hay lotes para exportar.'});
            return;
        }

        const summaryData = filteredLotTraceabilityData.map(lot => ({
            'Lote': lot.lotNumber,
            'O/C Origen': lot.purchaseOrderId,
            'Producto': lot.product,
            'Calibre': lot.caliber,
            'Proveedor': lot.supplierName,
            'Fecha Compra': format(parseISO(lot.purchaseDate), 'dd-MM-yyyy'),
            'Envases Iniciales': lot.totalInitialPackages,
            'Kilos Iniciales': lot.totalInitialKilos,
            'Envases Disponibles': lot.currentAvailablePackages,
            'Kilos Disponibles': lot.currentAvailableKilos,
        }));
        
        const historyData = filteredLotTraceabilityData.flatMap(lot => 
            lot.movements.map(mov => ({
                'Lote': lot.lotNumber,
                'Producto': lot.product,
                'Calibre': lot.caliber,
                'Proveedor': lot.supplierName,
                'Cliente': mov.clientId && contacts ? contacts.find(c => c.id === mov.clientId)?.name || 'N/A' : '',
                'Fecha Mov.': format(parseISO(mov.date), 'dd-MM-yy'),
                'Tipo Mov.': mov.type,
                'Documento/Motivo': mov.documentId,
                'Bodega': mov.warehouse,
                'Mov. Envases': mov.packages,
                'Mov. Kilos': mov.kilos,
                'Saldo Envases': mov.balancePackages,
                'Saldo Kilos': mov.balanceKilos
            }))
        );

        const wb = XLSX.utils.book_new();
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Lotes');
        
        const wsHistory = XLSX.utils.json_to_sheet(historyData);
        XLSX.utils.book_append_sheet(wb, wsHistory, 'Historial Movimientos Lote');

        XLSX.writeFile(wb, `Inventario_Por_Lote_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        toast({ title: 'Exportación Exitosa'});
    }
    
    const totalsByProduct = useMemo(() => {
        return inventoryData.reduce((acc, item) => {
            if (!acc[item.product]) {
                acc[item.product] = { initialStockKg: 0, inflowKg: 0, outflowKg: 0, adjustmentsKg: 0, finalStockKg: 0, initialStockPackages: 0, inflowPackages: 0, outflowPackages: 0, adjustmentsPackages: 0, finalStockPackages: 0 };
            }
            acc[item.product].initialStockKg += item.initialStockKg;
            acc[item.product].inflowKg += item.inflowKg;
            acc[item.product].outflowKg += item.outflowKg;
            acc[item.product].adjustmentsKg += item.adjustmentsKg;
            acc[item.product].finalStockKg += item.finalStockKg;
            acc[item.product].initialStockPackages += item.initialStockPackages;
            acc[item.product].inflowPackages += item.inflowPackages;
            acc[item.product].outflowPackages += item.outflowPackages;
            acc[item.product].adjustmentsPackages += item.adjustmentsPackages;
            acc[item.product].finalStockPackages += item.finalStockPackages;
            return acc;
        }, {} as Record<string, typeof totalsByProduct[string]>);
    }, [inventoryData]);

    const tableDarkClass = "bg-slate-900 border-slate-800 text-slate-200";
    const headerDarkClass = "bg-slate-800 text-slate-300 border-slate-700";
    const cellDarkClass = "border-slate-800";


    const renderReportContent = (isPrint = false) => {
        if (!isClient || isLoading) {
            return <Skeleton className="h-96 w-full bg-slate-800" />;
        }

        const groupedByProduct = inventoryData.reduce((acc, item) => {
            (acc[item.product] = acc[item.product] || []).push(item);
            return acc;
        }, {} as Record<string, InventoryReportItem[]>);

        return (
            <div className={cn("rounded-md border overflow-x-auto", isPrint ? "border-none" : tableDarkClass)}>
                <Table className={cn(isPrint ? "text-base" : tableDarkClass)}>
                    <TableHeader className={cn(isPrint ? "bg-white text-black" : headerDarkClass)}>
                        <TableRow className={cn("hover:bg-slate-900", isPrint ? "border-gray-300" : cellDarkClass)}>
                            <TableHead rowSpan={2} className={cn("align-bottom border-r", cellDarkClass)}>Calibre</TableHead>
                            <TableHead rowSpan={2} className="align-bottom">Cód.</TableHead>
                            <TableHead colSpan={2} className={cn("text-center border-b border-l", cellDarkClass)}>Stock Inicial</TableHead>
                            <TableHead colSpan={2} className={cn("text-center border-b border-l", cellDarkClass)}>Entradas</TableHead>
                            <TableHead colSpan={2} className={cn("text-center border-b border-l", cellDarkClass)}>Salidas</TableHead>
                            <TableHead colSpan={2} className={cn("text-center border-b border-l", cellDarkClass)}>Ajustes</TableHead>
                            <TableHead colSpan={2} className={cn("text-center border-b border-l font-bold", cellDarkClass)}>Stock Final</TableHead>
                            <TableHead rowSpan={2} className={cn("align-bottom w-[50px] border-l no-print", cellDarkClass)}>Acciones</TableHead>
                        </TableRow>
                       <TableRow className={cn("hover:bg-slate-900", isPrint ? "border-gray-300" : cellDarkClass)}>
                            <TableHead className={cn("text-right border-l", cellDarkClass)}>Envases</TableHead>
                            <TableHead className="text-right">Kg</TableHead>
                            <TableHead className={cn("text-right border-l", cellDarkClass)}>Envases</TableHead>
                            <TableHead className="text-right">Kg</TableHead>
                            <TableHead className={cn("text-right border-l", cellDarkClass)}>Envases</TableHead>
                            <TableHead className="text-right">Kg</TableHead>
                            <TableHead className={cn("text-right border-l", cellDarkClass)}>Envases</TableHead>
                            <TableHead className="text-right">Kg</TableHead>
                            <TableHead className={cn("text-right font-bold border-l", cellDarkClass)}>Envases</TableHead>
                            <TableHead className="text-right font-bold">Kg</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Object.keys(groupedByProduct).length > 0 ? Object.entries(groupedByProduct).map(([productName, items]) => (
                            <React.Fragment key={productName}>
                                <TableRow className="bg-slate-800/50 hover:bg-slate-800/70">
                                    <TableCell colSpan={13} className="font-bold text-lg text-white">{productName}</TableCell>
                                </TableRow>
                                {items.map(item => (
                                    <TableRow key={item.key} className={cn("hover:bg-slate-800/50 transition-colors", cellDarkClass)}>
                                        <TableCell className="font-medium">{item.caliber}</TableCell>
                                        <TableCell className="text-slate-400">{item.caliberCode}</TableCell>
                                        <TableCell className={cn("text-right border-l", cellDarkClass)}>{formatPackages(item.initialStockPackages)}</TableCell>
                                        <TableCell className="text-right">{formatKilos(item.initialStockKg)}</TableCell>
                                        <TableCell className={cn("text-right border-l text-emerald-400", cellDarkClass)}>{item.inflowPackages > 0 ? `+${formatPackages(item.inflowPackages)}` : '-'}</TableCell>
                                        <TableCell className={cn("text-right text-emerald-400")}>{item.inflowKg > 0 ? `+${formatKilos(item.inflowKg)}` : '-'}</TableCell>
                                        <TableCell className={cn("text-right border-l text-red-400", cellDarkClass)}>{item.outflowPackages > 0 ? `-${formatPackages(item.outflowPackages)}` : '-'}</TableCell>
                                        <TableCell className={cn("text-right text-red-400")}>{item.outflowKg > 0 ? `-${formatKilos(item.outflowKg)}` : '-'}</TableCell>
                                        <TableCell className={cn("text-right border-l", cellDarkClass, item.adjustmentsPackages !== 0 && (item.adjustmentsPackages > 0 ? "text-blue-400" : "text-orange-400"))}>{item.adjustmentsPackages !== 0 ? formatPackages(item.adjustmentsPackages) : '-'}</TableCell>
                                        <TableCell className={cn("text-right", item.adjustmentsKg !== 0 && (item.adjustmentsKg > 0 ? "text-blue-400" : "text-orange-400"))}>{item.adjustmentsKg !== 0 ? formatKilos(item.adjustmentsKg) : '-'}</TableCell>
                                        <TableCell className={cn("text-right font-bold border-l text-white", cellDarkClass)}>{formatPackages(item.finalStockPackages)}</TableCell>
                                        <TableCell className={cn("text-right font-bold text-white")}>{formatKilos(item.finalStockKg)}</TableCell>
                                        <TableCell className="border-l no-print">
                                            <Button variant="ghost" size="icon" onClick={() => setViewingHistory({ ...item, warehouse: selectedWarehouse })} className="text-slate-400 hover:text-blue-400">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-slate-800 hover:bg-slate-800">
                                    <TableHead colSpan={2} className="text-right font-bold text-base text-white border-r border-slate-700">Total {productName}</TableHead>
                                    <TableHead className="text-right font-bold text-base border-l border-slate-700">{formatPackages(totalsByProduct[productName].initialStockPackages)}</TableHead>
                                    <TableHead className="text-right font-bold text-base">{formatKilos(totalsByProduct[productName].initialStockKg)}</TableHead>
                                    <TableHead className="text-right font-bold text-base border-l border-slate-700 text-emerald-400">{formatPackages(totalsByProduct[productName].inflowPackages)}</TableHead>
                                    <TableHead className="text-right font-bold text-base text-emerald-400">{formatKilos(totalsByProduct[productName].inflowKg)}</TableHead>
                                    <TableHead className="text-right font-bold text-base border-l border-slate-700 text-red-400">{formatPackages(totalsByProduct[productName].outflowPackages)}</TableHead>
                                    <TableHead className="text-right font-bold text-base text-red-400">{formatKilos(totalsByProduct[productName].outflowKg)}</TableHead>
                                    <TableHead className="text-right font-bold text-base border-l border-slate-700">{formatPackages(totalsByProduct[productName].adjustmentsPackages)}</TableHead>
                                    <TableHead className="text-right font-bold text-base">{formatKilos(totalsByProduct[productName].adjustmentsKg)}</TableHead>
                                    <TableHead className="text-right font-bold text-base border-l border-slate-700 text-white">{formatPackages(totalsByProduct[productName].finalStockPackages)}</TableHead>
                                    <TableHead className="text-right font-bold text-base text-white">{formatKilos(totalsByProduct[productName].finalStockKg)}</TableHead>
                                    <TableHead className="no-print"></TableHead>
                                </TableRow>
                            </React.Fragment>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={13} className="text-center h-24 text-slate-500">No hay datos de inventario para el período y filtros seleccionados.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        );
    }
    
    // ESTILOS: Aplicamos tema oscuro a la tabla de Lotes
    const renderLotInventoryContent = () => {
        if (!isClient || isLoading) return <Skeleton className="h-96 w-full bg-slate-800" />;
    
        return (
            <>
                <div className="py-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-950">
                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        <Input
                            placeholder="Filtrar por lote, producto, calibre, O/C o proveedor..."
                            value={lotFilter}
                            onChange={(e) => setLotFilter(e.target.value)}
                            className="max-w-md w-full bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-blue-600"
                        />
                         <Select value={selectedLotWarehouse} onValueChange={setSelectedLotWarehouse}>
                            <SelectTrigger className="w-full md:w-[250px] bg-slate-900 border-slate-800 text-slate-200 focus-visible:ring-blue-600">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                                <SelectItem value="All">Todas las Bodegas</SelectItem>
                                {warehouses.map(w => (
                                    <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleExportLots} variant="outline" className="w-full md:w-auto bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar a Excel
                    </Button>
                </div>
                <div className="rounded-md border overflow-x-auto border-slate-800">
                    <Table className={tableDarkClass}>
                        <TableHeader className={headerDarkClass}>
                            <TableRow className="border-slate-700">
                                <TableHead className="w-[250px]">Lote</TableHead>
                                <TableHead>Producto / Calibre</TableHead>
                                <TableHead className="text-right">Stock Inicial</TableHead>
                                <TableHead className="text-right">Stock Disponible</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLotTraceabilityData.length > 0 ? filteredLotTraceabilityData.map(lot => (
                                <React.Fragment key={lot.lotNumber}>
                                    <TableRow 
                                        className="bg-slate-900/50 border-slate-800 cursor-pointer hover:bg-slate-800/80" 
                                        onClick={() => setOpenLotGroups(p => ({...p, [lot.lotNumber]: !p[lot.lotNumber]}))}
                                    >
                                        <TableCell className="font-bold">
                                            <div className="flex items-center gap-2">
                                                <ChevronDown className={cn("h-4 w-4 transition-transform text-blue-400", openLotGroups[lot.lotNumber] && "rotate-180")} />
                                                <Badge variant="secondary" className="bg-slate-800 text-slate-100 border-slate-700">{lot.lotNumber}</Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>{lot.product} - {lot.caliber}</div>
                                            <div className="text-xs text-slate-500">{lot.supplierName} (O/C: {lot.purchaseOrderId})</div>
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-slate-400">
                                            {formatPackages(lot.totalInitialPackages)}<br/>{formatKilos(lot.totalInitialKilos)}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-sm text-emerald-400">
                                            {formatPackages(lot.currentAvailablePackages)}<br/>{formatKilos(lot.currentAvailableKilos)}
                                        </TableCell>
                                    </TableRow>
                                    {openLotGroups[lot.lotNumber] && (
                                        <TableRow className="border-slate-800">
                                            <TableCell colSpan={4} className="p-2 bg-slate-950">
                                                <div className="p-4 border rounded-md overflow-x-auto bg-slate-900 border-slate-800 text-slate-200">
                                                    <h4 className="font-semibold text-sm mb-2 text-white">Historial de Movimientos del Lote</h4>
                                                    <Table className="bg-slate-900">
                                                        <TableHeader className="bg-slate-800 text-slate-300">
                                                             <TableRow className="border-slate-700">
                                                                <TableHead>Fecha</TableHead>
                                                                <TableHead>Tipo</TableHead>
                                                                <TableHead>Documento</TableHead>
                                                                <TableHead>Bodega</TableHead>
                                                                <TableHead className="text-right">Mov. Envases</TableHead>
                                                                <TableHead className="text-right">Mov. Kilos</TableHead>
                                                                <TableHead className="text-right">Saldo Envases</TableHead>
                                                                <TableHead className="text-right">Saldo Kilos</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                             {lot.movements.map((mov, index) => (
                                                                 <TableRow key={index} className="border-slate-800 hover:bg-slate-800/50">
                                                                     <TableCell className="text-xs text-slate-400">{format(parseISO(mov.date), 'dd-MM-yy')}</TableCell>
                                                                     <TableCell>
                                                                         <Badge 
                                                                            variant={mov.kilos > 0 ? 'default' : 'destructive'} 
                                                                            className={mov.kilos > 0 ? 'bg-emerald-700/50 text-emerald-200 border-emerald-900' : 'bg-red-700/50 text-red-200 border-red-900'}
                                                                         >
                                                                            {mov.type}
                                                                         </Badge>
                                                                     </TableCell>
                                                                     <TableCell className="text-xs">{mov.documentId}</TableCell>
                                                                     <TableCell className="text-xs text-slate-400">{mov.warehouse}</TableCell>
                                                                     <TableCell className="text-right text-xs">{mov.packages > 0 ? `+${formatPackages(mov.packages)}` : formatPackages(mov.packages)}</TableCell>
                                                                     <TableCell className="text-right text-xs">{mov.kilos > 0 ? `+${formatKilos(mov.kilos)}` : formatKilos(mov.kilos)}</TableCell>
                                                                     <TableCell className="text-right font-semibold text-xs text-white">{formatPackages(mov.balancePackages)}</TableCell>
                                                                     <TableCell className="text-right font-semibold text-xs text-white">{formatKilos(mov.balanceKilos)}</TableCell>
                                                                 </TableRow>
                                                             ))}
                                                        </TableBody>
                                                     </Table>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-slate-500">No hay lotes que coincidan con la búsqueda.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                        <TableFooter className="bg-slate-800 text-white border-slate-700">
                          <TableRow className="hover:bg-slate-800/80 border-slate-700">
                            <TableHead colSpan={2} className="text-right font-bold text-lg text-white">Totales</TableHead>
                            <TableHead className="text-right font-bold text-lg">{formatPackages(lotInventoryTotals.initialPackages)} / {formatKilos(lotInventoryTotals.initialKilos)}</TableHead>
                            <TableHead className="text-right font-bold text-lg text-emerald-400">{formatPackages(lotInventoryTotals.availablePackages)} / {formatKilos(lotInventoryTotals.availableKilos)}</TableHead>
                          </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </>
        );
    }


    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-slate-950 min-h-screen text-slate-100">
             
             {/* --- HEADER --- */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="font-bold text-3xl text-white tracking-tight">Inventario y Trazabilidad</h1>
                    <p className="text-slate-400 mt-1">Consulta el stock por producto y calibre en un rango de fechas.</p>
                </div>
            </div>

            <Tabs defaultValue="report" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 bg-slate-900 border border-slate-800">
                    <TabsTrigger value="report" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-900/30">Reporte de Inventario</TabsTrigger>
                    <TabsTrigger value="lots" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-900/30">Inventario por Lote</TabsTrigger>
                </TabsList>
                
                <TabsContent value="report">
                    <Card className="mt-6 bg-slate-900 border-slate-800 text-slate-100">
                        <CardHeader>
                             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <CardTitle className="font-bold text-2xl text-white">Reporte de Inventario por Calibre</CardTitle>
                                    <CardDescription className="text-slate-400">Consulta el movimiento de stock por producto en un rango de fechas.</CardDescription>
                                </div>
                                <div className="flex gap-2 no-print self-start md:self-center">
                                    <Button variant="outline" onClick={handleExportAll} className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"><Download className="mr-2 h-4 w-4" />Exportar Historial</Button>
                                    <Button onClick={() => setIsPreviewOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white"><Eye className="mr-2 h-4 w-4" />Vista Previa</Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col md:flex-row gap-4 items-end p-4 mb-4 border rounded-lg bg-slate-800/50 border-slate-700 no-print">
                                <div className="flex-1 w-full">
                                    <Label className="text-slate-300">Bodega</Label>
                                    <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                                        <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                                            <SelectItem value="All">Todas las Bodegas</SelectItem>
                                            {warehouses.map(w => (
                                                <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex-1 w-full">
                                    <Label className="text-slate-300">Desde</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("w-full justify-start text-left font-normal bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white", !dateRange.from && "text-slate-500")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange.from ? format(dateRange.from, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700 text-slate-200">
                                        <Calendar 
                                            mode="single" 
                                            selected={dateRange.from} 
                                            onSelect={(date) => date && setDateRange(prev => ({...prev, from: date}))} 
                                            initialFocus 
                                            classNames={{
                                                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                                month: "space-y-4",
                                                caption_label: "text-white",
                                                day_selected: "bg-blue-600 text-white hover:bg-blue-500 hover:text-white",
                                                day_today: "bg-slate-700 text-white",
                                                day_hover: "bg-slate-700 text-white",
                                            }}
                                        />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="flex-1 w-full">
                                    <Label className="text-slate-300">Hasta</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("w-full justify-start text-left font-normal bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white", !dateRange.to && "text-slate-500")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange.to ? format(dateRange.to, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700 text-slate-200">
                                        <Calendar 
                                            mode="single" 
                                            selected={dateRange.to} 
                                            onSelect={(date) => date && setDateRange(prev => ({...prev, to: date}))} 
                                            initialFocus 
                                             classNames={{
                                                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                                month: "space-y-4",
                                                caption_label: "text-white",
                                                day_selected: "bg-blue-600 text-white hover:bg-blue-500 hover:text-white",
                                                day_today: "bg-slate-700 text-white",
                                                day_hover: "bg-slate-700 text-white",
                                            }}
                                        />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            {renderReportContent()}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="lots">
                     <Card className="mt-6 bg-slate-900 border-slate-800 text-slate-100">
                        <CardHeader>
                            <CardTitle className="font-bold text-2xl text-white">Inventario por Lote</CardTitle>
                            <CardDescription className="text-slate-400">Stock disponible para cada lote de compra recepcionado.</CardDescription>
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
                    purchaseOrders={purchaseOrders || []}
                    salesOrders={salesOrders || []}
                    inventoryAdjustments={inventoryAdjustments || []}
                    contacts={contacts || []}
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
                            <p><span className="font-semibold">Bodega:</span> {selectedWarehouse}</p>
                        </div>
                        {renderReportContent(true)}
                        <div className="text-center text-xs pt-8 mt-8 border-t border-dashed">
                            <p>Documento generado por Viña Negra Manager</p>
                        </div>
                    </div>
                </InventoryReportPreview>
            )}
        </div>
    );
}
