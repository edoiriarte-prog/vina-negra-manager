
"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SalesOrder, Contact } from "@/lib/types"; 
import { getColumns } from "./components/columns"; 
import { DataTable } from "./components/data-table"; 
import { useMasterData } from "@/hooks/use-master-data"; 
import { useOperations } from "@/hooks/use-operations";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Search, DollarSign, FileText } from "lucide-react";
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
import { useFirebase, deleteDocumentNonBlocking } from "@/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useSalesOrdersCRUD } from "@/hooks/use-sales-orders-crud";
import * as XLSX from 'xlsx';
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function SalesPage() {
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const { salesOrders, purchaseOrders, inventoryAdjustments, isLoading: loadingOps } = useOperations();
  const { contacts, inventory, isLoading: loadingMaster } = useMasterData();
  const { createSalesOrder, updateSalesOrder } = useSalesOrdersCRUD();
  
  const isLoading = loadingOps || loadingMaster;

  const clients = useMemo(() => contacts?.filter(c => Array.isArray(c.type) ? c.type.includes('client') : c.type === 'client') || [], [contacts]);
  const salesList = useMemo(() => salesOrders.filter(o => o.orderType !== 'dispatch' && o.status !== 'cancelled'), [salesOrders]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [previewOrder, setPreviewOrder] = useState<SalesOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<SalesOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { totalNetAmount, totalGrossAmount } = useMemo(() => {
    if (!salesList) return { totalNetAmount: 0, totalGrossAmount: 0 };
    return salesList.reduce((acc, order) => {
        const netAmount = order.totalAmount || 0;
        acc.totalNetAmount += netAmount;
        if (order.includeVat !== false) {
            acc.totalGrossAmount += netAmount * 1.19;
        } else {
            acc.totalGrossAmount += netAmount;
        }
        return acc;
    }, { totalNetAmount: 0, totalGrossAmount: 0 });
  }, [salesList]);

  const filteredOrders = salesList.filter((o) => {
      const clientName = clients.find(c => c.id === o.clientId)?.name || 'Cliente Desconocido';
      const searchTermLower = searchTerm.toLowerCase();
      return (o.id || '').toLowerCase().includes(searchTermLower) ||
             clientName.toLowerCase().includes(searchTermLower) ||
             (o.number && o.number.toLowerCase().includes(searchTermLower));
  });

  const handleSave = async (orderData: SalesOrder | Omit<SalesOrder, "id">) => {
    try {
        if ('id' in orderData) {
            await updateSalesOrder(orderData.id, orderData as SalesOrder);
        } else {
            await createSalesOrder(orderData as SalesOrder);
        }
        router.refresh();
    } catch (error) {
      console.error("Error al guardar:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la orden." });
    } finally {
      setIsSheetOpen(false);
      setEditingOrder(null);
    }
  };
  
  const handleEdit = (order: SalesOrder) => {
    setEditingOrder(order);
    setIsSheetOpen(true);
  };

  const handleCreate = () => {
    setEditingOrder(null);
    setIsSheetOpen(true);
  };

  const handleDeleteRequest = async (order: SalesOrder) => {
      if (!firestore) return;
      if (!order.id) {
          alert("ERROR: No se puede eliminar una orden sin ID.");
          return;
      }
      if (window.confirm(`¿Seguro que quieres eliminar la orden de venta ${order.number || order.id}? Esta acción es permanente.`)) {
          try {
              await deleteDoc(doc(firestore, "salesOrders", order.id));
              toast({ title: "Orden Eliminada", description: `La orden ${order.number} ha sido eliminada.`});
              window.location.reload(); // Forzar refresco para limpiar estado
          } catch(e) {
              console.error("Error al eliminar:", e);
              toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la orden.' });
          }
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

  const columns = useMemo(() => getColumns({
      onEdit: handleEdit,
      onDelete: handleDeleteRequest,
      onPreview: setPreviewOrder,
      clients: clients 
  }), [clients]);

  const cardClass = "bg-slate-900 border-slate-800 shadow-sm hover:border-slate-700 transition-all";

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-6 bg-slate-950 min-h-screen text-slate-100">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Gestión de Ventas</h2>
          <p className="text-slate-400 mt-1">Control de despachos y facturación comercial.</p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 font-semibold">
          <Plus className="mr-2 h-4 w-4" /> Nueva Venta
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
         <Card className={cardClass}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Total Neto Ventas</p>
              <h3 className="text-2xl font-bold text-white">
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(totalNetAmount)}
              </h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cardClass}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <DollarSign className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Total c/IVA Ventas</p>
              <h3 className="text-2xl font-bold text-white">
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(totalGrossAmount)}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg p-1 overflow-x-auto">
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
        inventory={inventory}
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
            onOpenChange={(open) => !open && setPreviewOrder(null)}
            onExportRequest={() => handleExport(previewOrder)}
          />
      )}

      {deletingOrder && (
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
                <AlertDialogAction onClick={() => {}} className="bg-red-600 hover:bg-red-500">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}
