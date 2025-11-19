
'use client';

import { useMemo, useState } from 'react';
import { useMasterData, ProductCaliberAssociation } from '@/hooks/use-master-data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';

export function ProductCaliberManager() {
    const { firestore } = useFirebase();
    const { products, calibers, productCaliberAssociations } = useMasterData();
    const [openAccordion, setOpenAccordion] = useState<string[]>([]);

    const handleAssociationChange = (productName: string, caliberName: string, isChecked: boolean) => {
        if (!firestore) return;

        const currentAssociation = productCaliberAssociations.find(a => a.id === productName) || { id: productName, calibers: [] };
        let updatedCalibers;

        if (isChecked) {
            updatedCalibers = [...currentAssociation.calibers, caliberName];
        } else {
            updatedCalibers = currentAssociation.calibers.filter(c => c !== caliberName);
        }

        const docRef = doc(firestore, 'productCaliberAssociations', productName);
        setDoc(docRef, { calibers: updatedCalibers }, { merge: true });
    };

    const sortedCalibers = useMemo(() => {
        return [...calibers].sort((a,b) => {
            const numA = parseInt(a.code, 10);
            const numB = parseInt(b.code, 10);
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            return a.name.localeCompare(b.name);
        });
    }, [calibers]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-lg">Asociar Calibres a Productos</CardTitle>
                <CardDescription>Seleccione un producto para ver y asignar los calibres que le corresponden.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion 
                    type="multiple" 
                    value={openAccordion} 
                    onValueChange={setOpenAccordion}
                    className="w-full"
                >
                    {products.map(product => {
                        const associated = productCaliberAssociations.find(a => a.id === product)?.calibers || [];
                        return (
                            <AccordionItem value={product} key={product}>
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center justify-between w-full pr-4">
                                        <span className="font-medium">{product}</span>
                                        <span className="text-sm text-muted-foreground">{associated.length} de {calibers.length} calibres</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 border rounded-md bg-muted/20">
                                        {sortedCalibers.map(caliber => (
                                            <div key={caliber.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`${product}-${caliber.id}`}
                                                    checked={associated.includes(caliber.name)}
                                                    onCheckedChange={(checked) => handleAssociationChange(product, caliber.name, !!checked)}
                                                />
                                                <Label
                                                    htmlFor={`${product}-${caliber.id}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                >
                                                    {caliber.name} ({caliber.code})
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            </CardContent>
        </Card>
    );
}

