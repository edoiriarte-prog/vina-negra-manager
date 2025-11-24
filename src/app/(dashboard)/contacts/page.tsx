"use client";

import { useState, useMemo } from "react";
import { 
  Plus, 
  Users, 
  Briefcase, 
  Truck, 
  Search 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "./components/data-table";
import { getColumns } from "./components/columns";
import { NewContactSheet } from "./components/new-contact-sheet";
import { Contact, Interaction } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMasterData } from "@/hooks/use-master-data"; // <-- USAMOS EL HOOK MAESTRO

export default function ContactsPage() {
  // Ahora obtenemos los 'contacts' y 'isLoading' del hook maestro.
  const { contacts: data, isLoading: loading } = useMasterData();
  
  // Nota: Faltan las funciones createContact, updateContact, deleteContact, que deberían 
  // ser pasadas a un nuevo hook CRUD para este módulo.
  // Por ahora, usaremos las funciones placeholder para que la app no falle.
  const createContact = async (contact: Omit<Contact, "id">) => { console.log("PLACEHOLDER: Creating contact", contact); };
  const updateContact = async (id: string, data: Partial<Contact>) => { console.log("PLACEHOLDER: Updating contact", id, data); };
  const deleteContact = async (id: string) => { console.log("PLACEHOLDER: Deleting contact", id); };
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // --- CÁLCULOS DE KPIs ---
  const totalContacts = data.length;
  
  const totalClients = data.filter(c => {
      if (!c.type) return false;
      return Array.isArray(c.type) ? c.type.includes('client') : c.type === 'client';
  }).length;
  
  const totalSuppliers = data.filter(c => {
      if (!c.type) return false;
      return Array.isArray(c.type) ? c.type.includes('supplier') : c.type === 'supplier';
  }).length;

  // --- FILTRADO ---
  const filteredContacts = data.filter((c) => 
    (c.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (c.rut?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (c.email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  // --- MANEJADORES DE CRUD (Usando place-holders por ahora) ---
  const handleCreateNew = () => {
    setEditingContact(null);
    setIsSheetOpen(true);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setIsSheetOpen(true);
  };

  const handleDelete = async (contact: Contact) => {
    if (confirm(`¿Estás seguro de eliminar a ${contact.name} de la base de datos?`)) {
      // Usar la función placeholder de eliminación
      await deleteContact(contact.id); 
    }
  };

  const handleSave = async (contactData: Contact | Omit<Contact, "id">, newInteraction?: Omit<Interaction, "id">) => {
    // Lógica para preparar la data...
    let dataToSave = { ...contactData };
    // ... (omito la lógica compleja de interacciones por ser placeholder)

    if ("id" in contactData) {
      // CASO: ACTUALIZAR
      await updateContact(contactData.id, dataToSave);
    } else {
      // CASO: CREAR
      await createContact(dataToSave as Omit<Contact, "id">);
    }

    setIsSheetOpen(false);
  };

  const handleDeleteInteraction = async (contactId: string, interactionId: string) => {
      console.log(`PLACEHOLDER: Deleting interaction ${interactionId} from ${contactId}`);
      // Lógica placeholder para eliminar interacción
  };

  const columns = useMemo(() => getColumns({
      onEdit: handleEdit,
      onDelete: handleDelete
  }), [handleEdit, handleDelete]);

  const cardClass = "bg-slate-900 border-slate-800 shadow-sm hover:border-slate-700 transition-all";

  // Estado de carga visual
  if (loading) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-slate-400">
            <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p>Conectando con la nube...</p>
            </div>
        </div>
      );
  }

  return (
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-slate-100">
      
      {/* --- HEADER & ACCIONES --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Directorio de Contactos</h2>
          <p className="text-slate-400 mt-1">
            Gestión centralizada de clientes, proveedores y socios de Viña Negra.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 font-semibold">
            <Plus className="mr-2 h-4 w-4" /> Agregar Contacto
          </Button>
        </div>
      </div>

      {/* --- KPIs RESUMEN --- */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={cardClass}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Total Directorio</p>
              <h3 className="text-2xl font-bold text-white">{totalContacts}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Briefcase className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Clientes Activos</p>
              <h3 className="text-2xl font-bold text-white">{totalClients}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Truck className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Proveedores</p>
              <h3 className="text-2xl font-bold text-white">{totalSuppliers}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- BUSCADOR Y TABLA --- */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 w-full max-w-md transition-all focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20">
            <Search className="h-4 w-4 text-slate-500 ml-2" />
            <Input 
                placeholder="Buscar por nombre, RUT o email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-none bg-transparent focus-visible:ring-0 text-slate-200 placeholder:text-slate-600 h-8"
            />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg p-1">
           <DataTable columns={columns} data={filteredContacts} />
        </div>
      </div>

      {/* --- FORMULARIO LATERAL --- */}
      <NewContactSheet
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        contact={editingContact}
        onSave={handleSave}
        onDeleteInteraction={handleDeleteInteraction}
      />
    </div>
  );
}