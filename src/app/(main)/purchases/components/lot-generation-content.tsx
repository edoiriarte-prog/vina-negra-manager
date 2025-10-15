
"use client";

import React from 'react';
import { format } from 'date-fns';

type LotItem = {
  lotId: string;
  orderId: string;
  caliberName: string;
  caliberCode: string;
  productName: string;
  supplierName: string;
  totalKilos: number;
  totalPackages: number;
  avgWeight: number;
};

type LotGenerationContentProps = {
  lotData: {
    creationDate: string;
    items: LotItem[];
  };
};

export const LotGenerationContent = React.forwardRef<HTMLDivElement, LotGenerationContentProps>(({ lotData }, ref) => {
  if (!lotData) return null;

  const { creationDate, items } = lotData;
  const firstItem = items[0];

  return (
    <div ref={ref} className="p-8 bg-white text-black font-sans">
      {/* Main Lot Sheets */}
      <div className="w-full h-full flex flex-col">
        {items.map((item, index) => (
          <div key={index} className="lot-page" style={{ pageBreakAfter: 'always' }}>
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold tracking-tight">NUMERO DE LOTE</h1>
            </div>
            <div className="grid grid-cols-2 gap-x-8 text-lg mb-8">
                <div></div>
                <p className="text-right"><span className="font-bold">Fecha de Creación:</span> {creationDate}</p>
            </div>
            <div className="flex-grow space-y-6">
                <div className="border-4 border-black p-5 m-2.5 page-break-inside-avoid">
                    <div className="text-center mb-4 border-b-2 border-black pb-2.5">
                        <h2 className="text-3xl font-bold m-0">ORDEN DE COMPRA: {item.orderId}</h2>
                        <h3 className="text-2xl font-medium my-1.5">{item.productName.toUpperCase()}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xl mb-4">
                        <div>
                            <p><span className="font-bold">Proveedor:</span></p>
                            <p>{item.supplierName}</p>
                        </div>
                        <div className="text-right">
                        <p><span className="font-bold">Calibre:</span></p>
                        <p className="text-4xl font-bold">{item.caliberName.toUpperCase()} ({item.caliberCode})</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xl border-t-2 border-black pt-4">
                        <div className="text-center">
                            <p className="font-bold">Total Envases</p>
                            <p className="text-3xl">{item.totalPackages.toLocaleString('es-CL')}</p>
                        </div>
                        <div className="text-center">
                            <p className="font-bold">Total Kilos</p>
                            <p className="text-3xl">{item.totalKilos.toLocaleString('es-CL')} kg</p>
                        </div>
                        <div className="text-center">
                            <p className="font-bold">Peso Promedio</p>
                            <p className="text-3xl">{item.avgWeight.toFixed(2)} kg</p>
                        </div>
                    </div>
                    <div className="text-center mt-4 border-t-2 border-black pt-2">
                        <p className="font-bold text-2xl">LOTE: {item.lotId}</p>
                    </div>
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* Individual Label Sample Page */}
       <div className="w-full flex-col items-center justify-center pt-10 lot-page-boxes hidden print:block">
        <p className='text-center font-bold mb-4'>Muestra de Etiqueta Individual</p>
        {firstItem && (
            <div className="border-2 border-black p-5 w-[350px] font-sans">
                <p className="text-base font-bold m-0">PRODUCTO: {firstItem.productName.toUpperCase()}</p>
                <p className="text-2xl font-bold my-2 text-center">CALIBRE: {firstItem.caliberName} ({firstItem.caliberCode})</p>
                <p className="text-sm mt-4">LOTE: {firstItem.lotId}</p>
            </div>
        )}
      </div>
    </div>
  );
});

LotGenerationContent.displayName = 'LotGenerationContent';
