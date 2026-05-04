import { useState } from 'react';
import { FileText, Download, Filter, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

const mockOrigens = [
  { id: 1, descricao: 'Escritório Imóveis Ltda', pessoa: true },
  { id: 2, descricao: 'Equipe Desenvolvimento', pessoa: true },
  { id: 3, descricao: 'Energia', pessoa: false },
  { id: 4, descricao: 'Impostos DAS', pessoa: false },
];

const mockContasPagar = [
  { id: 1, descricao: 'Aluguel Out/2025', formaPgto: 'Depósito', dataNominal: '2025-10-01', dataEfetiva: '2025-10-22', valor: 8000, status: 'pendente', origem: 'Escritório Imóveis Ltda' },
  { id: 2, descricao: 'Conta de luz - Set/2025', formaPgto: 'Depósito', dataNominal: '2025-10-05', dataEfetiva: '2025-10-24', valor: 3200, status: 'pendente', origem: 'Energia' },
  { id: 3, descricao: 'Matéria prima diversos', formaPgto: 'Título', dataNominal: '2025-10-10', dataEfetiva: '2025-10-26', valor: 12500, status: 'pendente', origem: 'Escritório Imóveis Ltda' },
  { id: 4, descricao: 'Folha de pagamento Set/2025', formaPgto: 'Pix', dataNominal: '2025-09-25', dataEfetiva: '2025-10-05', valor: 25000, status: 'pago', origem: 'Equipe Desenvolvimento' },
  { id: 5, descricao: 'Telefone Set/2025', formaPgto: 'Depósito', dataNominal: '2025-09-20', dataEfetiva: '2025-10-10', valor: 850, status: 'vencido', origem: 'Energia' },
  { id: 6, descricao: 'DAS Out/2025', formaPgto: 'Título', dataNominal: '2025-10-01', dataEfetiva: '2025-10-30', valor: 4200, status: 'pendente', origem: 'Impostos DAS' },
];

export default function Relatorios() {
  const [tipoRelatorio, setTipoRelatorio] = useState('geral');
  
  const [tipoPagamento, setTipoPagamento] = useState('todos');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [tipoData, setTipoData] = useState('efetiva');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [ordernarPor, setOrdernarPor] = useState('dataEfetiva');
  const [tipoOrdenacao, setTipoOrdenacao] = useState('crescente');
  
  const [origemSelecionada, setOrigemSelecionada] = useState('');
  const [filtroPessoa, setFiltroPessoa] = useState<'pessoa' | 'nao-pessoa' | 'todos'>('todos');

  const [dadosFiltrados, setDadosFiltrados] = useState(mockContasPagar);
  const [relatorioGerado, setRelatorioGerado] = useState(false);

  // Resetar o estado quando mudar tipo de relatório
  const handleTipoRelatorioChange = (value: string) => {
    setTipoRelatorio(value);
    setRelatorioGerado(false);
    setDadosFiltrados(mockContasPagar);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pago':
        return <Badge className="bg-green-100 text-green-700">Pago</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-100 text-yellow-700">Pendente</Badge>;
      case 'vencido':
        return <Badge className="bg-red-100 text-red-700">Vencido</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleGerarRelatorio = () => {
    let dados = [...mockContasPagar];

    if (tipoPagamento !== 'todos') {
      dados = dados.filter(c => c.formaPgto.toLowerCase() === tipoPagamento.toLowerCase());
    }

    if (statusFiltro !== 'todos') {
      dados = dados.filter(c => c.status === statusFiltro);
    }

    if (dataInicio) {
      const campo = tipoData === 'efetiva' ? 'dataEfetiva' : 'dataNominal';
      dados = dados.filter(c => c[campo] >= dataInicio);
    }
    if (dataFim) {
      const campo = tipoData === 'efetiva' ? 'dataEfetiva' : 'dataNominal';
      dados = dados.filter(c => c[campo] <= dataFim);
    }

    if (tipoRelatorio === 'origem' && origemSelecionada) {
      dados = dados.filter(c => c.origem === origemSelecionada);
    }

    if (tipoRelatorio === 'origem' && filtroPessoa !== 'todos') {
      const origensFiltradasIds = mockOrigens
        .filter(o => filtroPessoa === 'pessoa' ? o.pessoa : !o.pessoa)
        .map(o => o.descricao);
      dados = dados.filter(c => origensFiltradasIds.includes(c.origem));
    }

    dados.sort((a, b) => {
      let valorA, valorB;
      
      switch (ordernarPor) {
        case 'dataEfetiva':
          valorA = a.dataEfetiva;
          valorB = b.dataEfetiva;
          break;
        case 'dataNominal':
          valorA = a.dataNominal;
          valorB = b.dataNominal;
          break;
        case 'status':
          valorA = a.status;
          valorB = b.status;
          break;
        case 'tipoPagamento':
          valorA = a.formaPgto;
          valorB = b.formaPgto;
          break;
        default:
          valorA = a.dataEfetiva;
          valorB = b.dataEfetiva;
      }

      if (tipoOrdenacao === 'crescente') {
        return valorA > valorB ? 1 : -1;
      } else {
        return valorA < valorB ? 1 : -1;
      }
    });

    setDadosFiltrados(dados);
    setRelatorioGerado(true);
  };

  const calcularTotais = () => {
    const total = dadosFiltrados.reduce((acc, c) => acc + c.valor, 0);
    const pago = dadosFiltrados.filter(c => c.status === 'pago').reduce((acc, c) => acc + c.valor, 0);
    const pendente = dadosFiltrados.filter(c => c.status === 'pendente').reduce((acc, c) => acc + c.valor, 0);
    const vencido = dadosFiltrados.filter(c => c.status === 'vencido').reduce((acc, c) => acc + c.valor, 0);

    return { total, pago, pendente, vencido };
  };

  const totais = calcularTotais();

  const origensComContas = mockOrigens.filter(o => 
    mockContasPagar.some(c => c.origem === o.descricao)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Relatórios de Contas a Pagar
          </CardTitle>
          <CardDescription>
            Gere relatórios detalhados com filtros avançados
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={tipoRelatorio} onValueChange={handleTipoRelatorioChange} className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-2">
          <TabsTrigger value="geral">Relatório Geral</TabsTrigger>
          <TabsTrigger value="origem">Relatório por Origem</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtros do Relatório
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipoPagamento">Tipo de Pagamento</Label>
                  <Select value={tipoPagamento} onValueChange={setTipoPagamento}>
                    <SelectTrigger id="tipoPagamento">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="cartão de crédito">Cartão de Crédito</SelectItem>
                      <SelectItem value="título">Título</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="depósito">Depósito</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipoData">Tipo de Data</Label>
                  <Select value={tipoData} onValueChange={setTipoData}>
                    <SelectTrigger id="tipoData">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efetiva">Data Efetiva (Vencimento)</SelectItem>
                      <SelectItem value="nominal">Data Nominal (Emissão)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataInicio">Data de Início</Label>
                  <Input 
                    id="dataInicio" 
                    type="date" 
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataFim">Data Fim</Label>
                  <Input 
                    id="dataFim" 
                    type="date" 
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ordenarPor">Ordenar Por</Label>
                  <Select value={ordernarPor} onValueChange={setOrdernarPor}>
                    <SelectTrigger id="ordenarPor">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dataEfetiva">Data Efetiva</SelectItem>
                      <SelectItem value="dataNominal">Data Nominal</SelectItem>
                      <SelectItem value="status">Status de Pagamento</SelectItem>
                      <SelectItem value="tipoPagamento">Tipo de Pagamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipoOrdenacao">Tipo de Ordenação</Label>
                  <Select value={tipoOrdenacao} onValueChange={setTipoOrdenacao}>
                    <SelectTrigger id="tipoOrdenacao">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="crescente">Crescente</SelectItem>
                      <SelectItem value="decrescente">Decrescente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-6">
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleGerarRelatorio}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Gerar Relatório
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="origem" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtros do Relatório por Origem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="filtroPessoa">Tipo de Origem</Label>
                  <Select value={filtroPessoa} onValueChange={(v) => setFiltroPessoa(v as any)}>
                    <SelectTrigger id="filtroPessoa">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pessoa">Fornecedores (Pessoa)</SelectItem>
                      <SelectItem value="nao-pessoa">Despesas Gerais (Não Pessoa)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="origem">Origem Específica</Label>
                  <Select value={origemSelecionada} onValueChange={setOrigemSelecionada}>
                    <SelectTrigger id="origem">
                      <SelectValue placeholder="Selecione uma origem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas</SelectItem>
                      {origensComContas.map(origem => (
                        <SelectItem key={origem.id} value={origem.descricao}>
                          {origem.descricao} - {origem.pessoa ? 'Fornecedor' : 'Despesa'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipoPagamento2">Tipo de Pagamento</Label>
                  <Select value={tipoPagamento} onValueChange={setTipoPagamento}>
                    <SelectTrigger id="tipoPagamento2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="cartão de crédito">Cartão de Crédito</SelectItem>
                      <SelectItem value="título">Título</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="depósito">Depósito</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status2">Status</Label>
                  <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                    <SelectTrigger id="status2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataInicio2">Data de Início</Label>
                  <Input 
                    id="dataInicio2" 
                    type="date" 
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataFim2">Data Fim</Label>
                  <Input 
                    id="dataFim2" 
                    type="date" 
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ordenarPor2">Ordenar Por</Label>
                  <Select value={ordernarPor} onValueChange={setOrdernarPor}>
                    <SelectTrigger id="ordenarPor2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dataEfetiva">Data Efetiva</SelectItem>
                      <SelectItem value="dataNominal">Data Nominal</SelectItem>
                      <SelectItem value="status">Status de Pagamento</SelectItem>
                      <SelectItem value="tipoPagamento">Tipo de Pagamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipoOrdenacao2">Tipo de Ordenação</Label>
                  <Select value={tipoOrdenacao} onValueChange={setTipoOrdenacao}>
                    <SelectTrigger id="tipoOrdenacao2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="crescente">Crescente</SelectItem>
                      <SelectItem value="decrescente">Decrescente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-6">
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleGerarRelatorio}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Gerar Relatório
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {relatorioGerado && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-600">Total Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-blue-600">
                  {totais.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <p className="text-gray-500">{dadosFiltrados.length} contas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-600">Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-green-600">
                  {totais.pago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <p className="text-gray-500">{dadosFiltrados.filter(c => c.status === 'pago').length} contas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-600">Pendente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-yellow-600">
                  {totais.pendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <p className="text-gray-500">{dadosFiltrados.filter(c => c.status === 'pendente').length} contas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-600">Vencido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-red-600">
                  {totais.vencido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <p className="text-gray-500">{dadosFiltrados.filter(c => c.status === 'vencido').length} contas</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resultado do Relatório</CardTitle>
              <CardDescription>
                {dadosFiltrados.length} registro(s) encontrado(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Forma Pgto</TableHead>
                    <TableHead>Data Emissão</TableHead>
                    <TableHead>Data Vcto</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    {tipoRelatorio === 'origem' && <TableHead>Origem</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosFiltrados.map((conta) => (
                    <TableRow key={conta.id}>
                      <TableCell>{conta.id}</TableCell>
                      <TableCell>{conta.descricao}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{conta.formaPgto}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(conta.dataNominal).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        {new Date(conta.dataEfetiva).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        {conta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell>{getStatusBadge(conta.status)}</TableCell>
                      {tipoRelatorio === 'origem' && (
                        <TableCell>
                          <Badge variant="outline">{conta.origem}</Badge>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}