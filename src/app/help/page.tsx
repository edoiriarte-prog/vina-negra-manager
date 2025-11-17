
"use client";

import { useRef } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HelpCircle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReactToPrint } from 'react-to-print';

export default function HelpPage() {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-8 no-print">
        <div className="flex-1">
          <h1 className="font-headline text-3xl flex items-center gap-2">
            <HelpCircle className="h-8 w-8" />
            Centro de Ayuda
          </h1>
          <p className="text-muted-foreground mt-2">
            Guía completa sobre el funcionamiento y uso de la aplicación Viña Negra Manager.
          </p>
        </div>
        <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Descargar / Imprimir
        </Button>
      </div>

      <div ref={printRef} className="flex flex-col gap-8">
        <div className="print:hidden">
           <h1 className="font-headline text-3xl flex items-center gap-2">
            <HelpCircle className="h-8 w-8" />
            Centro de Ayuda
          </h1>
          <p className="text-muted-foreground mt-2">
            Guía completa sobre el funcionamiento y uso de la aplicación Viña Negra Manager.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sobre la Aplicación</CardTitle>
            <CardDescription>
              Una visión general de la finalidad y la tecnología detrás de la aplicación.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              <strong>Viña Negra Manager</strong> es una aplicación web diseñada para la gestión integral de las operaciones comerciales y financieras de una empresa agroindustrial. Permite llevar un control detallado de contactos, compras, ventas, inventario, y finanzas, centralizando toda la información crítica del negocio en una sola plataforma.
            </p>
            <div>
              <h4 className="font-semibold">Tecnología Utilizada:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2">
                <li><strong>Framework:</strong> Next.js (React)</li>
                <li><strong>Estilos:</strong> Tailwind CSS y ShadCN UI</li>
                <li><strong>Inteligencia Artificial:</strong> Google Genkit con modelos Gemini</li>
                <li><strong>Almacenamiento de Datos:</strong> Local Storage del navegador (para esta versión demo)</li>
                <li><strong>Iconos:</strong> Lucide React</li>
                <li><strong>Gráficos:</strong> Recharts</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manual de Usuario</CardTitle>
            <CardDescription>
              Instrucciones detalladas sobre cómo utilizar cada módulo de la aplicación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="dashboard">
                <AccordionTrigger>Dashboard</AccordionTrigger>
                <AccordionContent>
                  El Dashboard es la pantalla principal y ofrece una vista panorámica del estado del negocio. Aquí encontrarás:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>KPIs (Indicadores Clave de Rendimiento):</strong> Tarjetas que resumen ingresos, egresos, kilos comprados/vendidos y totales de órdenes.</li>
                    <li><strong>Resumen Ejecutivo IA:</strong> Un análisis financiero generado por inteligencia artificial que provee una sinopsis del estado actual de la empresa.</li>
                    <li><strong>Gráficos Interactivos:</strong> Visualizaciones de compras semanales, desglose de egresos, comparativa de kilos, y distribución del stock por calibre.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="contacts">
                <AccordionTrigger>Contactos</AccordionTrigger>
                <AccordionContent>
                  El Maestro de Contactos centraliza la información de tus clientes y proveedores.
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Crear Contacto:</strong> Usa el botón "Nuevo Contacto" para abrir un formulario y registrar la información. Debes especificar si es Cliente o Proveedor.</li>
                    <li><strong>Editar y Eliminar:</strong> En la tabla, cada contacto tiene un menú de acciones (tres puntos) para editar su información o eliminarlo.</li>
                    <li><strong>Filtrar:</strong> Puedes buscar contactos por nombre usando el campo de filtro en la parte superior de la tabla.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="purchases">
                <AccordionTrigger>Compras (O/C)</AccordionTrigger>
                <AccordionContent>
                  Gestiona todas las Órdenes de Compra (O/C) de productos.
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Crear Compra:</strong> Haz clic en "Nueva Compra". Completa los datos del proveedor, la fecha y los ítems.</li>
                    <li><strong>Agregar Ítems:</strong> Puedes agregar ítems uno por uno, o usar la "Matriz de Items" para añadir rápidamente múltiples calibres de un mismo producto, agilizando la entrada de datos.</li>
                    <li><strong>Visualizar:</strong> El icono del ojo en el menú de acciones te permite ver una vista previa imprimible de la orden de compra.</li>
                    <li><strong>Estados:</strong> Las órdenes pueden ser marcadas como "Pendiente", "Completada" o "Cancelada" para reflejar su estado en el flujo de trabajo.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="sales">
                <AccordionTrigger>Ventas (O/V)</AccordionTrigger>
                <AccordionContent>
                  Crea y administra las Órdenes de Venta (O/V).
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Crear Venta:</strong> Completa los datos del cliente, fecha, y los ítems. El stock disponible para cada ítem se muestra para evitar sobreventas.</li>
                    <li><strong>Condiciones de Pago:</strong> Define si el pago es al Contado, a Crédito o con "Pago con Anticipo y Saldo". Para esta última, puedes definir el porcentaje del anticipo y las fechas de vencimiento de cada pago.</li>
                    <li><strong>Validación de Stock:</strong> El sistema no te permitirá vender más kilos de los que tienes en inventario, asegurando la integridad de los datos.</li>
                     <li><strong>Agregar por Matriz:</strong> Al igual que en compras, puedes usar una matriz para añadir rápidamente varios ítems a la venta.</li>
                    <li><strong>Visualizar:</strong> Puedes previsualizar la orden de venta, que incluye un desglose de los pagos si corresponde, antes de guardarla.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="services">
                <AccordionTrigger>Servicios (O/S)</AccordionTrigger>
                <AccordionContent>
                  Registra todos los costos operativos que no son compras de producto, como fletes, jornales, o arriendos.
                   <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Crear Servicio:</strong> Registra la fecha, proveedor, tipo de servicio, costo y una descripción detallada.</li>
                    <li><strong>Asociar a Compra:</strong> Opcionalmente, puedes vincular un servicio a una orden de compra específica (ej: el flete de la OC-1001), lo que ayuda a costear mejor la operación.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="financials">
                <AccordionTrigger>Movimientos Financieros</AccordionTrigger>
                <AccordionContent>
                  Lleva un registro de todos los ingresos y egresos de dinero.
                   <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Crear Movimiento:</strong> Registra la fecha, el tipo (ingreso/egreso), el monto y una descripción.</li>
                    <li><strong>Vincular a Documento:</strong> Puedes asociar un movimiento a una O/C, O/V u O/S. Al hacerlo, el monto restante de ese documento se sugiere automáticamente.</li>
                    <li><strong>Vincular a Contacto:</strong> Si un movimiento no está ligado a un documento (ej. un anticipo general), puedes asociarlo directamente a un cliente o proveedor para que se refleje en su estado de cuenta.</li>
                    <li><strong>Sugerencia con IA:</strong> Usa el botón "Sugerir con IA" para generar una descripción estandarizada del movimiento, indicando si es un abono, pago final, o pago de un documento específico.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="inventory">
                <AccordionTrigger>Inventario y Rendimiento</AccordionTrigger>
                <AccordionContent>
                  Analiza el stock de tus productos y su rendimiento económico.
                   <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Stock Actual:</strong> Una tabla que muestra en tiempo real los kilos comprados, kilos vendidos y el stock disponible para cada combinación de producto y calibre.</li>
                    <li><strong>Rendimiento de Productos:</strong> Cambia a la pestaña "Rendimiento" para ver reportes detallados sobre el total de kilos y el valor monetario de las ventas y compras por producto y calibre. Esto te permite identificar qué productos son más rentables.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

               <AccordionItem value="reports">
                <AccordionTrigger>Informes</AccordionTrigger>
                <AccordionContent>
                  Este módulo consolida la información para ofrecerte una visión clara de las finanzas y obligaciones.
                   <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Estado de Cuentas:</strong> Muestra un resumen de cuentas por cobrar (clientes) y por pagar (proveedores). Puedes desplegar cada fila para ver el detalle de las órdenes y pagos asociados a cada contacto.</li>
                    <li><strong>Informe de Vencimientos:</strong> Realiza un seguimiento de los pagos pendientes de las ventas a crédito, ordenados por fecha de vencimiento y con un total acumulado para proyectar el flujo de caja.</li>
                    <li><strong>Imprimir:</strong> El botón "Imprimir" genera una versión limpia de los informes para guardar en PDF o compartir.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="settings">
                <AccordionTrigger>Configuración</AccordionTrigger>
                <AccordionContent>
                  Administra los datos maestros y la información de la aplicación.
                   <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Datos Maestros:</strong> Puedes agregar o eliminar valores para los campos de Productos, Calibres, Unidades y Tipos de Envase. Estos cambios se reflejarán en los formularios de toda la aplicación, personalizando la experiencia.</li>
                    <li><strong>Exportar Datos:</strong> Permite descargar toda la información de la aplicación (contactos, órdenes, movimientos) en un único archivo de Excel (.xlsx) como respaldo de seguridad o para análisis externo.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
