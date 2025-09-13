import { contacts } from '@/lib/data';
import { columns } from './components/columns';
import { DataTable } from './components/data-table';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

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
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Contacto
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={data} />
      </CardContent>
    </Card>
  );
}
