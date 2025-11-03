
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { SalesOrder, Contact } from '@/lib/types';
import { MoreHorizontal, ArrowUpDown, Edit, Trash2, Eye } from 'lucide-react';
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
  onEdit: (order: SalesOrder) => void;
  onDelete: (order: SalesOrder) => void;
  onPreview: (order: SalesOrder) => void;
  clients: Contact[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

const formatKilos = (value: number) =>
    `${new Intl.NumberFormat('es-CL').format(value)} kg`;
    
const formatPackages = (value: number) =>
    `${new Intl.NumberFormat('es-CL').format(value)}`;


export const getColumns = ({ onEdit, onDelete, onPreview, clients }: GetColumnsProps): ColumnDef<SalesOrder>[] => [
  {
    accessorKey: 'id',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          O/V
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
    accessorKey: 'clientId',
    header: 'Cliente',
    cell: ({ row }) => {
        const clientId = row.getValue('clientId') as string;
        const client = clients.find(s => s.id === clientId);
        return client ? client.name : 'Desconocido';
    },
    filterFn: (row, id, value) => {
      const client = clients.find(s => s.id === row.original.clientId);
      return client ? client.name.toLowerCase().includes(value.toLowerCase()) : false;
    }
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
    accessorKey: 'totalKilos',
    header: ({ column }) => {
        return (
          <div className="text-right">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Total Kilos
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      },
    cell: ({ row }) => <div className='text-right'>{formatKilos(row.getValue('totalKilos'))}</div>,
  },
   {
    accessorKey: 'paymentStatus',
    header: 'Estado Pago',
    cell: ({ row }) => {
        const status = row.getValue('paymentStatus') as string;
        const variant = status === 'Pagado' ? 'default' : status === 'Abonado' ? 'secondary' : 'destructive';
        return <Badge variant={variant}>{status || 'Pendiente'}</Badge>
    }
  },
  {
    accessorKey: 'status',
    header: 'Estado Orden',
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
            <DropdownMenuItem onClick={() => onPreview(order)}>
              <Eye className='mr-2 h-4 w-4' />
              Visualizar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(order)}>
              <Edit className='mr-2 h-4 w-4' />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(order)}
            >
              <Trash2 className='mr-2 h-4 w-4' />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
