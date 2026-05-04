import { useState } from 'react';
import { Plus, Search, Filter, Eye, Pencil, Trash2, FolderTree, Settings, ArrowLeft, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner@2.0.3';

type TipoConta = {
  idTipo: string;
  descricao: string;
  tipo: 'Receita' | 'Despesa';
  especie: string;
  categoria: string;
  idCategoria: string;
  status: 'Ativo' | 'Inativo';
};

const mockCategorias = [
  { id: 'CAT-001', descricao: 'Receitas Operacionais', tipo: 'Receita', especie: 'Operacional' },
  { id: 'CAT-002', descricao: 'Receitas Financeiras', tipo: 'Receita', especie: 'Financeira' },
  { id: 'CAT-003', descricao: 'Outras Receitas', tipo: 'Receita', especie: 'Outras' },
  { id: 'CAT-004', descricao: 'Despesas Operacionais', tipo: 'Despesa', especie: 'Operacional' },
  { id: 'CAT-005', descricao: 'Despesas Administrativas', tipo: 'Despesa', especie: 'Administrativa' },
  { id: 'CAT-006', descricao: 'Impostos e Tributos', tipo: 'Despesa', especie: 'Tributária' },
  { id: 'CAT-007', descricao: 'Despesas Financeiras', tipo: 'Despesa', especie: 'Financeira' },
];

const mockTiposContas: TipoConta[] = [
  { idTipo: 'TC-001', descricao: 'Vendas de Produtos', tipo: 'Receita', especie: 'Operacional', categoria: 'Receitas Operacionais', idCategoria: 'CAT-001', status: 'Ativo' },
  { idTipo: 'TC-002', descricao: 'Prestação de Serviços', tipo: 'Receita', especie: 'Operacional', categoria: 'Receitas Operacionais', idCategoria: 'CAT-001', status: 'Ativo' },
  { idTipo: 'TC-003', descricao: 'Consultoria e Assessoria', tipo: 'Receita', especie: 'Operacional', categoria: 'Receitas Operacionais', idCategoria: 'CAT-001', status: 'Ativo' },
  { idTipo: 'TC-004', descricao: 'Juros Recebidos', tipo: 'Receita', especie: 'Financeira', categoria: 'Receitas Financeiras', idCategoria: 'CAT-002', status: 'Ativo' },
  { idTipo: 'TC-005', descricao: 'Rendimentos de Aplicações', tipo: 'Receita', especie: 'Financeira', categoria: 'Receitas Financeiras', idCategoria: 'CAT-002', status: 'Ativo' },
  { idTipo: 'TC-006', descricao: 'Receitas Eventuais', tipo: 'Receita', especie: 'Outras', categoria: 'Outras Receitas', idCategoria: 'CAT-003', status: 'Ativo' },
  { idTipo: 'TC-007', descricao: 'Salários e Encargos', tipo: 'Despesa', especie: 'Operacional', categoria: 'Despesas Operacionais', idCategoria: 'CAT-004', status: 'Ativo' },
  { idTipo: 'TC-008', descricao: 'Aluguel e Condomínio', tipo: 'Despesa', especie: 'Operacional', categoria: 'Despesas Operacionais', idCategoria: 'CAT-004', status: 'Ativo' },
  { idTipo: 'TC-009', descricao: 'Água, Luz e Telefone', tipo: 'Despesa', especie: 'Operacional', categoria: 'Despesas Operacionais', idCategoria: 'CAT-004', status: 'Ativo' },
  { idTipo: 'TC-010', descricao: 'Material de Escritório', tipo: 'Despesa', especie: 'Operacional', categoria: 'Despesas Operacionais', idCategoria: 'CAT-004', status: 'Ativo' },
  { idTipo: 'TC-011', descricao: 'Honorários Contábeis', tipo: 'Despesa', especie: 'Administrativa', categoria: 'Despesas Administrativas', idCategoria: 'CAT-005', status: 'Ativo' },
  { idTipo: 'TC-012', descricao: 'Honorários Jurídicos', tipo: 'Despesa', especie: 'Administrativa', categoria: 'Despesas Administrativas', idCategoria: 'CAT-005', status: 'Ativo' },
  { idTipo: 'TC-013', descricao: 'Software e Licenças', tipo: 'Despesa', especie: 'Administrativa', categoria: 'Despesas Administrativas', idCategoria: 'CAT-005', status: 'Ativo' },
  { idTipo: 'TC-014', descricao: 'Impostos Federais', tipo: 'Despesa', especie: 'Tributária', categoria: 'Impostos e Tributos', idCategoria: 'CAT-006', status: 'Ativo' },
  { idTipo: 'TC-015', descricao: 'Impostos Estaduais', tipo: 'Despesa', especie: 'Tributária', categoria: 'Impostos e Tributos', idCategoria: 'CAT-006', status: 'Ativo' },
  { idTipo: 'TC-016', descricao: 'Impostos Municipais', tipo: 'Despesa', especie: 'Tributária', categoria: 'Impostos e Tributos', idCategoria: 'CAT-006', status: 'Ativo' },
  { idTipo: 'TC-017', descricao: 'Juros Pagos', tipo: 'Despesa', especie: 'Financeira', categoria: 'Despesas Financeiras', idCategoria: 'CAT-007', status: 'Ativo' },
  { idTipo: 'TC-018', descricao: 'Multas e Encargos', tipo: 'Despesa', especie: 'Financeira', categoria: 'Despesas Financeiras', idCategoria: 'CAT-007', status: 'Inativo' },
];

export default function TiposContas({ onNavigateToCategorias, onBack }: { onNavigateToCategorias: () => void; onBack: () => void }) {
  const [tiposContas, setTiposContas] = useState<TipoConta[]>(mockTiposContas);
  const [filteredTipos, setFilteredTipos] = useState<TipoConta[]>(mockTiposContas);
  
  const [searchTerm, setSearchTerm] = useState('');
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
  
  const [formData, setFormData] = useState({
    idTipo: '',
    descricao: '',
    tipo: 'Receita',
    especie: '',
    idCategoria: '',
  });

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

  const handleSearch = () => {
    let filtered = tiposContas;

    if (searchTerm) {
      filtered = filtered.filter(tipo =>
        tipo.idTipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tipo.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tipo.categoria.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleClearFilters = () => {
    setSearchTerm('');
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
    });
    setDialogOpen(true);
  };

  const handleView = (tipo: TipoConta) => {
    setViewingTipo(tipo);
    setViewDialogOpen(true);
  };

  const handleDelete = (idTipo: string) => {
    if (confirm('Deseja realmente excluir este tipo de conta?')) {
      setTiposContas(tiposContas.filter(t => t.idTipo !== idTipo));
      setFilteredTipos(filteredTipos.filter(t => t.idTipo !== idTipo));
      toast.success('Tipo de conta excluído com sucesso!');
    }
  };

  const handleSave = () => {
    const categoria = mockCategorias.find(c => c.id === formData.idCategoria);
    
    if (editingTipo) {
      // Editar
      const updatedTipos = tiposContas.map(t =>
        t.idTipo === editingTipo.idTipo
          ? {
              ...t,
              descricao: formData.descricao,
              tipo: formData.tipo as 'Receita' | 'Despesa',
              especie: formData.especie || categoria?.especie || '',
              categoria: categoria?.descricao || '',
              idCategoria: formData.idCategoria,
            }
          : t
      );
      setTiposContas(updatedTipos);
      setFilteredTipos(updatedTipos);
      toast.success('Tipo de conta atualizado com sucesso!');
    } else {
      // Adicionar
      const newTipo: TipoConta = {
        idTipo: formData.idTipo || `TC-${String(tiposContas.length + 1).padStart(3, '0')}`,
        descricao: formData.descricao,
        tipo: formData.tipo as 'Receita' | 'Despesa',
        especie: formData.especie || categoria?.especie || '',
        categoria: categoria?.descricao || '',
        idCategoria: formData.idCategoria,
        status: 'Ativo',
      };
      setTiposContas([...tiposContas, newTipo]);
      setFilteredTipos([...tiposContas, newTipo]);
      toast.success('Tipo de conta cadastrado com sucesso!');
    }
    
    setDialogOpen(false);
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
              <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 sm:w-auto">
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </Button>
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
                    {mockCategorias.map(cat => (
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
                {sortedTipos.map((tipo) => (
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
                          onClick={() => handleDelete(tipo.idTipo)}
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
            <div className="space-y-2">
              <Label htmlFor="idTipo">ID Tipo</Label>
              <Input 
                id="idTipo" 
                placeholder="Ex: TC-001" 
                value={formData.idTipo}
                onChange={(e) => setFormData({ ...formData, idTipo: e.target.value })}
                disabled={!!editingTipo}
              />
            </div>
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
                  const cat = mockCategorias.find(c => c.id === value);
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
                  {mockCategorias
                    .filter(cat => cat.tipo === formData.tipo)
                    .map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.id} - {cat.descricao}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700" 
              onClick={handleSave}
              disabled={!formData.descricao || !formData.tipo || !formData.idCategoria}
            >
              {editingTipo ? 'Atualizar' : 'Salvar'}
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