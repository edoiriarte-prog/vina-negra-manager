'use client';

import { ColumnDef } from '@tanstack/react-table';
import { PurchaseOrder, Contact } from '@/lib/types';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';

type GetColumnsProps = {
  onEdit: (order: PurchaseOrder) => void;
  onDelete: (order: PurchaseOrder) => void;
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

export const getColumns = ({ onEdit, onDelete, suppliers }: GetColumnsProps): ColumnDef<PurchaseOrder>[] => [
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
    cell: ({ row }) => format(parseISO(row.getValue('date')), 'dd-MM-yyyy')
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
    accessorKey: 'totalKilos',
    header: 'Kilos Totales',
    cell: ({ row }) => formatKilos(row.getValue('totalKilos')),
  },
  {
    accessorKey: 'totalAmount',
    header: 'Monto Total',
    cell: ({ row }) => formatCurrency(row.getValue('totalAmount')),
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
  {
    id: 'actions',
    cell: ({ row }) => {
      const order = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(order)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(order)}
            >
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
