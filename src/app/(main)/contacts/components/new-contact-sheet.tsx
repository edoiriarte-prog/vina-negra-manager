"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Contact } from '@/lib/types';

type NewContactSheetProps = {
  onAddContact: (contact: Omit<Contact, 'id'>) => void;
};

export function NewContactSheet({ onAddContact }: NewContactSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'client' | 'supplier' | ''>('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newContact: Omit<Contact, 'id'> = {
      name: formData.get('name') as string,
      rut: formData.get('rut') as string,
      email: formData.get('email') as string,
      contactPerson: formData.get('contactPerson') as string,
      address: formData.get('address') as string,
      commune: formData.get('commune') as string,
      type: type as 'client' | 'supplier',
    };
    onAddContact(newContact);
    setIsOpen(false);
    event.currentTarget.reset();
    setType('');
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <Button onClick={() => setIsOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Nuevo Contacto
      </Button>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Crear Nuevo Contacto</SheetTitle>
          <SheetDescription>
            Complete la información para registrar un nuevo cliente o proveedor.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nombre
              </Label>
              <Input id="name" name="name" className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rut" className="text-right">
                RUT
              </Label>
              <Input id="rut" name="rut" className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input id="email" name="email" type="email" className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contactPerson" className="text-right">
                Persona
              </Label>
              <Input id="contactPerson" name="contactPerson" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Dirección
              </Label>
              <Input id="address" name="address" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="commune" className="text-right">
                Comuna
              </Label>
              <Input id="commune" name="commune" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Tipo
              </Label>
              <Select
                required
                onValueChange={(value: 'client' | 'supplier') => setType(value)}
                value={type}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccione un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Cliente</SelectItem>
                  <SelectItem value="supplier">Proveedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </SheetClose>
            <Button type="submit">Guardar</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
