import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { ArrowDownRight, ArrowUpRight, AlertCircle, DollarSign, FileText, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
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

type ApiCashEntry = {
  id: number;
  description?: string | null;
  value?: number | string | null;
  incomeDate?: string | null;
  expenseDate?: string | null;
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

type PiePeriod = 'mes-atual' | 'mes-anterior' | '30' | '3-meses' | '6-meses' | '12-meses' | 'ano-atual';

type HomeDashboardResponse = {
  monthlyData: MonthData[];
  incomes: ApiCashEntry[];
  expenses: ApiCashEntry[];
  payables: ApiAccount[];
  receivables: ApiAccount[];
};

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];
const CHART_TOOLTIP_CONTENT_STYLE = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--popover-foreground)',
  boxShadow: '0 14px 32px rgba(15, 23, 42, 0.18)',
};
const CHART_TOOLTIP_LABEL_STYLE = { color: 'var(--popover-foreground)' };
const CHART_TOOLTIP_ITEM_STYLE = { color: 'var(--popover-foreground)' };
const BAR_CHART_CURSOR = { fill: 'rgba(148, 163, 184, 0.12)' };
const LINE_CHART_CURSOR = { stroke: 'rgba(148, 163, 184, 0.38)', strokeWidth: 1 };
const CHART_AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 };
const CHART_AXIS_LINE = { stroke: 'var(--border)' };
const CHART_GRID_STROKE = 'var(--border)';
const CHART_LEGEND_STYLE = { color: 'var(--foreground)' };
const PIE_STROKE = 'var(--home-pie-stroke, #ffffff)';
const POSITIVE_CHART_COLOR = 'var(--home-positive-chart, #10b981)';
const NEGATIVE_CHART_COLOR = 'var(--home-negative-chart, #ef4444)';
const BALANCE_CHART_COLOR = 'var(--home-balance-chart, #3b82f6)';

const renderBalanceLegend = () => (
  <ul className="flex items-center justify-center gap-6 text-sm" style={{ color: 'var(--foreground)' }}>
    <li className="flex items-center gap-2">
      <span className="h-2.5 w-2.5" style={{ backgroundColor: POSITIVE_CHART_COLOR }} />
      <span>Receitas</span>
    </li>
    <li className="flex items-center gap-2">
      <span className="h-2.5 w-2.5" style={{ backgroundColor: NEGATIVE_CHART_COLOR }} />
      <span>Despesas</span>
    </li>
  </ul>
);

const renderSaldoLegend = () => (
  <ul className="flex items-center justify-center gap-6 text-sm" style={{ color: 'var(--foreground)' }}>
    <li className="flex items-center gap-2">
      <span className="h-2.5 w-2.5" style={{ backgroundColor: BALANCE_CHART_COLOR }} />
      <span>Saldo</span>
    </li>
  </ul>
);

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || '';
const isTrue = (value: boolean | number | string | null | undefined) => value === true || value === 1 || value === '1' || value === 'true';
const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const normalizeDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '');
const toMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const getMonthKeyFromInput = (value: string) => value.slice(0, 7);
const getDateFromInput = (value: string) => (value ? new Date(`${value}T00:00:00`) : null);
const getMonthKeysUntilCurrent = (quantity: number) => {
  const today = new Date();

  return new Set(
    Array.from({ length: quantity }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - index, 1);
      return toMonthKey(date);
    }),
  );
};
const sortByDateWithEmptyLast = (a: HomeItem, b: HomeItem) => {
  if (!a.data && !b.data) return 0;
  if (!a.data) return 1;
  if (!b.data) return -1;
  return a.data.localeCompare(b.data);
};

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

const mapCashEntry = (entry: ApiCashEntry, fallbackPrefix: string): HomeItem => ({
  id: entry.id,
  descricao: entry.description || `${fallbackPrefix} ${entry.id}`,
  valor: Number(entry.value || 0),
  data: normalizeDateInput(entry.incomeDate || entry.expenseDate),
  pago: true,
  tipoConta: entry.accountType?.description || 'Sem tipo',
});

