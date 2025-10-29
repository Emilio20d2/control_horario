
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SendHorizonal, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useDataProvider } from '@/hooks/use-data-provider';
import { collection, query, orderBy, addDoc, serverTimestamp, setDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { db } from '@/lib/firebase';
import type { Message } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';


export default function MyMessagesPage() {
    const { employeeRecord, loading, conversations } = useDataProvider();
    const [newMessage, setNewMessage] = useState('');
    const conversationId = employeeRecord?.id;
    const viewportRef = useRef<HTMLDivElement>(null);
    const autoReplyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !conversationId || !employeeRecord) return;
        
        const messageText = newMessage;
        setNewMessage('');

        await sendMessage(messageText);
        
        if (autoReplyTimeoutRef.current) {
            clearTimeout(autoReplyTimeoutRef.current);
        }

        autoReplyTimeoutRef.current = setTimeout(() => {
            const autoReplyText = `Hola ${employeeRecord.name.split(' ')[0]}, hemos recibido tu consulta. Un responsable la revisará y te responderá por este mismo medio tan pronto como sea posible. Gracias por tu paciencia.`;
            sendBotMessage(autoReplyText, true);
        }, 30000); // 30 second delay
    };

    const sendMessage = async (text: string) => {
        if (!conversationId || !employeeRecord) return;
        
        const messagesColRef = collection(db, 'conversations', conversationId, 'messages');
        const userMessageData = {
            text: text,
            senderId: employeeRecord.id,
            timestamp: serverTimestamp()
        };

        const convDocRef = doc(db, 'conversations', conversationId);
        const convDoc = await getDoc(convDocRef);

        if (!convDoc.exists()) {
            await setDoc(convDocRef, {
                employeeId: employeeRecord.id,
                employeeName: employeeRecord.name,
                lastMessageText: text,
                lastMessageTimestamp: serverTimestamp(),
                unreadByAdmin: true,
                unreadByEmployee: false,
            });
        } else {
             await updateDoc(convDocRef, {
                lastMessageText: text,
                lastMessageTimestamp: serverTimestamp(),
                unreadByAdmin: true,
                unreadByEmployee: false,
            });
        }

        await addDoc(messagesColRef, userMessageData);
    };

    const sendBotMessage = async (text: string, unreadByEmployee: boolean) => {
        if (!conversationId) return;
        const messagesColRef = collection(db, 'conversations', conversationId, 'messages');
        const botMessageData = {
            text,
            senderId: 'admin',
            timestamp: serverTimestamp()
        };
        await addDoc(messagesColRef, botMessageData);

        const convDocRef = doc(db, 'conversations', conversationId);
        await updateDoc(convDocRef, {
            lastMessageText: text,
            lastMessageTimestamp: serverTimestamp(),
            unreadByEmployee: unreadByEmployee,
        });
    }
    
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

    const renderChatHeader = () => {
        return (
            <div className="flex items-center gap-4">
                <Avatar className="border-2 border-foreground"><AvatarFallback>D</AvatarFallback></Avatar>
                <div>
                    <h2 className="text-lg font-bold">Dirección</h2>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        Este servicio de mensajería es exclusivamente para incidencias relacionadas con el control de horas semanales o con esta aplicación.
                        {'\n'}Para cualquier otra consulta, ponte en contacto directamente con Dirección.
                    </p>
                </div>
            </div>
        )
    }
    
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 h-full">
            <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold tracking-tight font-headline">
                    Mis Mensajes
                </h1>
            </div>
            
            <Card className="flex flex-col flex-grow h-[calc(100vh-12rem)]">
                <div className="p-4 border-b">
                    {renderChatHeader()}
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
                                    'max-w-[90%] p-3 rounded-lg',
                                    message.senderId === employeeRecord.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                )}>
                                    <p className="whitespace-pre-wrap break-words">{message.text}</p>
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
                <div className="p-4 border-t bg-background space-y-4">
                    <form onSubmit={handleSendMessage} className="relative">
                        <Input 
                            placeholder="Escribe tu mensaje para cualquier otra consulta..." 
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
