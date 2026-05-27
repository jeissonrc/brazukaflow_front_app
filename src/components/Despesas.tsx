import { useEffect, useRef, useState } from 'react';
import { Plus, Search, Filter, Pencil, Trash2, Eye, ArrowUpDown, ArrowUp, ArrowDown, X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner@2.0.3';
import { getAuthToken } from '../lib/auth';

type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis';

type ApiCategory = {
  id: number;
  description: string;
};

type ApiAccountType = {
  id: number;
  description: string;
  type?: 'Receita' | 'Despesa';
  status?: boolean | number | string | null;
  category?: ApiCategory;
};

type ApiCashAccount = {
  id: number;
  name: string;
  status?: boolean | number | string | null;
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

type Despesa = {
  id: number;
  descricao: string;
  tipoConta: string;
  categoria: string;
  contaCaixa: string;
  accountTypeId: number | null;
  cashAccountId: number | null;
  valor: number;
  dataDespesa: string;
};

type DespesaForm = {
  descricao: string;
  accountTypeId: string;
  cashAccountId: string;
  valor: string;
  dataDespesa: string;
};

type DespesasPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type DespesasSummary = {
  total: number;
  quantidade: number;
  ticketMedio: number;
  mesAtual: number;
};

type DespesasPaginatedResponse = {
  items: ApiExpense[];
  pagination: DespesasPagination;
  summary: DespesasSummary;
};

const DEFAULT_FORM: DespesaForm = {
  descricao: '',
  accountTypeId: '',
  cashAccountId: '',
  valor: '',
  dataDespesa: '',
};

const DEFAULT_PAGINATION: DespesasPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

const DEFAULT_SUMMARY: DespesasSummary = {
  total: 0,
  quantidade: 0,
  ticketMedio: 0,
  mesAtual: 0,
};

const calculateDespesasSummary = (items: Despesa[]): DespesasSummary => {
  const currentMonth = new Date().getMonth() + 1;
  const summary = items.reduce(
    (acc, despesa) => {
      const [, month] = despesa.dataDespesa.split('-');

      acc.total += despesa.valor;
      acc.quantidade += 1;
      if (Number(month) === currentMonth) {
        acc.mesAtual += despesa.valor;
      }
      return acc;
    },
    { total: 0, quantidade: 0, ticketMedio: 0, mesAtual: 0 },
  );

  summary.ticketMedio = summary.quantidade ? summary.total / summary.quantidade : 0;
  return summary;
};

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || '';
const isActiveStatus = (status: boolean | number | string | null | undefined) => status !== false && status !== 0 && status !== '0' && status !== 'false';

const normalizeDateInput = (value?: string | null) => {
  if (!value) {
    return '';
  }
  return value.slice(0, 10);
};

const formatDateBR = (value: string) => {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return '-';
  }
  return `${day}/${month}/${year}`;
};

const formatCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  const amount = Number(digits) / 100;
  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatCurrencyValue = (value: number) =>
  value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const parseCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) / 100 : 0;
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

const mapApiExpenseToDespesa = (expense: ApiExpense): Despesa => ({
  id: expense.id,
  descricao: expense.description || '',
  tipoConta: expense.accountType?.description || '-',
  categoria: expense.accountType?.category?.description || '-',
  contaCaixa: expense.cashAccount?.name || '-',
  accountTypeId: expense.accountTypeId ?? null,
  cashAccountId: expense.cashAccountId ?? null,
  valor: Number(expense.value || 0),
  dataDespesa: normalizeDateInput(expense.expenseDate),
});

