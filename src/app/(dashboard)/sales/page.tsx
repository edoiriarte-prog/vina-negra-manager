"use client";

import { useState } from "react";
import { SalesOrder, Contact } from "@/lib/types"; 
import { getColumns } from "./components/columns"; // Importamos la función generadora
import { DataTable } from "@/components/ui/data-table"; 
import { useSalesOrders } from "@/hooks/use-sales-orders"; 
import { useMasterData } from "@/hooks/use-master-data"; 
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Clock, Truck, Search } from "lucide-react";
import { NewSalesOrderSheet } from "./components/new-sales-order-sheet";
// Asegúrate de tener este componente creado (te lo di en el paso anterior)
import { SalesOrderPreview } from "./components/sales-order-preview"; 
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SalesPage() {
  // Hooks de datos
  const { orders, loading, createOrder, updateOrder, deleteOrder } = useSalesOrders();
  
  // Obtenemos contactos e inventario
  // Casteamos a any por seguridad si el hook no está 100% tipado aún
  const { contacts, inventory, carriers } = useMasterData() as any; 
  
  // Filtramos solo los CLIENTES para esta vista
  const clients = contacts ? contacts.filter((c: Contact) => c.type === 'client') : [];
  const carrierList = contacts ? contacts.filter((c: Contact) => c.type === 'carrier') : [];

  // Estados
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [previewOrder, setPreviewOrder] = useState<SalesOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Cálculos de KPIs
  const totalAmount = orders.reduce((sum: number, o: SalesOrder) => sum + (o.totalAmount || 0), 0);
  const pendingCount = orders.filter((o: SalesOrder) => o.status === 'pending').length;
  const completedCount = orders.filter((o: SalesOrder) => o.status === 'completed').length;

  // Filtrado de órdenes
  const filteredOrders = orders.filter((o: SalesOrder) => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    clients.find((c: Contact) => c.id === o.clientId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handlers
  const handleEdit = (order: SalesOrder) => {
    setEditingOrder(order);
    setIsSheetOpen(true);
  };

  const handleCreate = () => {
    setEditingOrder(null);
    setIsSheetOpen(true);
  };

  const handleDelete = async (id: string) => {
      if (confirm("¿Estás seguro de eliminar esta orden de venta?")) {
          await deleteOrder(id);
      }
  }

  const handlePreview = (order: SalesOrder) => {
      setPreviewOrder(order);
  }

  const handleCloseSheet = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) setEditingOrder(null);
  };

  // Generamos las columnas
  const columns = getColumns({
      onEdit: handleEdit,
      onDelete: (order) => handleDelete(order.id),
      onPreview: handlePreview,
      clients: clients // Pasamos la lista de clientes para resolver los nombres
  });

  // Estilos Reutilizables
  const cardClass = "bg-slate-900 border-slate-800 shadow-sm hover:border-slate-700 transition-all";

  return (
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-slate-100">
      
      {/* --- HEADER & ACCIONES --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Gestión de Ventas</h2>
          <p className="text-slate-400 mt-1">Control de despachos y facturación.</p>
        </div>
        <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 font-semibold">
          <Plus className="mr-2 h-4 w-4" /> Nueva Venta
        </Button>
      </div>

      {/* --- KPIs RESUMEN --- */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={cardClass}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <TrendingUp className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Total Ventas</p>
              <h3 className="text-2xl font-bold text-white">
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(totalAmount)}
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
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Por Despachar</p>
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

      {/* --- TABLA --- */}
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
                searchKey="id"
                meta={{
                    onEdit: handleEdit,
                    onDelete: (order: SalesOrder) => handleDelete(order.id),
                    onView: setPreviewOrder
                }}
            />
        </div>
      </div>

      {/* --- MODALES --- */}
      <NewSalesOrderSheet
        isOpen={isSheetOpen}
        onOpenChange={handleCloseSheet}
        onSave={(data) => {
            if (editingOrder) updateOrder(data as any);
            else createOrder(data as any);
            setIsSheetOpen(false);
        }}
        order={editingOrder}
        clients={clients}
        carriers={carrierList} // Pasamos lista de transportistas
        inventory={inventory || []}
        nextOrderId=""
        salesOrders={orders}
      />

      {previewOrder && (
          <SalesOrderPreview
            isOpen={!!previewOrder}
            onOpenChange={(open) => !open && setPreviewOrder(null)}
            order={previewOrder}
            // Buscamos el cliente para pasar sus datos a la vista previa
            client={clients.find((c: Contact) => c.id === previewOrder.clientId) || null}
          />
      )}

    </div>
  );
}