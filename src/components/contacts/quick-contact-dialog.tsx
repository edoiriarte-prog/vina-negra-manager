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
import { ContactType } from '@/lib/types';
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
  type: ContactType | 'client' | 'supplier';
  onSuccess: (newContact: { id: string; name: string }) => void;
}

export function QuickContactDialog({ isOpen, onOpenChange, type, onSuccess }: QuickContactDialogProps) {
  const { firestore } = useFirebase();
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
    if (!firestore) {
      toast({ variant: "destructive", title: "Error", description: "No hay conexión a la base de datos." });
      return;
    }
    
    setIsSaving(true);
    try {
      const docRef = await addDoc(collection(firestore, "contacts"), {
        ...data,
        type: [type], // Guardar el tipo como un array
        createdAt: new Date().toISOString(),
      });
      
      toast({ title: "Contacto Creado", description: `${data.name} ha sido agregado.` });
      onSuccess({ id: docRef.id, name: data.name });
      onOpenChange(false);
      
    } catch (error) {
      console.error("Error al crear contacto:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el contacto." });
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle>Crear Nuevo {type === 'client' ? 'Cliente' : 'Proveedor'}</DialogTitle>
        </DialogHeader>
        <form id="quick-contact-form" onSubmit={handleSubmit(handleSave)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre / Razón Social</Label>
            <Input id="name" {...register('name')} className="bg-slate-900 border-slate-700" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="rut">RUT (Opcional)</Label>
            <Input id="rut" {...register('rut')} className="bg-slate-900 border-slate-700" />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancelar</Button>
          <Button type="submit" form="quick-contact-form" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
