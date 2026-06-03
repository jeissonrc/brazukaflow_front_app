import { type FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Filter, GitBranch, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Textarea } from './ui/textarea';
import { getAuthToken } from '../lib/auth';
import ConfirmActionDialog from './ConfirmActionDialog';

type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis';

type ApiOrigin = {
  id: number;
  description?: string | null;
  obs?: string | null;
  category?: number | string | null;
  person?: boolean | number | string | null;
  status?: boolean | number | string | null;
};

type Origem = {
  id: number;
  codigo: string;
  nome: string;
  observacao: string;
  natureza: 'Receita' | 'Despesa';
  category: 1 | 2;
  person: boolean;
  tipo: string;
  status: 'Ativo' | 'Inativo';
};

type OriginsPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type OriginsSummary = {
  total: number;
  ativos: number;
  receitas: number;
  despesas: number;
  pessoas: number;
  operacoes: number;
};

type OriginsPaginatedResponse = {
  items: ApiOrigin[];
  pagination: OriginsPagination;
  summary: OriginsSummary;
};

const DEFAULT_PAGINATION: OriginsPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

const DEFAULT_SUMMARY: OriginsSummary = {
  total: 0,
  ativos: 0,
  receitas: 0,
  despesas: 0,
  pessoas: 0,
  operacoes: 0,
};

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || '';
const formatOriginId = (id: number) => `OR-${String(id).padStart(3, '0')}`;
const isActiveStatus = (status: ApiOrigin['status']) => status !== false && status !== 0 && status !== '0' && status !== 'false';
const isTrue = (value: ApiOrigin['person']) => value === true || value === 1 || value === '1' || value === 'true';

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

const clearFieldValidity = (event: FormEvent<HTMLInputElement | HTMLSelectElement>) => {
  event.currentTarget.setCustomValidity('');
};

const setRequiredMessage = (event: FormEvent<HTMLInputElement | HTMLSelectElement>, message: string) => {
  event.currentTarget.setCustomValidity(message);
};

const mapApiOriginToOrigin = (origin: ApiOrigin): Origem => {
  const category = Number(origin.category) === 2 ? 2 : 1;
  const person = isTrue(origin.person);

  return {
    id: origin.id,
    codigo: formatOriginId(origin.id),
    nome: origin.description || '',
    observacao: origin.obs || '',
    natureza: category === 2 ? 'Receita' : 'Despesa',
    category,
    person,
    tipo: person ? (category === 2 ? 'Cliente' : 'Fornecedor') : 'Operação',
    status: isActiveStatus(origin.status) ? 'Ativo' : 'Inativo',
  };
};

const calculateSummary = (items: Origem[]): OriginsSummary =>
  items.reduce(
    (acc, origin) => {
      acc.total += 1;
      if (origin.status === 'Ativo') acc.ativos += 1;
      if (origin.category === 2) acc.receitas += 1;
      if (origin.category === 1) acc.despesas += 1;
      if (origin.person) acc.pessoas += 1;
      if (!origin.person) acc.operacoes += 1;
      return acc;
    },
    { ...DEFAULT_SUMMARY },
  );

