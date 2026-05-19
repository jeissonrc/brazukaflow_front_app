import { useEffect, useMemo, useState } from 'react';
import { FileText, Download, Filter, TrendingUp } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { getAuthToken } from '../lib/auth';

type ApiPaymentType = {
  id: number;
  name: string;
  status?: boolean | number | string | null;
};

type ApiOrigin = {
  id: number;
  description?: string | null;
  category?: number | string | null;
  person?: boolean | number | string | null;
};

type ApiAccount = {
  id: number;
  description?: string | null;
  nominalDate?: string | null;
  dueDate?: string | null;
  paymentDate?: string | null;
  paymentTypeId?: number | null;
  documentNumber?: string | null;
  value?: number | string | null;
  paid?: boolean | number | string | null;
  originId?: number | null;
  paymentType?: ApiPaymentType;
};

type ReportItem = {
  id: string;
  codigo: number;
  modulo: 'pagar' | 'receber';
  descricao: string;
  formaPgto: string;
  paymentTypeId: number | null;
  dataNominal: string;
  dataEfetiva: string;
  valor: number;
  status: 'realizado' | 'pendente' | 'vencido';
  statusLabel: string;
  origem: string;
  originId: number | null;
  pessoa: boolean;
};

type OriginSummary = {
  key: string;
  origem: string;
  pessoa: boolean;
  total: number;
  realizado: number;
  pendente: number;
  vencido: number;
  quantidade: number;
};

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || '';
const isActiveStatus = (status: boolean | number | string | null | undefined) => status !== false && status !== 0 && status !== '0' && status !== 'false';
const isTrue = (value: boolean | number | string | null | undefined) => value === true || value === 1 || value === '1' || value === 'true';

const normalizeDateInput = (value?: string | null) => {
  if (!value) return '';
  return value.slice(0, 10);
};

const formatDateBR = (value: string) => {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return '-';
  return `${day}/${month}/${year}`;
};

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

const getAccountStatus = (account: ApiAccount): ReportItem['status'] => {
  if (isTrue(account.paid)) return 'realizado';

  const dueDate = normalizeDateInput(account.dueDate);
  if (dueDate && dueDate < new Date().toISOString().slice(0, 10)) {
    return 'vencido';
  }

  return 'pendente';
};

const getStatusLabel = (status: ReportItem['status'], modulo: ReportItem['modulo']) => {
  if (status === 'realizado') return modulo === 'pagar' ? 'Pago' : 'Recebido';
  if (status === 'pendente') return 'Pendente';
  return 'Vencido';
};

const mapAccountToReportItem = (
  account: ApiAccount,
  modulo: ReportItem['modulo'],
  originsById: Map<number, ApiOrigin>,
): ReportItem => {
  const status = getAccountStatus(account);
  const origin = account.originId ? originsById.get(account.originId) : undefined;

  return {
    id: `${modulo}-${account.id}`,
    codigo: account.id,
    modulo,
    descricao: account.description || '',
    formaPgto: account.paymentType?.name || '-',
    paymentTypeId: account.paymentTypeId ?? null,
    dataNominal: normalizeDateInput(account.nominalDate),
    dataEfetiva: normalizeDateInput(account.dueDate),
    valor: Number(account.value || 0),
    status,
    statusLabel: getStatusLabel(status, modulo),
    origem: origin?.description || '-',
    originId: account.originId ?? null,
    pessoa: isTrue(origin?.person),
  };
};

