import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { ArrowDownRight, ArrowUpRight, AlertCircle, DollarSign, FileText, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { getAuthToken } from '../lib/auth';

type HomeTarget = 'pagar' | 'receber' | 'receitas' | 'despesas' | 'relatorios';

type HomeProps = {
  onNavigate: (target: HomeTarget) => void;
};

type ApiAccountType = {
  id: number;
  description?: string | null;
};

type ApiAccount = {
  id: number;
  description?: string | null;
  dueDate?: string | null;
  value?: number | string | null;
  paid?: boolean | number | string | null;
  accountType?: ApiAccountType | null;
};

type HomeItem = {
  id: number;
  descricao: string;
  valor: number;
  data: string;
  pago: boolean;
  tipoConta: string;
};

type MonthData = {
  mes: string;
  key: string;
  receitas: number;
  despesas: number;
};

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || '';
const isTrue = (value: boolean | number | string | null | undefined) => value === true || value === 1 || value === '1' || value === 'true';
const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const normalizeDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '');
const toMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const getMonthKeyFromInput = (value: string) => value.slice(0, 7);

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

const formatTrend = (current: number, previous: number) => {
  if (!previous) return 'Sem base anterior';
  const percent = ((current - previous) / previous) * 100;
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}% vs mês anterior`;
};

const getDaysLabel = (date: string) => {
  if (!date) return 'Sem vencimento';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(`${date}T00:00:00`);
  const days = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);

  if (days < 0) return `Vencido há ${Math.abs(days)} dia(s)`;
  if (days === 0) return 'Vence hoje';
  return `Vence em ${days} dia(s)`;
};

const mapAccount = (account: ApiAccount): HomeItem => ({
  id: account.id,
  descricao: account.description || `Conta ${account.id}`,
  valor: Number(account.value || 0),
  data: normalizeDateInput(account.dueDate),
  pago: isTrue(account.paid),
  tipoConta: account.accountType?.description || 'Sem tipo',
});

export default function Home({ onNavigate }: HomeProps) {
  const [receivables, setReceivables] = useState<HomeItem[]>([]);
  const [payables, setPayables] = useState<HomeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchJson = async <T,>(path: string): Promise<T> => {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao carregar dados da home.');
    }

    return result.data as T;
  };

  const loadHomeData = async () => {
    setIsLoading(true);
    try {
      const [payablesData, receivablesData] = await Promise.all([
        fetchJson<ApiAccount[]>('/api/accounts-payable'),
        fetchJson<ApiAccount[]>('/api/accounts-receivable'),
      ]);

      setPayables((payablesData || []).map(mapAccount));
      setReceivables((receivablesData || []).map(mapAccount));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar home.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, []);

  const monthlyData = useMemo(() => {
    const today = new Date();
    const months: MonthData[] = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
      return {
        mes: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        key: toMonthKey(date),
        receitas: 0,
        despesas: 0,
      };
    });

    const byKey = new Map(months.map((month) => [month.key, month]));

    receivables.forEach((item) => {
      const month = byKey.get(getMonthKeyFromInput(item.data));
      if (month) month.receitas += item.valor;
    });

    payables.forEach((item) => {
      const month = byKey.get(getMonthKeyFromInput(item.data));
      if (month) month.despesas += item.valor;
    });

    return months;
  }, [payables, receivables]);

  const categoryData = useMemo(() => {
    const currentMonth = toMonthKey(new Date());
    const totals = new Map<string, number>();

    payables
      .filter((item) => getMonthKeyFromInput(item.data) === currentMonth)
      .forEach((item) => {
        totals.set(item.tipoConta, (totals.get(item.tipoConta) || 0) + item.valor);
      });

    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .reduce<{ name: string; value: number; color: string }[]>((acc, [name, value], index) => {
        if (index < 5) {
          acc.push({ name, value, color: COLORS[index] });
          return acc;
        }

        const outrosIndex = acc.findIndex((item) => item.name === 'Outros');
        if (outrosIndex >= 0) {
          acc[outrosIndex].value += value;
        } else {
          acc.push({ name: 'Outros', value, color: '#64748b' });
        }

        return acc;
      }, []);
  }, [payables]);

  const pendingReceivables = useMemo(
    () => receivables.filter((item) => !item.pago).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 3),
    [receivables],
  );

  const pendingPayables = useMemo(
    () => payables.filter((item) => !item.pago).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 3),
    [payables],
  );

  const currentMonth = toMonthKey(new Date());
  const previousMonth = monthlyData[monthlyData.length - 2];
  const currentData = monthlyData.find((item) => item.key === currentMonth) || monthlyData[monthlyData.length - 1];
  const totalReceitas = currentData.receitas;
  const totalDespesas = currentData.despesas;
  const saldo = totalReceitas - totalDespesas;
  const pendingReceivablesAll = receivables.filter((item) => !item.pago);
  const pendingPayablesAll = payables.filter((item) => !item.pago);
  const totalReceber = pendingReceivablesAll.reduce((acc, item) => acc + item.valor, 0);
  const totalPagar = pendingPayablesAll.reduce((acc, item) => acc + item.valor, 0);
  const totalPendente = totalReceber + totalPagar;

  const quickLinks = [
    { target: 'pagar' as const, title: 'Contas a Pagar', subtitle: 'Gerenciar', icon: TrendingDown, color: 'text-red-600' },
    { target: 'receber' as const, title: 'Contas a Receber', subtitle: 'Gerenciar', icon: TrendingUp, color: 'text-green-600' },
    { target: 'receitas' as const, title: 'Receitas', subtitle: 'Lançar', icon: DollarSign, color: 'text-emerald-600' },
    { target: 'despesas' as const, title: 'Despesas', subtitle: 'Lançar', icon: Wallet, color: 'text-orange-600' },
    { target: 'relatorios' as const, title: 'Relatórios', subtitle: 'Visualizar', icon: FileText, color: 'text-blue-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-gray-600">Receitas do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-green-600">{formatCurrency(totalReceitas)}</div>
            <div className="flex items-center gap-2 mt-2">
              {totalReceitas >= (previousMonth?.receitas || 0) ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              )}
              <span className="text-gray-500">{formatTrend(totalReceitas, previousMonth?.receitas || 0)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-gray-600">Despesas do Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-red-600">{formatCurrency(totalDespesas)}</div>
            <div className="flex items-center gap-2 mt-2">
              {totalDespesas >= (previousMonth?.despesas || 0) ? (
                <ArrowUpRight className="h-4 w-4 text-red-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-green-600" />
              )}
              <span className="text-gray-500">{formatTrend(totalDespesas, previousMonth?.despesas || 0)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-gray-600">Saldo do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-blue-600">{formatCurrency(saldo)}</div>
            <div className="flex items-center gap-2 mt-2">
              {saldo >= ((previousMonth?.receitas || 0) - (previousMonth?.despesas || 0)) ? (
                <ArrowUpRight className="h-4 w-4 text-blue-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              )}
              <span className="text-gray-500">{formatTrend(saldo, (previousMonth?.receitas || 0) - (previousMonth?.despesas || 0))}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-gray-600">Contas Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-orange-600">{pendingReceivablesAll.length + pendingPayablesAll.length} contas</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-gray-500">{formatCurrency(totalPendente)} em aberto</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Receitas vs Despesas</CardTitle>
            <CardDescription>Comparativo mensal dos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="receitas" fill="#10b981" name="Receitas" />
                <Bar dataKey="despesas" fill="#ef4444" name="Despesas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolução do Saldo</CardTitle>
            <CardDescription>Tendência de crescimento financeiro</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData.map((item) => ({ ...item, saldo: item.receitas - item.despesas }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="saldo" stroke="#3b82f6" strokeWidth={2} name="Saldo" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Despesas por Tipo de Conta</CardTitle>
            <CardDescription>Distribuição no mês atual</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                Nenhuma despesa no mês atual.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            )}
            {categoryData.length > 0 && (
              <div className="mt-4 space-y-2">
                {categoryData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-700 truncate">{item.name}</span>
                    </div>
                    <span className="text-gray-600 shrink-0">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Próximos Vencimentos</CardTitle>
            <CardDescription>Contas a receber e pagar nos próximos dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-green-600 mb-3">A Receber</h4>
                <div className="space-y-2">
                  {pendingReceivables.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <p className="text-gray-900">{item.descricao}</p>
                        <p className="text-gray-500">{getDaysLabel(item.data)}</p>
                      </div>
                      <div className="text-green-600">{formatCurrency(item.valor)}</div>
                    </div>
                  ))}
                  {pendingReceivables.length === 0 && <p className="text-gray-500">Nenhuma conta a receber pendente.</p>}
                </div>
              </div>

              <div>
                <h4 className="text-red-600 mb-3">A Pagar</h4>
                <div className="space-y-2">
                  {pendingPayables.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="text-gray-900">{item.descricao}</p>
                        <p className="text-gray-500">{getDaysLabel(item.data)}</p>
                      </div>
                      <div className="text-red-600">{formatCurrency(item.valor)}</div>
                    </div>
                  ))}
                  {pendingPayables.length === 0 && <p className="text-gray-500">Nenhuma conta a pagar pendente.</p>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acesso Rápido</CardTitle>
          <CardDescription>Atalhos para as principais rotinas do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Button key={item.target} type="button" variant="outline" className="h-auto w-full justify-start p-4 cursor-pointer whitespace-normal" onClick={() => onNavigate(item.target)}>
                  <div className="flex min-w-0 items-start gap-3 text-left">
                    <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${item.color}`} />
                    <div className="min-w-0">
                      <div className="text-gray-700 font-medium leading-tight break-words">{item.title}</div>
                      <div className="text-gray-500 text-sm mt-1">{item.subtitle}</div>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {isLoading && <p className="text-gray-500 text-sm">Carregando dados reais da home...</p>}
    </div>
  );
}
