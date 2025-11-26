"use client";

import React, { useState, useMemo } from "react";
import { SalesOrder, Contact, OrderItem } from "@/lib/types"; 
import { getColumns } from "./components/columns"; 
import { DataTable } from "./components/data-table"; 
import { useMasterData } from "@/hooks/use-master-data"; 
import { useOperations } from "@/hooks/use-operations";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Clock, Truck, Search } from "lucide-react";
import { NewSalesOrderSheet } from "./components/new-sales-order-sheet";
import { SalesOrderPreview } from "./components/sales-order-preview"; 
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
// Importaciones de Firebase directo (Reemplaza a useSalesOrdersCRUD)
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { format, parseISO } from "date-fns";

export default function SalesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  // 1. CARGAR DATOS (Solo de la nube)
  const { salesOrders, purchaseOrders, inventoryAdjustments, isLoading: loadingOps } = useOperations();
  const { contacts, inventory, isLoading: loadingMaster } = useMasterData();
  
  const isLoading = loadingOps || loadingMaster;

  // 2. FILTROS
  const clients = useMemo(() => contacts?.filter(c => Array.isArray(c.type) ? c.type.includes('client') : c.type === 'client') || [], [contacts]);
  // Solo mostramos ventas reales (no despachos internos)
  const salesList = useMemo(() => salesOrders.filter(o => o.orderType !== 'dispatch' && o.status !== 'cancelled'), [salesOrders]);

  // 3. ESTADOS
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [previewOrder, setPreviewOrder] = useState<SalesOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<SalesOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // 4. KPIS
  const totalAmount = salesList.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const pendingCount = salesList.filter(o => o.status === 'pending').length;
  const completedCount = salesList.filter(o => o.status === 'dispatched' || o.status === 'completed').length;

  const filteredOrders = salesList.filter((o) => {
      const clientName = clients.find(c => c.id === o.clientId)?.name || 'Cliente Desconocido';
      return o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
             clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (o.number && o.number.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  // 5. HANDLERS (Lógica CRUD)

  const handleSave = (orderData: SalesOrder | Omit<SalesOrder, "id">) => {
    if (!firestore) return;

    // Validación de Stock (Usando inventory real de la nube)
    if (orderData.items) {
        for (const item of orderData.items) {
            const inventoryItem = inventory.find(i => 
                i.name === item.product && 
                i.caliber === item.caliber && 
                i.warehouse === (orderData.warehouse || 'Principal')
            );
            
            const currentStock = inventoryItem ? inventoryItem.stock : 0;
            
            // Si editamos, sumamos lo que ya teníamos reservado
            let quantityInOrder = 0;
            if('id' in orderData && editingOrder) {
                const oldItem = editingOrder.items.find(old => old.product === item.product && old.caliber === item.caliber);
                quantityInOrder = oldItem ? oldItem.quantity : 0;
            }

            if (item.quantity > (currentStock + quantityInOrder)) {
                toast({
                    variant: "destructive",
                    title: "Stock Insuficiente",
                    description: `No hay suficiente ${item.product} ${item.caliber}. Disponible: ${currentStock} kg.`,
                });
                return;
            }
        }
    }

    const finalOrderData: any = {
        ...orderData,
        orderType: 'sale',
        // Asegurar números
        totalKilos: orderData.items.reduce((acc, item) => acc + item.quantity, 0),
        totalPackages: orderData.items.reduce((acc, item) => acc + (item.packagingQuantity || 0), 0),
    };

    if ('id' in orderData) {
      updateDocumentNonBlocking(doc(firestore, 'salesOrders', orderData.id), finalOrderData);
      toast({ title: "Venta Actualizada", description: "Los cambios se han guardado correctamente." });
    } else {
      addDocumentNonBlocking(collection(firestore, 'salesOrders'), finalOrderData);
      toast({ title: "Venta Creada", description: "La venta se ha registrado exitosamente." });
    }
    setIsSheetOpen(false);
    setEditingOrder(null);
  };
  
  const handleEdit = (order: SalesOrder) => {
    setEditingOrder(order);
    setIsSheetOpen(true);
  };

  const handleCreate = () => {
    setEditingOrder(null);
    setIsSheetOpen(true);
  };

  const handleDeleteRequest = (order: SalesOrder) => {
      setDeletingOrder(order);
  }

  const confirmDelete = async () => {
      if (deletingOrder && firestore) {
          await deleteDocumentNonBlocking(doc(firestore, 'salesOrders', deletingOrder.id));
          toast({ variant: "destructive", title: "Venta Eliminada", description: "La orden ha sido eliminada." });
          setDeletingOrder(null);
      }
  }

  const handleExport = (orderToExport: SalesOrder) => {
    const client = clients.find(c => c.id === orderToExport.clientId);
    const dataForSheet = orderToExport.items.map(item => ({
        'O/V': orderToExport.number || orderToExport.id,
        'Fecha': format(parseISO(orderToExport.date), "dd-MM-yyyy"),
        'Cliente': client?.name,
        'Producto': item.product,
        'Calibre': item.caliber,
        'Kilos': item.quantity,
        'Precio': item.price,
        'Total': item.total
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Detalle Venta');
    XLSX.writeFile(workbook, `Venta_${orderToExport.number || orderToExport.id}.xlsx`);
  };

  // Columnas para la tabla
  const columns = useMemo(() => getColumns({
      onEdit: handleEdit,
      onDelete: handleDeleteRequest,
      onPreview: setPreviewOrder,
      clients: clients 
  }), [clients]);

  // Estilos
  const cardClass = "bg-slate-900 border-slate-800 shadow-sm hover:border-slate-700 transition-all";

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-slate-100">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Gestión de Ventas</h2>
          <p className="text-slate-400 mt-1">Control de despachos y facturación comercial.</p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 font-semibold">
          <Plus className="mr-2 h-4 w-4" /> Nueva Venta
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className={cardClass}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <TrendingUp className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Total Ventas</p>
              <h3 className="text-2xl font-bold text-white">
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(totalAmount)}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Pendientes</p>
              <h3 className="text-2xl font-bold text-white">{pendingCount} <span className="text-sm font-normal text-slate-500">órdenes</span></h3>
            </div>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Despachadas</p>
              <h3 className="text-2xl font-bold text-white">{completedCount} <span className="text-sm font-normal text-slate-500">órdenes</span></h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 w-full max-w-md transition-all focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20">
            <Search className="h-4 w-4 text-slate-500 ml-2" />
            <Input 
                placeholder="Buscar Cliente o N° Venta..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-none bg-transparent focus-visible:ring-0 text-slate-200 placeholder:text-slate-600 h-8"
            />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg p-1">
            <DataTable 
                columns={columns} 
                data={filteredOrders} 
            />
        </div>
      </div>

      <NewSalesOrderSheet
        isOpen={isSheetOpen}
        onOpenChange={(open) => !open && setIsSheetOpen(false)}
        onSave={handleSave}
        order={editingOrder}
        clients={clients}
        inventory={inventory} // INVENTARIO DE LA NUBE
        sheetType="sale"
        purchaseOrders={purchaseOrders}
        salesOrders={salesOrders}
        inventoryAdjustments={inventoryAdjustments}
        contacts={contacts}
      />

      {previewOrder && (
          <SalesOrderPreview
            order={previewOrder}
            isOpen={!!previewOrder}
            // CIERRE CORRECTO
            onOpenChange={(open) => !open && setPreviewOrder(null)}
            onExportRequest={() => handleExport(previewOrder)}
          />
      )}

      <AlertDialog open={!!deletingOrder} onOpenChange={() => setDeletingOrder(null)}>
        <AlertDialogContent className="bg-slate-950 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de eliminar esta orden?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Esta acción no se puede deshacer. La orden {deletingOrder?.id} será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-900">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-500">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}