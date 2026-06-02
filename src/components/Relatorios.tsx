import { useEffect, useMemo, useState } from 'react';
import { FileText, Download, Filter, TrendingUp, RotateCcw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { getAuthToken } from '../lib/auth';
import SearchableSelect from './SearchableSelect';

type ApiPaymentType = {
  id: number;
  name: string;
  status?: boolean | number | string | null;
};

type ApiOrigin = {
  id: number;
  description?: string | null;
  category?: number | string | null;
  person?: boolean | number | string | null;
};

type ApiCategory = {
  id: number;
  description?: string | null;
};

type ApiAccountType = {
  id: number;
  description?: string | null;
  type?: 'Receita' | 'Despesa' | string | null;
  status?: boolean | number | string | null;
  category?: ApiCategory;
};

type ApiCashAccount = {
  id: number;
  name?: string | null;
  status?: boolean | number | string | null;
};

type ApiAccount = {
  id: number;
  description?: string | null;
  nominalDate?: string | null;
  dueDate?: string | null;
  paymentDate?: string | null;
  paymentTypeId?: number | null;
  documentNumber?: string | null;
  value?: number | string | null;
  paid?: boolean | number | string | null;
  originId?: number | null;
  paymentType?: ApiPaymentType;
};

type ApiIncome = {
  id: number;
  description?: string | null;
  value?: number | string | null;
  incomeDate?: string | null;
  accountTypeId?: number | null;
  cashAccountId?: number | null;
  accountType?: ApiAccountType;
  cashAccount?: ApiCashAccount;
};

type ApiExpense = {
  id: number;
  description?: string | null;
  value?: number | string | null;
  expenseDate?: string | null;
  accountTypeId?: number | null;
  cashAccountId?: number | null;
  accountType?: ApiAccountType;
  cashAccount?: ApiCashAccount;
};

type ReportItem = {
  id: string;
  codigo: number;
  modulo: 'pagar' | 'receber';
  descricao: string;
  formaPgto: string;
  paymentTypeId: number | null;
  dataNominal: string;
  dataEfetiva: string;
  valor: number;
  status: 'realizado' | 'pendente' | 'vencido';
  statusLabel: string;
  origem: string;
  originId: number | null;
  pessoa: boolean;
};

type MovementItem = {
  id: string;
  codigo: number;
  tipo: 'receita' | 'despesa';
  descricao: string;
  tipoConta: string;
  categoria: string;
  contaCaixa: string;
  accountTypeId: number | null;
  cashAccountId: number | null;
  data: string;
  valor: number;
};

type CashBookItem = MovementItem & {
  entrada: number;
  saida: number;
  saldo: number;
};

type OriginSummary = {
  key: string;
  origem: string;
  pessoa: boolean;
  modulo: ReportItem['modulo'] | 'todos';
  total: number;
  realizado: number;
  pendente: number;
  vencido: number;
  quantidade: number;
};

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || '';
const isActiveStatus = (status: boolean | number | string | null | undefined) => status !== false && status !== 0 && status !== '0' && status !== 'false';
const isTrue = (value: boolean | number | string | null | undefined) => value === true || value === 1 || value === '1' || value === 'true';

const normalizeDateInput = (value?: string | null) => {
  if (!value) return '';
  return value.slice(0, 10);
};

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultAccountsDateRange = () => {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 30);

  return {
    start: formatDateInput(startDate),
    end: formatDateInput(endDate),
  };
};

const getDefaultMovementsDateRange = () => {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);

  return {
    start: formatDateInput(startDate),
    end: formatDateInput(endDate),
  };
};

const formatDateBR = (value: string) => {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return '-';
  return `${day}/${month}/${year}`;
};

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getAccountModuleShortLabel = (modulo: ReportItem['modulo']) => (modulo === 'pagar' ? 'CP' : 'CR');
const getOriginPersonLabel = (modulo: ReportItem['modulo'] | 'todos', compact = false) => {
  if (modulo === 'pagar') return 'Fornecedor';
  if (modulo === 'receber') return 'Cliente';
  return compact ? 'Forn./Cli.' : 'Fornecedor/Cliente';
};
const getOriginTypeLabel = (pessoa: boolean, modulo: ReportItem['modulo'] | 'todos', compact = false) =>
  pessoa ? getOriginPersonLabel(modulo, compact) : 'Operação';

