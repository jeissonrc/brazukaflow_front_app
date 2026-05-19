import { useEffect, useState } from 'react';
import { Plus, Search, Filter, Eye, Pencil, Trash2, FolderTree, Settings, ArrowLeft, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || '';

const formatTipoId = (id: number) => `TC-${String(id).padStart(3, '0')}`;
const isActiveStatus = (status: ApiTipoConta['status']) => status !== false && status !== 0 && status !== '0' && status !== 'false';

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
  
  const [sortColumn, setSortColumn] = useState<keyof TipoConta | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
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
      filtered = filtered.filter(tipo => tipo.categoria === filtroCategoria);
    }

    setFilteredTipos(filtered);
  };

  const fetchTiposContas = async () => {
    const response = await fetch(`${getApiBaseUrl()}/api/account-types`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao carregar tipos de contas.');
    }

    const mappedTipos = ((result.data || []) as ApiTipoConta[]).map(mapApiTipoToTipo);
    setTiposContas(mappedTipos);
    applyFilters(mappedTipos);
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
      setIsLoading(true);
      try {
        await Promise.all([fetchCategorias(), fetchTiposContas()]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar dados de tipos de contas.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [debouncedSearchTerm, filtroTipo, filtroStatus, filtroCategoria, tiposContas]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim().toLowerCase());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSort = (column: keyof TipoConta) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: keyof TipoConta) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4 ml-1 inline" /> : 
      <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  const handleSearch = () => applyFilters();

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setFiltroTipo('Todos');
    setFiltroStatus('Todos');
    setFiltroCategoria('Todas');
    setFilteredTipos(tiposContas);
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

  const handleDelete = async (tipo: TipoConta) => {
    if (!confirm('Deseja realmente excluir este tipo de conta?')) {
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/account-types/${tipo.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao excluir tipo de conta.');
      }

      const updatedTipos = tiposContas.filter(t => t.id !== tipo.id);
      setTiposContas(updatedTipos);
      applyFilters(updatedTipos);
      toast.success('Tipo de conta excluído com sucesso!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir tipo de conta.');
    }
  };

  const handleSave = async () => {
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

      toast.success(isEditing ? 'Tipo de conta atualizado com sucesso!' : 'Tipo de conta cadastrado com sucesso!');
      if (isEditing && editingTipo) {
        const updatedTipos = tiposContas.map((tipo) =>
          tipo.id === editingTipo.id
            ? {
                ...tipo,
                descricao: formData.descricao.trim(),
                tipo: formData.tipo as 'Receita' | 'Despesa',
                especie: formData.especie.trim() || categoria?.especie || '',
                categoria: categoria?.descricao || tipo.categoria,
                idCategoria: formData.idCategoria,
                status: nextStatus ? 'Ativo' : 'Inativo',
              }
            : tipo,
        );
        setTiposContas(updatedTipos);
        applyFilters(updatedTipos);
      }
      setDialogOpen(false);
      setEditingTipo(null);
      await fetchTiposContas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar tipo de conta.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalAtivos = filteredTipos.filter(t => t.status === 'Ativo').length;
  const totalReceitas = filteredTipos.filter(t => t.tipo === 'Receita').length;
  const totalDespesas = filteredTipos.filter(t => t.tipo === 'Despesa').length;

  // Aplicar ordenação
  const sortedTipos = [...filteredTipos].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Total de Tipos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-blue-600">
              {filteredTipos.length}
            </div>
            <p className="text-gray-500">{totalAtivos} ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Tipos de Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-green-600">
              {totalReceitas}
            </div>
            <p className="text-gray-500">tipos de receitas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Tipos de Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-red-600">
              {totalDespesas}
            </div>
            <p className="text-gray-500">tipos de despesas</p>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={onBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderTree className="w-5 h-5" />
                  Tipos de Contas
                </CardTitle>
                <p className="text-gray-500 mt-1">
                  Gerencie os tipos de contas para classificação de receitas e despesas
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="bg-blue-50 hover:bg-blue-100 text-blue-600"
                onClick={onNavigateToCategorias}
              >
                <Settings className="w-4 h-4 mr-2" />
                Gerenciar Categorias
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={handleAdd}
              >
                <Plus className="w-4 h-4 mr-2" />
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {(searchTerm || filtroTipo !== 'Todos' || filtroStatus !== 'Todos' || filtroCategoria !== 'Todas') && (
                <Button variant="outline" onClick={handleClearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="Receita">Receita</SelectItem>
                    <SelectItem value="Despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todas">Todas</SelectItem>
                    {categorias.map(cat => (
                      <SelectItem key={cat.id} value={cat.descricao}>
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
          <CardTitle>Lista de Tipos de Contas</CardTitle>
          <p className="text-gray-500">
            {filteredTipos.length} tipo(s) encontrado(s)
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('idTipo')}
                  >
                    ID Tipo {getSortIcon('idTipo')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('descricao')}
                  >
                    Descrição {getSortIcon('descricao')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('tipo')}
                  >
                    Tipo {getSortIcon('tipo')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('especie')}
                  >
                    Espécie {getSortIcon('especie')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('categoria')}
                  >
                    Categoria {getSortIcon('categoria')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('status')}
                  >
                    Status {getSortIcon('status')}
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      Carregando tipos de contas...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && sortedTipos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      Nenhum tipo de conta encontrado.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && sortedTipos.map((tipo) => (
                  <TableRow key={tipo.idTipo}>
                    <TableCell className="font-mono">{tipo.idTipo}</TableCell>
                    <TableCell>{tipo.descricao}</TableCell>
                    <TableCell>
                      <Badge className={tipo.tipo === 'Receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {tipo.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>{tipo.especie}</TableCell>
                    <TableCell>{tipo.categoria}</TableCell>
                    <TableCell>
                      <Badge className={tipo.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {tipo.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleView(tipo)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(tipo)}
                          className="text-gray-600 hover:text-gray-700"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(tipo)}
                          className="text-red-600 hover:text-red-700"
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
        </CardContent>
      </Card>

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTipo ? 'Editar Tipo de Conta' : 'Novo Tipo de Conta'}
            </DialogTitle>
            <DialogDescription>
              {editingTipo 
                ? 'Altere as informações do tipo de conta' 
                : 'Preencha os dados para cadastrar um novo tipo de conta'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {editingTipo && (
              <div className="space-y-2">
                <Label htmlFor="idTipo">ID Tipo</Label>
                <Input
                  id="idTipo"
                  value={formData.idTipo}
                  disabled
                />
              </div>
            )}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input 
                id="descricao" 
                placeholder="Nome descritivo do tipo de conta" 
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select 
                value={formData.tipo} 
                onValueChange={(value) => {
                  setFormData({ ...formData, tipo: value, idCategoria: '', especie: '' });
                }}
              >
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Receita">Receita</SelectItem>
                  <SelectItem value="Despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="especie">Espécie</Label>
              <Input 
                id="especie" 
                placeholder="Ex: Operacional, Financeira" 
                value={formData.especie}
                onChange={(e) => setFormData({ ...formData, especie: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select 
                value={formData.idCategoria} 
                onValueChange={(value) => {
                  const cat = categorias.find(c => c.id === value);
                  setFormData({ 
                    ...formData, 
                    idCategoria: value,
                    especie: cat?.especie || formData.especie
                  });
                }}
              >
                <SelectTrigger id="categoria">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias
                    .filter(cat => cat.tipo === formData.tipo)
                    .map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {`CAT-${String(Number(cat.id)).padStart(3, '0')}`} - {cat.descricao}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="status"
                checked={formData.status === 'Ativo'}
                onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'Ativo' : 'Inativo' })}
              />
              <Label htmlFor="status">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700" 
              onClick={handleSave}
              disabled={isSaving || !formData.descricao || !formData.tipo || !formData.idCategoria}
            >
              {isSaving ? 'Salvando...' : editingTipo ? 'Atualizar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Tipo de Conta</DialogTitle>
          </DialogHeader>
          {viewingTipo && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">ID Tipo</Label>
                  <p className="font-mono">{viewingTipo.idTipo}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <div className="mt-1">
                    <Badge variant={viewingTipo.status === 'Ativo' ? 'default' : 'outline'}>
                      {viewingTipo.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-gray-500">Descrição</Label>
                <p>{viewingTipo.descricao}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Tipo</Label>
                  <div className="mt-1">
                    <Badge className={viewingTipo.tipo === 'Receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {viewingTipo.tipo}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-500">Espécie</Label>
                  <p>{viewingTipo.especie}</p>
                </div>
              </div>
              <div>
                <Label className="text-gray-500">Categoria</Label>
                <p>{viewingTipo.idCategoria} - {viewingTipo.categoria}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
