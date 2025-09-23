"use client";

import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { contacts as initialContacts } from '@/lib/data';
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


export default function ContactsPage() {
  const [contacts, setContacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);


  const handleSaveContact = (contact: Contact | Omit<Contact, 'id'>, newInteraction?: Omit<Interaction, 'id'>) => {
    if ('id' in contact) {
      // Update
      const contactToUpdate = { ...contact };
      if (newInteraction) {
        const interaction: Interaction = { ...newInteraction, id: `int-${Date.now()}` };
        contactToUpdate.interactions = [...(contactToUpdate.interactions || []), interaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
      setContacts(prev => prev.map(c => c.id === contact.id ? contactToUpdate : c));
       toast({ title: "Contacto Actualizado", description: `El contacto ${contact.name} ha sido actualizado.` });
    } else {
      // Add
      const newContact: Contact = {
        ...contact,
        id: `contact-${Date.now()}`,
        interactions: [],
        tags: contact.tags || [],
      };
      if (newInteraction) {
         const interaction: Interaction = { ...newInteraction, id: `int-${Date.now()}` };
         newContact.interactions = [interaction];
      }
      setContacts(prev => [...prev, newContact]);
       toast({ title: "Contacto Creado", description: `El contacto ${contact.name} ha sido creado.` });
    }
    // We don't close the sheet here to allow adding multiple interactions
    // but if it's a new contact, we should probably close it to avoid confusion
    if (!('id' in contact)) {
      setIsSheetOpen(false); 
      setEditingContact(null);
    }
  };


  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setIsSheetOpen(true);
  };

  const handleDelete = (contact: Contact) => {
    setDeletingContact(contact);
  };
  
  const confirmDelete = () => {
    if (deletingContact) {
      setContacts((prev) => prev.filter((c) => c.id !== deletingContact.id));
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
    setIsSheetOpen(true);
  }

  const renderContent = () => {
    if (!isClient) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      );
    }
    return <DataTable columns={columns} data={contacts} />;
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
