"use client";

import { useState } from 'react';
import { contacts as initialContacts } from '@/lib/data';
import { Contact } from '@/lib/types';
import { columns } from './components/columns';
import { DataTable } from './components/data-table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { NewContactSheet } from './components/new-contact-sheet';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);

  const handleAddContact = (newContact: Omit<Contact, 'id'>) => {
    setContacts((prevContacts) => [
      ...prevContacts,
      { ...newContact, id: (prevContacts.length + 1).toString() },
    ]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-headline text-2xl">Maestro de Contactos</CardTitle>
            <CardDescription>Gestiona tus clientes y proveedores.</CardDescription>
          </div>
          <NewContactSheet onAddContact={handleAddContact} />
        </div>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={contacts} />
      </CardContent>
    </Card>
  );
}
