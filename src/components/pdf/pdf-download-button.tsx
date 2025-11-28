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
    type: 'VENTA' | 'COMPRA';
    fileName: string;
}

export function PDFDownloadButton({ order, clientName, clientRut, type, fileName }: PDFDownloadButtonProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) return <Button disabled variant="outline"><Loader2 className="h-4 w-4 animate-spin"/></Button>;

    return (
        <PDFDownloadLink
            document={<OrderDocument order={order} clientName={clientName} clientRut={clientRut} type={type} />}
            fileName={fileName}
        >
            {({ loading }) => (
                <Button variant="outline" disabled={loading} className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {loading ? 'Generando...' : 'Descargar PDF'}
                </Button>
            )}
        </PDFDownloadLink>
    );
}