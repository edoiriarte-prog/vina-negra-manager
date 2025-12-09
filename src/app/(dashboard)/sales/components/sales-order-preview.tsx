"use client";

import React, { useRef } from 'react';
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
import { Printer, Download, FileSpreadsheet } from "lucide-react";
import { useMasterData } from "@/hooks/use-master-data";
import { useReactToPrint } from 'react-to-print';
import { PDFDownloadLink } from "@react-pdf/renderer";
import { OrderDocument } from "@/components/pdf/order-document";
import { SalesOrderPreviewContent } from './sales-order-preview-content';

interface SalesOrderPreviewProps {
  order: SalesOrder | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onExportRequest?: () => void;
}

export function SalesOrderPreview({ order, isOpen, onOpenChange, onExportRequest }: SalesOrderPreviewProps) {
  const { contacts, bankAccounts } = useMasterData();
  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  if (!order) return null;

  const client = contacts.find(c => c.id === order.clientId);
  const bankAccount = bankAccounts.find(b => b.id === order.bankAccountId);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[890px] w-full p-0 flex flex-col h-[95vh] bg-slate-200">
        
        <DialogHeader className="p-4 bg-white border-b no-print">
          <DialogTitle>Orden de Venta: #{order.number || order.id}</DialogTitle>
          <DialogDescription>Vista previa del documento para impresión o descarga.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-slate-200 p-6" id="printable-content-wrapper">
          <SalesOrderPreviewContent ref={printRef} order={order} client={client || null} />
        </div>

        <DialogFooter className="p-4 bg-white border-t sm:justify-end no-print">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cerrar</Button>
            {client && (
                 <PDFDownloadLink
                    document={
                        <OrderDocument 
                            order={order}
                            clientName={client.name}
                            clientRut={client.rut}
                            clientAddress={client.address}
                            clientContact={client.contactPerson}
                            bankAccount={bankAccount}
                            type="VENTA"
                        />
                    }
                    fileName={`OV_${order.number || order.id}.pdf`}
                 >
                 {({ loading }) => (
                    <Button variant="outline" disabled={loading} className="gap-2">
                        <Download className="h-4 w-4" />
                        {loading ? 'Generando...' : 'Descargar PDF'}
                    </Button>
                 )}
                 </PDFDownloadLink>
            )}
            {onExportRequest && (
                <Button onClick={onExportRequest} variant="outline" className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" /> Excel
                </Button>
            )}
            <Button onClick={handlePrint} variant="outline" className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
