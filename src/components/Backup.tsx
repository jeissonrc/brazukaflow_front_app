import { useState } from 'react';
import { ArrowLeft, Database, Download } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { getAuthToken } from '../lib/auth';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

type BackupProps = {
  onBack: () => void;
};

// Histórico futuro: quando os backups forem armazenados no servidor, reativar este bloco.
// const backupHistory: Array<{
//   id: number;
//   arquivo: string;
//   dataHora: string;
//   usuario: string;
//   tamanho: string;
//   status: string;
// }> = [];

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || '';

const getFileNameFromDisposition = (value: string | null) => {
  if (!value) return null;

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);

  const fileNameMatch = value.match(/filename="?([^"]+)"?/i);
  return fileNameMatch?.[1] || null;
};

export default function Backup({ onBack }: BackupProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateBackup = async () => {
    const token = getAuthToken();

    if (!token) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/backups/sql`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMessage = 'Erro ao gerar backup SQL.';

        try {
          const result = JSON.parse(text);
          errorMessage = result?.error || errorMessage;
        } catch {
          if (text.trim()) errorMessage = text;
        }

        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const fileName = getFileNameFromDisposition(response.headers.get('content-disposition')) || 'brazukaflow-backup.sql';
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Backup SQL gerado com sucesso.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar backup SQL.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 dark:text-slate-100">
              <Database className="h-6 w-6" />
              Backup
            </CardTitle>
            <CardDescription className="mt-2 dark:text-slate-400">
              Exportação SQL dos dados do sistema
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="w-full cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155] md:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-slate-100">
              <Download className="h-5 w-5" />
              Gerar Backup SQL
            </CardTitle>
            <CardDescription className="dark:text-slate-400">
              Crie uma cópia dos dados para armazenar com segurança.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-[#3b4658] dark:bg-[#273447]">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                O backup será disponibilizado em arquivo SQL com nome dinâmico e registrado na auditoria.
                Os registros podem ser consultados em Manutenção &gt; Auditoria, módulo Backup.
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={handleGenerateBackup}
                disabled={isGenerating}
                className="cursor-pointer disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 dark:bg-[#075985] dark:text-white"
              >
                <Download className="mr-2 h-4 w-4" />
                {isGenerating ? 'Gerando...' : 'Gerar Backup'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="dark:text-slate-100">Orientações</CardTitle>
            <CardDescription className="dark:text-slate-400">Cuidados com o arquivo gerado</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="ml-5 list-disc space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <li><span className="font-medium text-slate-700 dark:text-slate-200">Armazenamento:</span> guarde o arquivo em local seguro.</li>
              <li><span className="font-medium text-slate-700 dark:text-slate-200">Privacidade:</span> evite compartilhar o backup com terceiros.</li>
              <li><span className="font-medium text-slate-700 dark:text-slate-200">Restauração:</span> restaure diretamente pelo banco de dados.</li>
              <li><span className="font-medium text-slate-700 dark:text-slate-200">Prevenção:</span> gere uma cópia antes de alterações importantes.</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Histórico futuro: reativar quando os arquivos de backup forem armazenados no servidor.
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-slate-100">
            <History className="h-5 w-5" />
            Histórico de Backups
          </CardTitle>
          <CardDescription className="dark:text-slate-400">Arquivos gerados pelo sistema</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-[#243043]">
                <TableHead>Arquivo</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backupHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-300">
                    Nenhum backup gerado até o momento.
                  </TableCell>
                </TableRow>
              ) : (
                backupHistory.map((backup) => (
                  <TableRow key={backup.id} className="dark:hover:bg-[#273447]">
                    <TableCell>{backup.arquivo}</TableCell>
                    <TableCell>{backup.dataHora}</TableCell>
                    <TableCell>{backup.usuario}</TableCell>
                    <TableCell>{backup.tamanho}</TableCell>
                    <TableCell>{backup.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      */}
    </div>
  );
}
