"use client";

import { useState } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { contacts as initialContacts } from '@/lib/data';
import { Contact } from '@/lib/types';
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


export default function ContactsPage() {
  const [contacts, setContacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleSaveContact = (contact: Contact | Omit<Contact, 'id'>) => {
    if ('id' in contact) {
      // Update
      setContacts(prev => prev.map(c => c.id === contact.id ? contact : c));
    } else {
      // Add
      const newContact = {
        ...contact,
        id: `contact-${Date.now()}`,
      };
      setContacts(prev => [...prev, newContact]);
    }
    setIsSheetOpen(false);
    setEditingContact(null);
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
          <DataTable columns={columns} data={contacts} />
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
