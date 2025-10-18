
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Eye, Plane, Briefcase, Gift, Wallet, Scale } from 'lucide-react';
import type { Employee, EmploymentPeriod } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface EmployeeCardProps {
    employee: Employee;
    balances?: { ordinary: number; holiday: number; leave: number; total: number; };
    vacationInfo?: { vacationDaysTaken: number; suspensionDays: number; vacationDaysAvailable: number; };
    lastPeriod?: EmploymentPeriod;
    showBalances: boolean;
}

const BalanceItem = ({ label, value, icon: Icon }: { label: string, value: number, icon: React.ElementType }) => (
    <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
            <Icon className="h-4 w-4" />
            <span>{label}</span>
        </div>
        <span className={cn('font-mono font-medium', value < 0 && 'text-destructive')}>
            {value.toFixed(2)}h
        </span>
    </div>
);

export function EmployeeCard({ employee, balances, vacationInfo, lastPeriod, showBalances }: EmployeeCardProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                        <AvatarFallback>{employee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-lg">{employee.name}</CardTitle>
                        {showBalances && vacationInfo && (
                             <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                                <Plane className="h-4 w-4" />
                                <span className={cn(
                                    "font-mono font-medium",
                                    vacationInfo.vacationDaysTaken > vacationInfo.vacationDaysAvailable ? "text-destructive" : "",
                                    vacationInfo.vacationDaysTaken === vacationInfo.vacationDaysAvailable && "text-green-600"
                                )}>
                                    {vacationInfo.vacationDaysTaken} / {vacationInfo.vacationDaysAvailable} días
                                </span>
                            </div>
                        )}
                        {!showBalances && lastPeriod && (
                             <div className="flex flex-col text-sm text-muted-foreground mt-1">
                                <span>{lastPeriod.contractType}</span>
                                <span>Cese: {lastPeriod.endDate ? format(parseISO(lastPeriod.endDate as string), 'P', {locale: es}) : 'N/A'}</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardHeader>
            {showBalances && balances && (
                <CardContent className="space-y-4">
                    <div className="space-y-2 rounded-md border p-2">
                        <BalanceItem label="B. Ordinaria" value={balances.ordinary} icon={Briefcase} />
                        <BalanceItem label="B. Festivos" value={balances.holiday} icon={Gift} />
                        <BalanceItem label="B. Libranza" value={balances.leave} icon={Wallet} />
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-muted p-2">
                        <div className="flex items-center gap-2 font-bold">
                            <Scale className="h-4 w-4" />
                            <span>Balance Total</span>
                        </div>
                        <Badge variant={balances.total >= 0 ? 'default' : 'destructive'} className="font-mono text-base">
                            {balances.total.toFixed(2)}h
                        </Badge>
                    </div>
                </CardContent>
            )}
            <CardFooter>
                 <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/employees/${employee.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Ficha Completa
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
