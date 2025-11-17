import { redirect } from "next/navigation";

export default function RootPage() {
  // En cuanto alguien entra a la raíz, lo enviamos a la nueva ubicación
  redirect("/dashboard");
}
