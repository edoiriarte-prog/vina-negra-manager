"use client"

import { ColumnDef } from "@tanstack/react-table"
import { PurchaseOrder } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Edit, Trash, Eye } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ColumnsProps {
  onEdit: (order: PurchaseOrder) => void;
  onDelete: (order: PurchaseOrder) => void;
  onPreview: (order: PurchaseOrder) => void;
  suppliers: any[];
}

export const getColumns = ({ onEdit, onDelete, onPreview, suppliers }: ColumnsProps): ColumnDef<PurchaseOrder>[] => [
  {
    accessorKey: "id",
    header: "Orden #",
  },
  {
    accessorKey: "date",
    header: "Fecha",
    cell: ({ row }) => {
        try {
            return new Date(row.original.date).toLocaleDateString();
        } catch (e) { return row.original.date }
    }
  },
  {
    accessorKey: "supplierId",
    header: "Proveedor",
    cell: ({ row }) => {
      const supplier = suppliers.find(s => s.id === row.original.supplierId);
      return supplier ? supplier.name : "Desconocido";
    }
  },
  {
    accessorKey: "status",
    header: "Estado",
  },
  {
    accessorKey: "totalAmount",
    header: "Total",
    cell: ({ row }) => `$${new Intl.NumberFormat('es-CL').format(row.original.totalAmount || 0)}`,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const order = row.original
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
              <Eye className="mr-2 h-4 w-4" /> Ver Detalle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(order)}>
              <Edit className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(order)} className="text-red-600">
              <Trash className="mr-2 h-4 w-4" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]