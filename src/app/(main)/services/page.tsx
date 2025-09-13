import { serviceOrders } from '@/lib/data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default async function ServicesPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="font-headline text-2xl">Gestión de Servicios (O/S)</CardTitle>
                <CardDescription>Registra costos operativos como fletes y jornales.</CardDescription>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Servicio
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p>Listado de órdenes de servicio aparecerá aquí.</p>
        {/* DataTable for services will be implemented here */}
      </CardContent>
    </Card>
  );
}
