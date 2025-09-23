'use client';

import { ColumnDef } from '@tanstack/react-table';
import { PurchaseOrder, Contact } from '@/lib/types';
import { MoreHorizontal, ArrowUpDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

type GetColumnsProps = {
  onEdit: (order: PurchaseOrder) => void;
  onDelete: (order: PurchaseOrder) => void;
  onPreview: (order: PurchaseOrder) => void;
  suppliers: Contact[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

const formatKilos = (value: number) =>
    `${new Intl.NumberFormat('es-CL').format(value)} kg`;


export const getColumns = ({ suppliers }: GetColumnsProps): ColumnDef<PurchaseOrder>[] => [
  {
    accessorKey: 'id',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          O/C
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue('id')}</div>
  },
  {
    accessorKey: 'date',
    header: 'Fecha',
    cell: ({ row }) => format(parseISO(row.getValue('date')), 'dd-MM-yyyy', { locale: es })
  },
  {
    accessorKey: 'supplierId',
    header: 'Proveedor',
    cell: ({ row }) => {
        const supplierId = row.getValue('supplierId') as string;
        const supplier = suppliers.find(s => s.id === supplierId);
        return supplier ? supplier.name : 'Desconocido';
    },
    filterFn: (row, id, value) => {
      const supplier = suppliers.find(s => s.id === row.original.supplierId);
      return supplier ? supplier.name.toLowerCase().includes(value.toLowerCase()) : false;
    }
  },
  {
    accessorKey: 'warehouse',
    header: 'Bodega',
  },
  {
    accessorKey: 'totalKilos',
    header: ({ column }) => {
        return (
          <div className="text-right">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Kilos Totales
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      },
    cell: ({ row }) => <div className='text-right'>{formatKilos(row.getValue('totalKilos'))}</div>,
  },
  {
    accessorKey: 'totalAmount',
    header: ({ column }) => {
        return (
          <div className="text-right">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Monto Total
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      },
    cell: ({ row }) => <div className='text-right'>{formatCurrency(row.getValue('totalAmount'))}</div>,
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const variant = status === 'completed' ? 'default' : status === 'pending' ? 'secondary' : 'destructive';
        const text = status === 'completed' ? 'Completada' : status === 'pending' ? 'Pendiente' : 'Cancelada';
        return <Badge variant={variant}>{text}</Badge>
    }
  },
];
