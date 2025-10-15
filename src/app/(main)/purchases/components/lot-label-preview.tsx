
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogClose, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PurchaseOrder, Contact, OrderItem } from '@/lib/types';
import { LotLabelContent } from './lot-label-content';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import Barcode from 'react-barcode';
import { format, parseISO } from 'date-fns';
import { useMasterData } from '@/hooks/use-master-data';

type LotLabelPreviewProps = {
  order: PurchaseOrder | null;
  supplier: Contact | null;
  specificItem: OrderItem | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function LotLabelPreview({ order, supplier, specificItem, isOpen, onOpenChange }: LotLabelPreviewProps) {
  const componentRef = React.useRef<HTMLDivElement>(null);
  const { calibers } = useMasterData();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
     pageStyle: `@page { size: A4; margin: 0; } @media print { body { -webkit-print-color-adjust: exact; } .lot-page-boxes { display: block !important; } }`,
  });

  if (!order || !specificItem) {
    return null;
  }
  
  const getCaliberCode = (caliberName: string) => {
    const caliber = calibers.find(c => c.name === caliberName);
    return caliber ? caliber.code : 'N/A';
  }

  const ocId = order.id.split('-')[1];
  const dateCode = format(parseISO(order.date), 'ddMM');
  const caliberCode = getCaliberCode(specificItem.caliber);
  const individualLabelCode = `${caliberCode}-${ocId}-${dateCode}`;


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-0">
        <DialogHeader className="p-6 pb-0 no-print">
          <DialogTitle>Previsualización de Etiqueta de Lote: {specificItem.lotNumber}</DialogTitle>
        </DialogHeader>
        <div className="p-6 max-h-[70vh] overflow-y-auto bg-gray-200 flex flex-wrap gap-4 justify-center">
           {/* This is a scaled-down preview for the UI */}
           <div className="w-[210mm] min-h-[297mm] mx-auto origin-top scale-[0.4] sm:scale-50 md:scale-75 lg:scale-[0.8] xl:scale-100">
             <div className="p-8 w-full h-full bg-white text-black font-sans flex flex-col">
                <div className="border-4 border-black p-6 h-full flex flex-col">
                    <h1 className="text-3xl font-bold text-center mb-4">PREVISUALIZACIÓN DE LOTE</h1>
                    {specificItem.lotNumber && <div className="flex justify-center"><Barcode value={specificItem.lotNumber} height={60} width={2} /></div>}
                </div>
             </div>
           </div>
           <div className="w-[105mm] min-h-[74.25mm] mx-auto origin-top scale-100 bg-white p-2 flex items-center justify-center">
                <div className="border border-black p-2 text-center text-xs flex flex-col items-center justify-center w-full h-full">
                  <p className="font-bold">{specificItem.product} - {specificItem.caliber}</p>
                  <p>{supplier?.name}</p>
                   <div className="my-1 transform scale-75">
                    <Barcode value={individualLabelCode} height={20} width={1} fontSize={8} margin={2} />
                  </div>
                  <p>{order.id}</p>
              </div>
           </div>

        </div>
        {/* This is the hidden, full-sized version for printing */}
        <div className="hidden">
            <LotLabelContent ref={componentRef} order={order} supplier={supplier} specificItem={specificItem}/>
        </div>
        <DialogFooter className="p-6 pt-0 border-t gap-2 no-print">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cerrar</Button>
          </DialogClose>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Etiqueta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
