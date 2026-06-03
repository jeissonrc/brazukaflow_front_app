import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Plus, Search, Filter, Eye, Pencil, Trash2, FolderTree, Settings, ArrowLeft, X, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Switch } from './ui/switch';
import { toast } from 'sonner@2.0.3';
import { getAuthToken } from '../lib/auth';
import ConfirmActionDialog from './ConfirmActionDialog';

type ApiCategoria = {
  id: number;
  description: string;
  type: 'Receita' | 'Despesa';
  specie?: string | null;
  status?: boolean | number;
};

type ApiTipoConta = {
  id: number;
  description: string;
  type: 'Receita' | 'Despesa';
  specie?: string | null;
  status?: boolean | number | string | null;
  categoryId: number;
  category?: ApiCategoria;
};

type Categoria = {
  id: string;
  descricao: string;
  tipo: 'Receita' | 'Despesa';
  especie: string;
};

type TipoConta = {
  id: number;
  idTipo: string;
  descricao: string;
  tipo: 'Receita' | 'Despesa';
  especie: string;
  categoria: string;
  idCategoria: string;
  status: 'Ativo' | 'Inativo';
};

type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis';

type TiposContasPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type TiposContasSummary = {
  total: number;
  ativos: number;
  receitas: number;
  despesas: number;
};

type TiposContasPaginatedResponse = {
  items: ApiTipoConta[];
  pagination: TiposContasPagination;
  summary: TiposContasSummary;
};

const DEFAULT_PAGINATION: TiposContasPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

const DEFAULT_SUMMARY: TiposContasSummary = {
  total: 0,
  ativos: 0,
  receitas: 0,
  despesas: 0,
};

const calculateTiposSummary = (items: TipoConta[]): TiposContasSummary =>
  items.reduce(
    (acc, tipo) => {
      acc.total += 1;
      if (tipo.status === 'Ativo') acc.ativos += 1;
      if (tipo.tipo === 'Receita') acc.receitas += 1;
      if (tipo.tipo === 'Despesa') acc.despesas += 1;
      return acc;
    },
    { total: 0, ativos: 0, receitas: 0, despesas: 0 },
  );

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || '';

const formatTipoId = (id: number) => `TC-${String(id).padStart(3, '0')}`;
const isActiveStatus = (status: ApiTipoConta['status']) => status !== false && status !== 0 && status !== '0' && status !== 'false';
const clearFieldValidity = (event: FormEvent<HTMLInputElement | HTMLSelectElement>) => {
  event.currentTarget.setCustomValidity('');
};