export default function Despesas() {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [accountTypeFiltro, setAccountTypeFiltro] = useState('todos');
  const [cashAccountFiltro, setCashAccountFiltro] = useState('todas');
  const [dataInicioFiltro, setDataInicioFiltro] = useState('');
  const [dataFimFiltro, setDataFimFiltro] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDespesa, setSelectedDespesa] = useState<Despesa | null>(null);
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);
  const [accountTypes, setAccountTypes] = useState<ApiAccountType[]>([]);
  const [cashAccounts, setCashAccounts] = useState<ApiCashAccount[]>([]);
  const [formData, setFormData] = useState<DespesaForm>(DEFAULT_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sortColumn, setSortColumn] = useState<keyof Despesa | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [pagination, setPagination] = useState<DespesasPagination>(DEFAULT_PAGINATION);
  const [summary, setSummary] = useState<DespesasSummary>(DEFAULT_SUMMARY);
  const scrollToPaginationBottomRef = useRef(false);
  const paginationRef = useRef<HTMLDivElement>(null);

  const fetchDespesas = async () => {
    setIsLoading(true);
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(registrosPorPagina),
    });

    if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
    if (accountTypeFiltro !== 'todos') params.set('accountTypeId', accountTypeFiltro);
    if (cashAccountFiltro !== 'todas') params.set('cashAccountId', cashAccountFiltro);
    if (dataInicioFiltro) params.set('dateFrom', dataInicioFiltro);
    if (dataFimFiltro) params.set('dateTo', dataFimFiltro);
    if (sortColumn) {
      params.set('sortBy', String(sortColumn));
      params.set('sortDirection', sortDirection);
    }

    const response = await fetch(`${getApiBaseUrl()}/api/expenses?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao carregar despesas.');
    }

    const responseData = result.data as DespesasPaginatedResponse | ApiExpense[];
    const isLegacyArrayResponse = Array.isArray(responseData);
    const legacyItems = isLegacyArrayResponse ? responseData.map(mapApiExpenseToDespesa) : [];
    const legacyFilteredItems = legacyItems.filter((despesa) => {
      const matchesSearch =
        !debouncedSearchTerm ||
        despesa.descricao.toLowerCase().includes(debouncedSearchTerm) ||
        despesa.tipoConta.toLowerCase().includes(debouncedSearchTerm) ||
        despesa.categoria.toLowerCase().includes(debouncedSearchTerm) ||
        despesa.contaCaixa.toLowerCase().includes(debouncedSearchTerm);
      const matchesAccountType = accountTypeFiltro === 'todos' || String(despesa.accountTypeId) === accountTypeFiltro;
      const matchesCashAccount = cashAccountFiltro === 'todas' || String(despesa.cashAccountId) === cashAccountFiltro;
      const matchesStartDate = !dataInicioFiltro || (despesa.dataDespesa && despesa.dataDespesa >= dataInicioFiltro);
      const matchesEndDate = !dataFimFiltro || (despesa.dataDespesa && despesa.dataDespesa <= dataFimFiltro);

      return matchesSearch && matchesAccountType && matchesCashAccount && matchesStartDate && matchesEndDate;
    });
    const legacySortedItems = [...legacyFilteredItems].sort((a, b) => {
      if (!sortColumn) return 0;
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    const legacyStartIndex = (currentPage - 1) * registrosPorPagina;
    const legacyPaginatedItems = legacySortedItems.slice(legacyStartIndex, legacyStartIndex + registrosPorPagina);
    const legacyPagination = {
      page: currentPage,
      limit: registrosPorPagina,
      total: legacyFilteredItems.length,
      totalPages: Math.max(1, Math.ceil(legacyFilteredItems.length / registrosPorPagina)),
    };
    const apiItems = isLegacyArrayResponse ? legacyPaginatedItems : responseData?.items || [];
    const items = isLegacyArrayResponse ? legacyPaginatedItems : apiItems.map(mapApiExpenseToDespesa);

    setDespesas(items);
    setPagination(isLegacyArrayResponse ? legacyPagination : responseData?.pagination || DEFAULT_PAGINATION);
    setSummary(isLegacyArrayResponse ? calculateDespesasSummary(legacyFilteredItems) : responseData?.summary || DEFAULT_SUMMARY);
    setIsLoading(false);
  };

  const fetchAccountTypes = async () => {
    const response = await fetch(`${getApiBaseUrl()}/api/account-types`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao carregar tipos de conta.');
    }

    const items = ((result.data || []) as ApiAccountType[]).filter(
      (item) => item.type === 'Despesa' && isActiveStatus(item.status),
    );
    setAccountTypes(items);
  };

  const fetchCashAccounts = async () => {
    const response = await fetch(`${getApiBaseUrl()}/api/cash-accounts`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao carregar contas caixa.');
    }

    const items = ((result.data || []) as ApiCashAccount[]).filter((item) => isActiveStatus(item.status));
    setCashAccounts(items);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([fetchAccountTypes(), fetchCashAccounts()]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar módulo de despesas.');
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    fetchDespesas().catch((error) => {
      setIsLoading(false);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar despesas.');
    });
  }, [
    currentPage,
    registrosPorPagina,
    debouncedSearchTerm,
    accountTypeFiltro,
    cashAccountFiltro,
    dataInicioFiltro,
    dataFimFiltro,
    sortColumn,
    sortDirection,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    registrosPorPagina,
    debouncedSearchTerm,
    accountTypeFiltro,
    cashAccountFiltro,
    dataInicioFiltro,
    dataFimFiltro,
    sortColumn,
    sortDirection,
  ]);

  useEffect(() => {
    if (currentPage > pagination.totalPages) {
      setCurrentPage(pagination.totalPages);
    }
  }, [currentPage, pagination.totalPages]);

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
  }, [isLoading, despesas]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim().toLowerCase());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  const scrollToPaginationBottomAfterLoad = () => {
    scrollToPaginationBottomRef.current = true;
  };

  const handleRegistrosPorPaginaChange = (value: string) => {
    scrollToPaginationBottomAfterLoad();
    setRegistrosPorPagina(Number(value));
  };

  const handlePageChange = (page: number) => {
    scrollToPaginationBottomAfterLoad();
    setCurrentPage(page);
  };

  const handleSort = (column: keyof Despesa) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: keyof Despesa) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1 inline" /> : <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  const openCreateDialog = () => {
    setEditingDespesa(null);
    setFormData(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const handleEdit = (despesa: Despesa) => {
    setEditingDespesa(despesa);
    setFormData({
      descricao: despesa.descricao,
      accountTypeId: despesa.accountTypeId ? String(despesa.accountTypeId) : '',
      cashAccountId: despesa.cashAccountId ? String(despesa.cashAccountId) : '',
      valor: despesa.valor ? formatCurrencyValue(despesa.valor) : '',
      dataDespesa: despesa.dataDespesa || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) {
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/expenses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao excluir despesa.');
      }
      toast.success('Despesa excluída com sucesso.');
      await fetchDespesas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir despesa.');
    }
  };

  const handleViewDetails = (despesa: Despesa) => {
    setSelectedDespesa(despesa);
    setDetailsOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDespesa(null);
    setFormData(DEFAULT_FORM);
  };

  const saveDespesa = async () => {
    if (!formData.descricao.trim() || !formData.cashAccountId || !formData.valor.trim()) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    setIsSaving(true);

    try {
      const isEditing = Boolean(editingDespesa);
      const endpoint = isEditing ? `${getApiBaseUrl()}/api/expenses/${editingDespesa!.id}` : `${getApiBaseUrl()}/api/expenses`;
      const method = isEditing ? 'PUT' : 'POST';

      const payload: Record<string, unknown> = {
        description: formData.descricao.trim(),
        cashAccountId: Number(formData.cashAccountId),
        value: parseCurrencyInput(formData.valor),
      };

      if (formData.accountTypeId) {
        payload.accountTypeId = Number(formData.accountTypeId);
      }
      if (formData.dataDespesa) {
        payload.expenseDate = formData.dataDespesa;
      }

      const response = await fetch(endpoint, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao salvar despesa.');
      }

      toast.success(isEditing ? 'Despesa atualizada com sucesso.' : 'Despesa cadastrada com sucesso.');
      handleCloseDialog();
      await fetchDespesas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar despesa.');
    } finally {
      setIsSaving(false);
    }
  };

  const clearFilters = () => {
    setAccountTypeFiltro('todos');
    setCashAccountFiltro('todas');
    setDataInicioFiltro('');
    setDataFimFiltro('');
  };

  const clearSearchAndFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    clearFilters();
  };

  const hasAdvancedFilters = accountTypeFiltro !== 'todos' || cashAccountFiltro !== 'todas' || Boolean(dataInicioFiltro) || Boolean(dataFimFiltro);

  const sortedDespesas = despesas;
  const totalDespesas = summary.total;
  const ticketMedio = summary.ticketMedio;
  const despesasMes = summary.mesAtual;
  const primeiroRegistro = pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const ultimoRegistro = Math.min(pagination.page * pagination.limit, pagination.total);
  const paginationItems: PaginationItem[] = (() => {
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
  })();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600 dark:text-slate-300">Total de Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-red-600 dark:text-[#e7a0a9]">{totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <p className="text-gray-500 dark:text-slate-400">{summary.quantidade} lançamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600 dark:text-slate-300">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-orange-600 dark:text-[#f9c87b]">{ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <p className="text-gray-500 dark:text-slate-400">por lançamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600 dark:text-slate-300">Despesas no Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-purple-600 dark:text-[#c084fc]">{despesasMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <p className="text-gray-500 dark:text-slate-400">mês atual</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input placeholder="Buscar despesas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100 dark:placeholder:text-slate-400" />
              </div>
              <Button variant="outline" className="sm:w-auto cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100 dark:hover:bg-[#314155]" onClick={() => setShowFilters((prev) => !prev)}>
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </Button>
              {(searchTerm || hasAdvancedFilters) && (
                <Button variant="outline" className="sm:w-auto cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100 dark:hover:bg-[#314155]" onClick={clearSearchAndFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="cursor-pointer disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 dark:bg-[#273447] dark:text-[#8bd8b1] dark:hover:bg-[#314155] dark:border dark:border-[#3b4658]" onClick={openCreateDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Despesa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:border-[#2f394a] dark:bg-[#1f2a37] dark:text-slate-100">
                  <DialogHeader>
                    <DialogTitle>{editingDespesa ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
                    <DialogDescription>
                      {editingDespesa ? 'Altere as informações da despesa' : 'Registre uma nova despesa no sistema'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="col-span-full space-y-2">
                      <Label htmlFor="descricao">Descrição</Label>
                      <Input
                        id="descricao"
                        placeholder="Descrição da despesa"
                        value={formData.descricao}
                        onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contaCaixa">Conta Caixa</Label>
                      <Select value={formData.cashAccountId} onValueChange={(value) => setFormData((prev) => ({ ...prev, cashAccountId: value }))}>
                        <SelectTrigger id="contaCaixa" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                          <SelectValue placeholder="Selecione a conta" />
                        </SelectTrigger>
                        <SelectContent>
                          {cashAccounts.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)} className="cursor-pointer">
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipoConta">Tipo de Conta</Label>
                      <Select value={formData.accountTypeId} onValueChange={(value) => setFormData((prev) => ({ ...prev, accountTypeId: value }))}>
                        <SelectTrigger id="tipoConta" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {accountTypes.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)} className="cursor-pointer">
                              {item.description} {item.category?.description ? `- ${item.category.description}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valor">Valor</Label>
                      <Input
                        id="valor"
                        type="text"
                        inputMode="numeric"
                        placeholder="0,00"
                        value={formData.valor}
                        onChange={(e) => setFormData((prev) => ({ ...prev, valor: formatCurrencyInput(e.target.value) }))}
                        className="dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100 dark:placeholder:text-slate-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dataDespesa">Data da Despesa</Label>
                      <Input
                        id="dataDespesa"
                        type="date"
                        value={formData.dataDespesa}
                        onChange={(e) => setFormData((prev) => ({ ...prev, dataDespesa: e.target.value }))}
                        className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={handleCloseDialog}>
                      Cancelar
                    </Button>
                    <Button className="cursor-pointer disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 dark:bg-[#273447] dark:text-[#8bd8b1] dark:hover:bg-[#314155] dark:border dark:border-[#3b4658]" onClick={saveDespesa} disabled={isSaving}>
                      {isSaving ? 'Salvando...' : editingDespesa ? 'Atualizar' : 'Salvar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t dark:border-[#2f394a]">
              <div className="space-y-2">
                <Label htmlFor="accountTypeFiltro" className="dark:text-slate-300">Tipo de Conta</Label>
                <Select value={accountTypeFiltro} onValueChange={setAccountTypeFiltro}>
                  <SelectTrigger id="accountTypeFiltro" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos" className="cursor-pointer">Todos</SelectItem>
                    {accountTypes.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)} className="cursor-pointer">
                        {item.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cashAccountFiltro" className="dark:text-slate-300">Conta Caixa</Label>
                <Select value={cashAccountFiltro} onValueChange={setCashAccountFiltro}>
                  <SelectTrigger id="cashAccountFiltro" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas" className="cursor-pointer">Todas</SelectItem>
                    {cashAccounts.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)} className="cursor-pointer">
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataInicioFiltro" className="dark:text-slate-300">Data Inicial</Label>
                <Input id="dataInicioFiltro" type="date" value={dataInicioFiltro} onChange={(e) => setDataInicioFiltro(e.target.value)} className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataFimFiltro" className="dark:text-slate-300">Data Final</Label>
                <Input id="dataFimFiltro" type="date" value={dataFimFiltro} onChange={(e) => setDataFimFiltro(e.target.value)} className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-[#243043]">
                  <TableHead className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2c394d]" onClick={() => handleSort('id')}>
                    Código {getSortIcon('id')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2c394d]" onClick={() => handleSort('descricao')}>
                    Descrição {getSortIcon('descricao')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2c394d]" onClick={() => handleSort('tipoConta')}>
                    Tipo Conta {getSortIcon('tipoConta')}
                  </TableHead>
                  <TableHead>Conta Caixa</TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2c394d]" onClick={() => handleSort('valor')}>
                    Valor {getSortIcon('valor')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2c394d]" onClick={() => handleSort('dataDespesa')}>
                    Data {getSortIcon('dataDespesa')}
                  </TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && sortedDespesas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8 dark:text-slate-300">
                      Carregando despesas...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && sortedDespesas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8 dark:text-slate-300">
                      Nenhuma despesa encontrada.
                    </TableCell>
                  </TableRow>
                )}
                {(!isLoading || sortedDespesas.length > 0) &&
                  sortedDespesas.map((despesa) => (
                    <TableRow key={despesa.id} className="dark:hover:bg-[#273447]">
                      <TableCell>{despesa.id}</TableCell>
                      <TableCell>{despesa.descricao || '-'}</TableCell>
                      <TableCell>
                        <Badge className="bg-red-100 text-red-700 dark:bg-[#273447] dark:text-[#a1a1aa]">{despesa.tipoConta}</Badge>
                      </TableCell>
                      <TableCell>{despesa.contaCaixa}</TableCell>
                      <TableCell className="text-red-600 dark:text-[#e7a0a9]">{despesa.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                      <TableCell>{despesa.dataDespesa ? formatDateBR(despesa.dataDespesa) : '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="cursor-pointer disabled:cursor-not-allowed text-gray-600 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-[#314155] dark:hover:text-slate-200" onClick={() => handleViewDetails(despesa)} title="Visualizar">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="cursor-pointer disabled:cursor-not-allowed text-gray-600 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-[#314155] dark:hover:text-slate-200" onClick={() => handleEdit(despesa)} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(despesa.id)} className="cursor-pointer disabled:cursor-not-allowed text-red-600 hover:text-red-700 dark:text-[#e7a0a9] dark:hover:bg-[#314155] dark:hover:text-[#ffb3be]" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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
                <Select value={String(registrosPorPagina)} onValueChange={handleRegistrosPorPaginaChange}>
                  <SelectTrigger className="h-9 w-[84px] cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
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
              <span className="text-center text-sm text-gray-500 md:text-left dark:text-slate-400">
                Mostrando {primeiroRegistro}-{ultimoRegistro} de {pagination.total} registros
              </span>
              {isLoading && sortedDespesas.length > 0 && (
                <span className="hidden items-center gap-1.5 text-sm text-blue-600 dark:text-[#8ab4f8] md:inline-flex">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando...
                </span>
              )}
            </div>

            {isLoading && sortedDespesas.length > 0 && (
              <span className="inline-flex items-center justify-center gap-1.5 text-sm text-blue-600 dark:text-[#8ab4f8] md:hidden">
                <Loader2 className="h-4 w-4 animate-spin" />
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
                    variant={pagination.page === item ? 'default' : 'outline'}
                    size="sm"
                    className={pagination.page === item ? 'cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-[#075985] dark:hover:bg-[#0e7490] dark:text-white' : 'cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]'}
                    onClick={() => handlePageChange(item)}
                    disabled={isLoading}
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
        <DialogContent className="max-w-2xl dark:border-[#2f394a] dark:bg-[#1f2a37] dark:text-slate-100">
          <DialogHeader>
            <DialogTitle>Detalhes da Despesa</DialogTitle>
          </DialogHeader>
          {selectedDespesa && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Código</Label>
                  <p className="text-gray-900 dark:text-slate-100">{selectedDespesa.id}</p>
                </div>
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Conta Caixa</Label>
                  <p className="text-gray-900 dark:text-slate-100">{selectedDespesa.contaCaixa}</p>
                </div>
              </div>
              <div>
                <Label className="text-gray-500 dark:text-slate-300">Descrição</Label>
                <p className="text-gray-900 dark:text-slate-100">{selectedDespesa.descricao || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Tipo de Conta</Label>
                  <p className="text-gray-900 dark:text-slate-100">{selectedDespesa.tipoConta}</p>
                </div>
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Categoria</Label>
                  <p className="text-gray-900 dark:text-slate-100">{selectedDespesa.categoria}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Valor</Label>
                  <p className="text-red-600 dark:text-[#e7a0a9]">{selectedDespesa.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Data da Despesa</Label>
                  <p className="text-gray-900 dark:text-slate-100">{selectedDespesa.dataDespesa ? formatDateBR(selectedDespesa.dataDespesa) : '-'}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={() => setDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
