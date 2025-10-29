
'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { PlusCircle, Eye, Plane, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDataProvider } from '@/hooks/use-data-provider';
import type { Employee } from '@/lib/types';
import { cn } from '@/lib/utils';
import { isAfter, parseISO, startOfDay, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { EmployeeCard } from '@/components/employees/employee-card';


export default function EmployeesPage() {
    const { employees, loading, weeklyRecords, calculateEmployeeVacations, getEmployeeFinalBalances } = useDataProvider();
    const [balances, setBalances] = useState<Record<string, { ordinary: number; holiday: number; leave: number; total: number; }>>({});
    const [balancesLoading, setBalancesLoading] = useState(true);
    const isMobile = useIsMobile();

    const { activeEmployees, inactiveEmployees } = useMemo(() => {
        const active: Employee[] = [];
        const inactive: Employee[] = [];
        employees.forEach(e => {
            if (e.employmentPeriods?.some(p => !p.endDate || isAfter(p.endDate as Date, startOfDay(new Date())))) {
                active.push(e);
            } else {
                inactive.push(e);
            }
        });
        return { activeEmployees: active, inactiveEmployees: inactive };
    }, [employees]);

    useEffect(() => {
        if (!loading) {
            setBalancesLoading(true);
            const newBalances: Record<string, { ordinary: number; holiday: number; leave: number; total: number; }> = {};
            
            activeEmployees.forEach(emp => {
                newBalances[emp.id] = getEmployeeFinalBalances(emp.id);
            });

            setBalances(newBalances);
            setBalancesLoading(false);
        }
    }, [loading, employees, weeklyRecords, activeEmployees, getEmployeeFinalBalances]);

    const BalanceCell = ({ value }: { value: number | undefined }) => (
        <TableCell className="text-center">
            {value !== undefined ? (
                <span className={`font-mono ${value >= 0 ? '' : 'text-destructive'}`}>
                    {value.toFixed(2)}h
                </span>
            ) : (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            )}
        </TableCell>
    );

  const EmployeeTable = ({ employees, showBalances }: { employees: Employee[], showBalances: boolean }) => (
     <Table>
        <TableHeader>
            <TableRow>
            <TableHead className="min-w-[200px]">Nombre</TableHead>
            {showBalances ? (
                <>
                    <TableHead className="text-center min-w-[120px]">B. Ordinaria</TableHead>
                    <TableHead className="text-center min-w-[120px]">B. Festivos</TableHead>
                    <TableHead className="text-center min-w-[120px]">B. Libranza</TableHead>
                    <TableHead className="text-center min-w-[120px] font-bold">Balance Total</TableHead>
                    <TableHead className="text-center min-w-[140px]">Vacaciones</TableHead>
                </>
            ) : (
                <>
                    <TableHead>Último Contrato</TableHead>
                    <TableHead>Fecha de Cese</TableHead>
                </>
            )}
            <TableHead className="text-right min-w-[140px]">Acciones</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                    <TableCell colSpan={showBalances ? 7 : 4}><Skeleton className="h-10 w-full" /></TableCell>
                </TableRow>
            ))
            ) : employees.map((employee) => {
            const employeeBalances = showBalances && !balancesLoading ? balances[employee.id] : undefined;
            const { vacationDaysTaken, vacationDaysAvailable } = showBalances ? calculateEmployeeVacations(employee, new Date().getFullYear(), 'confirmed') : { vacationDaysTaken: 0, vacationDaysAvailable: 31 };
            const lastPeriod = [...(employee.employmentPeriods || [])].sort((a,b) => (b.startDate as Date).getTime() - (a.startDate as Date).getTime())[0];
            return (
            <TableRow key={employee.id}>
                <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                        <AvatarFallback>{employee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                        <span>{employee.name}</span>
                        </div>
                    </div>
                </TableCell>
                
                {showBalances ? (
                    <>
                        <BalanceCell value={employeeBalances?.ordinary} />
                        <BalanceCell value={employeeBalances?.holiday} />
                        <BalanceCell value={employeeBalances?.leave} />
                        <TableCell className="text-center">
                         {employeeBalances !== undefined ? (
                            <Badge variant={employeeBalances.total >= 0 ? 'default' : 'destructive'} className="font-mono text-base">
                                {employeeBalances.total.toFixed(2)}h
                            </Badge>
                         ) : (
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                         )}
                        </TableCell>
                        <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5 font-mono">
                                <Plane className="h-4 w-4 text-muted-foreground" />
                                <span className={cn(
                                    "font-medium",
                                    vacationDaysTaken > vacationDaysAvailable ? "text-destructive" : "",
                                    vacationDaysTaken === vacationDaysAvailable && "text-green-600"
                                )}>
                                    {vacationDaysTaken} / {vacationDaysAvailable} días
                                </span>
                            </div>
                        </TableCell>
                    </>
                ) : (
                    <>
                        <TableCell>{lastPeriod?.contractType || 'N/A'}</TableCell>
                        <TableCell>{lastPeriod?.endDate ? format(lastPeriod.endDate as Date, 'PPP', {locale: es}) : 'N/A'}</TableCell>
                    </>
                )}


                <TableCell className="text-right">
                <Button asChild variant="outline" size="sm">
                    <Link href={`/employees/${employee.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Ficha
                    </Link>
                </Button>
                </TableCell>
            </TableRow>
            )})}
            {!loading && employees.length === 0 && (
                <TableRow>
                    <TableCell colSpan={showBalances ? 7 : 4} className="text-center h-24">
                        No se han encontrado empleados en esta categoría.
                    </TableCell>
                </TableRow>
            )}
        </TableBody>
    </Table>
  );

  const EmployeeList = ({ employees, showBalances }: { employees: Employee[], showBalances: boolean }) => {
    if (isMobile) {
        return (
            <div className="grid grid-cols-1 gap-4">
                 {loading ? (
                    Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-48 w-full" />)
                ) : employees.length > 0 ? (
                    employees.map(employee => {
                        const employeeBalances = showBalances && !balancesLoading ? balances[employee.id] : undefined;
                        const vacationInfo = showBalances ? calculateEmployeeVacations(employee, new Date().getFullYear(), 'confirmed') : undefined;
                        const lastPeriod = [...(employee.employmentPeriods || [])].sort((a,b) => (b.startDate as Date).getTime() - (a.startDate as Date).getTime())[0];
                        return (
                            <EmployeeCard 
                                key={employee.id}
                                employee={employee}
                                balances={employeeBalances}
                                vacationInfo={vacationInfo}
                                lastPeriod={lastPeriod}
                                showBalances={showBalances}
                            />
                        )
                    })
                ) : (
                    <p className="text-center text-muted-foreground py-12">No se han encontrado empleados en esta categoría.</p>
                )}
            </div>
        )
    }
    return <EmployeeTable employees={employees} showBalances={showBalances} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 md:px-6 pt-4">
        <h1 className="text-2xl font-bold tracking-tight font-headline">
          Empleados
        </h1>
        <Link href="/employees/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Empleado
          </Button>
        </Link>
      </div>

      <div className="px-4 md:px-6 pb-4">
        <Card>
            <CardHeader>
            <CardTitle>Lista de Empleados</CardTitle>
            </CardHeader>
            <CardContent>
            <Tabs defaultValue="active" className="w-full">
                <TabsList>
                    <TabsTrigger value="active">Activos ({activeEmployees.length})</TabsTrigger>
                    <TabsTrigger value="inactive">Inactivos ({inactiveEmployees.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="active" className="pt-4">
                    <EmployeeList employees={activeEmployees} showBalances={true} />
                </TabsContent>
                <TabsContent value="inactive" className="pt-4">
                    <EmployeeList employees={inactiveEmployees} showBalances={false} />
                </TabsContent>
            </Tabs>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

  