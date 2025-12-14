"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirebase } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Esquema de validación
const formSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  rut: z.string().optional(),
});
type FormData = z.infer<typeof formSchema>;

// Props
interface QuickContactDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  // Simplificamos el tipo para evitar dependencias circulares si ContactType no está a mano
  type: 'client' | 'supplier'; 
  // CAMBIO: Definimos explícitamente que devuelve el ID (string) para que el formulario padre no falle
  onSuccess: (newId: string) => void;
}

// CAMBIO: 'export default' para evitar errores de importación (Element type invalid)
export default function QuickContactDialog({ isOpen, onOpenChange, type, onSuccess }: QuickContactDialogProps) {
  // CAMBIO: Usamos 'db' o 'firestore: db' para asegurar consistencia con el resto de la app
  const { firestore: db } = useFirebase();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (!isOpen) {
      reset({ name: '', rut: '' });
      setIsSaving(false);
    }
  }, [isOpen, reset]);

  const handleSave = async (data: FormData) => {
    if (!db) {
      toast({ variant: "destructive", title: "Error", description: "No hay conexión a la base de datos." });
      return;
    }
    
    setIsSaving(true);
    try {
      // Guardar en mayúsculas por convención
      const docRef = await addDoc(collection(db, "contacts"), {
        ...data,
        name: data.name.toUpperCase(),
        rut: data.rut || '',
        email: '',
        phone: '',
        address: '',
        status: 'active',
        type: [type], // Guardar el tipo como un array para filtros
        createdAt: new Date().toISOString(),
      });
      
      toast({ title: "Contacto Creado", description: `${data.name} ha sido agregado.` });
      
      // CAMBIO: Devolvemos solo el ID para que el Select del padre funcione directo
      onSuccess(docRef.id);
      
      onOpenChange(false);
      
    } catch (error) {
      console.error("Error al crear contacto:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el contacto." });
    } finally {
        setIsSaving(false);
    }
  };

  const title = type === 'client' ? 'Crear Nuevo Cliente' : 'Crear Nuevo Proveedor';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800 text-slate-100 z-[9999]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form id="quick-contact-form" onSubmit={handleSubmit(handleSave)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre / Razón Social</Label>
            <Input id="name" {...register('name')} className="bg-slate-900 border-slate-700 focus:border-blue-500" autoComplete="off" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="rut">RUT (Opcional)</Label>
            <Input id="rut" {...register('rut')} className="bg-slate-900 border-slate-700 focus:border-blue-500" placeholder="Ej: 76.123.456-7" autoComplete="off"/>
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving} className="hover:bg-slate-800 text-slate-300">Cancelar</Button>
          <Button type="submit" form="quick-contact-form" disabled={isSaving} className="bg-blue-600 hover:bg-blue-500 text-white">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}