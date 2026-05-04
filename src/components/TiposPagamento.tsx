import { useState } from 'react';
import { Search, CreditCard, CheckCircle, XCircle, Plus, Pencil, Trash2, Eye, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Switch } from './ui/switch';

type TipoPagamento = {
  id: number;
  nome: string;
  descricao?: string;
  ativo: boolean;
};

const mockTiposPagamento: TipoPagamento[] = [
  { id: 1, nome: 'Pix', descricao: 'Pagamento via Pix', ativo: true },
  { id: 2, nome: 'Cartão de Crédito', descricao: 'Pagamento com cartão de crédito', ativo: true },
  { id: 3, nome: 'Título', descricao: 'Pagamento via título bancário', ativo: true },
  { id: 4, nome: 'Dinheiro', descricao: 'Pagamento em dinheiro', ativo: true },
  { id: 5, nome: 'Depósito', descricao: 'Depósito bancário', ativo: true },
  { id: 6, nome: 'Cheque', descricao: 'Pagamento em cheque', ativo: true },
];

export default function TiposPagamento() {
  const [tiposPagamento, setTiposPagamento] = useState<TipoPagamento[]>(mockTiposPagamento);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<TipoPagamento | null>(null);
  const [editingTipo, setEditingTipo] = useState<TipoPagamento | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof TipoPagamento | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  const handleToggleAtivo = (id: number) => {
    setTiposPagamento(tiposPagamento.map(tp => 
      tp.id === id ? { ...tp, ativo: !tp.ativo } : tp
    ));
  };

  const handleEdit = (tipo: TipoPagamento) => {
    setEditingTipo(tipo);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este tipo de pagamento?')) {
      setTiposPagamento(tiposPagamento.filter(t => t.id !== id));
    }
  };

  const handleViewDetails = (tipo: TipoPagamento) => {
    setSelectedTipo(tipo);
    setDetailsOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTipo(null);
  };

  const filteredTipos = tiposPagamento.filter(tp =>
    tp.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tp.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Aplicar ordenação
  const sortedTipos = [...filteredTipos].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    
    // Para campos opcionais como descricao
    if (aValue === undefined && bValue === undefined) return 0;
    if (aValue === undefined) return sortDirection === 'asc' ? 1 : -1;
    if (bValue === undefined) return sortDirection === 'asc' ? -1 : 1;
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalAtivos = tiposPagamento.filter(tp => tp.ativo).length;
  const totalInativo = tiposPagamento.filter(tp => !tp.ativo).length;

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Total de Tipos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-blue-600">
              {tiposPagamento.length}
            </div>
            <p className="text-gray-500">tipos de pagamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-green-600">
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
            <div className="text-red-600">
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
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Tipo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>{editingTipo ? 'Editar Tipo de Pagamento' : 'Novo Tipo de Pagamento'}</DialogTitle>
                  <DialogDescription>
                    {editingTipo ? 'Altere as informações do tipo de pagamento' : 'Cadastre um novo tipo de pagamento no sistema'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome</Label>
                    <Input 
                      id="nome" 
                      placeholder="Ex: Boleto Bancário" 
                      defaultValue={editingTipo?.nome}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Input 
                      id="descricao" 
                      placeholder="Descrição opcional" 
                      defaultValue={editingTipo?.descricao}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="ativo" defaultChecked={editingTipo?.ativo ?? true} />
                    <Label htmlFor="ativo">Tipo ativo</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={handleCloseDialog}>
                    {editingTipo ? 'Atualizar' : 'Salvar'}
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
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Tipos de Pagamento
          </CardTitle>
          <p className="text-gray-500 mt-1">
            Gerencie os tipos de pagamento disponíveis no sistema
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('id')}
                >
                  ID {getSortIcon('id')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('nome')}
                >
                  Nome {getSortIcon('nome')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('descricao')}
                >
                  Descrição {getSortIcon('descricao')}
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTipos.map((tipo) => (
                <TableRow key={tipo.id}>
                  <TableCell>{tipo.id}</TableCell>
                  <TableCell>{tipo.nome}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {tipo.descricao || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={tipo.ativo}
                        onCheckedChange={() => handleToggleAtivo(tipo.id)}
                      />
                      {tipo.ativo ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700">
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
                        onClick={() => handleViewDetails(tipo)}
                        title="Visualizar"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(tipo)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(tipo.id)}
                        className="text-red-600 hover:text-red-700"
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
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Tipo de Pagamento</DialogTitle>
          </DialogHeader>
          {selectedTipo && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ID</Label>
                  <p className="text-gray-900">{selectedTipo.id}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    {selectedTipo.ativo ? (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ativo
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700">
                        <XCircle className="w-3 h-3 mr-1" />
                        Inativo
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <Label>Nome</Label>
                <p className="text-gray-900">{selectedTipo.nome}</p>
              </div>
              <div>
                <Label>Descrição</Label>
                <p className="text-gray-900">{selectedTipo.descricao || '-'}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}