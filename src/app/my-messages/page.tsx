'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SendHorizonal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


const initialMessages: { id: string; text: string; sender: 'me' | 'them'; timestamp: string }[] = [
    { id: 'm1', text: 'Hola, tengo una duda sobre mis horas de la semana pasada.', sender: 'me', timestamp: '10:30' },
    { id: 'm2', text: 'Claro, Alba. Dime cuál es tu consulta.', sender: 'them', timestamp: '10:32' },
];

export default function MyMessagesPage() {
    const [messages, setMessages] = useState(initialMessages);
    const [newMessage, setNewMessage] = useState('');

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '') return;

        const message = {
            id: `m${messages.length + 1}`,
            text: newMessage,
            sender: 'me' as const,
            timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages(prev => [...prev, message]);
        setNewMessage('');
    };
    
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 h-full">
            <h1 className="text-2xl font-bold tracking-tight font-headline">
                Mis Mensajes
            </h1>
            <Card className="flex flex-col flex-grow h-[calc(100vh-12rem)]">
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
                     {messages.map(message => (
                        <div key={message.id} className={cn('flex items-end gap-2', message.sender === 'me' ? 'justify-end' : 'justify-start')}>
                             {message.sender === 'them' && <Avatar className="h-8 w-8"><AvatarFallback>D</AvatarFallback></Avatar>}
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