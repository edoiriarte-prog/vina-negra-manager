
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { InventoryAdjustment } from '@/lib/types';
import { MoreHorizontal, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

type GetColumnsProps = {
  onEdit: (adjustment: InventoryAdjustment) => void;
  onDelete: (adjustment: InventoryAdjustment) => void;
}

const formatKilos = (value: number) => new Intl.NumberFormat('es-CL').format(value) + ' kg';

export const getColumns = ({ onEdit, onDelete }: GetColumnsProps): ColumnDef<InventoryAdjustment>[] => [
  {
    accessorKey: 'date',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Fecha <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => format(parseISO(row.getValue('date')), 'dd-MM-yyyy', { locale: es })
  },
  {
    accessorKey: 'product',
    header: 'Producto',
  },
  {
    accessorKey: 'caliber',
    header: 'Calibre',
  },
    {
    accessorKey: 'warehouse',
    header: 'Bodega',
  },
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }) => {
      const type = row.getValue('type') as string;
      const isIncrease = type === 'increase';
      return (
        <div className='flex items-center gap-2'>
          {isIncrease ? <ArrowUp className="h-4 w-4 text-green-500" /> : <ArrowDown className="h-4 w-4 text-red-500" />}
          <span>{isIncrease ? 'Aumento' : 'Disminución'}</span>
        </div>
      );
    }
  },
  {
    accessorKey: 'quantity',
    header: ({ column }) => (
      <div className="text-right">
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Cantidad <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => <div className='text-right font-medium'>{formatKilos(row.getValue('quantity'))}</div>,
  },
  {
    accessorKey: 'reason',
    header: 'Motivo',
    cell: ({ row }) => <div className="max-w-xs truncate">{row.getValue('reason')}</div>,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const adjustment = row.original;
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
            <DropdownMenuItem onClick={() => onEdit(adjustment)}>Editar</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(adjustment)}>
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
