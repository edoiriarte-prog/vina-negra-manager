
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { Loader2, UserPlus } from 'lucide-react';
import { ContactType } from '@/lib/types';

// Esquema de validación con Zod
const formSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
  rut: z.string().optional(),
});
type FormData = z.infer<typeof formSchema>;

// Props del componente
interface QuickContactDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  type: ContactType;
  onSuccess: (newContact: { id: string; name: string }) => void;
}

export function QuickContactDialog({ isOpen, onOpenChange, type, onSuccess }: QuickContactDialogProps) {
  const { db } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', rut: '' },
  });
  
  const { formState: { errors } } = form;

  const handleSave = async (data: FormData) => {
    if (!db) return;
    setIsSubmitting(true);

    try {
      const newContactData = {
        name: data.name,
        rut: data.rut || '',
        email: '',
        type: [type], // Guardamos como array para consistencia
      };

      const docRef = await addDoc(collection(db, 'contacts'), newContactData);
      
      toast({
        title: 'Contacto Creado',
        description: `${data.name} ha sido agregado como ${type === 'client' ? 'cliente' : 'proveedor'}.`,
      });
      
      // Devolvemos el ID y nombre al componente padre
      onSuccess({ id: docRef.id, name: data.name });
      
      // Limpiar y cerrar
      form.reset();
      onOpenChange(false);

    } catch (error) {
      console.error("Error creando contacto rápido:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo crear el contacto.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = type === 'client' ? 'Nuevo Cliente Rápido' : 'Nuevo Proveedor Rápido';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-500" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Ingresa los datos básicos. Podrás completarlos más tarde desde el módulo de Contactos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSave)} id="quick-contact-form" className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className={errors.name ? 'text-red-500' : ''}>Nombre / Razón Social</Label>
            <Input
              id="name"
              {...form.register('name')}
              className="bg-slate-900 border-slate-700"
              autoComplete="off"
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rut">RUT (Opcional)</Label>
            <Input
              id="rut"
              {...form.register('rut')}
              className="bg-slate-900 border-slate-700"
              autoComplete="off"
            />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white">
            Cancelar
          </Button>
          <Button
            type="submit"
            form="quick-contact-form"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
