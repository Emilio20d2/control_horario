

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SendHorizonal, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useDataProvider } from '@/hooks/use-data-provider';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, onSnapshot, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Conversation, Message } from '@/lib/types';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';

export default function MessagesPage() {
    const { employees, conversations, loading: dataLoading, refreshData } = useDataProvider();
    const { appUser } = useAuth();
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const isMobile = useIsMobile();
    const viewportRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(true);

    const selectedConversation = conversations.find(c => c.id === selectedConversationId);

    // Effect to fetch messages for the selected conversation
    useEffect(() => {
        if (!selectedConversationId) {
            setMessages([]);
            return;
        }

        setMessagesLoading(true);
        const messagesQuery = query(collection(db, 'conversations', selectedConversationId, 'messages'), orderBy('timestamp', 'asc'));
        
        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    timestamp: data.timestamp?.toDate()
                } as Message;
            });
            setMessages(fetchedMessages);
            setMessagesLoading(false);
        });

        return () => unsubscribe();
    }, [selectedConversationId]);


    // Effect to scroll to the bottom of the chat
    useEffect(() => {
        if (viewportRef.current) {
            viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
        }
    }, [messages, messagesLoading]);

    // Effect to mark conversation as read for the current admin
    useEffect(() => {
        if (selectedConversationId && appUser?.id && !selectedConversation?.readBy?.includes(appUser.id)) {
            const convRef = doc(db, 'conversations', selectedConversationId);
            updateDoc(convRef, {
                readBy: arrayUnion(appUser.id)
            }).then(() => {
                refreshData();
            });
        }
    }, [selectedConversationId, selectedConversation, appUser, refreshData]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset height
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`; // Set new height, max 128px (8rem)
        }
    }, [newMessage]);


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversationId || !appUser) return;

        const messageText = newMessage;
        setNewMessage('');

        const messagesColRef = collection(db, 'conversations', selectedConversationId, 'messages');
        await addDoc(messagesColRef, {
            text: messageText,
            senderId: 'admin',
            timestamp: serverTimestamp()
        });

        const conversationDocRef = doc(db, 'conversations', selectedConversationId);
        await updateDoc(conversationDocRef, {
            lastMessageText: messageText,
            lastMessageTimestamp: serverTimestamp(),
            unreadByEmployee: true,
            readBy: [appUser.id], // The sender (admin) has read it. Reset for others.
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e as unknown as React.FormEvent);
        }
    }

    const ConversationList = () => (
        <Card className="flex flex-col h-[calc(100vh-8rem)] bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-background">
            <div className="p-4 border-b">
                <h2 className="text-xl font-bold font-headline">Bandeja de Entrada</h2>
            </div>
             {dataLoading ? (
                <div className="flex items-center justify-center flex-1">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
             ) : (
                <ScrollArea className="flex-1">
                    <div className="flex flex-col">
                        {conversations.map((conv) => {
                            const employee = employees.find(e => e.id === conv.employeeId);
                            const fallback = employee?.name.split(' ').map(n => n[0]).join('') || 'U';
                            const isUnread = appUser?.id ? !conv.readBy?.includes(appUser.id) : false;
                            
                            return (
                                <button
                                    key={conv.id}
                                    className={cn(
                                        'flex items-center gap-4 p-4 text-left w-full border-b transition-colors',
                                        selectedConversationId === conv.id ? 'bg-primary/10' : 'hover:bg-primary/5'
                                    )}
                                    onClick={() => setSelectedConversationId(conv.id)}
                                >
                                    <Avatar>
                                        <AvatarFallback>{fallback}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 truncate">
                                        <p className="font-semibold">{conv.employeeName}</p>
                                        <p className="text-sm text-muted-foreground truncate">{conv.lastMessageText}</p>
                                    </div>
                                    {isUnread && (
                                        <div className="bg-primary text-primary-foreground text-xs rounded-full h-2.5 w-2.5" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </ScrollArea>
             )}
        </Card>
    );
    
    const ChatView = () => (
         <Card className="flex flex-col h-[calc(100vh-8rem)] bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background">
            {selectedConversation ? (
                <>
                    <div className="flex items-center gap-4 p-4 border-b">
                        {isMobile && (
                             <Button variant="ghost" size="icon" onClick={() => setSelectedConversationId(null)}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        )}
                        <Avatar>
                             <AvatarFallback>{selectedConversation.employeeName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <h2 className="text-xl font-bold font-headline">{selectedConversation.employeeName}</h2>
                    </div>
                    <ScrollArea className="flex-1 p-4 space-y-4" viewportRef={viewportRef}>
                        {messagesLoading ? (
                             <div className="flex items-center justify-center flex-1 h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            messages.map((message, index) => (
                                <div key={index} className={cn('flex items-end gap-2', message.senderId === 'admin' ? 'justify-end' : 'justify-start')}>
                                    <div className={cn(
                                        'max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg shadow-sm',
                                        message.senderId === 'admin' ? 'bg-gradient-to-br from-primary to-blue-400 text-primary-foreground' : 'bg-gradient-to-br from-muted to-transparent'
                                    )}>
                                        <p className="whitespace-pre-wrap break-words">{message.text}</p>
                                        {message.timestamp && (
                                            <p className="text-xs opacity-70 mt-1 text-right">
                                                {format(message.timestamp, 'dd/MM/yy HH:mm')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </ScrollArea>
                    <div className="p-4 border-t">
                        <form onSubmit={handleSendMessage} className="relative flex items-end w-full">
                           <Textarea
                                ref={textareaRef}
                                placeholder="Escribe tu mensaje..."
                                className="pr-12 resize-none flex-grow"
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={1}
                            />
                            <Button type="submit" size="icon" className="absolute right-2 bottom-2 h-8 w-8 shrink-0">
                                <SendHorizonal className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                     {dataLoading ? (
                         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                     ) : (
                        <p className="text-muted-foreground">Selecciona una conversación para ver los mensajes.</p>
                     )}
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 h-full">
            <div className="md:col-span-2">
                 <ConversationList />
            </div>
            <div className="md:col-span-3">
                <ChatView />
            </div>
        </div>
    );
}
