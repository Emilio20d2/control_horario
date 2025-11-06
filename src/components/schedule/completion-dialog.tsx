

'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle } from "lucide-react";

interface CompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  nextWeekId: string | null;
  onNavigate: (weekId: string) => void;
}

export function CompletionDialog({
  isOpen,
  onClose,
  nextWeekId,
  onNavigate,
}: CompletionDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <AlertDialogTitle className="text-center">¡Semana Completada!</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Todos los empleados de esta semana han sido confirmados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          {nextWeekId ? (
            <AlertDialogAction onClick={() => onNavigate(nextWeekId)}>
              Ir a la siguiente semana pendiente
            </AlertDialogAction>
          ) : (
             <AlertDialogAction onClick={onClose}>
                Aceptar
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
