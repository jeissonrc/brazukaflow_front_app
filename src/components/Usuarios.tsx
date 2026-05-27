import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Shield, User, Eye, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Switch } from './ui/switch';
import { AUTH_USER_KEY, getAuthToken } from '../lib/auth';
import { PROFILE_IDS, canManageSystem, getRoleByProfileId, type UserRole } from '../lib/profileRoles';

type Profile = {
  id: number;
  name: string;
};

type ApiUser = {
  id: number;
  username: string;
  name: string;
  active: number;
  profileId: number | null;
  profile?: Profile;
};

type Usuario = {
  id: number;
  nome: string;
  login: string;
  perfil: UserRole;
  status: 'ativo' | 'inativo';
};

type UsuarioForm = {
  nome: string;
  login: string;
  senha: string;
  perfil: 'admin' | 'operational';
  ativo: boolean;
};

type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis';

type AuthUser = {
  id: number;
  profileId: number | null;
  profile?: Profile;
};

type UsuariosPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type UsuariosSummary = {
  total: number;
  ativos: number;
  admins: number;
  comuns: number;
  activeAdmins: number;
  activeUsers: number;
};

type UsuariosPaginatedResponse = {
  items: ApiUser[];
  pagination: UsuariosPagination;
  summary: UsuariosSummary;
};

const DEFAULT_FORM: UsuarioForm = {
  nome: '',
  login: '',
  senha: '',
  perfil: 'operational',
  ativo: true,
};

const DEFAULT_PAGINATION: UsuariosPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

const DEFAULT_SUMMARY: UsuariosSummary = {
  total: 0,
  ativos: 0,
  admins: 0,
  comuns: 0,
  activeAdmins: 0,
  activeUsers: 0,
};

const calculateUsuariosSummary = (items: Usuario[]): UsuariosSummary =>
  items.reduce(
    (acc, usuario) => {
      acc.total += 1;
      if (usuario.status === 'ativo') {
        acc.ativos += 1;
        acc.activeUsers += 1;
      }
      if (usuario.perfil === 'admin') {
        acc.admins += 1;
        if (usuario.status === 'ativo') acc.activeAdmins += 1;
      }
      if (usuario.perfil === 'operational') acc.comuns += 1;
      return acc;
    },
    { total: 0, ativos: 0, admins: 0, comuns: 0, activeAdmins: 0, activeUsers: 0 },
  );

const normalizeUsuariosSummary = (summary?: Partial<UsuariosSummary>): UsuariosSummary => ({
  ...DEFAULT_SUMMARY,
  ...summary,
  activeAdmins: summary?.activeAdmins ?? summary?.admins ?? 0,
  activeUsers: summary?.activeUsers ?? summary?.ativos ?? 0,
});

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || '';

