import { useEffect, useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { ArrowLeft, CalendarClock, FileCog, Save, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { getAuthToken } from '../lib/auth';

type ConfiguracoesLogsProps = {
  onBack: () => void;
};

type LastManualCleanup = {
  occurredAt: string | null;
  username: string | null;
  userName: string | null;
  description: string | null;
};

const formatDateTime = (value: string | null) => {
  if (!value) return 'Nunca executada';

  return new Date(value).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

export default function ConfiguracoesLogs({ onBack }: ConfiguracoesLogsProps) {
  const [retencao, setRetencao] = useState('12');
  const [agendamentoAtivo, setAgendamentoAtivo] = useState(false);
  const [frequenciaAgendamento, setFrequenciaAgendamento] = useState('mensal');
  const [periodoLimpeza, setPeriodoLimpeza] = useState('');
  const [fazerBackupAntesLimpeza, setFazerBackupAntesLimpeza] = useState(false);
  const [modalLimpezaOpen, setModalLimpezaOpen] = useState(false);
  const [modalBackupLimpezaOpen, setModalBackupLimpezaOpen] = useState(false);
  const [modalConfirmacaoLimpezaOpen, setModalConfirmacaoLimpezaOpen] = useState(false);
  const [isCleaningLogs, setIsCleaningLogs] = useState(false);
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);
  const [lastManualCleanup, setLastManualCleanup] = useState<LastManualCleanup | null>(null);

  const loadLastManualCleanup = async () => {
    const token = getAuthToken();

    if (!token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/audit-logs/last-manual-cleanup`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();

      if (response.ok && result?.success) {
        setLastManualCleanup(result.data);
      }
    } catch {
      setLastManualCleanup(null);
    }
  };

  useEffect(() => {
    loadLastManualCleanup();
  }, []);

  const getAuthTokenOrNotify = () => {
    const token = getAuthToken();

    if (!token) {
      toast.error('Sessão expirada. Faça login novamente.');
      return null;
    }

    return token;
  };

  const openNextCleanupStep = () => {
    if (!periodoLimpeza) {
      toast.error('Selecione o período desejado para limpar os logs.');
      return;
    }

    if (fazerBackupAntesLimpeza) {
      setModalBackupLimpezaOpen(true);
      return;
    }

    setModalConfirmacaoLimpezaOpen(true);
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const getFileNameFromDisposition = (contentDisposition: string | null) => {
    const match = contentDisposition?.match(/filename="?([^"]+)"?/i);
    return match?.[1] || `brazukaflow-logs-limpeza-${periodoLimpeza}-meses.sql`;
  };

  const executeCleanup = async () => {
    const token = getAuthTokenOrNotify();
    if (!token) return false;

    const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/audit-logs/cleanup`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ months: Number(periodoLimpeza) }),
    });

    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao limpar logs antigos.');
    }

    const message = result?.data?.message || 'Logs antigos removidos com sucesso.';

    if (Number(result?.data?.deletedCount || 0) > 0) {
      toast.success(message);
    } else {
      toast.info(message);
    }

    setModalLimpezaOpen(false);
    setModalBackupLimpezaOpen(false);
    setModalConfirmacaoLimpezaOpen(false);
    setPeriodoLimpeza('');
    setFazerBackupAntesLimpeza(false);
    await loadLastManualCleanup();

    return true;
  };

  const handleGenerateCleanupBackup = async () => {
    if (!periodoLimpeza) {
      toast.error('Selecione o período desejado para gerar o backup.');
      return;
    }

    const token = getAuthTokenOrNotify();
    if (!token) return;

    setIsGeneratingBackup(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/audit-logs/cleanup-backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ months: Number(periodoLimpeza) }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || 'Erro ao gerar backup dos logs.');
      }

      const blob = await response.blob();
      const fileName = getFileNameFromDisposition(response.headers.get('Content-Disposition'));
      const rowCount = Number(response.headers.get('X-Backup-Row-Count') || 0);
      downloadBlob(blob, fileName);

      if (rowCount > 0) {
        toast.success('Backup dos logs gerado com sucesso.');
      } else {
        toast.info('Backup gerado, mas não há logs para o período selecionado.');
      }

      setModalBackupLimpezaOpen(false);
      setModalConfirmacaoLimpezaOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar backup dos logs.');
    } finally {
      setIsGeneratingBackup(false);
    }
  };

  const handleConfirmCleanup = async () => {
    if (!periodoLimpeza) {
      toast.error('Selecione o período desejado para limpar os logs.');
      return;
    }

    setIsCleaningLogs(true);

    try {
      await executeCleanup();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao limpar logs antigos.');
    } finally {
      setIsCleaningLogs(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 dark:text-slate-100">
              <FileCog className="h-6 w-6" />
              Configurações de Logs
            </CardTitle>
            <CardDescription className="mt-2 dark:text-slate-400">
              Retenção, limpeza e futuras rotinas automáticas dos logs do sistema
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
              <Trash2 className="h-5 w-5" />
              Limpeza Manual
            </CardTitle>
            <CardDescription className="dark:text-slate-400">
              Remova logs antigos sob demanda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-[#3b4658] dark:bg-[#273447]">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                A limpeza removerá apenas registros antigos da auditoria. Dados financeiros, cadastros e backups não serão removidos.
              </p>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-4 text-sm dark:border-[#3b4658] dark:bg-[#1f2937]">
              <p className="text-xs uppercase text-slate-500 dark:text-slate-400">
                Última limpeza manual
              </p>
              <p className="mt-1 text-slate-700 dark:text-slate-200">
                {formatDateTime(lastManualCleanup?.occurredAt || null)}
              </p>
              {lastManualCleanup?.userName && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Executada por {lastManualCleanup.userName}
                </p>
              )}
            </div>

            <Button
              type="button"
              onClick={() => setModalLimpezaOpen(true)}
              className="cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-[#075985] dark:text-white"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar Logs Antigos
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-slate-100">
              <CalendarClock className="h-5 w-5" />
              Agendamento
            </CardTitle>
            <CardDescription className="dark:text-slate-400">
              Preparado para automação futura
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 dark:border-[#3b4658] dark:bg-[#273447]">
              <div>
                <Label htmlFor="agendamentoLogs" className="dark:text-slate-200">
                  Agendamento automático
                </Label>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {agendamentoAtivo ? 'Ativado' : 'Desativado'}
                </p>
              </div>
              <Switch
                id="agendamentoLogs"
                checked={agendamentoAtivo}
                onCheckedChange={setAgendamentoAtivo}
                className="cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="frequenciaLogs" className="dark:text-slate-300">
                  Frequência
                </Label>
                <Select
                  value={frequenciaAgendamento}
                  onValueChange={setFrequenciaAgendamento}
                  disabled={!agendamentoAtivo}
                >
                  <SelectTrigger
                    id="frequenciaLogs"
                    className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semanal" className="cursor-pointer">Semanal</SelectItem>
                    <SelectItem value="mensal" className="cursor-pointer">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retencaoLogs" className="dark:text-slate-300">
                  Manter logs por
                </Label>
                <Select
                  value={retencao}
                  onValueChange={setRetencao}
                  disabled={!agendamentoAtivo}
                >
                  <SelectTrigger
                    id="retencaoLogs"
                    className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6" className="cursor-pointer">6 meses</SelectItem>
                    <SelectItem value="12" className="cursor-pointer">12 meses</SelectItem>
                    <SelectItem value="24" className="cursor-pointer">24 meses</SelectItem>
                    <SelectItem value="nunca" className="cursor-pointer">Nunca limpar automaticamente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-md border border-slate-200 bg-white p-4 text-sm dark:border-[#3b4658] dark:bg-[#1f2937] sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">
                  Última limpeza
                </p>
                <p className="mt-1 text-slate-700 dark:text-slate-200">
                  Nunca executada
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">
                  Próxima limpeza
                </p>
                <p className="mt-1 text-slate-700 dark:text-slate-200">
                  Não agendada
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                disabled={!agendamentoAtivo}
                onClick={() => toast.info('Em breve será possível salvar o agendamento automático de limpeza dos logs.')}
                className="cursor-pointer bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#075985] dark:text-white dark:hover:bg-[#08679a]"
              >
                <Save className="mr-2 h-4 w-4" />
                Agendar
              </Button>
            </div>

          </CardContent>
        </Card>
      </div>

      <Dialog open={modalLimpezaOpen} onOpenChange={setModalLimpezaOpen}>
        <DialogContent className="max-w-md dark:border-[#2f394a] dark:bg-[#1f2937] dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-slate-100">
              <Trash2 className="h-5 w-5" />
              Limpar Logs Antigos
            </DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Selecione o período para remover registros antigos da auditoria.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="periodoLimpeza" className="dark:text-slate-300">
                Apagar logs com mais de
              </Label>
              <Select value={periodoLimpeza} onValueChange={setPeriodoLimpeza}>
                <SelectTrigger
                  id="periodoLimpeza"
                  className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100"
                >
                  <SelectValue placeholder="Selecione o período desejado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6" className="cursor-pointer">6 meses</SelectItem>
                  <SelectItem value="12" className="cursor-pointer">12 meses</SelectItem>
                  <SelectItem value="24" className="cursor-pointer">24 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 dark:border-[#3b4658] dark:bg-[#273447]">
              <div>
                <Label htmlFor="backupAntesLimpeza" className="dark:text-slate-200">
                  Fazer backup antes de apagar logs
                </Label>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {fazerBackupAntesLimpeza ? 'Ativado' : 'Desativado'}
                </p>
              </div>
              <Switch
                id="backupAntesLimpeza"
                checked={fazerBackupAntesLimpeza}
                onCheckedChange={setFazerBackupAntesLimpeza}
                className="cursor-pointer"
              />
            </div>

            <div className="rounded-md bg-slate-50 px-4 py-3 text-sm italic dark:bg-[#273447]">
              <p className="text-center text-slate-600 dark:text-slate-300">
                <span className="font-semibold italic text-red-600 dark:text-[#e7a0a9]">ATENÇÃO:</span>{' '}
                Esta ação removerá permanentemente os logs anteriores ao período selecionado e não poderá ser desfeita.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalLimpezaOpen(false)}
              disabled={isCleaningLogs}
              className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isCleaningLogs || !periodoLimpeza}
              onClick={openNextCleanupStep}
              className="cursor-pointer bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-[#075985] dark:text-white"
            >
              Confirmar Limpeza
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalBackupLimpezaOpen} onOpenChange={setModalBackupLimpezaOpen}>
        <DialogContent className="max-w-md dark:border-[#2f394a] dark:bg-[#1f2937] dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-slate-100">
              <Save className="h-5 w-5" />
              Backup dos Logs
            </DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Gere o arquivo com os logs que serão removidos antes da confirmação final.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md bg-slate-50 px-4 py-3 text-sm dark:bg-[#273447]">
              <p className="text-center text-slate-600 dark:text-slate-300">
                Será gerado um backup SQL dos logs com mais de {periodoLimpeza} meses antes da confirmação final da limpeza.
              </p>
            </div>

            <div className="rounded-md bg-slate-50 px-4 py-3 text-sm italic dark:bg-[#273447]">
              <p className="text-center text-slate-600 dark:text-slate-300">
                <span className="font-semibold italic text-red-600 dark:text-[#e7a0a9]">ATENÇÃO:</span>{' '}
                Certifique-se de salvar o arquivo gerado antes de continuar com a limpeza dos logs.
            </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalBackupLimpezaOpen(false)}
              disabled={isGeneratingBackup}
              className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isGeneratingBackup}
              onClick={handleGenerateCleanupBackup}
              className="cursor-pointer bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-[#075985] dark:text-white"
            >
              {isGeneratingBackup ? 'Gerando...' : 'Gerar backup e continuar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalConfirmacaoLimpezaOpen} onOpenChange={setModalConfirmacaoLimpezaOpen}>
        <DialogContent className="max-w-md gap-7 py-7 dark:border-[#2f394a] dark:bg-[#1f2937] dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-slate-100">
              <Trash2 className="h-5 w-5" />
              Confirmar Limpeza
            </DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Esta limpeza ajuda a manter a auditoria mais leve.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-[150px] items-center rounded-md bg-slate-50 px-5 py-4 text-sm italic dark:bg-[#273447]">
            <p className="text-center text-slate-600 dark:text-slate-300">
              <span className="mb-1 block font-semibold italic text-red-600 dark:text-[#e7a0a9]">ATENÇÃO:</span>
              Serão removidos permanentemente os logs com mais de {periodoLimpeza} meses. Deseja continuar?
            </p>
          </div>

          <DialogFooter className="mt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalConfirmacaoLimpezaOpen(false)}
              disabled={isCleaningLogs}
              className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isCleaningLogs}
              onClick={handleConfirmCleanup}
              className="cursor-pointer bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-[#075985] dark:text-white"
            >
              {isCleaningLogs ? 'Limpando...' : 'Sim, limpar logs'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
