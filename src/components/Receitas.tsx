import { useState } from 'react';
import { Plus, Search, Filter, Download, Pencil, Trash2, Eye, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

type Receita = {
  id: number;
  descricao: string;
  formaPgto: 'a-vista' | 'a-prazo';
  tipoConta: string;
  categoria: string;
  valor: number;
  dataReceita: string;
};

const mockData: Receita[] = [
  { id: 1, descricao: 'Venda de produtos - Lote A', formaPgto: 'a-vista', tipoConta: 'Vendas de Produtos', categoria: 'Receitas Operacionais', valor: 15000, dataReceita: '2025-10-15' },
  { id: 2, descricao: 'Prestação de serviços mensais', formaPgto: 'a-prazo', tipoConta: 'Prestação de Serviços', categoria: 'Receitas Operacionais', valor: 8500, dataReceita: '2025-10-01' },
  { id: 3, descricao: 'Consultoria especializada', formaPgto: 'a-vista', tipoConta: 'Consultoria e Assessoria', categoria: 'Receitas Operacionais', valor: 12000, dataReceita: '2025-10-10' },
  { id: 4, descricao: 'Venda produtos diversos', formaPgto: 'a-prazo', tipoConta: 'Vendas de Produtos', categoria: 'Receitas Operacionais', valor: 6200, dataReceita: '2025-10-18' },
  { id: 5, descricao: 'Royalties mensais', formaPgto: 'a-prazo', tipoConta: 'Royalties', categoria: 'Receitas Operacionais', valor: 4500, dataReceita: '2025-10-20' },
];

export default function Receitas() {
  const [receitas, setReceitas] = useState<Receita[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedReceita, setSelectedReceita] = useState<Receita | null>(null);
  const [editingReceita, setEditingReceita] = useState<Receita | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof Receita | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4 ml-1 inline" /> : 
      <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  const handleEdit = (receita: Receita) => {
    setEditingReceita(receita);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta receita?')) {
      setReceitas(receitas.filter(r => r.id !== id));
    }
  };

  const handleViewDetails = (receita: Receita) => {
    setSelectedReceita(receita);
    setDetailsOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingReceita(null);
  };

  const filteredReceitas = receitas.filter(receita =>
    receita.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    receita.tipoConta.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Aplicar ordenação
  const sortedReceitas = [...filteredReceitas].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalReceitas = receitas.reduce((acc, r) => acc + r.valor, 0);
  const receitasAVista = receitas.filter(r => r.formaPgto === 'a-vista').reduce((acc, r) => acc + r.valor, 0);
  const receitasAPrazo = receitas.filter(r => r.formaPgto === 'a-prazo').reduce((acc, r) => acc + r.valor, 0);

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Total de Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-green-600">
              {totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-gray-500">{receitas.length} lançamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">À Vista</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-blue-600">
              {receitasAVista.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-gray-500">{receitas.filter(r => r.formaPgto === 'a-vista').length} lançamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">A Prazo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-purple-600">
              {receitasAPrazo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-gray-500">{receitas.filter(r => r.formaPgto === 'a-prazo').length} lançamentos</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Ações */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar receitas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="sm:w-auto">
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" className="sm:w-auto">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
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
                        defaultValue={editingReceita?.descricao}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="formaPgto">Forma de Pagamento</Label>
                      <Select defaultValue={editingReceita?.formaPgto}>
                        <SelectTrigger id="formaPgto">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="a-vista">À Vista</SelectItem>
                          <SelectItem value="a-prazo">A Prazo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipoConta">Tipo de Conta</Label>
                      <Select defaultValue={editingReceita?.tipoConta}>
                        <SelectTrigger id="tipoConta">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Vendas de Produtos">Vendas de Produtos - Rec. Operacionais</SelectItem>
                          <SelectItem value="Prestação de Serviços">Prestação de Serviços - Rec. Operacionais</SelectItem>
                          <SelectItem value="Consultoria e Assessoria">Consultoria e Assessoria - Rec. Operacionais</SelectItem>
                          <SelectItem value="Royalties">Royalties - Rec. Operacionais</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valor">Valor</Label>
                      <Input 
                        id="valor" 
                        type="number" 
                        step="0.01" 
                        placeholder="0,00" 
                        defaultValue={editingReceita?.valor}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dataReceita">Data da Receita</Label>
                      <Input 
                        id="dataReceita" 
                        type="date" 
                        defaultValue={editingReceita?.dataReceita}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={handleCloseDialog}>
                      Cancelar
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={handleCloseDialog}>
                      {editingReceita ? 'Atualizar' : 'Salvar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('id')}
                >
                  Código {getSortIcon('id')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('descricao')}
                >
                  Descrição {getSortIcon('descricao')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('tipoConta')}
                >
                  Tipo Conta {getSortIcon('tipoConta')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('valor')}
                >
                  Valor {getSortIcon('valor')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('dataReceita')}
                >
                  Data {getSortIcon('dataReceita')}
                </TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedReceitas.map((receita) => (
                <TableRow key={receita.id}>
                  <TableCell>{receita.id}</TableCell>
                  <TableCell>{receita.descricao}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{receita.tipoConta}</Badge>
                  </TableCell>
                  <TableCell className="text-green-600">
                    {receita.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </TableCell>
                  <TableCell>
                    {new Date(receita.dataReceita).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewDetails(receita)}
                        title="Visualizar"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(receita)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(receita.id)}
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
                  <Label>Forma de Pagamento</Label>
                  <p className="text-gray-900">{selectedReceita.formaPgto === 'a-vista' ? 'À Vista' : 'A Prazo'}</p>
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <p className="text-gray-900">{selectedReceita.descricao}</p>
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
                  <p className="text-gray-900 text-green-600">
                    {selectedReceita.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div>
                  <Label>Data da Receita</Label>
                  <p className="text-gray-900">
                    {new Date(selectedReceita.dataReceita).toLocaleDateString('pt-BR')}
                  </p>
                </div>
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