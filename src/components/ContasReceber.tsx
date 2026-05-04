import { useState } from 'react';
import { Plus, Search, Filter, Download, Check, Eye, Copy, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Textarea } from './ui/textarea';

type ContaReceber = {
  id: number;
  descricao: string;
  formaPgto: 1 | 2 | 3 | 4 | 5 | 6;
  dataNominal: string;
  dataEfetiva: string;
  numeroDoc: string;
  valor: number;
  tipoConta: string;
  categoria: string;
  status: 'pendente' | 'recebido' | 'vencido';
};

const mockOrigens = [
  { id: 3, descricao: 'Cliente VIP Premium Corp', obs: 'Mensalidade recorrente', categoria: 2, pessoa: true },
  { id: 6, descricao: 'Tech Solutions Inc', obs: 'Cliente contrato de manutenção', categoria: 2, pessoa: true },
];

const mockData: ContaReceber[] = [
  { id: 1, descricao: 'Prestação de serviços - Set/2025', formaPgto: 3, dataNominal: '2025-09-01', dataEfetiva: '2025-10-25', numeroDoc: 'NFS-001', valor: 15000, tipoConta: 'Prestação de Serviços', categoria: 'Receitas Operacionais', status: 'pendente' },
  { id: 2, descricao: 'Venda de produtos', formaPgto: 2, dataNominal: '2025-09-15', dataEfetiva: '2025-10-28', numeroDoc: 'NF-234', valor: 8500, tipoConta: 'Vendas de Produtos', categoria: 'Receitas Operacionais', status: 'pendente' },
  { id: 3, descricao: 'Consultoria tecnológica', formaPgto: 1, dataNominal: '2025-09-10', dataEfetiva: '2025-11-02', numeroDoc: 'CONS-045', valor: 22000, tipoConta: 'Consultoria e Assessoria', categoria: 'Receitas Operacionais', status: 'pendente' },
  { id: 4, descricao: 'Projeto desenvolvimento web', formaPgto: 5, dataNominal: '2025-08-20', dataEfetiva: '2025-09-20', numeroDoc: 'PROJ-089', valor: 18000, tipoConta: 'Prestação de Serviços', categoria: 'Receitas Operacionais', status: 'recebido' },
  { id: 5, descricao: 'Venda produtos diversos', formaPgto: 4, dataNominal: '2025-08-01', dataEfetiva: '2025-10-15', numeroDoc: 'NF-189', valor: 5200, tipoConta: 'Vendas de Produtos', categoria: 'Receitas Operacionais', status: 'vencido' },
];

