"use client";

import { useState, useEffect, KeyboardEvent } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Iconos
import { 
    X, PlusCircle, Users, Mail, Phone, Handshake, 
    FileText, Trash2, MapPin, Tag, User 
} from 'lucide-react';

// Componentes UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Tipos
// Nota: ContactType es la definición del string, Contact es el objeto completo
import { Contact, Interaction, ContactType } from '@/lib/types';

type NewContactSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (contact: Contact | Omit<Contact, 'id'>, newInteraction?: Omit<Interaction, 'id'>) => void;
  contact: Contact | null;
  defaultTab?: string;
  onDeleteInteraction: (contactId: string, interactionId: string) => void;
};

const contactTypes: { id: ContactType, label: string }[] = [
    { id: 'client', label: 'Cliente' },
    { id: 'supplier', label: 'Proveedor' },
    { id: 'carrier', label: 'Transportista' },
    { id: 'other_income', label: 'Otros Ingresos' },
    { id: 'other_expense', label: 'Otros Egresos' },
];

const initialNewInteraction: Omit<Interaction, 'id'> = {
  date: format(new Date(), 'yyyy-MM-dd'),
  type: 'Llamada',
  notes: '',
};

// Función auxiliar para inicializar datos (CORREGIDO: ELIMINADA LA ASÉRCIÓN ESTRICTA AQUÍ)
const getInitialFormData = (contact: Contact | null): Omit<Contact, 'id' | 'interactions'> => {
  if (contact) {
    // Normalización: si viene como string simple, lo hace array
    const contactType = Array.isArray(contact.type)
        ? contact.type
        : (contact.type === 'both' ? ['client', 'supplier'] : (contact.type ? [contact.type] : []));
      
    return {
      name: contact.name,
      rut: contact.rut,
      email: contact.email,
      contactPerson: contact.contactPerson,
      address: contact.address,
      commune: contact.commune,
      // FIX: Quitamos 'as ContactType[]'. El tipo ahora es 'string[] | ContactType[]'
      type: contactType,
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
    type: [],
    tags: []
  }
}

// --- ESTILOS REUTILIZABLES PARA MODO OSCURO ---
const inputDarkClass = "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-blue-600";
const cardDarkClass = "bg-slate-900 border-slate-800 shadow-sm";
const labelDarkClass = "text-slate-300";

export function NewContactSheet({ isOpen, onOpenChange, onSave, contact, defaultTab = 'details', onDeleteInteraction }: NewContactSheetProps) {
  const [formData, setFormData] = useState<Omit<Contact, 'id' | 'interactions'>>(getInitialFormData(contact));
  const [tagInput, setTagInput] = useState('');
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [newInteraction, setNewInteraction] = useState<Omit<Interaction, 'id'>>(initialNewInteraction);

  // 1. Cargar datos al abrir
  useEffect(() => {
    if (isOpen) {
      const initialData = getInitialFormData(contact);
      setFormData(initialData);
      setInteractions(contact?.interactions?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || []);
      setTagInput('');
      setNewInteraction(initialNewInteraction);
    }
  }, [contact, isOpen]);
  
  // 2. Sincronizar historial
  useEffect(() => {
    setInteractions(contact?.interactions?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || []);
  }, [contact?.interactions]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    // @ts-ignore: Usamos ignore temporalmente para businessLine y otros campos dinámicos
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
    setNewInteraction(initialNewInteraction);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (contact) {
        onSave({ ...contact, ...formData, interactions: interactions });
    } else {
        onSave(formData);
    }
  };

  // FUNCIÓN CORREGIDA PARA ELIMINAR LOS ERRORES DE TYPING EN LA LÍNEA 148
  const handleTypeChange = (typeId: ContactType) => {
    setFormData(prev => {
        // Aseguramos que currentTypes sea un array de strings para la manipulación
        const currentTypes: string[] = Array.isArray(prev.type) 
            ? prev.type as string[] // Si es array, lo forzamos a array de strings
            : (prev.type ? [prev.type as string] : []); // Si es string simple, lo ponemos en array

        const newTypes = currentTypes.includes(typeId)
            ? currentTypes.filter(t => t !== typeId)
            : [...currentTypes, typeId];
            
        // El tipo de Contact es flexible (string[] | ContactType[]), por lo que esto funciona
        return { ...prev, type: newTypes };
    });
  }

  const interactionIcons: Record<Interaction['type'], React.ReactNode> = {
      'Llamada': <Phone className="h-4 w-4" />,
      'Reunión': <Users className="h-4 w-4" />,
      'Email': <Mail className="h-4 w-4" />,
      'Acuerdo': <Handshake className="h-4 w-4" />,
      'Cotizacion': <FileText className="h-4 w-4" />,
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full flex flex-col h-full p-0 gap-0 bg-slate-950 border-l border-slate-800 text-slate-100">
        
        {/* HEADER */}
        <SheetHeader className="px-6 py-4 bg-slate-950 border-b border-slate-800 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${contact ? 'bg-blue-900/50 text-blue-400' : 'bg-emerald-900/50 text-emerald-400'}`}>
                {contact ? <User className="h-6 w-6" /> : <PlusCircle className="h-6 w-6" />}
            </div>
            <div>
                <SheetTitle className="text-white">{contact ? 'Editar Contacto' : 'Crear Nuevo Contacto'}</SheetTitle>
                <SheetDescription className="text-slate-400">
                    {contact ? 'Gestión de información y eventos.' : 'Registro de nuevo socio comercial.'}
                </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-950">
            <Tabs defaultValue={defaultTab} key={contact?.id || 'new'} className="w-full h-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-900 border border-slate-800">
                <TabsTrigger value="details" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">Detalles Generales</TabsTrigger>
                <TabsTrigger value="history" disabled={!contact} className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">Historial & Eventos</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-0 focus-visible:ring-0">
                <form id="contact-form" onSubmit={handleSubmit} className="space-y-6">
                
                {/* ID Card */}
                <div className={`space-y-4 p-4 rounded-lg border ${cardDarkClass}`}>
                    <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                        <User className="h-4 w-4" /> Información de Identidad
                    </h3>
                    <div className="h-px bg-slate-800" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="rut" className={labelDarkClass}>RUT <span className="text-red-500">*</span></Label>
                            <Input id="rut" name="rut" placeholder="12.345.678-9" value={formData.rut} onChange={handleInputChange} required className={inputDarkClass} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name" className={labelDarkClass}>Razón Social <span className="text-red-500">*</span></Label>
                            <Input id="name" name="name" placeholder="Empresa SpA" value={formData.name} onChange={handleInputChange} required className={inputDarkClass}/>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className={labelDarkClass}>Email <span className="text-red-500">*</span></Label>
                            <Input id="email" name="email" type="email" placeholder="contacto@empresa.com" value={formData.email} onChange={handleInputChange} required className={inputDarkClass}/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contactPerson" className={labelDarkClass}>Persona de Contacto</Label>
                            <Input id="contactPerson" name="contactPerson" placeholder="Juan Pérez" value={formData.contactPerson || ''} onChange={handleInputChange} className={inputDarkClass}/>
                        </div>
                    </div>
                </div>

                {/* Location Card */}
                <div className={`space-y-4 p-4 rounded-lg border ${cardDarkClass}`}>
                      <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Ubicación
                    </h3>
                    <div className="h-px bg-slate-800" />
                    <div className="space-y-2">
                        <Label htmlFor="address" className={labelDarkClass}>Dirección Comercial</Label>
                        <Input id="address" name="address" placeholder="Av. Principal 123, Of 404" value={formData.address || ''} onChange={handleInputChange} className={inputDarkClass} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="commune" className={labelDarkClass}>Comuna / Ciudad</Label>
                        <Input id="commune" name="commune" placeholder="Santiago" value={formData.commune || ''} onChange={handleInputChange} className={inputDarkClass} />
                    </div>
                </div>

                {/* Classification Card */}
                <div className={`space-y-4 p-4 rounded-lg border ${cardDarkClass}`}>
                    <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                        <Tag className="h-4 w-4" /> Clasificación
                    </h3>
                    <div className="h-px bg-slate-800" />
                    
                    <div className="space-y-3">
                        <Label className={labelDarkClass}>Tipo de Relación</Label>
                        <div className="flex flex-wrap gap-2">
                            {contactTypes.map(typeOption => {
                                const isSelected = formData.type?.includes(typeOption.id);
                                return (
                                    <div 
                                        key={typeOption.id}
                                        onClick={() => handleTypeChange(typeOption.id)}
                                        className={`
                                            cursor-pointer px-3 py-1.5 rounded-md text-xs font-medium border transition-all select-none
                                            ${isSelected 
                                                ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-900/20' 
                                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-slate-200'}
                                        `}
                                    >
                                        {typeOption.label}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="space-y-2 pt-2">
                        <Label htmlFor="tags" className={labelDarkClass}>Etiquetas</Label>
                        <div className="relative">
                            <Input
                                id="tags"
                                placeholder="Escriba etiqueta y Enter..."
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagInputKeyDown}
                                className={`${inputDarkClass} pr-10`}
                            />
                            <Tag className="absolute right-3 top-2.5 h-4 w-4 text-slate-500" />
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2 min-h-[24px]">
                            {formData.tags?.map(tag => (
                                <Badge key={tag} variant="secondary" className="pl-2 pr-1 py-1 bg-slate-800 text-slate-200 hover:bg-slate-700">
                                    {tag}
                                    <button 
                                        type="button"
                                        onClick={() => removeTag(tag)} 
                                        className="ml-2 hover:bg-slate-600 rounded-full p-0.5 transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>

                </form>
            </TabsContent>

            <TabsContent value="history" className="h-full flex flex-col space-y-4 mt-0">
                {/* New Interaction */}
                <Card className="border-l-4 border-l-blue-500 shadow-sm bg-slate-900 border-slate-800">
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Label className="text-xs text-slate-500 mb-1 block">Fecha</Label>
                                <Input
                                    type="date"
                                    className={`${inputDarkClass} h-9`}
                                    value={newInteraction.date}
                                    onChange={(e) => setNewInteraction(p => ({ ...p, date: e.target.value }))}
                                />
                            </div>
                             <div className="flex-1">
                                <Label className="text-xs text-slate-500 mb-1 block">Tipo</Label>
                                <Select
                                    value={newInteraction.type}
                                    onValueChange={(value: Interaction['type']) => setNewInteraction(p => ({...p, type: value}))}
                                >
                                    <SelectTrigger className={`${inputDarkClass} h-9`}>
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                                        <SelectItem value="Llamada">Llamada</SelectItem>
                                        <SelectItem value="Reunión">Reunión</SelectItem>
                                        <SelectItem value="Email">Email</SelectItem>
                                        <SelectItem value="Acuerdo">Acuerdo</SelectItem>
                                        <SelectItem value="Cotizacion">Cotización</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Textarea
                            placeholder="Detalles de la interacción..."
                            value={newInteraction.notes}
                            onChange={(e) => setNewInteraction(p => ({...p, notes: e.target.value}))}
                            className={`min-h-[80px] text-sm resize-none ${inputDarkClass}`}
                        />
                        <Button onClick={handleAddInteraction} disabled={!newInteraction.notes} className="w-full bg-blue-600 hover:bg-blue-500 text-white" size="sm">
                            <PlusCircle className="mr-2 h-4 w-4"/>
                            Registrar Evento
                        </Button>
                    </CardContent>
                </Card>

                <div className="h-px bg-slate-800 my-2" />

                {/* Timeline */}
                <div className="flex-1 overflow-y-auto pr-2 pb-10">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 pl-1">Historial</h4>
                    
                    {interactions.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-600 opacity-60">
                            <FileText className="h-10 w-10 mb-2 stroke-1" />
                            <p className="text-sm">Sin registros.</p>
                        </div>
                    )}

                    <div className="relative pl-4 space-y-8 before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                        {interactions.map(int => (
                            <div key={int.id} className="relative flex items-start group">
                                <div className="absolute left-0 top-1 flex items-center justify-center h-8 w-8 rounded-full bg-slate-950 border-2 border-slate-700 shadow-sm z-10 group-hover:border-blue-500 group-hover:text-blue-500 transition-colors text-slate-400">
                                    {interactionIcons[int.type]}
                                </div>
                                
                                <div className="ml-12 w-full bg-slate-900 rounded-lg border border-slate-800 shadow-sm p-4 hover:border-slate-700 transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                int.type === 'Acuerdo' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/50' :
                                                int.type === 'Reunión' ? 'bg-purple-900/30 text-purple-400 border border-purple-900/50' :
                                                'bg-slate-800 text-slate-300 border border-slate-700'
                                            }`}>
                                                {int.type}
                                            </span>
                                            <span className="text-xs text-slate-500 ml-2">
                                                {format(parseISO(int.date), 'dd MMM yyyy', { locale: es })}
                                            </span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-slate-600 hover:text-red-400 hover:bg-slate-800 -mt-1 -mr-1"
                                            onClick={() => contact && onDeleteInteraction(contact.id, int.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                    <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                                        {int.notes}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </TabsContent>
            </Tabs>
        </div>

        {/* FOOTER */}
        <SheetFooter className="px-6 py-4 bg-slate-950 border-t border-slate-800 mt-auto sticky bottom-0 z-10">
            <div className="flex w-full gap-2 justify-end">
                <SheetClose asChild>
                    <Button type="button" variant="outline" className="w-1/2 sm:w-auto border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white">
                        Cancelar
                    </Button>
                </SheetClose>
                <Button 
                    type="submit" 
                    form="contact-form" 
                    className="w-1/2 sm:w-auto bg-blue-600 hover:bg-blue-500 text-white"
                >
                    {contact ? 'Guardar Cambios' : 'Crear Contacto'}
                </Button>
            </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}