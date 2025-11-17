import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase'; // <--- ¡AQUÍ ESTÁ EL ENCHUFE PRINCIPAL!

export const metadata = {
  title: 'Viña Negra Manager',
  description: 'Sistema de Gestión Viña Negra',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {/* Este proveedor alimenta a TODA la aplicación, incluida la carpeta principal */}
        <FirebaseClientProvider>
           {children}
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
