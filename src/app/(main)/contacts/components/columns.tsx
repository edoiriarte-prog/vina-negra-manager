'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Contact } from '@/lib/types';
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

type GetColumnsProps = {
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
}

export const getColumns = ({ onEdit, onDelete }: GetColumnsProps): ColumnDef<Contact>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Nombre
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>
  },
  {
    accessorKey: 'rut',
    header: 'RUT',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'contactPerson',
    header: 'Persona de Contacto',
  },
  {
    accessorKey: 'commune',
    header: 'Comuna',
  },
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }) => {
        const type = row.getValue('type') as string;
        const variant = type === 'client' ? 'default' : 'secondary';
        return <Badge variant={variant}>{type === 'client' ? 'Cliente' : 'Proveedor'}</Badge>
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const contact = row.original;

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
            <DropdownMenuItem onClick={() => onEdit(contact)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(contact.email)}
            >
              Copiar Email
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(contact)}
            >
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
