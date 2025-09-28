
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { FinancialMovement, BankAccount } from '@/lib/types';
import { MoreHorizontal, ArrowUpDown, ArrowDownCircle, ArrowUpCircle, ArrowRightCircle } from 'lucide-react';
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
  bankAccounts: BankAccount[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);


export const getColumns = ({ onEdit, onDelete, bankAccounts }: GetColumnsProps): ColumnDef<FinancialMovement & { contactName?: string }>[] => [
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
    header: 'Centro de Costo',
    cell: ({ row }) => <div className="max-w-xs truncate">{row.getValue('description')}</div>,
    filterFn: (row, id, value) => {
        return (row.getValue(id) as string).toLowerCase().includes(value.toLowerCase());
    }
  },
    {
    accessorKey: 'contactName',
    header: 'Contacto Asociado',
    cell: ({ row }) => row.getValue('contactName') || '-',
    filterFn: (row, id, value) => {
        const contactName = row.getValue(id) as string;
        return contactName ? contactName.toLowerCase().includes(value.toLowerCase()) : false;
    }
  },
  {
    accessorKey: 'relatedDocument',
    header: 'Doc. Ref.',
    cell: ({ row }) => {
        const relatedDocument = row.getValue('relatedDocument') as FinancialMovement['relatedDocument'];
        if (!relatedDocument) return '-';
        return <Badge variant="secondary">{relatedDocument.type}-{relatedDocument.id}</Badge>
    }
  },
  {
    accessorKey: 'paymentMethod',
    header: 'Forma de Pago',
  },
  {
    accessorKey: 'sourceAccountId',
    header: 'Cuenta Origen/Destino',
    cell: ({ row }) => {
        const movement = row.original;
        const source = bankAccounts.find(acc => acc.id === movement.sourceAccountId);
        const destination = bankAccounts.find(acc => acc.id === movement.destinationAccountId);

        if (movement.type === 'transfer') {
            return <span className='flex items-center gap-1 text-xs'>{source?.name} <ArrowRightCircle className='h-3 w-3'/> {destination?.name}</span>
        }
        return source?.name || destination?.name || 'N/A'
    },
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
    cell: ({ row }) => {
        const type = row.original.type;
        let icon;
        if (type === 'income') icon = <ArrowUpCircle className="h-4 w-4 text-green-500" />;
        else if (type === 'expense') icon = <ArrowDownCircle className="h-4 w-4 text-red-500" />;
        else icon = <ArrowRightCircle className="h-4 w-4 text-blue-500" />;

        return (
            <div className='text-right font-medium flex items-center justify-end gap-2'>
                {icon}
                <span>{formatCurrency(row.getValue('amount'))}</span>
            </div>
        )
    },
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

    