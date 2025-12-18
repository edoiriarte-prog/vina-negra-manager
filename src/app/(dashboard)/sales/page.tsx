

"use client";

import React, { useState, useMemo } from "react";
import { SalesOrder } from "@/lib/types"; 
import { getColumns } from "./components/columns"; 
import { DataTable } from "./components/data-table"; 
import { useMasterData } from "@/hooks/use-master-data"; 
import { useOperations } from "@/hooks/use-operations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FileSpreadsheet, Users, Calendar, Search, FileText } from "lucide-react";
import NewSalesOrderSheet from "./components/new-sales-order-sheet";
import { SalesOrderPreview } from "./components/sales-order-preview"; 
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useSalesOrdersCRUD } from "@/hooks/use-sales-orders-crud";
import * as XLSX from 'xlsx';
import { format, parseISO, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Helpers
const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    try {
        const parsedDate = parseISO(dateString);
        if (isValid(parsedDate)) {
            return format(parsedDate, "dd-MM-yyyy");
        }
        return dateString;
    } catch (e) {
        return dateString;
    }
};

const excelDate = (dateString?: string): Date | null => {
    if (!dateString) return null;
    try {
        // Corrección: Crear la fecha en UTC para evitar desfases de zona horaria.
        // new Date('2023-12-25') puede ser interpretado como 24 de Dic a las 20:00 en algunas zonas.
        // Añadir 'T00:00:00' lo estandariza.
        const date = new Date(dateString + 'T00:00:00');
        if (isValid(date)) {
          // Corrección para evitar que la fecha se muestre un día antes en Excel
          const userTimezoneOffset = date.getTimezoneOffset() * 60000;
          return new Date(date.getTime() + userTimezoneOffset);
        }
        return null;
    } catch {
        return null;
    }
};

