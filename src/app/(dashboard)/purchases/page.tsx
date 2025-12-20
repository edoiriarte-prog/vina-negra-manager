"use client";

import React, { useState, useMemo } from "react";
import dynamic from 'next/dynamic';
import { PurchaseOrder } from "@/lib/types"; 
import { getColumns } from "./components/columns";
import { DataTable } from "./components/data-table"; 
import { useOperations } from "@/hooks/use-operations"; 
import { useMasterData } from "@/hooks/use-master-data"; 
import { Button } from "@/components/ui/button";
import { Plus, DollarSign, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { usePurchasesCRUD } from "@/hooks/use-purchases-crud";
import { Contact } from "@/lib/types";

const NewPurchaseOrderSheet = dynamic(() => import('./components/new-purchase-order-sheet').then(mod => mod.NewPurchaseOrderSheet), { ssr: false });
const PurchaseOrderPreview = dynamic(() => import('./components/purchase-order-preview').then(mod => mod.PurchaseOrderPreview), { ssr: false });

export default function PurchasesPage() {
  const { toast } = useToast();
  const { purchaseOrders } = useOperations();
  const { contacts } = useMasterData();
  const { createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder } = usePurchasesCRUD();
  
  const suppliers = useMemo(() => contacts?.filter((c) => Array.isArray(c.type) ? c.type.includes('supplier') : c.type === 'supplier') || [], [contacts]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [previewingData, setPreviewingData] = useState<{order: PurchaseOrder, supplier: Contact | null} | null>(null);
  
  const { totalNetAmount, totalGrossAmount } = useMemo(() => {
    if (!purchaseOrders) return { totalNetAmount: 0, totalGrossAmount: 0 };
    
    return purchaseOrders.reduce((acc, order) => {
        const netAmount = order.totalAmount || 0;
        acc.totalNetAmount += netAmount;
        if (order.includeVat !== false) {
            acc.totalGrossAmount += netAmount * 1.19;
        } else {
            acc.totalGrossAmount += netAmount;
        }
        return acc;
    }, { totalNetAmount: 0, totalGrossAmount: 0 });
  }, [purchaseOrders]);

  const handleSave = async (orderData: PurchaseOrder | Omit<PurchaseOrder, "id">) => {
    try {
        if ('id' in orderData && orderData.id) {
            await updatePurchaseOrder(orderData.id, orderData);
        } else {
            await createPurchaseOrder(orderData as Omit<PurchaseOrder, "id">);
        }
    } catch (error) {
        console.error("Error al guardar:", error);
    } finally {
        setIsSheetOpen(false);
        setEditingOrder(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) return;
    if (window.confirm(`¿Estás seguro de eliminar la orden con ID: ${id}?\n\nEsta acción es permanente.`)) {
        await deletePurchaseOrder(id);
    }
  }

  const handleEdit = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setIsSheetOpen(true);
  };
  
  const handlePreview = (order: PurchaseOrder) => {
    const supplier = suppliers.find(s => s.id === order.supplierId) || null;
    setPreviewingData({ order, supplier });
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
      onPreview: handlePreview,
      suppliers: suppliers
  }), [suppliers]);

  const cardClass = "bg-slate-900 border-slate-800 shadow-sm hover:border-slate-700 transition-all";

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
                data={purchaseOrders} 
                searchKey="supplierId"
            />
        </div>
      </div>

      {isSheetOpen && (
        <NewPurchaseOrderSheet
          isOpen={isSheetOpen}
          onOpenChange={handleCloseSheet}
          onSave={handleSave}
          order={editingOrder}
          suppliers={suppliers}
          purchaseOrders={purchaseOrders}
        />
      )}

      {previewingData && (
        <PurchaseOrderPreview
          isOpen={!!previewingData}
          onOpenChange={(open) => !open && setPreviewingData(null)}
          order={previewingData?.order || null}
          supplier={previewingData?.supplier || null}
        />
      )}

    </div>
  );
}
