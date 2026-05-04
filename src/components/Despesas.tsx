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

type Despesa = {
  id: number;
  descricao: string;
  formaPgto: 'a-vista' | 'a-prazo';
  tipoConta: string;
  categoria: string;
  valor: number;
  dataDespesa: string;
};

const mockData: Despesa[] = [
  { id: 1, descricao: 'Aluguel escritório', formaPgto: 'a-vista', tipoConta: 'Aluguel e Condomínio', categoria: 'Despesas Operacionais', valor: 8000, dataDespesa: '2025-10-05' },
  { id: 2, descricao: 'Energia elétrica', formaPgto: 'a-vista', tipoConta: 'Água, Luz e Telefone', categoria: 'Despesas Operacionais', valor: 3200, dataDespesa: '2025-10-10' },
  { id: 3, descricao: 'Material de escritório', formaPgto: 'a-prazo', tipoConta: 'Material de Escritório', categoria: 'Despesas Operacionais', valor: 1500, dataDespesa: '2025-10-12' },
  { id: 4, descricao: 'Folha de pagamento', formaPgto: 'a-vista', tipoConta: 'Salários e Encargos', categoria: 'Despesas Operacionais', valor: 25000, dataDespesa: '2025-10-01' },
  { id: 5, descricao: 'Internet e telefone', formaPgto: 'a-vista', tipoConta: 'Água, Luz e Telefone', categoria: 'Despesas Operacionais', valor: 850, dataDespesa: '2025-10-08' },
  { id: 6, descricao: 'DAS Simples Nacional', formaPgto: 'a-vista', tipoConta: 'Impostos Federais', categoria: 'Impostos e Taxas', valor: 4200, dataDespesa: '2025-10-14' },
];

export default function Despesas() {
  const [despesas, setDespesas] = useState<Despesa[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDespesa, setSelectedDespesa] = useState<Despesa | null>(null);
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof Despesa | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: keyof Despesa) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: keyof Despesa) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4 ml-1 inline" /> : 
      <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  const handleEdit = (despesa: Despesa) => {
    setEditingDespesa(despesa);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta despesa?')) {
      setDespesas(despesas.filter(d => d.id !== id));
    }
  };

  const handleViewDetails = (despesa: Despesa) => {
    setSelectedDespesa(despesa);
    setDetailsOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDespesa(null);
  };

  const filteredDespesas = despesas.filter(despesa =>
    despesa.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    despesa.tipoConta.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Aplicar ordenação
  const sortedDespesas = [...filteredDespesas].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalDespesas = despesas.reduce((acc, d) => acc + d.valor, 0);
  const despesasAVista = despesas.filter(d => d.formaPgto === 'a-vista').reduce((acc, d) => acc + d.valor, 0);
  const despesasAPrazo = despesas.filter(d => d.formaPgto === 'a-prazo').reduce((acc, d) => acc + d.valor, 0);

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Total de Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-red-600">
              {totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-gray-500">{despesas.length} lançamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">À Vista</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-orange-600">
              {despesasAVista.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-gray-500">{despesas.filter(d => d.formaPgto === 'a-vista').length} lançamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">A Prazo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-purple-600">
              {despesasAPrazo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-gray-500">{despesas.filter(d => d.formaPgto === 'a-prazo').length} lançamentos</p>
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
                  placeholder="Buscar despesas..."
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
                    Nova Despesa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingDespesa ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
                    <DialogDescription>
                      {editingDespesa ? 'Altere as informações da despesa' : 'Registre uma nova despesa no sistema'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="col-span-full space-y-2">
                      <Label htmlFor="descricao">Descrição</Label>
                      <Input 
                        id="descricao" 
                        placeholder="Descrição da despesa" 
                        defaultValue={editingDespesa?.descricao}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="formaPgto">Forma de Pagamento</Label>
                      <Select defaultValue={editingDespesa?.formaPgto}>
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
                      <Select defaultValue={editingDespesa?.tipoConta}>
                        <SelectTrigger id="tipoConta">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Salários e Encargos">Salários e Encargos - Desp. Operacionais</SelectItem>
                          <SelectItem value="Aluguel e Condomínio">Aluguel e Condomínio - Desp. Operacionais</SelectItem>
                          <SelectItem value="Água, Luz e Telefone">Água, Luz e Telefone - Desp. Operacionais</SelectItem>
                          <SelectItem value="Material de Escritório">Material de Escritório - Desp. Operacionais</SelectItem>
                          <SelectItem value="Impostos Federais">Impostos Federais - Impostos e Taxas</SelectItem>
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
                        defaultValue={editingDespesa?.valor}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dataDespesa">Data da Despesa</Label>
                      <Input 
                        id="dataDespesa" 
                        type="date" 
                        defaultValue={editingDespesa?.dataDespesa}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={handleCloseDialog}>
                      Cancelar
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={handleCloseDialog}>
                      {editingDespesa ? 'Atualizar' : 'Salvar'}
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
                  onClick={() => handleSort('dataDespesa')}
                >
                  Data {getSortIcon('dataDespesa')}
                </TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDespesas.map((despesa) => (
                <TableRow key={despesa.id}>
                  <TableCell>{despesa.id}</TableCell>
                  <TableCell>{despesa.descricao}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{despesa.tipoConta}</Badge>
                  </TableCell>
                  <TableCell className="text-red-600">
                    {despesa.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </TableCell>
                  <TableCell>
                    {new Date(despesa.dataDespesa).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewDetails(despesa)}
                        title="Visualizar"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(despesa)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(despesa.id)}
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
            <DialogTitle>Detalhes da Despesa</DialogTitle>
          </DialogHeader>
          {selectedDespesa && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Código</Label>
                  <p className="text-gray-900">{selectedDespesa.id}</p>
                </div>
                <div>
                  <Label>Forma de Pagamento</Label>
                  <p className="text-gray-900">{selectedDespesa.formaPgto === 'a-vista' ? 'À Vista' : 'A Prazo'}</p>
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <p className="text-gray-900">{selectedDespesa.descricao}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Conta</Label>
                  <p className="text-gray-900">{selectedDespesa.tipoConta}</p>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <p className="text-gray-900">{selectedDespesa.categoria}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor</Label>
                  <p className="text-gray-900 text-red-600">
                    {selectedDespesa.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div>
                  <Label>Data da Despesa</Label>
                  <p className="text-gray-900">
                    {new Date(selectedDespesa.dataDespesa).toLocaleDateString('pt-BR')}
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