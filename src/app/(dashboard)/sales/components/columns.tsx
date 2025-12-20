"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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


// --- COMPONENTE INTELIGENTE DE ESTADO (CON DIALOG/MODAL) ---
const StatusCell = ({ row }: { row: any }) => {
  const order = row.original as SalesOrder;
  const { updateSalesOrder } = useSalesOrdersCRUD();
  const { toast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{ newStatus: string; date?: Date; invoiceNumber?: string } | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const currentStatusConfig = statusConfig[order.status] || statusConfig.pending;

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === order.status) return;

    if (newStatus === 'dispatched' || newStatus === 'invoiced') {
        const initialDate = 
            newStatus === 'invoiced' && order.invoicedDate ? parseISO(order.invoicedDate) :
            newStatus === 'dispatched' && order.dispatchedDate ? parseISO(order.dispatchedDate) :
            new Date();

        setModalData({
            newStatus,
            date: initialDate,
            invoiceNumber: order.invoiceNumber || ''
        });
        setIsModalOpen(true);
    } else {
        saveStatus(newStatus);
    }
  };

  const saveStatus = async (statusToSave: string, date?: Date, invoiceNumber?: string) => {
    setIsLoading(true);
    const updateData: Partial<SalesOrder> = { status: statusToSave as any };

    if (statusToSave === 'dispatched' && date) {
        updateData.dispatchedDate = date.toISOString();
    } else if (statusToSave === 'invoiced' && date) {
        updateData.invoicedDate = date.toISOString();
        updateData.invoiceNumber = invoiceNumber;
    }

    try {
        await updateSalesOrder(order.id, updateData);
        toast({ title: "Estado Actualizado", description: `La orden ahora está ${statusConfig[statusToSave].label}.` });
        setIsModalOpen(false);
        setModalData(null);
    } catch (error) {
        toast({ variant: "destructive", title: "Error al actualizar" });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleModalSave = () => {
      if (!modalData) return;
      if (!modalData.date) {
          toast({ variant: "destructive", title: "Fecha requerida" });
          return;
      }
      if (modalData.newStatus === 'invoiced' && !modalData.invoiceNumber) {
          toast({ variant: "destructive", title: "N° de Factura requerido" });
          return;
      }
      saveStatus(modalData.newStatus, modalData.date, modalData.invoiceNumber);
  }

  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setModalData(prev => prev ? { ...prev, date } : null);
    }
  }, []);

  const displayDate = order.status === 'invoiced' && order.invoicedDate 
    ? order.invoicedDate 
    : (order.status === 'dispatched' && order.dispatchedDate ? order.dispatchedDate : null);

  return (
    <>
      <Select value={order.status} onValueChange={handleStatusChange}>
        <SelectTrigger 
            className={`h-auto min-w-[150px] justify-between text-xs font-semibold px-3 py-1.5 transition-all ${currentStatusConfig.color}`}
            disabled={isLoading}
        >
            <SelectValue>
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
            </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
             {Object.entries(statusConfig).map(([key, { label }]) => (
                <SelectItem key={key} value={key} className="focus:bg-slate-800">{label}</SelectItem>
            ))}
        </SelectContent>
      </Select>

      <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <AlertDialogContent className="bg-slate-950 border-slate-800 text-slate-100">
            <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Estado: {statusConfig[modalData?.newStatus || '']?.label}</AlertDialogTitle>
                <AlertDialogDescription>
                    Por favor, proporcione la información adicional requerida.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
                 <div className="space-y-2">
                    <Label className="text-xs text-slate-400">
                        Fecha de {modalData?.newStatus === 'dispatched' ? 'Despacho' : 'Facturación'}
                    </Label>
                    <Calendar
                        mode="single"
                        selected={modalData?.date}
                        onSelect={handleDateSelect}
                        locale={es}
                        className="rounded-md border border-slate-800 bg-slate-900 p-2"
                    />
                </div>
                {modalData?.newStatus === 'invoiced' && (
                    <div className="space-y-2">
                        <Label htmlFor="invoiceNumber" className="text-xs text-slate-400">N° Factura</Label>
                        <Input
                            id="invoiceNumber"
                            value={modalData.invoiceNumber}
                            onChange={(e) => setModalData(prev => prev ? {...prev, invoiceNumber: e.target.value} : null)}
                            className="bg-slate-900 border-slate-700 h-9"
                            placeholder="Ej: 12345"
                        />
                    </div>
                )}
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel className="border-slate-700 hover:bg-slate-800">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleModalSave} className="bg-blue-600 hover:bg-blue-500" disabled={isLoading}>
                    <Save className="mr-2 h-4 w-4"/>
                    {isLoading ? 'Guardando...' : 'Confirmar y Guardar'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
