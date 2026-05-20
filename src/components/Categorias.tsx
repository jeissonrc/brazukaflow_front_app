import { useEffect, useState } from 'react';
import { Plus, Search, Filter, Eye, Pencil, Trash2, Folder, ArrowLeft, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
  status?: boolean | number | string | null;
};

type Categoria = {
  id: number;
  idCategoria: string;
  descricao: string;
  tipo: 'Receita' | 'Despesa';
  especie: string;
  status: 'Ativo' | 'Inativo';
};

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || '';
const formatCategoriaId = (id: number) => `CAT-${String(id).padStart(3, '0')}`;
const isActiveStatus = (status: ApiCategoria['status']) => status !== false && status !== 0 && status !== '0' && status !== 'false';

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
  id: categoria.id,
  idCategoria: formatCategoriaId(categoria.id),
  descricao: categoria.description,
  tipo: categoria.type,
  especie: categoria.specie || '',
  status: isActiveStatus(categoria.status) ? 'Ativo' : 'Inativo',
});

export default function Categorias({ onBack }: { onBack: () => void }) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filteredCategorias, setFilteredCategorias] = useState<Categoria[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [filtroEspecie, setFiltroEspecie] = useState('Todas');
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [viewingCategoria, setViewingCategoria] = useState<Categoria | null>(null);
  
  const [sortColumn, setSortColumn] = useState<keyof Categoria | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    idCategoria: '',
    descricao: '',
    tipo: 'Receita',
    especie: '',
    status: 'Ativo',
  });

  const applyFilters = (source = categorias) => {
    let filtered = source;

    if (debouncedSearchTerm) {
      filtered = filtered.filter(cat =>
        cat.idCategoria.toLowerCase().includes(debouncedSearchTerm) ||
        cat.descricao.toLowerCase().includes(debouncedSearchTerm) ||
        cat.especie.toLowerCase().includes(debouncedSearchTerm)
      );
    }

    if (filtroTipo !== 'Todos') {
      filtered = filtered.filter(cat => cat.tipo === filtroTipo);
    }

    if (filtroStatus !== 'Todos') {
      filtered = filtered.filter(cat => cat.status === filtroStatus);
    }

    if (filtroEspecie !== 'Todas') {
      filtered = filtered.filter(cat => cat.especie === filtroEspecie);
    }

    setFilteredCategorias(filtered);
  };

  const fetchCategorias = async () => {
    const response = await fetch(`${getApiBaseUrl()}/api/category-types`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao carregar categorias.');
    }

    const mappedCategorias = ((result.data || []) as ApiCategoria[]).map(mapApiCategoriaToCategoria);
    setCategorias(mappedCategorias);
    applyFilters(mappedCategorias);
  };

  useEffect(() => {
    const loadCategorias = async () => {
      setIsLoading(true);
      try {
        await fetchCategorias();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar categorias.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCategorias();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [debouncedSearchTerm, filtroTipo, filtroStatus, filtroEspecie, categorias]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim().toLowerCase());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSort = (column: keyof Categoria) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: keyof Categoria) => {
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
    setFiltroEspecie('Todas');
    setFilteredCategorias(categorias);
  };

  const handleAdd = () => {
    setEditingCategoria(null);
    setFormData({
      idCategoria: '',
      descricao: '',
      tipo: 'Receita',
      especie: '',
      status: 'Ativo',
    });
    setDialogOpen(true);
  };

  const handleEdit = (categoria: Categoria) => {
    setEditingCategoria(categoria);
    setFormData({
      idCategoria: categoria.idCategoria,
      descricao: categoria.descricao,
      tipo: categoria.tipo,
      especie: categoria.especie,
      status: categoria.status,
    });
    setDialogOpen(true);
  };

  const handleView = (categoria: Categoria) => {
    setViewingCategoria(categoria);
    setViewDialogOpen(true);
  };

  const handleDelete = async (categoria: Categoria) => {
    if (!confirm('Deseja realmente excluir esta categoria?')) {
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/category-types/${categoria.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao excluir categoria.');
      }

      const updatedCategorias = categorias.filter(c => c.id !== categoria.id);
      setCategorias(updatedCategorias);
      applyFilters(updatedCategorias);
      toast.success('Categoria excluída com sucesso!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir categoria.');
    }
  };

  const handleSave = async () => {
    if (!formData.descricao.trim() || !formData.tipo || !formData.especie.trim()) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    setIsSaving(true);

    try {
      const isEditing = Boolean(editingCategoria);
      const endpoint = isEditing ? `${getApiBaseUrl()}/api/category-types/${editingCategoria!.id}` : `${getApiBaseUrl()}/api/category-types`;
      const method = isEditing ? 'PUT' : 'POST';
      const nextStatus = formData.status === 'Ativo';

      const response = await fetch(endpoint, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          description: formData.descricao.trim(),
          type: formData.tipo,
          specie: formData.especie.trim(),
          status: nextStatus,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao salvar categoria.');
      }

      toast.success(isEditing ? 'Categoria atualizada com sucesso!' : 'Categoria cadastrada com sucesso!');
      setDialogOpen(false);
      setEditingCategoria(null);
      await fetchCategorias();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar categoria.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalAtivas = filteredCategorias.filter(c => c.status === 'Ativo').length;
  const totalReceitas = filteredCategorias.filter(c => c.tipo === 'Receita').length;
  const totalDespesas = filteredCategorias.filter(c => c.tipo === 'Despesa').length;

  // Aplicar ordenação
  const sortedCategorias = [...filteredCategorias].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const especies = Array.from(new Set(categorias.map(c => c.especie)));

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Total de Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-blue-600">
              {filteredCategorias.length}
            </div>
            <p className="text-gray-500">{totalAtivas} ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Categorias de Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-green-600">
              {totalReceitas}
            </div>
            <p className="text-gray-500">categorias de receitas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Categorias de Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-red-600">
              {totalDespesas}
            </div>
            <p className="text-gray-500">categorias de despesas</p>
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
                className="cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Folder className="w-5 h-5" />
                  Categorias
                </CardTitle>
                <p className="text-gray-500 mt-1">
                  Gerencie as categorias para organizar os tipos de contas
                </p>
              </div>
            </div>
            <Button 
              className="cursor-pointer disabled:cursor-not-allowed bg-green-600 hover:bg-green-700"
              onClick={handleAdd}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Categoria
            </Button>
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
                  placeholder="Buscar por ID, descrição ou espécie..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button
                variant="outline"
                className="cursor-pointer disabled:cursor-not-allowed"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {(searchTerm || filtroTipo !== 'Todos' || filtroStatus !== 'Todos' || filtroEspecie !== 'Todas') && (
                <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed" onClick={handleClearFilters}>
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
                  <SelectTrigger className="cursor-pointer">
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
                <Label>Status</Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="cursor-pointer">
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
                <Label>Espécie</Label>
                <Select value={filtroEspecie} onValueChange={setFiltroEspecie}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todas" className="cursor-pointer">Todas</SelectItem>
                    {especies.map(esp => (
                      <SelectItem key={esp} value={esp} className="cursor-pointer">
                        {esp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Categorias */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Categorias</CardTitle>
          <p className="text-gray-500">
            {filteredCategorias.length} categoria(s) encontrada(s)
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('idCategoria')}
                  >
                    ID Categoria {getSortIcon('idCategoria')}
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
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      Carregando categorias...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && sortedCategorias.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      Nenhuma categoria encontrada.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && sortedCategorias.map((categoria) => (
                  <TableRow key={categoria.idCategoria}>
                    <TableCell className="font-mono">{categoria.idCategoria}</TableCell>
                    <TableCell>{categoria.descricao}</TableCell>
                    <TableCell>
                      <Badge className={categoria.tipo === 'Receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {categoria.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>{categoria.especie}</TableCell>
                    <TableCell>
                      <Badge className={categoria.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {categoria.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleView(categoria)}
                          className="cursor-pointer disabled:cursor-not-allowed text-blue-600 hover:text-blue-700"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(categoria)}
                          className="cursor-pointer disabled:cursor-not-allowed text-gray-600 hover:text-gray-700"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(categoria)}
                          className="cursor-pointer disabled:cursor-not-allowed text-red-600 hover:text-red-700"
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
              {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
            <DialogDescription>
              {editingCategoria 
                ? 'Altere as informações da categoria' 
                : 'Preencha os dados para cadastrar uma nova categoria'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {editingCategoria && (
              <div className="space-y-2">
                <Label htmlFor="idCategoria">ID Categoria</Label>
                <Input
                  id="idCategoria"
                  value={formData.idCategoria}
                  disabled
                />
              </div>
            )}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input 
                id="descricao" 
                placeholder="Nome descritivo da categoria" 
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select 
                value={formData.tipo} 
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger id="tipo" className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Receita" className="cursor-pointer">Receita</SelectItem>
                  <SelectItem value="Despesa" className="cursor-pointer">Despesa</SelectItem>
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
            <div className="flex items-center gap-2">
              <Switch
                id="status"
                className="cursor-pointer"
                checked={formData.status === 'Ativo'}
                onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'Ativo' : 'Inativo' })}
              />
              <Label htmlFor="status">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="cursor-pointer disabled:cursor-not-allowed bg-green-600 hover:bg-green-700" 
              onClick={handleSave}
              disabled={isSaving || !formData.descricao || !formData.tipo || !formData.especie}
            >
              {isSaving ? 'Salvando...' : editingCategoria ? 'Atualizar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Categoria</DialogTitle>
          </DialogHeader>
          {viewingCategoria && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">ID Categoria</Label>
                  <p className="font-mono">{viewingCategoria.idCategoria}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <div className="mt-1">
                    <Badge variant={viewingCategoria.status === 'Ativo' ? 'default' : 'outline'}>
                      {viewingCategoria.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-gray-500">Descrição</Label>
                <p>{viewingCategoria.descricao}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Tipo</Label>
                  <div className="mt-1">
                    <Badge className={viewingCategoria.tipo === 'Receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {viewingCategoria.tipo}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-500">Espécie</Label>
                  <p>{viewingCategoria.especie}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed" onClick={() => setViewDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
