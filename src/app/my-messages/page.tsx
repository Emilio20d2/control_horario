
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { generateBotResponse } from '@/ai/flows/message-bot-flow';

export default function MyMessagesPage() {
    const { employeeRecord, loading, conversations } = useDataProvider();
    const [newMessage, setNewMessage] = useState('');
    const conversationId = employeeRecord?.id;

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

        await addDoc(messagesColRef, userMessageData);

        // Call the AI bot for a response
        try {
            const botResponse = await generateBotResponse({
                employeeName: employeeRecord.name,
                messages: [
                    ...formattedMessages.map(m => ({ text: m.text, sender: m.senderId === employeeRecord.id ? 'user' : 'bot' })),
                    { text: messageText, sender: 'user' }
                ]
            });
            
            if (botResponse.responseText) {
                const botMessageData = {
                    text: botResponse.responseText,
                    senderId: 'admin', // Bot responds as admin
                    timestamp: serverTimestamp()
                };
                await addDoc(messagesColRef, botMessageData);
                // Update conversation with bot's last message
                await updateDoc(convDocRef, {
                    lastMessageText: botResponse.responseText,
                    lastMessageTimestamp: serverTimestamp(),
                    unreadByEmployee: true, // Mark as unread for the employee to see
                    unreadByAdmin: false, // Bot's own message is considered "read" by admin
                });
            }
        } catch (error) {
            console.error("Error getting bot response:", error);
            // Optionally, send a fallback message
            await addDoc(messagesColRef, {
                text: "He tenido un problema y no puedo responder ahora mismo. Un responsable revisará tu mensaje pronto.",
                senderId: 'admin',
                timestamp: serverTimestamp()
            });
        }
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
                   Recibirás una respuesta inicial de nuestro asistente virtual, Z-Assist. Si tu consulta necesita atención personalizada, un responsable de Dirección la revisará y te contestará por este mismo chat. Este servicio es para incidencias con el control de horas o la aplicación.
                </AlertDescription>
            </Alert>
            <Card className="flex flex-col flex-grow h-[calc(100vh-16rem)]">
                <div className="flex items-center gap-4 p-4 border-b">
                    <Avatar>
                        <AvatarFallback>D</AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-lg font-bold">Dirección</h2>
                        <p className="text-sm text-muted-foreground">Conversación sobre tus incidencias</p>
                    </div>
                </div>
                <ScrollArea className="flex-1 p-4 space-y-4">
                     {messagesLoading ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                     ) : (
                        formattedMessages.map((message, index) => (
                            <div key={index} className={cn('flex items-end gap-2', message.senderId === employeeRecord.id ? 'justify-end' : 'justify-start')}>
                                {message.senderId !== employeeRecord.id && <Avatar className="h-8 w-8"><AvatarFallback>D</AvatarFallback></Avatar>}
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