export default function Relatorios() {
  const [tipoRelatorio, setTipoRelatorio] = useState('geral');
  const [moduloFiltro, setModuloFiltro] = useState<'todos' | 'pagar' | 'receber'>('todos');
  const [tipoPagamento, setTipoPagamento] = useState('todos');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [tipoData, setTipoData] = useState('efetiva');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [ordernarPor, setOrdernarPor] = useState('dataEfetiva');
  const [tipoOrdenacao, setTipoOrdenacao] = useState('crescente');
  const [origemSelecionada, setOrigemSelecionada] = useState('todas');
  const [filtroPessoa, setFiltroPessoa] = useState<'pessoa' | 'nao-pessoa' | 'todos'>('todos');
  const [paymentTypes, setPaymentTypes] = useState<ApiPaymentType[]>([]);
  const [origins, setOrigins] = useState<ApiOrigin[]>([]);
  const [dadosBase, setDadosBase] = useState<ReportItem[]>([]);
  const [dadosFiltrados, setDadosFiltrados] = useState<ReportItem[]>([]);
  const [relatorioGerado, setRelatorioGerado] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchJson = async <T,>(path: string): Promise<T> => {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao carregar dados do relatório.');
    }

    return result.data as T;
  };

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const [payables, receivables, paymentTypesData, originsData] = await Promise.all([
        fetchJson<ApiAccount[]>('/api/accounts-payable'),
        fetchJson<ApiAccount[]>('/api/accounts-receivable'),
        fetchJson<ApiPaymentType[]>('/api/payment-types'),
        fetchJson<ApiOrigin[]>('/api/origin-accounts'),
      ]);

      const originsMap = new Map((originsData || []).map((origin) => [origin.id, origin]));
      const items = [
        ...(payables || []).map((item) => mapAccountToReportItem(item, 'pagar', originsMap)),
        ...(receivables || []).map((item) => mapAccountToReportItem(item, 'receber', originsMap)),
      ];

      setPaymentTypes((paymentTypesData || []).filter((item) => isActiveStatus(item.status)));
      setOrigins(originsData || []);
      setDadosBase(items);
      setDadosFiltrados(items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar módulo de relatórios.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  const handleTipoRelatorioChange = (value: string) => {
    setTipoRelatorio(value);
    setRelatorioGerado(false);
    setDadosFiltrados(dadosBase);
  };

  const getStatusBadge = (item: ReportItem) => {
    switch (item.status) {
      case 'realizado':
        return <Badge className="bg-green-100 text-green-700">{item.statusLabel}</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-100 text-yellow-700">Pendente</Badge>;
      case 'vencido':
        return <Badge className="bg-red-100 text-red-700">Vencido</Badge>;
      default:
        return <Badge>{item.statusLabel}</Badge>;
    }
  };

  const handleGerarRelatorio = () => {
    let dados = [...dadosBase];

    if (moduloFiltro !== 'todos') {
      dados = dados.filter((item) => item.modulo === moduloFiltro);
    }

    if (tipoPagamento !== 'todos') {
      dados = dados.filter((item) => String(item.paymentTypeId) === tipoPagamento);
    }

    if (statusFiltro !== 'todos') {
      dados = dados.filter((item) => item.status === statusFiltro);
    }

    const campoData = tipoData === 'efetiva' ? 'dataEfetiva' : 'dataNominal';
    if (dataInicio) {
      dados = dados.filter((item) => item[campoData] >= dataInicio);
    }
    if (dataFim) {
      dados = dados.filter((item) => item[campoData] <= dataFim);
    }

    if (tipoRelatorio === 'origem' && origemSelecionada !== 'todas') {
      dados = dados.filter((item) => String(item.originId) === origemSelecionada);
    }

    if (tipoRelatorio === 'origem' && filtroPessoa !== 'todos') {
      dados = dados.filter((item) => (filtroPessoa === 'pessoa' ? item.pessoa : !item.pessoa));
    }

    dados.sort((a, b) => {
      let valorA: string | number;
      let valorB: string | number;

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
          valorA = a.statusLabel;
          valorB = b.statusLabel;
          break;
        case 'tipoPagamento':
          valorA = a.formaPgto;
          valorB = b.formaPgto;
          break;
        case 'valor':
          valorA = a.valor;
          valorB = b.valor;
          break;
        default:
          valorA = a.dataEfetiva;
          valorB = b.dataEfetiva;
      }

      if (valorA < valorB) return tipoOrdenacao === 'crescente' ? -1 : 1;
      if (valorA > valorB) return tipoOrdenacao === 'crescente' ? 1 : -1;
      return 0;
    });

    setDadosFiltrados(dados);
    setRelatorioGerado(true);
  };

  const calcularTotais = () => {
    const total = dadosFiltrados.reduce((acc, item) => acc + item.valor, 0);
    const realizado = dadosFiltrados.filter((item) => item.status === 'realizado').reduce((acc, item) => acc + item.valor, 0);
    const pendente = dadosFiltrados.filter((item) => item.status === 'pendente').reduce((acc, item) => acc + item.valor, 0);
    const vencido = dadosFiltrados.filter((item) => item.status === 'vencido').reduce((acc, item) => acc + item.valor, 0);

    return { total, realizado, pendente, vencido };
  };

  const totais = calcularTotais();

  const origensComContas = useMemo(() => {
    const originIds = new Set(dadosBase.map((item) => item.originId).filter((id): id is number => Boolean(id)));
    return origins.filter((origin) => originIds.has(origin.id));
  }, [dadosBase, origins]);

  const resumoPorOrigem = useMemo(() => {
    const resumo = new Map<string, OriginSummary>();

    dadosFiltrados.forEach((item) => {
      const key = item.originId ? String(item.originId) : `sem-origem-${item.origem}`;
      const current =
        resumo.get(key) ||
        {
          key,
          origem: item.origem || '-',
          pessoa: item.pessoa,
          total: 0,
          realizado: 0,
          pendente: 0,
          vencido: 0,
          quantidade: 0,
        };

      current.total += item.valor;
      current.quantidade += 1;

      if (item.status === 'realizado') current.realizado += item.valor;
      if (item.status === 'pendente') current.pendente += item.valor;
      if (item.status === 'vencido') current.vencido += item.valor;

      resumo.set(key, current);
    });

    return Array.from(resumo.values()).sort((a, b) => a.origem.localeCompare(b.origem));
  }, [dadosFiltrados]);

  const dadosPorOrigem = useMemo(() => {
    const grupos = new Map<string, ReportItem[]>();

    dadosFiltrados.forEach((item) => {
      const key = item.originId ? String(item.originId) : `sem-origem-${item.origem}`;
      const current = grupos.get(key) || [];
      current.push(item);
      grupos.set(key, current);
    });

    return grupos;
  }, [dadosFiltrados]);

  const renderCommonFilters = (suffix = '') => (
    <>
      <div className="space-y-2">
        <Label htmlFor={`modulo${suffix}`}>Módulo</Label>
        <Select value={moduloFiltro} onValueChange={(value: 'todos' | 'pagar' | 'receber') => setModuloFiltro(value)}>
          <SelectTrigger id={`modulo${suffix}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pagar">Contas a Pagar</SelectItem>
            <SelectItem value="receber">Contas a Receber</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`tipoPagamento${suffix}`}>Tipo de Pagamento</Label>
        <Select value={tipoPagamento} onValueChange={setTipoPagamento}>
          <SelectTrigger id={`tipoPagamento${suffix}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {paymentTypes.map((type) => (
              <SelectItem key={type.id} value={String(type.id)}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`status${suffix}`}>Status</Label>
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger id={`status${suffix}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="realizado">Pago/Recebido</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`tipoData${suffix}`}>Tipo de Data</Label>
        <Select value={tipoData} onValueChange={setTipoData}>
          <SelectTrigger id={`tipoData${suffix}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="efetiva">Data Efetiva (Vencimento)</SelectItem>
            <SelectItem value="nominal">Data Nominal (Emissão)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`dataInicio${suffix}`}>Data de Início</Label>
        <Input id={`dataInicio${suffix}`} type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`dataFim${suffix}`}>Data Fim</Label>
        <Input id={`dataFim${suffix}`} type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`ordenarPor${suffix}`}>Ordenar Por</Label>
        <Select value={ordernarPor} onValueChange={setOrdernarPor}>
          <SelectTrigger id={`ordenarPor${suffix}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dataEfetiva">Data Efetiva</SelectItem>
            <SelectItem value="dataNominal">Data Nominal</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="tipoPagamento">Tipo de Pagamento</SelectItem>
            <SelectItem value="valor">Valor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`tipoOrdenacao${suffix}`}>Tipo de Ordenação</Label>
        <Select value={tipoOrdenacao} onValueChange={setTipoOrdenacao}>
          <SelectTrigger id={`tipoOrdenacao${suffix}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="crescente">Crescente</SelectItem>
            <SelectItem value="decrescente">Decrescente</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Relatórios Gerais
          </CardTitle>
          <CardDescription>Gere relatórios detalhados de contas a pagar e contas a receber</CardDescription>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{renderCommonFilters()}</div>

              <div className="flex flex-col sm:flex-row gap-2 mt-6">
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleGerarRelatorio} disabled={isLoading}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  {isLoading ? 'Carregando...' : 'Gerar Relatório'}
                </Button>
                <Button variant="outline" disabled>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button variant="outline" disabled>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="filtroPessoa">Tipo de Origem</Label>
                  <Select value={filtroPessoa} onValueChange={(value: 'pessoa' | 'nao-pessoa' | 'todos') => setFiltroPessoa(value)}>
                    <SelectTrigger id="filtroPessoa">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pessoa">Pessoa</SelectItem>
                      <SelectItem value="nao-pessoa">Não Pessoa</SelectItem>
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
                      <SelectItem value="todas">Todas</SelectItem>
                      {origensComContas.map((origem) => (
                        <SelectItem key={origem.id} value={String(origem.id)}>
                          {origem.description || `Origem ${origem.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {renderCommonFilters('2')}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-6">
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleGerarRelatorio} disabled={isLoading}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  {isLoading ? 'Carregando...' : 'Gerar Relatório'}
                </Button>
                <Button variant="outline" disabled>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button variant="outline" disabled>
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
                <div className="text-blue-600">{formatCurrency(totais.total)}</div>
                <p className="text-gray-500">{dadosFiltrados.length} contas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-600">Pago/Recebido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-green-600">{formatCurrency(totais.realizado)}</div>
                <p className="text-gray-500">{dadosFiltrados.filter((item) => item.status === 'realizado').length} contas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-600">Pendente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-yellow-600">{formatCurrency(totais.pendente)}</div>
                <p className="text-gray-500">{dadosFiltrados.filter((item) => item.status === 'pendente').length} contas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-600">Vencido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-red-600">{formatCurrency(totais.vencido)}</div>
                <p className="text-gray-500">{dadosFiltrados.filter((item) => item.status === 'vencido').length} contas</p>
              </CardContent>
            </Card>
          </div>

          {tipoRelatorio === 'origem' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Resumo por Origem</CardTitle>
                  <CardDescription>{resumoPorOrigem.length} origem(ns) encontrada(s)</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Origem</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Qtde</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Pago/Recebido</TableHead>
                        <TableHead>Pendente</TableHead>
                        <TableHead>Vencido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resumoPorOrigem.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                            Nenhuma origem encontrada para os filtros selecionados.
                          </TableCell>
                        </TableRow>
                      )}
                      {resumoPorOrigem.map((origem) => (
                        <TableRow key={origem.key}>
                          <TableCell>
                            <Badge variant="outline">{origem.origem}</Badge>
                          </TableCell>
                          <TableCell>{origem.pessoa ? 'Pessoa' : 'Não Pessoa'}</TableCell>
                          <TableCell>{origem.quantidade}</TableCell>
                          <TableCell>{formatCurrency(origem.total)}</TableCell>
                          <TableCell className="text-green-700">{formatCurrency(origem.realizado)}</TableCell>
                          <TableCell className="text-yellow-700">{formatCurrency(origem.pendente)}</TableCell>
                          <TableCell className="text-red-700">{formatCurrency(origem.vencido)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {resumoPorOrigem.map((origem) => (
                <Card key={`detalhe-${origem.key}`}>
                  <CardHeader>
                    <CardTitle>{origem.origem}</CardTitle>
                    <CardDescription>
                      {origem.quantidade} conta(s) - Total {formatCurrency(origem.total)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Módulo</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Forma Pgto</TableHead>
                          <TableHead>Data Emissão</TableHead>
                          <TableHead>Data Vcto</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(dadosPorOrigem.get(origem.key) || []).map((conta) => (
                          <TableRow key={`origem-${conta.id}`}>
                            <TableCell>
                              <Badge variant="outline">{conta.modulo === 'pagar' ? 'Pagar' : 'Receber'}</Badge>
                            </TableCell>
                            <TableCell>{conta.codigo}</TableCell>
                            <TableCell>{conta.descricao || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{conta.formaPgto}</Badge>
                            </TableCell>
                            <TableCell>{conta.dataNominal ? formatDateBR(conta.dataNominal) : '-'}</TableCell>
                            <TableCell>{conta.dataEfetiva ? formatDateBR(conta.dataEfetiva) : '-'}</TableCell>
                            <TableCell>{formatCurrency(conta.valor)}</TableCell>
                            <TableCell>{getStatusBadge(conta)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{tipoRelatorio === 'origem' ? 'Resultado Geral por Origem' : 'Resultado do Relatório'}</CardTitle>
              <CardDescription>{dadosFiltrados.length} registro(s) encontrado(s)</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Forma Pgto</TableHead>
                    <TableHead>Data Emissão</TableHead>
                    <TableHead>Data Vcto</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                  {dadosFiltrados.map((conta) => (
                    <TableRow key={conta.id}>
                      <TableCell>
                        <Badge variant="outline">{conta.modulo === 'pagar' ? 'Pagar' : 'Receber'}</Badge>
                      </TableCell>
                      <TableCell>{conta.codigo}</TableCell>
                      <TableCell>{conta.descricao || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{conta.formaPgto}</Badge>
                      </TableCell>
                      <TableCell>{conta.dataNominal ? formatDateBR(conta.dataNominal) : '-'}</TableCell>
                      <TableCell>{conta.dataEfetiva ? formatDateBR(conta.dataEfetiva) : '-'}</TableCell>
                      <TableCell>{formatCurrency(conta.valor)}</TableCell>
                      <TableCell>{getStatusBadge(conta)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{conta.origem}</Badge>
                      </TableCell>
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
