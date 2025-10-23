
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SendHorizonal, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useDataProvider } from '@/hooks/use-data-provider';
import { collection, query, orderBy, addDoc, serverTimestamp, setDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase';
import type { Message } from '@/lib/types';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function MyMessagesPage() {
    const { employeeRecord, loading, conversations } = useDataProvider();
    const [newMessage, setNewMessage] = useState('');
    const conversationId = employeeRecord?.id;
    const viewportRef = useRef<HTMLDivElement>(null);


    const conversation = useMemo(() => {
        if (!conversationId) return null;
        return conversations.find(c => c.id === conversationId);
    }, [conversations, conversationId]);

    const [messagesSnapshot, messagesLoading] = useCollectionData(
        conversationId ? query(collection(db, 'conversations', conversationId, 'messages'), orderBy('timestamp', 'asc')) : null
    );

     // Effect to mark conversation as read
    useEffect(() => {
        if (conversationId && conversation?.unreadByEmployee) {
            const convRef = doc(db, 'conversations', conversationId);
            updateDoc(convRef, { unreadByEmployee: false });
        }
    }, [conversationId, conversation]);

    const formattedMessages = useMemo(() => {
        if (!messagesSnapshot) return [];
        return messagesSnapshot.map(doc => {
            const data = doc;
            return {
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate() // Convert Firestore Timestamp to Date
            } as Message;
        });
    }, [messagesSnapshot]);

    useEffect(() => {
        if (viewportRef.current) {
            viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
        }
    }, [formattedMessages, messagesLoading]);


    // Effect to send initial welcome message
    useEffect(() => {
        const sendWelcomeMessage = async () => {
            if (employeeRecord && conversationId && !messagesLoading && formattedMessages.length === 0) {
                const welcomeText = `¡Hola, ${employeeRecord.name.split(' ')[0]}! Soy Z-Assist, tu asistente virtual. Estoy aquí para ayudarte con tus consultas sobre horarios y vacaciones. ¿En qué puedo ayudarte hoy?`;
                const messagesColRef = collection(db, 'conversations', conversationId, 'messages');
                await addDoc(messagesColRef, {
                    text: welcomeText,
                    senderId: 'admin',
                    timestamp: serverTimestamp()
                });
                
                const convDocRef = doc(db, 'conversations', conversationId);
                await setDoc(convDocRef, {
                    employeeId: employeeRecord.id,
                    employeeName: employeeRecord.name,
                    lastMessageText: welcomeText,
                    lastMessageTimestamp: serverTimestamp(),
                    unreadByEmployee: true,
                }, { merge: true });
            }
        };

        sendWelcomeMessage();
    }, [employeeRecord, conversationId, messagesLoading, formattedMessages.length]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !conversationId || !employeeRecord) return;
        
        const messageText = newMessage;
        setNewMessage('');

        const messagesColRef = collection(db, 'conversations', conversationId, 'messages');
        const userMessageData = {
            text: messageText,
            senderId: employeeRecord.id,
            timestamp: serverTimestamp()
        };

        const convDocRef = doc(db, 'conversations', conversationId);
        const convDoc = await getDoc(convDocRef);

        if (!convDoc.exists()) {
            await setDoc(convDocRef, {
                employeeId: employeeRecord.id,
                employeeName: employeeRecord.name,
                lastMessageText: messageText,
                lastMessageTimestamp: serverTimestamp(),
                unreadByAdmin: true,
                unreadByEmployee: false,
            });
        } else {
             await setDoc(convDocRef, {
                lastMessageText: messageText,
                lastMessageTimestamp: serverTimestamp(),
                unreadByAdmin: true,
                unreadByEmployee: false,
            }, { merge: true });
        }

        // Send user's message
        await addDoc(messagesColRef, userMessageData);
        
        // Send auto-reply
        const autoReplyText = `Hola ${employeeRecord.name.split(' ')[0]}, hemos recibido tu consulta. Un responsable la revisará y te responderá por este mismo medio tan pronto como sea posible. Gracias por tu paciencia.`;
        const autoReplyData = {
            text: autoReplyText,
            senderId: 'admin',
            timestamp: serverTimestamp()
        };
        await addDoc(messagesColRef, autoReplyData);

        // Update conversation with bot's last message
        await updateDoc(convDocRef, {
            lastMessageText: autoReplyText,
            lastMessageTimestamp: serverTimestamp(),
            unreadByEmployee: true, // Mark as unread for the employee to see the auto-reply
        });
    };
    
    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!employeeRecord) {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6 h-full">
                 <h1 className="text-2xl font-bold tracking-tight font-headline">
                    Mis Mensajes
                </h1>
                <Card className="flex flex-col flex-grow items-center justify-center">
                    <p className="text-muted-foreground">No se ha podido encontrar tu ficha de empleado.</p>
                </Card>
            </div>
        )
    }
    
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 h-full">
            <h1 className="text-2xl font-bold tracking-tight font-headline">
                Mis Mensajes
            </h1>
             <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                   Usa este chat para comunicar a Dirección cualquier incidencia con el control de horas o la aplicación. Tu mensaje será revisado y recibirás una respuesta por este mismo medio.
                </AlertDescription>
            </Alert>
            <Card className="flex flex-col flex-grow h-[calc(100vh-16rem)]">
                <div className="flex items-center gap-4 p-4 border-b">
                    <Avatar className="border-2 border-foreground">
                        <AvatarFallback>D</AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-lg font-bold">Dirección</h2>
                        <p className="text-sm text-muted-foreground">Conversación sobre tus incidencias</p>
                    </div>
                </div>
                <ScrollArea className="flex-1 p-4 space-y-4" viewportRef={viewportRef}>
                     {messagesLoading ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                     ) : (
                        formattedMessages.map((message, index) => (
                            <div key={index} className={cn('flex items-end gap-2', message.senderId === employeeRecord.id ? 'justify-end' : 'justify-start')}>
                                {message.senderId !== employeeRecord.id && <Avatar className="h-8 w-8 border-2 border-foreground"><AvatarFallback>D</AvatarFallback></Avatar>}
                                <div className={cn(
                                    'max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg',
                                    message.senderId === employeeRecord.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                )}>
                                    <p>{message.text}</p>
                                    {message.timestamp && (
                                         <p className="text-xs opacity-70 mt-1 text-right">
                                             {format(message.timestamp, 'HH:mm')}
                                         </p>
                                    )}
                                </div>
                            </div>
                        ))
                     )}
                </ScrollArea>
                <div className="p-4 border-t bg-background">
                     <form onSubmit={handleSendMessage} className="relative">
                        <Input 
                            placeholder="Escribe tu mensaje..." 
                            className="pr-12 h-10" 
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />
                        <Button type="submit" size="icon" className="absolute top-1/2 right-2 -translate-y-1/2 h-8 w-8">
                            <SendHorizonal className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
    );
}
