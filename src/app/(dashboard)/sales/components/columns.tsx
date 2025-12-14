"use client";

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
import { Badge } from "@/components/ui/badge";
import { useSalesOrdersCRUD } from "@/hooks/use-sales-orders-crud";

// --- 1. COMPONENTE DE ESTADO INTERACTIVO (CORREGIDO) ---
const StatusCell = ({ row }: { row: any }) => {
  const order = row.original as SalesOrder;
  const { updateSalesOrder } = useSalesOrdersCRUD();

  const currentStatus = order.status || 'pending';

  const statusConfig: Record<string, { label: string, color: string, icon: any }> = {
    'pending': { label: 'Pendiente', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20', icon: FileText },
    'dispatched': { label: 'Despachada', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20', icon: Truck },
    'invoiced': { label: 'Facturada', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20', icon: Check },
    'cancelled': { label: 'Cancelada', color: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20', icon: Ban },
  };

  const activeConfig = statusConfig[currentStatus] || statusConfig['pending'];

  const handleStatusChange = async (newStatus: string) => {
    console.log("Intentando cambiar estado a:", newStatus, "ID:", order.id);
    await updateSalesOrder(order.id, { status: newStatus as any });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Badge variant="outline" className={`${activeConfig.color} px-3 py-1 cursor-pointer transition-all flex items-center w-fit gap-1 pr-2`}>
           {activeConfig.label} 
           <ChevronDown className="h-3 w-3 opacity-50" />
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="bg-slate-900 border-slate-800 text-slate-200">
        <DropdownMenuLabel className="text-xs text-slate-500 uppercase">Cambiar Estado</DropdownMenuLabel>
        
        <DropdownMenuItem onClick={() => handleStatusChange('pending')} className="hover:bg-slate-800 cursor-pointer gap-2">
            <FileText className="h-3 w-3 text-yellow-500"/> Pendiente
            {currentStatus === 'pending' && <Check className="ml-auto h-3 w-3" />}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleStatusChange('dispatched')} className="hover:bg-slate-800 cursor-pointer gap-2">
            <Truck className="h-3 w-3 text-blue-500"/> Despachada
            {currentStatus === 'dispatched' && <Check className="ml-auto h-3 w-3" />}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleStatusChange('invoiced')} className="hover:bg-slate-800 cursor-pointer gap-2">
            <Check className="h-3 w-3 text-emerald-500"/> Facturada
            {currentStatus === 'invoiced' && <Check className="ml-auto h-3 w-3" />}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-slate-800" />
        
        <DropdownMenuItem onClick={() => handleStatusChange('cancelled')} className="hover:bg-slate-800 cursor-pointer gap-2 text-red-400">
            <Ban className="h-3 w-3"/> Cancelar
            {currentStatus === 'cancelled' && <Check className="ml-auto h-3 w-3" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


// --- 2. COMPONENTE DE ACCIONES (EL RESTO DE BOTONES) ---
const ActionsCell = ({ row, onEdit, onDelete, onPreview }: { row: any, onEdit: any, onDelete: any, onPreview: any }) => {
  const order = row.original;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-800 text-slate-400">
          <span className="sr-only">Abrir menú</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(order.number || order.id)} className="hover:bg-slate-800 cursor-pointer">
          Copiar N° Orden
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-slate-800" />
        <DropdownMenuItem onClick={() => onPreview(order)} className="hover:bg-slate-800 cursor-pointer">
          <Eye className="mr-2 h-4 w-4" /> Ver Detalle
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(order)} className="hover:bg-slate-800 cursor-pointer">
          <Edit className="mr-2 h-4 w-4" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete(order)} className="text-red-500 hover:bg-red-900/20 cursor-pointer">
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