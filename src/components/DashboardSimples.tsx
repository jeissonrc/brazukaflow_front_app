import { DollarSign, TrendingUp, TrendingDown, Calendar, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

export default function DashboardSimples() {
  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Banner de Boas-Vindas */}
      <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white border-0">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl mb-2">Bem-vindo ao BRazucaFlow</h1>
              <p className="text-green-100">
                Gerencie suas finanças de forma simples e eficiente
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span className="capitalize">{mesAtual}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo Financeiro Simplificado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-gray-600">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Receitas do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-green-600">
              R$ 45.200,00
            </div>
            <p className="text-gray-500 mt-1">5 lançamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-gray-600">
              <TrendingDown className="w-5 h-5 text-red-600" />
              Despesas do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-red-600">
              R$ 42.750,00
            </div>
            <p className="text-gray-500 mt-1">6 lançamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-gray-600">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Saldo do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-blue-600">
              R$ 2.450,00
            </div>
            <Badge className="bg-green-100 text-green-700 mt-2">
              +5.7% vs mês anterior
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-gray-600">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Contas Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-yellow-600">
              4 contas
            </div>
            <p className="text-gray-500 mt-1">R$ 27.900,00</p>
          </CardContent>
        </Card>
      </div>

      {/* Informações Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Próximos Vencimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div>
                  <p className="font-medium">Aluguel Out/2025</p>
                  <p className="text-gray-600">Vence em 22/10/2025</p>
                </div>
                <div className="text-right">
                  <p className="text-red-600">R$ 8.000,00</p>
                  <Badge className="bg-yellow-100 text-yellow-700 mt-1">Pendente</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div>
                  <p className="font-medium">Conta de luz - Set/2025</p>
                  <p className="text-gray-600">Vence em 24/10/2025</p>
                </div>
                <div className="text-right">
                  <p className="text-red-600">R$ 3.200,00</p>
                  <Badge className="bg-yellow-100 text-yellow-700 mt-1">Pendente</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div>
                  <p className="font-medium">Matéria prima diversos</p>
                  <p className="text-gray-600">Vence em 26/10/2025</p>
                </div>
                <div className="text-right">
                  <p className="text-red-600">R$ 12.500,00</p>
                  <Badge className="bg-yellow-100 text-yellow-700 mt-1">Pendente</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimas Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <p className="font-medium">Venda de produtos - Lote A</p>
                  <p className="text-gray-600">15/10/2025</p>
                </div>
                <div className="text-right">
                  <p className="text-green-600">R$ 15.000,00</p>
                  <Badge variant="outline">Vendas</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <p className="font-medium">Consultoria especializada</p>
                  <p className="text-gray-600">10/10/2025</p>
                </div>
                <div className="text-right">
                  <p className="text-green-600">R$ 12.000,00</p>
                  <Badge variant="outline">Serviços</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <p className="font-medium">Prestação de serviços mensais</p>
                  <p className="text-gray-600">01/10/2025</p>
                </div>
                <div className="text-right">
                  <p className="text-green-600">R$ 8.500,00</p>
                  <Badge variant="outline">Serviços</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dicas e Avisos */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">Dica do Sistema</h3>
              <p className="text-blue-800">
                Mantenha suas contas em dia e evite juros! Você tem 3 contas com vencimento nos próximos 7 dias.
                Use os filtros nos relatórios para obter análises mais detalhadas da sua situação financeira.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Links Rápidos */}
      <Card>
        <CardHeader>
          <CardTitle>Acesso Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors text-left">
              <div className="text-gray-700 font-medium">Contas a Pagar</div>
              <div className="text-gray-500 text-sm mt-1">Gerenciar</div>
            </button>
            <button className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors text-left">
              <div className="text-gray-700 font-medium">Contas a Receber</div>
              <div className="text-gray-500 text-sm mt-1">Gerenciar</div>
            </button>
            <button className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors text-left">
              <div className="text-gray-700 font-medium">Relatórios</div>
              <div className="text-gray-500 text-sm mt-1">Visualizar</div>
            </button>
            <button className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors text-left">
              <div className="text-gray-700 font-medium">Plano de Contas</div>
              <div className="text-gray-500 text-sm mt-1">Configurar</div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
