"use client"

import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { PurchaseOrder, Contact } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, MoreHorizontal, Eye, Edit, Trash2, CheckCircle2 } from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { doc, updateDoc } from "firebase/firestore";
import { useFirebase } from "@/firebase"; 
import { useToast } from "@/hooks/use-toast";

// Helper para moneda
const formatCurrency = (value: number) => 
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);

// --- COMPONENTE DE CELDA DE ESTADO (COMPRAS) ---
const StatusCell = ({ order }: { order: PurchaseOrder }) => {
  const { firestore } = useFirebase();
  const [status, setStatus] = useState(order.status);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getStatusStyles = (currentStatus: string) => {
    switch (currentStatus) {
      case "received":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20 hover:text-blue-600";
      case "completed":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-600";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20 hover:text-yellow-600";
      case "cancelled":
        return "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 hover:text-red-600";
      default:
        return "bg-slate-500/10 text-slate-500";
    }
  };

  const getStatusLabel = (s: string) => {
      switch(s) {
          case 'pending': return 'Pendiente';
          case 'received': return 'En Tránsito'; // O "Recibida Parcial" según tu lógica
          case 'completed': return 'Recepcionada';
          case 'cancelled': return 'Anulada';
          default: return s;
      }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!firestore) return;
    const oldStatus = status;
    // @ts-ignore
    setStatus(newStatus);
    setIsLoading(true);

    try {
      // Actualizamos directo en Firebase
      const orderRef = doc(firestore, "purchaseOrders", order.id);
      await updateDoc(orderRef, { status: newStatus });

      toast({
        title: "Estado Actualizado",
        description: `La orden ahora está ${getStatusLabel(newStatus)}.`,
        className: "bg-slate-900 text-white border-slate-800"
      });

    } catch (error) {
      console.error("Error updating status:", error);
      // @ts-ignore
      setStatus(oldStatus);
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
        <SelectTrigger className={`h-7 w-[130px] text-xs font-semibold border rounded-full px-3 transition-all ${getStatusStyles(status)}`}>
          <SelectValue>{getStatusLabel(status)}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
          <SelectItem value="pending" className="text-yellow-400 focus:bg-slate-800 cursor-pointer">Pendiente</SelectItem>
          <SelectItem value="received" className="text-blue-400 focus:bg-slate-800 cursor-pointer">En Tránsito</SelectItem>
          <SelectItem value="completed" className="text-emerald-400 focus:bg-slate-800 cursor-pointer">Recepcionada</SelectItem>
          <SelectItem value="cancelled" className="text-red-400 focus:bg-slate-800 cursor-pointer">Anulada</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

// --- COLUMNAS ---

interface GetColumnsProps {
  onEdit: (order: PurchaseOrder) => void;
  onDelete: (order: PurchaseOrder) => void;
  onPreview: (order: PurchaseOrder) => void;
  suppliers: Contact[];
}

export const getColumns = ({ onEdit, onDelete, onPreview, suppliers }: GetColumnsProps): ColumnDef<PurchaseOrder>[] => [
  {
    accessorKey: "id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-0 hover:bg-transparent hover:text-slate-700"
        >
          N° Orden
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      )
    },
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
      const supplierId = row.getValue("supplierId") as string;
      const supplier = suppliers.find(s => s.id === supplierId);
      return <div className="font-medium text-slate-200 capitalize">{supplier ? supplier.name : "Desconocido"}</div>
    },
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <StatusCell order={row.original} />,
  },
  {
    accessorKey: "totalAmount",
    header: () => <div className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider">TOTAL</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("totalAmount"))
      return <div className="text-right font-bold font-mono text-emerald-400">{formatCurrency(amount)}</div>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const order = row.original
 
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
              <Eye className="mr-2 h-4 w-4 text-blue-500" /> Ver detalle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(order)} className="cursor-pointer focus:bg-slate-800 focus:text-white">
              <Edit className="mr-2 h-4 w-4 text-amber-500" /> Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem onClick={() => onDelete(order)} className="cursor-pointer text-red-500 focus:bg-red-900/20 focus:text-red-400">
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]