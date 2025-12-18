
"use client";

import { useState, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { SalesOrder } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, ArrowUpDown, Eye, Edit, Trash, Check, Truck, FileText, Ban, ChevronDown, Calendar as CalendarIcon, Save
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useSalesOrdersCRUD } from "@/hooks/use-sales-orders-crud";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";


const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: 'Pendiente', color: 'border-yellow-500/50 bg-yellow-950/50 text-yellow-400', icon: Check },
    dispatched: { label: 'Despachada', color: 'border-blue-500/50 bg-blue-950/50 text-blue-400', icon: Truck },
    invoiced: { label: 'Facturada', color: 'border-emerald-500/50 bg-emerald-950/50 text-emerald-400', icon: FileText },
    cancelled: { label: 'Cancelada', color: 'border-red-500/50 bg-red-950/50 text-red-500', icon: Ban },
};


// --- COMPONENTE INTELIGENTE DE ESTADO (CON POPOVER) ---
const StatusCell = ({ row }: { row: any }) => {
  const order = row.original as SalesOrder;
  const { updateSalesOrder } = useSalesOrdersCRUD();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  
  // Estado temporal para el popover
  const [tempStatus, setTempStatus] = useState(order.status);
  const [tempDate, setTempDate] = useState<Date | undefined>(
      order.status === 'invoiced' && order.invoicedDate ? parseISO(order.invoicedDate) :
      order.status === 'dispatched' && order.dispatchedDate ? parseISO(order.dispatchedDate) :
      new Date()
  );
  const [tempInvoiceNumber, setTempInvoiceNumber] = useState(order.invoiceNumber || '');

  const [isLoading, setIsLoading] = useState(false);

  const currentStatusConfig = statusConfig[order.status] || statusConfig.pending;
  const showExtraFields = tempStatus === 'dispatched' || tempStatus === 'invoiced';

  // Sincronizar estado si la orden cambia desde fuera
  useEffect(() => {
    setTempStatus(order.status);
    setTempInvoiceNumber(order.invoiceNumber || '');
    setTempDate(
      order.status === 'invoiced' && order.invoicedDate ? parseISO(order.invoicedDate) :
      order.status === 'dispatched' && order.dispatchedDate ? parseISO(order.dispatchedDate) :
      new Date()
    );
  }, [order]);

  const handleSave = async () => {
    if (showExtraFields && !tempDate) {
        toast({ variant: "destructive", title: "Fecha requerida" });
        return;
    }
    
    if (tempStatus === 'invoiced' && !tempInvoiceNumber) {
        toast({ variant: "destructive", title: "N° de Factura requerido" });
        return;
    }

    setIsLoading(true);
    const updateData: Partial<SalesOrder> = { status: tempStatus as any };
    if (tempStatus === 'dispatched') {
        updateData.dispatchedDate = tempDate!.toISOString();
    } else if (tempStatus === 'invoiced') {
        updateData.invoicedDate = tempDate!.toISOString();
        updateData.invoiceNumber = tempInvoiceNumber;
    }

    try {
        await updateSalesOrder(order.id, updateData);
        toast({ title: "Estado Actualizado", description: `La orden ahora está ${statusConfig[tempStatus].label}.` });
        setIsOpen(false);
    } catch (error) {
        toast({ variant: "destructive", title: "Error al actualizar" });
    } finally {
        setIsLoading(false);
    }
  };
  
  const displayDate = order.status === 'invoiced' && order.invoicedDate 
    ? order.invoicedDate 
    : (order.status === 'dispatched' && order.dispatchedDate ? order.dispatchedDate : null);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
            variant="outline"
            onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
            className={`h-auto min-w-[150px] justify-between text-xs font-semibold px-3 py-1.5 transition-all ${currentStatusConfig.color}`}
            disabled={isLoading}
        >
            <div className="flex flex-col items-start">
            <span className="flex items-center gap-1.5">
                <currentStatusConfig.icon className="h-3.5 w-3.5" />
                {currentStatusConfig.label}
            </span>
            {displayDate && (
                <span className="text-[10px] font-normal text-slate-500 pl-5">
                    {format(parseISO(displayDate), 'dd/MM/yy')}
                </span>
            )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 bg-slate-950 border-slate-800 text-slate-100 p-4"
        align="start"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
            <div className="space-y-1">
                <Label className="text-xs text-slate-400">Cambiar estado a:</Label>
                <Select value={tempStatus} onValueChange={setTempStatus}>
                    <SelectTrigger className="w-full bg-slate-900 border-slate-700">
                        <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                        {Object.entries(statusConfig).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {showExtraFields && (
                <div className="space-y-4 border-t border-slate-800 pt-4">
                    <div className="space-y-1">
                         <Label className="text-xs text-slate-400">
                            Fecha de {tempStatus === 'dispatched' ? 'Despacho' : 'Facturación'}
                         </Label>
                         <Calendar
                            mode="single"
                            selected={tempDate}
                            onSelect={(d) => d && setTempDate(d)}
                            locale={es}
                            className="rounded-md border border-slate-800 bg-slate-900 p-0"
                         />
                    </div>
                    {tempStatus === 'invoiced' && (
                        <div className="space-y-1">
                            <Label htmlFor="invoiceNumber" className="text-xs text-slate-400">N° Factura</Label>
                            <Input
                                id="invoiceNumber"
                                value={tempInvoiceNumber}
                                onChange={(e) => setTempInvoiceNumber(e.target.value)}
                                className="bg-slate-900 border-slate-700 h-9"
                                placeholder="Ej: 12345"
                            />
                        </div>
                    )}
                </div>
            )}
            
            <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-500 text-white" disabled={isLoading}>
                <Save className="mr-2 h-4 w-4"/>
                {isLoading ? 'Guardando...' : 'Guardar'}
            </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};


// --- COMPONENTE DE ACCIONES ---
const ActionsCell = ({ row, onEdit, onDelete, onPreview }: { row: any, onEdit: any, onDelete: any, onPreview: any }) => {
  const order = row.original;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-800 text-slate-400" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200" onClick={(e) => e.stopPropagation()}>
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
            const dateValue = row.getValue("date") as string;
            if (!dateValue || !isValid(parseISO(dateValue))) return <span className="text-red-500">Inválida</span>;
            return <div className="text-slate-400 text-xs">{format(parseISO(dateValue), "dd-MM-yyyy", { locale: es })}</div>
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
      return <div className="text-right font-mono font-medium text-slate-300">{new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(amount)}</div>;
    },
  },
  {
    id: "totalWithVat",
    header: () => <div className="text-right">TOTAL C/IVA</div>,
    cell: ({ row }) => {
        const net = parseFloat(row.original.totalAmount?.toString() || "0");
        const includeVat = row.original.includeVat !== false; 
        const total = includeVat ? net * 1.19 : net;
        return <div className="text-right font-mono font-bold text-emerald-400">{new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(total)}</div>;
    }
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell row={row} onEdit={onEdit} onDelete={onDelete} onPreview={onPreview} />,
  },
];

    