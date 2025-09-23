
"use client";

import { useState, useEffect, KeyboardEvent } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Contact, Interaction } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { X, PlusCircle, Calendar, Users, Mail, Phone, Handshake } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

type NewContactSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (contact: Contact | Omit<Contact, 'id' | 'interactions'>, newInteraction?: Omit<Interaction, 'id'>) => void;
  contact: Contact | null;
  defaultTab?: string;
};

const getInitialFormData = (contact: Contact | null): Omit<Contact, 'id' | 'interactions'> => {
  if (contact) {
    return {
      name: contact.name,
      rut: contact.rut,
      email: contact.email,
      contactPerson: contact.contactPerson,
      address: contact.address,
      commune: contact.commune,
      type: contact.type,
      tags: contact.tags || []
    }
  }
  return {
    name: '',
    rut: '',
    email: '',
    contactPerson: '',
    address: '',
    commune: '',
    type: 'client',
    tags: []
  }
}

const initialNewInteraction: Omit<Interaction, 'id'> = {
  date: format(new Date(), 'yyyy-MM-dd'),
  type: 'Llamada',
  notes: '',
};

export function NewContactSheet({ isOpen, onOpenChange, onSave, contact, defaultTab = 'details' }: NewContactSheetProps) {
  const [formData, setFormData] = useState<Omit<Contact, 'id' | 'interactions'>>(getInitialFormData(contact));
  const [tagInput, setTagInput] = useState('');
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [newInteraction, setNewInteraction] = useState<Omit<Interaction, 'id'>>(initialNewInteraction);

  useEffect(() => {
    if (isOpen) {
      const initialData = getInitialFormData(contact);
      setFormData(initialData);
      setInteractions(contact?.interactions?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || []);
      setTagInput('');
      setNewInteraction(initialNewInteraction);
    }
  }, [contact, isOpen]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleTagInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && tagInput.trim() !== '') {
      event.preventDefault();
      const newTag = tagInput.trim();
      if (!formData.tags?.includes(newTag)) {
        setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), newTag] }));
        setTagInput('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags?.filter(tag => tag !== tagToRemove) }));
  };
  
  const handleAddInteraction = () => {
    if (newInteraction.notes.trim() === '' || !contact) return;
    
    onSave(contact, newInteraction);
    // Optimistically add to local state
    const newInteractionsList = [...interactions, { ...newInteraction, id: `temp-${Date.now()}` }].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setInteractions(newInteractionsList);
    setNewInteraction(initialNewInteraction);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (contact) {
        onSave({ ...contact, ...formData });
    } else {
        onSave(formData);
    }
    // Don't close sheet automatically, page will handle it.
  };

  const title = contact ? 'Editar Contacto' : 'Crear Nuevo Contacto';
  const description = contact 
    ? 'Actualice la información del contacto y su historial.'
    : 'Complete la información para registrar un nuevo cliente o proveedor.';
    
  const interactionIcons: Record<Interaction['type'], React.ReactNode> = {
      'Llamada': <Phone className="h-4 w-4" />,
      'Reunión': <Users className="h-4 w-4" />,
      'Email': <Mail className="h-4 w-4" />,
      'Acuerdo': <Handshake className="h-4 w-4" />,
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <Tabs defaultValue={defaultTab} key={contact?.id || 'new'} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="history" disabled={!contact}>Historial</TabsTrigger>
          </TabsList>
          <TabsContent value="details">
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
                    onValueChange={(value: 'client' | 'supplier') => setFormData(p => ({...p, type: value}))}
                    value={formData.type}
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
                <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="tags" className="text-right pt-2">
                        Etiquetas
                    </Label>
                    <div className="col-span-3">
                        <Input 
                            id="tags"
                            placeholder="Escriba y presione Enter"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagInputKeyDown}
                        />
                        <div className="flex flex-wrap gap-2 mt-2">
                            {formData.tags?.map(tag => (
                                <Badge key={tag} variant="secondary">
                                    {tag}
                                    <button type="button" onClick={() => removeTag(tag)} className="ml-2 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>
              </div>
              <SheetFooter>
                <SheetClose asChild>
                  <Button type="button" variant="outline">
                    Cerrar
                  </Button>
                </SheetClose>
                <Button type="submit">Guardar Contacto</Button>
              </SheetFooter>
            </form>
          </TabsContent>
          <TabsContent value="history">
            <div className="py-4 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-medium">Nueva Interacción</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                type="date"
                                value={newInteraction.date}
                                onChange={(e) => setNewInteraction(p => ({ ...p, date: e.target.value }))}
                            />
                            <Select
                                value={newInteraction.type}
                                onValueChange={(value: Interaction['type']) => setNewInteraction(p => ({...p, type: value}))}
                            >
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Llamada">Llamada</SelectItem>
                                    <SelectItem value="Reunión">Reunión</SelectItem>
                                    <SelectItem value="Email">Email</SelectItem>
                                    <SelectItem value="Acuerdo">Acuerdo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Textarea
                            placeholder="Añada notas sobre la interacción..."
                            value={newInteraction.notes}
                            onChange={(e) => setNewInteraction(p => ({...p, notes: e.target.value}))}
                        />
                        <Button onClick={handleAddInteraction} disabled={!newInteraction.notes}>
                            <PlusCircle className="mr-2 h-4 w-4"/>
                            Agregar al Historial
                        </Button>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <h4 className="font-medium text-center">Historial de Contacto</h4>
                    {interactions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No hay interacciones registradas.</p>}
                    <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                        {interactions.map(int => (
                            <div key={int.id} className="flex items-start gap-4">
                                <div className="flex flex-col items-center">
                                    <span className="p-2 bg-muted rounded-full">
                                        {interactionIcons[int.type]}
                                    </span>
                                    <div className="h-full border-l-2 border-dashed my-1"></div>
                                </div>
                                <div className="flex-1 pb-4 border-b">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold">{int.type}</p>
                                        <p className="text-xs text-muted-foreground">{format(parseISO(int.date), 'dd-MM-yyyy', { locale: es })}</p>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">{int.notes}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
