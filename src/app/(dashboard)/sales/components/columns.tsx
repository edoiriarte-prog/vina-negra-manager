
"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { SalesOrder } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ArrowUpDown, Eye, Edit, Trash, Check, Truck, FileText, Ban, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useSalesOrdersCRUD } from "@/hooks/use-sales-orders-crud";
import { useToast } from "@/hooks/use-toast";

// --- COMPONENTE INTELIGENTE DE ESTADO (AHORA CON SELECT) ---
const StatusCell = ({ row }: { row: any }) => {
  const order = row.original as SalesOrder;
  const { updateSalesOrder } = useSalesOrdersCRUD();
  const { toast } = useToast();
  const [currentStatus, setCurrentStatus] = useState(order.status || 'pending');
  const [isLoading, setIsLoading] = useState(false);

  const statusConfig: Record<string, { label: string, color: string }> = {
    'pending': { label: 'Pendiente', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20' },
    'dispatched': { label: 'Despachada', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20' },
    'invoiced': { label: 'Facturada', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20' },
    'cancelled': { label: 'Cancelada', color: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20' },
  };

  const activeConfig = statusConfig[currentStatus] || statusConfig['pending'];

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;
    
    setIsLoading(true);
    setCurrentStatus(newStatus as any);

    try {
      await updateSalesOrder(order.id, { status: newStatus as any });
      toast({
        title: "Estado Actualizado",
        description: `La orden #${order.number} ahora está ${statusConfig[newStatus].label}.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al actualizar",
        description: "No se pudo cambiar el estado de la orden.",
      });
      setCurrentStatus(order.status); // Revertir en caso de error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
        <Select value={currentStatus} onValueChange={handleStatusChange} disabled={isLoading}>
            <SelectTrigger className={`h-7 w-[130px] text-xs font-semibold border rounded-full px-3 transition-all ${activeConfig.color}`}>
                <SelectValue>{activeConfig.label}</SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100 z-50">
                <SelectItem value="pending" className="text-yellow-400 focus:bg-slate-800 cursor-pointer">Pendiente</SelectItem>
                <SelectItem value="dispatched" className="text-blue-400 focus:bg-slate-800 cursor-pointer">Despachada</SelectItem>
                <SelectItem value="invoiced" className="text-emerald-400 focus:bg-slate-800 cursor-pointer">Facturada</SelectItem>
                <SelectItem value="cancelled" className="text-red-400 focus:bg-slate-800 cursor-pointer">Cancelada</SelectItem>
            </SelectContent>
        </Select>
    </div>
  );
};


// --- COMPONENTE DE ACCIONES ---
const ActionsCell = ({ row, onEdit, onDelete, onPreview }: { row: any, onEdit: any, onDelete: any, onPreview: any }) => {
  const order = row.original;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-800 text-slate-400">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onPreview(order)} className="hover:bg-slate-800 cursor-pointer">
          <Eye className="mr-2 h-4 w-4" /> Ver Detalle
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(order)} className="hover:bg-slate-800 cursor-pointer">
          <Edit className="mr-2 h-4 w-4" /> Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-slate-800" />
        <DropdownMenuItem onClick={() => onDelete(order)} className="text-red-500 hover:bg-red-900/20 cursor-pointer focus:text-red-400 focus:bg-red-900/30">
          <Trash className="mr-2 h-4 w-4" /> Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface GetColumnsProps {
  onEdit: (order: SalesOrder) => void;
  onDelete: (order: SalesOrder) => void;
  onPreview: (order: SalesOrder) => void;
  clients: any[]; 
}

export const getColumns = ({ onEdit, onDelete, onPreview, clients }: GetColumnsProps): ColumnDef<SalesOrder>[] => [
  {
    accessorKey: "number",
    header: ({ column }) => (<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>N° VENTA <ArrowUpDown className="ml-2 h-4 w-4" /></Button>),
    cell: ({ row }) => <div className="font-bold text-white pl-4">{row.getValue("number") || "---"}</div>,
  },
  {
    accessorKey: "date",
    header: "Fecha",
    cell: ({ row }) => {
        try {
            return <div className="text-slate-400 text-xs">{row.getValue("date")}</div>
        } catch (e) { return <span className="text-red-500">Error</span> }
    },
  },
  {
    accessorKey: "clientId",
    header: "Cliente",
    cell: ({ row }) => {
      const clientName = clients?.find(c => c.id === row.getValue("clientId"))?.name || "Cliente Desconocido";
      return <div className="font-medium text-slate-200 truncate max-w-[200px] uppercase">{clientName}</div>;
    },
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <StatusCell row={row} />,
  },
  {
    accessorKey: "totalAmount",
    header: () => <div className="text-right">TOTAL NETO</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("totalAmount") || "0");
      return <div className="text-right font-mono font-medium text-slate-300">{new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(amount)}</div>;
    },
  },
  {
    id: "totalWithVat",
    header: () => <div className="text-right">TOTAL C/IVA</div>,
    cell: ({ row }) => {
        const net = parseFloat(row.getValue("totalAmount") || "0");
        const includeVat = row.original.includeVat !== false; 
        const total = includeVat ? net * 1.19 : net;
        return <div className="text-right font-mono font-bold text-emerald-400">{new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(total)}</div>;
    }
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell row={row} onEdit={onEdit} onDelete={onDelete} onPreview={onPreview} />,
  },
];
