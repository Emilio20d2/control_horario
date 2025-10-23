'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SendHorizonal, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';

// Mock data - replace with actual data from your backend
const conversations = [
    { id: '1', name: 'Alba Piñeiro Perez', lastMessage: 'Hola, tengo una duda sobre mis horas de la semana pasada.', unread: 2, avatarFallback: 'AP' },
    { id: '2', name: 'Alberto Biel Gaudes', lastMessage: 'Perfecto, gracias por la aclaración.', unread: 0, avatarFallback: 'AB' },
    { id: '3', name: 'Ana Gomez Alaman', lastMessage: 'Quería saber si es posible cambiar el turno del viernes.', unread: 1, avatarFallback: 'AG' },
    { id: '4', name: 'Carla Lopez', lastMessage: 'Recibido, gracias.', unread: 0, avatarFallback: 'CL' },
];

const messagesData: Record<string, { id: string; text: string; sender: 'me' | 'them'; timestamp: string }[]> = {
    '1': [
        { id: 'm1', text: 'Hola, tengo una duda sobre mis horas de la semana pasada.', sender: 'them', timestamp: '10:30' },
        { id: 'm2', text: 'Claro, Alba. Dime cuál es tu consulta.', sender: 'me', timestamp: '10:32' },
    ],
    '2': [
        { id: 'm3', text: 'Hola, ¿está todo correcto con mi fichaje del lunes?', sender: 'them', timestamp: 'Ayer' },
        { id: 'm4', text: 'Sí, Alberto, lo hemos revisado y está todo en orden. No te preocupes.', sender: 'me', timestamp: 'Ayer' },
        { id: 'm5', text: 'Perfecto, gracias por la aclaración.', sender: 'them', timestamp: 'Ayer' },
    ],
    '3': [
        { id: 'm6', text: 'Quería saber si es posible cambiar el turno del viernes.', sender: 'them', timestamp: 'Hace 2 días' },
    ],
    '4': [],
};

export default function MessagesPage() {
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>('1');
    const isMobile = useIsMobile();

    const selectedConversation = conversations.find(c => c.id === selectedConversationId);
    const messages = selectedConversationId ? messagesData[selectedConversationId] : [];

    const ConversationList = () => (
        <Card className="flex flex-col h-[calc(100vh-8rem)]">
            <div className="p-4 border-b">
                <h2 className="text-xl font-bold font-headline">Bandeja de Entrada</h2>
            </div>
            <ScrollArea className="flex-1">
                <div className="flex flex-col">
                    {conversations.map((conv) => (
                        <button
                            key={conv.id}
                            className={cn(
                                'flex items-center gap-4 p-4 text-left w-full border-b transition-colors',
                                selectedConversationId === conv.id ? 'bg-muted' : 'hover:bg-muted/50'
                            )}
                            onClick={() => setSelectedConversationId(conv.id)}
                        >
                            <Avatar>
                                <AvatarFallback>{conv.avatarFallback}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 truncate">
                                <p className="font-semibold">{conv.name}</p>
                                <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                            </div>
                            {conv.unread > 0 && (
                                <div className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {conv.unread}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </Card>
    );
    
    const ChatView = () => (
         <Card className="flex flex-col h-[calc(100vh-8rem)]">
            {selectedConversation ? (
                <>
                    <div className="flex items-center gap-4 p-4 border-b">
                        {isMobile && (
                             <Button variant="ghost" size="icon" onClick={() => setSelectedConversationId(null)}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        )}
                        <Avatar>
                             <AvatarFallback>{selectedConversation.avatarFallback}</AvatarFallback>
                        </Avatar>
                        <h2 className="text-xl font-bold font-headline">{selectedConversation.name}</h2>
                    </div>
                    <ScrollArea className="flex-1 p-4 space-y-4">
                        {messages.map(message => (
                            <div key={message.id} className={cn('flex items-end gap-2', message.sender === 'me' ? 'justify-end' : 'justify-start')}>
                                <div className={cn(
                                    'max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg',
                                    message.sender === 'me' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                )}>
                                    <p>{message.text}</p>
                                    <p className="text-xs opacity-70 mt-1 text-right">{message.timestamp}</p>
                                </div>
                            </div>
                        ))}
                    </ScrollArea>
                    <div className="p-4 border-t">
                        <div className="relative">
                            <Input placeholder="Escribe tu mensaje..." className="pr-12 h-10" />
                            <Button type="submit" size="icon" className="absolute top-1/2 right-2 -translate-y-1/2 h-8 w-8">
                                <SendHorizonal className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-muted-foreground">Selecciona una conversación para ver los mensajes.</p>
                </div>
            )}
        </Card>
    );

    if (isMobile) {
        return (
            <div className="p-2 md:p-4">
                {selectedConversationId ? <ChatView /> : <ConversationList />}
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 h-full">
            <div className="col-span-1">
                 <ConversationList />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
                <ChatView />
            </div>
        </div>
    );
}
