import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Shield, User, Eye, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Switch } from './ui/switch';
import { getAuthToken } from '../lib/auth';

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
  perfil: 'admin' | 'comum';
  status: 'ativo' | 'inativo';
};

type UsuarioForm = {
  nome: string;
  login: string;
  senha: string;
  perfil: 'admin' | 'comum';
  ativo: boolean;
};

const DEFAULT_FORM: UsuarioForm = {
  nome: '',
  login: '',
  senha: '',
  perfil: 'comum',
  ativo: true,
};

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || '';

const profileToRole = (profileName?: string): 'admin' | 'comum' => {
  if (!profileName) {
    return 'comum';
  }

  return profileName.toLowerCase().includes('admin') ? 'admin' : 'comum';
};

const mapApiUserToUsuario = (user: ApiUser): Usuario => ({
  id: user.id,
  nome: user.name,
  login: user.username,
  perfil: profileToRole(user.profile?.name),
  status: user.active ? 'ativo' : 'inativo',
});

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState<UsuarioForm>(DEFAULT_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sortColumn, setSortColumn] = useState<keyof Usuario | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const adminProfileId = useMemo(() => {
    return profiles.find((profile) => profile.name.toLowerCase().includes('admin'))?.id ?? null;
  }, [profiles]);

  const commonProfileId = useMemo(() => {
    return profiles.find((profile) => !profile.name.toLowerCase().includes('admin'))?.id ?? null;
  }, [profiles]);

  const getProfileIdByRole = (role: 'admin' | 'comum') => {
    if (role === 'admin') {
      return adminProfileId ?? commonProfileId;
    }
    return commonProfileId ?? adminProfileId;
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
    const response = await fetch(`${getApiBaseUrl()}/api/users`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao carregar usuários.');
    }

    const apiUsers = (result.data || []) as ApiUser[];
    setUsuarios(apiUsers.map(mapApiUserToUsuario));
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
      setIsLoading(true);
      try {
        await Promise.all([fetchProfiles(), fetchUsers()]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar dados de usuários.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

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
    if (perfil === 'admin') {
      return (
        <Badge className="bg-purple-100 text-purple-700">
          <Shield className="w-3 h-3 mr-1" />
          Admin
        </Badge>
      );
    }

    return (
      <Badge className="bg-gray-100 text-gray-700">
        <User className="w-3 h-3 mr-1" />
        Comum
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'ativo') {
      return <Badge className="bg-green-100 text-green-700">Ativo</Badge>;
    }
    return <Badge className="bg-red-100 text-red-700">Inativo</Badge>;
  };

  const getInitials = (nome: string) =>
    nome
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const openCreateDialog = () => {
    setEditingUsuario(null);
    setFormData(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const handleEdit = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    setFormData({
      nome: usuario.nome,
      login: usuario.login,
      senha: '',
      perfil: usuario.perfil,
      ativo: usuario.status === 'ativo',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
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

      setUsuarios((prev) => prev.filter((user) => user.id !== id));
      toast.success('Usuário excluído com sucesso.');
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

  const saveUsuario = async () => {
    if (!formData.nome.trim() || !formData.login.trim() || (!editingUsuario && !formData.senha)) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    const selectedProfileId = getProfileIdByRole(formData.perfil);
    if (!selectedProfileId) {
      toast.error('Nenhum perfil encontrado para salvar este usuário.');
      return;
    }

    setIsSaving(true);

    try {
      const payload: Record<string, unknown> = {
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

  const toggleStatus = async (usuario: Usuario) => {
    const nextActive = usuario.status === 'ativo' ? 0 : 1;

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/users/${usuario.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          active: nextActive,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao atualizar status do usuário.');
      }

      setUsuarios((prev) =>
        prev.map((item) =>
          item.id === usuario.id
            ? {
                ...item,
                status: nextActive ? 'ativo' : 'inativo',
              }
            : item,
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar status.');
    }
  };

  const filteredUsuarios = usuarios.filter(
    (usuario) =>
      usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.login.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const sortedUsuarios = [...filteredUsuarios].sort((a, b) => {
    if (!sortColumn) {
      return 0;
    }

    return sortDirection === 'asc' ? a[sortColumn].localeCompare(b[sortColumn]) : b[sortColumn].localeCompare(a[sortColumn]);
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Total de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-gray-900">{usuarios.length}</div>
            <p className="text-gray-500">usuários cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Usuários Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-green-600">{usuarios.filter((u) => u.status === 'ativo').length}</div>
            <p className="text-gray-500">ativos no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Administradores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-purple-600">{usuarios.filter((u) => u.perfil === 'admin').length}</div>
            <p className="text-gray-500">com acesso total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Comuns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-blue-600">{usuarios.filter((u) => u.perfil === 'comum').length}</div>
            <p className="text-gray-500">usuários comuns</p>
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
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700" onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>{editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
                  <DialogDescription>{editingUsuario ? 'Altere as informações do usuário' : 'Cadastre um novo usuário no sistema'}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input id="nome" placeholder="Nome do usuário" value={formData.nome} onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login">Login</Label>
                    <Input id="login" placeholder="usuario" value={formData.login} onChange={(e) => setFormData((prev) => ({ ...prev, login: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senha">{editingUsuario ? 'Nova senha (opcional)' : 'Senha'}</Label>
                    <Input
                      id="senha"
                      type="password"
                      placeholder="••••••••"
                      value={formData.senha}
                      onChange={(e) => setFormData((prev) => ({ ...prev, senha: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="perfil">Perfil de Acesso</Label>
                    <Select value={formData.perfil} onValueChange={(value: 'admin' | 'comum') => setFormData((prev) => ({ ...prev, perfil: value }))}>
                      <SelectTrigger id="perfil">
                        <SelectValue placeholder="Selecione o perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin - Acesso Total</SelectItem>
                        <SelectItem value="comum">Comum - Acesso Operacional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ativo">Usuário Ativo</Label>
                    <Switch id="ativo" checked={formData.ativo} onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, ativo: checked }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDialog} disabled={isSaving}>
                    Cancelar
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={saveUsuario} disabled={isSaving}>
                    {isSaving ? 'Salvando...' : editingUsuario ? 'Atualizar' : 'Salvar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('nome')}>
                  Usuário {getSortIcon('nome')}
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('login')}>
                  Login {getSortIcon('login')}
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('perfil')}>
                  Perfil {getSortIcon('perfil')}
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('status')}>
                  Status {getSortIcon('status')}
                </TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5}>Carregando usuários...</TableCell>
                </TableRow>
              ) : sortedUsuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>Nenhum usuário encontrado.</TableCell>
                </TableRow>
              ) : (
                sortedUsuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-green-100 text-green-600">{getInitials(usuario.nome)}</AvatarFallback>
                        </Avatar>
                        <span>{usuario.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>{usuario.login}</TableCell>
                    <TableCell>{getPerfilBadge(usuario.perfil)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(usuario.status)}
                        <Switch checked={usuario.status === 'ativo'} onCheckedChange={() => toggleStatus(usuario)} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleViewDetails(usuario)} title="Visualizar">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(usuario)} title="Editar">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(usuario.id)} className="text-red-600 hover:text-red-700" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
          </DialogHeader>
          {selectedUsuario && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-green-100 text-green-600 text-lg">{getInitials(selectedUsuario.nome)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedUsuario.nome}</p>
                  <p className="text-gray-500">{selectedUsuario.login}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Perfil</Label>
                  <div className="mt-1">{getPerfilBadge(selectedUsuario.perfil)}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedUsuario.status)}</div>
                </div>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-900">
                  <strong>Permissões:</strong>
                  <br />
                  {selectedUsuario.perfil === 'admin' ? <>• Acesso total ao sistema</> : <>• Acesso operacional financeiro</>}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
