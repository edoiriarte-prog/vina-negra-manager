"use client";

import { useState } from 'react';
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


export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleAddContact = (newContact: Omit<Contact, 'id'>) => {
    setContacts((prevContacts) => [
      ...prevContacts,
      { ...newContact, id: (prevContacts.length + 1).toString() },
    ]);
    setIsSheetOpen(false);
  };

  const handleUpdateContact = (updatedContact: Contact) => {
    setContacts((prevContacts) =>
      prevContacts.map((c) => (c.id === updatedContact.id ? updatedContact : c))
    );
    setEditingContact(null);
    setIsSheetOpen(false);
  }

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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-headline text-2xl">Maestro de Contactos</CardTitle>
              <CardDescription>Gestiona tus clientes y proveedores.</CardDescription>
            </div>
            <NewContactSheet 
              isOpen={isSheetOpen}
              onOpenChange={handleSheetOpenChange}
              onSave={editingContact ? handleUpdateContact : handleAddContact}
              contact={editingContact}
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={contacts} />
        </CardContent>
      </Card>
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
