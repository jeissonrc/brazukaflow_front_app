import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

type AuthUser = {
  id: number;
  username: string;
  name: string;
  active: number;
  profileId: number | null;
};

type LoginProps = {
  onLogin: (payload: { user: AuthUser; token: string }) => void;
};

export default function Login({ onLogin }: LoginProps) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!usuario || !senha) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: usuario.trim(),
          password: senha,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success || !result?.data?.token || !result?.data?.user) {
        setErrorMessage(result?.error || 'Usuário ou senha inválidos.');
        return;
      }

      onLogin({
        user: result.data.user as AuthUser,
        token: result.data.token as string,
      });
    } catch {
      setErrorMessage('Não foi possível conectar com a API de login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-yellow-50 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="flex justify-center">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 p-4 rounded-2xl">
              <LogIn className="w-12 h-12 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl">
              <span className="text-[#00A676]">BR</span>
              <span className="text-[#F9C74F]">azuca</span>
              <span className="text-[#013A63]">Flow</span>
            </CardTitle>
            <CardDescription className="mt-2">
              Sistema de Controle Financeiro
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="usuario">Usuário</Label>
              <Input
                id="usuario"
                type="text"
                placeholder="Digite seu usuário"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full h-12 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              <LogIn className="w-5 h-5 mr-2" />
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
            {errorMessage && (
              <p className="text-sm text-red-600 text-center">{errorMessage}</p>
            )}
            <div className="text-center">
              <a 
                href="#" 
                className="text-blue-600 hover:text-blue-700 hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Funcionalidade de recuperação de senha em desenvolvimento');
                }}
              >
                Esqueceu a senha?
              </a>
            </div>
          </form>
        </CardContent>
        <div className="pb-6 text-center text-gray-500">
          <p>© 2026 BRazucaFlow. Todos os direitos reservados.</p>
        </div>
      </Card>
    </div>
  );
}
