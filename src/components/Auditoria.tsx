import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowDown, ArrowUp, ArrowUpDown, Eye, Filter, Loader2, Maximize2, RotateCcw, ShieldCheck, WrapText } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { AUTH_TOKEN_KEY } from '../lib/auth';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

type AuditLog = {
  id: number;
  occurredAt: string;
  userId: number | null;
  username: string | null;
  userName: string | null;
  profile: string | null;
  action: string;
  module: string;
  description: string | null;
  status: string | null;
  ip: string | null;
  method: string | null;
  route: string | null;
  dataBefore: string | null;
  dataAfter: string | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type Filters = {
  startDate: string;
  endDate: string;
  login: string;
  action: string;
  module: string;
  status: string;
};

type FilterOption = {
  value: string;
  label: string;
};

type FilterOptions = {
  actions: FilterOption[];
  users: FilterOption[];
  modules: FilterOption[];
};

type SortColumn = 'dataHora' | 'login' | 'perfil' | 'acao' | 'modulo' | 'status' | 'ip';
type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis';

type AuditoriaProps = {
  onBack?: () => void;
};

const DEFAULT_FILTERS: Filters = {
  startDate: '',
  endDate: '',
  login: '',
  action: 'todos',
  module: 'todos',
  status: 'todos',
};

const DEFAULT_PAGINATION: Pagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  actions: [
    { value: 'todos', label: 'Todos' },
    { value: 'LOGIN', label: 'Login' },
    { value: 'CADASTRO', label: 'Cadastro' },
    { value: 'ALTERACAO', label: 'Alteração' },
    { value: 'EXCLUSAO', label: 'Exclusão' },
  ],
  users: [],
  modules: [],
};

const BASE_ACTION_OPTIONS: FilterOption[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'CADASTRO', label: 'Cadastro' },
  { value: 'ALTERACAO', label: 'Alteração' },
  { value: 'EXCLUSAO', label: 'Exclusão' },
];

const LOGIN_ACTION_OPTION: FilterOption = { value: 'LOGIN', label: 'Login' };
const ACTIVATION_ACTION_OPTION: FilterOption = { value: 'ATIVACAO_INATIVACAO', label: 'Ativação/Inativação' };
const FINANCIAL_STATUS_ACTION_OPTION: FilterOption = { value: 'STATUS_FINANCEIRO', label: 'Status Financeiro' };
const PAYABLE_STATUS_ACTION_OPTION: FilterOption = { value: 'STATUS_PAGAMENTO', label: 'Status Pago/Não Pago' };
const RECEIVABLE_STATUS_ACTION_OPTION: FilterOption = { value: 'STATUS_RECEBIMENTO', label: 'Status Recebido/Não Recebido' };
const BACKUP_ACTION_OPTION: FilterOption = { value: 'BACKUP', label: 'Backup' };
const ACTIVATION_MODULES = new Set(['USUARIOS', 'TIPOS_PAGAMENTO', 'PLANO_CONTAS']);
const INFO_STATUS_MODULES = new Set(['MANUTENCAO']);

const getStatusOptionsForModule = (module: string): FilterOption[] => {
  const options = [
    { value: 'todos', label: 'Todos' },
    { value: 'SUCESSO', label: 'Sucesso' },
  ];

  if (module === 'todos' || INFO_STATUS_MODULES.has(module)) {
    options.push({ value: 'INFO', label: 'Informativo' });
  }

  options.push({ value: 'ERRO', label: 'Erro' });

  return options;
};

