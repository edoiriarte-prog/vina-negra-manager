import { financialMovements } from '@/lib/data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default async function FinancialsPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="font-headline text-2xl">Movimientos Financieros</CardTitle>
                <CardDescription>Registra todos los ingresos y egresos.</CardDescription>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Movimiento
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p>Listado de movimientos financieros aparecerá aquí.</p>
        {/* DataTable for financials with AI suggestion feature will be implemented here */}
      </CardContent>
    </Card>
  );
}
