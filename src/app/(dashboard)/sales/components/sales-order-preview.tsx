"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SalesOrder } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { Download, Printer } from "lucide-react";
// Nuevas importaciones
import { useMasterData } from "@/hooks/use-master-data";
import { PDFDownloadButton } from "@/components/pdf/pdf-download-button";

interface SalesOrderPreviewProps {
  order: SalesOrder | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onExportRequest?: () => void;
}

export function SalesOrderPreview({ order, isOpen, onOpenChange, onExportRequest }: SalesOrderPreviewProps) {
  // Obtenemos los contactos para buscar el nombre y RUT del cliente
  const { contacts } = useMasterData();
  
  if (!order) return null;

  const client = contacts.find(c => c.id === order.clientId);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle>Detalle de Orden {order.number || order.id.substring(0,8)}</DialogTitle>
          <DialogDescription>
            {format(parseISO(order.date), "PPPP", { locale: es })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold text-slate-500">Cliente</p>
              <p className="font-bold">{client?.name || 'Cliente General'}</p>
              <p className="text-xs text-slate-400">{client?.rut || ''}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-500">Estado</p>
              <p className="uppercase font-bold">{order.status === 'dispatched' ? 'Despachado' : order.status}</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="font-semibold text-slate-500 mb-2">Items</p>
            <div className="space-y-2">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <span>{item.product} {item.caliber} ({item.quantity} kg)</span>
                  <span>{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>

        <DialogFooter className="sm:justify-between flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cerrar</Button>
          
          <div className="flex gap-2 flex-wrap justify-end">
            {/* Botón PDF Nuevo */}
            <PDFDownloadButton 
                order={order}
                clientName={client?.name || 'Cliente'}
                clientRut={client?.rut}
                type="VENTA"
                fileName={`Venta_${order.number || order.id}.pdf`}
            />

            {/* Botón Excel Antiguo (Opcional) */}
            {onExportRequest && (
                <Button onClick={onExportRequest} variant="outline" className="gap-2" title="Descargar Excel">
                    <Download className="h-4 w-4" /> Excel
                </Button>
            )}
            
            <Button onClick={() => window.print()} className="gap-2" variant="ghost" title="Impresión rápida">
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}