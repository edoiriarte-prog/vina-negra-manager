import { contacts } from '@/lib/data';
import { columns } from './components/columns';
import { DataTable } from './components/data-table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { NewContactSheet } from './components/new-contact-sheet';

export default async function ContactsPage() {
  const data = contacts;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="font-headline text-2xl">Maestro de Contactos</CardTitle>
                <CardDescription>Gestiona tus clientes y proveedores.</CardDescription>
            </div>
            <NewContactSheet />
        </div>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={data} />
      </CardContent>
    </Card>
  );
}
