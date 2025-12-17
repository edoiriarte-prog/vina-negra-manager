"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SalesOrder } from "@/lib/types"; 
import { getColumns } from "./components/columns"; 
import { DataTable } from "./components/data-table"; 
import { useMasterData } from "@/hooks/use-master-data"; 
import { useOperations } from "@/hooks/use-operations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FileSpreadsheet, Users, Calendar, Search, FileText } from "lucide-react";
import { NewSalesOrderSheet } from "./components/new-sales-order-sheet";
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
import { db } from "@/firebase/init";
import { doc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useSalesOrdersCRUD } from "@/hooks/use-sales-orders-crud";
import * as XLSX from 'xlsx';
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";

// Helper
const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
const formatDate = (dateString: string) => format(parseISO(dateString), "dd-MM-yyyy");

export default function SalesPage() {
  const router = useRouter();
  const { toast } = useToast();

  const { salesOrders, purchaseOrders, inventoryAdjustments } = useOperations();
  const { contacts, inventory } = useMasterData();
  const { createSalesOrder, updateSalesOrder } = useSalesOrdersCRUD();
  
  const clients = useMemo(() => contacts?.filter(c => Array.isArray(c.type) ? c.type.includes('client') : c.type === 'client') || [], [contacts]);
  const salesList = useMemo(() => (salesOrders || []).filter(o => o.orderType !== 'dispatch' && o.status !== 'cancelled'), [salesOrders]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [previewOrder, setPreviewOrder] = useState<SalesOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<SalesOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSave = async (orderData: SalesOrder | Omit<SalesOrder, "id">) => {
    try {
        if ('id' in orderData && orderData.id) {
            await updateSalesOrder(orderData.id, orderData as SalesOrder);
        } else {
            await createSalesOrder(orderData as SalesOrder);
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

  const handleDeleteRequest = async (order: SalesOrder) => {
      if (!db) return;
      if (!order.id) return toast({ variant: 'destructive', title: 'Error', description: 'ID de orden no encontrado.' });
      setDeletingOrder(order);
  }
  
  const confirmDelete = async () => {
    if (!deletingOrder || !db) return;
    try {
        await deleteDoc(doc(db, "salesOrders", deletingOrder.id));
        toast({ title: "Orden Eliminada", description: `La orden ${deletingOrder.number} ha sido eliminada.`});
        setDeletingOrder(null);
    } catch(e) {
        console.error("Error al eliminar:", e);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la orden.' });
    }
  };

  const handleExportPackingList = () => {
    if (salesList.length === 0) return toast({ variant: "destructive", title: "No hay datos", description: "No hay órdenes para exportar." });
  };

  const { filteredOrders, groupedByClient, groupedByDate, totalGrossAmount } = useMemo(() => {
    if (!salesList || !clients) return { filteredOrders: [], groupedByClient: [], groupedByDate: [], totalGrossAmount: 0 };
    
    const searchTermLower = searchTerm.toLowerCase();

    const orders = salesList.filter((o) => {
        const clientName = clients.find(c => c.id === o.clientId)?.name || '';
        const clientRut = clients.find(c => c.id === o.clientId)?.rut || '';
        return (o.number?.toLowerCase() || '').includes(searchTermLower) ||
               clientName.toLowerCase().includes(searchTermLower) ||
               clientRut.toLowerCase().includes(searchTermLower);
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
    const dateArray = Object.entries(byDate).map(([date, data]) => ({ date, ...data }));

    return { filteredOrders: orders, groupedByClient: clientArray, groupedByDate: dateArray, totalGrossAmount: total };
  }, [salesList, clients, searchTerm]);
  
  const columns = useMemo(() => getColumns({ onEdit: handleEdit, onDelete: handleDeleteRequest, onPreview: setPreviewOrder, clients }), [clients]);

  const renderGroupedTable = (items: SalesOrder[]) => (
    <div className="p-2 bg-slate-900/50 rounded-md border border-slate-800">
        <Table>
            <TableHeader>
                <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">N° Orden</TableHead>
                    <TableHead className="text-slate-400">Fecha</TableHead>
                    <TableHead className="text-slate-400 text-right">Monto c/IVA</TableHead>
                    <TableHead className="w-10"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map(order => (
                    <TableRow key={order.id} className="border-slate-800">
                        <TableCell className="font-medium text-slate-200">{order.number}</TableCell>
                        <TableCell className="text-slate-400">{formatDate(order.date)}</TableCell>
                        <TableCell className="text-right text-emerald-400 font-mono">{formatCurrency(order.totalAmount * (order.includeVat !== false ? 1.19 : 1))}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewOrder(order)}><FileText className="h-4 w-4"/></Button></TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
  );

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
                        <TabsTrigger value="list" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">Listado General</TabsTrigger>
                        <TabsTrigger value="byClient" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white"><Users className="mr-2 h-4 w-4"/>Por Cliente</TabsTrigger>
                        <TabsTrigger value="byDate" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white"><Calendar className="mr-2 h-4 w-4"/>Por Fecha</TabsTrigger>
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

                <TabsContent value="list">
                    <DataTable columns={columns} data={filteredOrders} />
                </TabsContent>
                
                <TabsContent value="byClient">
                    <Accordion type="single" collapsible>
                        {groupedByClient.map(group => (
                            <AccordionItem value={group.name} key={group.name} className="border-slate-800">
                                <AccordionTrigger className="hover:no-underline hover:bg-slate-800/50 px-4 rounded-md">
                                    <div className="flex justify-between items-center w-full">
                                        <span className="font-semibold text-slate-200">{group.name}</span>
                                        <div className="flex items-center gap-4">
                                            <Badge variant="outline">{group.orders.length} orden(es)</Badge>
                                            <span className="font-mono text-emerald-400">{formatCurrency(group.total)}</span>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-2">
                                    {renderGroupedTable(group.orders)}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </TabsContent>
                
                <TabsContent value="byDate">
                    <Accordion type="single" collapsible>
                        {groupedByDate.map(group => (
                             <AccordionItem value={group.date} key={group.date} className="border-slate-800">
                                <AccordionTrigger className="hover:no-underline hover:bg-slate-800/50 px-4 rounded-md">
                                    <div className="flex justify-between items-center w-full">
                                        <span className="font-semibold text-slate-200">{format(parseISO(group.orders[0].date), "EEEE, dd 'de' MMMM", { locale: es })}</span>
                                        <div className="flex items-center gap-4">
                                            <Badge variant="outline">{group.orders.length} orden(es)</Badge>
                                            <span className="font-mono text-emerald-400">{formatCurrency(group.total)}</span>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-2">
                                    {renderGroupedTable(group.orders)}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </TabsContent>

            </Tabs>
        </CardContent>
      </Card>
      
      {isSheetOpen && (
          <NewSalesOrderSheet
            isOpen={isSheetOpen}
            onOpenChange={(open) => !open && setIsSheetOpen(false)}
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

      {previewOrder && (
          <SalesOrderPreview
            order={previewOrder}
            isOpen={!!previewOrder}
            onOpenChange={(open) => !open && setPreviewOrder(null)}
          />
      )}
      
      {deletingOrder && (
        <AlertDialog open={!!deletingOrder} onOpenChange={() => setDeletingOrder(null)}>
            <AlertDialogContent className="bg-slate-950 border-slate-800 text-slate-100">
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Confirmas la eliminación?</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">
                        La orden <strong>{deletingOrder.number}</strong> será eliminada permanentemente.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-900">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-500">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}
