import { useEffect, useRef, useState } from 'react';
import { Search, CreditCard, CheckCircle, XCircle, Plus, Pencil, Trash2, Eye, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getAuthToken } from '../lib/auth';

type ApiTipoPagamento = {
  id: number;
  name: string;
  description?: string | null;
  status: boolean | number;
};

type TipoPagamento = {
  id: number;
  nome: string;
  descricao?: string;
  ativo: boolean;
};

type TipoPagamentoForm = {
  nome: string;
  descricao: string;
  ativo: boolean;
};

type TiposPagamentoPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type TiposPagamentoSummary = {
  total: number;
  ativos: number;
  inativos: number;
};

type TiposPagamentoPaginatedResponse = {
  items: ApiTipoPagamento[];
  pagination: TiposPagamentoPagination;
  summary: TiposPagamentoSummary;
};

const DEFAULT_FORM: TipoPagamentoForm = {
  nome: '',
  descricao: '',
  ativo: true,
};

const DEFAULT_PAGINATION: TiposPagamentoPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

const DEFAULT_SUMMARY: TiposPagamentoSummary = {
  total: 0,
  ativos: 0,
  inativos: 0,
};

const calculateTiposSummary = (items: TipoPagamento[]): TiposPagamentoSummary =>
  items.reduce(
    (acc, tipo) => {
      acc.total += 1;
      if (tipo.ativo) {
        acc.ativos += 1;
      } else {
        acc.inativos += 1;
      }
      return acc;
    },
    { total: 0, ativos: 0, inativos: 0 },
  );

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || '';

const mapApiTipoToTipo = (tipo: ApiTipoPagamento): TipoPagamento => ({
  id: tipo.id,
  nome: tipo.name,
  descricao: tipo.description || '',
  ativo: Boolean(tipo.status),
});

