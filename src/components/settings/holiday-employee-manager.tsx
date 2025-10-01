

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { useDataProvider } from '@/hooks/use-data-provider';
import { useToast } from '@/hooks/use-toast';
import { HolidayEmployee } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { seedHolidayEmployees } from '@/lib/services/settingsService';


const initialHolidayEmployees = [
    "ALBA PIÑEIRO PEREZ", "ALBERTO BIEL GAUDES", "ALBERTO JAVIER MONDEJAR BELTRAN", "ALEJANDRO MAYORAL MORON", 
    "ALVARO ECHEGOYEN DE GREGORIO ROCASOLA", "ANA GOMEZ ALAMAN", "ANA GRACIA SANCHEZ", "ANA MARIA IVANOV", 
    "ANDREA MARIA BURILLO FRANCES", "ANDREA RUIZ GRACIA", "BEATRIZ MERCEDES MORELLI DELGADO", "BRENDA CASTAN MARGALEJO", 
    "CANDELA GIMENEZ BARCA", "CARMEN DOÑATE BANEGAS", "CARMEN LUCIA URCIA MARCOS", "CAROLINA PEREZ SANCHEZ", 
    "CELIA LAIRLA SAN JOSE", "CLEMENTE ALUNDA CAÑET", "CRISTINA UCHE CHAURE", "CRISTINA VIDAL CASTIELLO", 
    "CRISTOBAL ANDRES FREDES CACERES", "ELISABETH GONZALEZ SERRANO", "EMILIO GOMEZ PARDO", "ESTIBALIZ MUÑOZ ALONSO", 
    "EVA MARIA NUEZ SIERRA", "GABRIELA ALVAREZ MARTIN", "GEMA LAURA CALVO AINSA", "GEMMA RUIZ CEJUDO", 
    "GUILLERMO SORIA MODREGO", "IRIS GIMENEZ MUÑOZ", "ISABEL GARCIA TERES", "JAVIER CORTES REMACHA", 
    "JESSICA LATORRE NAVARRO", "JOHANNA ANDREA PAUCAR LEONES", "LAURA CASAS TURON", "LAURA DE DIEGO LATORRE", 
    "LENA RODRIGUEZ MONTOYA", "LEYRE ORDOÑEZ VELASCO", "LORENA LOZANO LLES", "LORENA NAVARRO CASTELLOT", 
    "MARIA ANGELES IBUARBEN CATALAN", "MARIA ARANTXA GASCA JIMENEZ", "MARIA ARANTZAZU VILLACAMPA-GINER GARCIA", 
    "MARIA CAMPILLO ARANDA", "MARIA CIPRIANA MONJE REBENAQUE", "MARIA JOSE MARTIN ALIAS", "MARIA JOSE ORTIZ RUEDA", 
    "MARIA MAR GRACIA RECH", "MARIA MARTINEZ PEREZ", "MARIA PILAR SANCHEZ PEÑA", "MAXIMILIAN RIVALDO PETRISOR", 
    "MIRIAM RODRIGUEZ GARCIA", "NATALIA AZNAR MARTIN", "NAWAL TEMSAH GHERNATI", "NOELIA LOPEZ PARDO", 
    "NOELIA PARDO CALAVIA", "NOELIA VILLAR GRACIA", "OBDULIA SANCHEZ DOPICO", "PABLO LOPEZ MUOCO", 
    "PAOLA LOPEZ GASCA", "PATRICIA MARCO CORVINOS", "PEDRO RAMIREZ CANO", "RAFFAELA DE LIMA REZENDE", 
    "RAQUEL CHUECA PEREZ", "RAQUEL DOMINGO BERGES", "RAQUEL PLANAS CHOJOLAN", "RAQUEL VELASCO BENITO", 
    "REBECA PASCUAL ANDRES", "SAMUEL RODRIGUEZ MUÑOZ", "SERGIO GALLEGO FRANCO", "SILVIA FEIJOO ROMEO", 
    "SOFIA GALUCHINO BINABURO", "SOFIA OCHOA LASERNA", "SUSANA ALVARO NUEZ", "VALERIA TORRES PAÑOS", 
    "VERONICA CLAVERIA RODRIGUEZ", "VERONICA DANIELA BABEANU", "VERONICA FRAJ CEBRINO", "VICTORIA BITRIAN POSTIGO", 
    "YANIRA GIMENEZ SALESA", "YASMINA SANCHEZ GIMENEZ", "ZAINAB LKHADESSI"
];


export function HolidayEmployeeManager() {
    const { holidayEmployees, addHolidayEmployee, updateHolidayEmployee, deleteHolidayEmployee, loading, refreshData } = useDataProvider();
    const { toast } = useToast();
    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        const seedInitialData = async () => {
            if (!loading && holidayEmployees.length === 0) {
                console.log("Seeding initial holiday employees...");
                await seedHolidayEmployees(initialHolidayEmployees);
                refreshData(); // Refresh data after seeding
            }
        };
        seedInitialData();
    }, [loading, holidayEmployees, refreshData]);

    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmployeeName.trim()) {
            toast({ title: 'Nombre vacío', description: 'El nombre del empleado no puede estar vacío.', variant: 'destructive' });
            return;
        }
        setIsAdding(true);
        try {
            await addHolidayEmployee(newEmployeeName.trim());
            toast({ title: 'Empleado añadido', description: `Se ha añadido a ${newEmployeeName.trim()} a la lista.` });
            setNewEmployeeName('');
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudo añadir el empleado.', variant: 'destructive' });
        } finally {
            setIsAdding(false);
        }
    };

    const handleToggleActive = async (employee: HolidayEmployee) => {
        try {
            await updateHolidayEmployee(employee.id, { active: !employee.active });
            toast({ title: 'Estado actualizado', description: `El estado de ${employee.name} ha sido actualizado.` });
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudo actualizar el estado.', variant: 'destructive' });
        }
    };

    const handleDeleteEmployee = async (employeeId: string) => {
        try {
            await deleteHolidayEmployee(employeeId);
            toast({ title: 'Empleado eliminado', description: 'El empleado ha sido eliminado de la lista.', variant: 'destructive' });
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudo eliminar el empleado.', variant: 'destructive' });
        }
    };

    if (loading) {
        return <Skeleton className="h-96 w-full" />
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gestionar Empleados para Informes</CardTitle>
                <CardDescription>
                    Define la lista de empleados que aparecerán en los informes (ej. festivos de apertura).
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <form onSubmit={handleAddEmployee} className="flex gap-2">
                    <Input
                        placeholder="Nombre del nuevo empleado"
                        value={newEmployeeName}
                        onChange={(e) => setNewEmployeeName(e.target.value)}
                        disabled={isAdding}
                    />
                    <Button type="submit" disabled={isAdding}>
                        {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Añadir
                    </Button>
                </form>

                <div className="border rounded-md max-h-96 overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre del Empleado</TableHead>
                                <TableHead className="text-center">Activo</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {holidayEmployees && holidayEmployees.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24">
                                        No hay empleados en la lista.
                                    </TableCell>
                                </TableRow>
                            )}
                            {holidayEmployees && holidayEmployees.map(emp => (
                                <TableRow key={emp.id}>
                                    <TableCell className="font-medium">{emp.name}</TableCell>
                                    <TableCell className="text-center">
                                        <Switch
                                            checked={emp.active}
                                            onCheckedChange={() => handleToggleActive(emp)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                 <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground">
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Confirmas la eliminación?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta acción eliminará a <strong>{emp.name}</strong> de la lista de empleados para informes.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteEmployee(emp.id)}>Sí, eliminar</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
