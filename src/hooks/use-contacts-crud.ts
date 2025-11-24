import { Contact, Interaction } from '@/lib/types';
import { useFirebase, setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

export function useContactsCRUD() {
    const { firestore } = useFirebase();

    // 1. CREAR CONTACTO
    const createContact = async (contact: Omit<Contact, "id">) => {
        if (!firestore) return;
        // Asignamos un ID si no viene (es un documento nuevo)
        const newContact = { ...contact, interactions: contact.interactions || [] };
        
        await addDocumentNonBlocking(collection(firestore, 'contacts'), newContact);
        console.log("Contacto creado exitosamente en Firebase.");
    };

    // 2. ACTUALIZAR CONTACTO
    const updateContact = async (id: string, data: Partial<Contact>) => {
        if (!firestore) return;
        const contactRef = doc(firestore, 'contacts', id);
        
        // Excluimos 'id' y enviamos el resto de los datos
        const { id: _, ...dataToUpdate } = data;
        await setDocumentNonBlocking(contactRef, dataToUpdate, { merge: true });
        console.log(`Contacto ${id} actualizado exitosamente.`);
    };

    // 3. ELIMINAR CONTACTO
    const deleteContact = async (id: string) => {
        if (!firestore) return;
        await deleteDocumentNonBlocking(doc(firestore, 'contacts', id));
        console.log(`Contacto ${id} eliminado exitosamente.`);
    };

    // 4. ELIMINAR INTERACCIÓN (Función de ayuda para el Sheet)
    const handleDeleteInteraction = async (contactId: string, interactionId: string, currentInteractions: Interaction[]) => {
        if (!firestore) return;
        
        const updatedInteractions = currentInteractions.filter(i => i.id !== interactionId);
        
        const contactRef = doc(firestore, 'contacts', contactId);
        await updateContact(contactId, { interactions: updatedInteractions });
    };

    return {
        createContact,
        updateContact,
        deleteContact,
        handleDeleteInteraction: handleDeleteInteraction // Usamos una función de ayuda separada para claridad
    };
}