
"use client";

import { useState, useMemo } from 'react';
import { useCollection, useFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { Contact, Interaction } from '@/lib/types';
import { getColumns } from './components/columns';
import { DataTable } from './components/data-table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { NewContactSheet } from './components/new-contact-sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, doc } from 'firebase/firestore';


export default function ContactsPage() {
  const { firestore } = useFirebase();
  const contactsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'contacts') : null, [firestore]);
  const { data: contacts, isLoading } = useCollection<Contact>(contactsQuery);

  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const { toast } = useToast();

  const handleSaveContact = (contactData: Contact | Omit<Contact, 'id'>, newInteraction?: Omit<Interaction, 'id'>) => {
    if (!firestore) return;

    if ('id' in contactData) {
      // Update
      const contactToUpdate = { ...contactData };
      if (newInteraction) {
        const interaction: Interaction = { ...newInteraction, id: `int-${Date.now()}` };
        contactToUpdate.interactions = [...(contactToUpdate.interactions || []), interaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
      const docRef = doc(firestore, 'contacts', contactData.id);
      updateDocumentNonBlocking(docRef, contactToUpdate);
      toast({ title: "Contacto Actualizado", description: `El contacto ${contactData.name} ha sido actualizado.` });
    } else {
      // Add
      const newContact: Omit<Contact, 'id'> = {
        ...contactData,
        interactions: [],
        tags: contactData.tags || [],
        type: contactData.type || [],
      };
      if (newInteraction) {
         const interaction: Interaction = { ...newInteraction, id: `int-${Date.now()}` };
         (newContact.interactions as Interaction[]).push(interaction);
      }
      addDocumentNonBlocking(collection(firestore, 'contacts'), newContact);
      toast({ title: "Contacto Creado", description: `El contacto ${contactData.name} ha sido creado.` });
    }
    
    if (!('id' in contactData)) {
      setIsSheetOpen(false); 
      setEditingContact(null);
    } else {
      // For updates, especially with new interactions, we need to refresh the editingContact state
      const updatedContact = contacts?.find(c => c.id === contactData.id);
      if (updatedContact) {
        const contactWithNewInteraction = { ...updatedContact };
         if (newInteraction) {
            const interaction: Interaction = { ...newInteraction, id: `int-${Date.now()}` };
            contactWithNewInteraction.interactions = [...(contactWithNewInteraction.interactions || []), interaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
         }
        setEditingContact(contactWithNewInteraction);
      }
    }
  };
  
  const handleDeleteInteraction = (contactId: string, interactionId: string) => {
    if (!firestore) return;
    const contact = contacts?.find(c => c.id === contactId);
    if (contact) {
      const updatedInteractions = contact.interactions?.filter(i => i.id !== interactionId);
      const updatedContact = { ...contact, interactions: updatedInteractions };
      const docRef = doc(firestore, 'contacts', contactId);
      updateDocumentNonBlocking(docRef, { interactions: updatedInteractions });

      if (editingContact?.id === contactId) {
          setEditingContact(updatedContact);
      }
      toast({ variant: "destructive", title: "Interacción Eliminada" });
    }
  };


  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setActiveTab('details');
    setIsSheetOpen(true);
  };
  
  const handleRowClick = (contact: Contact) => {
    setEditingContact(contact);
    setActiveTab('details');
    setIsSheetOpen(true);
  }

  const handleDelete = (contact: Contact) => {
    setDeletingContact(contact);
  };
  
  const confirmDelete = () => {
    if (deletingContact && firestore) {
      const docRef = doc(firestore, 'contacts', deletingContact.id);
      deleteDocumentNonBlocking(docRef);
      toast({ variant: "destructive", title: "Contacto Eliminado", description: `El contacto ${deletingContact.name} ha sido eliminado.` });
      setDeletingContact(null);
    }
  }

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setEditingContact(null);
    }
  }

  const columns = getColumns({ onEdit: handleEdit, onDelete: handleDelete });
  
  const openNewContactSheet = () => {
    setEditingContact(null);
    setActiveTab('details');
    setIsSheetOpen(true);
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      );
    }
    return <DataTable columns={columns} data={contacts || []} onRowClick={handleRowClick} />;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-headline text-2xl">Maestro de Contactos</CardTitle>
              <CardDescription>Gestiona tus clientes y proveedores.</CardDescription>
            </div>
             <Button onClick={openNewContactSheet}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Contacto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
      <NewContactSheet 
        isOpen={isSheetOpen}
        onOpenChange={handleSheetOpenChange}
        onSave={handleSaveContact}
        contact={editingContact}
        defaultTab={activeTab}
        onDeleteInteraction={handleDeleteInteraction}
      />
      <AlertDialog open={!!deletingContact} onOpenChange={(open) => !open && setDeletingContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de que quieres eliminar este contacto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el contacto
               "{deletingContact?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingContact(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
