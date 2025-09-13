import { purchaseOrders } from '@/lib/data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default async function PurchasesPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="font-headline text-2xl">Gestión de Compras (O/C)</CardTitle>
                <CardDescription>Registra todas las adquisiciones de productos.</CardDescription>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Compra
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p>Listado de órdenes de compra aparecerá aquí.</p>
        {/* DataTable for purchases will be implemented here */}
      </CardContent>
    </Card>
  );
}
