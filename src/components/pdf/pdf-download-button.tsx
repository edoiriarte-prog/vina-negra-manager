"use client";

import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { OrderDocument } from './order-document';
import { useEffect, useState } from 'react';

interface PDFDownloadButtonProps {
    order: any;
    clientName: string;
    clientRut?: string;
    clientAddress?: string; // Agregamos la dirección del cliente como opcional
    type: 'VENTA' | 'COMPRA';
    fileName: string;
}

export function PDFDownloadButton({ order, clientName, clientRut, clientAddress, type, fileName }: PDFDownloadButtonProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return (
            <Button disabled variant="outline" className="gap-2">
                <Loader2 className="h-4 w-4 animate-spin"/>
                Cargando...
            </Button>
        );
    }

    return (
        <PDFDownloadLink
            document={<OrderDocument order={order} clientName={clientName} clientRut={clientRut} clientAddress={clientAddress} type={type} />}
            fileName={fileName}
        >
            {({ loading }) => (
                <Button variant="default" disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {loading ? 'Generando...' : 'Descargar PDF'}
                </Button>
            )}
        </PDFDownloadLink>
    );
}