const mapApiUserToUsuario = (user: ApiUser): Usuario => ({
  id: user.id,
  nome: user.name,
  login: user.username,
  perfil: getRoleByProfileId(user.profileId ?? user.profile?.id),
  status: user.active ? 'ativo' : 'inativo',
});

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState<UsuarioForm>(DEFAULT_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sortColumn, setSortColumn] = useState<keyof Usuario | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [pagination, setPagination] = useState<UsuariosPagination>(DEFAULT_PAGINATION);
  const [summary, setSummary] = useState<UsuariosSummary>(DEFAULT_SUMMARY);
  const scrollToPaginationBottomRef = useRef(false);
  const fetchUsersRequestRef = useRef(0);
  const paginationRef = useRef<HTMLDivElement>(null);

  const adminProfileId = useMemo(() => {
    return profiles.find((profile) => Number(profile.id) === PROFILE_IDS.ADMIN)?.id ?? PROFILE_IDS.ADMIN;
  }, [profiles]);

  const operationalProfileId = useMemo(() => {
    return profiles.find((profile) => Number(profile.id) === PROFILE_IDS.OPERATIONAL)?.id ?? PROFILE_IDS.OPERATIONAL;
  }, [profiles]);

  const authUser = useMemo(() => {
    const userRaw = localStorage.getItem(AUTH_USER_KEY);
    if (!userRaw) return null;

    try {
      return JSON.parse(userRaw) as AuthUser;
    } catch {
      return null;
    }
  }, []);

  const authUserRole = useMemo(() => {
    return getRoleByProfileId(authUser?.profileId ?? authUser?.profile?.id);
  }, [authUser]);
  const authUserCanManageUsers = canManageSystem(authUserRole);

  const activeAdminCount = summary.activeAdmins ?? summary.admins;
  const activeUserCount = summary.activeUsers ?? summary.ativos;

  const isCurrentUser = (usuarioId?: number | null) => Number(authUser?.id) === Number(usuarioId);

  const getProfileIdByRole = (role: 'admin' | 'operational') => {
    if (role === 'admin') {
      return adminProfileId ?? operationalProfileId;
    }
    return operationalProfileId ?? adminProfileId;
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

  const fetchUsers = async () => {
    const requestId = fetchUsersRequestRef.current + 1;
    fetchUsersRequestRef.current = requestId;
    setIsLoading(true);

    if (!authUserCanManageUsers && authUser?.id) {
      const response = await fetch(`${getApiBaseUrl()}/api/users/${authUser.id}`, {
        headers: getAuthHeaders(),
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao carregar sua conta.');
      }

      const usuario = mapApiUserToUsuario(result.data as ApiUser);
      const ownUsers =
        !debouncedSearchTerm ||
        usuario.nome.toLowerCase().includes(debouncedSearchTerm) ||
        usuario.login.toLowerCase().includes(debouncedSearchTerm) ||
        usuario.perfil.toLowerCase().includes(debouncedSearchTerm)
          ? [usuario]
          : [];

      if (requestId !== fetchUsersRequestRef.current) return;

      setUsuarios(ownUsers);
      setPagination({
        page: 1,
        limit: registrosPorPagina,
        total: ownUsers.length,
        totalPages: 1,
      });
      setSummary(calculateUsuariosSummary(ownUsers));
      setIsLoading(false);
      return;
    }

    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(registrosPorPagina),
    });

    if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
    if (sortColumn) {
      params.set('sortBy', String(sortColumn));
      params.set('sortDirection', sortDirection);
    }

    const response = await fetch(`${getApiBaseUrl()}/api/users?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao carregar usuários.');
    }

    const responseData = result.data as UsuariosPaginatedResponse | ApiUser[];
    const isLegacyArrayResponse = Array.isArray(responseData);
    const isVisibleUsuario = (usuario: Usuario) => authUserRole === 'super_admin' || usuario.perfil !== 'super_admin';
    const legacyItems = isLegacyArrayResponse ? responseData.map(mapApiUserToUsuario).filter(isVisibleUsuario) : [];
    const legacyFilteredItems = legacyItems.filter(
      (usuario) =>
        !debouncedSearchTerm ||
        usuario.nome.toLowerCase().includes(debouncedSearchTerm) ||
        usuario.login.toLowerCase().includes(debouncedSearchTerm) ||
        usuario.perfil.toLowerCase().includes(debouncedSearchTerm),
    );
    const sortSuperAdminFirst = (items: Usuario[]) =>
      [...items].sort((a, b) => {
        if (a.perfil === 'super_admin' && b.perfil !== 'super_admin') return -1;
        if (a.perfil !== 'super_admin' && b.perfil === 'super_admin') return 1;
        return 0;
      });
    const legacySortedItems = sortSuperAdminFirst([...legacyFilteredItems].sort((a, b) => {
      if (!sortColumn) return 0;
      const aValue = String(a[sortColumn]);
      const bValue = String(b[sortColumn]);
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }));
    const legacyStartIndex = (currentPage - 1) * registrosPorPagina;
    const legacyPaginatedItems = legacySortedItems.slice(legacyStartIndex, legacyStartIndex + registrosPorPagina);
    const legacyPagination = {
      page: currentPage,
      limit: registrosPorPagina,
      total: legacyFilteredItems.length,
      totalPages: Math.max(1, Math.ceil(legacyFilteredItems.length / registrosPorPagina)),
    };
    const apiItems = isLegacyArrayResponse ? legacyPaginatedItems : responseData?.items || [];
    let mappedUsers = sortSuperAdminFirst((isLegacyArrayResponse ? legacyPaginatedItems : apiItems.map(mapApiUserToUsuario)).filter(isVisibleUsuario));
    let pinnedSuperAdmin: Usuario | null = null;

    if (authUserRole === 'super_admin' && authUser?.id) {
      const superAdminResponse = await fetch(`${getApiBaseUrl()}/api/users/${authUser.id}`, {
        headers: getAuthHeaders(),
      });
      const superAdminResult = await superAdminResponse.json();

      if (superAdminResponse.ok && superAdminResult?.success) {
        pinnedSuperAdmin = mapApiUserToUsuario(superAdminResult.data as ApiUser);
      }
    }

    const pinnedSuperAdminMatchesSearch =
      pinnedSuperAdmin &&
      (!debouncedSearchTerm ||
        pinnedSuperAdmin.nome.toLowerCase().includes(debouncedSearchTerm) ||
        pinnedSuperAdmin.login.toLowerCase().includes(debouncedSearchTerm) ||
        pinnedSuperAdmin.perfil.toLowerCase().includes(debouncedSearchTerm));

    if (pinnedSuperAdmin && pinnedSuperAdminMatchesSearch) {
      mappedUsers = [
        pinnedSuperAdmin,
        ...mappedUsers.filter((usuario) => usuario.id !== pinnedSuperAdmin.id),
      ];
    }
    const hiddenUsersOnPage = apiItems.length - mappedUsers.length;
    const apiTotal = responseData?.pagination?.total || mappedUsers.length;
    const visiblePagination = isLegacyArrayResponse
      ? legacyPagination
      : {
          ...(responseData?.pagination || DEFAULT_PAGINATION),
          total: Math.max(0, apiTotal - hiddenUsersOnPage),
          totalPages: Math.max(1, Math.ceil(Math.max(0, apiTotal - hiddenUsersOnPage) / registrosPorPagina)),
        };

    if (requestId !== fetchUsersRequestRef.current) return;

    setUsuarios(mappedUsers);
    setPagination(visiblePagination);
    setSummary(isLegacyArrayResponse ? calculateUsuariosSummary(legacyItems) : normalizeUsuariosSummary(responseData?.summary));
    setIsLoading(false);
  };

  const fetchProfiles = async () => {
    const response = await fetch(`${getApiBaseUrl()}/api/profiles`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao carregar perfis.');
    }

    setProfiles((result.data || []) as Profile[]);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await fetchProfiles();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar dados de usuários.');
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    fetchUsers().catch((error) => {
      setIsLoading(false);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar usuários.');
    });
  }, [currentPage, registrosPorPagina, debouncedSearchTerm, sortColumn, sortDirection, authUserCanManageUsers, authUser?.id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [registrosPorPagina, debouncedSearchTerm, sortColumn, sortDirection]);

  useEffect(() => {
    if (currentPage > pagination.totalPages) {
      setCurrentPage(pagination.totalPages);
    }
  }, [currentPage, pagination.totalPages]);

  useEffect(() => {
    if (!isLoading && scrollToPaginationBottomRef.current) {
      scrollToPaginationBottomRef.current = false;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          paginationRef.current?.scrollIntoView({ block: 'end', behavior: 'auto' });
          paginationRef.current?.closest('main')?.scrollBy({ top: 80, behavior: 'auto' });
        });
      });
    }
  }, [isLoading, usuarios]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim().toLowerCase());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  const scrollToPaginationBottomAfterLoad = () => {
    scrollToPaginationBottomRef.current = true;
  };

  const handleRegistrosPorPaginaChange = (value: string) => {
    scrollToPaginationBottomAfterLoad();
    setCurrentPage(1);
    setRegistrosPorPagina(Number(value));
  };

  const handlePageChange = (page: number) => {
    scrollToPaginationBottomAfterLoad();
    setCurrentPage(page);
  };

  const handleSort = (column: keyof Usuario) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: keyof Usuario) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1 inline" /> : <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  const getPerfilBadge = (perfil: string) => {
    if (perfil === 'super_admin') {
      return (
        <Badge className="bg-cyan-50 text-cyan-700 border border-cyan-200 dark:border-[#334b5f] dark:bg-[#273447] dark:text-[#9edcf2]">
          <Shield className="w-3 h-3 mr-1" />
          Super Admin
        </Badge>
      );
    }

    if (perfil === 'admin') {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 dark:border-[#2f394a] dark:bg-[#273447] dark:text-[#f6d365]">
          <Shield className="w-3 h-3 mr-1" />
          Administrador
        </Badge>
      );
    }

    return (
      <Badge className="bg-gray-100 text-slate-500 dark:border-[#2f394a] dark:bg-[#273447] dark:text-zinc-400">
        <User className="w-3 h-3 mr-1" />
        Operacional
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'ativo') {
      return (
        <Badge className="bg-green-100 text-green-700 dark:border-[#2f394a] dark:bg-[#273447] dark:text-[#8bd8b1]">
          Ativo
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-700 dark:border-[#2f394a] dark:bg-[#273447] dark:text-[#e7a0a9]">
        Inativo
      </Badge>
    );
  };

  const getInitials = (nome: string) =>
    nome
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const ensureCanManageUsers = () => {
    if (!authUserCanManageUsers) {
      toast.error('Apenas usuários administradores podem gerenciar usuários.');
      return false;
    }

    return true;
  };

  const canEditUsuario = (usuario: Usuario) => authUserCanManageUsers || isCurrentUser(usuario.id);
  const isSuperAdminSelfEdit = Boolean(editingUsuario?.perfil === 'super_admin' && isCurrentUser(editingUsuario.id));
  const isOwnLimitedEdit = Boolean((!authUserCanManageUsers || isSuperAdminSelfEdit) && editingUsuario && isCurrentUser(editingUsuario.id));

  const openCreateDialog = () => {
    if (!ensureCanManageUsers()) {
      return;
    }

    setEditingUsuario(null);
    setFormData(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const handleEdit = (usuario: Usuario) => {
    if (!canEditUsuario(usuario)) {
      toast.error('Usuário operacional pode alterar apenas a própria conta.');
      return;
    }

    setEditingUsuario(usuario);
    setFormData({
      nome: usuario.nome,
      login: usuario.login,
      senha: '',
      perfil: usuario.perfil === 'admin' ? 'admin' : 'operational',
      ativo: usuario.status === 'ativo',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    const usuario = usuarios.find((item) => item.id === id);

    if (!ensureCanManageUsers()) {
      return;
    }

    if (isCurrentUser(usuario?.id)) {
      toast.error('Usuário não pode remover a si mesmo.');
      return;
    }

    if (usuario?.status === 'ativo' && activeUserCount <= 1) {
      toast.error('Não é possível remover o único usuário ativo do sistema.');
      return;
    }

    if (authUserRole !== 'super_admin' && usuario?.perfil === 'admin' && usuario.status === 'ativo' && activeAdminCount <= 1) {
      toast.error('Não é possível remover o único usuário administrador ativo.');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este usuário?')) {
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao excluir usuário.');
      }

      toast.success('Usuário excluído com sucesso.');
      await fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir usuário.');
    }
  };

  const handleViewDetails = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setDetailsOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUsuario(null);
    setFormData(DEFAULT_FORM);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (open && editingUsuario && !canEditUsuario(editingUsuario)) {
      toast.error('Usuário operacional pode alterar apenas a própria conta.');
      return;
    }

    if (open && !editingUsuario && !ensureCanManageUsers()) {
      return;
    }

    if (!open) {
      handleCloseDialog();
      return;
    }

    setDialogOpen(true);
  };

  const saveUsuario = async () => {
    if (!formData.nome.trim() || !formData.login.trim() || (!editingUsuario && !formData.senha)) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    if (!editingUsuario && !ensureCanManageUsers()) {
      return;
    }

    if (editingUsuario && !canEditUsuario(editingUsuario)) {
      toast.error('Usuário operacional pode alterar apenas a própria conta.');
      return;
    }

    const isLimitedSelfUpdate = Boolean(editingUsuario && (!authUserCanManageUsers || editingUsuario.perfil === 'super_admin') && isCurrentUser(editingUsuario.id));

    if (isLimitedSelfUpdate && formData.perfil !== editingUsuario!.perfil) {
      toast.error('Usuário operacional não pode alterar o próprio perfil.');
      return;
    }

    if (isLimitedSelfUpdate && formData.ativo !== (editingUsuario!.status === 'ativo')) {
      toast.error('Usuário operacional não pode alterar o próprio status.');
      return;
    }

    if (editingUsuario && isCurrentUser(editingUsuario.id) && !formData.ativo) {
      toast.error('Usuário não pode inativar a si mesmo.');
      return;
    }

    if (
      editingUsuario?.status === 'ativo' &&
      editingUsuario.perfil === 'admin' &&
      (formData.perfil !== 'admin' || !formData.ativo) &&
      authUserRole !== 'super_admin' &&
      activeAdminCount <= 1
    ) {
      toast.error('Não é possível inativar ou alterar para operacional o único usuário administrador ativo.');
      return;
    }

    if (editingUsuario?.status === 'ativo' && !formData.ativo && activeUserCount <= 1) {
      toast.error('Não é possível inativar o único usuário ativo do sistema.');
      return;
    }

    const selectedProfileId = getProfileIdByRole(formData.perfil);
    if (!isLimitedSelfUpdate && !selectedProfileId) {
      toast.error('Nenhum perfil encontrado para salvar este usuário.');
      return;
    }

    setIsSaving(true);

    try {
      const payload: Record<string, unknown> = isLimitedSelfUpdate
        ? { name: formData.nome.trim() }
        : {
            name: formData.nome.trim(),
            username: formData.login.trim(),
            active: formData.ativo ? 1 : 0,
            profileId: selectedProfileId,
          };

      if (formData.senha.trim()) {
        payload.password = formData.senha.trim();
      }

      const isEditing = Boolean(editingUsuario);
      const endpoint = isEditing ? `${getApiBaseUrl()}/api/users/${editingUsuario!.id}` : `${getApiBaseUrl()}/api/users`;
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao salvar usuário.');
      }

      toast.success(isEditing ? 'Usuário atualizado com sucesso.' : 'Usuário criado com sucesso.');
      handleCloseDialog();
      await fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar usuário.');
    } finally {
      setIsSaving(false);
    }
  };

  const sortedUsuarios = useMemo(
    () =>
      [...usuarios].sort((a, b) => {
        if (a.perfil === 'super_admin' && b.perfil !== 'super_admin') return -1;
        if (a.perfil !== 'super_admin' && b.perfil === 'super_admin') return 1;
        return 0;
      }),
    [usuarios],
  );
  const primeiroRegistro = pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const ultimoRegistro = Math.min(pagination.page * pagination.limit, pagination.total);
  const paginationItems: PaginationItem[] = (() => {
    const totalPages = pagination.totalPages;
    const currentPage = pagination.page;

    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, 'end-ellipsis', totalPages];
    }

    if (currentPage >= totalPages - 2) {
      return [1, 'start-ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, 'start-ellipsis', currentPage - 1, currentPage, currentPage + 1, 'end-ellipsis', totalPages];
  })();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Total de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-gray-900">{summary.total}</div>
            <p className="text-gray-500">usuários cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Usuários Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-green-600 dark:text-[#8bd8b1]">{summary.ativos}</div>
            <p className="text-gray-500">ativos no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Administradores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-yellow-600 dark:text-[#f6d365]">{summary.admins}</div>
            <p className="text-gray-500">com acesso total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Operacionais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-blue-600 dark:text-zinc-400">{summary.comuns}</div>
            <p className="text-gray-500">usuários operacionais</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome ou login..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
              {authUserCanManageUsers && (
                <Button className="cursor-pointer disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 dark:bg-[#273447] dark:text-[#8bd8b1] dark:hover:bg-[#314155] dark:border dark:border-[#3b4658]" onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 mr-2 dark:text-[#8bd8b1]" />
                  Novo Usuário
                </Button>
              )}
              <DialogContent className="max-w-xl dark:border-[#2f394a] dark:bg-[#1f2937] dark:text-slate-100">
                <DialogHeader>
                  <DialogTitle className="dark:text-slate-100">
                    {isOwnLimitedEdit ? 'Minha Conta' : editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}
                  </DialogTitle>
                  <DialogDescription className="dark:text-slate-400">
                    {isOwnLimitedEdit
                      ? 'Altere seu nome ou sua senha'
                      : editingUsuario
                        ? 'Altere as informações do usuário'
                        : 'Cadastre um novo usuário no sistema'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome" className="dark:text-slate-300">
                      Nome Completo
                    </Label>
                    <Input
                      id="nome"
                      placeholder="Nome do usuário"
                      value={formData.nome}
                      onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                      className="dark:bg-[#273447] dark:border-[#3b4658] dark:text-slate-100 dark:placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login" className="dark:text-slate-300">
                      Login
                    </Label>
                    <Input
                      id="login"
                      placeholder="usuario"
                      value={formData.login}
                      onChange={(e) => setFormData((prev) => ({ ...prev, login: e.target.value }))}
                      disabled={isOwnLimitedEdit}
                      className="dark:bg-[#273447] dark:border-[#3b4658] dark:text-slate-100 dark:placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senha" className="dark:text-slate-300">
                      {editingUsuario ? 'Nova senha (opcional)' : 'Senha'}
                    </Label>
                    <Input
                      id="senha"
                      type="password"
                      placeholder="••••••••"
                      value={formData.senha}
                      onChange={(e) => setFormData((prev) => ({ ...prev, senha: e.target.value }))}
                      className="dark:bg-[#273447] dark:border-[#3b4658] dark:text-slate-100 dark:placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="perfil" className="dark:text-slate-300">
                      Perfil de Acesso
                    </Label>
                    <Select
                      value={formData.perfil}
                      disabled={isOwnLimitedEdit}
                      onValueChange={(value: 'admin' | 'operational') => setFormData((prev) => ({ ...prev, perfil: value }))}
                    >
                      <SelectTrigger
                        id="perfil"
                        className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100"
                      >
                        <SelectValue placeholder="Selecione o perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin" className="cursor-pointer dark:text-slate-100">Administrador - Acesso Total</SelectItem>
                        <SelectItem value="operational" className="cursor-pointer dark:text-slate-100">Operacional - Acesso ao Sistema</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="ativo"
                      className="cursor-pointer disabled:cursor-not-allowed"
                      checked={formData.ativo}
                      disabled={isOwnLimitedEdit}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, ativo: checked }))}
                    />
                    <Label
                      htmlFor="ativo"
                      className={formData.ativo ? 'text-green-700 dark:text-[#8bd8b1]' : 'text-gray-600 dark:text-slate-300'}
                    >
                      {formData.ativo ? 'Ativo' : 'Inativo'}
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]"
                    onClick={handleCloseDialog}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="cursor-pointer disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 dark:bg-[#273447] dark:text-[#8bd8b1] dark:hover:bg-[#314155] dark:border dark:border-[#3b4658]"
                    onClick={saveUsuario}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Salvando...' : editingUsuario ? 'Atualizar' : 'Salvar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#273447] dark:text-slate-200" onClick={() => handleSort('nome')}>
                    Usuário {getSortIcon('nome')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#273447] dark:text-slate-200" onClick={() => handleSort('login')}>
                    Login {getSortIcon('login')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#273447] dark:text-slate-200" onClick={() => handleSort('perfil')}>
                    Perfil {getSortIcon('perfil')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#273447] dark:text-slate-200" onClick={() => handleSort('status')}>
                    Status {getSortIcon('status')}
                  </TableHead>
                  <TableHead className="dark:text-slate-200">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && sortedUsuarios.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8 dark:text-slate-400">
                      Carregando usuários...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && sortedUsuarios.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8 dark:text-slate-400">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                )}
                {(!isLoading || sortedUsuarios.length > 0) &&
                  sortedUsuarios.map((usuario) => {
                    const canShowActions = authUserCanManageUsers || isCurrentUser(usuario.id);
                    const canShowDelete = authUserCanManageUsers && usuario.perfil !== 'super_admin';

                    return (
                    <TableRow key={usuario.id} className="dark:hover:bg-[#273447]/70">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-green-100 text-green-600 dark:bg-[#273447] dark:text-[#8bd8b1]">{getInitials(usuario.nome)}</AvatarFallback>
                          </Avatar>
                          <span className="text-gray-900 dark:text-slate-200">{usuario.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-slate-300">{usuario.login}</TableCell>
                      <TableCell>{getPerfilBadge(usuario.perfil)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(usuario.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {canShowActions ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="cursor-pointer disabled:cursor-not-allowed dark:text-slate-400 dark:hover:bg-[#314155] dark:hover:text-slate-200" onClick={() => handleViewDetails(usuario)} title="Visualizar">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="cursor-pointer disabled:cursor-not-allowed dark:text-slate-400 dark:hover:bg-[#314155] dark:hover:text-slate-200" onClick={() => handleEdit(usuario)} title="Editar">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {canShowDelete && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(usuario.id)}
                                className="cursor-pointer disabled:cursor-not-allowed text-red-600 hover:text-red-700 dark:text-[#e7a0a9] dark:hover:bg-[#314155] dark:hover:text-[#ffb3be]"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-slate-500">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          <div ref={paginationRef} className="mt-4 flex flex-col items-center gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col items-center gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Registros por página</span>
                <Select value={String(registrosPorPagina)} onValueChange={handleRegistrosPorPaginaChange}>
                  <SelectTrigger className="h-9 w-[84px] cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5" className="cursor-pointer lg:hidden">5</SelectItem>
                    <SelectItem value="10" className="cursor-pointer">10</SelectItem>
                    <SelectItem value="25" className="cursor-pointer">25</SelectItem>
                    <SelectItem value="50" className="cursor-pointer">50</SelectItem>
                    <SelectItem value="100" className="cursor-pointer">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-center text-sm text-gray-500 md:text-left">
                Mostrando {primeiroRegistro}-{ultimoRegistro} de {pagination.total} registros
              </span>
              {isLoading && sortedUsuarios.length > 0 && (
                <span className="hidden items-center gap-1.5 text-sm text-blue-600 dark:text-[#7fb7e8] md:inline-flex">
                  <Loader2 className="h-4 w-4 animate-spin dark:text-[#7fb7e8]" />
                  Carregando...
                </span>
              )}
            </div>

            {isLoading && sortedUsuarios.length > 0 && (
              <span className="inline-flex items-center justify-center gap-1.5 text-sm text-blue-600 dark:text-[#7fb7e8] md:hidden">
                <Loader2 className="h-4 w-4 animate-spin dark:text-[#7fb7e8]" />
                Carregando...
              </span>
            )}

            <div className="flex w-full max-w-sm items-center justify-center gap-2 md:hidden">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-600 dark:text-slate-300">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]"
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))}
              >
                Próxima
              </Button>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
              >
                Anterior
              </Button>
              {paginationItems.map((item) =>
                typeof item === 'number' ? (
                  <Button
                    key={item}
                    variant={item === pagination.page ? 'default' : 'outline'}
                    size="sm"
                    className={
                      item === pagination.page
                        ? 'cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-[#075985] dark:hover:bg-[#0e7490] dark:text-white'
                        : 'cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]'
                    }
                    onClick={() => handlePageChange(item)}
                    disabled={isLoading}
                  >
                    {item}
                  </Button>
                ) : (
                  <span key={item} className="px-1 text-sm text-gray-500 dark:text-slate-400">...</span>
                ),
              )}
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]"
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))}
              >
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-xl dark:border-[#2f394a] dark:bg-[#1f2937] dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Detalhes do Usuário</DialogTitle>
          </DialogHeader>
          {selectedUsuario && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-green-100 text-green-600 text-lg">{getInitials(selectedUsuario.nome)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold dark:text-slate-100">{selectedUsuario.nome}</p>
                  <p className="text-gray-500 dark:text-slate-400">{selectedUsuario.login}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="dark:text-slate-300">Perfil</Label>
                  <div className="mt-1">{getPerfilBadge(selectedUsuario.perfil)}</div>
                </div>
                <div>
                  <Label className="dark:text-slate-300">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedUsuario.status)}</div>
                </div>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-[#273447] dark:border-[#3b4658]">
                <p className="text-blue-900 dark:text-[#7fb7e8]">
                  <strong>Permissões:</strong>
                  <br />
                  {selectedUsuario.perfil === 'super_admin'
                    ? <>• Acesso técnico total ao sistema</>
                    : selectedUsuario.perfil === 'admin'
                      ? <>• Acesso total ao sistema</>
                      : <>• Acesso operacional financeiro</>}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]"
              onClick={() => setDetailsOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
