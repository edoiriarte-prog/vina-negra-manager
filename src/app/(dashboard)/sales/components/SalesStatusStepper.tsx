"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SalesOrder } from '@/lib/types';
import { useSalesOrdersCRUD } from '@/hooks/use-sales-orders-crud';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Loader2, Truck, FileText, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SalesStatusStepperProps {
  order: SalesOrder;
}

type MilestoneStatus = 'dispatched' | 'invoiced' | 'paid';
type ModalData = {
  status: MilestoneStatus;
  title: string;
  date: string;
  documentNumber?: string;
};

export function SalesStatusStepper({ order }: SalesStatusStepperProps) {
  const { updateSalesOrder } = useSalesOrdersCRUD();
  const { toast } = useToast();
  const router = useRouter(); 

  const [isLoading, setIsLoading] = useState(false);
  const [modalData, setModalData] = useState<ModalData | null>(null);

  const milestones = [
    { status: 'dispatched' as MilestoneStatus, icon: Truck, label: 'Despachada', date: order.dispatchedDate },
    { status: 'invoiced' as MilestoneStatus, icon: FileText, label: 'Facturada', date: order.invoicedDate },
    { status: 'paid' as MilestoneStatus, icon: DollarSign, label: 'Pagada', date: order.paidDate },
  ];

  const handleMilestoneClick = (status: MilestoneStatus, label: string) => {
    const milestone = milestones.find(m => m.status === status);
    
    // Al hacer clic, pre-llenamos el modal con la información existente o la fecha actual si es nuevo.
    setModalData({ 
      status, 
      title: `Registrar/Editar fecha de ${label}`, 
      date: milestone?.date ? format(parseISO(milestone.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      documentNumber: status === 'invoiced' ? order.invoiceNumber || '' : (order as any).paymentVoucher || ''
    });
  };

  const handleModalSave = async () => {
    if (!modalData) return;

    if (!modalData.date) {
      toast({ variant: "destructive", title: "Fecha requerida" });
      return;
    }
    if (modalData.status === 'invoiced' && !modalData.documentNumber) {
      toast({ variant: "destructive", title: "N° de Factura requerido" });
      return;
    }

    setIsLoading(true);
    const updateData: Partial<SalesOrder> = { status: modalData.status };
    
    if (modalData.status === 'dispatched') {
      updateData.dispatchedDate = parseISO(modalData.date).toISOString();
    }
    if (modalData.status === 'invoiced') {
        updateData.invoicedDate = parseISO(modalData.date).toISOString();
        updateData.invoiceNumber = modalData.documentNumber;
    }
    if (modalData.status === 'paid') {
      updateData.paidDate = parseISO(modalData.date).toISOString();
      // Guardamos el N° de comprobante en un campo genérico si es necesario.
      // Aquí podrías añadir un campo `paymentVoucher` a tu tipo SalesOrder si lo necesitas.
    }

    try {
      await updateSalesOrder(order.id, updateData);
      toast({ title: "Estado Actualizado", description: `La orden ahora está marcada como ${modalData.status}.` });
      setModalData(null);
      // Forza la actualización visual de la tabla
      window.location.reload(); 
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

          return (
            <div key={milestone.status} className="flex items-center gap-4 relative">
              <div
                className="flex flex-col items-center gap-1 text-center group cursor-pointer"
                onClick={() => handleMilestoneClick(milestone.status, milestone.label)}
              >
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all",
                  isCompleted 
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                    : 'bg-slate-800 border-slate-700 text-slate-500 group-hover:border-blue-500 group-hover:text-blue-400'
                )}>
                  <milestone.icon className="h-4 w-4" />
                </div>
                <div className="text-[10px] font-medium transition-colors text-slate-400">
                  {milestone.label}
                </div>
                {isCompleted && (
                  <div className="text-[9px] text-slate-500 -mt-1">
                    {format(parseISO(milestone.date!), 'dd-MM-yy', { locale: es })}
                  </div>
                )}
              </div>
              {index < milestones.length - 1 && (
                <div className={cn(
                  "w-6 border-t-2",
                  isCompleted ? 'border-emerald-500' : 'border-slate-700 border-dashed'
                )} />
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!modalData} onOpenChange={(open) => !open && setModalData(null)}>
        <AlertDialogContent className="bg-slate-950 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>{modalData?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              Confirme los detalles para actualizar el estado de la orden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="event-date" className="text-xs text-slate-400">Fecha del Evento</Label>
              <Input
                id="event-date"
                type="date"
                value={modalData?.date}
                onChange={(e) => setModalData(prev => prev ? { ...prev, date: e.target.value } : null)}
                className="bg-slate-900 border-slate-700 h-10"
              />
            </div>
            {modalData?.status !== 'dispatched' && (
              <div className="space-y-2">
                <Label htmlFor="documentNumber" className="text-xs text-slate-400">
                  {modalData?.status === 'invoiced' ? 'N° Factura de Venta' : 'N° Documento / Comprobante'}
                </Label>
                <Input
                  id="documentNumber"
                  value={modalData?.documentNumber || ''}
                  onChange={(e) => setModalData(prev => prev ? { ...prev, documentNumber: e.target.value } : null)}
                  className="bg-slate-900 border-slate-700 h-10"
                  placeholder={modalData?.status === 'invoiced' ? 'Ej: 12345' : 'Opcional'}
                />
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 hover:bg-slate-800">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleModalSave} className="bg-blue-600 hover:bg-blue-500" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirmar y Guardar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