export default function Home({ onNavigate }: HomeProps) {
  const [receivables, setReceivables] = useState<HomeItem[]>([]);
  const [payables, setPayables] = useState<HomeItem[]>([]);
  const [incomes, setIncomes] = useState<HomeItem[]>([]);
  const [expenses, setExpenses] = useState<HomeItem[]>([]);
  const [apiMonthlyData, setApiMonthlyData] = useState<MonthData[]>([]);
  const [piePeriod, setPiePeriod] = useState<PiePeriod>('mes-atual');
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
      const dashboardData = await fetchJson<HomeDashboardResponse>('/api/dashboard/home');

      setPayables((dashboardData.payables || []).map(mapAccount));
      setReceivables((dashboardData.receivables || []).map(mapAccount));
      setIncomes((dashboardData.incomes || []).map((entry) => mapCashEntry(entry, 'Receita')));
      setExpenses((dashboardData.expenses || []).map((entry) => mapCashEntry(entry, 'Despesa')));
      setApiMonthlyData(dashboardData.monthlyData || []);
    } catch {
      try {
        const [payablesData, receivablesData, incomesData, expensesData] = await Promise.all([
          fetchJson<ApiAccount[]>('/api/accounts-payable'),
          fetchJson<ApiAccount[]>('/api/accounts-receivable'),
          fetchJson<ApiCashEntry[]>('/api/incomes'),
          fetchJson<ApiCashEntry[]>('/api/expenses'),
        ]);

        setPayables((payablesData || []).map(mapAccount));
        setReceivables((receivablesData || []).map(mapAccount));
        setIncomes((incomesData || []).map((entry) => mapCashEntry(entry, 'Receita')));
        setExpenses((expensesData || []).map((entry) => mapCashEntry(entry, 'Despesa')));
        setApiMonthlyData([]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar home.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, []);

  const monthlyData = useMemo(() => {
    if (apiMonthlyData.length > 0) {
      return apiMonthlyData.map((month) => ({
        ...month,
        receitas: Number(month.receitas || 0),
        despesas: Number(month.despesas || 0),
      }));
    }

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

    incomes.forEach((item) => {
      const month = byKey.get(getMonthKeyFromInput(item.data));
      if (month) month.receitas += item.valor;
    });

    expenses.forEach((item) => {
      const month = byKey.get(getMonthKeyFromInput(item.data));
      if (month) month.despesas += item.valor;
    });

    return months;
  }, [apiMonthlyData, expenses, incomes]);

  const categoryData = useMemo(() => {
    const currentMonth = toMonthKey(new Date());
    const previousMonthDate = new Date();
    previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
    const previousMonth = toMonthKey(previousMonthDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = piePeriod === '30' ? Number(piePeriod) : 0;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (days - 1));
    const yearStart = new Date(today.getFullYear(), 0, 1);
    const monthQuantities: Partial<Record<PiePeriod, number>> = {
      '3-meses': 3,
      '6-meses': 6,
      '12-meses': 12,
    };
    const selectedMonthKeys = monthQuantities[piePeriod]
      ? getMonthKeysUntilCurrent(monthQuantities[piePeriod])
      : null;
    const totals = new Map<string, number>();

    expenses
      .filter((item) => {
        if (piePeriod === 'mes-atual') {
          return getMonthKeyFromInput(item.data) === currentMonth;
        }

        if (piePeriod === 'mes-anterior') {
          return getMonthKeyFromInput(item.data) === previousMonth;
        }

        if (selectedMonthKeys) {
          return selectedMonthKeys.has(getMonthKeyFromInput(item.data));
        }

        const itemDate = getDateFromInput(item.data);

        if (piePeriod === 'ano-atual') {
          return itemDate ? itemDate >= yearStart && itemDate <= today : false;
        }

        return itemDate ? itemDate >= startDate && itemDate <= today : false;
      })
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
  }, [expenses, piePeriod]);

  const piePeriodDescription = {
    'mes-atual': 'Distribuição no mês atual',
    'mes-anterior': 'Distribuição no mês anterior',
    '30': 'Distribuição nos últimos 30 dias',
    '3-meses': 'Distribuição nos últimos 3 meses',
    '6-meses': 'Distribuição nos últimos 6 meses',
    '12-meses': 'Distribuição nos últimos 12 meses',
    'ano-atual': 'Distribuição no ano atual',
  }[piePeriod];

  const emptyPieMessage = {
    'mes-atual': 'Nenhuma despesa no mês atual.',
    'mes-anterior': 'Nenhuma despesa no mês anterior.',
    '30': 'Nenhuma despesa nos últimos 30 dias.',
    '3-meses': 'Nenhuma despesa nos últimos 3 meses.',
    '6-meses': 'Nenhuma despesa nos últimos 6 meses.',
    '12-meses': 'Nenhuma despesa nos últimos 12 meses.',
    'ano-atual': 'Nenhuma despesa no ano atual.',
  }[piePeriod];

  const piePeriodShortLabel = {
    'mes-atual': 'Mês atual',
    'mes-anterior': 'Mês anterior',
    '30': '30 dias',
    '3-meses': '3 meses',
    '6-meses': '6 meses',
    '12-meses': '12 meses',
    'ano-atual': 'Ano atual',
  }[piePeriod];

  const pendingReceivables = useMemo(
    () => receivables.filter((item) => !item.pago).sort(sortByDateWithEmptyLast).slice(0, 2),
    [receivables],
  );

  const pendingPayables = useMemo(
    () => payables.filter((item) => !item.pago).sort(sortByDateWithEmptyLast).slice(0, 2),
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
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-emerald-300" />
          </CardHeader>
          <CardContent>
            <div className="text-green-600 dark:text-emerald-300">{formatCurrency(totalReceitas)}</div>
            <div className="flex items-center gap-2 mt-2">
              {totalReceitas >= (previousMonth?.receitas || 0) ? (
                <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-emerald-300" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-rose-300" />
              )}
              <span className="text-gray-500">{formatTrend(totalReceitas, previousMonth?.receitas || 0)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-gray-600">Despesas do Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600 dark:text-rose-300" />
          </CardHeader>
          <CardContent>
            <div className="text-red-600 dark:text-rose-300">{formatCurrency(totalDespesas)}</div>
            <div className="flex items-center gap-2 mt-2">
              {totalDespesas >= (previousMonth?.despesas || 0) ? (
                <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-rose-300" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-green-600 dark:text-emerald-300" />
              )}
              <span className="text-gray-500">{formatTrend(totalDespesas, previousMonth?.despesas || 0)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-gray-600">Saldo do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600 dark:text-sky-300" />
          </CardHeader>
          <CardContent>
            <div className="text-blue-600 dark:text-sky-300">{formatCurrency(saldo)}</div>
            <div className="flex items-center gap-2 mt-2">
              {saldo >= ((previousMonth?.receitas || 0) - (previousMonth?.despesas || 0)) ? (
                <ArrowUpRight className="h-4 w-4 text-blue-600 dark:text-sky-300" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-rose-300" />
              )}
              <span className="text-gray-500">{formatTrend(saldo, (previousMonth?.receitas || 0) - (previousMonth?.despesas || 0))}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-gray-600">Contas Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-amber-300" />
          </CardHeader>
          <CardContent>
            <div className="text-orange-600 dark:text-amber-300">{pendingReceivablesAll.length + pendingPayablesAll.length} contas</div>
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
            <CardDescription>Lançamentos mensais dos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="[--home-positive-chart:#10b981] [--home-negative-chart:#ef4444] dark:[--home-positive-chart:#8bd8b1] dark:[--home-negative-chart:#e7a0a9]">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} opacity={0.45} />
                  <XAxis dataKey="mes" tick={CHART_AXIS_TICK} axisLine={CHART_AXIS_LINE} tickLine={CHART_AXIS_LINE} />
                  <YAxis tick={CHART_AXIS_TICK} axisLine={CHART_AXIS_LINE} tickLine={CHART_AXIS_LINE} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(Number(value))}
                    contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
                    labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                    itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                    cursor={BAR_CHART_CURSOR}
                  />
                  <Legend content={renderBalanceLegend} />
                  <Bar dataKey="receitas" fill={POSITIVE_CHART_COLOR} name="Receitas" />
                  <Bar dataKey="despesas" fill={NEGATIVE_CHART_COLOR} name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolução do Saldo</CardTitle>
            <CardDescription>Saldo entre receitas e despesas lançadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="[--home-balance-chart:#3b82f6] dark:[--home-balance-chart:#7fb7e8]">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData.map((item) => ({ ...item, saldo: item.receitas - item.despesas }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} opacity={0.45} />
                <XAxis dataKey="mes" tick={CHART_AXIS_TICK} axisLine={CHART_AXIS_LINE} tickLine={CHART_AXIS_LINE} />
                <YAxis tick={CHART_AXIS_TICK} axisLine={CHART_AXIS_LINE} tickLine={CHART_AXIS_LINE} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(Number(value))}
                  contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                  cursor={LINE_CHART_CURSOR}
                />
                <Legend content={renderSaldoLegend} />
                <Line type="monotone" dataKey="saldo" stroke={BALANCE_CHART_COLOR} strokeWidth={2} name="Saldo" />
              </LineChart>
            </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Despesas por Tipo de Conta</CardTitle>
                <CardDescription>{piePeriodDescription}</CardDescription>
              </div>
              <Select value={piePeriod} onValueChange={(value) => setPiePeriod(value as PiePeriod)}>
                <SelectTrigger className="h-9 w-full cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100 sm:w-[150px]">
                  <SelectValue>{piePeriodShortLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes-atual" className="cursor-pointer">Mês atual</SelectItem>
                  <SelectItem value="mes-anterior" className="cursor-pointer">Mês anterior</SelectItem>
                  <SelectItem value="30" className="cursor-pointer">Últimos 30 dias</SelectItem>
                  <SelectItem value="3-meses" className="cursor-pointer">Últimos 3 meses</SelectItem>
                  <SelectItem value="6-meses" className="cursor-pointer">Últimos 6 meses</SelectItem>
                  <SelectItem value="12-meses" className="cursor-pointer">Últimos 12 meses</SelectItem>
                  <SelectItem value="ano-atual" className="cursor-pointer">Ano atual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                {emptyPieMessage}
              </div>
            ) : (
              <div className="[--home-pie-stroke:#ffffff] dark:[--home-pie-stroke:var(--card)]">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    stroke={PIE_STROKE}
                    strokeWidth={1}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(Number(value))}
                    contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
                    labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                    itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
              </div>
            )}
            {categoryData.length > 0 && (
              <div className="mt-6 space-y-2">
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
            <CardTitle>Pendências e Vencimentos</CardTitle>
            <CardDescription>Contas a receber e pagar em aberto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <div>
                <h4 className="text-green-600 dark:text-emerald-300 mb-2">A Receber</h4>
                <div className="space-y-2">
                  {pendingReceivables.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg dark:bg-[#273447] dark:border dark:border-[#374151] dark:border-l-2 dark:border-l-[#4ade80]/70">
                      <div>
                        <p className="text-gray-900 dark:text-slate-100">{item.descricao}</p>
                        <p className="text-gray-500 dark:text-slate-400">{getDaysLabel(item.data)}</p>
                      </div>
                      <div className="text-green-600 dark:text-[#8bd8b1]">{formatCurrency(item.valor)}</div>
                    </div>
                  ))}
                  {pendingReceivables.length === 0 && <p className="text-gray-500 dark:text-slate-400">Nenhuma conta a receber pendente.</p>}
                  {pendingReceivablesAll.length > pendingReceivables.length && (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto cursor-pointer px-2 py-1 font-normal text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-[#7fb7e8] dark:hover:bg-[#243043] dark:hover:text-[#9dccf0]"
                        onClick={() => onNavigate('receber')}
                      >
                        Ver todas
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-red-600 dark:text-rose-300 mb-2">A Pagar</h4>
                <div className="space-y-2">
                  {pendingPayables.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg dark:bg-[#273447] dark:border dark:border-[#374151] dark:border-l-2 dark:border-l-[#fb7185]/70">
                      <div>
                        <p className="text-gray-900 dark:text-slate-100">{item.descricao}</p>
                        <p className="text-gray-500 dark:text-slate-400">{getDaysLabel(item.data)}</p>
                      </div>
                      <div className="text-red-600 dark:text-[#e7a0a9]">{formatCurrency(item.valor)}</div>
                    </div>
                  ))}
                  {pendingPayables.length === 0 && <p className="text-gray-500 dark:text-slate-400">Nenhuma conta a pagar pendente.</p>}
                  {pendingPayablesAll.length > pendingPayables.length && (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto cursor-pointer px-2 py-1 font-normal text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-[#7fb7e8] dark:hover:bg-[#243043] dark:hover:text-[#9dccf0]"
                        onClick={() => onNavigate('pagar')}
                      >
                        Ver todas
                      </Button>
                    </div>
                  )}
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
                <Button
                  key={item.target}
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-start p-4 cursor-pointer whitespace-normal transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm dark:border-[#374151] dark:hover:border-[#4b5a72] dark:hover:bg-[#243043] dark:hover:shadow-md"
                  onClick={() => onNavigate(item.target)}
                >
                  <div className="flex min-w-0 items-start gap-3 text-left">
                    <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${item.color} dark:text-slate-200 transition-colors duration-200`} />
                    <div className="min-w-0">
                      <div className="text-gray-700 font-medium leading-tight break-words dark:text-slate-100">{item.title}</div>
                      <div className="text-gray-500 text-sm mt-1 dark:text-slate-400">{item.subtitle}</div>
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
