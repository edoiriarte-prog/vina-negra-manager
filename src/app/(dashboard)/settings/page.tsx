"use client";

// ESTA LÍNEA ES LA CLAVE (asegúrate de importar TabsContent)
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCaliberManager } from "@/components/settings/product-caliber-manager";
import { MasterDataManager } from "@/components/settings/master-data-manager";

export default function SettingsPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Configuración</h2>
        <p className="text-muted-foreground">
          Gestiona los datos maestros y parámetros de la aplicación.
        </p>
      </div>
      
      <Tabs defaultValue="master-data" className="space-y-4">
        <TabsList>
          <TabsTrigger value="master-data">Datos Maestros</TabsTrigger>
          <TabsTrigger value="associations">Asociaciones</TabsTrigger>
          <TabsTrigger value="bank-accounts">Cuentas Bancarias</TabsTrigger>
        </TabsList>

        {/* Pestaña: DATOS MAESTROS */}
        <TabsContent value="master-data" className="space-y-4">
           <MasterDataManager />
        </TabsContent>

        {/* Pestaña: ASOCIACIONES */}
        <TabsContent value="associations" className="space-y-4">
           <ProductCaliberManager />
        </TabsContent>

        {/* Pestaña: CUENTAS BANCARIAS */}
        <TabsContent value="bank-accounts" className="space-y-4">
           <div className="p-4 border border-dashed rounded text-muted-foreground">
             (Módulo de Cuentas Bancarias en desarrollo)
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}