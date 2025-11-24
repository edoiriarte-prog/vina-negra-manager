"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Contact, ContactType } from "@/lib/types"

// Usamos Record<string, string> para evitar errores si falta algún tipo en el futuro
const typeLabels: Record<string, string> = {
  client: 'Cliente',
  supplier: 'Proveedor',
  other_income: 'Otros Ingresos',
  other_expense: 'Otros Egresos',
}

const typeColors: Record<string, string> = {
  client: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  supplier: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
  other_income: 'bg-green-100 text-green-800 hover:bg-green-200',
  other_expense: 'bg-red-100 text-red-800 hover:bg-red-200',
}

interface GetColumnsProps {
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
}

export function getColumns({ onEdit, onDelete }: GetColumnsProps): ColumnDef<Contact>[] {
  return [
    {
      accessorKey: "rut",
      header: "RUT",
      cell: ({ row }) => <div className="font-mono text-xs">{row.getValue("rut")}</div>,
    },
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Razón Social / Nombre
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <div className="text-sm text-muted-foreground">{row.getValue("email")}</div>,
    },
    {
      accessorKey: "type",
      header: "Relación",
      cell: ({ row }) => {
        const rawType = row.getValue("type");
        // Manejo seguro: convertir a array si es string, o array vacío si es null/undefined
        const types: string[] = Array.isArray(rawType) 
            ? rawType 
            : (typeof rawType === 'string' ? [rawType] : []);

        return (
          <div className="flex flex-wrap gap-1">
            {types.map((t) => (
              <Badge key={t} className={`font-normal border-0 ${typeColors[t] || 'bg-slate-100 text-slate-700'}`}>
                {typeLabels[t] || t}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      accessorKey: "tags",
      header: "Etiquetas",
      cell: ({ row }) => {
        const tags = (row.getValue("tags") as string[]) || []
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 2 && (
              <span className="text-xs text-muted-foreground">+{tags.length - 2}</span>
            )}
          </div>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const contact = row.original
   
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
              <DropdownMenuItem 
                  onClick={() => navigator.clipboard.writeText(contact.rut)}
              >
                Copiar RUT
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* AQUÍ CONECTAMOS LA FUNCIÓN DE EDITAR */}
              <DropdownMenuItem onClick={() => onEdit(contact)}>
                  <Edit className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              {/* AQUÍ CONECTAMOS LA FUNCIÓN DE ELIMINAR */}
              <DropdownMenuItem onClick={() => onDelete(contact)} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}