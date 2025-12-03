
"use client";

import { useState, useMemo } from "react";
import { PurchaseOrder, Contact } from "@/lib/types"; 
import { getColumns } from "./components/columns";
import { DataTable } from "./components/data-table"; 
import { useOperations } from "@/hooks/use-operations"; 
import { useMasterData } from "@/hooks/use-master-data"; 
import { Button } from "@/components/ui/button";
import { Plus, ShoppingCart, Clock, CheckCircle2, Search, DollarSign, FileText } from "lucide-react";
import { NewPurchaseOrderSheet } from "./components/new-purchase-order-sheet";
import { PurchaseOrderPreview } from "./components/purchase-order-preview";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { usePurchasesCRUD } from "@/hooks/use-purchases-crud";

export default function PurchasesPage() {
  const { toast } = useToast();

  // 1. CARGAR DATOS DE LA NUBE
  const { purchaseOrders, isLoading: loadingOps } = useOperations();
  const { contacts, inventory, isLoading: loadingMaster } = useMasterData();
  const { createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder } = usePurchasesCRUD();
  
  const isLoading = loadingOps || loadingMaster;

  // Filtramos solo proveedores
  const suppliers = useMemo(() => contacts?.filter((c) => Array.isArray(c.type) ? c.type.includes('supplier') : c.type === 'supplier') || [], [contacts]);

  // Estados
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [previewOrder, setPreviewOrder] = useState<PurchaseOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // KPIs
  const { totalNetAmount, totalGrossAmount, pendingCount, completedCount } = useMemo(() => {
    let net = 0;
    let gross = 0;
    
    purchaseOrders.forEach(order => {
      const orderNet = order.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const orderGross = order.includeVat ? orderNet * 1.19 : orderNet;
      net += orderNet;
      gross += orderGross;
    });

    const pending = purchaseOrders.filter((o) => o.status === 'pending').length;
    const completed = purchaseOrders.filter((o) => o.status === 'completed' || o.status === 'received').length;

    return { totalNetAmount: net, totalGrossAmount: gross, pendingCount: pending, completedCount: completed };
  }, [purchaseOrders]);

  const filteredOrders = purchaseOrders.filter((o) => {
    const supplierName = suppliers.find((s) => s.id === o.supplierId)?.name || '';
    return (o.id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
           supplierName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // --- HANDLERS (CRUD FIREBASE) ---

  const handleSave = (orderData: PurchaseOrder | Omit<PurchaseOrder, "id">) => {
    // Calculamos totales para guardar en la BD y que el Dashboard los lea rápido
    const totalKilos = orderData.items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
    
    const finalOrderData: any = {
        ...orderData,
        totalKilos,
        // Si es nueva y no tiene status, asumimos 'received' para que sume stock al instante
        status: orderData.status || 'received' 
    };

    if ('id' in orderData && orderData.id) {
        // EDICIÓN
        updatePurchaseOrder(orderData.id, finalOrderData);
    } else {
        // CREACIÓN
        createPurchaseOrder(finalOrderData);
    }
    setIsSheetOpen(false);
    setEditingOrder(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta orden de compra? Se descontará el stock asociado.")) {
      deletePurchaseOrder(id);
      toast({ variant: "destructive", title: "Compra Eliminada", description: "La orden ha sido eliminada." });
    }
  }

  const handleEdit = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setIsSheetOpen(true);
  };

  const handleCreate = () => {
    setEditingOrder(null);
    setIsSheetOpen(true);
  };

  const handleCloseSheet = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) setEditingOrder(null);
  };

  const columns = useMemo(() => getColumns({
      onEdit: handleEdit,
      onDelete: (order) => handleDelete(order.id),
      onPreview: setPreviewOrder,
      suppliers: suppliers
  }), [suppliers]);

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
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Gestión de Compras</h2>
          <p className="text-slate-400 mt-1">Administra tus adquisiciones y recepciones de stock.</p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 font-semibold">
          <Plus className="mr-2 h-4 w-4" /> Nueva Compra
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
        <Card className={cardClass}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <FileText className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Total Neto</p>
              <h3 className="text-xl md:text-2xl font-bold text-white">
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(totalNetAmount)}
              </h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cardClass}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Total c/IVA</p>
              <h3 className="text-xl md:text-2xl font-bold text-white">
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(totalGrossAmount)}
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
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Pendientes</p>
              <h3 className="text-xl md:text-2xl font-bold text-white">{pendingCount} <span className="text-sm font-normal text-slate-500">órdenes</span></h3>
            </div>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20">
              <CheckCircle2 className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Recepcionadas</p>
              <h3 className="text-xl md:text-2xl font-bold text-white">{completedCount} <span className="text-sm font-normal text-slate-500">órdenes</span></h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 w-full max-w-md transition-all focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20">
            <Search className="h-4 w-4 text-slate-500 ml-2" />
            <Input 
                placeholder="Buscar por Orden # o Proveedor..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-none bg-transparent focus-visible:ring-0 text-slate-200 placeholder:text-slate-600 h-8"
            />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg p-1 overflow-x-auto">
            <DataTable 
                columns={columns} 
                data={filteredOrders} 
                searchKey="id"
            />
        </div>
      </div>

      <NewPurchaseOrderSheet
        isOpen={isSheetOpen}
        onOpenChange={handleCloseSheet}
        onSave={handleSave}
        order={editingOrder}
        suppliers={suppliers}
        inventory={inventory}
        nextOrderId=""
        purchaseOrders={purchaseOrders}
      />

      <PurchaseOrderPreview
        isOpen={!!previewOrder}
        onOpenChange={(open) => !open && setPreviewOrder(null)}
        order={previewOrder}
        supplier={suppliers.find((s) => s.id === previewOrder?.supplierId) || null}
      />

    </div>
  );
}