export default function OrigensContas() {
  const [origens, setOrigens] = useState<Origem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filtroNatureza, setFiltroNatureza] = useState('Todas');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingOrigem, setEditingOrigem] = useState<Origem | null>(null);
  const [viewingOrigem, setViewingOrigem] = useState<Origem | null>(null);
  const [origemToDelete, setOrigemToDelete] = useState<Origem | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof Origem | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [pagination, setPagination] = useState<OriginsPagination>(DEFAULT_PAGINATION);
  const [summary, setSummary] = useState<OriginsSummary>(DEFAULT_SUMMARY);
  const scrollToPaginationBottomRef = useRef(false);
  const paginationRef = useRef<HTMLDivElement>(null);
  const naturezaRequiredRef = useRef<HTMLSelectElement>(null);
  const tipoRequiredRef = useRef<HTMLSelectElement>(null);
  const [formData, setFormData] = useState({
    nome: '',
    observacao: '',
    category: '1',
    person: 'true',
    status: 'Ativo',
  });

  const fetchOrigens = async () => {
    setIsLoading(true);
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(registrosPorPagina),
    });

    if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
    if (filtroNatureza !== 'Todas') params.set('category', filtroNatureza === 'Receita' ? '2' : '1');
    if (filtroTipo !== 'Todos') params.set('person', filtroTipo === 'Operação' ? 'Operacao' : 'Pessoa');
    if (filtroStatus !== 'Todos') params.set('status', filtroStatus);
    if (sortColumn) {
      const sortMap: Partial<Record<keyof Origem, string>> = {
        codigo: 'codigo',
        nome: 'nome',
        natureza: 'natureza',
        tipo: 'tipo',
        status: 'status',
      };
      params.set('sortBy', sortMap[sortColumn] || String(sortColumn));
      params.set('sortDirection', sortDirection);
    }

    const response = await fetch(`${getApiBaseUrl()}/api/origin-accounts?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao carregar origens.');
    }

    const responseData = result.data as OriginsPaginatedResponse | ApiOrigin[];
    const isLegacyArrayResponse = Array.isArray(responseData);
    const legacyItems = isLegacyArrayResponse ? responseData.map(mapApiOriginToOrigin) : [];
    const legacyFilteredItems = legacyItems.filter((origin) => {
      const matchesSearch =
        !debouncedSearchTerm ||
        origin.codigo.toLowerCase().includes(debouncedSearchTerm) ||
        origin.nome.toLowerCase().includes(debouncedSearchTerm) ||
        origin.observacao.toLowerCase().includes(debouncedSearchTerm);
      const matchesNatureza = filtroNatureza === 'Todas' || origin.natureza === filtroNatureza;
      const matchesTipo = filtroTipo === 'Todos' || origin.tipo === filtroTipo || (filtroTipo === 'Pessoa' && origin.person);
      const matchesStatus = filtroStatus === 'Todos' || origin.status === filtroStatus;

      return matchesSearch && matchesNatureza && matchesTipo && matchesStatus;
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
    const mappedOrigins = isLegacyArrayResponse ? legacyPaginatedItems : apiItems.map(mapApiOriginToOrigin);

    setOrigens(mappedOrigins);
    setPagination(isLegacyArrayResponse ? legacyPagination : responseData?.pagination || DEFAULT_PAGINATION);
    setSummary(isLegacyArrayResponse ? calculateSummary(legacyFilteredItems) : responseData?.summary || DEFAULT_SUMMARY);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchOrigens().catch((error) => {
      setIsLoading(false);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar origens.');
    });
  }, [currentPage, registrosPorPagina, debouncedSearchTerm, filtroNatureza, filtroTipo, filtroStatus, sortColumn, sortDirection]);

  useEffect(() => {
    setCurrentPage(1);
  }, [registrosPorPagina, debouncedSearchTerm, filtroNatureza, filtroTipo, filtroStatus, sortColumn, sortDirection]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim().toLowerCase());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

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
  }, [isLoading, origens]);

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

  const handleSort = (column: keyof Origem) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const showNewestRecordsFirst = () => {
    setSortColumn('id');
    setSortDirection('desc');
    setCurrentPage(1);
  };

  const getSortIcon = (column: keyof Origem) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-1 inline h-4 w-4" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="ml-1 inline h-4 w-4" /> : <ArrowDown className="ml-1 inline h-4 w-4" />;
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setFiltroNatureza('Todas');
    setFiltroTipo('Todos');
    setFiltroStatus('Todos');
    setCurrentPage(1);
  };

  const handleAdd = () => {
    setEditingOrigem(null);
    setFormData({
      nome: '',
      observacao: '',
      category: '1',
      person: 'true',
      status: 'Ativo',
    });
    setDialogOpen(true);
  };

  const handleEdit = (origin: Origem) => {
    setEditingOrigem(origin);
    setFormData({
      nome: origin.nome,
      observacao: origin.observacao,
      category: String(origin.category),
      person: String(origin.person),
      status: origin.status,
    });
    setDialogOpen(true);
  };

  const handleView = (origin: Origem) => {
    setViewingOrigem(origin);
    setViewDialogOpen(true);
  };

  const handleDelete = (origin: Origem) => {
    setOrigemToDelete(origin);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteOrigem = async () => {
    if (!origemToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/origin-accounts/${origemToDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao excluir origem.');
      }

      toast.success('Origem conta excluída com sucesso!');
      setDeleteDialogOpen(false);
      setOrigemToDelete(null);
      await fetchOrigens();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir origem de conta.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!formData.nome.trim() || !formData.category || !formData.person) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    setIsSaving(true);

    try {
      const isEditing = Boolean(editingOrigem);
      const endpoint = isEditing ? `${getApiBaseUrl()}/api/origin-accounts/${editingOrigem!.id}` : `${getApiBaseUrl()}/api/origin-accounts`;
      const method = isEditing ? 'PUT' : 'POST';
      const response = await fetch(endpoint, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          description: formData.nome.trim(),
          obs: formData.observacao.trim() || null,
          category: Number(formData.category),
          person: formData.person === 'true',
          status: formData.status === 'Ativo',
        }),
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao salvar origem de conta.');
      }

      if (!isEditing) {
        showNewestRecordsFirst();
      }

      toast.success(isEditing ? 'Origem conta atualizada com sucesso!' : 'Origem conta cadastrada com sucesso!');
      setDialogOpen(false);
      setEditingOrigem(null);
      await fetchOrigens();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar origem de conta.');
    } finally {
      setIsSaving(false);
    }
  };

  const sortedOrigens = origens;
  const primeiroRegistro = pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const ultimoRegistro = Math.min(pagination.page * pagination.limit, pagination.total);
  const personFilterLabel =
    filtroNatureza === 'Receita'
      ? 'Cliente'
      : filtroNatureza === 'Despesa'
        ? 'Fornecedor'
        : 'Cliente/Fornecedor';
  const selectedPersonLabel = formData.category === '2' ? 'Cliente' : 'Fornecedor';
  const paginationItems: PaginationItem[] = (() => {
    const totalPages = pagination.totalPages;
    const page = pagination.page;

    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
    if (page <= 3) return [1, 2, 3, 4, 'end-ellipsis', totalPages];
    if (page >= totalPages - 2) return [1, 'start-ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, 'start-ellipsis', page - 1, page, page + 1, 'end-ellipsis', totalPages];
  })();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600 dark:text-slate-300">Total de Origens de Contas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-blue-600 dark:text-[#7fb7e8]">{summary.total}</div>
            <p className="text-gray-500 dark:text-slate-400">{summary.ativos} ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600 dark:text-slate-300">Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-green-600 dark:text-[#8bd8b1]">{summary.receitas}</div>
            <p className="text-gray-500 dark:text-slate-400">origens de receitas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600 dark:text-slate-300">Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-red-600 dark:text-[#e7a0a9]">{summary.despesas}</div>
            <p className="text-gray-500 dark:text-slate-400">origens de despesas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-[#273447] dark:text-[#7fb7e8]">
                <GitBranch className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="dark:text-slate-100">Origens de Contas</CardTitle>
                <p className="mt-1 text-gray-500 dark:text-slate-400">Gerencie clientes, fornecedores e operações usados na geração de contas</p>
              </div>
            </div>
            <Button
              className="cursor-pointer bg-green-600 hover:bg-green-700 disabled:cursor-not-allowed dark:border dark:border-[#3b4658] dark:bg-[#273447] dark:text-[#8bd8b1] dark:hover:bg-[#314155]"
              onClick={handleAdd}
            >
              <Plus className="mr-2 h-4 w-4 dark:text-[#8bd8b1]" />
              Nova Origem de Conta
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
                <Input
                  placeholder="Buscar por código, nome ou observação..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10 dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100 dark:placeholder:text-slate-400"
                />
              </div>
              <Button
                variant="outline"
                className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]"
                onClick={() => setShowFilters((prev) => !prev)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filtrar
              </Button>
              {(searchTerm || filtroNatureza !== 'Todas' || filtroTipo !== 'Todos' || filtroStatus !== 'Todos') && (
                <Button
                  variant="outline"
                  className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]"
                  onClick={handleClearFilters}
                >
                  <X className="mr-2 h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 gap-4 border-t pt-4 dark:border-[#2f394a] md:grid-cols-3">
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Natureza</Label>
                <Select value={filtroNatureza} onValueChange={setFiltroNatureza}>
                  <SelectTrigger className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todas" className="cursor-pointer">Todas</SelectItem>
                    <SelectItem value="Receita" className="cursor-pointer">Receita</SelectItem>
                    <SelectItem value="Despesa" className="cursor-pointer">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Tipo</Label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos" className="cursor-pointer">Todos</SelectItem>
                    <SelectItem value="Pessoa" className="cursor-pointer">{personFilterLabel}</SelectItem>
                    <SelectItem value="Operação" className="cursor-pointer">Operação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Status</Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos" className="cursor-pointer">Todos</SelectItem>
                    <SelectItem value="Ativo" className="cursor-pointer">Ativo</SelectItem>
                    <SelectItem value="Inativo" className="cursor-pointer">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="dark:text-slate-100">Lista de Origens de Contas</CardTitle>
          <p className="text-gray-500 dark:text-slate-400">{pagination.total} origem(ns) de conta(s) encontrada(s)</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-[#273447]" onClick={() => handleSort('codigo')}>
                    Código {getSortIcon('codigo')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-[#273447]" onClick={() => handleSort('nome')}>
                    Nome {getSortIcon('nome')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-[#273447]" onClick={() => handleSort('natureza')}>
                    Natureza {getSortIcon('natureza')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-[#273447]" onClick={() => handleSort('tipo')}>
                    Tipo {getSortIcon('tipo')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-[#273447]" onClick={() => handleSort('status')}>
                    Status {getSortIcon('status')}
                  </TableHead>
                  <TableHead className="text-right dark:text-slate-200">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && sortedOrigens.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-gray-500 dark:text-slate-400">
                      Carregando origens...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && sortedOrigens.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-gray-500 dark:text-slate-400">
                      Nenhuma origem de conta encontrada.
                    </TableCell>
                  </TableRow>
                )}
                {(!isLoading || sortedOrigens.length > 0) &&
                  sortedOrigens.map((origin) => (
                    <TableRow key={origin.id} className="dark:hover:bg-[#273447]/70">
                      <TableCell className="font-mono dark:text-slate-200">{origin.codigo}</TableCell>
                      <TableCell className="dark:text-slate-200">{origin.nome}</TableCell>
                      <TableCell>
                        <Badge className={origin.natureza === 'Receita' ? 'bg-green-100 text-green-700 dark:bg-[#273447] dark:text-[#8bd8b1]' : 'bg-red-100 text-red-700 dark:bg-[#273447] dark:text-[#e7a0a9]'}>
                          {origin.natureza}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-slate-300">{origin.tipo}</TableCell>
                      <TableCell>
                        <Badge className={origin.status === 'Ativo' ? 'bg-green-100 text-green-700 dark:bg-[#273447] dark:text-[#8bd8b1]' : 'bg-red-100 text-red-700 dark:bg-[#273447] dark:text-[#e7a0a9]'}>
                          {origin.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleView(origin)} className="cursor-pointer text-gray-600 hover:text-gray-700 disabled:cursor-not-allowed dark:text-slate-400 dark:hover:bg-[#314155] dark:hover:text-slate-200">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(origin)} className="cursor-pointer text-gray-600 hover:text-gray-700 disabled:cursor-not-allowed dark:text-slate-400 dark:hover:bg-[#314155] dark:hover:text-slate-200">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(origin)} className="cursor-pointer text-red-600 hover:text-red-700 disabled:cursor-not-allowed dark:text-[#e7a0a9] dark:hover:bg-[#314155] dark:hover:text-[#ffb3be]">
                            <Trash2 className="h-4 w-4" />
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
              <span className="text-center text-sm text-gray-500 dark:text-slate-400 md:text-left">
                Mostrando {primeiroRegistro}-{ultimoRegistro} de {pagination.total} registros
              </span>
              {isLoading && sortedOrigens.length > 0 && (
                <span className="hidden items-center gap-1.5 text-sm text-blue-600 dark:text-[#7fb7e8] md:inline-flex">
                  <Loader2 className="h-4 w-4 animate-spin dark:text-[#7fb7e8]" />
                  Carregando...
                </span>
              )}
            </div>

            {isLoading && sortedOrigens.length > 0 && (
              <span className="inline-flex items-center justify-center gap-1.5 text-sm text-blue-600 dark:text-[#7fb7e8] md:hidden">
                <Loader2 className="h-4 w-4 animate-spin dark:text-[#7fb7e8]" />
                Carregando...
              </span>
            )}

            <div className="flex w-full max-w-sm items-center justify-center gap-2 md:hidden">
              <Button variant="outline" size="sm" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" disabled={pagination.page <= 1 || isLoading} onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}>
                Anterior
              </Button>
              <span className="text-sm text-gray-600 dark:text-slate-300">Página {pagination.page} de {pagination.totalPages}</span>
              <Button variant="outline" size="sm" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" disabled={pagination.page >= pagination.totalPages || isLoading} onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))}>
                Próxima
              </Button>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <Button variant="outline" size="sm" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" disabled={pagination.page <= 1 || isLoading} onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}>
                Anterior
              </Button>
              {paginationItems.map((item) =>
                typeof item === 'number' ? (
                  <Button key={item} variant={pagination.page === item ? 'default' : 'outline'} size="sm" className={pagination.page === item ? 'cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-[#075985] dark:text-white dark:hover:bg-[#0e7490]' : 'cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]'} onClick={() => handlePageChange(item)} disabled={isLoading}>
                    {item}
                  </Button>
                ) : (
                  <span key={item} className="px-1 text-sm text-gray-500 dark:text-slate-400">...</span>
                ),
              )}
              <Button variant="outline" size="sm" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" disabled={pagination.page >= pagination.totalPages || isLoading} onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))}>
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl dark:border-[#2f394a] dark:bg-[#1f2937] dark:text-slate-100">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="dark:text-slate-100">{editingOrigem ? 'Editar Origem de Conta' : 'Nova Origem de Conta'}</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {editingOrigem ? 'Altere as informações da origem de conta' : 'Preencha os dados para cadastrar uma nova origem de conta'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nomeOrigem" className="dark:text-slate-300">
                  Nome <span className="text-red-600 dark:text-[#e7a0a9]">*</span>
                </Label>
                <Input
                  id="nomeOrigem"
                  required
                  placeholder="Nome da origem de conta"
                  value={formData.nome}
                  onInvalid={(event) => setRequiredMessage(event, 'Informe o nome da origem de conta.')}
                  onInput={clearFieldValidity}
                  onChange={(event) => setFormData((prev) => ({ ...prev, nome: event.target.value }))}
                  className="dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100 dark:placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="naturezaOrigem" className="dark:text-slate-300">
                  Natureza <span className="text-red-600 dark:text-[#e7a0a9]">*</span>
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => {
                    naturezaRequiredRef.current?.setCustomValidity('');
                    setFormData((prev) => ({ ...prev, category: value }));
                  }}
                >
                  <SelectTrigger id="naturezaOrigem" aria-required="true" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1" className="cursor-pointer">Despesa</SelectItem>
                    <SelectItem value="2" className="cursor-pointer">Receita</SelectItem>
                  </SelectContent>
                </Select>
                <select ref={naturezaRequiredRef} required aria-hidden="true" tabIndex={-1} className="sr-only" value={formData.category} onInvalid={(event) => setRequiredMessage(event, 'Selecione a natureza.')} onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}>
                  <option value="">Selecione a natureza</option>
                  <option value="1">Despesa</option>
                  <option value="2">Receita</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipoOrigem" className="dark:text-slate-300">
                  Tipo <span className="text-red-600 dark:text-[#e7a0a9]">*</span>
                </Label>
                <Select
                  value={formData.person}
                  onValueChange={(value) => {
                    tipoRequiredRef.current?.setCustomValidity('');
                    setFormData((prev) => ({ ...prev, person: value }));
                  }}
                >
                  <SelectTrigger id="tipoOrigem" aria-required="true" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true" className="cursor-pointer">{selectedPersonLabel}</SelectItem>
                    <SelectItem value="false" className="cursor-pointer">Operação</SelectItem>
                  </SelectContent>
                </Select>
                <select ref={tipoRequiredRef} required aria-hidden="true" tabIndex={-1} className="sr-only" value={formData.person} onInvalid={(event) => setRequiredMessage(event, 'Selecione o tipo da origem de conta.')} onChange={(event) => setFormData((prev) => ({ ...prev, person: event.target.value }))}>
                  <option value="">Selecione o tipo</option>
                  <option value="true">{selectedPersonLabel}</option>
                  <option value="false">Operação</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="observacaoOrigem" className="dark:text-slate-300">Observações</Label>
                <Textarea
                  id="observacaoOrigem"
                  placeholder="Observações"
                  rows={3}
                  value={formData.observacao}
                  onChange={(event) => setFormData((prev) => ({ ...prev, observacao: event.target.value }))}
                  className="resize-none dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100 dark:placeholder:text-slate-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="statusOrigem"
                  className="cursor-pointer"
                  checked={formData.status === 'Ativo'}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, status: checked ? 'Ativo' : 'Inativo' }))}
                />
                <Label htmlFor="statusOrigem" className="dark:text-slate-300">Ativo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="cursor-pointer bg-green-600 hover:bg-green-700 disabled:cursor-not-allowed dark:border dark:border-[#3b4658] dark:bg-[#273447] dark:text-[#8bd8b1] dark:hover:bg-[#314155]" disabled={isSaving}>
                {isSaving ? 'Salvando...' : editingOrigem ? 'Atualizar' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl dark:border-[#2f394a] dark:bg-[#1f2937] dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Detalhes da Origem de Conta</DialogTitle>
          </DialogHeader>
          {viewingOrigem && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Código</Label>
                  <p className="font-mono dark:text-slate-100">{viewingOrigem.codigo}</p>
                </div>
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Status</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className={viewingOrigem.status === 'Ativo' ? '!border-transparent !bg-green-100 !text-green-700 dark:!border-[#2f394a] dark:!bg-[#273447] dark:!text-[#8bd8b1]' : '!border-transparent !bg-red-100 !text-red-700 dark:!border-[#2f394a] dark:!bg-[#273447] dark:!text-[#e7a0a9]'}>
                      {viewingOrigem.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-gray-500 dark:text-slate-300">Nome</Label>
                <p className="dark:text-slate-100">{viewingOrigem.nome}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Natureza</Label>
                  <div className="mt-1">
                    <Badge className={viewingOrigem.natureza === 'Receita' ? 'bg-green-100 text-green-700 dark:bg-[#273447] dark:text-[#8bd8b1]' : 'bg-red-100 text-red-700 dark:bg-[#273447] dark:text-[#e7a0a9]'}>
                      {viewingOrigem.natureza}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Tipo</Label>
                  <p className="dark:text-slate-100">{viewingOrigem.tipo}</p>
                </div>
              </div>
              <div>
                <Label className="text-gray-500 dark:text-slate-300">Observações</Label>
                <p className="whitespace-pre-wrap dark:text-slate-100">{viewingOrigem.observacao || '-'}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={() => setViewDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={deleteDialogOpen}
        title="Confirmar Exclusão"
        description={`Deseja realmente excluir esta origem de conta?
Esta ação não poderá ser desfeita após sua confirmação.`}
        confirmLabel="Excluir"
        variant="danger"
        isLoading={isDeleting}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setOrigemToDelete(null);
        }}
        onConfirm={confirmDeleteOrigem}
      />
    </div>
  );
}
