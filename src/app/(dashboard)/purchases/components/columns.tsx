"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { PurchaseOrder, Contact } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, Eye, CalendarCheck, ArrowUpDown, Truck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { processOrderStockMovement } from "@/lib/inventory-actions"; 
import { firestore as db } from "@/firebase"; 

// --- COMPONENTE DE CELDA DE ESTADO (INTERACTIVO) ---
const StatusCell = ({ order }: { order: PurchaseOrder }) => {
  const [status, setStatus] = useState(order.status);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getStatusStyles = (currentStatus: string) => {
    switch (currentStatus) {
      case "completed": // Recepcionada
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-600";
      case "received": // En Tránsito
        return "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20 hover:text-blue-600";
      case "pending":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20 hover:text-yellow-700";
      case "draft":
        return "bg-slate-500/10 text-slate-500 border-slate-500/20 hover:bg-slate-500/20 hover:text-slate-400";
      case "cancelled":
        return "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 hover:text-red-600";
      default:
        return "bg-slate-500/10 text-slate-500";
    }
  };

  const getStatusLabel = (s: string) => {
      switch(s) {
          case 'draft': return 'Borrador';
          case 'pending': return 'Pendiente';
          case 'received': return 'En Tránsito';
          case 'completed': return 'Recepcionada';
          case 'cancelled': return 'Anulada';
          default: return s;
      }
  };

  const handleStatusChange = async (newStatus: string) => {
    const oldStatus = status;
    setStatus(newStatus as any);
    setIsLoading(true);

    try {
      const orderRef = doc(db, "purchaseOrders", order.id);
      const updateData: any = { status: newStatus };

      // Si pasa a Recepcionada, guardamos la fecha real de ingreso
      if (newStatus === "completed" && oldStatus !== "completed") {
        updateData.receivedAt = new Date().toISOString();
      }

      await updateDoc(orderRef, updateData);
      
      // Movimiento de Inventario (Actualiza stock si corresponde)
      if (processOrderStockMovement) {
          await processOrderStockMovement(order, newStatus, oldStatus);
      }

      toast({
        title: "Estado Actualizado",
        description: `Orden ${order.id} marcada como ${getStatusLabel(newStatus)}. Stock actualizado.`,
        className: "bg-slate-900 text-white border-slate-800"
      });

    } catch (error) {
      console.error("Error updating status:", error);
      setStatus(oldStatus as any);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Select value={status} onValueChange={handleStatusChange} disabled={isLoading}>
        <SelectTrigger className={`h-7 w-[135px] text-xs font-semibold border rounded-full px-3 transition-all ${getStatusStyles(status)}`}>
          <SelectValue>{getStatusLabel(status)}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
          <SelectItem value="draft" className="text-slate-400 focus:bg-slate-800 cursor-pointer">Borrador</SelectItem>
          <SelectItem value="pending" className="text-yellow-400 focus:bg-slate-800 cursor-pointer">Pendiente</SelectItem>
          <SelectItem value="received" className="text-blue-400 focus:bg-slate-800 cursor-pointer">En Tránsito</SelectItem>
          <SelectItem value="completed" className="text-emerald-400 focus:bg-slate-800 cursor-pointer">Recepcionada</SelectItem>
          <SelectItem value="cancelled" className="text-red-400 focus:bg-slate-800 cursor-pointer">Anulada</SelectItem>
        </SelectContent>
      </Select>

      {/* TOOLTIP DE TRAZABILIDAD */}
      {/* Icono Verde para Recepcionada (Ingreso OK) */}
      {status === 'completed' && (order as any).receivedAt && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <CalendarCheck className="h-4 w-4 text-emerald-500/70 hover:text-emerald-500 transition-colors cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-slate-300">
              <p>Recepcionado el:</p>
              <p className="font-bold text-emerald-400">
                {format(parseISO((order as any).receivedAt), "dd/MM/yyyy HH:mm", { locale: es })}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Icono Azul para En Tránsito */}
      {status === 'received' && (
         <TooltipProvider>
         <Tooltip>
           <TooltipTrigger asChild>
             <Truck className="h-4 w-4 text-blue-500/70 hover:text-blue-500 transition-colors cursor-help" />
           </TooltipTrigger>
           <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-slate-300">
             <p>Mercadería en ruta</p>
           </TooltipContent>
         </Tooltip>
       </TooltipProvider>
      )}
    </div>
  );
};

// --- DEFINICIÓN DE COLUMNAS ---

interface ColumnsProps {
  onEdit: (order: PurchaseOrder) => void;
  onDelete: (order: PurchaseOrder) => void;
  onPreview: (order: PurchaseOrder) => void;
  suppliers: Contact[];
}

export const getColumns = ({ onEdit, onDelete, onPreview, suppliers }: ColumnsProps): ColumnDef<PurchaseOrder>[] => [
  {
    accessorKey: "id",
    header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-0 hover:bg-transparent hover:text-slate-700">
          N° Orden <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
    ),
    cell: ({ row }) => <div className="font-mono font-bold text-slate-200">{row.getValue("id")}</div>,
  },
  {
    accessorKey: "date",
    header: "Fecha",
    cell: ({ row }) => {
        try {
            return <div className="text-sm text-slate-400">{format(parseISO(row.getValue("date")), "dd MMM yyyy", { locale: es })}</div>
        } catch (e) { return <div className="text-sm text-slate-400">{row.getValue("date")}</div> }
    },
  },
  {
    accessorKey: "supplierId", 
    header: "Proveedor",
    cell: ({ row }) => {
        const supplier = suppliers.find(s => s.id === row.original.supplierId);
        return <div className="font-medium text-slate-200 capitalize">{supplier ? supplier.name : <span className="text-slate-500 italic">Desconocido</span>}</div>
    },
  },
  {
    accessorKey: "status",
    header: "Estado / Trazabilidad",
    cell: ({ row }) => <StatusCell order={row.original} />,
  },
  {
    accessorKey: "totalAmount",
    header: ({ column }) => (
        <div className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total</div>
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("totalAmount"));
      const formatted = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(amount);
      return <div className="text-right font-bold text-emerald-400">{formatted}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const order = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-100">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200 shadow-lg">
            <DropdownMenuLabel className="text-xs text-slate-500 uppercase">Acciones</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onPreview(order)} className="cursor-pointer focus:bg-slate-800 focus:text-white">
              <Eye className="mr-2 h-4 w-4 text-blue-500" /> Vista Previa
            </DropdownMenuItem>
            
            {/* Solo permitir editar si no está recepcionada completamente (Opcional) */}
            <DropdownMenuItem onClick={() => onEdit(order)} className="cursor-pointer focus:bg-slate-800 focus:text-white">
              <Edit className="mr-2 h-4 w-4 text-amber-500" /> Editar
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem onClick={() => onDelete(order)} className="cursor-pointer text-red-500 focus:bg-red-900/20 focus:text-red-400">
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];