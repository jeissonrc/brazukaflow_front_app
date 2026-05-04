import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const monthlyData = [
  { mes: 'Jan', receitas: 45000, despesas: 32000 },
  { mes: 'Fev', receitas: 52000, despesas: 38000 },
  { mes: 'Mar', receitas: 48000, despesas: 35000 },
  { mes: 'Abr', receitas: 61000, despesas: 42000 },
  { mes: 'Mai', receitas: 55000, despesas: 40000 },
  { mes: 'Jun', receitas: 67000, despesas: 45000 },
];

const categoryData = [
  { name: 'Salários', value: 25000, color: '#ef4444' },
  { name: 'Aluguel', value: 8000, color: '#f59e0b' },
  { name: 'Fornecedores', value: 12000, color: '#3b82f6' },
  { name: 'Impostos', value: 7000, color: '#8b5cf6' },
  { name: 'Outros', value: 5000, color: '#10b981' },
];

const pendingReceivables = [
  { id: 1, cliente: 'Empresa ABC Ltda', valor: 15000, vencimento: '2025-10-25', dias: 5 },
  { id: 2, cliente: 'João Silva ME', valor: 8500, vencimento: '2025-10-28', dias: 8 },
  { id: 3, cliente: 'Tech Solutions', valor: 22000, vencimento: '2025-11-02', dias: 13 },
];

const pendingPayables = [
  { id: 1, fornecedor: 'Aluguel - Imóvel Central', valor: 8000, vencimento: '2025-10-22', dias: 2 },
  { id: 2, fornecedor: 'Energia Elétrica', valor: 3200, vencimento: '2025-10-24', dias: 4 },
  { id: 3, fornecedor: 'Fornecedor XYZ', valor: 12500, vencimento: '2025-10-26', dias: 6 },
];

export default function DashboardOverview() {
  const totalReceitas = monthlyData[monthlyData.length - 1].receitas;
  const totalDespesas = monthlyData[monthlyData.length - 1].despesas;
  const saldo = totalReceitas - totalDespesas;
  const totalReceber = pendingReceivables.reduce((acc, item) => acc + item.valor, 0);
  const totalPagar = pendingPayables.reduce((acc, item) => acc + item.valor, 0);

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-gray-600">Receitas do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-green-600">
              {totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <ArrowUpRight className="h-4 w-4 text-green-600" />
              <span className="text-green-600">+12.5%</span>
              <span className="text-gray-500">vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-gray-600">Despesas do Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-red-600">
              {totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <ArrowUpRight className="h-4 w-4 text-red-600" />
              <span className="text-red-600">+8.2%</span>
              <span className="text-gray-500">vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-gray-600">Saldo do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-blue-600">
              {saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <ArrowUpRight className="h-4 w-4 text-blue-600" />
              <span className="text-blue-600">+18.7%</span>
              <span className="text-gray-500">vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-gray-600">Contas Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-orange-600">
              {(pendingReceivables.length + pendingPayables.length)} contas
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-gray-500">
                {pendingReceivables.length} a receber, {pendingPayables.length} a pagar
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
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
                <Tooltip
                  formatter={(value: number) =>
                    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  }
                />
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
              <LineChart data={monthlyData.map(d => ({ ...d, saldo: d.receitas - d.despesas }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) =>
                    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  }
                />
                <Legend />
                <Line type="monotone" dataKey="saldo" stroke="#3b82f6" strokeWidth={2} name="Saldo" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Despesas por Categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
            <CardDescription>Distribuição no mês atual</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) =>
                    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  }
                />
              </PieChart>
            </ResponsiveContainer>
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
                        <p className="text-gray-900">{item.cliente}</p>
                        <p className="text-gray-500">Vence em {item.dias} dias</p>
                      </div>
                      <div className="text-green-600">
                        {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-red-600 mb-3">A Pagar</h4>
                <div className="space-y-2">
                  {pendingPayables.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="text-gray-900">{item.fornecedor}</p>
                        <p className="text-gray-500">Vence em {item.dias} dias</p>
                      </div>
                      <div className="text-red-600">
                        {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
