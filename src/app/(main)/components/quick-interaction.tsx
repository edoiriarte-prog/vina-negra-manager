
"use client";

import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ChevronsUpDown, Check, MessageSquarePlus, Send } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Contact, Interaction } from '@/lib/types';
import { contacts as initialContacts } from '@/lib/data';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useSidebar } from '@/components/ui/sidebar';

export function QuickInteraction() {
  const [contacts, setContacts] = useLocalStorage<Contact[]>('contacts', initialContacts);
  const [open, setOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const { state } = useSidebar();
  
  const handleSaveInteraction = () => {
    if (!selectedContact || !notes.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor, seleccione un contacto y añada una nota.',
      });
      return;
    }

    const newInteraction: Interaction = {
      id: `int-${Date.now()}`,
      date: new Date().toISOString(),
      type: 'Llamada', // Defaulting to 'Llamada' for quick-add
      notes: notes.trim(),
    };

    setContacts(prev => prev.map(c => 
        c.id === selectedContact.id 
        ? { ...c, interactions: [...(c.interactions || []), newInteraction].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) } 
        : c
    ));

    toast({
      title: 'Interacción Guardada',
      description: `Nota agregada al historial de ${selectedContact.name}.`,
    });

    // Reset form
    setSelectedContact(null);
    setNotes('');
  };

  const ContactSelector = () => (
     <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedContact
            ? selectedContact.name
            : "Seleccione un contacto..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar contacto..." />
          <CommandList>
            <CommandEmpty>No se encontró el contacto.</CommandEmpty>
            <CommandGroup>
              {contacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  value={contact.name}
                  onSelect={() => {
                    setSelectedContact(contact);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedContact?.id === contact.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {contact.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  if (state === 'collapsed') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="w-full justify-center p-2 text-sm size-10">
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" className="p-0 w-80">
          <div className="p-4 space-y-4">
             <h4 className="font-medium leading-none">Agregar Nota Rápida</h4>
             <p className="text-sm text-muted-foreground">
                Seleccione un contacto y agregue una nota a su historial.
            </p>
            <ContactSelector />
            <Textarea 
                placeholder="Escriba su nota aquí..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px]"
            />
            <Button onClick={handleSaveInteraction} className="w-full" disabled={!selectedContact || !notes.trim()}>
                <Send className="mr-2 h-4 w-4" />
                Guardar Nota
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="px-3 py-2 space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground px-1">Nota Rápida</h4>
        <ContactSelector />
        <Textarea 
            placeholder="Añadir nota..."
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
        />
        <Button onClick={handleSaveInteraction} size="sm" className="w-full" disabled={!selectedContact || !notes.trim()}>
            <Send className="mr-2 h-4 w-4" />
            Guardar
        </Button>
    </div>
  );
}

