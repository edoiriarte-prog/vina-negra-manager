"use client";

import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SalesOrder, Contact } from '@/lib/types';
// Importamos el diseño del contenido
import { SalesOrderPreviewContent } from './sales-order-preview-content';
import { useReactToPrint } from 'react-to-print';
import { Printer, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type SalesOrderPreviewProps = {
  order: SalesOrder | null;
  client: Contact | null; // <--- AQUÍ ESTABA EL FALTANTE
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function SalesOrderPreview({ order, client, isOpen, onOpenChange }: SalesOrderPreviewProps) {
  const componentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Imprimir
  const handlePrint = useReactToPrint({
      contentRef: componentRef,
      documentTitle: order ? `OV_${order.id}` : 'Orden_de_Venta',
  });

  // Descargar PDF
  const handleDownloadPdf = async () => {
    const element = componentRef.current;
    if (!element) return;

    setIsDownloading(true);
    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
        pdf.save(`OV_${order?.id || 'document'}.pdf`);

    } catch (error) {
        console.error("Error al generar PDF:", error);
        alert("Error al generar el PDF.");
    } finally {
        setIsDownloading(false);
    }
  };

  if (!order) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] p-0 flex flex-col gap-0 bg-white text-black">
        
        {/* Header */}
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle>Vista Previa: {order.id}</DialogTitle>
        </DialogHeader>
        
        {/* Contenido Scrollable */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4 flex justify-center">
            <div className="shadow-lg bg-white w-full max-w-[210mm] shrink-0">
                {/* Renderizamos el contenido pasándole el cliente */}
                <SalesOrderPreviewContent
                    ref={componentRef}
                    order={order} 
                    client={client}
                />
            </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-white shrink-0 flex flex-col-reverse sm:flex-row gap-2">
            <Button 
                onClick={handleDownloadPdf} 
                variant="secondary"
                disabled={isDownloading}
                className="w-full sm:w-auto"
            >
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {isDownloading ? "Generando..." : "Descargar PDF"}
            </Button>

            <Button onClick={() => handlePrint && handlePrint()} className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
            </Button>

            <DialogClose asChild>
                <Button type="button" variant="outline" className="w-full sm:w-auto">Cerrar</Button>
            </DialogClose>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}