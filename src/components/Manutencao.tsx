import { Database, ShieldCheck, Wrench } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

type ManutencaoTarget = 'auditoria' | 'backup';

type ManutencaoProps = {
  onNavigate: (target: ManutencaoTarget) => void;
};

export default function Manutencao({ onNavigate }: ManutencaoProps) {
  const options = [
    {
      id: 'auditoria' as const,
      title: 'Auditoria',
      description: 'Histórico de ações e acessos',
      icon: ShieldCheck,
      enabled: true,
    },
    {
      id: 'backup' as const,
      title: 'Backup',
      description: 'Exportação SQL dos dados',
      icon: Database,
      enabled: true,
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="py-5">
          <CardTitle className="flex items-center gap-2 dark:text-slate-100">
            <Wrench className="h-6 w-6" />
            Manutenção
          </CardTitle>
          <CardDescription className="mt-2 dark:text-slate-400">
            Ferramentas técnicas do sistema
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {options.map((option) => {
          const Icon = option.icon;

          return (
            <button
              key={option.id}
              type="button"
              disabled={!option.enabled}
              onClick={() => option.enabled && onNavigate(option.id)}
              className={`group text-left ${option.enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
            >
              <Card className="h-full border-gray-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/40 dark:border-[#2f394a] dark:bg-[#1f2a37] dark:hover:border-[#5b93d6] dark:hover:bg-[#20344e] dark:hover:ring-1 dark:hover:ring-[#5b93d6]/30 dark:hover:shadow-lg">
                <CardContent className="flex h-full items-start gap-4 p-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600 transition-colors duration-200 dark:bg-[#273447] dark:text-slate-400 dark:group-hover:bg-[#2a4260]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{option.title}</h3>
                      {!option.enabled && (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-[#273447] dark:text-slate-400">
                          Em breve
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{option.description}</p>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