const getActionOptionsForModule = (module: string): FilterOption[] => {
  if (module === 'todos') {
    return [{ value: 'todos', label: 'Todos' }, LOGIN_ACTION_OPTION, ...BASE_ACTION_OPTIONS.slice(1), ACTIVATION_ACTION_OPTION, FINANCIAL_STATUS_ACTION_OPTION];
  }

  if (module === 'LOGIN') {
    return [{ value: 'todos', label: 'Todos' }, LOGIN_ACTION_OPTION];
  }

  if (module === 'BACKUP') {
    return [{ value: 'todos', label: 'Todos' }, BACKUP_ACTION_OPTION];
  }

  if (module === 'CONTAS_PAGAR') {
    return [...BASE_ACTION_OPTIONS, PAYABLE_STATUS_ACTION_OPTION];
  }

  if (module === 'CONTAS_RECEBER') {
    return [...BASE_ACTION_OPTIONS, RECEIVABLE_STATUS_ACTION_OPTION];
  }

  if (ACTIVATION_MODULES.has(module)) {
    return [...BASE_ACTION_OPTIONS, ACTIVATION_ACTION_OPTION];
  }

  if (module === 'MANUTENCAO') {
    return [{ value: 'todos', label: 'Todos' }, { value: 'EXCLUSAO', label: 'Exclusão' }, BACKUP_ACTION_OPTION];
  }

  return BASE_ACTION_OPTIONS;
};

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || '';

const getAuthHeaders = () => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

const readApiResponse = async (response: Response) => {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    const isHtml = text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html');
    throw new Error(
      isHtml
        ? 'A rota de auditoria ainda não está respondendo pela API. Reinicie a API e tente novamente.'
        : 'Resposta inválida da API de auditoria.',
    );
  }
};

const formatDateTime = (value: string) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
};

