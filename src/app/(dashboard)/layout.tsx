import { MainNav } from "./main-nav"; // <--- Importante: ruta relativa "./"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar Personalizado */}
      <MainNav />

      {/* Contenido con margen izquierdo para respetar la sidebar */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen transition-all duration-300">
        <div className="flex-1 p-0">
          {children}
        </div>
      </main>
    </div>
  );
}