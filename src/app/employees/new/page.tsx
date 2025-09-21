
import { EmployeeForm } from "@/components/employees/employee-form";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function NewEmployeePage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4 px-4 md:px-6 pt-4">
                <Link href="/employees" passHref>
                    <Button variant="outline" size="icon">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight font-headline">
                    Añadir Nuevo Empleado
                </h1>
            </div>
            <div className="px-4 md:px-6 pb-4">
                <EmployeeForm />
            </div>
        </div>
    );
}