export default function SalesPage() {
  const { toast } = useToast();

  // Hooks de Datos (Providers)
  const { salesOrders, purchaseOrders, inventoryAdjustments, isLoading: opsLoading } = useOperations();
  const { contacts, inventory, isLoading: masterLoading } = useMasterData();
  
  // Hook de Acciones (CRUD)
  const { createSalesOrder, updateSalesOrder, deleteSalesOrder } = useSalesOrdersCRUD();
  
  const clients = useMemo(() => contacts?.filter(c => Array.isArray(c.type) ? c.type.includes('client') : c.type === 'client') || [], [contacts]);
  const salesList = useMemo(() => (salesOrders || []).filter(o => o.orderType !== 'dispatch' && o.status !== 'cancelled'), [salesOrders]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [previewOrder, setPreviewOrder] = useState<SalesOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<SalesOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Guardar (Crear o Editar)
  const handleSave = async (orderData: SalesOrder | Omit<SalesOrder, "id">) => {
    try {
        if ('id' in orderData && orderData.id) {
            await updateSalesOrder(orderData.id, orderData);
        } else {
            await createSalesOrder(orderData as Omit<SalesOrder, "id">);
        }
        setIsSheetOpen(false);
        setEditingOrder(null);
    } catch (error) {
      console.error("Error al guardar:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la orden." });
    }
  };

  const handleEdit = (order: SalesOrder) => { setEditingOrder(order); setIsSheetOpen(true); };
  const handleCreate = () => { setEditingOrder(null); setIsSheetOpen(true); };

  // Eliminar
  const handleDeleteRequest = (order: SalesOrder) => {
      setDeletingOrder(order);
  }
  
  const confirmDelete = async () => {
    if (!deletingOrder) return;
    try {
        await deleteSalesOrder(deletingOrder.id);
        setDeletingOrder(null);
    } catch(e) {
        console.error("Error al eliminar:", e);
    }
  };

  // Exportar Excel
  const handleExportPackingList = () => {
    if (filteredOrders.length === 0) return toast({ variant: "destructive", title: "No hay datos", description: "No hay órdenes para exportar." });
    
    const data = filteredOrders.map(o => {
        const clientName = clients.find(c => c.id === o.clientId)?.name || 'Desconocido';
        const net = o.totalAmount || 0;
        const total = o.includeVat !== false ? net * 1.19 : net;
        return {
            'N° Venta': o.number,
            'Fecha Emisión': excelDate(o.date),
            'Cliente': clientName,
            'Estado': o.status,
            'Kilos Totales': o.totalKilos || 0,
            'Monto Neto': net,
            'Monto Total c/IVA': total,
            'Tipo de Venta': o.saleType,
            'Forma de Pago': o.paymentMethod,
            'Días Crédito': o.creditDays || 0,
            'Fecha Vencimiento': excelDate(o.paymentDueDate),
            'Bodega Origen': o.warehouse,
            'Chofer': o.driver,
            'Patente': o.plate,
            'Fecha Despacho': excelDate(o.dispatchedDate),
            'Fecha Facturación': excelDate(o.invoicedDate),
            'N° Factura': o.invoiceNumber || '-',
        };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    
    const range = XLSX.utils.decode_range(ws['!ref']!);
    for (let R = range.s.r + 1; R <= range.e.r; ++R) { 
        const numCols = ['E', 'F', 'G', 'J']; 
        numCols.forEach(col => {
            const cell_address = XLSX.utils.encode_cell({c: XLSX.utils.decode_col(col), r: R});
            if (!ws[cell_address]) return;
            ws[cell_address].t = 'n';
        });
        
        const dateCols = ['B', 'K', 'O', 'P']; 
        dateCols.forEach(col => {
             const cell_address = XLSX.utils.encode_cell({c: XLSX.utils.decode_col(col), r: R});
             if (!ws[cell_address] || !ws[cell_address].v) return;
             ws[cell_address].t = 'd';
             ws[cell_address].z = 'dd-mm-yyyy';
        });
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    XLSX.writeFile(wb, `Reporte_Ventas_${format(new Date(), 'ddMMyyyy')}.xlsx`);
  };

  const { filteredOrders, groupedByClient, groupedByDate, totalGrossAmount } = useMemo(() => {
    if (!salesList || !clients) return { filteredOrders: [], groupedByClient: [], groupedByDate: [], totalGrossAmount: 0 };
    
    const searchTermLower = searchTerm.toLowerCase();

    const orders = salesList.filter((o) => {
        const clientName = clients.find(c => c.id === o.clientId)?.name || '';
        const clientRut = clients.find(c => c.id === o.clientId)?.rut || '';
        const status = o.status || '';
        return (o.number?.toLowerCase() || '').includes(searchTermLower) ||
               clientName.toLowerCase().includes(searchTermLower) ||
               clientRut.toLowerCase().includes(searchTermLower) ||
               status.toLowerCase().includes(searchTermLower);
    });

    const total = orders.reduce((sum, order) => {
        const netAmount = order.totalAmount || 0;
        return sum + (order.includeVat !== false ? netAmount * 1.19 : netAmount);
    }, 0);

    const byClient = orders.reduce((acc, order) => {
      const clientName = clients.find(c => c.id === order.clientId)?.name || 'Cliente Desconocido';
      if (!acc[clientName]) acc[clientName] = { orders: [], total: 0 };
      acc[clientName].orders.push(order);
      const net = order.totalAmount || 0;
      acc[clientName].total += order.includeVat !== false ? net * 1.19 : net;
      return acc;
    }, {} as Record<string, { orders: SalesOrder[], total: number }>);
    const clientArray = Object.entries(byClient).map(([name, data]) => ({ name, ...data }));
    
    const byDate = orders.reduce((acc, order) => {
      const date = formatDate(order.date);
      if (!acc[date]) acc[date] = { orders: [], total: 0 };
      acc[date].orders.push(order);
      const net = order.totalAmount || 0;
      acc[date].total += order.includeVat !== false ? net * 1.19 : net;
      return acc;
    }, {} as Record<string, { orders: SalesOrder[], total: number }>);

    const dateArray = Object.entries(byDate)
        .sort((a, b) => {
            const dateA = a[1].orders[0]?.date ? new Date(a[1].orders[0].date).getTime() : 0;
            const dateB = b[1].orders[0]?.date ? new Date(b[1].orders[0].date).getTime() : 0;
            return dateB - dateA;
        })
        .map(([date, data]) => ({ date, ...data }));

    return { filteredOrders: orders, groupedByClient: clientArray, groupedByDate: dateArray, totalGrossAmount: total };
  }, [salesList, clients, searchTerm]);
  
  const columns = useMemo(() => getColumns({ onEdit: handleEdit, onDelete: handleDeleteRequest, onPreview: setPreviewOrder, clients }), [clients]);

  const renderGroupedTable = (items: SalesOrder[]) => (
    <div className="p-2 bg-slate-900/50 rounded-md border border-slate-800">
        <Table>
            <TableHeader>
                <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400 text-xs">N° Orden</TableHead>
                    <TableHead className="text-slate-400 text-xs">Fecha</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">Monto c/IVA</TableHead>
                    <TableHead className="w-10"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map(order => (
                    <TableRow key={order.id} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell className="font-medium text-slate-200 text-xs">{order.number}</TableCell>
                        <TableCell className="text-slate-400 text-xs">{formatDate(order.date)}</TableCell>
                        <TableCell className="text-right text-emerald-400 font-mono text-xs font-bold">{formatCurrency(order.totalAmount * (order.includeVat !== false ? 1.19 : 1))}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPreviewOrder(order)}><FileText className="h-3 w-3 text-blue-400"/></Button></TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
  );

  if (opsLoading || masterLoading) {
      return (
          <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
              <div className="flex justify-between">
                  <Skeleton className="h-10 w-48 bg-slate-900" />
                  <Skeleton className="h-10 w-32 bg-slate-900" />
              </div>
              <Skeleton className="h-[500px] w-full bg-slate-900 rounded-xl border border-slate-800" />
          </div>
      )
  }

  return (
    <div className="p-3 md:p-6 space-y-6 bg-slate-950 min-h-screen text-slate-100">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Gestión de Ventas</h2>
          <p className="text-slate-400 mt-1">Control de despachos y facturación comercial.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={handleExportPackingList} variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar
            </Button>
            <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 font-semibold">
              <Plus className="mr-2 h-4 w-4" /> Nueva Venta
            </Button>
        </div>
      </div>
      
      <Card className="bg-slate-900 border-slate-800 shadow-sm">
        <CardContent className="p-4 md:p-6">
            <Tabs defaultValue="list">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <TabsList className="bg-slate-800/50 border border-slate-700 p-1 h-auto">
                        <TabsTrigger value="list" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs md:text-sm">Listado General</TabsTrigger>
                        <TabsTrigger value="byClient" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs md:text-sm"><Users className="mr-2 h-3 w-3 md:h-4 md:w-4"/>Por Cliente</TabsTrigger>
                        <TabsTrigger value="byDate" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs md:text-sm"><Calendar className="mr-2 h-3 w-3 md:h-4 md:w-4"/>Por Fecha</TabsTrigger>
                    </TabsList>

                    <div className="relative w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Buscar por N°, cliente o RUT..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-950 border-slate-700 md:w-80"
                        />
                    </div>
                </div>

                <div className="flex justify-end items-baseline gap-2 mb-4 text-right">
                    <span className="text-slate-400 text-sm">Total Visualizado:</span>
                    <span className="text-xl font-bold text-emerald-400">{formatCurrency(totalGrossAmount)}</span>
                </div>

                <TabsContent value="list" className="space-y-4">
                    <div className="rounded-md border border-slate-800 overflow-hidden">
                        <DataTable columns={columns} data={filteredOrders} />
                    </div>
                </TabsContent>
                
                <TabsContent value="byClient">
                    <Accordion type="single" collapsible className="space-y-2">
                        {groupedByClient.map(group => (
                            <AccordionItem value={group.name} key={group.name} className="border border-slate-800 rounded-lg bg-slate-900/30 overflow-hidden">
                                <AccordionTrigger className="hover:no-underline hover:bg-slate-800/50 px-4 py-3">
                                    <div className="flex justify-between items-center w-full pr-4">
                                        <span className="font-semibold text-slate-200 text-left">{group.name}</span>
                                        <div className="flex items-center gap-4">
                                            <Badge variant="outline" className="hidden sm:inline-flex">{group.orders.length} orden(es)</Badge>
                                            <span className="font-mono text-emerald-400 font-bold">{formatCurrency(group.total)}</span>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 bg-slate-950/30 border-t border-slate-800">
                                    {renderGroupedTable(group.orders)}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </TabsContent>
                
                <TabsContent value="byDate">
                    <Accordion type="single" collapsible className="space-y-2">
                        {groupedByDate.map(group => (
                             <AccordionItem value={group.date} key={group.date} className="border border-slate-800 rounded-lg bg-slate-900/30 overflow-hidden">
                                <AccordionTrigger className="hover:no-underline hover:bg-slate-800/50 px-4 py-3">
                                    <div className="flex justify-between items-center w-full pr-4">
                                        <span className="font-semibold text-slate-200 capitalize">
                                            {(() => {
                                                try {
                                                    return format(parseISO(group.orders[0].date), "EEEE, dd 'de' MMMM", { locale: es });
                                                } catch { return group.date }
                                            })()}
                                        </span>
                                        <div className="flex items-center gap-4">
                                            <Badge variant="outline" className="hidden sm:inline-flex">{group.orders.length} orden(es)</Badge>
                                            <span className="font-mono text-emerald-400 font-bold">{formatCurrency(group.total)}</span>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 bg-slate-950/30 border-t border-slate-800">
                                    {renderGroupedTable(group.orders)}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </TabsContent>

            </Tabs>
        </CardContent>
      </Card>
      
      {/* Modal de Crear/Editar */}
      {isSheetOpen && (
        <NewSalesOrderSheet
            isOpen={isSheetOpen}
            onOpenChange={(open) => {
                if (!open) setEditingOrder(null);
                setIsSheetOpen(open);
            }}
            onSave={handleSave}
            order={editingOrder}
            clients={clients}
            inventory={inventory}
            sheetType="sale"
            salesOrders={salesOrders}
            purchaseOrders={purchaseOrders}
            inventoryAdjustments={inventoryAdjustments}
            contacts={contacts}
        />
      )}

      {/* Modal de Vista Previa */}
      {previewOrder && (
          <SalesOrderPreview
            order={previewOrder}
            isOpen={!!previewOrder}
            onOpenChange={(open) => !open && setPreviewOrder(null)}
          />
      )}
      
      {/* Diálogo de Confirmación de Eliminación */}
      <AlertDialog open={!!deletingOrder} onOpenChange={() => setDeletingOrder(null)}>
          <AlertDialogContent className="bg-slate-950 border-slate-800 text-slate-100">
              <AlertDialogHeader>
                  <AlertDialogTitle>¿Confirmas la eliminación?</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                      La orden <strong>{deletingOrder?.number}</strong> será eliminada permanentemente. Esta acción afectará el inventario y las cuentas corrientes asociadas.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-900">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-500 text-white border-none">Eliminar Orden</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

