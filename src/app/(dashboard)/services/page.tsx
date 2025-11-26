"use client";

import { useState, useMemo } from "react";
import { ServiceOrder, Contact } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Trash2, Wrench } from "lucide-react";
import { useOperations } from "@/hooks/use-operations"; 
import { useMasterData } from "@/hooks/use-master-data";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";

// Helper
const formatCurrency = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);

export default function ServicesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  // 1. Datos de la Nube
  const { serviceOrders, isLoading: loadingOps } = useOperations();
  const { contacts, isLoading: loadingMaster } = useMasterData();
  
  const [searchTerm, setSearchTerm] = useState("");
  const isLoading = loadingOps || loadingMaster;

  const filteredServices = serviceOrders.filter(s => {
      const supplier = contacts.find(c => c.id === s.supplierId)?.name || '';
      return supplier.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleDelete = async (id: string) => {
      if (!firestore) return;
      if (confirm("¿Eliminar este servicio?")) {
          await deleteDocumentNonBlocking(doc(firestore, 'serviceOrders', id));
          toast({ variant: "destructive", title: "Eliminado", description: "Servicio eliminado." });
      }
  }

  // TODO: Aquí deberías conectar tu NewServiceOrderSheet real si lo tienes listo.
  // Por ahora, dejamos el botón preparado.
  const handleCreate = () => {
      toast({ title: "Próximamente", description: "El formulario de servicios se está implementando." });
  };

  if (isLoading) return <div className="p-8"><Skeleton className="h-12 w-1/3 mb-4"/><Skeleton className="h-96 w-full"/></div>;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-slate-950 min-h-screen text-slate-100">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Gestión de Servicios (O/S)</h2>
            <p className="text-slate-400 mt-1">Control de contratos, fletes y servicios externos.</p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 font-semibold">
            <Plus className="mr-2 h-4 w-4" /> Nuevo Servicio
        </Button>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
            <div className="relative max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                    placeholder="Buscar por proveedor o ID..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-slate-950 border-slate-800 text-slate-100"
                />
            </div>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border border-slate-800 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-950">
                        <TableRow className="border-slate-800 hover:bg-slate-900">
                            <TableHead className="text-slate-400">ID Servicio</TableHead>
                            <TableHead className="text-slate-400">Fecha</TableHead>
                            <TableHead className="text-slate-400">Proveedor</TableHead>
                            <TableHead className="text-right text-slate-400">Costo Total</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredServices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                                    <Wrench className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                    No hay servicios registrados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredServices.map(service => {
                                const supplier = contacts.find(c => c.id === service.supplierId)?.name || 'Desconocido';
                                return (
                                    <TableRow key={service.id} className="border-slate-800 hover:bg-slate-800/50">
                                        <TableCell className="font-medium text-white">{service.id}</TableCell>
                                        <TableCell className="text-slate-300">{format(parseISO(service.date), 'dd MMM yyyy', { locale: es })}</TableCell>
                                        <TableCell className="text-slate-300">{supplier}</TableCell>
                                        <TableCell className="text-right font-mono text-emerald-400">{formatCurrency(service.cost)}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(service.id)} className="h-8 w-8 text-slate-500 hover:text-red-400">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}