
"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { SalesOrder, Contact } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, Eye, CalendarCheck, ArrowUpDown } from "lucide-react";
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
import { useFirebase } from "@/firebase"; 
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);

const StatusCell = ({ order }: { order: SalesOrder }) => {
  const { firestore } = useFirebase();
  const [status, setStatus] = useState(order.status);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getStatusStyles = (currentStatus: string) => {
    switch (currentStatus) {
      case "dispatched":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-600";
      case "invoiced":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20 hover:text-blue-600";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20 hover:text-yellow-600";
      case "draft":
        return "bg-slate-500/10 text-slate-500 border-slate-500/20 hover:bg-slate-500/20 hover:text-slate-400";
      case "cancelled":
        return "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 hover:text-red-600";
      default:
        return "bg-slate-500/10 text-slate-500";
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!firestore) return;
    const oldStatus = status;
    // @ts-ignore
    setStatus(newStatus);
    setIsLoading(true);

    try {
      const orderRef = doc(firestore, "salesOrders", order.id);
      const updateData: any = { status: newStatus };

      if (newStatus === "dispatched" && oldStatus !== "dispatched") {
        updateData.dispatchedAt = new Date().toISOString();
      }

      await updateDoc(orderRef, updateData);

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

  const getStatusLabel = (s: string) => {
      switch(s) {
          case 'draft': return 'Borrador';
          case 'pending': return 'Pendiente';
          case 'dispatched': return 'Despachada';
          case 'invoiced': return 'Facturada';
          case 'cancelled': return 'Cancelada';
          default: return s;
      }
  };

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Select value={status} onValueChange={handleStatusChange} disabled={isLoading}>
        <SelectTrigger className={`h-7 w-[130px] text-xs font-semibold border rounded-full px-3 transition-all ${getStatusStyles(status)}`}>
          <SelectValue>{getStatusLabel(status)}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
          <SelectItem value="draft" className="text-slate-400 focus:bg-slate-800 cursor-pointer">Borrador</SelectItem>
          <SelectItem value="pending" className="text-yellow-400 focus:bg-slate-800 cursor-pointer">Pendiente</SelectItem>
          <SelectItem value="dispatched" className="text-emerald-400 focus:bg-slate-800 cursor-pointer">Despachada</SelectItem>
          <SelectItem value="invoiced" className="text-blue-400 focus:bg-slate-800 cursor-pointer">Facturada</SelectItem>
          <SelectItem value="cancelled" className="text-red-400 focus:bg-slate-800 cursor-pointer">Cancelada</SelectItem>
        </SelectContent>
      </Select>

      {(status === 'dispatched' || status === 'invoiced') && (order as any).dispatchedAt && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <CalendarCheck className="h-4 w-4 text-emerald-500/70 hover:text-emerald-500 transition-colors cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 border-slate-800 text-xs text-slate-300">
              <p>Despachado el:</p>
              <p className="font-bold text-emerald-400">
                {format(parseISO((order as any).dispatchedAt), "dd/MM/yyyy HH:mm", { locale: es })}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

interface ColumnsProps {
  onEdit: (order: SalesOrder) => void;
  onDelete: (order: SalesOrder) => void;
  onPreview: (order: SalesOrder) => void;
  clients: Contact[]; 
}

export const getColumns = ({ onEdit, onDelete, onPreview, clients }: ColumnsProps): ColumnDef<SalesOrder>[] => [
  {
    accessorKey: "id",
    header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-0 hover:bg-transparent hover:text-slate-700">
          N° Venta <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
    ),
    cell: ({ row }) => <div className="font-mono font-bold text-slate-200">{row.original.number || row.original.id.substring(0,8)}</div>,
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
    accessorKey: "clientId", 
    header: "Cliente",
    cell: ({ row }) => {
        const client = clients.find(c => c.id === row.original.clientId);
        return <div className="font-medium text-slate-200 capitalize">{client ? client.name : "Desconocido"}</div>
    },
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <StatusCell order={row.original} />,
  },
  {
    id: 'netAmount',
    header: () => <div className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider">TOTAL NETO</div>,
    cell: ({ row }) => {
      const netAmount = row.original.totalAmount || 0;
      return <div className="text-right font-mono text-slate-300">{formatCurrency(netAmount)}</div>
    },
  },
  {
    id: "totalAmountWithVat",
    header: () => <div className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider">TOTAL C/IVA</div>,
    cell: ({ row }) => {
      const order = row.original;
      const netAmount = order.totalAmount || 0;
      const grossAmount = order.includeVat !== false ? Math.round(netAmount * 1.19) : netAmount;
      return <div className="text-right font-bold font-mono text-emerald-400">{formatCurrency(grossAmount)}</div>
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
