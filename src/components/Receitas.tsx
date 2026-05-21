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

type Receita = {
  id: number;
  descricao: string;
  tipoConta: string;
  categoria: string;
  contaCaixa: string;
  accountTypeId: number | null;
  cashAccountId: number | null;
  valor: number;
  dataReceita: string;
};

type ReceitaForm = {
  descricao: string;
  accountTypeId: string;
  cashAccountId: string;
  valor: string;
  dataReceita: string;
};

type ReceitasPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ReceitasSummary = {
  total: number;
  quantidade: number;
  ticketMedio: number;
  mesAtual: number;
};

type ReceitasPaginatedResponse = {
  items: ApiIncome[];
  pagination: ReceitasPagination;
  summary: ReceitasSummary;
};

const DEFAULT_FORM: ReceitaForm = {
  descricao: '',
  accountTypeId: '',
  cashAccountId: '',
  valor: '',
  dataReceita: '',
};

const DEFAULT_PAGINATION: ReceitasPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

const DEFAULT_SUMMARY: ReceitasSummary = {
  total: 0,
  quantidade: 0,
  ticketMedio: 0,
  mesAtual: 0,
};

const calculateReceitasSummary = (items: Receita[]): ReceitasSummary => {
  const currentMonth = new Date().getMonth() + 1;
  const summary = items.reduce(
    (acc, receita) => {
      const [, month] = receita.dataReceita.split('-');

      acc.total += receita.valor;
      acc.quantidade += 1;
      if (Number(month) === currentMonth) {
        acc.mesAtual += receita.valor;
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

const mapApiIncomeToReceita = (income: ApiIncome): Receita => ({
  id: income.id,
  descricao: income.description || '',
  tipoConta: income.accountType?.description || '-',
  categoria: income.accountType?.category?.description || '-',
  contaCaixa: income.cashAccount?.name || '-',
  accountTypeId: income.accountTypeId ?? null,
  cashAccountId: income.cashAccountId ?? null,
  valor: Number(income.value || 0),
  dataReceita: normalizeDateInput(income.incomeDate),
});

export default function Receitas() {
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [accountTypeFiltro, setAccountTypeFiltro] = useState('todos');
  const [cashAccountFiltro, setCashAccountFiltro] = useState('todas');
  const [dataInicioFiltro, setDataInicioFiltro] = useState('');
  const [dataFimFiltro, setDataFimFiltro] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedReceita, setSelectedReceita] = useState<Receita | null>(null);
  const [editingReceita, setEditingReceita] = useState<Receita | null>(null);
  const [accountTypes, setAccountTypes] = useState<ApiAccountType[]>([]);
  const [cashAccounts, setCashAccounts] = useState<ApiCashAccount[]>([]);
  const [formData, setFormData] = useState<ReceitaForm>(DEFAULT_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sortColumn, setSortColumn] = useState<keyof Receita | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [pagination, setPagination] = useState<ReceitasPagination>(DEFAULT_PAGINATION);
  const [summary, setSummary] = useState<ReceitasSummary>(DEFAULT_SUMMARY);
  const scrollToPaginationBottomRef = useRef(false);
  const paginationRef = useRef<HTMLDivElement>(null);

  const fetchReceitas = async () => {
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

    const response = await fetch(`${getApiBaseUrl()}/api/incomes?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao carregar receitas.');
    }

    const responseData = result.data as ReceitasPaginatedResponse | ApiIncome[];
    const isLegacyArrayResponse = Array.isArray(responseData);
    const legacyItems = isLegacyArrayResponse ? responseData.map(mapApiIncomeToReceita) : [];
    const legacyFilteredItems = legacyItems.filter((receita) => {
      const matchesSearch =
        !debouncedSearchTerm ||
        receita.descricao.toLowerCase().includes(debouncedSearchTerm) ||
        receita.tipoConta.toLowerCase().includes(debouncedSearchTerm) ||
        receita.categoria.toLowerCase().includes(debouncedSearchTerm) ||
        receita.contaCaixa.toLowerCase().includes(debouncedSearchTerm);
      const matchesAccountType = accountTypeFiltro === 'todos' || String(receita.accountTypeId) === accountTypeFiltro;
      const matchesCashAccount = cashAccountFiltro === 'todas' || String(receita.cashAccountId) === cashAccountFiltro;
      const matchesStartDate = !dataInicioFiltro || (receita.dataReceita && receita.dataReceita >= dataInicioFiltro);
      const matchesEndDate = !dataFimFiltro || (receita.dataReceita && receita.dataReceita <= dataFimFiltro);

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
    const items = isLegacyArrayResponse ? legacyPaginatedItems : apiItems.map(mapApiIncomeToReceita);

    setReceitas(items);
    setPagination(isLegacyArrayResponse ? legacyPagination : responseData?.pagination || DEFAULT_PAGINATION);
    setSummary(isLegacyArrayResponse ? calculateReceitasSummary(legacyFilteredItems) : responseData?.summary || DEFAULT_SUMMARY);
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
      (item) => item.type === 'Receita' && isActiveStatus(item.status),
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
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar módulo de receitas.');
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    fetchReceitas().catch((error) => {
      setIsLoading(false);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar receitas.');
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
  }, [isLoading, receitas]);

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

  const handleSort = (column: keyof Receita) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: keyof Receita) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1 inline" /> : <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  const openCreateDialog = () => {
    setEditingReceita(null);
    setFormData(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const handleEdit = (receita: Receita) => {
    setEditingReceita(receita);
    setFormData({
      descricao: receita.descricao,
      accountTypeId: receita.accountTypeId ? String(receita.accountTypeId) : '',
      cashAccountId: receita.cashAccountId ? String(receita.cashAccountId) : '',
      valor: receita.valor ? formatCurrencyValue(receita.valor) : '',
      dataReceita: receita.dataReceita || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta receita?')) {
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/incomes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao excluir receita.');
      }
      toast.success('Receita excluída com sucesso.');
      await fetchReceitas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir receita.');
    }
  };

  const handleViewDetails = (receita: Receita) => {
    setSelectedReceita(receita);
    setDetailsOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingReceita(null);
    setFormData(DEFAULT_FORM);
  };

  const saveReceita = async () => {
    if (!formData.descricao.trim() || !formData.cashAccountId || !formData.valor.trim()) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    setIsSaving(true);

    try {
      const isEditing = Boolean(editingReceita);
      const endpoint = isEditing ? `${getApiBaseUrl()}/api/incomes/${editingReceita!.id}` : `${getApiBaseUrl()}/api/incomes`;
      const method = isEditing ? 'PUT' : 'POST';

      const payload: Record<string, unknown> = {
        description: formData.descricao.trim(),
        cashAccountId: Number(formData.cashAccountId),
        value: parseCurrencyInput(formData.valor),
      };

      if (formData.accountTypeId) {
        payload.accountTypeId = Number(formData.accountTypeId);
      }
      if (formData.dataReceita) {
        payload.incomeDate = formData.dataReceita;
      }

      const response = await fetch(endpoint, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao salvar receita.');
      }

      toast.success(isEditing ? 'Receita atualizada com sucesso.' : 'Receita cadastrada com sucesso.');
      handleCloseDialog();
      await fetchReceitas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar receita.');
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

  const sortedReceitas = receitas;
  const totalReceitas = summary.total;
  const ticketMedio = summary.ticketMedio;
  const receitasMes = summary.mesAtual;
  const primeiroRegistro = pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const ultimoRegistro = Math.min(pagination.page * pagination.limit, pagination.total);
  const visiblePageWindow = 5;
  const halfVisiblePageWindow = Math.floor(visiblePageWindow / 2);
  const middleStartPage = Math.max(
    1,
    Math.min(
      pagination.page - halfVisiblePageWindow,
      pagination.totalPages - visiblePageWindow + 1,
    ),
  );
  const middleEndPage = Math.min(pagination.totalPages, middleStartPage + visiblePageWindow - 1);
  const paginas = Array.from({ length: Math.max(0, middleEndPage - middleStartPage + 1) }, (_, index) => middleStartPage + index);
  const showFirstPageShortcut = middleStartPage > 1;
  const showLeadingEllipsis = middleStartPage > 2;
  const showTrailingEllipsis = middleEndPage < pagination.totalPages - 1;
  const showLastPageShortcut = middleEndPage < pagination.totalPages;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Total de Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-green-600">{totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <p className="text-gray-500">{summary.quantidade} lançamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-blue-600">{ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <p className="text-gray-500">por lançamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Receitas no Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-purple-600">{receitasMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <p className="text-gray-500">mês atual</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input placeholder="Buscar receitas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Button variant="outline" className="sm:w-auto cursor-pointer" onClick={() => setShowFilters((prev) => !prev)}>
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </Button>
              {(searchTerm || hasAdvancedFilters) && (
                <Button variant="outline" className="sm:w-auto cursor-pointer" onClick={clearSearchAndFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="cursor-pointer disabled:cursor-not-allowed bg-green-600 hover:bg-green-700" onClick={openCreateDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Receita
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingReceita ? 'Editar Receita' : 'Nova Receita'}</DialogTitle>
                    <DialogDescription>
                      {editingReceita ? 'Altere as informações da receita' : 'Registre uma nova receita no sistema'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="col-span-full space-y-2">
                      <Label htmlFor="descricao">Descrição</Label>
                      <Input
                        id="descricao"
                        placeholder="Descrição da receita"
                        value={formData.descricao}
                        onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contaCaixa">Conta Caixa</Label>
                      <Select value={formData.cashAccountId} onValueChange={(value) => setFormData((prev) => ({ ...prev, cashAccountId: value }))}>
                        <SelectTrigger id="contaCaixa" className="cursor-pointer">
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
                        <SelectTrigger id="tipoConta" className="cursor-pointer">
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dataReceita">Data da Receita</Label>
                      <Input
                        id="dataReceita"
                        type="date"
                        value={formData.dataReceita}
                        onChange={(e) => setFormData((prev) => ({ ...prev, dataReceita: e.target.value }))}
                        className="cursor-pointer"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed" onClick={handleCloseDialog}>
                      Cancelar
                    </Button>
                    <Button className="cursor-pointer disabled:cursor-not-allowed bg-green-600 hover:bg-green-700" onClick={saveReceita} disabled={isSaving}>
                      {isSaving ? 'Salvando...' : editingReceita ? 'Atualizar' : 'Salvar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="accountTypeFiltro">Tipo de Conta</Label>
                <Select value={accountTypeFiltro} onValueChange={setAccountTypeFiltro}>
                  <SelectTrigger id="accountTypeFiltro" className="cursor-pointer">
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
                <Label htmlFor="cashAccountFiltro">Conta Caixa</Label>
                <Select value={cashAccountFiltro} onValueChange={setCashAccountFiltro}>
                  <SelectTrigger id="cashAccountFiltro" className="cursor-pointer">
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
                <Label htmlFor="dataInicioFiltro">Data Inicial</Label>
                <Input id="dataInicioFiltro" type="date" value={dataInicioFiltro} onChange={(e) => setDataInicioFiltro(e.target.value)} className="cursor-pointer" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataFimFiltro">Data Final</Label>
                <Input id="dataFimFiltro" type="date" value={dataFimFiltro} onChange={(e) => setDataFimFiltro(e.target.value)} className="cursor-pointer" />
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
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('id')}>
                    Código {getSortIcon('id')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('descricao')}>
                    Descrição {getSortIcon('descricao')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('tipoConta')}>
                    Tipo Conta {getSortIcon('tipoConta')}
                  </TableHead>
                  <TableHead>Conta Caixa</TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('valor')}>
                    Valor {getSortIcon('valor')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('dataReceita')}>
                    Data {getSortIcon('dataReceita')}
                  </TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && sortedReceitas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      Carregando receitas...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && sortedReceitas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      Nenhuma receita encontrada.
                    </TableCell>
                  </TableRow>
                )}
                {(!isLoading || sortedReceitas.length > 0) &&
                  sortedReceitas.map((receita) => (
                    <TableRow key={receita.id}>
                      <TableCell>{receita.id}</TableCell>
                      <TableCell>{receita.descricao || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{receita.tipoConta}</Badge>
                      </TableCell>
                      <TableCell>{receita.contaCaixa}</TableCell>
                      <TableCell className="text-green-600">{receita.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                      <TableCell>{receita.dataReceita ? formatDateBR(receita.dataReceita) : '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="cursor-pointer disabled:cursor-not-allowed" onClick={() => handleViewDetails(receita)} title="Visualizar">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="cursor-pointer disabled:cursor-not-allowed" onClick={() => handleEdit(receita)} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(receita.id)} className="cursor-pointer disabled:cursor-not-allowed text-red-600 hover:text-red-700" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          <div ref={paginationRef} className="mt-4 flex flex-col items-center gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col items-center gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Registros por página</span>
                <Select value={String(registrosPorPagina)} onValueChange={handleRegistrosPorPaginaChange}>
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
              <span className="text-center text-sm text-gray-500 md:text-left">
                Mostrando {primeiroRegistro}-{ultimoRegistro} de {pagination.total} registros
              </span>
              {isLoading && sortedReceitas.length > 0 && (
                <span className="hidden items-center gap-1.5 text-sm text-blue-600 md:inline-flex">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando...
                </span>
              )}
            </div>

            {isLoading && sortedReceitas.length > 0 && (
              <span className="inline-flex items-center justify-center gap-1.5 text-sm text-blue-600 md:hidden">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </span>
            )}

            <div className="flex w-full max-w-sm items-center justify-center gap-2 md:hidden">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer disabled:cursor-not-allowed"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-600">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer disabled:cursor-not-allowed"
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
                className="cursor-pointer disabled:cursor-not-allowed"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
              >
                Anterior
              </Button>
              {showFirstPageShortcut && (
                <Button
                  variant={pagination.page === 1 ? 'default' : 'outline'}
                  size="sm"
                  className={pagination.page === 1 ? 'cursor-pointer bg-blue-600 hover:bg-blue-700' : 'cursor-pointer'}
                  onClick={() => handlePageChange(1)}
                  disabled={isLoading}
                >
                  1
                </Button>
              )}
              {showLeadingEllipsis && <span className="px-1 text-sm text-gray-500">...</span>}
              {paginas.map((page) => (
                <Button
                  key={page}
                  variant={pagination.page === page ? 'default' : 'outline'}
                  size="sm"
                  className={pagination.page === page ? 'cursor-pointer bg-blue-600 hover:bg-blue-700' : 'cursor-pointer'}
                  onClick={() => handlePageChange(page)}
                  disabled={isLoading}
                >
                  {page}
                </Button>
              ))}
              {showTrailingEllipsis && <span className="px-1 text-sm text-gray-500">...</span>}
              {showLastPageShortcut && (
                <Button
                  variant={pagination.page === pagination.totalPages ? 'default' : 'outline'}
                  size="sm"
                  className={pagination.page === pagination.totalPages ? 'cursor-pointer bg-blue-600 hover:bg-blue-700' : 'cursor-pointer'}
                  onClick={() => handlePageChange(pagination.totalPages)}
                  disabled={isLoading}
                >
                  {pagination.totalPages}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer disabled:cursor-not-allowed"
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Receita</DialogTitle>
          </DialogHeader>
          {selectedReceita && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Código</Label>
                  <p className="text-gray-900">{selectedReceita.id}</p>
                </div>
                <div>
                  <Label>Conta Caixa</Label>
                  <p className="text-gray-900">{selectedReceita.contaCaixa}</p>
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <p className="text-gray-900">{selectedReceita.descricao || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Conta</Label>
                  <p className="text-gray-900">{selectedReceita.tipoConta}</p>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <p className="text-gray-900">{selectedReceita.categoria}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor</Label>
                  <p className="text-gray-900 text-green-600">{selectedReceita.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div>
                  <Label>Data da Receita</Label>
                  <p className="text-gray-900">{selectedReceita.dataReceita ? formatDateBR(selectedReceita.dataReceita) : '-'}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed" onClick={() => setDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
