
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SalesOrder, Contact } from '@/lib/types';
import { Logo } from '@/components/logo';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Printer, Download } from 'lucide-react';
import Barcode from 'react-barcode';
import * as XLSX from 'xlsx';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter,
  } from '@/components/ui/table';

type SalesOrderPreviewProps = {
  order: SalesOrder;
  client: Contact | null;
  carrier: Contact | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

export function SalesOrderPreview({ order, client, carrier, isOpen, onOpenChange }: SalesOrderPreviewProps) {
  
  const totalPackaging = order.items.reduce((sum, item) => sum + (item.packagingQuantity || 0), 0);

  const handlePrint = () => {
    const printContents = document.getElementById('print-area-sales')?.innerHTML;
    if (printContents) {
      const printWindow = window.open('', '', 'height=800,width=800');
      printWindow?.document.write('<html><head><title>Imprimir Orden de Venta</title>');
      const styles = Array.from(document.styleSheets)
        .map(s => s.href ? `<link rel="stylesheet" href="${s.href}">` : '')
        .join('');
      printWindow?.document.write(styles);
      printWindow?.document.write(`
        <style>
          @media print {
            .page-break {
              page-break-before: always;
            }
          }
        </style>
      `);
      printWindow?.document.write('</head><body>');
      printWindow?.document.write(printContents);
      printWindow?.document.write('</body></html>');
      printWindow?.document.close();
      printWindow?.focus();
      setTimeout(() => { 
        printWindow?.print();
        printWindow?.close();
      }, 500);

    }
  }

  const handleExport = () => {
    const dataForSheet = order.items.map(item => ({
      'O/V': order.id,
      'Fecha': format(parseISO(order.date), "dd-MM-yyyy"),
      'Cliente': client?.name,
      'Producto': item.product,
      'Calibre': item.caliber,
      'Tipo Envase': item.packagingType,
      'Cant. Envase': item.packagingQuantity,
      'Cantidad (kg)': item.quantity,
      'Lote': item.lotNumber,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Packing List');
    XLSX.writeFile(workbook, `PackingList-${order.id}.xlsx`);
  };

  const advanceAmount = order.paymentMethod === 'Pago con Anticipo y Saldo' ? order.totalAmount * ((order.advancePercentage || 0) / 100) : 0;
  const balanceAmount = order.paymentMethod === 'Pago con Anticipo y Saldo' ? order.totalAmount - advanceAmount : 0;
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <div id="print-area-sales">
          {/* Page 1: Commercial Invoice */}
          <div>
            <DialogHeader className="space-y-0">
              <div className="flex items-center justify-between mb-8">
                <Logo />
                <div className='text-right'>
                  <DialogTitle className="text-2xl font-bold font-headline mb-1">ORDEN DE VENTA</DialogTitle>
                  <p className="text-muted-foreground font-mono">{order.id}</p>
                </div>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold mb-2">Cliente</h3>
                <div className="text-sm text-muted-foreground">
                  <p className="font-bold text-foreground">{client?.name}</p>
                  <p>RUT: {client?.rut}</p>
                  <p>{client?.address}</p>
                  <p>{client?.commune}</p>
                  <p>{client?.email}</p>
                </div>
              </div>
              <div className='text-right'>
                <h3 className="font-semibold mb-2">Detalles de la Orden</h3>
                <div className="text-sm text-muted-foreground">
                  <p><strong>Fecha Emisión:</strong> {format(parseISO(order.date), "PPP", { locale: es })}</p>
                  <p><strong>Estado:</strong> <span className='capitalize'>{order.status}</span></p>
                  <p><strong>Modalidad de Pago:</strong> {order.paymentMethod}</p>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Calibre</TableHead>
                  <TableHead>Envase</TableHead>
                  <TableHead className="text-right">Cant. Envase</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio Unitario</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product}</TableCell>
                    <TableCell>{item.caliber}</TableCell>
                    <TableCell>{item.packagingType}</TableCell>
                    <TableCell className="text-right">{item.packagingQuantity?.toLocaleString('es-CL')}</TableCell>
                    <TableCell className="text-right">{item.quantity.toLocaleString('es-CL')} {item.unit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.quantity * item.price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                  <TableRow>
                      <TableCell colSpan={3} className="text-right font-bold">Totales</TableCell>
                      <TableCell className="text-right font-bold">{totalPackaging.toLocaleString('es-CL')}</TableCell>
                      <TableCell className="text-right font-bold">{order.totalKilos.toLocaleString('es-CL')} kg</TableCell>
                      <TableCell className="text-right font-bold text-lg" colSpan={1}>Total</TableCell>
                      <TableCell className="text-right font-bold text-lg">{formatCurrency(order.totalAmount)}</TableCell>
                  </TableRow>
              </TableFooter>
            </Table>

            <Separator className="my-4" />

            <div className="grid grid-cols-2 gap-8 mt-8">
              <div className="text-xs text-muted-foreground">
                  <p><strong>Observaciones:</strong></p>
                  <p>1. La presente orden de venta es válida por 30 días.</p>
                  <p>2. Para cualquier consulta, contactar a nuestro departamento de ventas.</p>
              </div>
              {order.paymentMethod === 'Pago con Anticipo y Saldo' && (
                  <div>
                      <h3 className="font-semibold mb-2">Condiciones de Pago</h3>
                      <div className="text-sm text-muted-foreground border rounded-lg p-3">
                          <div className="flex justify-between">
                              <p>Anticipo ({order.advancePercentage}%)</p>
                              <p className="font-medium text-foreground">{formatCurrency(advanceAmount)}</p>
                          </div>
                          <p className="text-xs">Vencimiento: {order.advanceDueDate ? format(parseISO(order.advanceDueDate), 'dd-MM-yyyy') : '-'}</p>
                          <Separator className="my-2" />
                          <div className="flex justify-between">
                              <p>Saldo</p>
                              <p className="font-medium text-foreground">{formatCurrency(balanceAmount)}</p>
                          </div>
                          <p className="text-xs">Vencimiento: {order.balanceDueDate ? format(parseISO(order.balanceDueDate), 'dd-MM-yyyy') : '-'}</p>
                      </div>
                  </div>
              )}
            </div>
          </div>
          
          {/* Page 2: Dispatch Guide / Picking Ticket */}
          <div className="page-break">
            <DialogHeader className="space-y-0">
                <div className="flex items-center justify-between mb-8">
                <Logo />
                <div className='text-right'>
                    <DialogTitle className="text-2xl font-bold font-headline mb-1">GUÍA DE DESPACHO</DialogTitle>
                    <p className="text-muted-foreground font-mono">{order.id}</p>
                </div>
                </div>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                <h3 className="font-semibold mb-2">Cliente</h3>
                <div className="text-sm text-muted-foreground">
                    <p className="font-bold text-foreground">{client?.name}</p>
                    <p>RUT: {client?.rut}</p>
                    <p>{client?.address}</p>
                    <p>{client?.commune}</p>
                </div>
                </div>
                 <div className='text-right'>
                    <h3 className="font-semibold mb-2">Viña Negra SpA</h3>
                    <div className="text-sm text-muted-foreground">
                        <p>RUT: 76.xxx.xxx-x</p>
                        <p>Fundo Viña Negra</p>
                        <p>Santa Cruz, Chile</p>
                    </div>
                </div>
            </div>

            <Separator className="my-4" />

            <h3 className="font-semibold mb-4 text-center">Detalle de Lotes a Despachar</h3>

            {order.items.map((item) => {
              if (!item.lotNumber) return null;

              return (
                <div key={`${item.id}-dispatch`} className="border rounded-lg p-4 mb-4 flex items-center justify-between">
                  <div>
                    <p><strong>Lote:</strong> {item.lotNumber}</p>
                    <p><strong>Producto:</strong> {item.product} - {item.caliber}</p>
                    <p><strong>Cantidad:</strong> {item.quantity} {item.unit}</p>
                  </div>
                  <div className="text-center">
                    <Barcode 
                      value={item.lotNumber} 
                      width={1.5} 
                      height={50} 
                      fontSize={12}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter className="mt-8">
           <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar a Excel
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <DialogClose asChild>
            <Button type="button">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
