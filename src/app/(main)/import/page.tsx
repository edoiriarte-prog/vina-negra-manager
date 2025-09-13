
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export default async function ImportPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Importación de Datos</CardTitle>
        <CardDescription>Carga o pega los datos en formato JSON para poblar la información inicial.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="contacts">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="contacts">Contactos</TabsTrigger>
            <TabsTrigger value="purchases">Compras</TabsTrigger>
            <TabsTrigger value="sales">Ventas</TabsTrigger>
            <TabsTrigger value="services">Servicios</TabsTrigger>
          </TabsList>
          <TabsContent value="contacts">
             <div className="flex flex-col gap-4 mt-4">
                <p className="text-sm text-muted-foreground">Pega el contenido de un arreglo JSON de contactos en el siguiente campo.</p>
                <Textarea rows={10} placeholder='[{"id": "1", "name": "Proveedor Ejemplo", ...}]' />
                <Button className="self-start">
                    <Upload className="mr-2 h-4 w-4" />
                    Importar Contactos
                </Button>
            </div>
          </TabsContent>
          <TabsContent value="purchases">
             <div className="flex flex-col gap-4 mt-4">
                <p className="text-sm text-muted-foreground">Pega el contenido de un arreglo JSON de órdenes de compra.</p>
                <Textarea rows={10} placeholder='[{"id": "OC-001", "supplierId": "1", ...}]' />
                <Button className="self-start">
                    <Upload className="mr-2 h-4 w-4" />
                    Importar Compras
                </Button>
            </div>
          </TabsContent>
          <TabsContent value="sales">
             <div className="flex flex-col gap-4 mt-4">
                <p className="text-sm text-muted-foreground">Pega el contenido de un arreglo JSON de órdenes de venta.</p>
                <Textarea rows={10} placeholder='[{"id": "OV-001", "clientId": "2", ...}]' />
                <Button className="self-start">
                    <Upload className="mr-2 h-4 w-4" />
                    Importar Ventas
                </Button>
            </div>
          </TabsContent>
          <TabsContent value="services">
             <div className="flex flex-col gap-4 mt-4">
                <p className="text-sm text-muted-foreground">Pega el contenido de un arreglo JSON de órdenes de servicio.</p>
                <Textarea rows={10} placeholder='[{"id": "OS-001", "provider": "Transportes Ejemplo", ...}]' />
                <Button className="self-start">
                    <Upload className="mr-2 h-4 w-4" />
                    Importar Servicios
                </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
