
"use client";

import React from 'react';
import { PurchaseOrder, Contact, OrderItem } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import Barcode from 'react-barcode';
import { useMasterData } from '@/hooks/use-master-data';

interface LotLabelContentProps {
  order: PurchaseOrder;
  supplier: Contact | null;
}

export const LotLabelContent = React.forwardRef<HTMLDivElement, LotLabelContentProps>(({ order, supplier }, ref) => {
  const { calibers } = useMasterData();
  
  const getCaliberCode = (caliberName: string) => {
    const caliber = calibers.find(c => c.name === caliberName);
    return caliber ? caliber.code : 'N/A';
  }

  return (
    <div ref={ref}>
      {order.items.map((item, index) => {
        const avgWeight = (item.packagingQuantity && item.packagingQuantity > 0) ? (item.quantity / item.packagingQuantity) : 0;
        const ocId = order.id.split('-')[1];
        const dateCode = format(parseISO(order.date), 'ddMM');
        const caliberCode = getCaliberCode(item.caliber);
        const individualLabelCode = `${caliberCode}-${ocId}-${dateCode}`;

        return (
          <div key={`${order.id}-${item.id}`} className="p-8 w-[210mm] h-[297mm] bg-white text-black font-sans text-sm lot-page">
            {/* Main Lot Label */}
            <div className="border-4 border-black p-4 h-full flex flex-col">
              <div className="text-center mb-4 border-b-2 border-black pb-2">
                <h1 className="text-2xl font-bold">LOTE DE PRODUCCIÓN</h1>
                <h2 className="text-xl font-semibold">{item.product}</h2>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 flex-grow">
                <div><span className="font-bold">ORDEN DE COMPRA:</span> {order.id}</div>
                <div><span className="font-bold">FECHA COSECHA:</span> {format(parseISO(order.date), 'dd/MM/yyyy')}</div>
                <div><span className="font-bold">PRODUCTO:</span> {item.product}</div>
                <div><span className="font-bold">CALIBRE:</span> {item.caliber} ({getCaliberCode(item.caliber)})</div>
                <div className="col-span-2"><span className="font-bold">PROVEEDOR:</span> {supplier?.name || 'N/A'}</div>
                <div className="col-span-2 border-t-2 border-black pt-4 mt-2">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="font-bold text-lg">Nº ENVASES</div>
                      <div className="text-2xl font-mono">{item.packagingQuantity?.toLocaleString('es-CL') || 0}</div>
                    </div>
                    <div>
                      <div className="font-bold text-lg">KG TOTALES</div>
                      <div className="text-2xl font-mono">{item.quantity.toLocaleString('es-CL')} kg</div>
                    </div>
                     <div>
                      <div className="font-bold text-lg">PESO PROMEDIO</div>
                      <div className="text-2xl font-mono">{avgWeight.toFixed(2)} kg</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-auto text-center border-t-4 border-black pt-4">
                <h3 className="font-bold text-lg mb-2">LOTE</h3>
                {item.lotNumber && (
                  <div className="flex justify-center">
                    <Barcode value={item.lotNumber} width={3} height={80} />
                  </div>
                )}
              </div>
            </div>

            {/* Individual Box Labels */}
            <div className="w-[210mm] h-[297mm] bg-white text-black p-4 lot-page-boxes">
              <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: item.packagingQuantity || 0 }).map((_, i) => (
                      <div key={i} className="border border-black p-1 text-center text-[8px] flex flex-col items-center justify-center h-[50mm]">
                          <p className="font-bold">{item.product} - {item.caliber}</p>
                          <p>{supplier?.name}</p>
                           <div className="my-1">
                            <Barcode value={individualLabelCode} height={20} width={1} fontSize={8} margin={2} />
                          </div>
                          <p>{order.id}</p>
                      </div>
                  ))}
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
});

LotLabelContent.displayName = 'LotLabelContent';
