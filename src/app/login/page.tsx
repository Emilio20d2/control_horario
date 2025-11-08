import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { signIn, authConfigured } = useAuth();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (authConfigured) {
      const formData = new FormData(event.currentTarget);
      await signIn(String(formData.get('email')), String(formData.get('password')));
    } else {
      console.warn('Integra tu propio proveedor de autenticación para habilitar el inicio de sesión.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accede a tu cuenta</CardTitle>
          <CardDescription>
            Inicia sesión con el correo y la contraseña definidos en tu archivo
            <code className="mx-1 rounded bg-muted px-2 py-1 text-sm">.env.local</code>.
            Puedes sustituir el proveedor local por otro diferente editando
            <code className="mx-1 rounded bg-muted px-2 py-1 text-sm">useAuth.tsx</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" name="email" type="email" disabled={!authConfigured} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" disabled={!authConfigured} required />
            </div>
            <Button type="submit" className="w-full" disabled={!authConfigured}>
              Iniciar sesión
            </Button>
          </form>
          <p className="mt-6 text-sm text-muted-foreground">
            Consulta la <Link href="/docs" className="text-primary hover:underline">documentación</Link> para añadir tu propio
            sistema de autenticación y restaurar los flujos originales.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
