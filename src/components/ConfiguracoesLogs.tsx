import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { ArrowLeft, CalendarClock, FileCog, Save, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';

type ConfiguracoesLogsProps = {
  onBack: () => void;
};

export default function ConfiguracoesLogs({ onBack }: ConfiguracoesLogsProps) {
  const [retencao, setRetencao] = useState('12');
  const [agendamentoAtivo, setAgendamentoAtivo] = useState(false);
  const [frequenciaAgendamento, setFrequenciaAgendamento] = useState('mensal');
  const [periodoLimpeza, setPeriodoLimpeza] = useState('12');
  const [modalLimpezaOpen, setModalLimpezaOpen] = useState(false);

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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6" className="cursor-pointer">6 meses</SelectItem>
                  <SelectItem value="12" className="cursor-pointer">12 meses</SelectItem>
                  <SelectItem value="24" className="cursor-pointer">24 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-[#3b4658] dark:bg-[#273447]">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Esta ação removerá permanentemente os logs anteriores ao período selecionado.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalLimpezaOpen(false)}
              className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled
              className="cursor-not-allowed bg-blue-600 opacity-70 hover:bg-blue-600 dark:bg-[#075985] dark:text-white"
            >
              Confirmar Limpeza
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