const formatJson = (value: string | null) => {
  if (!value) return '-';

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

const formatModuleLabel = (value: string) => {
  const labels: Record<string, string> = {
    AUTENTICACAO: 'Login',
    LOGIN: 'Login',
    USUARIOS: 'Usuários',
    PLANO_CONTAS: 'Plano de Contas',
    PLANO_CONTAS_TIPOS: 'Plano Contas > Tipos',
    PLANO_CONTAS_CATEGORIAS: 'Plano Contas > Categorias',
    TIPOS_PAGAMENTO: 'Tipos de Pagamento',
    TIPOS_CONTAS: 'Plano de Contas',
    CATEGORIAS_TIPOS_CONTAS: 'Plano de Contas',
    CONTAS_PAGAR: 'Contas a Pagar',
    CONTAS_RECEBER: 'Contas a Receber',
    RECEITAS: 'Receitas',
    DESPESAS: 'Despesas',
    BACKUP: 'Manutenção/Backups',
    MANUTENCAO: 'Manutenção/Logs',
  };

  if (labels[value]) return labels[value];

  return value
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getActionLabel = (value: string | null) => {
  if (!value) return '-';

  if (value.includes('BACKUP')) return 'Backup';
  if (value.includes('LOGIN')) return 'Login';
  if (value.includes('CREATE') || value.includes('CADASTRO')) return 'Cadastro';
  if (value.includes('DELETE') || value.includes('REMOVE') || value.includes('EXCLUSAO') || value.includes('EXCLUSÃO')) return 'Exclusão';
  if (value.includes('INACTIVE') || value.includes('INATIV') || value.includes('DESATIV')) return 'Inativação';
  if (value.includes('ATIVACAO') || value.includes('ATIVAÇÃO') || value.includes('REATIV')) return 'Ativação';
  if (value.includes('DESPAGAMENTO')) return 'Status > Não Pago';
  if (value.includes('PAGAMENTO')) return 'Status > Pago';
  if (value.includes('DESRECEBIMENTO')) return 'Status > Não Recebido';
  if (value.includes('RECEBIMENTO')) return 'Status > Recebido';
  if (value.includes('UPDATE') || value.includes('ALTER')) return 'Alteração';

  return value;
};

const getStatusBadge = (status: string | null) => {
  if (status === 'SUCESSO') {
    return <Badge className="bg-green-100 text-green-700 dark:border-[#2f394a] dark:bg-[#273447] dark:text-[#8bd8b1]">Sucesso</Badge>;
  }

  if (status === 'ERRO') {
    return <Badge className="bg-red-100 text-red-700 dark:border-[#2f394a] dark:bg-[#273447] dark:text-[#e7a0a9]">Erro</Badge>;
  }

  if (status === 'INFO') {
    return <Badge className="bg-blue-100 text-blue-700 dark:border-[#2f394a] dark:bg-[#273447] dark:text-[#7fb7e8]">Informativo</Badge>;
  }

  return <Badge className="bg-gray-100 text-slate-600 dark:border-[#2f394a] dark:bg-[#273447] dark:text-slate-300">{status || '-'}</Badge>;
};

const scrollAreaClassName = '[&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-corner]:bg-gray-50 [&::-webkit-scrollbar-thumb]:cursor-default [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-white [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:cursor-default [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent dark:[&::-webkit-scrollbar-corner]:bg-[#273447] dark:[&::-webkit-scrollbar-thumb]:border-[#273447] dark:[&::-webkit-scrollbar-thumb]:bg-[#4b5b70]';

export default function Auditoria({ onBack }: AuditoriaProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [pagination, setPagination] = useState<Pagination>(DEFAULT_PAGINATION);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(DEFAULT_FILTER_OPTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [fullDataModal, setFullDataModal] = useState<{ title: string; content: string } | null>(null);
  const [wrapFullDataLines, setWrapFullDataLines] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>('dataHora');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const scrollToPaginationBottomRef = useRef(false);
  const paginationRef = useRef<HTMLDivElement>(null);

  const primeiroRegistro = pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const ultimoRegistro = Math.min(pagination.page * pagination.limit, pagination.total);
  const paginationItems = useMemo<PaginationItem[]>(() => {
    const totalPages = pagination.totalPages;
    const currentPage = pagination.page;

    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, 'end-ellipsis', totalPages];
    }

    if (currentPage >= totalPages - 2) {
      return [1, 'start-ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, 'start-ellipsis', currentPage - 1, currentPage, currentPage + 1, 'end-ellipsis', totalPages];
  }, [pagination.page, pagination.totalPages]);
  const currentUserLogins = useMemo(
    () => new Set(filterOptions.users.map((user) => user.value)),
    [filterOptions.users],
  );
  const actionOptions = useMemo(() => getActionOptionsForModule(filters.module), [filters.module]);
  const statusOptions = useMemo(() => getStatusOptionsForModule(filters.module), [filters.module]);

  const fetchLogs = async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        sortBy: sortColumn,
        sortDirection,
      });

      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value && value !== 'todos') params.set(key, value);
      });

      const response = await fetch(`${getApiBaseUrl()}/api/audit-logs?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const result = await readApiResponse(response);

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao carregar auditoria.');
      }

      setLogs(result.data?.items || []);
      setPagination(result.data?.pagination || DEFAULT_PAGINATION);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar auditoria.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasSearched) return;
    fetchLogs();
  }, [pagination.page, pagination.limit, appliedFilters, sortColumn, sortDirection, hasSearched]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/audit-logs/filter-options`, {
          headers: getAuthHeaders(),
        });
        const result = await readApiResponse(response);

        if (!response.ok || !result?.success) {
          throw new Error(result?.error || 'Erro ao carregar filtros de auditoria.');
        }

        setFilterOptions({
          actions: result.data?.actions?.length ? result.data.actions : DEFAULT_FILTER_OPTIONS.actions,
          users: result.data?.users || [],
          modules: result.data?.modules || [],
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar filtros de auditoria.');
      }
    };

    fetchFilterOptions();
  }, []);

  useEffect(() => {
    if (!isLoading && scrollToPaginationBottomRef.current) {
      scrollToPaginationBottomRef.current = false;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          paginationRef.current?.scrollIntoView({ block: 'end', behavior: 'auto' });
          paginationRef.current?.closest('main')?.scrollBy({ top: 80, behavior: 'auto' });
        });
      });
    }
  }, [isLoading, logs]);

  const scrollToPaginationBottomAfterLoad = () => {
    scrollToPaginationBottomRef.current = true;
  };

  const handleLimitChange = (value: string) => {
    if (!hasSearched) {
      setPagination((prev) => ({ ...prev, page: 1, limit: Number(value) }));
      return;
    }

    scrollToPaginationBottomAfterLoad();
    setPagination((prev) => ({ ...prev, page: 1, limit: Number(value) }));
  };

  const handlePageChange = (page: number) => {
    if (!hasSearched) return;

    scrollToPaginationBottomAfterLoad();
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleSort = (column: SortColumn) => {
    if (!hasSearched) return;

    setPagination((prev) => ({ ...prev, page: 1 }));

    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortColumn(column);
    setSortDirection('asc');
  };

  const handleModuleChange = (value: string) => {
    const nextActionOptions = getActionOptionsForModule(value);
    const nextStatusOptions = getStatusOptionsForModule(value);

    setFilters((prev) => ({
      ...prev,
      module: value,
      action: nextActionOptions.some((action) => action.value === prev.action) ? prev.action : 'todos',
      status: nextStatusOptions.some((status) => status.value === prev.status) ? prev.status : 'todos',
    }));
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-1 inline h-4 w-4" />;
    }

    return sortDirection === 'asc' ? <ArrowUp className="ml-1 inline h-4 w-4" /> : <ArrowDown className="ml-1 inline h-4 w-4" />;
  };

  const getProfileLabel = (log: AuditLog) => {
    if (log.username && filterOptions.users.length > 0 && !currentUserLogins.has(log.username)) {
      return 'Não cadastrado';
    }

    return log.profile || '-';
  };

  const handleStartDateChange = (value: string) => {
    if (value && filters.endDate && value > filters.endDate) {
      toast.error('Data início não pode ser maior que data fim.');
      return;
    }

    setFilters((prev) => ({ ...prev, startDate: value }));
  };

  const handleEndDateChange = (value: string) => {
    if (value && filters.startDate && value < filters.startDate) {
      toast.error('Data fim não pode ser menor que data início.');
      return;
    }

    setFilters((prev) => ({ ...prev, endDate: value }));
  };

  const applyFilters = () => {
    if (filters.startDate && filters.endDate && filters.endDate < filters.startDate) {
      toast.error('Data fim não pode ser menor que data início.');
      return;
    }

    setPagination((prev) => ({ ...prev, page: 1 }));
    setHasSearched(true);
    setAppliedFilters(filters);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setLogs([]);
    setPagination(DEFAULT_PAGINATION);
    setIsLoading(false);
    setHasSearched(false);
    setAppliedFilters(DEFAULT_FILTERS);
  };

  const openDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 dark:text-slate-100">
              <ShieldCheck className="w-6 h-6" />
              Histórico de Ações
            </CardTitle>
            <CardDescription className="mt-2 dark:text-slate-400">Logs do Sistema</CardDescription>
          </div>
          {onBack && (
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="w-full cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155] md:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          )}
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <div className="space-y-2">
              <Label>Módulo</Label>
              <Select value={filters.module} onValueChange={handleModuleChange}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.modules.map((module) => (
                    <SelectItem key={module.value} value={module.value} className="cursor-pointer">
                      {module.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ação</Label>
              <Select value={filters.action} onValueChange={(value) => setFilters((prev) => ({ ...prev, action: value }))}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {actionOptions.map((action) => (
                    <SelectItem key={action.value} value={action.value} className="cursor-pointer">
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Select value={filters.login || 'todos'} onValueChange={(value) => setFilters((prev) => ({ ...prev, login: value }))}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="cursor-pointer">Todos</SelectItem>
                  {filterOptions.users.map((user) => (
                    <SelectItem key={user.value} value={user.value} className="cursor-pointer">
                      {user.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data início</Label>
              <Input
                type="date"
                value={filters.startDate}
                max={filters.endDate || undefined}
                onChange={(event) => handleStartDateChange(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data fim</Label>
              <Input
                type="date"
                value={filters.endDate}
                min={filters.startDate || undefined}
                onChange={(event) => handleEndDateChange(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value} className="cursor-pointer">
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
            <Button variant="outline" className="cursor-pointer" onClick={clearFilters}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Limpar
            </Button>
            <Button className="cursor-pointer bg-green-600 hover:bg-green-700 dark:bg-[#273447] dark:text-[#8bd8b1] dark:hover:bg-[#314155] dark:border dark:border-[#3b4658]" onClick={applyFilters}>
              <Filter className="mr-2 h-4 w-4" />
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button type="button" className="cursor-pointer" onClick={() => handleSort('dataHora')}>
                      Data/Hora {getSortIcon('dataHora')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" className="cursor-pointer" onClick={() => handleSort('login')}>
                      Login {getSortIcon('login')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" className="cursor-pointer" onClick={() => handleSort('perfil')}>
                      Perfil {getSortIcon('perfil')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" className="cursor-pointer" onClick={() => handleSort('acao')}>
                      Ação {getSortIcon('acao')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" className="cursor-pointer" onClick={() => handleSort('modulo')}>
                      Módulo {getSortIcon('modulo')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" className="cursor-pointer" onClick={() => handleSort('status')}>
                      Status {getSortIcon('status')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" className="cursor-pointer" onClick={() => handleSort('ip')}>
                      IP {getSortIcon('ip')}
                    </button>
                  </TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!hasSearched && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-gray-500 dark:text-slate-400">
                      Informe os filtros e clique em Filtrar para consultar os logs.
                    </TableCell>
                  </TableRow>
                )}
                {hasSearched && isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-gray-500">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-[#7fb7e8]" />
                        Carregando auditoria...
                      </span>
                    </TableCell>
                  </TableRow>
                )}
                {hasSearched && !isLoading && logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-gray-500">
                      Nenhum log encontrado.
                    </TableCell>
                  </TableRow>
                )}
                {hasSearched && !isLoading &&
                  logs.map((log) => (
                    <TableRow key={log.id} className="dark:hover:bg-[#273447]/70">
                      <TableCell>{formatDateTime(log.occurredAt)}</TableCell>
                      <TableCell>{log.username || '-'}</TableCell>
                      <TableCell>{getProfileLabel(log)}</TableCell>
                      <TableCell>{getActionLabel(log.action)}</TableCell>
                      <TableCell>{formatModuleLabel(log.module)}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>{log.ip || '-'}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="cursor-pointer dark:text-slate-400 dark:hover:bg-[#314155] dark:hover:text-slate-200"
                          title="Visualizar"
                          onClick={() => openDetails(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          <div ref={paginationRef} className="mt-4 flex flex-col items-center gap-3 border-t pt-4 dark:border-[#2f394a] md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col items-center gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-slate-300">Registros por página</span>
                <Select
                  value={String(pagination.limit)}
                  onValueChange={handleLimitChange}
                >
                  <SelectTrigger className="h-9 w-[84px] cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5" className="cursor-pointer lg:hidden">5</SelectItem>
                    <SelectItem value="10" className="cursor-pointer">10</SelectItem>
                    <SelectItem value="25" className="cursor-pointer">25</SelectItem>
                    <SelectItem value="50" className="cursor-pointer">50</SelectItem>
                    <SelectItem value="100" className="cursor-pointer">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-center text-sm text-gray-500 dark:text-slate-400 md:text-left">
                Mostrando {primeiroRegistro}-{ultimoRegistro} de {pagination.total} registros
              </span>
              {isLoading && logs.length > 0 && (
                <span className="hidden items-center gap-1.5 text-sm text-blue-600 dark:text-[#7fb7e8] md:inline-flex">
                  <Loader2 className="h-4 w-4 animate-spin dark:text-[#7fb7e8]" />
                  Carregando...
                </span>
              )}
            </div>

            {isLoading && logs.length > 0 && (
              <span className="inline-flex items-center justify-center gap-1.5 text-sm text-blue-600 dark:text-[#7fb7e8] md:hidden">
                <Loader2 className="h-4 w-4 animate-spin dark:text-[#7fb7e8]" />
                Carregando...
              </span>
            )}

            <div className="flex w-full max-w-sm items-center justify-center gap-2 md:hidden">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-600 dark:text-slate-300">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]"
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))}
              >
                Próxima
              </Button>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
              >
                Anterior
              </Button>
              {paginationItems.map((item) =>
                typeof item === 'number' ? (
                  <Button
                    key={item}
                    variant={item === pagination.page ? 'default' : 'outline'}
                    size="sm"
                    className={
                      item === pagination.page
                        ? 'cursor-pointer bg-blue-600 text-white hover:bg-blue-700 dark:bg-[#075985] dark:text-white dark:hover:bg-[#0e7490]'
                        : 'cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]'
                    }
                    disabled={isLoading}
                    onClick={() => handlePageChange(item)}
                  >
                    {item}
                  </Button>
                ) : (
                  <span key={item} className="px-1 text-sm text-gray-500 dark:text-slate-400">...</span>
                ),
              )}
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]"
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))}
              >
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl dark:border-[#2f394a] dark:bg-[#1f2937] dark:text-slate-100">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div><Label>Data/Hora</Label><p>{formatDateTime(selectedLog.occurredAt)}</p></div>
                <div><Label>Usuário</Label><p>{selectedLog.username || '-'}</p></div>
                <div><Label>Status</Label><div className="mt-1">{getStatusBadge(selectedLog.status)}</div></div>
                <div><Label>Ação</Label><p>{getActionLabel(selectedLog.action)}</p></div>
                <div><Label>Módulo</Label><p>{formatModuleLabel(selectedLog.module)}</p></div>
                <div><Label>IP</Label><p>{selectedLog.ip || '-'}</p></div>
                <div className="md:col-span-3"><Label>Descrição</Label><p>{selectedLog.description || '-'}</p></div>
                <div className="md:col-span-3"><Label>Rota</Label><p>{selectedLog.method || '-'} {selectedLog.route || '-'}</p></div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Dados Antes</Label>
                  <div className="relative mt-2 min-w-0">
                    {selectedLog.dataBefore && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-4 top-3 z-10 h-7 w-7 cursor-pointer border border-gray-200 bg-white p-0 text-slate-500 hover:bg-gray-100 hover:text-slate-700 dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-400 dark:hover:bg-[#314155] dark:hover:text-slate-200"
                        title="Ver completo"
                        onClick={() => setFullDataModal({ title: 'Dados Antes', content: formatJson(selectedLog.dataBefore) })}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    )}
                    <pre className={`max-h-32 min-w-0 max-w-full overflow-auto rounded border bg-gray-50 p-3 pr-16 text-xs dark:border-[#3b4658] dark:bg-[#273447] ${scrollAreaClassName}`}>
                      {formatJson(selectedLog.dataBefore)}
                    </pre>
                  </div>
                </div>
                <div>
                  <Label>Dados Depois</Label>
                  <div className="relative mt-2 min-w-0">
                    {selectedLog.dataAfter && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-4 top-3 z-10 h-7 w-7 cursor-pointer border border-gray-200 bg-white p-0 text-slate-500 hover:bg-gray-100 hover:text-slate-700 dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-400 dark:hover:bg-[#314155] dark:hover:text-slate-200"
                        title="Ver completo"
                        onClick={() => setFullDataModal({ title: 'Dados Depois', content: formatJson(selectedLog.dataAfter) })}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    )}
                    <pre className={`max-h-32 min-w-0 max-w-full overflow-auto rounded border bg-gray-50 p-3 pr-16 text-xs dark:border-[#3b4658] dark:bg-[#273447] ${scrollAreaClassName}`}>
                      {formatJson(selectedLog.dataAfter)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="cursor-pointer" onClick={() => setDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(fullDataModal)} onOpenChange={(open) => !open && setFullDataModal(null)}>
        <DialogContent className="max-w-4xl dark:border-[#2f394a] dark:bg-[#1f2937] dark:text-slate-100">
          <DialogHeader>
            <DialogTitle>{fullDataModal?.title}</DialogTitle>
          </DialogHeader>
          <div className="relative min-w-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="absolute right-4 top-3 z-10 h-7 w-7 cursor-pointer bg-white p-0 text-slate-500 hover:bg-gray-100 hover:text-slate-700 dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-400 dark:hover:bg-[#314155] dark:hover:text-slate-200"
              title={wrapFullDataLines ? 'Manter linhas' : 'Quebrar linhas'}
              onClick={() => setWrapFullDataLines((prev) => !prev)}
            >
              <WrapText className="h-4 w-4" />
            </Button>
            <pre className={`max-h-[65vh] min-w-0 max-w-full overflow-auto rounded border bg-gray-50 p-4 pr-16 text-xs dark:border-[#3b4658] dark:bg-[#273447] ${scrollAreaClassName} ${wrapFullDataLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}>
              {fullDataModal?.content || '-'}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="outline" className="cursor-pointer" onClick={() => setFullDataModal(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
