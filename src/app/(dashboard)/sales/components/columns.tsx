
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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


// --- COMPONENTE INTELIGENTE DE ESTADO (CON DIÁLOGO) ---
const StatusCell = ({ row }: { row: any }) => {
  const order = row.original as SalesOrder;
  const { updateSalesOrder } = useSalesOrdersCRUD();
  const { toast } = useToast();
  
  const [targetStatus, setTargetStatus] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentStatusConfig = statusConfig[order.status] || statusConfig.pending;

  const handleStatusSelect = (newStatus: string) => {
    if (newStatus === order.status) return;

    if (newStatus === 'dispatched' || newStatus === 'invoiced') {
      setTargetStatus(newStatus);
      setDate(new Date()); // Reset date on open
      setInvoiceNumber(''); // Reset invoice number
    } else {
      // Para estados simples como 'cancelled' o 'pending', actualizar directamente
      setIsLoading(true);
      updateSalesOrder(order.id, { status: newStatus as any })
        .then(() => toast({ title: "Estado Actualizado" }))
        .catch(() => toast({ variant: "destructive", title: "Error al actualizar" }))
        .finally(() => setIsLoading(false));
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!targetStatus || !date) return;
    
    setIsLoading(true);
    const updateData: Partial<SalesOrder> = { status: targetStatus as any };

    if (targetStatus === 'dispatched') {
        updateData.dispatchedDate = date.toISOString();
    } else if (targetStatus === 'invoiced') {
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
        toast({ title: "Trazabilidad Registrada", description: `La orden ahora está ${statusConfig[targetStatus].label}.` });
        setTargetStatus(null);
    } catch (error) {
        toast({ variant: 'destructive', title: "Error al guardar trazabilidad" });
    } finally {
        setIsLoading(false);
    }
  };
  
  const displayDate = order.status === 'invoiced' && order.invoicedDate 
    ? order.invoicedDate 
    : (order.status === 'dispatched' && order.dispatchedDate ? order.dispatchedDate : null);

  return (
    <>
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
            onCloseAutoFocus={(e) => e.preventDefault()} // Previene que el trigger tome foco y propague el click
        >
          {Object.entries(statusConfig).map(([key, { label }]) => (
            <DropdownMenuItem 
                key={key} 
                onSelect={(e) => {
                    e.preventDefault(); // Detiene el cierre del menú y la propagación a la fila
                    e.stopPropagation();
                    handleStatusSelect(key);
                }}
                className="cursor-pointer focus:bg-slate-800"
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!targetStatus} onOpenChange={(isOpen) => !isOpen && setTargetStatus(null)}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Registrar Trazabilidad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p>
              Estás marcando la orden como <span className="font-bold text-blue-400">{statusConfig[targetStatus!]?.label}</span>. 
              Por favor, selecciona la fecha del evento.
            </p>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                locale={es}
                className="rounded-md border border-slate-800 bg-slate-900"
              />
            </div>
            {targetStatus === 'invoiced' && (
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Número de Factura</Label>
                <Input
                  id="invoiceNumber"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="bg-slate-900 border-slate-700"
                  placeholder="Ej: 12345"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" className="hover:bg-slate-800">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleConfirmStatusChange} disabled={isLoading}>
              {isLoading ? "Guardando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
