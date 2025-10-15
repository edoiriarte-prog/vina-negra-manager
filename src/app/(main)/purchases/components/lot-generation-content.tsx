
"use client";

import React from 'react';
import { format } from 'date-fns';

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
            <div key={index} style={{ border: '4px solid black', padding: '20px', margin: '10px' }}>
                <div style={{textAlign: 'center', marginBottom: '15px', borderBottom: '2px solid black', paddingBottom: '10px'}}>
                    <h2 style={{ fontSize: '28px', margin: '0', fontWeight: 'bold' }}>ORDEN DE COMPRA: {item.orderId}</h2>
                    <h3 style={{ fontSize: '22px', margin: '5px 0' }}>PRODUCTO: {item.productName.toUpperCase()}</h3>
                </div>
                <div style={{textAlign: 'center', marginBottom: '15px' }}>
                    <h1 style={{ fontSize: '48px', margin: '0', fontWeight: 'bold' }}>CALIBRE: {item.caliberName.toUpperCase()} ({item.caliberCode})</h1>
                </div>
                 <div className="grid grid-cols-2 gap-4 text-lg">
                    <p><span className="font-bold">Proveedor:</span> {item.supplierName}</p>
                    <p><span className="font-bold">Total Envases:</span> {item.totalPackages.toLocaleString('es-CL')}</p>
                    <p><span className="font-bold">Total Kilos:</span> {item.totalKilos.toLocaleString('es-CL')} kg</p>
                    <p><span className="font-bold">Peso Promedio:</span> {item.avgWeight.toFixed(2)} kg</p>
                </div>
            </div>
          ))}
        </div>
      </div>

      {/* Page 2: Individual Label Sample */}
       <div className="w-full h-full flex flex-col items-center justify-center">
        {firstItem && (
            <div style={{ border: '2px solid black', padding: '20px', width: '400px', fontFamily: 'Arial, sans-serif' }}>
                <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '0' }}>PRODUCTO: {firstItem.productName.toUpperCase()}</p>
                <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '10px 0', textAlign: 'center' }}>CALIBRE: {firstItem.caliberCode}</p>
                <p style={{ fontSize: '16px', margin: '20px 0 0 0' }}>LOTE: {lotId}</p>
            </div>
        )}
      </div>
    </div>
  );
});

LotGenerationContent.displayName = 'LotGenerationContent';
