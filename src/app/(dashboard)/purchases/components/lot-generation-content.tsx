import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function LotGenerationContent({ lotData }: { lotData: any }) {
  if (!lotData || !lotData.items) return <div>No hay datos para previsualizar.</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Vista Previa de Lotes Generados</h3>
      <div className="grid gap-4">
        {lotData.items.map((item: any, index: number) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-sm font-mono">{item.lotId}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Producto: {item.productName}</p>
              <p>Kilos: {item.totalKilos}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}