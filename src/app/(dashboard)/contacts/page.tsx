
"use client";

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "./components/data-table";
import { getColumns } from "./components/columns";
import { NewContactSheet } from "./components/new-contact-sheet";
import { Contact, Interaction } from "@/lib/types";
import { useMasterData } from "@/hooks/use-master-data"; // <--- USAMOS EL HOOK CENTRALIZADO
import { Skeleton } from "@/components/ui/skeleton";
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function ContactsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  // 1. CARGAR DATOS (Ahora usamos useMasterData que ya tiene los contactos en la nube)
  const { contacts, isLoading } = useMasterData();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // --- HANDLERS CRUD (Directos a Firebase) ---

  const handleCreateNew = () => {
    setEditingContact(null);
    setIsSheetOpen(true);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setIsSheetOpen(true);
  };

  const handleDelete = async (contact: Contact) => {
    if (!firestore) return;
    if (confirm(`¿Estás seguro de eliminar a ${contact.name}?`)) {
        await deleteDocumentNonBlocking(doc(firestore, 'contacts', contact.id));
        toast({ variant: "destructive", title: "Contacto Eliminado", description: `${contact.name} ha sido borrado.` });
    }
  };

  const handleSave = (contactData: Contact | Omit<Contact, "id">, newInteraction?: Omit<Interaction, "id">) => {
    if (!firestore) return;

    // Preparar la interacción si existe
    let updatedInteractions = (contactData as Contact).interactions || [];
    if (newInteraction) {
        const interactionToAdd: Interaction = {
            ...newInteraction,
            id: Math.random().toString(36).substr(2, 9)
        };
        updatedInteractions = [interactionToAdd, ...updatedInteractions];
    }

    const finalData = {
        ...contactData,
        interactions: updatedInteractions
    };

    if ('id' in contactData) {
        // Edición
        updateDocumentNonBlocking(doc(firestore, 'contacts', contactData.id), finalData);
        toast({ title: "Contacto Actualizado", description: "Cambios guardados correctamente." });
    } else {
        // Creación
        addDocumentNonBlocking(collection(firestore, 'contacts'), finalData);
        toast({ title: "Contacto Creado", description: `${contactData.name} ha sido agregado.` });
    }

    setIsSheetOpen(false);
  };

  const handleDeleteInteraction = async (contactId: string, interactionId: string) => {
      if (!firestore) return;
      const contact = contacts.find(c => c.id === contactId);
      if (!contact) return;

      const newInteractions = (contact.interactions || []).filter(i => i.id !== interactionId);
      
      await updateDocumentNonBlocking(doc(firestore, 'contacts', contactId), { interactions: newInteractions });
      toast({ title: "Interacción eliminada" });
  };

  const columns = useMemo(() => getColumns({
      onEdit: handleEdit,
      onDelete: handleDelete
  }), []);

  if (isLoading) {
    return (
        <div className="p-8 space-y-4">
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-96 w-full" />
        </div>
    )
  }

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex bg-slate-950 min-h-screen text-slate-100">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Directorio de Contactos</h2>
          <p className="text-slate-400 mt-1">
            Gestión centralizada de clientes, proveedores y socios.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-500 text-white">
            <Plus className="mr-2 h-4 w-4" /> Agregar Contacto
          </Button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-md border border-slate-800 shadow-sm overflow-hidden">
         <DataTable columns={columns} data={contacts} />
      </div>

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
