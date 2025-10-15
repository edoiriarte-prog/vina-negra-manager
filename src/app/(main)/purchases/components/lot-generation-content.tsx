

"use client";

import React from 'react';
import { format } from 'date-fns';
import Barcode from 'react-barcode';

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

type LotGenerationContentProps = {
  lotData: {
    id: string;
    date: string;
    items: LotSelection[];
  };
};

export const LotGenerationContent = React.forwardRef<HTMLDivElement, LotGenerationContentProps>(({ lotData }, ref) => {
  if (!lotData) return null;

  const { id: lotId, date: lotDate, items } = lotData;
  const firstItem = items[0];

  return (
    <div ref={ref} className="p-8 bg-white text-black font-sans">
      {/* Page 1: Main Lot Sheet */}
      <div className="w-full h-full flex flex-col page-break">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight">HOJA DE LOTE</h1>
        </div>
        <div className="grid grid-cols-2 gap-x-8 text-lg mb-8">
          <p><span className="font-bold">Identificador de Lote:</span> {lotId}</p>
          <p className="text-right"><span className="font-bold">Fecha de Creación:</span> {lotDate}</p>
        </div>
        <div className="flex-grow space-y-6">
          {items.map((item, index) => (
            <div key={index} className="border-4 border-black p-5 m-2.5">
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
            </div>
          ))}
        </div>
      </div>

      {/* Page 2: Individual Label Sample */}
       <div className="w-full h-full flex flex-col items-center justify-center pt-10">
        {firstItem && (
            <div className="border-2 border-black p-5 w-[400px]">
                <p className="text-lg font-bold m-0">PRODUCTO: {firstItem.productName.toUpperCase()}</p>
                <p className="text-4xl font-bold my-2.5 text-center">CALIBRE: {firstItem.caliberCode}</p>
                <div className="text-center mt-4">
                  <Barcode value={lotId} height={40} width={2} fontSize={12} />
                </div>
            </div>
        )}
      </div>
    </div>
  );
});

LotGenerationContent.displayName = 'LotGenerationContent';
