"use client";

import { useState, useEffect, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { SalesOrder } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, ArrowUpDown, Eye, Edit, Trash, Check, Truck, FileText, Ban, DollarSign, Save, Calendar as CalendarIcon
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
import { useSalesOrdersCRUD } from "@/hooks/use-sales-orders-crud";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

// --- NUEVO COMPONENTE STEPPER DE ESTADO ---
const StatusStepper = ({ row }: { row: any }) => {
  const order = row.original as SalesOrder;
  const { updateSalesOrder } = useSalesOrdersCRUD();
  const { toast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{
    status: 'dispatched' | 'invoiced' | 'paid';
    title: string;
    date?: Date;
    invoiceNumber?: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const milestones = [
    { status: 'dispatched', icon: Truck, label: 'Despachada', date: order.dispatchedDate },
    { status: 'invoiced', icon: FileText, label: 'Facturada', date: order.invoicedDate },
    { status: 'paid', icon: DollarSign, label: 'Pagada', date: order.paidDate },
  ];

  const handleMilestoneClick = (status: 'dispatched' | 'invoiced' | 'paid', label: string) => {
    // Solo abre el modal si el paso no se ha completado
    const milestone = milestones.find(m => m.status === status);
    if (milestone && !milestone.date) {
      setModalContent({ status, title: `Marcar como ${label}`, date: new Date() });
      setIsModalOpen(true);
    }
  };

  const handleModalSave = async () => {
    if (!modalContent || !modalContent.date) {
      toast({ variant: "destructive", title: "Fecha requerida" });
      return;
    }
    if (modalContent.status === 'invoiced' && !modalContent.invoiceNumber) {
      toast({ variant: "destructive", title: "N° de Factura requerido" });
      return;
    }

    setIsLoading(true);
    const updateData: Partial<SalesOrder> = { status: modalContent.status };
    
    if (modalContent.status === 'dispatched') updateData.dispatchedDate = modalContent.date.toISOString();
    if (modalContent.status === 'invoiced') {
        updateData.invoicedDate = modalContent.date.toISOString();
        updateData.invoiceNumber = modalContent.invoiceNumber;
    }
    if (modalContent.status === 'paid') updateData.paidDate = modalContent.date.toISOString();

    try {
      await updateSalesOrder(order.id, updateData);
      toast({ title: "Estado Actualizado", description: `La orden ahora está ${modalContent.title.toLowerCase()}.` });
      setIsModalOpen(false);
      setModalContent(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Error al actualizar" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4">
        {milestones.map((milestone, index) => {
          const isCompleted = !!milestone.date;
          const isClickable = !isCompleted;
          
          return (
            <div key={milestone.status} className="flex items-center gap-4 relative">
              <div 
                className={`flex flex-col items-center gap-1 text-center cursor-${isClickable ? 'pointer' : 'default'} group`}
                onClick={() => isClickable && handleMilestoneClick(milestone.status as any, milestone.label)}
              >
                <div className={`
                  h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all
                  ${isCompleted 
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                    : 'bg-slate-800 border-slate-700 text-slate-500 group-hover:border-blue-500 group-hover:text-blue-400'
                  }`}
                >
                  <milestone.icon className="h-4 w-4" />
                </div>
                <div className={`text-[10px] font-medium transition-colors ${isCompleted ? 'text-slate-300' : 'text-slate-500 group-hover:text-slate-300'}`}>{milestone.label}</div>
                 {isCompleted && (
                    <div className="text-[9px] text-slate-500 -mt-1">
                        {format(parseISO(milestone.date!), 'dd-MM-yy')}
                    </div>
                )}
              </div>

              {index < milestones.length - 1 && (
                <div className={`w-6 border-t-2 ${isCompleted ? 'border-emerald-500' : 'border-slate-700 border-dashed'}`} />
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <AlertDialogContent className="bg-slate-950 border-slate-800 text-slate-100">
            <AlertDialogHeader>
                <AlertDialogTitle>{modalContent?.title || 'Confirmar Estado'}</AlertDialogTitle>
                <AlertDialogDescription>
                    Seleccione la fecha en que ocurrió este evento.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
                 <div className="flex justify-center">
                    <Calendar
                        mode="single"
                        selected={modalContent?.date}
                        onSelect={(date) => date && setModalContent(prev => prev ? { ...prev, date } : null)}
                        locale={es}
                        className="rounded-md border border-slate-800 bg-slate-900 p-2"
                    />
                </div>
                {modalContent?.status === 'invoiced' && (
                    <div className="space-y-2">
                        <Label htmlFor="invoiceNumber" className="text-xs text-slate-400">N° Factura</Label>
                        <Input
                            id="invoiceNumber"
                            value={modalContent.invoiceNumber || ''}
                            onChange={(e) => setModalContent(prev => prev ? {...prev, invoiceNumber: e.target.value} : null)}
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
    cell: ({ row }) => <StatusStepper row={row} />,
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
