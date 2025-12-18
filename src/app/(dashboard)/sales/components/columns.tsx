
"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { SalesOrder } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, ArrowUpDown, Eye, Edit, Trash, Check, Truck, FileText, Ban, ChevronDown, Calendar as CalendarIcon 
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
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';


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
  
  const [popoverState, setPopoverState] = useState<{ open: boolean; targetStatus: string | null }>({ open: false, targetStatus: null });
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentStatusConfig = statusConfig[order.status] || statusConfig.pending;

  const handleStatusSelect = (newStatus: string) => {
    if (newStatus === order.status) return;

    if (newStatus === 'dispatched' || newStatus === 'invoiced') {
      setDate(new Date());
      setInvoiceNumber('');
      setPopoverState({ open: true, targetStatus: newStatus });
    } else {
      setIsLoading(true);
      updateSalesOrder(order.id, { status: newStatus as any })
        .then(() => toast({ title: "Estado Actualizado" }))
        .catch(() => toast({ variant: "destructive", title: "Error al actualizar" }))
        .finally(() => setIsLoading(false));
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!popoverState.targetStatus || !date) return;
    
    setIsLoading(true);
    const updateData: Partial<SalesOrder> = { status: popoverState.targetStatus as any };

    if (popoverState.targetStatus === 'dispatched') {
        updateData.dispatchedDate = date.toISOString();
    } else if (popoverState.targetStatus === 'invoiced') {
        if (!invoiceNumber) {
            toast({ variant: 'destructive', title: 'Falta N° de Factura' });
            setIsLoading(false);
            return;
        }
        updateData.invoicedDate = date.toISOString();
        updateData.invoiceNumber = invoiceNumber;
    }

    try {
        await updateSalesOrder(order.id, updateData);
        toast({ title: "Trazabilidad Registrada", description: `La orden ahora está ${statusConfig[popoverState.targetStatus].label}.` });
        setPopoverState({ open: false, targetStatus: null });
    } catch (error) {
        toast({ variant: 'destructive', title: "Error al guardar trazabilidad" });
    } finally {
        setIsLoading(false);
    }
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate && popoverState.targetStatus) {
        handleConfirmStatusChange();
    }
  }
  
  const displayDate = order.status === 'invoiced' && order.invoicedDate 
    ? order.invoicedDate 
    : (order.status === 'dispatched' && order.dispatchedDate ? order.dispatchedDate : null);

  return (
    <>
      <Popover open={popoverState.open} onOpenChange={(open) => setPopoverState({ open, targetStatus: open ? popoverState.targetStatus : null })}>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button
                variant="outline"
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
            </DropdownMenuTrigger>
            <DropdownMenuContent 
                align="start" 
                className="bg-slate-900 border-slate-800 text-slate-200"
                onCloseAutoFocus={(e) => e.preventDefault()}
            >
            {Object.entries(statusConfig).map(([key, { label }]) => (
                <DropdownMenuItem 
                    key={key} 
                    onSelect={() => handleStatusSelect(key)}
                    className="cursor-pointer focus:bg-slate-800"
                >
                {label}
                </DropdownMenuItem>
            ))}
            </DropdownMenuContent>
        </DropdownMenu>

        <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800" align="start">
          <div className="p-4 space-y-2">
            <p className="text-sm text-slate-300">
                Registrar fecha de <span className="font-bold">{statusConfig[popoverState.targetStatus || 'pending'].label}</span>
            </p>
            {popoverState.targetStatus === 'invoiced' && (
              <div className="space-y-1">
                  <Label htmlFor="invoiceNumber" className="text-xs text-slate-400">N° Factura</Label>
                  <Input
                      id="invoiceNumber"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="bg-slate-950 border-slate-700 h-8"
                      placeholder="Ej: 12345"
                      onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmStatusChange();
                      }}
                  />
              </div>
            )}
          </div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            locale={es}
            className="rounded-md"
            initialFocus
          />
          {popoverState.targetStatus === 'invoiced' && (
             <div className="p-2 border-t border-slate-800">
                <Button onClick={handleConfirmStatusChange} className="w-full h-8" disabled={isLoading || !invoiceNumber}>
                    {isLoading ? 'Guardando...' : 'Confirmar Facturación'}
                </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </>
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
            return <div className="text-slate-400 text-xs">{format(parseISO(row.getValue("date")), "dd-MM-yyyy", { locale: es })}</div>
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
        const net = parseFloat(row.original.totalAmount?.toString() || "0");
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

    
