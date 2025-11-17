
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Contact, ContactType } from '@/lib/types';
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

const typeVariantMap: Record<ContactType, "default" | "secondary" | "destructive" | "outline"> = {
    client: 'default',
    supplier: 'secondary',
    other_income: 'default',
    other_expense: 'destructive',
};
const typeLabelMap: Record<ContactType, string> = {
    client: 'Cliente',
    supplier: 'Proveedor',
    other_income: 'Otros Ingresos',
    other_expense: 'Otros Egresos',
};


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
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }) => {
        const types = row.getValue('type') as ContactType[] | ContactType;
        const typeArray = Array.isArray(types) ? types : (types === 'both' ? ['client', 'supplier'] : [types]);
        
        if (!typeArray || typeArray.length === 0) return 'N/A';

        return (
            <div className="flex flex-wrap gap-1">
                {typeArray.map(type => {
                    const variant = typeVariantMap[type] || "outline";
                    const text = typeLabelMap[type] || 'N/A';
                    return <Badge key={type} variant={variant}>{text}</Badge>
                })}
            </div>
        )
    }
  },
   {
    accessorKey: 'tags',
    header: 'Etiquetas',
    cell: ({ row }) => {
      const tags = row.getValue('tags') as string[];
      if (!tags || tags.length === 0) return null;
      return (
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => (
            <Badge key={tag} variant="outline">{tag}</Badge>
          ))}
        </div>
      );
    },
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
