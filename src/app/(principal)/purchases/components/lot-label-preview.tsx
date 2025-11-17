
"use client";

import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LotGenerationContent } from './lot-generation-content';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';

type LotSelection = {
  orderId: string;
  caliberName: string;
  caliberCode: string;
  productName: string;
  supplierName: string;
  totalKilos: number;
  totalPackages: number;
  avgWeight: number;
};

type LotLabelPreviewProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  lotData: {
    creationDate: string;
    items: LotSelection[];
  };
};

const PrintableLotContent = React.forwardRef<HTMLDivElement, { lotData: any }>(({ lotData }, ref) => {
    return (
        <div ref={ref}>
            <LotGenerationContent lotData={lotData} />
        </div>
    );
});
PrintableLotContent.displayName = 'PrintableLotContent';


export function LotLabelPreview({ isOpen, onOpenChange, lotData }: LotLabelPreviewProps) {
  const componentToPrintRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    content: () => componentToPrintRef.current,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="p-6 pb-0 no-print">
          <DialogTitle>Previsualización de Etiqueta de Lote</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto bg-gray-200 p-8">
            <div className="w-full">
                <PrintableLotContent ref={componentToPrintRef} lotData={lotData} />
            </div>
        </div>
        <DialogFooter className="p-6 pt-4 border-t gap-2 no-print">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Etiqueta
          </Button>
          <DialogClose asChild>
            <Button type="button">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
