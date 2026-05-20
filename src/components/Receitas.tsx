import { useEffect, useState } from 'react';
import { Plus, Search, Filter, Download, Pencil, Trash2, Eye, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
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

const DEFAULT_FORM: ReceitaForm = {
  descricao: '',
  accountTypeId: '',
  cashAccountId: '',
  valor: '',
  dataReceita: '',
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

  const fetchReceitas = async () => {
    const response = await fetch(`${getApiBaseUrl()}/api/incomes`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao carregar receitas.');
    }

    const items = ((result.data || []) as ApiIncome[]).map(mapApiIncomeToReceita);
    setReceitas(items);
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
      setIsLoading(true);
      try {
        await Promise.all([fetchReceitas(), fetchAccountTypes(), fetchCashAccounts()]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar módulo de receitas.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim().toLowerCase());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

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
      setReceitas((prev) => prev.filter((item) => item.id !== id));
      toast.success('Receita excluída com sucesso.');
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

  const filteredReceitas = receitas.filter((receita) => {
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

  const sortedReceitas = [...filteredReceitas].sort((a, b) => {
    if (!sortColumn) return 0;
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalReceitas = receitas.reduce((acc, r) => acc + r.valor, 0);
  const ticketMedio = receitas.length ? totalReceitas / receitas.length : 0;
  const receitasMes = receitas
    .filter((r) => {
      const [, month] = r.dataReceita.split('-');
      return Number(month) === new Date().getMonth() + 1;
    })
    .reduce((acc, r) => acc + r.valor, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Total de Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-green-600">{totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <p className="text-gray-500">{receitas.length} lançamentos</p>
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
              <Button variant="outline" className="sm:w-auto disabled:cursor-not-allowed" disabled>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
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
        <CardContent className="pt-6 overflow-x-auto">
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
              {isLoading && (
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
              {!isLoading &&
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
