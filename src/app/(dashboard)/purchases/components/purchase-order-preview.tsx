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
import { PurchaseOrder, Contact } from '@/lib/types';
import { PreviewContent } from './purchase-order-preview-content';
import { useReactToPrint } from 'react-to-print';
import { Printer, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type PurchaseOrderPreviewProps = {
  order: PurchaseOrder | null;
  supplier: Contact | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function PurchaseOrderPreview({ order, supplier, isOpen, onOpenChange }: PurchaseOrderPreviewProps) {
  const componentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // --- CORRECCIÓN AQUÍ ---
  // En versiones nuevas de react-to-print, se usa 'contentRef' en lugar de 'content'
  const handlePrint = useReactToPrint({
      contentRef: componentRef, // <--- CAMBIO IMPORTANTE
      documentTitle: order ? `OC_${order.id}` : 'Orden_de_Compra',
  });

  // Función para DESCARGAR PDF
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
        pdf.save(`OC_${order?.id || 'document'}.pdf`);

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
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] p-0 flex flex-col gap-0">
        
        {/* Header Fijo */}
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle>Vista Previa: {order.id}</DialogTitle>
        </DialogHeader>
        
        {/* Contenido con Scroll */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4 flex justify-center">
            <div className="shadow-lg bg-white w-full max-w-[210mm] shrink-0">
                <PreviewContent
                    ref={componentRef}
                    order={order} 
                    supplier={supplier}
                />
            </div>
        </div>

        {/* Footer Fijo */}
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

            <Button onClick={() => handlePrint && handlePrint()} variant="default" className="w-full sm:w-auto">
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