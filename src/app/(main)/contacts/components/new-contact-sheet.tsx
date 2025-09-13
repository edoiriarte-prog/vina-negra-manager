"use client";

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Contact } from '@/lib/types';

type NewContactSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (contact: Contact | Omit<Contact, 'id'>) => void;
  contact: Contact | null;
};

export function NewContactSheet({ isOpen, onOpenChange, onSave, contact }: NewContactSheetProps) {
  const [type, setType] = useState<'client' | 'supplier' | ''>('');
  const [formData, setFormData] = useState<Omit<Contact, 'id' | 'type'>>({
    name: '',
    rut: '',
    email: '',
    contactPerson: '',
    address: '',
    commune: '',
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name,
        rut: contact.rut,
        email: contact.email,
        contactPerson: contact.contactPerson,
        address: contact.address,
        commune: contact.commune,
      });
      setType(contact.type);
    } else {
      // Reset form when adding a new contact
      setFormData({
        name: '',
        rut: '',
        email: '',
        contactPerson: '',
        address: '',
        commune: '',
      });
      setType('');
    }
  }, [contact, isOpen]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (contact) {
        onSave({ ...formData, type: type as 'client' | 'supplier', id: contact.id });
    } else {
        onSave({ ...formData, type: type as 'client' | 'supplier' });
    }
  };

  const title = contact ? 'Editar Contacto' : 'Crear Nuevo Contacto';
  const description = contact 
    ? 'Actualice la información del contacto.'
    : 'Complete la información para registrar un nuevo cliente o proveedor.';

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nombre
              </Label>
              <Input id="name" name="name" value={formData.name} onChange={handleInputChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rut" className="text-right">
                RUT
              </Label>
              <Input id="rut" name="rut" value={formData.rut} onChange={handleInputChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contactPerson" className="text-right">
                Persona
              </Label>
              <Input id="contactPerson" name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Dirección
              </Label>
              <Input id="address" name="address" value={formData.address} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="commune" className="text-right">
                Comuna
              </Label>
              <Input id="commune" name="commune" value={formData.commune} onChange={handleInputChange} className="col-span-3" />
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
