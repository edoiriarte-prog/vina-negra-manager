import { salesOrders } from '@/lib/data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default async function SalesPage() {
  return (
     <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="font-headline text-2xl">Gestión de Ventas (O/V)</CardTitle>
                <CardDescription>Crea y administra tus órdenes de venta.</CardDescription>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Venta
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p>Listado de órdenes de venta aparecerá aquí.</p>
        {/* DataTable for sales will be implemented here */}
      </CardContent>
    </Card>
  );
}
