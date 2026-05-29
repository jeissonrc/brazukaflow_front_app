import { toast } from 'sonner@2.0.3';
import { Toaster } from './components/ui/sonner';
import { useEffect, useState } from 'react';
import { Home as HomeIcon, TrendingUp, TrendingDown, Wallet, DollarSign, FolderTree, Users, Menu, CreditCard, FileText, LogOut, Wrench } from 'lucide-react';
import { Button } from './components/ui/button';
import { Switch } from './components/ui/switch';
import Home from './components/Home';
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
import Auditoria from './components/Auditoria';
import Manutencao from './components/Manutencao';
import Backup from './components/Backup';
import ConfiguracoesLogs from './components/ConfiguracoesLogs';
import Login from './components/Login';
import TiposContas from './components/TiposContas';
import Categorias from './components/Categorias';
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from './lib/auth';
import { canManageSystem, getRoleByProfileId } from './lib/profileRoles';

type MenuOption = 'home' | 'dashboard' | 'dashboard-simples' | 'receber' | 'pagar' | 'receitas' | 'despesas' | 'plano-contas' | 'tipos-pagamento' | 'relatorios' | 'manutencao' | 'auditoria' | 'backup' | 'configuracoes-logs' | 'usuarios' | 'tipos-contas' | 'categorias';

const THEME_STORAGE_KEY = 'brazukaflow.theme';

type AuthUser = {
  id: number;
  username: string;
  name: string;
  active: number;
  profileId: number | null;
  profile?: {
    id: number;
    name: string;
  };
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [activeMenu, setActiveMenu] = useState<MenuOption>('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkThemePreview, setDarkThemePreview] = useState(false);

  const applyTheme = (isDark: boolean) => {
    document.documentElement.classList.toggle('dark', isDark);
  };

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const isDark = storedTheme === 'dark';
    setDarkThemePreview(isDark);
    applyTheme(isDark);

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

  const handleThemeChange = (checked: boolean) => {
    setDarkThemePreview(checked);
    localStorage.setItem(THEME_STORAGE_KEY, checked ? 'dark' : 'light');
    applyTheme(checked);
  };

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
    setActiveMenu('home');
    toast.success('Você saiu do sistema com sucesso!');
  };

  const authUserRole = getRoleByProfileId(authUser?.profileId ?? authUser?.profile?.id);
  const authUserCanManageSystem = canManageSystem(authUserRole);

  const menuItems = [
    { id: 'home' as MenuOption, label: 'Home', icon: HomeIcon },
    { id: 'receber' as MenuOption, label: 'Contas a Receber', icon: TrendingUp },
    { id: 'pagar' as MenuOption, label: 'Contas a Pagar', icon: TrendingDown },
    { id: 'receitas' as MenuOption, label: 'Receitas', icon: DollarSign },
    { id: 'despesas' as MenuOption, label: 'Despesas', icon: Wallet },
    ...(authUserCanManageSystem
      ? [
          { id: 'plano-contas' as MenuOption, label: 'Plano de Contas', icon: FolderTree },
          { id: 'tipos-pagamento' as MenuOption, label: 'Tipos de Pagamento', icon: CreditCard },
        ]
      : []),
    { id: 'relatorios' as MenuOption, label: 'Relatórios', icon: FileText },
    ...(authUserRole === 'super_admin'
      ? [{ id: 'manutencao' as MenuOption, label: 'Manutenção', icon: Wrench }]
      : []),
    { id: 'usuarios' as MenuOption, label: authUserCanManageSystem ? 'Usuários' : 'Minha Conta', icon: Users },
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
      case 'home':
        return <Home onNavigate={(target) => setActiveMenu(target)} />;
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
      case 'manutencao':
        return <Manutencao onNavigate={(target) => {
          if (target === 'auditoria') setActiveMenu('auditoria');
          if (target === 'backup') setActiveMenu('backup');
          if (target === 'configuracoes-logs') setActiveMenu('configuracoes-logs');
        }} />;
      case 'auditoria':
        return <Auditoria onBack={() => setActiveMenu('manutencao')} />;
      case 'backup':
        return <Backup onBack={() => setActiveMenu('manutencao')} />;
      case 'configuracoes-logs':
        return <ConfiguracoesLogs onBack={() => setActiveMenu('manutencao')} />;
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
  const pageTitle =
    activeMenu === 'tipos-contas'
      ? 'Tipos de Contas'
      : activeMenu === 'categorias'
        ? 'Categorias'
        : activeMenu === 'dashboard'
          ? 'Dashboard Completo'
            : activeMenu === 'dashboard-simples'
              ? 'Dashboard Simples'
              : activeMenu === 'auditoria'
                ? 'Auditoria'
                : activeMenu === 'backup'
                  ? 'Backup'
                  : activeMenu === 'configuracoes-logs'
                    ? 'Configurações de Logs'
                : menuItems.find((item) => item.id === activeMenu)?.label;

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-[#1d2636] dark:text-slate-100">
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
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-white text-left text-sm cursor-pointer ${
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
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-white hover:bg-[#015080] text-left text-sm cursor-pointer"
              >
                <LogOut className="w-5 h-5 shrink-0" style={{ color: '#5ba3c9' }} />
                <span className="break-words">Desconectar</span>
              </button>
            </li>
          </ul>
        </nav>

        <div className="px-4 pt-1.5 pb-2 border-t" style={{ 
          backgroundColor: '#002a4a',
          borderColor: 'rgba(255, 255, 255, 0.1)' 
        }}>
          <div className="flex items-center gap-3 px-4 pt-1.5 pb-3.5">
            <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white text-sm shrink-0">
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

          <div className="-mx-4 h-px bg-white/10 shadow-[0_1px_0_rgba(0,0,0,0.22)]" />

          <div className="flex min-h-7 items-center justify-between gap-3 px-4 pt-3 pb-1.5 text-xs leading-none text-white/65">
            <span className="truncate leading-none">Tema escuro</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] leading-none text-white/45">{darkThemePreview ? 'Ativado' : 'Desativado'}</span>
              <Switch
                aria-label="Alternar tema escuro"
                checked={darkThemePreview}
                onCheckedChange={handleThemeChange}
                className="scale-90 cursor-pointer data-[state=unchecked]:bg-white/20 data-[state=checked]:bg-[#00A676]"
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full lg:w-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 transition-colors dark:bg-[#1f2937] dark:border-[#2f394a]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="shrink-0 cursor-pointer dark:text-slate-100 dark:hover:bg-[#273447]"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <h2 className="text-gray-900 truncate dark:text-slate-100">
                {pageTitle}
              </h2>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <span className="text-gray-600 dark:text-slate-300">
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
        <main className="flex-1 overflow-auto p-4 md:p-6 transition-colors dark:bg-[#1d2636]">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
