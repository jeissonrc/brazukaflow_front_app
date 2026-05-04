import { toast } from 'sonner@2.0.3';
import { Toaster } from './components/ui/sonner';
import { useEffect, useState } from 'react';
import { Home, TrendingUp, TrendingDown, Wallet, DollarSign, FolderTree, Users, Menu, CreditCard, FileText, LogOut } from 'lucide-react';
import { Button } from './components/ui/button';
import DashboardOverview from './components/DashboardOverview';
import DashboardSimples from './components/DashboardSimples';
import ContasReceber from './components/ContasReceber';
import ContasPagar from './components/ContasPagar';
import Receitas from './components/Receitas';
import Despesas from './components/Despesas';
import PlanoContas from './components/PlanoContas';
import TiposPagamento from './components/TiposPagamento';
import Usuarios from './components/Usuarios';
import Relatorios from './components/Relatorios';
import Login from './components/Login';
import TiposContas from './components/TiposContas';
import Categorias from './components/Categorias';
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from './lib/auth';

type MenuOption = 'dashboard' | 'dashboard-simples' | 'receber' | 'pagar' | 'receitas' | 'despesas' | 'plano-contas' | 'tipos-pagamento' | 'relatorios' | 'usuarios' | 'tipos-contas' | 'categorias';

type AuthUser = {
  id: number;
  username: string;
  name: string;
  active: number;
  profileId: number | null;
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [activeMenu, setActiveMenu] = useState<MenuOption>('dashboard-simples');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const userRaw = localStorage.getItem(AUTH_USER_KEY);

    if (!token || !userRaw) {
      return;
    }

    try {
      const parsedUser = JSON.parse(userRaw) as AuthUser;
      setAuthUser(parsedUser);
      setIsLoggedIn(true);
    } catch {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    }
  }, []);

  const handleLogin = ({ user, token }: { user: AuthUser; token: string }) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    setAuthUser(user);
    setIsLoggedIn(true);
    toast.success(`Bem-vindo, ${user.name}!`);
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setAuthUser(null);
    setIsLoggedIn(false);
    setActiveMenu('dashboard-simples');
    toast.success('Você saiu do sistema com sucesso!');
  };

  const menuItems = [
    { id: 'dashboard-simples' as MenuOption, label: 'Dashboard Simples', icon: Home },
    { id: 'dashboard' as MenuOption, label: 'Dashboard Completo', icon: Home },
    { id: 'receber' as MenuOption, label: 'Contas a Receber', icon: TrendingUp },
    { id: 'pagar' as MenuOption, label: 'Contas a Pagar', icon: TrendingDown },
    { id: 'receitas' as MenuOption, label: 'Receitas', icon: DollarSign },
    { id: 'despesas' as MenuOption, label: 'Despesas', icon: Wallet },
    { id: 'plano-contas' as MenuOption, label: 'Plano de Contas', icon: FolderTree },
    { id: 'tipos-pagamento' as MenuOption, label: 'Tipos de Pagamento', icon: CreditCard },
    { id: 'relatorios' as MenuOption, label: 'Relatórios', icon: FileText },
    { id: 'usuarios' as MenuOption, label: 'Usuários', icon: Users },
  ];

  if (!isLoggedIn) {
    return (
      <>
        <Toaster />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard-simples':
        return <DashboardSimples />;
      case 'dashboard':
        return <DashboardOverview />;
      case 'receber':
        return <ContasReceber />;
      case 'pagar':
        return <ContasPagar />;
      case 'receitas':
        return <Receitas />;
      case 'despesas':
        return <Despesas />;
      case 'plano-contas':
        return <PlanoContas onNavigateToTipos={() => setActiveMenu('tipos-contas')} />;
      case 'tipos-pagamento':
        return <TiposPagamento />;
      case 'relatorios':
        return <Relatorios />;
      case 'usuarios':
        return <Usuarios />;
      case 'tipos-contas':
        return <TiposContas onNavigateToCategorias={() => setActiveMenu('categorias')} onBack={() => setActiveMenu('plano-contas')} />;
      case 'categorias':
        return <Categorias onBack={() => setActiveMenu('tipos-contas')} />;
      default:
        return <DashboardSimples />;
    }
  };

  // Verifica se está em uma sub-página
  const isSubPage = activeMenu === 'tipos-contas' || activeMenu === 'categorias';

  return (
    <div className="flex h-screen bg-gray-50">
      <Toaster />
      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:static inset-y-0 left-0 z-50 w-64 border-r border-gray-200 transition-transform duration-300 flex flex-col lg:translate-x-0`}
        style={{ backgroundColor: '#013A63' }}
      >
        <div className="p-6 border-b flex items-center justify-center" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <h1 className="text-2xl" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}>
            <span style={{ color: '#00A676' }}>BR</span>
            <span style={{ color: '#F9C74F' }}>azuca</span>
            <span style={{ color: '#FFFFFF' }}>Flow</span>
          </h1>
        </div>
        
        <nav className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600/50 scrollbar-track-transparent">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setActiveMenu(item.id);
                      // Fecha o menu no mobile após clicar
                      if (window.innerWidth < 1024) {
                        setSidebarOpen(false);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-white text-left text-sm ${
                      isActive
                        ? 'bg-[#015a8a] hover:bg-[#016a9f]'
                        : 'hover:bg-[#015080]'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" style={{ 
                      color: isActive ? '#00A676' : '#5ba3c9' 
                    }} />
                    <span className="break-words">{item.label}</span>
                  </button>
                </li>
              );
            })}
            
            {/* Botão Desconectar como último item do menu */}
            <li>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-white hover:bg-[#015080] text-left text-sm"
              >
                <LogOut className="w-5 h-5 shrink-0" style={{ color: '#5ba3c9' }} />
                <span className="break-words">Desconectar</span>
              </button>
            </li>
          </ul>
        </nav>

        <div className="p-4 border-t" style={{ 
          backgroundColor: '#002a4a',
          borderColor: 'rgba(255, 255, 255, 0.1)' 
        }}>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white shrink-0">
              {(authUser?.name || 'U')
                .split(' ')
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() || '')
                .join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white truncate text-sm font-medium">{authUser?.name || 'Usuário'}</p>
              <p className="text-gray-300 text-xs truncate">{authUser?.username || 'usuario'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full lg:w-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="shrink-0"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <h2 className="text-gray-900 truncate">
                {activeMenu === 'tipos-contas' ? 'Tipos de Contas' : activeMenu === 'categorias' ? 'Categorias' : menuItems.find((item) => item.id === activeMenu)?.label}
              </h2>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <span className="text-gray-600">
                {new Date().toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