export default function TiposPagamento() {
  const [tiposPagamento, setTiposPagamento] = useState<TipoPagamento[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<TipoPagamento | null>(null);
  const [editingTipo, setEditingTipo] = useState<TipoPagamento | null>(null);
  const [formData, setFormData] = useState<TipoPagamentoForm>(DEFAULT_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sortColumn, setSortColumn] = useState<keyof TipoPagamento | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [pagination, setPagination] = useState<TiposPagamentoPagination>(DEFAULT_PAGINATION);
  const [summary, setSummary] = useState<TiposPagamentoSummary>(DEFAULT_SUMMARY);
  const scrollToPaginationBottomRef = useRef(false);
  const paginationRef = useRef<HTMLDivElement>(null);

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

  const fetchTiposPagamento = async () => {
    setIsLoading(true);
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(registrosPorPagina),
    });

    if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
    if (sortColumn) {
      params.set('sortBy', String(sortColumn));
      params.set('sortDirection', sortDirection);
    }

    const response = await fetch(`${getApiBaseUrl()}/api/payment-types?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao carregar tipos de pagamento.');
    }

    const responseData = result.data as TiposPagamentoPaginatedResponse | ApiTipoPagamento[];
    const isLegacyArrayResponse = Array.isArray(responseData);
    const legacyItems = isLegacyArrayResponse ? responseData.map(mapApiTipoToTipo) : [];
    const legacyFilteredItems = legacyItems.filter((tipo) =>
      !debouncedSearchTerm ||
      tipo.nome.toLowerCase().includes(debouncedSearchTerm) ||
      tipo.descricao?.toLowerCase().includes(debouncedSearchTerm)
    );
    const legacySortedItems = [...legacyFilteredItems].sort((a, b) => {
      if (!sortColumn) return 0;

      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (bValue === undefined) return sortDirection === 'asc' ? -1 : 1;

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
    const mappedTipos = isLegacyArrayResponse ? legacyPaginatedItems : apiItems.map(mapApiTipoToTipo);

    setTiposPagamento(mappedTipos);
    setPagination(isLegacyArrayResponse ? legacyPagination : responseData?.pagination || DEFAULT_PAGINATION);
    setSummary(isLegacyArrayResponse ? calculateTiposSummary(legacyFilteredItems) : responseData?.summary || DEFAULT_SUMMARY);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTiposPagamento().catch((error) => {
      setIsLoading(false);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar tipos de pagamento.');
    });
  }, [currentPage, registrosPorPagina, debouncedSearchTerm, sortColumn, sortDirection]);

  useEffect(() => {
    setCurrentPage(1);
  }, [registrosPorPagina, debouncedSearchTerm, sortColumn, sortDirection]);

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
  }, [isLoading, tiposPagamento]);

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

  const handleSort = (column: keyof TipoPagamento) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: keyof TipoPagamento) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4 ml-1 inline" /> : 
      <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  const openCreateDialog = () => {
    setEditingTipo(null);
    setFormData(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const handleEdit = (tipo: TipoPagamento) => {
    setEditingTipo(tipo);
    setFormData({
      nome: tipo.nome,
      descricao: tipo.descricao || '',
      ativo: tipo.ativo,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este tipo de pagamento?')) {
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/payment-types/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao excluir tipo de pagamento.');
      }

      toast.success('Tipo de pagamento excluído com sucesso.');
      await fetchTiposPagamento();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir tipo de pagamento.');
    }
  };

  const handleViewDetails = (tipo: TipoPagamento) => {
    setSelectedTipo(tipo);
    setDetailsOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTipo(null);
    setFormData(DEFAULT_FORM);
  };

  const countLinkedAccounts = async (paymentTypeId: number) => {
    const [payableResponse, receivableResponse] = await Promise.all([
      fetch(`${getApiBaseUrl()}/api/accounts-payable?page=1&limit=1&paymentTypeId=${paymentTypeId}`, {
        headers: getAuthHeaders(),
      }),
      fetch(`${getApiBaseUrl()}/api/accounts-receivable?page=1&limit=1&paymentTypeId=${paymentTypeId}`, {
        headers: getAuthHeaders(),
      }),
    ]);

    const payableResult = await payableResponse.json();
    const receivableResult = await receivableResponse.json();

    if (!payableResponse.ok || !payableResult?.success) {
      throw new Error(payableResult?.error || 'Erro ao verificar vínculos em contas a pagar.');
    }

    if (!receivableResponse.ok || !receivableResult?.success) {
      throw new Error(receivableResult?.error || 'Erro ao verificar vínculos em contas a receber.');
    }

    const payableData = payableResult.data;
    const receivableData = receivableResult.data;
    const payableCount = Array.isArray(payableData) ? payableData.length : Number(payableData?.pagination?.total || 0);
    const receivableCount = Array.isArray(receivableData) ? receivableData.length : Number(receivableData?.pagination?.total || 0);

    return { payableCount, receivableCount, total: payableCount + receivableCount };
  };

  const saveTipoPagamento = async () => {
    if (!formData.nome.trim()) {
      toast.error('Preencha o nome do tipo de pagamento.');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        name: formData.nome.trim(),
        description: formData.descricao.trim() || null,
        status: formData.ativo,
      };

      const isEditing = Boolean(editingTipo);
      const endpoint = isEditing ? `${getApiBaseUrl()}/api/payment-types/${editingTipo!.id}` : `${getApiBaseUrl()}/api/payment-types`;
      const method = isEditing ? 'PUT' : 'POST';

      if (isEditing && editingTipo!.ativo && !formData.ativo) {
        const usage = await countLinkedAccounts(editingTipo!.id);
        if (usage.total > 0) {
          const details = [
            usage.payableCount > 0 ? `${usage.payableCount} conta(s) a pagar` : null,
            usage.receivableCount > 0 ? `${usage.receivableCount} conta(s) a receber` : null,
          ].filter(Boolean).join(' e ');

          throw new Error(`Este tipo de pagamento está vinculado a ${details} e não pode ser inativado.`);
        }
      }

      const response = await fetch(endpoint, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao salvar tipo de pagamento.');
      }

      toast.success(isEditing ? 'Tipo de pagamento atualizado com sucesso.' : 'Tipo de pagamento criado com sucesso.');
      handleCloseDialog();
      await fetchTiposPagamento();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar tipo de pagamento.');
    } finally {
      setIsSaving(false);
    }
  };

  const sortedTipos = tiposPagamento;
  const totalAtivos = summary.ativos;
  const totalInativo = summary.inativos;
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
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Total de Tipos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-blue-600 dark:text-[#7fb7e8]">
              {summary.total}
            </div>
            <p className="text-gray-500">tipos de pagamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-green-600 dark:text-[#8bd8b1]">
              {totalAtivos}
            </div>
            <p className="text-gray-500">tipos ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Inativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-red-600 dark:text-[#e7a0a9]">
              {totalInativo}
            </div>
            <p className="text-gray-500">tipos inativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Busca e Ações */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar tipos de pagamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="cursor-pointer disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 dark:bg-[#273447] dark:text-[#8bd8b1] dark:hover:bg-[#314155] dark:border dark:border-[#3b4658]" onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 mr-2 dark:text-[#8bd8b1]" />
                  Novo Tipo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl dark:border-[#2f394a] dark:bg-[#1f2937] dark:text-slate-100">
                <DialogHeader>
                  <DialogTitle className="dark:text-slate-100">{editingTipo ? 'Editar Tipo de Pagamento' : 'Novo Tipo de Pagamento'}</DialogTitle>
                  <DialogDescription className="dark:text-slate-400">
                    {editingTipo ? 'Altere as informações do tipo de pagamento' : 'Cadastre um novo tipo de pagamento no sistema'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome" className="dark:text-slate-300">Nome</Label>
                    <Input 
                      id="nome" 
                      placeholder="Ex: Boleto Bancário" 
                      value={formData.nome}
                      onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                      className="dark:bg-[#273447] dark:border-[#3b4658] dark:text-slate-100 dark:placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descricao" className="dark:text-slate-300">Descrição</Label>
                    <Input 
                      id="descricao" 
                      placeholder="Descrição opcional" 
                      value={formData.descricao}
                      onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
                      className="dark:bg-[#273447] dark:border-[#3b4658] dark:text-slate-100 dark:placeholder:text-slate-400"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="ativo"
                      className="cursor-pointer"
                      checked={formData.ativo}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, ativo: checked }))}
                    />
                    <Label htmlFor="ativo" className={formData.ativo ? 'text-green-700 dark:text-[#8bd8b1]' : 'text-gray-600 dark:text-slate-300'}>
                      {formData.ativo ? 'Ativo' : 'Inativo'}
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button className="cursor-pointer disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 dark:bg-[#273447] dark:text-[#8bd8b1] dark:hover:bg-[#314155] dark:border dark:border-[#3b4658]" onClick={saveTipoPagamento} disabled={isSaving}>
                    {isSaving ? 'Salvando...' : editingTipo ? 'Atualizar' : 'Salvar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-slate-100">
            <CreditCard className="w-5 h-5" />
            Tipos de Pagamento
          </CardTitle>
          <p className="text-gray-500 mt-1 dark:text-slate-400">
            Gerencie os tipos de pagamento disponíveis no sistema
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#273447] dark:text-slate-200"
                    onClick={() => handleSort('id')}
                  >
                    ID {getSortIcon('id')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#273447] dark:text-slate-200"
                    onClick={() => handleSort('nome')}
                  >
                    Nome {getSortIcon('nome')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#273447] dark:text-slate-200"
                    onClick={() => handleSort('descricao')}
                  >
                    Descrição {getSortIcon('descricao')}
                  </TableHead>
                  <TableHead className="dark:text-slate-200">Status</TableHead>
                  <TableHead className="dark:text-slate-200">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && sortedTipos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8 dark:text-slate-400">
                      Carregando tipos de pagamento...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && sortedTipos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8 dark:text-slate-400">
                      Nenhum tipo de pagamento encontrado.
                    </TableCell>
                  </TableRow>
                )}
                {(!isLoading || sortedTipos.length > 0) && sortedTipos.map((tipo) => (
                  <TableRow key={tipo.id} className="dark:hover:bg-[#273447]/70">
                    <TableCell className="dark:text-slate-200">{tipo.id}</TableCell>
                    <TableCell className="dark:text-slate-200">{tipo.nome}</TableCell>
                    <TableCell className="max-w-xs truncate dark:text-slate-300">
                      {tipo.descricao || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {tipo.ativo ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-[#273447] dark:text-[#8bd8b1]">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700 dark:bg-[#273447] dark:text-zinc-400">
                            <XCircle className="w-3 h-3 mr-1" />
                            Inativo
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="cursor-pointer disabled:cursor-not-allowed dark:text-slate-400 dark:hover:bg-[#314155] dark:hover:text-slate-200"
                          onClick={() => handleViewDetails(tipo)}
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="cursor-pointer disabled:cursor-not-allowed dark:text-slate-400 dark:hover:bg-[#314155] dark:hover:text-slate-200"
                          onClick={() => handleEdit(tipo)}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(tipo.id)}
                          className="cursor-pointer disabled:cursor-not-allowed text-red-600 hover:text-red-700 dark:text-[#e7a0a9] dark:hover:bg-[#314155] dark:hover:text-[#ffb3be]"
                          title="Excluir"
                        >
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
              <span className="text-center text-sm text-gray-500 dark:text-slate-400 md:text-left">
                Mostrando {primeiroRegistro}-{ultimoRegistro} de {pagination.total} registros
              </span>
              {isLoading && sortedTipos.length > 0 && (
                <span className="hidden items-center gap-1.5 text-sm text-blue-600 dark:text-[#7fb7e8] md:inline-flex">
                  <Loader2 className="h-4 w-4 animate-spin dark:text-[#7fb7e8]" />
                  Carregando...
                </span>
              )}
            </div>

            {isLoading && sortedTipos.length > 0 && (
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
              {showFirstPageShortcut && (
                <Button
                  variant={pagination.page === 1 ? 'default' : 'outline'}
                  size="sm"
                  className={pagination.page === 1 ? 'cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-[#075985] dark:hover:bg-[#0e7490] dark:text-white' : 'cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]'}
                  onClick={() => handlePageChange(1)}
                  disabled={isLoading}
                >
                  1
                </Button>
              )}
              {showLeadingEllipsis && <span className="px-1 text-sm text-gray-500 dark:text-slate-400">...</span>}
              {paginas.map((pagina) => (
                <Button
                  key={pagina}
                  variant={pagina === pagination.page ? 'default' : 'outline'}
                  size="sm"
                  className={pagina === pagination.page ? 'cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-[#075985] dark:hover:bg-[#0e7490] dark:text-white' : 'cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]'}
                  onClick={() => handlePageChange(pagina)}
                  disabled={isLoading}
                >
                  {pagina}
                </Button>
              ))}
              {showTrailingEllipsis && <span className="px-1 text-sm text-gray-500 dark:text-slate-400">...</span>}
              {showLastPageShortcut && (
                <Button
                  variant={pagination.page === pagination.totalPages ? 'default' : 'outline'}
                  size="sm"
                  className={pagination.page === pagination.totalPages ? 'cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-[#075985] dark:hover:bg-[#0e7490] dark:text-white' : 'cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]'}
                  onClick={() => handlePageChange(pagination.totalPages)}
                  disabled={isLoading}
                >
                  {pagination.totalPages}
                </Button>
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

      {/* Dialog de Detalhes */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-xl dark:border-[#2f394a] dark:bg-[#1f2937] dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Detalhes do Tipo de Pagamento</DialogTitle>
          </DialogHeader>
          {selectedTipo && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="dark:text-slate-300">ID</Label>
                  <p className="text-gray-900 dark:text-slate-100">{selectedTipo.id}</p>
                </div>
                <div>
                  <Label className="dark:text-slate-300">Status</Label>
                  <div className="mt-1">
                    {selectedTipo.ativo ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-[#273447] dark:text-[#8bd8b1]">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ativo
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700 dark:bg-[#273447] dark:text-zinc-400">
                        <XCircle className="w-3 h-3 mr-1" />
                        Inativo
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <Label className="dark:text-slate-300">Nome</Label>
                <p className="text-gray-900 dark:text-slate-100">{selectedTipo.nome}</p>
              </div>
              <div>
                <Label className="dark:text-slate-300">Descrição</Label>
                <p className="text-gray-900 dark:text-slate-100">{selectedTipo.descricao || '-'}</p>
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
