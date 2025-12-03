
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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

import { doc, deleteDoc } from "firebase/firestore";
import { useFirebase } from "@/firebase";

export default function PurchasesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter(); // Importado para refrescar datos

  const { purchaseOrders, isLoading: loadingOps } = useOperations();
  const { contacts, isLoading: loadingMaster } = useMasterData();
  const { createPurchaseOrder, updatePurchaseOrder } = usePurchasesCRUD();
  
  const isLoading = loadingOps || loadingMaster;

  const suppliers = useMemo(() => contacts?.filter((c) => Array.isArray(c.type) ? c.type.includes('supplier') : c.type === 'supplier') || [], [contacts]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [previewOrder, setPreviewOrder] = useState<PurchaseOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { totalNetAmount, totalGrossAmount } = useMemo(() => {
    if (!purchaseOrders) return { totalNetAmount: 0, totalGrossAmount: 0 };
    
    return purchaseOrders.reduce((acc, order) => {
        const netAmount = order.totalAmount || 0;
        acc.totalNetAmount += netAmount;
        if (order.includeVat) {
            acc.totalGrossAmount += netAmount * 1.19;
        } else {
            acc.totalGrossAmount += netAmount;
        }
        return acc;
    }, { totalNetAmount: 0, totalGrossAmount: 0 });
  }, [purchaseOrders]);

  const filteredOrders = useMemo(() => {
      if (!purchaseOrders) return [];
      return purchaseOrders.filter((o) => {
        const supplierName = suppliers.find((s) => s.id === o.supplierId)?.name || '';
        return (o.number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [purchaseOrders, suppliers, searchTerm]);

  const handleSave = async (orderData: PurchaseOrder | Omit<PurchaseOrder, "id">) => {
    const totalKilos = orderData.items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
    
    const finalOrderData: any = {
        ...orderData,
        totalKilos,
        status: orderData.status || 'received' 
    };

    try {
        if ('id' in orderData && orderData.id) {
            await updatePurchaseOrder(orderData.id, finalOrderData);
        } else {
            await createPurchaseOrder(finalOrderData);
        }
        router.refresh(); // Refresca los datos en la página
    } catch (error) {
        console.error("Error al guardar:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la orden." });
    } finally {
        // Esto se ejecuta siempre, haya error o no.
        setIsSheetOpen(false);
        setEditingOrder(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    if (!id) {
        alert("ERROR CRÍTICO: El botón no encontró un ID válido para esta fila.");
        return;
    }

    if (window.confirm(`¿Estás seguro de eliminar la orden con ID: ${id}?\n\nEsta acción es permanente.`)) {
      try {
          await deleteDoc(doc(firestore, "purchaseOrders", id));
          toast({ title: "Orden Eliminada", description: "La orden ha sido borrada exitosamente."});
          router.refresh(); // Refresca los datos después de eliminar
      } catch (error: any) {
          console.error("Error fatal al eliminar:", error);
          alert(`NO SE PUDO ELIMINAR.\n\nError técnico: ${error.message}`);
      }
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
