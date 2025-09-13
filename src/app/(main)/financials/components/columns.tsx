'use client';

import { ColumnDef } from '@tanstack/react-table';
import { FinancialMovement } from '@/lib/types';
import { MoreHorizontal, ArrowUpDown, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
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
  onEdit: (movement: FinancialMovement) => void;
  onDelete: (movement: FinancialMovement) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);


export const getColumns = ({ onEdit, onDelete }: GetColumnsProps): ColumnDef<FinancialMovement>[] => [
  {
    accessorKey: 'date',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Fecha
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => format(parseISO(row.getValue('date')), 'dd-MM-yyyy', { locale: es })
  },
  {
    accessorKey: 'description',
    header: 'Descripción',
    cell: ({ row }) => <div className="max-w-xs truncate">{row.getValue('description')}</div>,
    filterFn: (row, id, value) => {
        return (row.getValue(id) as string).toLowerCase().includes(value.toLowerCase());
    }
  },
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }) => {
        const type = row.getValue('type') as string;
        const isIncome = type === 'income';
        return (
            <div className='flex items-center gap-2'>
                {isIncome ? <ArrowUpCircle className="h-4 w-4 text-green-500" /> : <ArrowDownCircle className="h-4 w-4 text-red-500" />}
                <span>{isIncome ? 'Ingreso' : 'Egreso'}</span>
            </div>
        )
    }
  },
    {
    accessorKey: 'relatedOrder',
    header: 'Documento Relacionado',
    cell: ({ row }) => {
        const relatedOrder = row.getValue('relatedOrder') as FinancialMovement['relatedOrder'];
        if (!relatedOrder) return '-';
        return <Badge variant="secondary">{relatedOrder.type}-{relatedOrder.id}</Badge>
    }
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => {
        return (
          <div className="text-right">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Monto
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      },
    cell: ({ row }) => <div className='text-right font-medium'>{formatCurrency(row.getValue('amount'))}</div>,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const movement = row.original;

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
            <DropdownMenuItem onClick={() => onEdit(movement)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(movement)}
            >
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
