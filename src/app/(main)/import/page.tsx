"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { Contact, PurchaseOrder, SalesOrder, ServiceOrder } from '@/lib/types';

export default function ImportPage() {
  const [contactsJson, setContactsJson] = useState('');
  const [purchasesJson, setPurchasesJson] = useState('');
  const [salesJson, setSalesJson] = useState('');
  const [servicesJson, setServicesJson] = useState('');
  
  const [, setContacts] = useLocalStorage<Contact[]>('contacts', []);
  const [, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', []);
  const [, setSalesOrders] = useLocalStorage<SalesOrder[]>('salesOrders', []);
  const [, setServiceOrders] = useLocalStorage<ServiceOrder[]>('serviceOrders', []);

  const { toast } = useToast();

  const handleImport = (type: 'contacts' | 'purchases' | 'sales' | 'services') => {
    try {
      let count = 0;
      if (type === 'contacts') {
        const data = JSON.parse(contactsJson);
        setContacts(data);
        count = data.length;
      } else if (type === 'purchases') {
        const data = JSON.parse(purchasesJson);
        setPurchaseOrders(data);
        count = data.length;
      } else if (type === 'sales') {
        const data = JSON.parse(salesJson);
        setSalesOrders(data);
        count = data.length;
      } else if (type === 'services') {
        const data = JSON.parse(servicesJson);
        setServiceOrders(data);
        count = data.length;
      }
      toast({
        title: "Importación Exitosa",
        description: `Se importaron ${count} registros de ${type}.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error de Importación",
        description: "El formato JSON es inválido o no corresponde a la estructura esperada.",
      });
      console.error("Import error:", error);
    }
  };

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
                <Textarea rows={10} placeholder='[{"id": "1", "name": "Proveedor Ejemplo", ...}]' value={contactsJson} onChange={e => setContactsJson(e.target.value)} />
                <Button className="self-start" onClick={() => handleImport('contacts')}>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar Contactos
                </Button>
            </div>
          </TabsContent>
          <TabsContent value="purchases">
             <div className="flex flex-col gap-4 mt-4">
                <p className="text-sm text-muted-foreground">Pega el contenido de un arreglo JSON de órdenes de compra.</p>
                <Textarea rows={10} placeholder='[{"id": "OC-001", "supplierId": "1", ...}]' value={purchasesJson} onChange={e => setPurchasesJson(e.target.value)} />
                <Button className="self-start" onClick={() => handleImport('purchases')}>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar Compras
                </Button>
            </div>
          </TabsContent>
          <TabsContent value="sales">
             <div className="flex flex-col gap-4 mt-4">
                <p className="text-sm text-muted-foreground">Pega el contenido de un arreglo JSON de órdenes de venta.</p>
                <Textarea rows={10} placeholder='[{"id": "OV-001", "clientId": "2", ...}]' value={salesJson} onChange={e => setSalesJson(e.target.value)} />
                <Button className="self-start" onClick={() => handleImport('sales')}>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar Ventas
                </Button>
            </div>
          </TabsContent>
          <TabsContent value="services">
             <div className="flex flex-col gap-4 mt-4">
                <p className="text-sm text-muted-foreground">Pega el contenido de un arreglo JSON de órdenes de servicio.</p>
                <Textarea rows={10} placeholder='[{"id": "OS-001", "provider": "Transportes Ejemplo", ...}]' value={servicesJson} onChange={e => setServicesJson(e.target.value)} />
                <Button className="self-start" onClick={() => handleImport('services')}>
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
