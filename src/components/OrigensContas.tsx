import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, FileText, CheckCircle, XCircle, User, Building2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';

type OrigemConta = {
  id: number;
  descricao: string;
  obs?: string;
  categoria: 1 | 2; // 1: Despesa/Débito, 2: Receita/Crédito
  pessoa: boolean; // true = Fornecedor (se categoria 1) ou Cliente (se categoria 2)
};

const mockOrigensContas: OrigemConta[] = [
  {
    id: 1,
    descricao: 'Escritório Imóveis Ltda',
    obs: 'Aluguel do escritório comercial',
    categoria: 1,
    pessoa: true,
  },
  {
    id: 2,
    descricao: 'Equipe Desenvolvimento',
    obs: 'Folha de pagamento mensal',
    categoria: 1,
    pessoa: true,
  },
  {
    id: 3,
    descricao: 'Cliente VIP Premium Corp',
    obs: 'Mensalidade recorrente',
    categoria: 2,
    pessoa: true,
  },
  {
    id: 4,
    descricao: 'Energia',
    obs: 'Conta de luz',
    categoria: 1,
    pessoa: false,
  },
  {
    id: 5,
    descricao: 'Impostos DAS',
    obs: 'Simples Nacional',
    categoria: 1,
    pessoa: false,
  },
  {
    id: 6,
    descricao: 'Tech Solutions Inc',
    obs: 'Cliente contrato de manutenção',
    categoria: 2,
    pessoa: true,
  },
  {
    id: 7,
    descricao: 'Material Escritório Shop',
    obs: 'Fornecedor de material',
    categoria: 1,
    pessoa: true,
  },
];

export default function OrigensContas() {
  const [origens, setOrigens] = useState<OrigemConta[]>(mockOrigensContas);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<'todas' | 1 | 2>('todas');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OrigemConta | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<1 | 2>(1);

  const handleEdit = (item: OrigemConta) => {
    setEditingItem(item);
    setSelectedCategoria(item.categoria);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setOrigens(origens.filter(o => o.id !== id));
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setSelectedCategoria(1);
  };

  const getTipoLabel = (categoria: 1 | 2, pessoa: boolean) => {
    if (categoria === 1) {
      return pessoa ? 'Fornecedor' : 'Despesa';
    } else {
      return pessoa ? 'Cliente' : 'Receita';
    }
  };

  const filteredOrigens = origens.filter(o => {
    const matchSearch = o.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       o.obs?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = filterCategoria === 'todas' || o.categoria === filterCategoria;
    return matchSearch && matchFilter;
  });

  const totalOrigens = origens.length;
  const totalDespesas = origens.filter(o => o.categoria === 1).length;
  const totalReceitas = origens.filter(o => o.categoria === 2).length;
  const totalFornecedores = origens.filter(o => o.categoria === 1 && o.pessoa).length;
  const totalClientes = origens.filter(o => o.categoria === 2 && o.pessoa).length;

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Total de Origens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-blue-600">
              {totalOrigens}
            </div>
            <p className="text-gray-500">origens cadastradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Despesas/Débitos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-red-600">
              {totalDespesas}
            </div>
            <p className="text-gray-500">origens de despesa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Receitas/Créditos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-green-600">
              {totalReceitas}
            </div>
            <p className="text-gray-500">origens de receita</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Fornecedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-orange-600">
              {totalFornecedores}
            </div>
            <p className="text-gray-500">fornecedores</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-purple-600">
              {totalClientes}
            </div>
            <p className="text-gray-500">clientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Ações */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar origens de contas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterCategoria.toString()} onValueChange={(value: any) => setFilterCategoria(value === 'todas' ? 'todas' : parseInt(value))}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="1">Despesas/Débitos</SelectItem>
                  <SelectItem value="2">Receitas/Créditos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Origem de Conta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? 'Editar Origem de Conta' : 'Nova Origem de Conta'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingItem 
                      ? 'Altere as informações da origem de conta' 
                      : 'Cadastre uma nova origem para uso em contas a pagar/receber'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Input 
                      id="descricao" 
                      placeholder="Nome da origem" 
                      defaultValue={editingItem?.descricao}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="obs">Observações</Label>
                    <Textarea 
                      id="obs" 
                      placeholder="Observações sobre a origem" 
                      defaultValue={editingItem?.obs}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <Select 
                      value={selectedCategoria.toString()} 
                      onValueChange={(value) => setSelectedCategoria(parseInt(value) as 1 | 2)}
                      defaultValue={editingItem?.categoria.toString()}
                    >
                      <SelectTrigger id="categoria">
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Despesa/Débito</SelectItem>
                        <SelectItem value="2">2 - Receita/Crédito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pessoa">
                      É Pessoa? ({selectedCategoria === 1 ? 'Fornecedor' : 'Cliente'})
                    </Label>
                    <Select defaultValue={editingItem?.pessoa ? 'true' : 'false'}>
                      <SelectTrigger id="pessoa">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Sim ({selectedCategoria === 1 ? 'Fornecedor' : 'Cliente'})</SelectItem>
                        <SelectItem value="false">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800">
                      <strong>Dica:</strong> Se marcar como "Pessoa" em Despesa/Débito, será considerado <strong>Fornecedor</strong>. 
                      Se marcar em Receita/Crédito, será considerado <strong>Cliente</strong>.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={handleCloseDialog}>
                    {editingItem ? 'Atualizar' : 'Salvar'}
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
            <FileText className="w-5 h-5" />
            Origens de Contas Cadastradas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrigens.map((origem) => (
                <TableRow key={origem.id}>
                  <TableCell>{origem.descricao}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {origem.obs || '-'}
                  </TableCell>
                  <TableCell>
                    {origem.categoria === 1 ? (
                      <Badge className="bg-red-100 text-red-700">Despesa/Débito</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700">Receita/Crédito</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {origem.pessoa ? (
                      origem.categoria === 1 ? (
                        <Badge className="bg-orange-100 text-orange-700">
                          <Building2 className="w-3 h-3 mr-1" />
                          Fornecedor
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-700">
                          <User className="w-3 h-3 mr-1" />
                          Cliente
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline" className="text-gray-600">
                        {origem.categoria === 1 ? 'Despesa' : 'Receita'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(origem)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(origem.id)}
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
        </CardContent>
      </Card>
    </div>
  );
}