export default function ContasReceber() {
  const [contas, setContas] = useState<ContaReceber[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [massDialogOpen, setMassDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedConta, setSelectedConta] = useState<ContaReceber | null>(null);
  const [editingConta, setEditingConta] = useState<ContaReceber | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contaToDelete, setContaToDelete] = useState<number | null>(null);
  const [receberDialogOpen, setReceberDialogOpen] = useState(false);
  const [contaToReceber, setContaToReceber] = useState<number | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof ContaReceber | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: keyof ContaReceber) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: keyof ContaReceber) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4 ml-1 inline" /> : 
      <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  const getFormaPgtoLabel = (forma: number) => {
    const formas: Record<number, string> = {
      1: 'Pix',
      2: 'Cartão de Crédito',
      3: 'Título',
      4: 'Dinheiro',
      5: 'Depósito',
      6: 'Cheque',
    };
    return formas[forma] || '-';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'recebido':
        return <Badge className="bg-green-100 text-green-700">Recebido</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-100 text-yellow-700">Pendente</Badge>;
      case 'vencido':
        return <Badge className="bg-red-100 text-red-700">Vencido</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleMarcarRecebido = (id: number) => {
    setContaToReceber(id);
    setReceberDialogOpen(true);
  };

  const confirmMarcarRecebido = () => {
    if (contaToReceber) {
      setContas(contas.map(conta => 
        conta.id === contaToReceber ? { ...conta, status: 'recebido' as const } : conta
      ));
      setReceberDialogOpen(false);
      setContaToReceber(null);
    }
  };

  const handleEdit = (conta: ContaReceber) => {
    setEditingConta(conta);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setContaToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (contaToDelete) {
      setContas(contas.filter(c => c.id !== contaToDelete));
      setDeleteDialogOpen(false);
      setContaToDelete(null);
    }
  };

  const handleViewDetails = (conta: ContaReceber) => {
    setSelectedConta(conta);
    setDetailsOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingConta(null);
  };

  const filteredContas = contas.filter(conta =>
    conta.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conta.numeroDoc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Aplicar ordenação
  const sortedContas = [...filteredContas].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPendente = contas.filter(c => c.status === 'pendente').reduce((acc, c) => acc + c.valor, 0);
  const totalRecebido = contas.filter(c => c.status === 'recebido').reduce((acc, c) => acc + c.valor, 0);
  const totalVencido = contas.filter(c => c.status === 'vencido').reduce((acc, c) => acc + c.valor, 0);

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-yellow-600">
              {totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-gray-500">{contas.filter(c => c.status === 'pendente').length} contas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Recebido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-green-600">
              {totalRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-gray-500">{contas.filter(c => c.status === 'recebido').length} contas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Vencido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-red-600">
              {totalVencido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-gray-500">{contas.filter(c => c.status === 'vencido').length} contas</p>
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
                  placeholder="Buscar por descrição ou número do doc..."
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
              <Dialog open={massDialogOpen} onOpenChange={setMassDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                    <Copy className="w-4 h-4 mr-2" />
                    Gerar em Massa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Gerar Contas a Receber em Massa</DialogTitle>
                    <DialogDescription>Gere múltiplas contas a partir de uma origem</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="col-span-full space-y-2">
                      <Label htmlFor="origem">Origem da Conta</Label>
                      <Select>
                        <SelectTrigger id="origem">
                          <SelectValue placeholder="Selecione a origem" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockOrigens.map(origem => (
                            <SelectItem key={origem.id} value={origem.id.toString()}>
                              {origem.descricao} - {origem.pessoa ? 'Cliente' : 'Receita'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-full space-y-2">
                      <Label htmlFor="descricaoMassa">Descrição</Label>
                      <Input id="descricaoMassa" placeholder="Descrição das contas" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="formaPgtoMassa">Forma de Pagamento</Label>
                      <Select>
                        <SelectTrigger id="formaPgtoMassa">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Pix</SelectItem>
                          <SelectItem value="2">2 - Cartão de Crédito</SelectItem>
                          <SelectItem value="3">3 - Título</SelectItem>
                          <SelectItem value="4">4 - Dinheiro</SelectItem>
                          <SelectItem value="5">5 - Depósito</SelectItem>
                          <SelectItem value="6">6 - Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valorMassa">Valor Total</Label>
                      <Input id="valorMassa" type="number" step="0.01" placeholder="0,00" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parcelas">Quantidade de Parcelas</Label>
                      <Input id="parcelas" type="number" min="1" placeholder="Ex: 3" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dataInicio">Data Primeira Parcela (Efetiva)</Label>
                      <Input id="dataInicio" type="date" />
                    </div>
                    <div className="col-span-full space-y-2">
                      <Label htmlFor="obsMassa">Observações</Label>
                      <Textarea id="obsMassa" placeholder="Observações" rows={3} />
                    </div>
                    <div className="col-span-full p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800">
                        <strong>Exemplo:</strong> Se informar valor total de R$ 9.000,00 e 3 parcelas, 
                        serão geradas 3 contas de R$ 3.000,00 cada, com vencimentos mensais a partir da data informada.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setMassDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setMassDialogOpen(false)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Gerar Contas
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Conta
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingConta ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}</DialogTitle>
                    <DialogDescription>
                      {editingConta ? 'Altere as informações da conta' : 'Cadastre uma nova conta a receber no sistema'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="col-span-full space-y-2">
                      <Label htmlFor="descricao">Descrição</Label>
                      <Input 
                        id="descricao" 
                        placeholder="Descrição da conta" 
                        defaultValue={editingConta?.descricao}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="formaPgto">Forma de Pagamento</Label>
                      <Select defaultValue={editingConta?.formaPgto.toString()}>
                        <SelectTrigger id="formaPgto">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Pix</SelectItem>
                          <SelectItem value="2">2 - Cartão de Crédito</SelectItem>
                          <SelectItem value="3">3 - Título</SelectItem>
                          <SelectItem value="4">4 - Dinheiro</SelectItem>
                          <SelectItem value="5">5 - Depósito</SelectItem>
                          <SelectItem value="6">6 - Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numeroDoc">Número do Documento</Label>
                      <Input 
                        id="numeroDoc" 
                        placeholder="Ex: NFS-001" 
                        defaultValue={editingConta?.numeroDoc}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dataNominal">Data Nominal (Emissão)</Label>
                      <Input 
                        id="dataNominal" 
                        type="date" 
                        defaultValue={editingConta?.dataNominal}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dataEfetiva">Data Efetiva (Vencimento)</Label>
                      <Input 
                        id="dataEfetiva" 
                        type="date" 
                        defaultValue={editingConta?.dataEfetiva}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valor">Valor</Label>
                      <Input 
                        id="valor" 
                        type="number" 
                        step="0.01" 
                        placeholder="0,00" 
                        defaultValue={editingConta?.valor}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipoConta">Tipo de Conta</Label>
                      <Select defaultValue={editingConta?.tipoConta}>
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
                      <Label htmlFor="status">Status da Conta</Label>
                      <Select defaultValue={editingConta?.status || 'pendente'}>
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="recebido">Recebido</SelectItem>
                          <SelectItem value="vencido">Vencido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={handleCloseDialog}>
                      Cancelar
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={handleCloseDialog}>
                      {editingConta ? 'Atualizar' : 'Salvar'}
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
                  onClick={() => handleSort('dataEfetiva')}
                >
                  Data Vcto {getSortIcon('dataEfetiva')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('valor')}
                >
                  Valor {getSortIcon('valor')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('status')}
                >
                  Status {getSortIcon('status')}
                </TableHead>
                <TableHead className="text-center">Marcar Recebido</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedContas.map((conta) => (
                <TableRow key={conta.id}>
                  <TableCell>{conta.id}</TableCell>
                  <TableCell>{conta.descricao}</TableCell>
                  <TableCell>
                    {new Date(conta.dataEfetiva).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {conta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </TableCell>
                  <TableCell>{getStatusBadge(conta.status)}</TableCell>
                  <TableCell className="text-center">
                    {conta.status === 'pendente' || conta.status === 'vencido' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarcarRecebido(conta.id)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        title="Marcar como Recebido"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewDetails(conta)}
                        title="Visualizar"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(conta)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteClick(conta.id)}
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
            <DialogTitle>Detalhes da Conta a Receber</DialogTitle>
          </DialogHeader>
          {selectedConta && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Código</Label>
                  <p className="text-gray-900">{selectedConta.id}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedConta.status)}</div>
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <p className="text-gray-900">{selectedConta.descricao}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Forma de Pagamento</Label>
                  <p className="text-gray-900">{getFormaPgtoLabel(selectedConta.formaPgto)}</p>
                </div>
                <div>
                  <Label>Número do Documento</Label>
                  <p className="text-gray-900">{selectedConta.numeroDoc}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Nominal (Emissão)</Label>
                  <p className="text-gray-900">
                    {new Date(selectedConta.dataNominal).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <Label>Data Efetiva (Vencimento)</Label>
                  <p className="text-gray-900">
                    {new Date(selectedConta.dataEfetiva).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor</Label>
                  <p className="text-gray-900">
                    {selectedConta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div>
                  <Label>Tipo de Conta</Label>
                  <p className="text-gray-900">{selectedConta.tipoConta}</p>
                </div>
              </div>
              <div>
                <Label>Categoria</Label>
                <p className="text-gray-900">{selectedConta.categoria}</p>
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

      {/* Alert Dialog - Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conta a receber? Esta ação não pode ser desfeita e todos os dados relacionados serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog - Confirmação Marcar como Recebido */}
      <AlertDialog open={receberDialogOpen} onOpenChange={setReceberDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Recebimento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja marcar esta conta como recebida? Esta ação irá atualizar o status da conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMarcarRecebido} className="bg-green-600 hover:bg-green-700">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}