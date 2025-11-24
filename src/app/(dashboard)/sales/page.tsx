
"use client";

import { useState } from "react";
import { SalesOrder, Contact, PurchaseOrder, InventoryAdjustment, OrderItem } from "@/lib/types"; 
import { getColumns } from "./components/columns"; 
import { DataTable } from "./components/data-table"; 
import { useSalesOrders } from "@/hooks/use-sales-orders"; 
import { useMasterData } from "@/hooks/use-master-data"; 
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

export default function SalesPage() {
  const { orders, createOrder, updateOrder, deleteOrder } = useSalesOrders();
  
  const { contacts, inventory, purchaseOrders, inventoryAdjustments } = useMasterData(); 
  
  const clients = contacts ? contacts.filter((c: Contact) => Array.isArray(c.type) && c.type.includes('client')) : [];
  const carrierList = contacts ? contacts.filter((c: Contact) => Array.isArray(c.type) && c.type.includes('carrier')) : [];

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [previewOrder, setPreviewOrder] = useState<SalesOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<SalesOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const totalAmount = orders.reduce((sum: number, o: SalesOrder) => sum + (o.totalAmount || 0), 0);
  const pendingCount = orders.filter((o: SalesOrder) => o.status === 'pending' || o.status === 'draft').length;
  const completedCount = orders.filter((o: SalesOrder) => o.status === 'dispatched' || o.status === 'invoiced').length;

  const filteredOrders = orders.filter((o: SalesOrder) => {
      const clientName = clients.find((c: Contact) => c.id === o.clientId)?.name || '';
      return o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
             clientName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleEdit = (order: SalesOrder) => {
    setEditingOrder(order);
    setIsSheetOpen(true);
  };

  const handleCreate = () => {
    setEditingOrder(null);
    setIsSheetOpen(true);
  };
  
  const handleSave = (orderData: SalesOrder, newItems: OrderItem[] = []) => {
    const finalData = { ...orderData, items: [...orderData.items, ...newItems] };

    if (editingOrder) {
      updateOrder(finalData);
    } else {
      createOrder(finalData);
    }
    setIsSheetOpen(false);
    setEditingOrder(null);
  };

  const handleDeleteRequest = (order: SalesOrder) => {
      setDeletingOrder(order);
  }

  const confirmDelete = async () => {
      if (deletingOrder) {
          await deleteOrder(deletingOrder.id);
          setDeletingOrder(null);
      }
  }

  const handlePreview = (order: SalesOrder) => {
      setPreviewOrder(order);
  }

  const handleCloseSheet = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) setEditingOrder(null);
  };

  const columns = getColumns({
      onEdit: handleEdit,
      onDelete: handleDeleteRequest,
      onPreview: handlePreview,
      clients: clients 
  });

  const cardClass = "bg-slate-900 border-slate-800 shadow-sm hover:border-slate-700 transition-all";

  return (
    <div className="p-3 md:p-6 space-y-6 bg-slate-950 min-h-screen text-slate-100">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Gestión de Ventas</h2>
          <p className="text-slate-400 mt-1">Control de despachos y facturación.</p>
        </div>
        <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 font-semibold">
          <Plus className="mr-2 h-4 w-4" /> Nueva Venta
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className={cardClass}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Total Ventas</p>
              <h3 className="text-xl md:text-2xl font-bold text-white">
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(totalAmount)}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
              <Clock className="h-6 w-6 md:h-8 md:w-8 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Por Despachar</p>
              <h3 className="text-xl md:text-2xl font-bold text-white">{pendingCount} <span className="text-sm font-normal text-slate-500">órdenes</span></h3>
            </div>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Truck className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Despachadas</p>
              <h3 className="text-xl md:text-2xl font-bold text-white">{completedCount} <span className="text-sm font-normal text-slate-500">órdenes</span></h3>
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
        onOpenChange={handleCloseSheet}
        onSave={handleSave}
        order={editingOrder}
        clients={clients}
        carriers={carrierList}
        inventory={inventory || []}
        nextOrderId=""
        salesOrders={orders}
        sheetType="sale"
        purchaseOrders={purchaseOrders || []}
        inventoryAdjustments={inventoryAdjustments || []}
        contacts={contacts || []}
      />

      {previewOrder && (
          <SalesOrderPreview
            isOpen={!!previewOrder}
            onOpenChange={(open) => !open && setPreviewOrder(null)}
            order={previewOrder}
            client={clients.find((c: Contact) => c.id === previewOrder.clientId) || null}
          />
      )}

      <AlertDialog open={!!deletingOrder} onOpenChange={() => setDeletingOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de eliminar esta orden?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La orden {deletingOrder?.id} será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
