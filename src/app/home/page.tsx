

'use client';

import { useDataProvider } from '@/hooks/use-data-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO, addWeeks, startOfWeek, endOfWeek, isAfter, isSameDay, isBefore, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CalendarClock, Mail } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Employee, ScheduledAbsence } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';


export default function HomePage() {
    const { 
        loading, 
        unconfirmedWeeksDetails, 
        conversations, 
        employees, 
        absenceTypes,
        employeeRecord,
    } = useDataProvider();
    const { appUser } = useAuth();

    const unreadConversations = useMemo(() => {
        return conversations.filter(c => c.unreadByAdmin).slice(0, 5);
    }, [conversations]);
    
    const upcomingEvents = useMemo(() => {
        const now = new Date();
        const next5WeeksStart = startOfWeek(now, { weekStartsOn: 1 });
        const next5WeeksEnd = endOfWeek(addWeeks(now, 4), { weekStartsOn: 1 });

        const events: { weekId: string; employee: Employee; absence: ScheduledAbsence; absenceType: any }[] = [];
        const processedAbsenceIds = new Set<string>();

        const activeEmployees = employees.filter(emp => 
            emp.employmentPeriods.some(p => !p.endDate || isAfter(p.endDate as Date, now))
        );

        activeEmployees.forEach(emp => {
            (emp.employmentPeriods || []).forEach(p => {
                (p.scheduledAbsences || []).forEach(a => {
                    if (!a.id || processedAbsenceIds.has(a.id) || !a.startDate || !a.endDate || !isValid(a.startDate) || !isValid(a.endDate)) return;
                    
                    processedAbsenceIds.add(a.id);

                    if (isBefore(a.endDate, next5WeeksStart) || isAfter(a.startDate, next5WeeksEnd)) {
                        return;
                    }

                    const absenceType = absenceTypes.find(at => at.id === a.absenceTypeId);
                    if (absenceType) {
                        const weekId = format(startOfWeek(a.startDate, {weekStartsOn: 1}), 'yyyy-MM-dd');
                        events.push({ weekId, employee: emp, absence: a, absenceType });
                    }
                });
            });
        });
        
        return events.sort((a,b) => a.absence.startDate.getTime() - b.absence.startDate.getTime());

    }, [employees, absenceTypes]);

    const welcomeName = useMemo(() => {
        if (appUser?.email === 'mariaavg@inditex.com') {
            return 'Arantxa';
        }
        return employeeRecord?.name ? employeeRecord.name.split(' ')[0] : 'Admin';
    }, [appUser, employeeRecord]);


    if (loading) {
        return (
            <div className="p-4 md:p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight font-headline">
                    ¡Hola, {welcomeName}!
                </h1>
                <p className="text-lg text-muted-foreground">
                    Aquí tienes un resumen de tus tareas pendientes.
                </p>
            </div>
            <div className="grid gap-6 auto-rows-fr sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                <Card className="flex flex-col bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-background">
                    <CardHeader className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-destructive/10 p-3 rounded-full">
                                <AlertTriangle className="h-6 w-6 text-destructive" />
                            </div>
                            <CardTitle>Semanas Pendientes</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow p-4 space-y-2">
                        {unconfirmedWeeksDetails.length > 0 ? (
                            <ScrollArea className="h-48">
                                <div className="space-y-2">
                                    {unconfirmedWeeksDetails.map(detail => (
                                        <div key={detail.weekId} className="flex items-center justify-between p-2 rounded-md border bg-background/50">
                                            <div>
                                                <p className="font-semibold text-sm">Semana del {format(parseISO(detail.weekId), 'dd/MM/yyyy', { locale: es })}</p>
                                                <p className="text-xs text-muted-foreground">{detail.employeeNames.length} empleado(s) pendiente(s)</p>
                                            </div>
                                            <Button asChild variant="secondary" size="sm">
                                                <Link href={`/schedule?week=${detail.weekId}`}>Revisar</Link>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                <p>¡Ninguna semana pendiente!</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="flex flex-col bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background">
                    <CardHeader className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-3 rounded-full">
                                <Mail className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle>Mensajes Sin Leer</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow p-4 space-y-2">
                        {unreadConversations.length > 0 ? (
                             <ScrollArea className="h-48">
                                <div className="space-y-2">
                                    {unreadConversations.map(conv => (
                                        <Link key={conv.id} href="/messages">
                                            <div className="flex items-center justify-between p-3 rounded-md border bg-background/50 hover:bg-muted">
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarFallback>{conv.employeeName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-semibold text-sm">{conv.employeeName}</p>
                                                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">{conv.lastMessageText}</p>
                                                    </div>
                                                </div>
                                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                <p>Bandeja de entrada al día.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="flex flex-col bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-background">
                    <CardHeader className="p-4">
                       <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-3 rounded-full">
                               <CalendarClock className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle>Próximos Eventos</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow p-4 space-y-2">
                         {upcomingEvents.length > 0 ? (
                             <ScrollArea className="h-48">
                                <div className="space-y-2">
                                    {upcomingEvents.map((event, index) => (
                                        <div key={`${event.absence.id}-${index}`} className="flex items-start gap-4 p-3 rounded-md border" style={{ backgroundColor: `${event.absenceType.color}20`}}>
                                            <div className="text-center w-16 shrink-0">
                                                <p className="font-bold text-sm capitalize">{format(event.absence.startDate, 'E', { locale: es })}</p>
                                                <p className="text-xs text-muted-foreground">{format(event.absence.startDate, 'dd MMM', { locale: es })}</p>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{event.employee.name}</p>
                                                <p className="text-xs font-medium" style={{color: event.absenceType.color ? event.absenceType.color : 'inherit'}}>{event.absenceType.name}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                         ) : (
                             <div className="flex items-center justify-center h-full text-muted-foreground">
                                <p>No hay ausencias programadas.</p>
                            </div>
                         )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