const formatDateTimeBR = (date = new Date()) =>
  date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getReportFileTimestamp = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}-${hours}h${minutes}`;
};

const downloadHtmlFile = (html: string, filename: string, type: string) => {
  const blob = new Blob([html], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getAuthHeaders = () => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

const getAccountStatus = (account: ApiAccount): ReportItem['status'] => {
  if (isTrue(account.paid)) return 'realizado';

  const dueDate = normalizeDateInput(account.dueDate);
  if (dueDate && dueDate < new Date().toISOString().slice(0, 10)) {
    return 'vencido';
  }

  return 'pendente';
};

const getStatusLabel = (status: ReportItem['status'], modulo: ReportItem['modulo']) => {
  if (status === 'realizado') return modulo === 'pagar' ? 'Pago' : 'Recebido';
  if (status === 'pendente') return 'Pendente';
  return 'Vencido';
};

const mapAccountToReportItem = (
  account: ApiAccount,
  modulo: ReportItem['modulo'],
  originsById: Map<number, ApiOrigin>,
): ReportItem => {
  const status = getAccountStatus(account);
  const origin = account.originId ? originsById.get(account.originId) : undefined;

  return {
    id: `${modulo}-${account.id}`,
    codigo: account.id,
    modulo,
    descricao: account.description || '',
    formaPgto: account.paymentType?.name || '-',
    paymentTypeId: account.paymentTypeId ?? null,
    dataNominal: normalizeDateInput(account.nominalDate),
    dataEfetiva: normalizeDateInput(account.dueDate),
    valor: Number(account.value || 0),
    status,
    statusLabel: getStatusLabel(status, modulo),
    origem: origin?.description || '-',
    originId: account.originId ?? null,
    pessoa: isTrue(origin?.person),
  };
};

const mapIncomeToMovementItem = (
  income: ApiIncome,
  accountTypesById: Map<number, ApiAccountType>,
  cashAccountsById: Map<number, ApiCashAccount>,
): MovementItem => {
  const accountType = income.accountTypeId ? accountTypesById.get(income.accountTypeId) : undefined;
  const cashAccount = income.cashAccountId ? cashAccountsById.get(income.cashAccountId) : undefined;

  return {
    id: `receita-${income.id}`,
    codigo: income.id,
    tipo: 'receita',
    descricao: income.description || '',
    tipoConta: income.accountType?.description || accountType?.description || '-',
    categoria: income.accountType?.category?.description || accountType?.category?.description || '-',
    contaCaixa: income.cashAccount?.name || cashAccount?.name || '-',
    accountTypeId: income.accountTypeId ?? null,
    cashAccountId: income.cashAccountId ?? null,
    data: normalizeDateInput(income.incomeDate),
    valor: Number(income.value || 0),
  };
};

const mapExpenseToMovementItem = (
  expense: ApiExpense,
  accountTypesById: Map<number, ApiAccountType>,
  cashAccountsById: Map<number, ApiCashAccount>,
): MovementItem => {
  const accountType = expense.accountTypeId ? accountTypesById.get(expense.accountTypeId) : undefined;
  const cashAccount = expense.cashAccountId ? cashAccountsById.get(expense.cashAccountId) : undefined;

  return {
    id: `despesa-${expense.id}`,
    codigo: expense.id,
    tipo: 'despesa',
    descricao: expense.description || '',
    tipoConta: expense.accountType?.description || accountType?.description || '-',
    categoria: expense.accountType?.category?.description || accountType?.category?.description || '-',
    contaCaixa: expense.cashAccount?.name || cashAccount?.name || '-',
    accountTypeId: expense.accountTypeId ?? null,
    cashAccountId: expense.cashAccountId ?? null,
    data: normalizeDateInput(expense.expenseDate),
    valor: Number(expense.value || 0),
  };
};

export default function Relatorios() {
  const defaultAccountsDateRange = useMemo(() => getDefaultAccountsDateRange(), []);
  const defaultMovementsDateRange = useMemo(() => getDefaultMovementsDateRange(), []);
  const [macroRelatorio, setMacroRelatorio] = useState('');
  const [tipoRelatorio, setTipoRelatorio] = useState('geral');
  const [tipoRelatorioMovimento, setTipoRelatorioMovimento] = useState('geral');
  const [moduloFiltro, setModuloFiltro] = useState<'todos' | 'pagar' | 'receber'>('todos');
  const [tipoPagamento, setTipoPagamento] = useState('todos');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [tipoData, setTipoData] = useState('efetiva');
  const [dataInicio, setDataInicio] = useState(defaultAccountsDateRange.start);
  const [dataFim, setDataFim] = useState(defaultAccountsDateRange.end);
  const [ordernarPor, setOrdernarPor] = useState('dataEfetiva');
  const [tipoOrdenacao, setTipoOrdenacao] = useState('crescente');
  const [origemSelecionada, setOrigemSelecionada] = useState('');
  const [filtroPessoa, setFiltroPessoa] = useState<'pessoa' | 'nao-pessoa' | 'todos'>('todos');
  const [movimentoFiltro, setMovimentoFiltro] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [tipoContaMovimento, setTipoContaMovimento] = useState('todos');
  const [contaCaixaMovimento, setContaCaixaMovimento] = useState('todas');
  const [dataInicioMovimento, setDataInicioMovimento] = useState(defaultMovementsDateRange.start);
  const [dataFimMovimento, setDataFimMovimento] = useState(defaultMovementsDateRange.end);
  const [ordernarMovimentoPor, setOrdernarMovimentoPor] = useState('data');
  const [tipoOrdenacaoMovimento, setTipoOrdenacaoMovimento] = useState('crescente');
  const [paymentTypes, setPaymentTypes] = useState<ApiPaymentType[]>([]);
  const [origins, setOrigins] = useState<ApiOrigin[]>([]);
  const [accountTypes, setAccountTypes] = useState<ApiAccountType[]>([]);
  const [cashAccounts, setCashAccounts] = useState<ApiCashAccount[]>([]);
  const [dadosBase, setDadosBase] = useState<ReportItem[]>([]);
  const [dadosFiltrados, setDadosFiltrados] = useState<ReportItem[]>([]);
  const [movimentosBase, setMovimentosBase] = useState<MovementItem[]>([]);
  const [movimentosFiltrados, setMovimentosFiltrados] = useState<MovementItem[]>([]);
  const [relatorioGerado, setRelatorioGerado] = useState(false);
  const [relatorioMovimentoGerado, setRelatorioMovimentoGerado] = useState(false);
  const [pdfPrintHtml, setPdfPrintHtml] = useState('');
  const [pdfPrintTitle, setPdfPrintTitle] = useState('');
  const [reportVolumeWarningOpen, setReportVolumeWarningOpen] = useState(false);
  const [pendingAccountsReportData, setPendingAccountsReportData] = useState<ReportItem[] | null>(null);
  const [pendingMovementsReportData, setPendingMovementsReportData] = useState<MovementItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchJson = async <T,>(path: string): Promise<T> => {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao carregar dados do relatório.');
    }

    return result.data as T;
  };

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const [payables, receivables, paymentTypesData, originsData, incomes, expenses, accountTypesData, cashAccountsData] = await Promise.all([
        fetchJson<ApiAccount[]>('/api/accounts-payable'),
        fetchJson<ApiAccount[]>('/api/accounts-receivable'),
        fetchJson<ApiPaymentType[]>('/api/payment-types'),
        fetchJson<ApiOrigin[]>('/api/origin-accounts'),
        fetchJson<ApiIncome[]>('/api/incomes'),
        fetchJson<ApiExpense[]>('/api/expenses'),
        fetchJson<ApiAccountType[]>('/api/account-types'),
        fetchJson<ApiCashAccount[]>('/api/cash-accounts'),
      ]);

      const originsMap = new Map((originsData || []).map((origin) => [origin.id, origin]));
      const accountTypesMap = new Map((accountTypesData || []).map((accountType) => [accountType.id, accountType]));
      const cashAccountsMap = new Map((cashAccountsData || []).map((cashAccount) => [cashAccount.id, cashAccount]));
      const items = [
        ...(payables || []).map((item) => mapAccountToReportItem(item, 'pagar', originsMap)),
        ...(receivables || []).map((item) => mapAccountToReportItem(item, 'receber', originsMap)),
      ];
      const movements = [
        ...(incomes || []).map((item) => mapIncomeToMovementItem(item, accountTypesMap, cashAccountsMap)),
        ...(expenses || []).map((item) => mapExpenseToMovementItem(item, accountTypesMap, cashAccountsMap)),
      ];

      setPaymentTypes((paymentTypesData || []).filter((item) => isActiveStatus(item.status)));
      setOrigins(originsData || []);
      setAccountTypes((accountTypesData || []).filter((item) => isActiveStatus(item.status)));
      setCashAccounts((cashAccountsData || []).filter((item) => isActiveStatus(item.status)));
      setDadosBase(items);
      setDadosFiltrados(items);
      setMovimentosBase(movements);
      setMovimentosFiltrados(movements);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar módulo de relatórios.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  const handleTipoRelatorioChange = (value: string) => {
    setTipoRelatorio(value);
    setRelatorioGerado(false);
    setDadosFiltrados(dadosBase);

    if (value === 'origem') {
      setDataInicio('');
      setDataFim('');
      return;
    }

    if (value === 'geral' && !dataInicio && !dataFim) {
      setDataInicio(defaultAccountsDateRange.start);
      setDataFim(defaultAccountsDateRange.end);
    }
  };

  const handleTipoRelatorioMovimentoChange = (value: string) => {
    setTipoRelatorioMovimento(value);
    setRelatorioMovimentoGerado(false);
    setMovimentosFiltrados(movimentosBase);

    if ((value === 'geral' || value === 'livro-caixa') && !dataInicioMovimento && !dataFimMovimento) {
      setDataInicioMovimento(defaultMovementsDateRange.start);
      setDataFimMovimento(defaultMovementsDateRange.end);
    }
  };

  const getStatusBadge = (item: ReportItem) => {
    switch (item.status) {
      case 'realizado':
        return <Badge className="bg-green-100 text-green-700 dark:bg-[#273447] dark:text-[#8bd8b1]">{item.statusLabel}</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-[#273447] dark:text-[#f9c87b]">Pendente</Badge>;
      case 'vencido':
        return <Badge className="bg-red-100 text-red-700 dark:bg-[#273447] dark:text-[#e7a0a9]">Vencido</Badge>;
      default:
        return <Badge className="dark:bg-[#273447] dark:text-slate-200">{item.statusLabel}</Badge>;
    }
  };

  const finalizarGeracaoRelatorioContas = (dados: ReportItem[]) => {
    setDadosFiltrados(dados);
    setRelatorioGerado(true);
  };

  const finalizarGeracaoRelatorioMovimentos = (dados: MovementItem[]) => {
    setMovimentosFiltrados(dados);
    setRelatorioMovimentoGerado(true);
  };

  const handleGerarRelatorio = () => {
    if (dataInicio && dataFim && dataFim < dataInicio) {
      toast.error('A Data Fim não pode ser menor que a Data de Início.');
      return;
    }

    let dados = [...dadosBase];

    if (moduloFiltro !== 'todos') {
      dados = dados.filter((item) => item.modulo === moduloFiltro);
    }

    if (tipoPagamento !== 'todos') {
      dados = dados.filter((item) => String(item.paymentTypeId) === tipoPagamento);
    }

    if (statusFiltro !== 'todos') {
      dados = dados.filter((item) => item.status === statusFiltro);
    }

    const campoData = tipoData === 'efetiva' ? 'dataEfetiva' : 'dataNominal';
    if (dataInicio) {
      dados = dados.filter((item) => item[campoData] >= dataInicio);
    }
    if (dataFim) {
      dados = dados.filter((item) => item[campoData] <= dataFim);
    }

    if (tipoRelatorio === 'origem') {
      if (!origemSelecionada) {
        toast.error('Selecione uma origem para gerar o relatório.');
        return;
      }

      dados = dados.filter((item) => Boolean(item.originId));
      dados = dados.filter((item) => String(item.originId) === origemSelecionada);

      if (filtroPessoa !== 'todos') {
        dados = dados.filter((item) => (filtroPessoa === 'pessoa' ? item.pessoa : !item.pessoa));
      }
    }

    dados.sort((a, b) => {
      let valorA: string | number;
      let valorB: string | number;

      switch (ordernarPor) {
        case 'dataEfetiva':
          valorA = a.dataEfetiva;
          valorB = b.dataEfetiva;
          break;
        case 'dataNominal':
          valorA = a.dataNominal;
          valorB = b.dataNominal;
          break;
        case 'status':
          valorA = a.statusLabel;
          valorB = b.statusLabel;
          break;
        case 'tipoPagamento':
          valorA = a.formaPgto;
          valorB = b.formaPgto;
          break;
        case 'valor':
          valorA = a.valor;
          valorB = b.valor;
          break;
        default:
          valorA = a.dataEfetiva;
          valorB = b.dataEfetiva;
      }

      if (valorA < valorB) return tipoOrdenacao === 'crescente' ? -1 : 1;
      if (valorA > valorB) return tipoOrdenacao === 'crescente' ? 1 : -1;
      return 0;
    });

    if (dados.length >= 50) {
      setPendingAccountsReportData(dados);
      setPendingMovementsReportData(null);
      setReportVolumeWarningOpen(true);
      return;
    }

    finalizarGeracaoRelatorioContas(dados);
  };

  const handleGerarRelatorioMovimento = () => {
    if (dataInicioMovimento && dataFimMovimento && dataFimMovimento < dataInicioMovimento) {
      toast.error('A Data Fim não pode ser menor que a Data de Início.');
      return;
    }

    const dados = getMovimentosFiltrados({ incluirTipoConta: true });

    dados.sort((a, b) => {
      let valorA: string | number;
      let valorB: string | number;

      switch (ordernarMovimentoPor) {
        case 'tipo':
          valorA = a.tipo;
          valorB = b.tipo;
          break;
        case 'tipoConta':
          valorA = a.tipoConta;
          valorB = b.tipoConta;
          break;
        case 'categoria':
          valorA = a.categoria;
          valorB = b.categoria;
          break;
        case 'contaCaixa':
          valorA = a.contaCaixa;
          valorB = b.contaCaixa;
          break;
        case 'valor':
          valorA = a.valor;
          valorB = b.valor;
          break;
        default:
          valorA = a.data;
          valorB = b.data;
      }

      if (valorA < valorB) return tipoOrdenacaoMovimento === 'crescente' ? -1 : 1;
      if (valorA > valorB) return tipoOrdenacaoMovimento === 'crescente' ? 1 : -1;
      return 0;
    });

    if (dados.length >= 200) {
      setPendingMovementsReportData(dados);
      setPendingAccountsReportData(null);
      setReportVolumeWarningOpen(true);
      return;
    }

    finalizarGeracaoRelatorioMovimentos(dados);
  };

  const handleGerarLivroCaixa = () => {
    if (dataInicioMovimento && dataFimMovimento && dataFimMovimento < dataInicioMovimento) {
      toast.error('A Data Fim não pode ser menor que a Data de Início.');
      return;
    }

    const dados = getMovimentosFiltrados({ incluirTipoConta: false }).sort((a, b) => {
      if (a.data !== b.data) return a.data.localeCompare(b.data);
      if (a.tipo !== b.tipo) return a.tipo === 'receita' ? -1 : 1;
      return a.codigo - b.codigo;
    });

    if (dados.length >= 200) {
      setPendingMovementsReportData(dados);
      setPendingAccountsReportData(null);
      setReportVolumeWarningOpen(true);
      return;
    }

    finalizarGeracaoRelatorioMovimentos(dados);
  };

  const limparFiltrosContas = ({ incluirOrigem = false }: { incluirOrigem?: boolean } = {}) => {
    setModuloFiltro('todos');
    setTipoPagamento('todos');
    setStatusFiltro('todos');
    setTipoData('efetiva');
    setDataInicio('');
    setDataFim('');
    setOrdernarPor('dataEfetiva');
    setTipoOrdenacao('crescente');

    if (incluirOrigem) {
      setOrigemSelecionada('');
      setFiltroPessoa('todos');
    }

    setDadosFiltrados(dadosBase);
    setRelatorioGerado(false);
  };

  const limparFiltrosMovimentos = ({ incluirTipoConta = true }: { incluirTipoConta?: boolean } = {}) => {
    setMovimentoFiltro('todos');
    setContaCaixaMovimento('todas');
    setDataInicioMovimento('');
    setDataFimMovimento('');

    if (incluirTipoConta) {
      setTipoContaMovimento('todos');
      setOrdernarMovimentoPor('data');
      setTipoOrdenacaoMovimento('crescente');
    }

    setMovimentosFiltrados(movimentosBase);
    setRelatorioMovimentoGerado(false);
  };

  const getMovimentosFiltrados = ({ incluirTipoConta }: { incluirTipoConta: boolean }) => {
    let dados = [...movimentosBase];

    if (movimentoFiltro !== 'todos') {
      dados = dados.filter((item) => item.tipo === movimentoFiltro);
    }

    if (incluirTipoConta && tipoContaMovimento !== 'todos') {
      dados = dados.filter((item) => String(item.accountTypeId) === tipoContaMovimento);
    }

    if (contaCaixaMovimento !== 'todas') {
      dados = dados.filter((item) => String(item.cashAccountId) === contaCaixaMovimento);
    }

    if (dataInicioMovimento) {
      dados = dados.filter((item) => item.data >= dataInicioMovimento);
    }

    if (dataFimMovimento) {
      dados = dados.filter((item) => item.data <= dataFimMovimento);
    }

    return dados;
  };

  const calcularTotais = () => {
    const total = dadosFiltrados.reduce((acc, item) => acc + item.valor, 0);
    const realizado = dadosFiltrados.filter((item) => item.status === 'realizado').reduce((acc, item) => acc + item.valor, 0);
    const pendente = dadosFiltrados.filter((item) => item.status === 'pendente').reduce((acc, item) => acc + item.valor, 0);
    const vencido = dadosFiltrados.filter((item) => item.status === 'vencido').reduce((acc, item) => acc + item.valor, 0);

    return { total, realizado, pendente, vencido };
  };

  const totais = calcularTotais();

  const calcularTotaisMovimento = () => {
    const receitas = movimentosFiltrados.filter((item) => item.tipo === 'receita').reduce((acc, item) => acc + item.valor, 0);
    const despesas = movimentosFiltrados.filter((item) => item.tipo === 'despesa').reduce((acc, item) => acc + item.valor, 0);
    const saldo = receitas - despesas;

    return { receitas, despesas, saldo };
  };

  const totaisMovimento = calcularTotaisMovimento();

  const livroCaixa = useMemo<CashBookItem[]>(() => {
    let saldo = 0;

    return movimentosFiltrados.map((item) => {
      const entrada = item.tipo === 'receita' ? item.valor : 0;
      const saida = item.tipo === 'despesa' ? item.valor : 0;
      saldo += entrada - saida;

      return {
        ...item,
        entrada,
        saida,
        saldo,
      };
    });
  }, [movimentosFiltrados]);

  const accountTypesMovimento = useMemo(() => {
    return accountTypes.filter((accountType) => {
      if (movimentoFiltro === 'todos') return accountType.type === 'Receita' || accountType.type === 'Despesa';
      return movimentoFiltro === 'receita' ? accountType.type === 'Receita' : accountType.type === 'Despesa';
    });
  }, [accountTypes, movimentoFiltro]);

  const accountTypeMovimentoOptions = useMemo(
    () => [
      { value: 'todos', label: 'Todos' },
      ...accountTypesMovimento
        .map((type) => ({
          value: String(type.id),
          label: type.description || `Tipo ${type.id}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ],
    [accountTypesMovimento],
  );

  const getAccountsGeneralTitle = () => {
    if (moduloFiltro === 'pagar') return 'Relatório Geral - Contas a Pagar';
    if (moduloFiltro === 'receber') return 'Relatório Geral - Contas a Receber';
    return 'Relatório Geral - Contas a Pagar/Receber';
  };

  const getAccountsFileModuleName = () => {
    if (moduloFiltro === 'pagar') return 'contas-pagar';
    if (moduloFiltro === 'receber') return 'contas-receber';
    return 'contas-pagar-receber';
  };

  const getPeriodLabel = (startDate: string, endDate: string) => {
    if (startDate && endDate) return `${formatDateBR(startDate)} a ${formatDateBR(endDate)}`;
    if (startDate) return `A partir de ${formatDateBR(startDate)}`;
    if (endDate) return `Até ${formatDateBR(endDate)}`;
    return 'Não Definido';
  };

  const getAccountsGeneralExportHtml = () => {
    const title = getAccountsGeneralTitle();
    const documentTitle = `relatorio-geral-${getAccountsFileModuleName()}-${getReportFileTimestamp()}`;
    const periodLabel = getPeriodLabel(dataInicio, dataFim);
    const rows = dadosFiltrados
      .map(
        (conta) => `
          <tr>
            <td class="center">${escapeHtml(getAccountModuleShortLabel(conta.modulo))}</td>
            <td class="center">${escapeHtml(conta.codigo)}</td>
            <td>${escapeHtml(conta.descricao || '-')}</td>
            <td class="center payment-method">${escapeHtml(conta.formaPgto)}</td>
            <td class="center nowrap">${escapeHtml(conta.dataNominal ? formatDateBR(conta.dataNominal) : '-')}</td>
            <td class="center nowrap">${escapeHtml(conta.dataEfetiva ? formatDateBR(conta.dataEfetiva) : '-')}</td>
            <td class="nowrap">${escapeHtml(formatCurrency(conta.valor))}</td>
            <td class="center">${escapeHtml(conta.statusLabel)}</td>
            <td>${escapeHtml(conta.origem)}</td>
          </tr>
        `,
      )
      .join('');

    return `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="color-scheme" content="light" />
          <title>${escapeHtml(documentTitle)}</title>
          <style>
            html { color-scheme: light; background: #ffffff; }
            body { font-family: Arial, sans-serif; color: #111827; background: #ffffff; margin: 24px; }
            .report-header { align-items: center; border-bottom: 2px solid #d1d5db; display: flex; justify-content: space-between; margin-bottom: 18px; padding-bottom: 14px; }
            .brand { align-items: center; display: flex; }
            .brand-name { font-size: 24px; font-weight: 700; line-height: 1; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25); }
            .brand-br { color: #00A676; }
            .brand-azuka { color: #F9C74F; }
            .brand-flow { color: #016394; }
            .brand-subtitle { color: #6b7280; font-size: 11px; margin-top: 4px; }
            .report-title { text-align: right; }
            h1 { font-size: 20px; margin: 0 0 6px; }
            h2 { font-size: 15px; margin: 22px 0 8px; }
            p { margin: 0; color: #4b5563; font-size: 12px; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th { background: #e5e7eb; color: #374151; text-align: left; }
            th, td { border: 1px solid #d1d5db; padding: 7px; vertical-align: top; }
            .data-table tbody td { font-size: 12px; }
            .data-table { margin-top: 18px; table-layout: fixed; }
            .data-table th, .data-table td { overflow-wrap: anywhere; word-break: normal; }
            .col-type { width: 5%; }
            .col-code { width: 6%; }
            .col-description { width: 22%; }
            .col-payment { width: 10%; }
            .col-date { width: 9%; }
            .col-value { width: 10%; }
            .col-status { width: 10%; }
            .col-origin { width: 19%; }
            .totals-box { margin-top: 18px; width: 380px; }
            .totals-box th { width: 55%; }
            .totals-title { text-align: center; }
            .totals-title { text-align: center; }
            .legend { color: #4b5563; font-size: 11px; margin-top: 8px; text-align: right; }
            .center { text-align: center; }
            .nowrap { white-space: nowrap; }
            .number { text-align: right; white-space: nowrap; }
            @page { size: landscape; }
            @media print {
              * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              html { color-scheme: light; background: #ffffff; }
              body { background: #ffffff; margin: 12mm; }
              button { display: none; }
              .data-table tbody td { font-size: 10px; }
              .payment-method { font-size: 10px; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div class="brand">
              <div>
                <div class="brand-name"><span class="brand-br">BR</span><span class="brand-azuka">azuka</span><span class="brand-flow">Flow</span></div>
                <div class="brand-subtitle">Gerenciador Financeiro</div>
              </div>
            </div>
            <div class="report-title">
              <h1>${escapeHtml(title)}</h1>
              <p><strong>Emitido em</strong> ${escapeHtml(formatDateTimeBR())}</p>
              <p><strong>Período</strong>: ${escapeHtml(periodLabel)}</p>
            </div>
          </div>

          <table class="data-table">
            <colgroup>
              <col class="col-type" />
              <col class="col-code" />
              <col class="col-description" />
              <col class="col-payment" />
              <col class="col-date" />
              <col class="col-date" />
              <col class="col-value" />
              <col class="col-status" />
              <col class="col-origin" />
            </colgroup>
            <thead>
              <tr>
                <th class="center">Tipo</th>
                <th class="center">Cód.</th>
                <th>Descrição</th>
                <th class="center">Forma Pgto</th>
                <th class="center">Emissão</th>
                <th class="center">Vencimento</th>
                <th>Valor</th>
                <th class="center">Status</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="9">Nenhum registro encontrado.</td></tr>'}
            </tbody>
          </table>
          <p class="legend">Legenda: CP = Contas a Pagar | CR = Contas a Receber</p>

          <table class="totals-box">
            <tbody>
              <tr><th colspan="2" class="totals-title">TOTAIS</th></tr>
              <tr><th>Total Geral</th><td class="number">${escapeHtml(formatCurrency(totais.total))}</td></tr>
              <tr><th>Pago/Recebido</th><td class="number">${escapeHtml(formatCurrency(totais.realizado))}</td></tr>
              <tr><th>Pendente</th><td class="number">${escapeHtml(formatCurrency(totais.pendente))}</td></tr>
              <tr><th>Vencido</th><td class="number">${escapeHtml(formatCurrency(totais.vencido))}</td></tr>
            </tbody>
          </table>
        </body>
      </html>
    `;
  };

  const getAccountsGeneralExportExcel = () => {
    const title = getAccountsGeneralTitle();
    const periodLabel = getPeriodLabel(dataInicio, dataFim);
    const headerRowNumber = 5;
    const lastDataRowNumber = headerRowNumber + Math.max(dadosFiltrados.length, 1);
    const totalStartRow = lastDataRowNumber + 3;
    const maxOriginLength = Math.max('Origem'.length, ...dadosFiltrados.map((conta) => (conta.origem || '').length));
    const originColumnWidth = Math.min(Math.max(maxOriginLength * 7, 170), 420);

    const rows = dadosFiltrados.length
      ? dadosFiltrados
          .map(
            (conta) => `
              <Row>
                <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeHtml(getAccountModuleShortLabel(conta.modulo))}</Data></Cell>
                <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${conta.codigo}</Data></Cell>
                <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeHtml(conta.descricao || '-')}</Data></Cell>
                <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeHtml(conta.formaPgto)}</Data></Cell>
                <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeHtml(conta.dataNominal ? formatDateBR(conta.dataNominal) : '-')}</Data></Cell>
                <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeHtml(conta.dataEfetiva ? formatDateBR(conta.dataEfetiva) : '-')}</Data></Cell>
                <Cell ss:StyleID="Currency"><Data ss:Type="Number">${conta.valor}</Data></Cell>
                <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeHtml(conta.statusLabel)}</Data></Cell>
                <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeHtml(conta.origem)}</Data></Cell>
              </Row>
            `,
          )
          .join('')
      : `
          <Row>
            <Cell ss:StyleID="Cell"><Data ss:Type="String">Nenhum registro encontrado.</Data></Cell>
          </Row>
        `;

    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Title">
      <Font ss:Bold="1" ss:Size="14" />
    </Style>
    <Style ss:ID="MetaLabel">
      <Font ss:Bold="1" />
      <Alignment ss:Horizontal="Right" />
    </Style>
    <Style ss:ID="TotalTitle">
      <Font ss:Bold="1" ss:Size="14" />
      <Alignment ss:Horizontal="Center" />
      <Interior ss:Color="#D1D5DB" ss:Pattern="Solid" />
      <Borders>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" />
      </Borders>
    </Style>
    <Style ss:ID="Header">
      <Font ss:Bold="1" />
      <Interior ss:Color="#E5E7EB" ss:Pattern="Solid" />
      <Borders>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" />
      </Borders>
    </Style>
    <Style ss:ID="HeaderCenter">
      <Font ss:Bold="1" />
      <Alignment ss:Horizontal="Center" />
      <Interior ss:Color="#E5E7EB" ss:Pattern="Solid" />
      <Borders>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" />
      </Borders>
    </Style>
    <Style ss:ID="Cell">
      <Borders>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" />
      </Borders>
    </Style>
    <Style ss:ID="CellCenter">
      <Alignment ss:Horizontal="Center" />
      <Borders>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" />
      </Borders>
    </Style>
    <Style ss:ID="Legend">
      <Alignment ss:Horizontal="Right" />
      <Font ss:Italic="1" />
    </Style>
    <Style ss:ID="Currency">
      <Alignment ss:Horizontal="Left" />
      <Borders>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" />
      </Borders>
      <NumberFormat ss:Format="&quot;R$&quot; #,##0.00" />
    </Style>
    <Style ss:ID="TotalLabel">
      <Font ss:Bold="1" />
      <Interior ss:Color="#F3F4F6" ss:Pattern="Solid" />
      <Borders>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" />
      </Borders>
    </Style>
    <Style ss:ID="TotalValue">
      <Font ss:Bold="1" />
      <Interior ss:Color="#F3F4F6" ss:Pattern="Solid" />
      <Borders>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" />
      </Borders>
      <NumberFormat ss:Format="&quot;R$&quot; #,##0.00" />
    </Style>
  </Styles>
  <Worksheet ss:Name="Relatorio Geral">
    <Table ss:ExpandedColumnCount="9" ss:ExpandedRowCount="${totalStartRow + 5}">
      <Column ss:Width="45" />
      <Column ss:Width="70" />
      <Column ss:Width="220" />
      <Column ss:Width="110" />
      <Column ss:Width="95" />
      <Column ss:Width="95" />
      <Column ss:Width="95" />
      <Column ss:Width="95" />
      <Column ss:Width="${originColumnWidth}" />
      <Row>
        <Cell ss:StyleID="Title"><Data ss:Type="String">${escapeHtml(title)}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Emitido em:</Data></Cell>
        <Cell><Data ss:Type="String">${escapeHtml(formatDateTimeBR())}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Período:</Data></Cell>
        <Cell><Data ss:Type="String">${escapeHtml(periodLabel)}</Data></Cell>
      </Row>
      <Row />
      <Row>
        <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Tipo</Data></Cell>
        <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Código</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Descrição</Data></Cell>
        <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Forma Pgto</Data></Cell>
        <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Data Emissão</Data></Cell>
        <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Data Vcto</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Valor</Data></Cell>
        <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Status</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Origem</Data></Cell>
      </Row>
      ${rows}
      <Row />
      <Row>
        <Cell ss:Index="6" ss:MergeAcross="3" ss:StyleID="Legend"><Data ss:Type="String">Legenda: CP = Contas a Pagar | CR = Contas a Receber</Data></Cell>
      </Row>
      <Row />
      <Row>
        <Cell ss:Index="3" ss:MergeAcross="1" ss:StyleID="TotalTitle"><Data ss:Type="String">TOTAIS</Data></Cell>
      </Row>
      <Row>
        <Cell ss:Index="3" ss:StyleID="TotalLabel"><Data ss:Type="String">Total Geral</Data></Cell>
        <Cell ss:StyleID="TotalValue"><Data ss:Type="Number">${totais.total}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:Index="3" ss:StyleID="TotalLabel"><Data ss:Type="String">Pago/Recebido</Data></Cell>
        <Cell ss:StyleID="TotalValue"><Data ss:Type="Number">${totais.realizado}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:Index="3" ss:StyleID="TotalLabel"><Data ss:Type="String">Pendente</Data></Cell>
        <Cell ss:StyleID="TotalValue"><Data ss:Type="Number">${totais.pendente}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:Index="3" ss:StyleID="TotalLabel"><Data ss:Type="String">Vencido</Data></Cell>
        <Cell ss:StyleID="TotalValue"><Data ss:Type="Number">${totais.vencido}</Data></Cell>
      </Row>
    </Table>
    <AutoFilter x:Range="R${headerRowNumber}C1:R${lastDataRowNumber}C9" xmlns="urn:schemas-microsoft-com:office:excel" />
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
      <Selected />
    </WorksheetOptions>
  </Worksheet>
</Workbook>`;
  };

  const handleExportAccountsGeneralExcel = () => {
    if (!relatorioGerado || dadosFiltrados.length === 0) {
      toast.error('Gere o relatório antes de exportar.');
      return;
    }

    downloadHtmlFile(
      getAccountsGeneralExportExcel(),
      `relatorio-geral-contas-${new Date().toISOString().slice(0, 10)}.xls`,
      'application/vnd.ms-excel;charset=utf-8',
    );
  };

  const handleExportAccountsGeneralPdf = () => {
    if (!relatorioGerado || dadosFiltrados.length === 0) {
      toast.error('Gere o relatório antes de exportar.');
      return;
    }

    setPdfPrintTitle(`relatorio-geral-${getAccountsFileModuleName()}-${getReportFileTimestamp()}`);
    setPdfPrintHtml(getAccountsGeneralExportHtml());
  };

  const handlePrintPdfPreview = () => {
    const iframe = document.getElementById('relatorio-pdf-preview') as HTMLIFrameElement | null;
    const iframeWindow = iframe?.contentWindow;
    const iframeDocument = iframe?.contentDocument;
    if (!iframeWindow) {
      toast.error('Não foi possível carregar a prévia do relatório.');
      return;
    }

    const previousTitle = document.title;
    const printTitle = pdfPrintTitle || iframeDocument?.title || 'relatorio';

    document.title = printTitle;
    if (iframe) {
      iframe.title = printTitle;
    }
    if (iframeDocument) {
      iframeDocument.title = printTitle;
    }

    iframeWindow.onafterprint = () => {
      document.title = previousTitle;
      setPdfPrintHtml('');
      setPdfPrintTitle('');
    };
    iframeWindow.focus();
    iframeWindow.print();

    window.setTimeout(() => {
      document.title = previousTitle;
    }, 1000);
  };

  const origensComContas = useMemo(() => {
    const originIds = new Set(dadosBase.map((item) => item.originId).filter((id): id is number => Boolean(id)));
    return origins.filter((origin) => originIds.has(origin.id));
  }, [dadosBase, origins]);

  const origensFiltradasPorOrigem = useMemo(() => {
    const expectedCategory = moduloFiltro === 'pagar' ? '1' : moduloFiltro === 'receber' ? '2' : '';

    return origensComContas
      .filter((origin) => {
        const originCategory = origin.category == null ? '' : String(origin.category);
        const matchesModule =
          moduloFiltro === 'todos' ||
          (originCategory
            ? originCategory === expectedCategory
            : dadosBase.some((item) => item.originId === origin.id && item.modulo === moduloFiltro));
        const matchesPerson = filtroPessoa === 'todos' || (filtroPessoa === 'pessoa' ? isTrue(origin.person) : !isTrue(origin.person));

        return matchesModule && matchesPerson;
      })
      .sort((a, b) => (a.description || `Origem ${a.id}`).localeCompare(b.description || `Origem ${b.id}`));
  }, [dadosBase, filtroPessoa, moduloFiltro, origensComContas]);

  const origemOptions = useMemo(
    () =>
      origensFiltradasPorOrigem.map((origin) => ({
        value: String(origin.id),
        label: origin.description || `Origem ${origin.id}`,
      })),
    [origensFiltradasPorOrigem],
  );

  useEffect(() => {
    if (!origemSelecionada) return;

    const origemAindaValida = origensFiltradasPorOrigem.some((origin) => String(origin.id) === origemSelecionada);
    if (!origemAindaValida) {
      setOrigemSelecionada('');
    }
  }, [origemSelecionada, origensFiltradasPorOrigem]);

  const resumoPorOrigem = useMemo(() => {
  const resumo = new Map<string, OriginSummary>();

  dadosFiltrados.filter((item) => Boolean(item.originId)).forEach((item) => {
      const key = item.pessoa ? `${item.originId}-${item.modulo}` : `${item.originId}-operacao`;
      const current =
        resumo.get(key) ||
        {
          key,
          origem: item.origem || '-',
          pessoa: item.pessoa,
          modulo: item.pessoa ? item.modulo : 'todos',
          total: 0,
          realizado: 0,
          pendente: 0,
          vencido: 0,
          quantidade: 0,
        };

      current.total += item.valor;
      current.quantidade += 1;

      if (item.status === 'realizado') current.realizado += item.valor;
      if (item.status === 'pendente') current.pendente += item.valor;
      if (item.status === 'vencido') current.vencido += item.valor;

      resumo.set(key, current);
    });

    return Array.from(resumo.values()).sort((a, b) => a.origem.localeCompare(b.origem));
  }, [dadosFiltrados]);

  const dadosPorOrigem = useMemo(() => {
    const grupos = new Map<string, ReportItem[]>();

    dadosFiltrados.filter((item) => Boolean(item.originId)).forEach((item) => {
      const key = item.pessoa ? `${item.originId}-${item.modulo}` : `${item.originId}-operacao`;
      const current = grupos.get(key) || [];
      current.push(item);
      grupos.set(key, current);
    });

    return grupos;
  }, [dadosFiltrados]);

  const getAccountsOriginTitle = () => {
    if (moduloFiltro === 'pagar') return 'Relatório por Origem - Contas a Pagar';
    if (moduloFiltro === 'receber') return 'Relatório por Origem - Contas a Receber';
    return 'Relatório por Origem - Contas a Pagar/Receber';
  };

  const getAccountsOriginDetailRows = () =>
    resumoPorOrigem.flatMap((origem) =>
      (dadosPorOrigem.get(origem.key) || []).map((conta) => ({
        origem: origem.origem,
        conta,
      })),
    );

  const getAccountsOriginExportHtml = () => {
    const title = getAccountsOriginTitle();
    const documentTitle = `relatorio-por-origem-${getAccountsFileModuleName()}-${getReportFileTimestamp()}`;
    const periodLabel = getPeriodLabel(dataInicio, dataFim);
    const detailRows = getAccountsOriginDetailRows();
    const summaryRows = resumoPorOrigem
      .map(
        (origem) => `
          <tr>
            <td>${escapeHtml(origem.origem)}</td>
            <td class="center">${escapeHtml(getOriginTypeLabel(origem.pessoa, origem.modulo, true))}</td>
            <td class="center">${escapeHtml(origem.quantidade)}</td>
            <td class="nowrap">${escapeHtml(formatCurrency(origem.total))}</td>
            <td class="nowrap">${escapeHtml(formatCurrency(origem.realizado))}</td>
            <td class="nowrap">${escapeHtml(formatCurrency(origem.pendente))}</td>
            <td class="nowrap">${escapeHtml(formatCurrency(origem.vencido))}</td>
          </tr>
        `,
      )
      .join('');
    const rows = detailRows
      .map(
        ({ origem, conta }) => `
          <tr>
            <td>${escapeHtml(origem)}</td>
            <td class="center">${escapeHtml(getAccountModuleShortLabel(conta.modulo))}</td>
            <td class="center">${escapeHtml(conta.codigo)}</td>
            <td>${escapeHtml(conta.descricao || '-')}</td>
            <td class="center payment-method">${escapeHtml(conta.formaPgto)}</td>
            <td class="center nowrap">${escapeHtml(conta.dataNominal ? formatDateBR(conta.dataNominal) : '-')}</td>
            <td class="center nowrap">${escapeHtml(conta.dataEfetiva ? formatDateBR(conta.dataEfetiva) : '-')}</td>
            <td class="nowrap">${escapeHtml(formatCurrency(conta.valor))}</td>
            <td class="center">${escapeHtml(conta.statusLabel)}</td>
          </tr>
        `,
      )
      .join('');

    return `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="color-scheme" content="light" />
          <title>${escapeHtml(documentTitle)}</title>
          <style>
            html { color-scheme: light; background: #ffffff; }
            body { font-family: Arial, sans-serif; color: #111827; background: #ffffff; margin: 24px; }
            .report-header { align-items: center; border-bottom: 2px solid #d1d5db; display: flex; justify-content: space-between; margin-bottom: 18px; padding-bottom: 14px; }
            .brand { align-items: center; display: flex; }
            .brand-name { font-size: 24px; font-weight: 700; line-height: 1; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25); }
            .brand-br { color: #00A676; }
            .brand-azuka { color: #F9C74F; }
            .brand-flow { color: #016394; }
            .brand-subtitle { color: #6b7280; font-size: 11px; margin-top: 4px; }
            .report-title { text-align: right; }
            h1 { font-size: 20px; margin: 0 0 6px; }
            h2 { font-size: 14px; margin: 18px 0 8px; }
            p { margin: 0; color: #4b5563; font-size: 12px; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th { background: #e5e7eb; color: #374151; text-align: left; }
            th, td { border: 1px solid #d1d5db; padding: 7px; vertical-align: top; }
            .data-table { table-layout: fixed; }
            .data-table tbody td { font-size: 12px; }
            .data-table th, .data-table td { overflow-wrap: anywhere; word-break: normal; }
            .legend { color: #4b5563; font-size: 11px; margin-top: 8px; text-align: right; }
            .totals-box { margin-top: 18px; width: 380px; }
            .totals-box th { width: 55%; }
            .totals-title { text-align: center; }
            .center { text-align: center; }
            .nowrap { white-space: nowrap; }
            .number { text-align: right; white-space: nowrap; }
            @page { size: landscape; }
            @media print {
              * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              html { color-scheme: light; background: #ffffff; }
              body { background: #ffffff; margin: 12mm; }
              button { display: none; }
              .data-table tbody td { font-size: 10px; }
              .payment-method { font-size: 10px; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div class="brand">
              <div>
                <div class="brand-name"><span class="brand-br">BR</span><span class="brand-azuka">azuka</span><span class="brand-flow">Flow</span></div>
                <div class="brand-subtitle">Gerenciador Financeiro</div>
              </div>
            </div>
            <div class="report-title">
              <h1>${escapeHtml(title)}</h1>
              <p><strong>Emitido em</strong> ${escapeHtml(formatDateTimeBR())}</p>
              <p><strong>Período</strong>: ${escapeHtml(periodLabel)}</p>
            </div>
          </div>

          <h2>Resumo por Origem</h2>
          <table>
            <thead>
              <tr>
                <th>Origem</th>
                <th class="center">Tipo</th>
                <th class="center">Qtde</th>
                <th>Total</th>
                <th>Pago/Recebido</th>
                <th>Pendente</th>
                <th>Vencido</th>
              </tr>
            </thead>
            <tbody>
              ${summaryRows || '<tr><td colspan="7">Nenhuma origem encontrada.</td></tr>'}
            </tbody>
          </table>

          <h2>Detalhamento</h2>
          <table class="data-table">
            <colgroup>
              <col style="width: 18%" />
              <col style="width: 5%" />
              <col style="width: 6%" />
              <col style="width: 22%" />
              <col style="width: 10%" />
              <col style="width: 9%" />
              <col style="width: 9%" />
              <col style="width: 10%" />
              <col style="width: 11%" />
            </colgroup>
            <thead>
              <tr>
                <th>Origem</th>
                <th class="center">Tipo</th>
                <th class="center">Cód.</th>
                <th>Descrição</th>
                <th class="center">Forma Pgto</th>
                <th class="center">Emissão</th>
                <th class="center">Vencimento</th>
                <th>Valor</th>
                <th class="center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="9">Nenhum registro encontrado.</td></tr>'}
            </tbody>
          </table>
          <p class="legend">Legenda: CP = Contas a Pagar | CR = Contas a Receber${moduloFiltro === 'todos' ? ' | Forn./Cli. = Fornecedor ou Cliente' : ''}</p>

          <table class="totals-box">
            <tbody>
              <tr><th colspan="2" class="totals-title">TOTAIS</th></tr>
              <tr><th>Total Geral</th><td class="number">${escapeHtml(formatCurrency(totais.total))}</td></tr>
              <tr><th>Pago/Recebido</th><td class="number">${escapeHtml(formatCurrency(totais.realizado))}</td></tr>
              <tr><th>Pendente</th><td class="number">${escapeHtml(formatCurrency(totais.pendente))}</td></tr>
              <tr><th>Vencido</th><td class="number">${escapeHtml(formatCurrency(totais.vencido))}</td></tr>
            </tbody>
          </table>
        </body>
      </html>
    `;
  };

  const getAccountsOriginExportExcel = () => {
    const title = getAccountsOriginTitle();
    const periodLabel = getPeriodLabel(dataInicio, dataFim);
    const detailRows = getAccountsOriginDetailRows();
    const summaryRows = resumoPorOrigem
      .map(
        (origem) => `
          <Row>
            <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeHtml(origem.origem)}</Data></Cell>
            <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeHtml(getOriginTypeLabel(origem.pessoa, origem.modulo, true))}</Data></Cell>
            <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${origem.quantidade}</Data></Cell>
            <Cell ss:StyleID="Currency"><Data ss:Type="Number">${origem.total}</Data></Cell>
            <Cell ss:StyleID="Currency"><Data ss:Type="Number">${origem.realizado}</Data></Cell>
            <Cell ss:StyleID="Currency"><Data ss:Type="Number">${origem.pendente}</Data></Cell>
            <Cell ss:StyleID="Currency"><Data ss:Type="Number">${origem.vencido}</Data></Cell>
          </Row>
        `,
      )
      .join('');
    const rows = detailRows
      .map(
        ({ origem, conta }) => `
          <Row>
            <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeHtml(origem)}</Data></Cell>
            <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeHtml(getAccountModuleShortLabel(conta.modulo))}</Data></Cell>
            <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${conta.codigo}</Data></Cell>
            <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeHtml(conta.descricao || '-')}</Data></Cell>
            <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeHtml(conta.formaPgto)}</Data></Cell>
            <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeHtml(conta.dataNominal ? formatDateBR(conta.dataNominal) : '-')}</Data></Cell>
            <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeHtml(conta.dataEfetiva ? formatDateBR(conta.dataEfetiva) : '-')}</Data></Cell>
            <Cell ss:StyleID="Currency"><Data ss:Type="Number">${conta.valor}</Data></Cell>
            <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeHtml(conta.statusLabel)}</Data></Cell>
          </Row>
        `,
      )
      .join('');

    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Title"><Font ss:Bold="1" ss:Size="14" /></Style>
    <Style ss:ID="MetaLabel"><Font ss:Bold="1" /><Alignment ss:Horizontal="Right" /></Style>
    <Style ss:ID="TotalTitle"><Font ss:Bold="1" ss:Size="14" /><Alignment ss:Horizontal="Center" /><Interior ss:Color="#D1D5DB" ss:Pattern="Solid" /><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders></Style>
    <Style ss:ID="Section"><Font ss:Bold="1" ss:Size="12" /></Style>
    <Style ss:ID="Header"><Font ss:Bold="1" /><Interior ss:Color="#E5E7EB" ss:Pattern="Solid" /><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders></Style>
    <Style ss:ID="HeaderCenter"><Font ss:Bold="1" /><Alignment ss:Horizontal="Center" /><Interior ss:Color="#E5E7EB" ss:Pattern="Solid" /><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders></Style>
    <Style ss:ID="Cell"><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders></Style>
    <Style ss:ID="CellCenter"><Alignment ss:Horizontal="Center" /><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders></Style>
    <Style ss:ID="Currency"><Alignment ss:Horizontal="Left" /><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders><NumberFormat ss:Format="&quot;R$&quot; #,##0.00" /></Style>
    <Style ss:ID="Legend"><Alignment ss:Horizontal="Right" /><Font ss:Italic="1" /></Style>
    <Style ss:ID="TotalLabel"><Font ss:Bold="1" /><Interior ss:Color="#F3F4F6" ss:Pattern="Solid" /><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders></Style>
    <Style ss:ID="TotalValue"><Font ss:Bold="1" /><Interior ss:Color="#F3F4F6" ss:Pattern="Solid" /><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders><NumberFormat ss:Format="&quot;R$&quot; #,##0.00" /></Style>
  </Styles>
  <Worksheet ss:Name="Relatorio por Origem">
    <Table ss:ExpandedColumnCount="9">
      <Column ss:Width="190" />
      <Column ss:Width="75" />
      <Column ss:Width="55" />
      <Column ss:Width="220" />
      <Column ss:Width="110" />
      <Column ss:Width="95" />
      <Column ss:Width="95" />
      <Column ss:Width="95" />
      <Column ss:Width="95" />
      <Row><Cell ss:StyleID="Title"><Data ss:Type="String">${escapeHtml(title)}</Data></Cell></Row>
      <Row><Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Emitido em:</Data></Cell><Cell><Data ss:Type="String">${escapeHtml(formatDateTimeBR())}</Data></Cell></Row>
      <Row><Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Período:</Data></Cell><Cell><Data ss:Type="String">${escapeHtml(periodLabel)}</Data></Cell></Row>
      <Row />
      <Row><Cell ss:StyleID="Section"><Data ss:Type="String">Resumo por Origem</Data></Cell></Row>
      <Row>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Origem</Data></Cell>
        <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Tipo</Data></Cell>
        <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Qtde</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Total</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Pago/Recebido</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Pendente</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Vencido</Data></Cell>
      </Row>
      ${summaryRows || '<Row><Cell ss:StyleID="Cell"><Data ss:Type="String">Nenhuma origem encontrada.</Data></Cell></Row>'}
      <Row />
      <Row><Cell ss:StyleID="Section"><Data ss:Type="String">Detalhamento</Data></Cell></Row>
      <Row>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Origem</Data></Cell>
        <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Tipo</Data></Cell>
        <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Código</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Descrição</Data></Cell>
        <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Forma Pgto</Data></Cell>
        <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Data Emissão</Data></Cell>
        <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Data Vcto</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Valor</Data></Cell>
        <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Status</Data></Cell>
      </Row>
      ${rows || '<Row><Cell ss:StyleID="Cell"><Data ss:Type="String">Nenhum registro encontrado.</Data></Cell></Row>'}
      <Row />
      <Row><Cell ss:Index="6" ss:MergeAcross="3" ss:StyleID="Legend"><Data ss:Type="String">Legenda: CP = Contas a Pagar | CR = Contas a Receber${moduloFiltro === 'todos' ? ' | Forn./Cli. = Fornecedor ou Cliente' : ''}</Data></Cell></Row>
      <Row />
      <Row><Cell ss:Index="4" ss:MergeAcross="1" ss:StyleID="TotalTitle"><Data ss:Type="String">TOTAIS</Data></Cell></Row>
      <Row><Cell ss:Index="4" ss:StyleID="TotalLabel"><Data ss:Type="String">Total Geral</Data></Cell><Cell ss:StyleID="TotalValue"><Data ss:Type="Number">${totais.total}</Data></Cell></Row>
      <Row><Cell ss:Index="4" ss:StyleID="TotalLabel"><Data ss:Type="String">Pago/Recebido</Data></Cell><Cell ss:StyleID="TotalValue"><Data ss:Type="Number">${totais.realizado}</Data></Cell></Row>
      <Row><Cell ss:Index="4" ss:StyleID="TotalLabel"><Data ss:Type="String">Pendente</Data></Cell><Cell ss:StyleID="TotalValue"><Data ss:Type="Number">${totais.pendente}</Data></Cell></Row>
      <Row><Cell ss:Index="4" ss:StyleID="TotalLabel"><Data ss:Type="String">Vencido</Data></Cell><Cell ss:StyleID="TotalValue"><Data ss:Type="Number">${totais.vencido}</Data></Cell></Row>
    </Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><Selected /></WorksheetOptions>
  </Worksheet>
</Workbook>`;
  };

  const handleExportAccountsOriginPdf = () => {
    if (!relatorioGerado || dadosFiltrados.length === 0) {
      toast.error('Gere o relatório antes de exportar.');
      return;
    }

    setPdfPrintTitle(`relatorio-por-origem-${getAccountsFileModuleName()}-${getReportFileTimestamp()}`);
    setPdfPrintHtml(getAccountsOriginExportHtml());
  };

  const handleExportAccountsOriginExcel = () => {
    if (!relatorioGerado || dadosFiltrados.length === 0) {
      toast.error('Gere o relatório antes de exportar.');
      return;
    }

    downloadHtmlFile(
      getAccountsOriginExportExcel(),
      `relatorio-por-origem-contas-${new Date().toISOString().slice(0, 10)}.xls`,
      'application/vnd.ms-excel;charset=utf-8',
    );
  };

  const getMovementsGeneralTitle = () => {
    if (movimentoFiltro === 'receita') return 'Relatório Geral - Receitas';
    if (movimentoFiltro === 'despesa') return 'Relatório Geral - Despesas';
    return 'Relatório Geral - Receitas/Despesas';
  };

  const getMovementsGeneralFileName = () => {
    const timestamp = getReportFileTimestamp();
    if (movimentoFiltro === 'receita') return `relatorio-geral-receitas-${timestamp}`;
    if (movimentoFiltro === 'despesa') return `relatorio-geral-despesas-${timestamp}`;
    return `relatorio-geral-receitas-despesas-${timestamp}`;
  };

  const getMovementTypeLabel = (tipo: MovementItem['tipo']) => (tipo === 'receita' ? 'Receita' : 'Despesa');

  const getMovementsGeneralExportHtml = () => {
    const title = getMovementsGeneralTitle();
    const documentTitle = getMovementsGeneralFileName();
    const periodLabel = getPeriodLabel(dataInicioMovimento, dataFimMovimento);
    const rows = movimentosFiltrados
      .map(
        (movimento) => `
          <tr>
            <td class="center">${escapeHtml(getMovementTypeLabel(movimento.tipo))}</td>
            <td class="center">${escapeHtml(movimento.codigo)}</td>
            <td>${escapeHtml(movimento.descricao || '-')}</td>
            <td>${escapeHtml(movimento.tipoConta)}</td>
            <td>${escapeHtml(movimento.categoria)}</td>
            <td>${escapeHtml(movimento.contaCaixa)}</td>
            <td class="center nowrap">${escapeHtml(movimento.data ? formatDateBR(movimento.data) : '-')}</td>
            <td class="nowrap">${escapeHtml(formatCurrency(movimento.valor))}</td>
          </tr>
        `,
      )
      .join('');

    return `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="color-scheme" content="light" />
          <title>${escapeHtml(documentTitle)}</title>
          <style>
            html { color-scheme: light; background: #ffffff; }
            body { font-family: Arial, sans-serif; color: #111827; background: #ffffff; margin: 24px; }
            .report-header { align-items: center; border-bottom: 2px solid #d1d5db; display: flex; justify-content: space-between; margin-bottom: 18px; padding-bottom: 14px; }
            .brand { align-items: center; display: flex; }
            .brand-name { font-size: 24px; font-weight: 700; line-height: 1; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25); }
            .brand-br { color: #00A676; }
            .brand-azuka { color: #F9C74F; }
            .brand-flow { color: #016394; }
            .brand-subtitle { color: #6b7280; font-size: 11px; margin-top: 4px; }
            .report-title { text-align: right; }
            h1 { font-size: 20px; margin: 0 0 6px; }
            p { margin: 0; color: #4b5563; font-size: 12px; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th { background: #e5e7eb; color: #374151; text-align: left; }
            th, td { border: 1px solid #d1d5db; padding: 7px; vertical-align: top; }
            .data-table { margin-top: 18px; table-layout: fixed; }
            .data-table tbody td { font-size: 12px; }
            .data-table th, .data-table td { overflow-wrap: anywhere; word-break: normal; }
            .totals-box { margin-top: 18px; width: 380px; }
            .totals-box th { width: 55%; }
            .totals-title { text-align: center; }
            .center { text-align: center; }
            .nowrap { white-space: nowrap; }
            .number { text-align: right; white-space: nowrap; }
            @page { size: landscape; }
            @media print {
              * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              html { color-scheme: light; background: #ffffff; }
              body { background: #ffffff; margin: 12mm; }
              button { display: none; }
              .data-table tbody td { font-size: 10px; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div class="brand">
              <div>
                <div class="brand-name"><span class="brand-br">BR</span><span class="brand-azuka">azuka</span><span class="brand-flow">Flow</span></div>
                <div class="brand-subtitle">Gerenciador Financeiro</div>
              </div>
            </div>
            <div class="report-title">
              <h1>${escapeHtml(title)}</h1>
              <p><strong>Emitido em</strong> ${escapeHtml(formatDateTimeBR())}</p>
              <p><strong>Período</strong>: ${escapeHtml(periodLabel)}</p>
            </div>
          </div>

          <table class="data-table">
            <colgroup>
              <col style="width: 9%" />
              <col style="width: 7%" />
              <col style="width: 23%" />
              <col style="width: 16%" />
              <col style="width: 14%" />
              <col style="width: 14%" />
              <col style="width: 8%" />
              <col style="width: 9%" />
            </colgroup>
            <thead>
              <tr>
                <th class="center">Tipo</th>
                <th class="center">Cód.</th>
                <th>Descrição</th>
                <th>Tipo de Conta</th>
                <th>Categoria</th>
                <th>Conta Caixa</th>
                <th class="center">Data</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="8">Nenhum registro encontrado.</td></tr>'}
            </tbody>
          </table>

          <table class="totals-box">
            <tbody>
              <tr><th colspan="2" class="totals-title">TOTAIS</th></tr>
              <tr><th>Receitas</th><td class="number">${escapeHtml(formatCurrency(totaisMovimento.receitas))}</td></tr>
              <tr><th>Despesas</th><td class="number">${escapeHtml(formatCurrency(totaisMovimento.despesas))}</td></tr>
              <tr><th>Saldo</th><td class="number">${escapeHtml(formatCurrency(totaisMovimento.saldo))}</td></tr>
              <tr><th>Total de Registros</th><td class="number">${escapeHtml(movimentosFiltrados.length)}</td></tr>
            </tbody>
          </table>
        </body>
      </html>
    `;
  };

  const getMovementsGeneralExportExcel = () => {
    const title = getMovementsGeneralTitle();
    const periodLabel = getPeriodLabel(dataInicioMovimento, dataFimMovimento);
    const rows = movimentosFiltrados
      .map(
        (movimento) => `
          <Row>
            <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeHtml(getMovementTypeLabel(movimento.tipo))}</Data></Cell>
            <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${movimento.codigo}</Data></Cell>
            <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeHtml(movimento.descricao || '-')}</Data></Cell>
            <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeHtml(movimento.tipoConta)}</Data></Cell>
            <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeHtml(movimento.categoria)}</Data></Cell>
            <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeHtml(movimento.contaCaixa)}</Data></Cell>
            <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeHtml(movimento.data ? formatDateBR(movimento.data) : '-')}</Data></Cell>
            <Cell ss:StyleID="Currency"><Data ss:Type="Number">${movimento.valor}</Data></Cell>
          </Row>
        `,
      )
      .join('');

    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Title"><Font ss:Bold="1" ss:Size="14" /></Style>
    <Style ss:ID="MetaLabel"><Font ss:Bold="1" /><Alignment ss:Horizontal="Right" /></Style>
    <Style ss:ID="TotalTitle"><Font ss:Bold="1" ss:Size="14" /><Alignment ss:Horizontal="Center" /><Interior ss:Color="#D1D5DB" ss:Pattern="Solid" /><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders></Style>
    <Style ss:ID="Header"><Font ss:Bold="1" /><Interior ss:Color="#E5E7EB" ss:Pattern="Solid" /><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders></Style>
    <Style ss:ID="HeaderCenter"><Font ss:Bold="1" /><Alignment ss:Horizontal="Center" /><Interior ss:Color="#E5E7EB" ss:Pattern="Solid" /><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders></Style>
    <Style ss:ID="Cell"><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders></Style>
    <Style ss:ID="CellCenter"><Alignment ss:Horizontal="Center" /><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders></Style>
    <Style ss:ID="Currency"><Alignment ss:Horizontal="Left" /><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders><NumberFormat ss:Format="&quot;R$&quot; #,##0.00" /></Style>
    <Style ss:ID="TotalLabel"><Font ss:Bold="1" /><Interior ss:Color="#F3F4F6" ss:Pattern="Solid" /><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders></Style>
    <Style ss:ID="TotalValue"><Font ss:Bold="1" /><Interior ss:Color="#F3F4F6" ss:Pattern="Solid" /><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders><NumberFormat ss:Format="&quot;R$&quot; #,##0.00" /></Style>
  </Styles>
  <Worksheet ss:Name="Receitas Despesas">
    <Table ss:ExpandedColumnCount="8">
      <Column ss:Width="80" />
      <Column ss:Width="60" />
      <Column ss:Width="220" />
      <Column ss:Width="150" />
      <Column ss:Width="130" />
      <Column ss:Width="130" />
      <Column ss:Width="85" />
      <Column ss:Width="95" />
      <Row><Cell ss:StyleID="Title"><Data ss:Type="String">${escapeHtml(title)}</Data></Cell></Row>
      <Row><Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Emitido em:</Data></Cell><Cell><Data ss:Type="String">${escapeHtml(formatDateTimeBR())}</Data></Cell></Row>
      <Row><Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Período:</Data></Cell><Cell><Data ss:Type="String">${escapeHtml(periodLabel)}</Data></Cell></Row>
      <Row />
      <Row>
        <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Tipo</Data></Cell>
        <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Código</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Descrição</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Tipo de Conta</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Categoria</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Conta Caixa</Data></Cell>
        <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Data</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Valor</Data></Cell>
      </Row>
      ${rows || '<Row><Cell ss:StyleID="Cell"><Data ss:Type="String">Nenhum registro encontrado.</Data></Cell></Row>'}
      <Row />
      <Row><Cell ss:Index="3" ss:MergeAcross="1" ss:StyleID="TotalTitle"><Data ss:Type="String">TOTAIS</Data></Cell></Row>
      <Row><Cell ss:Index="3" ss:StyleID="TotalLabel"><Data ss:Type="String">Receitas</Data></Cell><Cell ss:StyleID="TotalValue"><Data ss:Type="Number">${totaisMovimento.receitas}</Data></Cell></Row>
      <Row><Cell ss:Index="3" ss:StyleID="TotalLabel"><Data ss:Type="String">Despesas</Data></Cell><Cell ss:StyleID="TotalValue"><Data ss:Type="Number">${totaisMovimento.despesas}</Data></Cell></Row>
      <Row><Cell ss:Index="3" ss:StyleID="TotalLabel"><Data ss:Type="String">Saldo</Data></Cell><Cell ss:StyleID="TotalValue"><Data ss:Type="Number">${totaisMovimento.saldo}</Data></Cell></Row>
      <Row><Cell ss:Index="3" ss:StyleID="TotalLabel"><Data ss:Type="String">Total de Registros</Data></Cell><Cell ss:StyleID="TotalLabel"><Data ss:Type="Number">${movimentosFiltrados.length}</Data></Cell></Row>
    </Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><Selected /></WorksheetOptions>
  </Worksheet>
</Workbook>`;
  };

  const handleExportMovementsGeneralPdf = () => {
    if (!relatorioMovimentoGerado || movimentosFiltrados.length === 0) {
      toast.error('Gere o relatório antes de exportar.');
      return;
    }

    setPdfPrintTitle(getMovementsGeneralFileName());
    setPdfPrintHtml(getMovementsGeneralExportHtml());
  };

  const handleExportMovementsGeneralExcel = () => {
    if (!relatorioMovimentoGerado || movimentosFiltrados.length === 0) {
      toast.error('Gere o relatório antes de exportar.');
      return;
    }

    downloadHtmlFile(
      getMovementsGeneralExportExcel(),
      `relatorio-geral-receitas-despesas-${new Date().toISOString().slice(0, 10)}.xls`,
      'application/vnd.ms-excel;charset=utf-8',
    );
  };

  const getCashBookExportHtml = () => {
    const title = 'Livro Caixa';
    const documentTitle = `relatorio-livro-caixa-${getReportFileTimestamp()}`;
    const periodLabel =
      dataInicioMovimento && dataFimMovimento
        ? `${formatDateBR(dataInicioMovimento)} a ${formatDateBR(dataFimMovimento)}`
        : dataInicioMovimento
          ? `A partir de ${formatDateBR(dataInicioMovimento)}`
          : dataFimMovimento
            ? `Até ${formatDateBR(dataFimMovimento)}`
            : 'Não Definido';
    const rows = livroCaixa
      .map(
        (movimento) => `
          <tr>
            <td class="center nowrap">${escapeHtml(movimento.data ? formatDateBR(movimento.data) : '-')}</td>
            <td class="center">${escapeHtml(getMovementTypeLabel(movimento.tipo))}</td>
            <td class="center">${escapeHtml(movimento.codigo)}</td>
            <td>${escapeHtml(movimento.descricao || '-')}</td>
            <td>${escapeHtml(movimento.tipoConta)}</td>
            <td>${escapeHtml(movimento.contaCaixa)}</td>
            <td class="nowrap">${escapeHtml(movimento.entrada ? formatCurrency(movimento.entrada) : '-')}</td>
            <td class="nowrap">${escapeHtml(movimento.saida ? formatCurrency(movimento.saida) : '-')}</td>
            <td class="nowrap">${escapeHtml(formatCurrency(movimento.saldo))}</td>
          </tr>
        `,
      )
      .join('');

    return `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="color-scheme" content="light" />
          <title>${escapeHtml(documentTitle)}</title>
          <style>
            html { color-scheme: light; background: #ffffff; }
            body { font-family: Arial, sans-serif; color: #111827; background: #ffffff; margin: 24px; }
            .report-header { align-items: center; border-bottom: 2px solid #d1d5db; display: flex; justify-content: space-between; margin-bottom: 18px; padding-bottom: 14px; }
            .brand { align-items: center; display: flex; }
            .brand-name { font-size: 24px; font-weight: 700; line-height: 1; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25); }
            .brand-br { color: #00A676; }
            .brand-azuka { color: #F9C74F; }
            .brand-flow { color: #016394; }
            .brand-subtitle { color: #6b7280; font-size: 11px; margin-top: 4px; }
            .report-title { text-align: right; }
            h1 { font-size: 20px; margin: 0 0 6px; }
            p { margin: 0; color: #4b5563; font-size: 12px; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th { background: #e5e7eb; color: #374151; text-align: left; }
            th, td { border: 1px solid #d1d5db; padding: 7px; vertical-align: top; }
            .data-table { margin-top: 18px; table-layout: fixed; }
            .data-table tbody td { font-size: 12px; }
            .data-table th, .data-table td { overflow-wrap: anywhere; word-break: normal; }
            .totals-box { margin-top: 18px; width: 380px; }
            .totals-box th { width: 55%; }
            .totals-title { text-align: center; }
            .center { text-align: center; }
            .nowrap { white-space: nowrap; }
            .number { text-align: right; white-space: nowrap; }
            @page { size: landscape; }
            @media print {
              * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              html { color-scheme: light; background: #ffffff; }
              body { background: #ffffff; margin: 12mm; }
              button { display: none; }
              .data-table tbody td { font-size: 10px; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div class="brand">
              <div>
                <div class="brand-name"><span class="brand-br">BR</span><span class="brand-azuka">azuka</span><span class="brand-flow">Flow</span></div>
                <div class="brand-subtitle">Gerenciador Financeiro</div>
              </div>
            </div>
            <div class="report-title">
              <h1>${escapeHtml(title)}</h1>
              <p><strong>Emitido em</strong> ${escapeHtml(formatDateTimeBR())}</p>
              <p><strong>Período</strong>: ${escapeHtml(periodLabel)}</p>
            </div>
          </div>

          <table class="data-table">
            <colgroup>
              <col style="width: 8%" />
              <col style="width: 8%" />
              <col style="width: 6%" />
              <col style="width: 22%" />
              <col style="width: 14%" />
              <col style="width: 14%" />
              <col style="width: 9%" />
              <col style="width: 9%" />
              <col style="width: 10%" />
            </colgroup>
            <thead>
              <tr>
                <th class="center">Data</th>
                <th class="center">Tipo</th>
                <th class="center">Cód.</th>
                <th>Descrição</th>
                <th>Tipo de Conta</th>
                <th>Conta Caixa</th>
                <th>Entrada</th>
                <th>Saída</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="9">Nenhuma movimentação encontrada.</td></tr>'}
            </tbody>
          </table>

          <table class="totals-box">
            <tbody>
              <tr><th colspan="2" class="totals-title">TOTAIS</th></tr>
              <tr><th>Entradas</th><td class="number">${escapeHtml(formatCurrency(totaisMovimento.receitas))}</td></tr>
              <tr><th>Saídas</th><td class="number">${escapeHtml(formatCurrency(totaisMovimento.despesas))}</td></tr>
              <tr><th>Saldo Final</th><td class="number">${escapeHtml(formatCurrency(totaisMovimento.saldo))}</td></tr>
              <tr><th>Movimentações</th><td class="number">${escapeHtml(movimentosFiltrados.length)}</td></tr>
            </tbody>
          </table>
        </body>
      </html>
    `;
  };

  const getCashBookExportExcel = () => {
    const periodLabel =
      dataInicioMovimento && dataFimMovimento
        ? `${formatDateBR(dataInicioMovimento)} a ${formatDateBR(dataFimMovimento)}`
        : dataInicioMovimento
          ? `A partir de ${formatDateBR(dataInicioMovimento)}`
          : dataFimMovimento
            ? `Até ${formatDateBR(dataFimMovimento)}`
            : 'Não Definido';
    const rows = livroCaixa
      .map(
        (movimento) => `
          <Row>
            <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeHtml(movimento.data ? formatDateBR(movimento.data) : '-')}</Data></Cell>
            <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeHtml(getMovementTypeLabel(movimento.tipo))}</Data></Cell>
            <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${movimento.codigo}</Data></Cell>
            <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeHtml(movimento.descricao || '-')}</Data></Cell>
            <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeHtml(movimento.tipoConta)}</Data></Cell>
            <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeHtml(movimento.contaCaixa)}</Data></Cell>
            <Cell ss:StyleID="Currency"><Data ss:Type="Number">${movimento.entrada}</Data></Cell>
            <Cell ss:StyleID="Currency"><Data ss:Type="Number">${movimento.saida}</Data></Cell>
            <Cell ss:StyleID="Currency"><Data ss:Type="Number">${movimento.saldo}</Data></Cell>
          </Row>
        `,
      )
      .join('');

    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Title"><Font ss:Bold="1" ss:Size="14" /></Style>
    <Style ss:ID="MetaLabel"><Font ss:Bold="1" /><Alignment ss:Horizontal="Right" /></Style>
    <Style ss:ID="TotalTitle"><Font ss:Bold="1" ss:Size="14" /><Alignment ss:Horizontal="Center" /><Interior ss:Color="#D1D5DB" ss:Pattern="Solid" /><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders></Style>
    <Style ss:ID="Header"><Font ss:Bold="1" /><Interior ss:Color="#E5E7EB" ss:Pattern="Solid" /><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders></Style>
    <Style ss:ID="HeaderCenter"><Font ss:Bold="1" /><Alignment ss:Horizontal="Center" /><Interior ss:Color="#E5E7EB" ss:Pattern="Solid" /><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders></Style>
    <Style ss:ID="Cell"><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders></Style>
    <Style ss:ID="CellCenter"><Alignment ss:Horizontal="Center" /><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders></Style>
    <Style ss:ID="Currency"><Alignment ss:Horizontal="Left" /><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders><NumberFormat ss:Format="&quot;R$&quot; #,##0.00" /></Style>
    <Style ss:ID="TotalLabel"><Font ss:Bold="1" /><Interior ss:Color="#F3F4F6" ss:Pattern="Solid" /><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders></Style>
    <Style ss:ID="TotalValue"><Font ss:Bold="1" /><Interior ss:Color="#F3F4F6" ss:Pattern="Solid" /><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" /><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" /></Borders><NumberFormat ss:Format="&quot;R$&quot; #,##0.00" /></Style>
  </Styles>
  <Worksheet ss:Name="Livro Caixa">
    <Table ss:ExpandedColumnCount="9">
      <Column ss:Width="85" />
      <Column ss:Width="80" />
      <Column ss:Width="60" />
      <Column ss:Width="220" />
      <Column ss:Width="150" />
      <Column ss:Width="130" />
      <Column ss:Width="95" />
      <Column ss:Width="95" />
      <Column ss:Width="95" />
      <Row><Cell ss:StyleID="Title"><Data ss:Type="String">Livro Caixa</Data></Cell></Row>
      <Row><Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Emitido em:</Data></Cell><Cell><Data ss:Type="String">${escapeHtml(formatDateTimeBR())}</Data></Cell></Row>
      <Row><Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Período:</Data></Cell><Cell><Data ss:Type="String">${escapeHtml(periodLabel)}</Data></Cell></Row>
      <Row />
      <Row>
        <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Data</Data></Cell>
        <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Tipo</Data></Cell>
        <Cell ss:StyleID="HeaderCenter"><Data ss:Type="String">Código</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Descrição</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Tipo de Conta</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Conta Caixa</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Entrada</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Saída</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Saldo</Data></Cell>
      </Row>
      ${rows || '<Row><Cell ss:StyleID="Cell"><Data ss:Type="String">Nenhuma movimentação encontrada.</Data></Cell></Row>'}
      <Row />
      <Row><Cell ss:Index="4" ss:MergeAcross="1" ss:StyleID="TotalTitle"><Data ss:Type="String">TOTAIS</Data></Cell></Row>
      <Row><Cell ss:Index="4" ss:StyleID="TotalLabel"><Data ss:Type="String">Entradas</Data></Cell><Cell ss:StyleID="TotalValue"><Data ss:Type="Number">${totaisMovimento.receitas}</Data></Cell></Row>
      <Row><Cell ss:Index="4" ss:StyleID="TotalLabel"><Data ss:Type="String">Saídas</Data></Cell><Cell ss:StyleID="TotalValue"><Data ss:Type="Number">${totaisMovimento.despesas}</Data></Cell></Row>
      <Row><Cell ss:Index="4" ss:StyleID="TotalLabel"><Data ss:Type="String">Saldo Final</Data></Cell><Cell ss:StyleID="TotalValue"><Data ss:Type="Number">${totaisMovimento.saldo}</Data></Cell></Row>
      <Row><Cell ss:Index="4" ss:StyleID="TotalLabel"><Data ss:Type="String">Movimentações</Data></Cell><Cell ss:StyleID="TotalLabel"><Data ss:Type="Number">${movimentosFiltrados.length}</Data></Cell></Row>
    </Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><Selected /></WorksheetOptions>
  </Worksheet>
</Workbook>`;
  };

  const handleExportCashBookPdf = () => {
    if (!relatorioMovimentoGerado || livroCaixa.length === 0) {
      toast.error('Gere o livro caixa antes de exportar.');
      return;
    }

    setPdfPrintTitle(`relatorio-livro-caixa-${getReportFileTimestamp()}`);
    setPdfPrintHtml(getCashBookExportHtml());
  };

  const handleExportCashBookExcel = () => {
    if (!relatorioMovimentoGerado || livroCaixa.length === 0) {
      toast.error('Gere o livro caixa antes de exportar.');
      return;
    }

    downloadHtmlFile(
      getCashBookExportExcel(),
      `livro-caixa-${new Date().toISOString().slice(0, 10)}.xls`,
      'application/vnd.ms-excel;charset=utf-8',
    );
  };

  const handleDataInicioChange = (value: string) => {
    setDataInicio(value);

    if (value && dataFim && dataFim < value) {
      setDataFim(value);
    }
  };

  const handleDataFimChange = (value: string) => {
    if (dataInicio && value && value < dataInicio) {
      toast.error('A Data Fim não pode ser menor que a Data de Início.');
      setDataFim(dataInicio);
      return;
    }

    setDataFim(value);
  };

  const handleDataInicioMovimentoChange = (value: string) => {
    setDataInicioMovimento(value);

    if (value && dataFimMovimento && dataFimMovimento < value) {
      setDataFimMovimento(value);
    }
  };

  const handleDataFimMovimentoChange = (value: string) => {
    if (dataInicioMovimento && value && value < dataInicioMovimento) {
      toast.error('A Data Fim não pode ser menor que a Data de Início.');
      setDataFimMovimento(dataInicioMovimento);
      return;
    }

    setDataFimMovimento(value);
  };

  const renderCommonFilters = (suffix = '', incluirModulo = true) => (
    <>
      {incluirModulo && (
        <div className="space-y-2">
          <Label htmlFor={`modulo${suffix}`} className="dark:text-slate-300">Módulo</Label>
          <Select value={moduloFiltro} onValueChange={(value: 'todos' | 'pagar' | 'receber') => setModuloFiltro(value)}>
            <SelectTrigger id={`modulo${suffix}`} className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="cursor-pointer">Todos</SelectItem>
              <SelectItem value="pagar" className="cursor-pointer">Contas a Pagar</SelectItem>
              <SelectItem value="receber" className="cursor-pointer">Contas a Receber</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={`tipoPagamento${suffix}`} className="dark:text-slate-300">Tipo de Pagamento</Label>
        <Select value={tipoPagamento} onValueChange={setTipoPagamento}>
          <SelectTrigger id={`tipoPagamento${suffix}`} className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos" className="cursor-pointer">Todos</SelectItem>
            {paymentTypes.map((type) => (
              <SelectItem key={type.id} value={String(type.id)} className="cursor-pointer">
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`status${suffix}`} className="dark:text-slate-300">Status</Label>
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger id={`status${suffix}`} className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos" className="cursor-pointer">Todos</SelectItem>
            <SelectItem value="realizado" className="cursor-pointer dark:text-[#8bd8b1] dark:data-[highlighted]:bg-[#314155] dark:data-[highlighted]:text-slate-100">Pago/Recebido</SelectItem>
            <SelectItem value="pendente" className="cursor-pointer dark:text-[#f9c87b] dark:data-[highlighted]:bg-[#314155] dark:data-[highlighted]:text-slate-100">Pendente</SelectItem>
            <SelectItem value="vencido" className="cursor-pointer dark:text-[#e7a0a9] dark:data-[highlighted]:bg-[#314155] dark:data-[highlighted]:text-slate-100">Vencido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`tipoData${suffix}`} className="dark:text-slate-300">Tipo de Data</Label>
        <Select value={tipoData} onValueChange={setTipoData}>
          <SelectTrigger id={`tipoData${suffix}`} className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="efetiva" className="cursor-pointer">Data Efetiva (Vencimento)</SelectItem>
            <SelectItem value="nominal" className="cursor-pointer">Data Nominal (Emissão)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`dataInicio${suffix}`} className="dark:text-slate-300">Data de Início</Label>
        <Input
          id={`dataInicio${suffix}`}
          type="date"
          value={dataInicio}
          max={dataFim || undefined}
          onChange={(e) => handleDataInicioChange(e.target.value)}
          className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`dataFim${suffix}`} className="dark:text-slate-300">Data Fim</Label>
        <Input
          id={`dataFim${suffix}`}
          type="date"
          value={dataFim}
          min={dataInicio || undefined}
          onChange={(e) => handleDataFimChange(e.target.value)}
          className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`ordenarPor${suffix}`} className="dark:text-slate-300">Ordenar Por</Label>
        <Select value={ordernarPor} onValueChange={setOrdernarPor}>
          <SelectTrigger id={`ordenarPor${suffix}`} className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dataEfetiva" className="cursor-pointer">Data Efetiva</SelectItem>
            <SelectItem value="dataNominal" className="cursor-pointer">Data Nominal</SelectItem>
            <SelectItem value="status" className="cursor-pointer">Status</SelectItem>
            <SelectItem value="tipoPagamento" className="cursor-pointer">Tipo de Pagamento</SelectItem>
            <SelectItem value="valor" className="cursor-pointer">Valor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`tipoOrdenacao${suffix}`} className="dark:text-slate-300">Tipo de Ordenação</Label>
        <Select value={tipoOrdenacao} onValueChange={setTipoOrdenacao}>
          <SelectTrigger id={`tipoOrdenacao${suffix}`} className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="crescente" className="cursor-pointer">Crescente</SelectItem>
            <SelectItem value="decrescente" className="cursor-pointer">Decrescente</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );

  const renderMovementFilters = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="movimentoFiltro" className="dark:text-slate-300">Tipo</Label>
        <Select value={movimentoFiltro} onValueChange={(value: 'todos' | 'receita' | 'despesa') => setMovimentoFiltro(value)}>
          <SelectTrigger id="movimentoFiltro" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos" className="cursor-pointer">Todas</SelectItem>
            <SelectItem value="receita" className="cursor-pointer">Receitas</SelectItem>
            <SelectItem value="despesa" className="cursor-pointer">Despesas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tipoContaMovimento" className="dark:text-slate-300">Tipo de Conta</Label>
        <SearchableSelect
          id="tipoContaMovimento"
          value={tipoContaMovimento}
          options={accountTypeMovimentoOptions}
          onValueChange={setTipoContaMovimento}
          placeholder="Selecione um tipo de conta"
          searchPlaceholder="Buscar tipo de conta..."
          emptyMessage="Nenhum tipo de conta encontrado."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contaCaixaMovimento" className="dark:text-slate-300">Conta Caixa</Label>
        <Select value={contaCaixaMovimento} onValueChange={setContaCaixaMovimento}>
          <SelectTrigger id="contaCaixaMovimento" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas" className="cursor-pointer">Todas</SelectItem>
            {cashAccounts.map((account) => (
              <SelectItem key={account.id} value={String(account.id)} className="cursor-pointer">
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dataInicioMovimento" className="dark:text-slate-300">Data de Início</Label>
        <Input
          id="dataInicioMovimento"
          type="date"
          value={dataInicioMovimento}
          max={dataFimMovimento || undefined}
          onChange={(e) => handleDataInicioMovimentoChange(e.target.value)}
          className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dataFimMovimento" className="dark:text-slate-300">Data Fim</Label>
        <Input
          id="dataFimMovimento"
          type="date"
          value={dataFimMovimento}
          min={dataInicioMovimento || undefined}
          onChange={(e) => handleDataFimMovimentoChange(e.target.value)}
          className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ordenarMovimentoPor" className="dark:text-slate-300">Ordenar Por</Label>
        <Select value={ordernarMovimentoPor} onValueChange={setOrdernarMovimentoPor}>
          <SelectTrigger id="ordenarMovimentoPor" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="data" className="cursor-pointer">Data</SelectItem>
            <SelectItem value="tipo" className="cursor-pointer">Tipo</SelectItem>
            <SelectItem value="tipoConta" className="cursor-pointer">Tipo de Conta</SelectItem>
            <SelectItem value="categoria" className="cursor-pointer">Categoria</SelectItem>
            <SelectItem value="contaCaixa" className="cursor-pointer">Conta Caixa</SelectItem>
            <SelectItem value="valor" className="cursor-pointer">Valor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tipoOrdenacaoMovimento" className="dark:text-slate-300">Tipo de Ordenação</Label>
        <Select value={tipoOrdenacaoMovimento} onValueChange={setTipoOrdenacaoMovimento}>
          <SelectTrigger id="tipoOrdenacaoMovimento" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="crescente" className="cursor-pointer">Crescente</SelectItem>
            <SelectItem value="decrescente" className="cursor-pointer">Decrescente</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );

  const renderCashBookFilters = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="livroCaixaTipo" className="dark:text-slate-300">Tipo</Label>
        <Select value={movimentoFiltro} onValueChange={(value: 'todos' | 'receita' | 'despesa') => setMovimentoFiltro(value)}>
          <SelectTrigger id="livroCaixaTipo" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos" className="cursor-pointer">Todas</SelectItem>
            <SelectItem value="receita" className="cursor-pointer">Receitas</SelectItem>
            <SelectItem value="despesa" className="cursor-pointer">Despesas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="livroCaixaConta" className="dark:text-slate-300">Conta Caixa</Label>
        <Select value={contaCaixaMovimento} onValueChange={setContaCaixaMovimento}>
          <SelectTrigger id="livroCaixaConta" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas" className="cursor-pointer">Todas</SelectItem>
            {cashAccounts.map((account) => (
              <SelectItem key={account.id} value={String(account.id)} className="cursor-pointer">
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="livroCaixaDataInicio" className="dark:text-slate-300">Data de Início</Label>
        <Input
          id="livroCaixaDataInicio"
          type="date"
          value={dataInicioMovimento}
          max={dataFimMovimento || undefined}
          onChange={(e) => handleDataInicioMovimentoChange(e.target.value)}
          className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="livroCaixaDataFim" className="dark:text-slate-300">Data Fim</Label>
        <Input
          id="livroCaixaDataFim"
          type="date"
          value={dataFimMovimento}
          min={dataInicioMovimento || undefined}
          onChange={(e) => handleDataFimMovimentoChange(e.target.value)}
          className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100"
        />
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <Dialog
        open={reportVolumeWarningOpen}
        onOpenChange={(open) => {
          setReportVolumeWarningOpen(open);
          if (!open) {
            setPendingAccountsReportData(null);
            setPendingMovementsReportData(null);
          }
        }}
      >
        <DialogContent className="max-w-md min-h-[300px] gap-6 dark:border-[#2f394a] dark:bg-[#1f2a37] dark:text-slate-100">
          <DialogHeader className="text-center">
            <DialogTitle className="dark:text-slate-100">Aviso do Relatório</DialogTitle>
          </DialogHeader>

          <div className="flex min-h-[128px] flex-col items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-6 py-5 text-center text-sm dark:border-[#2f394a] dark:bg-[#243043]">
            <p className="mb-3 font-bold text-orange-700 dark:text-[#f9c87b]">IMPORTANTE</p>
            <p className="font-semibold text-gray-800 dark:text-slate-100">Relatório com muitos dados</p>
            <p className="mt-3 leading-relaxed text-gray-600 dark:text-slate-300">
              A visualização pode ficar mais lenta.
              <br />
              Use filtros de data para melhorar a navegação.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:justify-center">
            <Button
              variant="outline"
              className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]"
              onClick={() => {
                setReportVolumeWarningOpen(false);
                setPendingAccountsReportData(null);
                setPendingMovementsReportData(null);
              }}
            >
              Ajustar Filtros
            </Button>
            <Button
              className="cursor-pointer disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 dark:bg-[#075985] dark:hover:bg-[#0e7490] dark:text-white"
              onClick={() => {
                if (pendingAccountsReportData) {
                  finalizarGeracaoRelatorioContas(pendingAccountsReportData);
                }
                if (pendingMovementsReportData) {
                  finalizarGeracaoRelatorioMovimentos(pendingMovementsReportData);
                }
                setReportVolumeWarningOpen(false);
                setPendingAccountsReportData(null);
                setPendingMovementsReportData(null);
              }}
            >
              Gerar Mesmo Assim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pdfPrintHtml)}
        onOpenChange={(open) => {
          if (!open) {
            setPdfPrintHtml('');
            setPdfPrintTitle('');
          }
        }}
      >
        <DialogContent className="!w-[90vw] !max-w-none h-[92vh] p-0 gap-0 overflow-hidden flex flex-col dark:border-[#2f394a] dark:bg-[#1f2a37] dark:text-slate-100">
          <DialogHeader className="px-6 py-4 border-b dark:border-[#2f394a]">
            <DialogTitle>Prévia do Relatório PDF</DialogTitle>
            <DialogDescription>Confira o relatório antes de imprimir ou salvar como PDF.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 bg-gray-100 p-3 overflow-hidden dark:bg-[#273447]">
            <iframe
              id="relatorio-pdf-preview"
              title={pdfPrintTitle || 'Prévia do relatório PDF'}
              srcDoc={pdfPrintHtml}
              className="w-full h-full border-0 bg-white rounded-md shadow-sm dark:bg-[#1f2a37]"
            />
          </div>

          <DialogFooter className="px-6 py-4 border-t dark:border-[#2f394a]">
            <Button
              variant="outline"
              className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]"
              onClick={() => {
                setPdfPrintHtml('');
                setPdfPrintTitle('');
              }}
            >
              Fechar
            </Button>
            <Button className="cursor-pointer disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 dark:bg-[#075985] dark:hover:bg-[#0e7490] dark:text-white" onClick={handlePrintPdfPreview}>
              <Download className="w-4 h-4 mr-2" />
              Imprimir / Salvar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Relatórios Gerais
          </CardTitle>
          <CardDescription className="dark:text-slate-400">Gere relatórios detalhados do financeiro</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setMacroRelatorio('contas')}
          className={`group text-left rounded-lg border p-5 transition-all duration-200 cursor-pointer ${
            macroRelatorio === 'contas'
              ? 'border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-200 dark:border-[#075985] dark:bg-[#243043] dark:ring-[#075985]/40'
              : 'border-gray-200 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/40 dark:border-[#2f394a] dark:bg-[#1f2a37] dark:hover:border-[#5b93d6] dark:hover:bg-[#20344e] dark:hover:ring-1 dark:hover:ring-[#5b93d6]/30 dark:hover:shadow-lg'
          }`}
          aria-pressed={macroRelatorio === 'contas'}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 rounded-md p-2 transition-colors duration-200 ${
                macroRelatorio === 'contas'
                  ? 'bg-blue-100 text-blue-700 dark:bg-[#273447] dark:text-[#8ab4f8]'
                  : 'bg-gray-100 text-gray-600 dark:bg-[#273447] dark:text-slate-400 dark:group-hover:bg-[#2a4260]'
              }`}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-slate-100">Contas a Pagar/Receber</h3>
              <p className="text-sm text-gray-500 mt-1 dark:text-slate-400">Relatórios de contas, status, vencimentos e origens.</p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMacroRelatorio('movimentos')}
          className={`group text-left rounded-lg border p-5 transition-all duration-200 cursor-pointer ${
            macroRelatorio === 'movimentos'
              ? 'border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-200 dark:border-[#075985] dark:bg-[#243043] dark:ring-[#075985]/40'
              : 'border-gray-200 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/40 dark:border-[#2f394a] dark:bg-[#1f2a37] dark:hover:border-[#5b93d6] dark:hover:bg-[#20344e] dark:hover:ring-1 dark:hover:ring-[#5b93d6]/30 dark:hover:shadow-lg'
          }`}
          aria-pressed={macroRelatorio === 'movimentos'}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 rounded-md p-2 transition-colors duration-200 ${
                macroRelatorio === 'movimentos'
                  ? 'bg-blue-100 text-blue-700 dark:bg-[#273447] dark:text-[#8ab4f8]'
                  : 'bg-gray-100 text-gray-600 dark:bg-[#273447] dark:text-slate-400 dark:group-hover:bg-[#2a4260]'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-slate-100">Receitas/Despesas</h3>
              <p className="text-sm text-gray-500 mt-1 dark:text-slate-400">Relatórios de movimentações, entradas, saídas e livro caixa.</p>
            </div>
          </div>
        </button>
      </div>

      {macroRelatorio === 'contas' && (
        <div className="space-y-6">
          <Tabs value={tipoRelatorio} onValueChange={handleTipoRelatorioChange} className="w-full">
            <TabsList className="grid w-full md:w-auto grid-cols-2 dark:bg-[#273447] dark:text-slate-200">
              <TabsTrigger value="geral" className="cursor-pointer dark:data-[state=active]:bg-[#075985] dark:data-[state=active]:text-white">Relatório Geral</TabsTrigger>
              <TabsTrigger value="origem" className="cursor-pointer dark:data-[state=active]:bg-[#075985] dark:data-[state=active]:text-white">Relatório por Origem</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filtros do Relatório
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{renderCommonFilters()}</div>

                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 mt-6">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button className="cursor-pointer disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 dark:bg-[#075985] dark:hover:bg-[#0e7490] dark:text-white" onClick={handleGerarRelatorio} disabled={isLoading}>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        {isLoading ? 'Carregando...' : 'Gerar Relatório'}
                      </Button>
                      <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={() => limparFiltrosContas()}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Limpar Filtros
                      </Button>
                    </div>
                    <div className="hidden sm:block h-9 w-px bg-gray-200 mx-4 dark:bg-[#2f394a]" aria-hidden="true" />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={handleExportAccountsGeneralPdf} disabled={!relatorioGerado || dadosFiltrados.length === 0}>
                        <Download className="w-4 h-4 mr-2" />
                        Exportar PDF
                      </Button>
                      <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={handleExportAccountsGeneralExcel} disabled={!relatorioGerado || dadosFiltrados.length === 0}>
                        <Download className="w-4 h-4 mr-2" />
                        Exportar Excel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="origem" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filtros do Relatório por Origem
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="moduloOrigem" className="dark:text-slate-300">Módulo</Label>
                      <Select value={moduloFiltro} onValueChange={(value: 'todos' | 'pagar' | 'receber') => setModuloFiltro(value)}>
                        <SelectTrigger id="moduloOrigem" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos" className="cursor-pointer">Todos</SelectItem>
                          <SelectItem value="pagar" className="cursor-pointer">Contas a Pagar</SelectItem>
                          <SelectItem value="receber" className="cursor-pointer">Contas a Receber</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="filtroPessoa" className="dark:text-slate-300">Tipo de Origem</Label>
                      <Select value={filtroPessoa} onValueChange={(value: 'pessoa' | 'nao-pessoa' | 'todos') => setFiltroPessoa(value)}>
                        <SelectTrigger id="filtroPessoa" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos" className="cursor-pointer">Todos</SelectItem>
                          <SelectItem value="pessoa" className="cursor-pointer">{getOriginPersonLabel(moduloFiltro)}</SelectItem>
                          <SelectItem value="nao-pessoa" className="cursor-pointer">Operação</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="origem" className="dark:text-slate-300">
                        Origem Específica <span className="text-red-500 dark:text-[#e7a0a9]">*</span>
                      </Label>
                      <SearchableSelect
                        id="origem"
                        value={origemSelecionada}
                        options={origemOptions}
                        onValueChange={setOrigemSelecionada}
                        placeholder="Selecione uma origem"
                        searchPlaceholder="Buscar origem..."
                        emptyMessage="Nenhuma origem encontrada."
                      />
                    </div>

                    {renderCommonFilters('2', false)}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 mt-6">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button className="cursor-pointer disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 dark:bg-[#075985] dark:hover:bg-[#0e7490] dark:text-white" onClick={handleGerarRelatorio} disabled={isLoading}>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        {isLoading ? 'Carregando...' : 'Gerar Relatório'}
                      </Button>
                      <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={() => limparFiltrosContas({ incluirOrigem: true })}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Limpar Filtros
                      </Button>
                    </div>
                    <div className="hidden sm:block h-9 w-px bg-gray-200 mx-4 dark:bg-[#2f394a]" aria-hidden="true" />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={handleExportAccountsOriginPdf} disabled={!relatorioGerado || dadosFiltrados.length === 0}>
                        <Download className="w-4 h-4 mr-2" />
                        Exportar PDF
                      </Button>
                      <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={handleExportAccountsOriginExcel} disabled={!relatorioGerado || dadosFiltrados.length === 0}>
                        <Download className="w-4 h-4 mr-2" />
                        Exportar Excel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {macroRelatorio === 'movimentos' && (
        <div className="space-y-6">
          <Tabs value={tipoRelatorioMovimento} onValueChange={handleTipoRelatorioMovimentoChange} className="w-full">
            <TabsList className="grid w-full md:w-auto grid-cols-2 dark:bg-[#273447] dark:text-slate-200">
              <TabsTrigger value="geral" className="cursor-pointer dark:data-[state=active]:bg-[#075985] dark:data-[state=active]:text-white">Relatório Geral</TabsTrigger>
              <TabsTrigger value="livro-caixa" className="cursor-pointer dark:data-[state=active]:bg-[#075985] dark:data-[state=active]:text-white">Livro Caixa</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filtros do Relatório de Receitas/Despesas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{renderMovementFilters()}</div>

                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 mt-6">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button className="cursor-pointer disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 dark:bg-[#075985] dark:hover:bg-[#0e7490] dark:text-white" onClick={handleGerarRelatorioMovimento} disabled={isLoading}>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        {isLoading ? 'Carregando...' : 'Gerar Relatório'}
                      </Button>
                      <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={() => limparFiltrosMovimentos()}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Limpar Filtros
                      </Button>
                    </div>
                    <div className="hidden sm:block h-9 w-px bg-gray-200 mx-4 dark:bg-[#2f394a]" aria-hidden="true" />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={handleExportMovementsGeneralPdf} disabled={!relatorioMovimentoGerado || movimentosFiltrados.length === 0}>
                        <Download className="w-4 h-4 mr-2" />
                        Exportar PDF
                      </Button>
                      <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={handleExportMovementsGeneralExcel} disabled={!relatorioMovimentoGerado || movimentosFiltrados.length === 0}>
                        <Download className="w-4 h-4 mr-2" />
                        Exportar Excel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="livro-caixa" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filtros do Livro Caixa
                  </CardTitle>
                  <CardDescription>O livro caixa é gerado em ordem cronológica para calcular o saldo acumulado.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{renderCashBookFilters()}</div>

                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 mt-6">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button className="cursor-pointer disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 dark:bg-[#075985] dark:hover:bg-[#0e7490] dark:text-white" onClick={handleGerarLivroCaixa} disabled={isLoading}>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        {isLoading ? 'Carregando...' : 'Gerar Livro Caixa'}
                      </Button>
                      <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={() => limparFiltrosMovimentos({ incluirTipoConta: false })}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Limpar Filtros
                      </Button>
                    </div>
                    <div className="hidden sm:block h-9 w-px bg-gray-200 mx-4 dark:bg-[#2f394a]" aria-hidden="true" />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={handleExportCashBookPdf} disabled={!relatorioMovimentoGerado || livroCaixa.length === 0}>
                        <Download className="w-4 h-4 mr-2" />
                        Exportar PDF
                      </Button>
                      <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={handleExportCashBookExcel} disabled={!relatorioMovimentoGerado || livroCaixa.length === 0}>
                        <Download className="w-4 h-4 mr-2" />
                        Exportar Excel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {macroRelatorio === 'contas' && relatorioGerado && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-600 dark:text-slate-300">Total Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-blue-600 dark:text-[#8ab4f8]">{formatCurrency(totais.total)}</div>
                <p className="text-gray-500 dark:text-slate-400">{dadosFiltrados.length} contas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-600 dark:text-slate-300">Pago/Recebido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-green-600 dark:text-[#8bd8b1]">{formatCurrency(totais.realizado)}</div>
                <p className="text-gray-500 dark:text-slate-400">{dadosFiltrados.filter((item) => item.status === 'realizado').length} contas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-600 dark:text-slate-300">Pendente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-yellow-600 dark:text-[#f9c87b]">{formatCurrency(totais.pendente)}</div>
                <p className="text-gray-500 dark:text-slate-400">{dadosFiltrados.filter((item) => item.status === 'pendente').length} contas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-600 dark:text-slate-300">Vencido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-red-600 dark:text-[#e7a0a9]">{formatCurrency(totais.vencido)}</div>
                <p className="text-gray-500 dark:text-slate-400">{dadosFiltrados.filter((item) => item.status === 'vencido').length} contas</p>
              </CardContent>
            </Card>
          </div>

          {tipoRelatorio === 'origem' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="dark:text-slate-100">Resumo por Origem</CardTitle>
                  <CardDescription className="dark:text-slate-400">{resumoPorOrigem.length} origem(ns) encontrada(s)</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-[#243043]">
                        <TableHead>Origem</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Qtde</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Pago/Recebido</TableHead>
                        <TableHead>Pendente</TableHead>
                        <TableHead>Vencido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resumoPorOrigem.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-500 py-8 dark:text-slate-300">
                            Nenhuma origem encontrada para os filtros selecionados.
                          </TableCell>
                        </TableRow>
                      )}
                      {resumoPorOrigem.map((origem) => (
                        <TableRow key={origem.key} className="dark:hover:bg-[#273447]">
                          <TableCell>
                            <Badge variant="outline">{origem.origem}</Badge>
                          </TableCell>
                          <TableCell>{getOriginTypeLabel(origem.pessoa, origem.modulo)}</TableCell>
                          <TableCell>{origem.quantidade}</TableCell>
                          <TableCell>{formatCurrency(origem.total)}</TableCell>
                          <TableCell className="text-green-700 dark:text-[#8bd8b1]">{formatCurrency(origem.realizado)}</TableCell>
                          <TableCell className="text-yellow-700 dark:text-[#f9c87b]">{formatCurrency(origem.pendente)}</TableCell>
                          <TableCell className="text-red-700 dark:text-[#e7a0a9]">{formatCurrency(origem.vencido)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {resumoPorOrigem.map((origem) => (
                <Card key={`detalhe-${origem.key}`}>
                  <CardHeader>
                    <CardTitle className="dark:text-slate-100">{origem.origem}</CardTitle>
                    <CardDescription className="dark:text-slate-400">
                      {origem.quantidade} conta(s) - Total {formatCurrency(origem.total)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-[#243043]">
                          <TableHead className="text-center">Tipo</TableHead>
                          <TableHead className="text-center">Código</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Forma Pgto</TableHead>
                          <TableHead className="text-center">Data Emissão</TableHead>
                          <TableHead className="text-center">Data Vcto</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(dadosPorOrigem.get(origem.key) || []).map((conta) => (
                          <TableRow key={`origem-${conta.id}`} className="dark:hover:bg-[#273447]">
                            <TableCell className="text-center">
                              <Badge className={conta.modulo === 'receber' ? 'bg-green-100 text-green-700 dark:bg-[#273447] dark:text-[#8bd8b1]' : 'bg-red-100 text-red-700 dark:bg-[#273447] dark:text-[#e7a0a9]'}>
                                {getAccountModuleShortLabel(conta.modulo)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">{conta.codigo}</TableCell>
                            <TableCell>{conta.descricao || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200">{conta.formaPgto}</Badge>
                            </TableCell>
                            <TableCell className="text-center">{conta.dataNominal ? formatDateBR(conta.dataNominal) : '-'}</TableCell>
                            <TableCell className="text-center">{conta.dataEfetiva ? formatDateBR(conta.dataEfetiva) : '-'}</TableCell>
                            <TableCell>{formatCurrency(conta.valor)}</TableCell>
                            <TableCell className="text-center">{getStatusBadge(conta)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="dark:text-slate-100">{tipoRelatorio === 'origem' ? 'Resultado Geral por Origem' : 'Resultado do Relatório'}</CardTitle>
              <CardDescription className="dark:text-slate-400">{dadosFiltrados.length} registro(s) encontrado(s)</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-[#243043]">
                    <TableHead className="text-center">Tipo</TableHead>
                    <TableHead className="text-center">Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Forma Pgto</TableHead>
                    <TableHead className="text-center">Data Emissão</TableHead>
                    <TableHead className="text-center">Data Vcto</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-gray-500 py-8 dark:text-slate-300">
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                  {dadosFiltrados.map((conta) => (
                    <TableRow key={conta.id} className="dark:hover:bg-[#273447]">
                      <TableCell className="text-center">
                        <Badge className={conta.modulo === 'receber' ? 'bg-green-100 text-green-700 dark:bg-[#273447] dark:text-[#8bd8b1]' : 'bg-red-100 text-red-700 dark:bg-[#273447] dark:text-[#e7a0a9]'}>
                          {getAccountModuleShortLabel(conta.modulo)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{conta.codigo}</TableCell>
                      <TableCell>{conta.descricao || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200">{conta.formaPgto}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{conta.dataNominal ? formatDateBR(conta.dataNominal) : '-'}</TableCell>
                      <TableCell className="text-center">{conta.dataEfetiva ? formatDateBR(conta.dataEfetiva) : '-'}</TableCell>
                      <TableCell>{formatCurrency(conta.valor)}</TableCell>
                      <TableCell className="text-center">{getStatusBadge(conta)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200">{conta.origem}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-right text-xs text-gray-500 mt-2 dark:text-slate-400">Legenda: CP = Contas a Pagar | CR = Contas a Receber</p>
            </CardContent>
          </Card>
        </>
      )}

      {macroRelatorio === 'movimentos' && tipoRelatorioMovimento === 'geral' && relatorioMovimentoGerado && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-600 dark:text-slate-300">Receitas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-green-600 dark:text-[#8bd8b1]">{formatCurrency(totaisMovimento.receitas)}</div>
                <p className="text-gray-500 dark:text-slate-400">{movimentosFiltrados.filter((item) => item.tipo === 'receita').length} registro(s)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-600 dark:text-slate-300">Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-red-600 dark:text-[#e7a0a9]">{formatCurrency(totaisMovimento.despesas)}</div>
                <p className="text-gray-500 dark:text-slate-400">{movimentosFiltrados.filter((item) => item.tipo === 'despesa').length} registro(s)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-600 dark:text-slate-300">Saldo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={totaisMovimento.saldo >= 0 ? 'text-blue-600 dark:text-[#8ab4f8]' : 'text-red-600 dark:text-[#e7a0a9]'}>{formatCurrency(totaisMovimento.saldo)}</div>
                <p className="text-gray-500 dark:text-slate-400">receitas - despesas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-600 dark:text-slate-300">Total de Registros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-900 dark:text-slate-100">{movimentosFiltrados.length}</div>
                <p className="text-gray-500 dark:text-slate-400">movimentações</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="dark:text-slate-100">Resultado do Relatório</CardTitle>
              <CardDescription className="dark:text-slate-400">{movimentosFiltrados.length} registro(s) encontrado(s)</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-[#243043]">
                    <TableHead>Tipo</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo de Conta</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Conta Caixa</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentosFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8 dark:text-slate-300">
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                  {movimentosFiltrados.map((movimento) => (
                    <TableRow key={movimento.id} className="dark:hover:bg-[#273447]">
                      <TableCell>
                        <Badge className={movimento.tipo === 'receita' ? 'bg-green-100 text-green-700 dark:bg-[#273447] dark:text-[#8bd8b1]' : 'bg-red-100 text-red-700 dark:bg-[#273447] dark:text-[#e7a0a9]'}>
                          {movimento.tipo === 'receita' ? 'Receita' : 'Despesa'}
                        </Badge>
                      </TableCell>
                      <TableCell>{movimento.codigo}</TableCell>
                      <TableCell>{movimento.descricao || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200">{movimento.tipoConta}</Badge>
                      </TableCell>
                      <TableCell>{movimento.categoria}</TableCell>
                      <TableCell>{movimento.contaCaixa}</TableCell>
                      <TableCell>{movimento.data ? formatDateBR(movimento.data) : '-'}</TableCell>
                      <TableCell className={movimento.tipo === 'receita' ? 'text-green-700 dark:text-[#8bd8b1]' : 'text-red-700 dark:text-[#e7a0a9]'}>{formatCurrency(movimento.valor)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {macroRelatorio === 'movimentos' && tipoRelatorioMovimento === 'livro-caixa' && relatorioMovimentoGerado && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-600 dark:text-slate-300">Entradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-green-600 dark:text-[#8bd8b1]">{formatCurrency(totaisMovimento.receitas)}</div>
                <p className="text-gray-500 dark:text-slate-400">{movimentosFiltrados.filter((item) => item.tipo === 'receita').length} receita(s)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-600 dark:text-slate-300">Saídas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-red-600 dark:text-[#e7a0a9]">{formatCurrency(totaisMovimento.despesas)}</div>
                <p className="text-gray-500 dark:text-slate-400">{movimentosFiltrados.filter((item) => item.tipo === 'despesa').length} despesa(s)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-600 dark:text-slate-300">Saldo Final</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={totaisMovimento.saldo >= 0 ? 'text-blue-600 dark:text-[#8ab4f8]' : 'text-red-600 dark:text-[#e7a0a9]'}>{formatCurrency(totaisMovimento.saldo)}</div>
                <p className="text-gray-500 dark:text-slate-400">entradas - saídas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-600 dark:text-slate-300">Movimentações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-900 dark:text-slate-100">{movimentosFiltrados.length}</div>
                <p className="text-gray-500 dark:text-slate-400">registro(s)</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="dark:text-slate-100">Livro Caixa</CardTitle>
              <CardDescription className="dark:text-slate-400">{livroCaixa.length} movimentação(ões) encontrada(s)</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-[#243043]">
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo de Conta</TableHead>
                    <TableHead>Conta Caixa</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead>Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {livroCaixa.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-gray-500 py-8 dark:text-slate-300">
                        Nenhuma movimentação encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                  {livroCaixa.map((movimento) => (
                    <TableRow key={`livro-${movimento.id}`} className="dark:hover:bg-[#273447]">
                      <TableCell>{movimento.data ? formatDateBR(movimento.data) : '-'}</TableCell>
                      <TableCell>
                        <Badge className={movimento.tipo === 'receita' ? 'bg-green-100 text-green-700 dark:bg-[#273447] dark:text-[#8bd8b1]' : 'bg-red-100 text-red-700 dark:bg-[#273447] dark:text-[#e7a0a9]'}>
                          {movimento.tipo === 'receita' ? 'Receita' : 'Despesa'}
                        </Badge>
                      </TableCell>
                      <TableCell>{movimento.codigo}</TableCell>
                      <TableCell>{movimento.descricao || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200">{movimento.tipoConta}</Badge>
                      </TableCell>
                      <TableCell>{movimento.contaCaixa}</TableCell>
                      <TableCell className="text-green-700 dark:text-[#8bd8b1]">{movimento.entrada ? formatCurrency(movimento.entrada) : '-'}</TableCell>
                      <TableCell className="text-red-700 dark:text-[#e7a0a9]">{movimento.saida ? formatCurrency(movimento.saida) : '-'}</TableCell>
                      <TableCell className={movimento.saldo >= 0 ? 'text-blue-700 dark:text-[#8ab4f8]' : 'text-red-700 dark:text-[#e7a0a9]'}>{formatCurrency(movimento.saldo)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
