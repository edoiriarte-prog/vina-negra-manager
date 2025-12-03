"use client";

import { useState, useMemo } from "react";
import { PurchaseOrder, Contact } from "@/lib/types"; 
import { getColumns } from "./components/columns";
import { DataTable } from "./components/data-table"; 
import { useOperations } from "@/hooks/use-operations"; 
import { useMasterData } from "@/hooks/use-master-data"; 
import { Button } from "@/components/ui/button";
import { Plus, DollarSign, FileText } from "lucide-react";
import { NewPurchaseOrderSheet } from "./components/new-purchase-order-sheet";
import { PurchaseOrderPreview } from "./components/purchase-order-preview";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { usePurchasesCRUD } from "@/hooks/use-purchases-crud";

export default function PurchasesPage() {
  const { toast } = useToast();

  const { purchaseOrders, isLoading: loadingOps } = useOperations();
  const { contacts, inventory, isLoading: loadingMaster } = useMasterData();
  const { createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder } = usePurchasesCRUD();
  
  const isLoading = loadingOps || loadingMaster;

  const suppliers = useMemo(() => contacts?.filter((c) => Array.isArray(c.type) ? c.type.includes('supplier') : c.type === 'supplier') || [], [contacts]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [previewOrder, setPreviewOrder] = useState<PurchaseOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { totalNetAmount, totalGrossAmount } = useMemo(() => {
    if (!purchaseOrders) return { totalNetAmount: 0, totalGrossAmount: 0 };
    
    return purchaseOrders.reduce((acc, order) => {
      const netAmount = order.totalAmount || 0; // totalAmount es siempre neto
      acc.totalNetAmount += netAmount;
      // Si `includeVat` no está definido, asumimos el comportamiento antiguo (que era true) por retrocompatibilidad
      if (order.includeVat !== false) {
        acc.totalGrossAmount += netAmount * 1.19;
      } else {
        acc.totalGrossAmount += netAmount;
      }
      return acc;
    }, { totalNetAmount: 0, totalGrossAmount: 0 });
  }, [purchaseOrders]);


  const filteredOrders = purchaseOrders.filter((o) => {
    const supplierName = suppliers.find((s) => s.id === o.supplierId)?.name || '';
    return (o.id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
           supplierName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSave = (orderData: PurchaseOrder | Omit<PurchaseOrder, "id">) => {
    const totalKilos = orderData.items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
    
    const finalOrderData: any = {
        ...orderData,
        totalKilos,
        status: orderData.status || 'received' 
    };

    if ('id' in orderData && orderData.id) {
        updatePurchaseOrder(orderData.id, finalOrderData);
    } else {
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

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card className={cardClass}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Total Neto Compras</p>
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
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Total c/IVA Compras</p>
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
