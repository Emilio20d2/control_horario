
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { clearAllCheckmarks } from '@/lib/actions/dataCleanupActions';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useDataProvider } from '@/hooks/use-data-provider';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { collection, deleteDoc, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';


function ConversationCleanupManager() {
    const { conversations, loading, refreshData } = useDataProvider();
    const { toast } = useToast();
    const { reauthenticateWithPassword } = useAuth();
    
    const [selectedConversations, setSelectedConversations] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [password, setPassword] = useState('');

    const handleConversationSelect = (id: string, checked: boolean) => {
        setSelectedConversations(prev => 
            checked ? [...prev, id] : prev.filter(convId => convId !== id)
        );
    };

    const handleDelete = async () => {
        if (selectedConversations.length === 0) {
            toast({ title: 'Ninguna conversación seleccionada', description: 'Por favor, selecciona al menos una conversación para eliminar.', variant: 'destructive' });
            return;
        }
        if (!password) {
            toast({ title: 'Contraseña requerida', description: 'Por favor, introduce tu contraseña para confirmar.', variant: 'destructive' });
            return;
        }
        
        setIsDeleting(true);

        const isAuthenticated = await reauthenticateWithPassword(password);
        if (!isAuthenticated) {
            toast({ title: 'Error de autenticación', description: 'La contraseña no es correcta.', variant: 'destructive' });
            setIsDeleting(false);
            return;
        }
        
        try {
            const batch = writeBatch(db);
            let messagesDeletedCount = 0;

            for (const convId of selectedConversations) {
                const messagesRef = collection(db, 'conversations', convId, 'messages');
                const messagesSnapshot = await getDocs(messagesRef);

                messagesSnapshot.forEach(doc => {
                    batch.delete(doc.ref);
                    messagesDeletedCount++;
                });

                const convRef = doc(db, 'conversations', convId);
                batch.delete(convRef);
            }

            await batch.commit();
            
            toast({
                title: 'Conversaciones Eliminadas',
                description: `${selectedConversations.length} conversación(es) y ${messagesDeletedCount} mensaje(s) eliminados.`,
                variant: 'destructive',
            });
            refreshData(); // Refresh the data provider to update the UI
            setSelectedConversations([]);

        } catch (error) {
            console.error("Error deleting conversations:", error);
            toast({
                title: 'Error al eliminar',
                description: error instanceof Error ? error.message : 'No se pudieron eliminar las conversaciones.',
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
            setPassword('');
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Limpieza de Conversaciones</CardTitle>
                <CardDescription>
                    Selecciona y elimina permanentemente las conversaciones deseadas. Esta acción es irreversible.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <ScrollArea className="h-72 w-full rounded-md border">
                    <div className="p-4">
                        {loading ? <Loader2 className="animate-spin" /> : conversations.map(conv => (
                            <div key={conv.id} className="flex items-center space-x-2 py-2">
                                <Checkbox 
                                    id={`conv-${conv.id}`}
                                    onCheckedChange={(checked) => handleConversationSelect(conv.id, !!checked)}
                                    checked={selectedConversations.includes(conv.id)}
                                />
                                <label htmlFor={`conv-${conv.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {conv.employeeName}
                                </label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <AlertDialog onOpenChange={(open) => !open && setPassword('')}>
                    <AlertDialogTrigger asChild>
                         <Button variant="destructive" className="w-full" disabled={selectedConversations.length === 0}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar Conversaciones Seleccionadas ({selectedConversations.length})
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción eliminará permanentemente las <strong>{selectedConversations.length}</strong> conversaciones seleccionadas y todos sus mensajes. No se puede deshacer.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                         <div className="space-y-2 py-2">
                            <Label htmlFor="password-delete-conv">Contraseña de Administrador</Label>
                            <Input id="password-delete-conv" type="password" placeholder="Introduce tu contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sí, eliminar'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}


export function DataCleanupManager() {

    return (
        <>
            <ConversationCleanupManager />
        </>
    );
}
