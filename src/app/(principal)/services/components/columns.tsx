
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ServiceOrder } from '@/lib/types';
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
import { es } from 'date-fns/locale';

type GetColumnsProps = {
  onEdit: (order: ServiceOrder) => void;
  onDelete: (order: ServiceOrder) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);


export const getColumns = ({ onEdit, onDelete }: GetColumnsProps): ColumnDef<ServiceOrder>[] => [
  {
    accessorKey: 'id',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          O/S
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
    accessorKey: 'provider',
    header: 'Proveedor',
     filterFn: (row, id, value) => {
      return (row.getValue(id) as string).toLowerCase().includes(value.toLowerCase());
    }
  },
    {
    accessorKey: 'serviceType',
    header: 'Tipo de Servicio',
  },
  {
    accessorKey: 'cost',
    header: ({ column }) => {
        return (
          <div className="text-right">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Costo
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      },
    cell: ({ row }) => <div className='text-right font-medium'>{formatCurrency(row.getValue('cost'))}</div>,
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