const setRequiredMessage = (event: FormEvent<HTMLInputElement | HTMLSelectElement>, message: string) => {
  event.currentTarget.setCustomValidity(message);
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

const mapApiCategoriaToCategoria = (categoria: ApiCategoria): Categoria => ({
  id: String(categoria.id),
  descricao: categoria.description,
  tipo: categoria.type,
  especie: categoria.specie || '',
});

const mapApiTipoToTipo = (tipo: ApiTipoConta): TipoConta => ({
  id: tipo.id,
  idTipo: formatTipoId(tipo.id),
  descricao: tipo.description,
  tipo: tipo.type,
  especie: tipo.specie || tipo.category?.specie || '',
  categoria: tipo.category?.description || '',
  idCategoria: String(tipo.categoryId),
  status: isActiveStatus(tipo.status) ? 'Ativo' : 'Inativo',
});

export default function TiposContas({ onNavigateToCategorias, onBack }: { onNavigateToCategorias: () => void; onBack: () => void }) {
  const [tiposContas, setTiposContas] = useState<TipoConta[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filteredTipos, setFilteredTipos] = useState<TipoConta[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoConta | null>(null);
  const [viewingTipo, setViewingTipo] = useState<TipoConta | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tipoToDelete, setTipoToDelete] = useState<TipoConta | null>(null);
  
  const [sortColumn, setSortColumn] = useState<keyof TipoConta | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [pagination, setPagination] = useState<TiposContasPagination>(DEFAULT_PAGINATION);
  const [summary, setSummary] = useState<TiposContasSummary>(DEFAULT_SUMMARY);
  const scrollToPaginationBottomRef = useRef(false);
  const paginationRef = useRef<HTMLDivElement>(null);
  const tipoRequiredRef = useRef<HTMLSelectElement>(null);
  const categoriaRequiredRef = useRef<HTMLSelectElement>(null);
  
  const [formData, setFormData] = useState({
    idTipo: '',
    descricao: '',
    tipo: 'Receita',
    especie: '',
    idCategoria: '',
    status: 'Ativo',
  });

  const applyFilters = (source = tiposContas) => {
    let filtered = source;

    if (debouncedSearchTerm) {
      filtered = filtered.filter(tipo =>
        tipo.idTipo.toLowerCase().includes(debouncedSearchTerm) ||
        tipo.descricao.toLowerCase().includes(debouncedSearchTerm) ||
        tipo.categoria.toLowerCase().includes(debouncedSearchTerm)
      );
    }

    if (filtroTipo !== 'Todos') {
      filtered = filtered.filter(tipo => tipo.tipo === filtroTipo);
    }

    if (filtroStatus !== 'Todos') {
      filtered = filtered.filter(tipo => tipo.status === filtroStatus);
    }

    if (filtroCategoria !== 'Todas') {
      filtered = filtered.filter(tipo => tipo.idCategoria === filtroCategoria);
    }

    setFilteredTipos(filtered);
  };

  const fetchTiposContas = async () => {
    setIsLoading(true);
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(registrosPorPagina),
    });

    if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
    if (filtroTipo !== 'Todos') params.set('type', filtroTipo);
    if (filtroStatus !== 'Todos') params.set('status', filtroStatus);
    if (filtroCategoria !== 'Todas') params.set('categoryId', filtroCategoria);
    if (sortColumn) {
      params.set('sortBy', String(sortColumn));
      params.set('sortDirection', sortDirection);
    }

    const response = await fetch(`${getApiBaseUrl()}/api/account-types?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao carregar tipos de contas.');
    }

    const responseData = result.data as TiposContasPaginatedResponse | ApiTipoConta[];
    const isLegacyArrayResponse = Array.isArray(responseData);
    const legacyItems = isLegacyArrayResponse ? responseData.map(mapApiTipoToTipo) : [];
    const legacyFilteredItems = legacyItems.filter((tipo) => {
      const matchesSearch =
        !debouncedSearchTerm ||
        tipo.idTipo.toLowerCase().includes(debouncedSearchTerm) ||
        tipo.descricao.toLowerCase().includes(debouncedSearchTerm) ||
        tipo.especie.toLowerCase().includes(debouncedSearchTerm) ||
        tipo.categoria.toLowerCase().includes(debouncedSearchTerm);
      const matchesTipo = filtroTipo === 'Todos' || tipo.tipo === filtroTipo;
      const matchesStatus = filtroStatus === 'Todos' || tipo.status === filtroStatus;
      const matchesCategoria = filtroCategoria === 'Todas' || tipo.idCategoria === filtroCategoria;

      return matchesSearch && matchesTipo && matchesStatus && matchesCategoria;
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
    const mappedTipos = isLegacyArrayResponse ? legacyPaginatedItems : apiItems.map(mapApiTipoToTipo);

    setTiposContas(mappedTipos);
    setFilteredTipos(mappedTipos);
    setPagination(isLegacyArrayResponse ? legacyPagination : responseData?.pagination || DEFAULT_PAGINATION);
    setSummary(isLegacyArrayResponse ? calculateTiposSummary(legacyFilteredItems) : responseData?.summary || DEFAULT_SUMMARY);
    setIsLoading(false);
  };

  const fetchCategorias = async () => {
    const response = await fetch(`${getApiBaseUrl()}/api/category-types`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao carregar categorias.');
    }

    const mappedCategorias = ((result.data || []) as ApiCategoria[])
      .filter((categoria) => categoria.status !== false && categoria.status !== 0)
      .map(mapApiCategoriaToCategoria);
    setCategorias(mappedCategorias);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await fetchCategorias();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar dados de tipos de contas.');
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    fetchTiposContas().catch((error) => {
      setIsLoading(false);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar tipos de contas.');
    });
  }, [
    currentPage,
    registrosPorPagina,
    debouncedSearchTerm,
    filtroTipo,
    filtroStatus,
    filtroCategoria,
    sortColumn,
    sortDirection,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    registrosPorPagina,
    debouncedSearchTerm,
    filtroTipo,
    filtroStatus,
    filtroCategoria,
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
  }, [isLoading, filteredTipos]);

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

  const handleSort = (column: keyof TipoConta) => {
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

  const getSortIcon = (column: keyof TipoConta) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4 ml-1 inline" /> : 
      <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  const handleSearch = () => setCurrentPage(1);

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setFiltroTipo('Todos');
    setFiltroStatus('Todos');
    setFiltroCategoria('Todas');
    setCurrentPage(1);
  };

  const handleAdd = () => {
    setEditingTipo(null);
    setFormData({
      idTipo: '',
      descricao: '',
      tipo: 'Receita',
      especie: '',
      idCategoria: '',
      status: 'Ativo',
    });
    setDialogOpen(true);
  };

  const handleEdit = (tipo: TipoConta) => {
    setEditingTipo(tipo);
    setFormData({
      idTipo: tipo.idTipo,
      descricao: tipo.descricao,
      tipo: tipo.tipo,
      especie: tipo.especie,
      idCategoria: tipo.idCategoria,
      status: tipo.status,
    });
    setDialogOpen(true);
  };

  const handleView = (tipo: TipoConta) => {
    setViewingTipo(tipo);
    setViewDialogOpen(true);
  };

  const handleDelete = (tipo: TipoConta) => {
    setTipoToDelete(tipo);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTipo = async () => {
    if (!tipoToDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/account-types/${tipoToDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao excluir tipo de conta.');
      }

      toast.success('Tipo de conta excluído com sucesso!');
      setDeleteDialogOpen(false);
      setTipoToDelete(null);
      await fetchTiposContas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir tipo de conta.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const categoria = categorias.find(c => c.id === formData.idCategoria);
    if (!formData.descricao.trim() || !formData.tipo || !formData.idCategoria) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    
    setIsSaving(true);

    try {
      const isEditing = Boolean(editingTipo);
      const endpoint = isEditing ? `${getApiBaseUrl()}/api/account-types/${editingTipo!.id}` : `${getApiBaseUrl()}/api/account-types`;
      const method = isEditing ? 'PUT' : 'POST';
      const nextStatus = formData.status === 'Ativo';

      const response = await fetch(endpoint, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          description: formData.descricao.trim(),
          type: formData.tipo,
          specie: formData.especie.trim() || categoria?.especie || null,
          categoryId: Number(formData.idCategoria),
          status: nextStatus,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao salvar tipo de conta.');
      }

      if (!isEditing) {
        showNewestRecordsFirst();
      }

      toast.success(isEditing ? 'Tipo de conta atualizado com sucesso!' : 'Tipo de conta cadastrado com sucesso!');
      setDialogOpen(false);
      setEditingTipo(null);
      await fetchTiposContas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar tipo de conta.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalAtivos = summary.ativos;
  const totalReceitas = summary.receitas;
  const totalDespesas = summary.despesas;
  const sortedTipos = filteredTipos;
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
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Total de Tipos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-blue-600 dark:text-[#7fb7e8]">
              {summary.total}
            </div>
            <p className="text-gray-500 dark:text-slate-400">{totalAtivos} ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Tipos de Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-green-600 dark:text-[#8bd8b1]">
              {totalReceitas}
            </div>
            <p className="text-gray-500 dark:text-slate-400">tipos de receitas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Tipos de Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-red-600 dark:text-[#e7a0a9]">
              {totalDespesas}
            </div>
            <p className="text-gray-500 dark:text-slate-400">tipos de despesas</p>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <Card>
        <CardHeader className="py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={onBack}
                className="cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2 dark:text-slate-100">
                  <FolderTree className="w-5 h-5" />
                  Tipos de Contas
                </CardTitle>
                <p className="text-gray-500 mt-1 dark:text-slate-400">
                  Gerencie os tipos de contas para classificação de receitas e despesas
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="cursor-pointer disabled:cursor-not-allowed bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-[#273447] dark:text-[#7fb7e8] dark:border dark:border-[#3b4658] dark:hover:bg-[#314155]"
                onClick={onNavigateToCategorias}
              >
                <Settings className="w-4 h-4 mr-2" />
                Gerenciar Categorias
              </Button>
              <Button 
                className="cursor-pointer disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 dark:bg-[#273447] dark:text-[#8bd8b1] dark:hover:bg-[#314155] dark:border dark:border-[#3b4658]"
                onClick={handleAdd}
              >
                <Plus className="w-4 h-4 mr-2 dark:text-[#8bd8b1]" />
                Novo Tipo
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Busca e Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 dark:text-slate-400" />
                <Input
                  placeholder="Buscar por ID, descrição ou categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button
                variant="outline"
                className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </Button>
              {(searchTerm || filtroTipo !== 'Todos' || filtroStatus !== 'Todos' || filtroCategoria !== 'Todas') && (
                <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={handleClearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t dark:border-[#2f394a]">
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Tipo</Label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos" className="cursor-pointer">Todos</SelectItem>
                    <SelectItem value="Receita" className="cursor-pointer">Receita</SelectItem>
                    <SelectItem value="Despesa" className="cursor-pointer">Despesa</SelectItem>
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

              <div className="space-y-2">
                <Label className="dark:text-slate-300">Categoria</Label>
                <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                  <SelectTrigger className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todas" className="cursor-pointer">Todas</SelectItem>
                    {categorias.map(cat => (
                      <SelectItem key={cat.id} value={cat.id} className="cursor-pointer">
                        {cat.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Tipos de Contas */}
      <Card>
        <CardHeader>
          <CardTitle className="dark:text-slate-100">Lista de Tipos de Contas</CardTitle>
          <p className="text-gray-500 dark:text-slate-400">
            {pagination.total} tipo(s) encontrado(s)
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#273447] dark:text-slate-200"
                    onClick={() => handleSort('idTipo')}
                  >
                    ID Tipo {getSortIcon('idTipo')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#273447] dark:text-slate-200"
                    onClick={() => handleSort('descricao')}
                  >
                    Descrição {getSortIcon('descricao')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#273447] dark:text-slate-200"
                    onClick={() => handleSort('tipo')}
                  >
                    Tipo {getSortIcon('tipo')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#273447] dark:text-slate-200"
                    onClick={() => handleSort('especie')}
                  >
                    Espécie {getSortIcon('especie')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#273447] dark:text-slate-200"
                    onClick={() => handleSort('categoria')}
                  >
                    Categoria {getSortIcon('categoria')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#273447] dark:text-slate-200"
                    onClick={() => handleSort('status')}
                  >
                    Status {getSortIcon('status')}
                  </TableHead>
                  <TableHead className="text-right dark:text-slate-200">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && sortedTipos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8 dark:text-slate-400">
                      Carregando tipos de contas...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && sortedTipos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8 dark:text-slate-400">
                      Nenhum tipo de conta encontrado.
                    </TableCell>
                  </TableRow>
                )}
                {(!isLoading || sortedTipos.length > 0) && sortedTipos.map((tipo) => (
                  <TableRow key={tipo.idTipo} className="dark:hover:bg-[#273447]/70">
                    <TableCell className="font-mono dark:text-slate-200">{tipo.idTipo}</TableCell>
                    <TableCell className="dark:text-slate-200">{tipo.descricao}</TableCell>
                    <TableCell>
                      <Badge className={tipo.tipo === 'Receita' ? 'bg-green-100 text-green-700 dark:bg-[#273447] dark:text-[#8bd8b1]' : 'bg-red-100 text-red-700 dark:bg-[#273447] dark:text-[#e7a0a9]'}>
                        {tipo.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="dark:text-slate-300">{tipo.especie}</TableCell>
                    <TableCell className="dark:text-slate-300">{tipo.categoria}</TableCell>
                    <TableCell>
                      <Badge className={tipo.status === 'Ativo' ? 'bg-green-100 text-green-700 dark:bg-[#273447] dark:text-[#8bd8b1]' : 'bg-red-100 text-red-700 dark:bg-[#273447] dark:text-[#e7a0a9]'}>
                        {tipo.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleView(tipo)}
                          className="cursor-pointer disabled:cursor-not-allowed text-gray-600 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-[#314155] dark:hover:text-slate-200"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(tipo)}
                          className="cursor-pointer disabled:cursor-not-allowed text-gray-600 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-[#314155] dark:hover:text-slate-200"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(tipo)}
                          className="cursor-pointer disabled:cursor-not-allowed text-red-600 hover:text-red-700 dark:text-[#e7a0a9] dark:hover:bg-[#314155] dark:hover:text-[#ffb3be]"
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
                className="cursor-pointer disabled:cursor-not-allowed"
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

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl dark:border-[#2f394a] dark:bg-[#1f2937] dark:text-slate-100">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="dark:text-slate-100">
                {editingTipo ? 'Editar Tipo de Conta' : 'Novo Tipo de Conta'}
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {editingTipo 
                  ? 'Altere as informações do tipo de conta' 
                  : 'Preencha os dados para cadastrar um novo tipo de conta'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              {editingTipo && (
                <div className="space-y-2">
                  <Label htmlFor="idTipo" className="dark:text-slate-300">ID Tipo</Label>
                  <Input
                    id="idTipo"
                    value={formData.idTipo}
                    disabled
                    className="dark:bg-[#273447] dark:border-[#3b4658] dark:text-slate-100"
                  />
                </div>
              )}
              <div className="space-y-2 col-span-2">
                <Label htmlFor="descricao" className="dark:text-slate-300">
                  Descrição <span className="text-red-600 dark:text-[#e7a0a9]">*</span>
                </Label>
                <Input 
                  id="descricao" 
                  required
                  placeholder="Nome descritivo do tipo de conta" 
                  value={formData.descricao}
                  onInvalid={(e) => setRequiredMessage(e, 'Informe a descrição do tipo de conta.')}
                  onInput={clearFieldValidity}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="dark:bg-[#273447] dark:border-[#3b4658] dark:text-slate-100 dark:placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo" className="dark:text-slate-300">
                  Tipo <span className="text-red-600 dark:text-[#e7a0a9]">*</span>
                </Label>
                <Select 
                  value={formData.tipo} 
                  onValueChange={(value) => {
                    tipoRequiredRef.current?.setCustomValidity('');
                    setFormData({ ...formData, tipo: value, idCategoria: '', especie: '' });
                  }}
                >
                  <SelectTrigger id="tipo" aria-required="true" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Receita" className="cursor-pointer">Receita</SelectItem>
                    <SelectItem value="Despesa" className="cursor-pointer">Despesa</SelectItem>
                  </SelectContent>
                </Select>
                <select
                  ref={tipoRequiredRef}
                  required
                  aria-hidden="true"
                  tabIndex={-1}
                  className="sr-only"
                  value={formData.tipo}
                  onInvalid={(e) => setRequiredMessage(e, 'Selecione o tipo.')}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value, idCategoria: '', especie: '' })}
                >
                  <option value="">Selecione o tipo</option>
                  <option value="Receita">Receita</option>
                  <option value="Despesa">Despesa</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="especie" className="dark:text-slate-300">Espécie</Label>
                <Input 
                  id="especie" 
                  placeholder="Ex: Operacional, Financeira" 
                  value={formData.especie}
                  onChange={(e) => setFormData({ ...formData, especie: e.target.value })}
                  className="dark:bg-[#273447] dark:border-[#3b4658] dark:text-slate-100 dark:placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="categoria" className="dark:text-slate-300">
                  Categoria <span className="text-red-600 dark:text-[#e7a0a9]">*</span>
                </Label>
                <Select 
                  value={formData.idCategoria} 
                  onValueChange={(value) => {
                    const cat = categorias.find(c => c.id === value);
                    categoriaRequiredRef.current?.setCustomValidity('');
                    setFormData({ 
                      ...formData, 
                      idCategoria: value,
                      especie: cat?.especie || formData.especie
                    });
                  }}
                >
                  <SelectTrigger id="categoria" aria-required="true" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias
                      .filter(cat => cat.tipo === formData.tipo)
                      .map(cat => (
                        <SelectItem key={cat.id} value={cat.id} className="cursor-pointer">
                          {`CAT-${String(Number(cat.id)).padStart(3, '0')}`} - {cat.descricao}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <select
                  ref={categoriaRequiredRef}
                  required
                  aria-hidden="true"
                  tabIndex={-1}
                  className="sr-only"
                  value={formData.idCategoria}
                  onInvalid={(e) => setRequiredMessage(e, 'Selecione a categoria.')}
                  onChange={(e) => setFormData({ ...formData, idCategoria: e.target.value })}
                >
                  <option value="">Selecione uma categoria</option>
                  {categorias
                    .filter(cat => cat.tipo === formData.tipo)
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {`CAT-${String(Number(cat.id)).padStart(3, '0')}`} - {cat.descricao}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="status"
                  className="cursor-pointer"
                  checked={formData.status === 'Ativo'}
                  onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'Ativo' : 'Inativo' })}
                />
                <Label htmlFor="status" className="dark:text-slate-300">Ativo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit"
                className="cursor-pointer disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 dark:bg-[#273447] dark:text-[#8bd8b1] dark:hover:bg-[#314155] dark:border dark:border-[#3b4658]" 
                disabled={isSaving}
              >
                {isSaving ? 'Salvando...' : editingTipo ? 'Atualizar' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl dark:border-[#2f394a] dark:bg-[#1f2937] dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Detalhes do Tipo de Conta</DialogTitle>
          </DialogHeader>
          {viewingTipo && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">ID Tipo</Label>
                  <p className="font-mono dark:text-slate-100">{viewingTipo.idTipo}</p>
                </div>
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Status</Label>
                  <div className="mt-1">
                    <Badge
                      variant="outline"
                      className={viewingTipo.status === 'Ativo'
                        ? '!border-transparent !bg-green-100 !text-green-700 dark:!border-[#2f394a] dark:!bg-[#273447] dark:!text-[#8bd8b1]'
                        : '!border-transparent !bg-red-100 !text-red-700 dark:!border-[#2f394a] dark:!bg-[#273447] dark:!text-[#e7a0a9]'}
                    >
                      {viewingTipo.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-gray-500 dark:text-slate-300">Descrição</Label>
                <p className="dark:text-slate-100">{viewingTipo.descricao}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Tipo</Label>
                  <div className="mt-1">
                    <Badge className={viewingTipo.tipo === 'Receita' ? 'bg-green-100 text-green-700 dark:bg-[#273447] dark:text-[#8bd8b1]' : 'bg-red-100 text-red-700 dark:bg-[#273447] dark:text-[#e7a0a9]'}>
                      {viewingTipo.tipo}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Espécie</Label>
                  <p className="dark:text-slate-100">{viewingTipo.especie}</p>
                </div>
              </div>
              <div>
                <Label className="text-gray-500 dark:text-slate-300">Categoria</Label>
                <p className="dark:text-slate-100">{viewingTipo.idCategoria} - {viewingTipo.categoria}</p>
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
        description={`Deseja realmente excluir este tipo de conta?\nEsta ação não poderá ser desfeita após sua confirmação.`}
        confirmLabel="Excluir"
        variant="danger"
        isLoading={isDeleting}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setTipoToDelete(null);
          }
        }}
        onConfirm={confirmDeleteTipo}
      />
    </div>
  );
}
