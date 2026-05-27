import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Plus, Search, Filter, Check, Copy, Eye, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Info, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Textarea } from './ui/textarea';
import { getAuthToken } from '../lib/auth';

type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis';

type ApiCategory = {
  id: number;
  description: string;
};

type ApiAccountType = {
  id: number;
  description: string;
  type?: 'Receita' | 'Despesa';
  status?: boolean | number | string | null;
  category?: ApiCategory;
};

type ApiPaymentType = {
  id: number;
  name: string;
  description?: string | null;
  status?: boolean | number | string | null;
};

type ApiOriginAccount = {
  id: number;
  description?: string | null;
};

type ApiAccountsReceivable = {
  id: number;
  accountTypeId?: number | null;
  nominalDate?: string | null;
  dueDate?: string | null;
  paymentDate?: string | null;
  paymentTypeId?: number | null;
  documentNumber?: string | null;
  description?: string | null;
  value?: number | string | null;
  paid?: boolean | number | string | null;
  originId?: number | null;
  accountType?: ApiAccountType;
  paymentType?: ApiPaymentType;
};

type ContaReceber = {
  id: number;
  descricao: string;
  paymentTypeId: number | null;
  formaPgto: string;
  dataNominal: string;
  dataVencimento: string;
  dataPagamento: string;
  numeroDoc: string;
  valor: number;
  tipoConta: string;
  categoria: string;
  accountTypeId: number | null;
  originId: number | null;
  origemConta: string;
  status: 'pendente' | 'recebido' | 'vencido';
};

type ContaReceberForm = {
  descricao: string;
  accountTypeId: string;
  paymentTypeId: string;
  dataNominal: string;
  dataVencimento: string;
  numeroDoc: string;
  valor: string;
  status: 'pendente' | 'recebido';
};

type MassForm = {
  origemConta: string;
  origemCliente: boolean;
  descricao: string;
  accountTypeId: string;
  paymentTypeId: string;
  valorTotal: string;
  parcelas: string;
  dataInicio: string;
  observacoes: string;
};

type AccountsReceivablePagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type AccountsReceivableSummary = {
  total: number;
  pendente: { valor: number; quantidade: number };
  recebido: { valor: number; quantidade: number };
  vencido: { valor: number; quantidade: number };
};

type AccountsReceivablePaginatedResponse = {
  items: ApiAccountsReceivable[];
  pagination: AccountsReceivablePagination;
  summary: AccountsReceivableSummary;
};

const DEFAULT_FORM: ContaReceberForm = {
  descricao: '',
  accountTypeId: '',
  paymentTypeId: '',
  dataNominal: '',
  dataVencimento: '',
  numeroDoc: '',
  valor: '',
  status: 'pendente',
};

const DEFAULT_MASS_FORM: MassForm = {
  origemConta: '',
  origemCliente: true,
  descricao: '',
  accountTypeId: '',
  paymentTypeId: '',
  valorTotal: '',
  parcelas: '',
  dataInicio: '',
  observacoes: '',
};

const DEFAULT_PAGINATION: AccountsReceivablePagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

const DEFAULT_SUMMARY: AccountsReceivableSummary = {
  total: 0,
  pendente: { valor: 0, quantidade: 0 },
  recebido: { valor: 0, quantidade: 0 },
  vencido: { valor: 0, quantidade: 0 },
};

const calculateAccountsSummary = (items: ContaReceber[]): AccountsReceivableSummary =>
  items.reduce(
    (acc, conta) => {
      acc.total += conta.valor;
      acc[conta.status].valor += conta.valor;
      acc[conta.status].quantidade += 1;
      return acc;
    },
    {
      total: 0,
      pendente: { valor: 0, quantidade: 0 },
      recebido: { valor: 0, quantidade: 0 },
      vencido: { valor: 0, quantidade: 0 },
    },
  );

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || '';
const isActiveStatus = (status: boolean | number | string | null | undefined) => status !== false && status !== 0 && status !== '0' && status !== 'false';

const normalizeDateInput = (value?: string | null) => {
  if (!value) {
    return '';
  }
  return value.slice(0, 10);
};

const formatDateBR = (value: string) => {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return '-';
  }
  return `${day}/${month}/${year}`;
};

const formatCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  const amount = Number(digits) / 100;
  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatCurrencyValue = (value: number) =>
  value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const parseCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) / 100 : 0;
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

const clearFieldValidity = (event: FormEvent<HTMLInputElement | HTMLSelectElement>) => {
  event.currentTarget.setCustomValidity('');
};

const setRequiredMessage = (event: FormEvent<HTMLInputElement | HTMLSelectElement>, message: string) => {
  event.currentTarget.setCustomValidity(message);
};

const setDateMessage = (event: FormEvent<HTMLInputElement>, requiredMessage: string, rangeMessage: string) => {
  const input = event.currentTarget;
  input.setCustomValidity(input.validity.valueMissing ? requiredMessage : rangeMessage);
};

const setNumberMessage = (event: FormEvent<HTMLInputElement>, requiredMessage: string, rangeMessage: string) => {
  const input = event.currentTarget;
  input.setCustomValidity(input.validity.valueMissing ? requiredMessage : rangeMessage);
};

const getContaStatus = (conta: ApiAccountsReceivable): ContaReceber['status'] => {
  const isPaid = conta.paid === true || conta.paid === 1 || conta.paid === '1' || conta.paid === 'true';

  if (isPaid) {
    return 'recebido';
  }

  const dueDate = normalizeDateInput(conta.dueDate);
  if (dueDate && dueDate < new Date().toISOString().slice(0, 10)) {
    return 'vencido';
  }

  return 'pendente';
};

const mapApiContaToConta = (conta: ApiAccountsReceivable, originsById: Map<number, ApiOriginAccount> = new Map()): ContaReceber => ({
  id: conta.id,
  descricao: conta.description || '',
  paymentTypeId: conta.paymentTypeId ?? null,
  formaPgto: conta.paymentType?.name || '-',
  dataNominal: normalizeDateInput(conta.nominalDate),
  dataVencimento: normalizeDateInput(conta.dueDate),
  dataPagamento: normalizeDateInput(conta.paymentDate),
  numeroDoc: conta.documentNumber || '',
  valor: Number(conta.value || 0),
  tipoConta: conta.accountType?.description || '-',
  categoria: conta.accountType?.category?.description || '-',
  accountTypeId: conta.accountTypeId ?? null,
  originId: conta.originId ?? null,
  origemConta: conta.originId ? originsById.get(conta.originId)?.description || `Origem ${conta.originId}` : '',
  status: getContaStatus(conta),
});

export default function ContasReceber() {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [paymentTypeFiltro, setPaymentTypeFiltro] = useState('todos');
  const [accountTypeFiltro, setAccountTypeFiltro] = useState('todos');
  const [originFiltro, setOriginFiltro] = useState('todas');
  const [dataInicioFiltro, setDataInicioFiltro] = useState('');
  const [dataFimFiltro, setDataFimFiltro] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [massDialogOpen, setMassDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedConta, setSelectedConta] = useState<ContaReceber | null>(null);
  const [originDialogOpen, setOriginDialogOpen] = useState(false);
  const [selectedOriginName, setSelectedOriginName] = useState('');
  const [editingConta, setEditingConta] = useState<ContaReceber | null>(null);
  const [accountTypes, setAccountTypes] = useState<ApiAccountType[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<ApiPaymentType[]>([]);
  const [origins, setOrigins] = useState<ApiOriginAccount[]>([]);
  const [formData, setFormData] = useState<ContaReceberForm>(DEFAULT_FORM);
  const [massForm, setMassForm] = useState<MassForm>(DEFAULT_MASS_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMassSaving, setIsMassSaving] = useState(false);
  const [receberDialogOpen, setReceberDialogOpen] = useState(false);
  const [contaToReceber, setContaToReceber] = useState<ContaReceber | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof ContaReceber | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [pagination, setPagination] = useState<AccountsReceivablePagination>(DEFAULT_PAGINATION);
  const [summary, setSummary] = useState<AccountsReceivableSummary>(DEFAULT_SUMMARY);
  const accountTypeRequiredRef = useRef<HTMLSelectElement>(null);
  const paymentTypeRequiredRef = useRef<HTMLSelectElement>(null);
  const massAccountTypeRequiredRef = useRef<HTMLSelectElement>(null);
  const massPaymentTypeRequiredRef = useRef<HTMLSelectElement>(null);
  const scrollToPaginationBottomRef = useRef(false);
  const paginationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    accountTypeRequiredRef.current?.setCustomValidity('');
  }, [formData.accountTypeId]);

  useEffect(() => {
    paymentTypeRequiredRef.current?.setCustomValidity('');
  }, [formData.paymentTypeId]);

  useEffect(() => {
    massAccountTypeRequiredRef.current?.setCustomValidity('');
  }, [massForm.accountTypeId]);

  useEffect(() => {
    massPaymentTypeRequiredRef.current?.setCustomValidity('');
  }, [massForm.paymentTypeId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim().toLowerCase());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  const fetchContas = async () => {
    setIsLoading(true);
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(registrosPorPagina),
    });

    if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
    if (statusFiltro !== 'todos') params.set('status', statusFiltro);
    if (paymentTypeFiltro !== 'todos') params.set('paymentTypeId', paymentTypeFiltro);
    if (accountTypeFiltro !== 'todos') params.set('accountTypeId', accountTypeFiltro);
    if (originFiltro !== 'todas') params.set('originId', originFiltro);
    if (dataInicioFiltro) params.set('dateFrom', dataInicioFiltro);
    if (dataFimFiltro) params.set('dateTo', dataFimFiltro);
    if (sortColumn) {
      params.set('sortBy', String(sortColumn));
      params.set('sortDirection', sortDirection);
    }

    const [response, originsResponse] = await Promise.all([
      fetch(`${getApiBaseUrl()}/api/accounts-receivable?${params.toString()}`, {
        headers: getAuthHeaders(),
      }),
      fetch(`${getApiBaseUrl()}/api/origin-accounts`, {
        headers: getAuthHeaders(),
      }),
    ]);

    const result = await response.json();
    const originsResult = await originsResponse.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao carregar contas a receber.');
    }

    if (!originsResponse.ok || !originsResult?.success) {
      throw new Error(originsResult?.error || 'Erro ao carregar origens das contas.');
    }

    const originsData = (originsResult.data || []) as ApiOriginAccount[];
    const originsById = new Map(originsData.map((origin) => [origin.id, origin]));
    const responseData = result.data as AccountsReceivablePaginatedResponse | ApiAccountsReceivable[];
    const isLegacyArrayResponse = Array.isArray(responseData);
    const legacyItems = isLegacyArrayResponse
      ? responseData.map((conta) => mapApiContaToConta(conta, originsById))
      : [];
    const legacyFilteredItems = legacyItems.filter((conta) => {
      const matchesSearch =
        !debouncedSearchTerm ||
        conta.descricao.toLowerCase().includes(debouncedSearchTerm) ||
        conta.numeroDoc.toLowerCase().includes(debouncedSearchTerm) ||
        conta.tipoConta.toLowerCase().includes(debouncedSearchTerm) ||
        conta.formaPgto.toLowerCase().includes(debouncedSearchTerm) ||
        conta.origemConta.toLowerCase().includes(debouncedSearchTerm);
      const matchesStatus = statusFiltro === 'todos' || conta.status === statusFiltro;
      const matchesPaymentType = paymentTypeFiltro === 'todos' || String(conta.paymentTypeId) === paymentTypeFiltro;
      const matchesAccountType = accountTypeFiltro === 'todos' || String(conta.accountTypeId) === accountTypeFiltro;
      const matchesOrigin = originFiltro === 'todas' || String(conta.originId) === originFiltro;
      const matchesStartDate = !dataInicioFiltro || (conta.dataVencimento && conta.dataVencimento >= dataInicioFiltro);
      const matchesEndDate = !dataFimFiltro || (conta.dataVencimento && conta.dataVencimento <= dataFimFiltro);

      return matchesSearch && matchesStatus && matchesPaymentType && matchesAccountType && matchesOrigin && matchesStartDate && matchesEndDate;
    });
    const legacySortedItems = [...legacyFilteredItems].sort((a, b) => {
      if (!sortColumn) return 0;

      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    const legacyStartIndex = (currentPage - 1) * registrosPorPagina;
    const legacyPaginatedItems = legacySortedItems.slice(legacyStartIndex, legacyStartIndex + registrosPorPagina);
    const legacyPagination = {
      page: currentPage,
      limit: registrosPorPagina,
      total: legacyFilteredItems.length,
      totalPages: Math.max(1, Math.ceil(legacyFilteredItems.length / registrosPorPagina)),
    };
    const apiItems = isLegacyArrayResponse ? legacyPaginatedItems : responseData?.items || [];
    const items = isLegacyArrayResponse ? legacyPaginatedItems : apiItems.map((conta) => mapApiContaToConta(conta, originsById));

    setContas(items);
    setOrigins(originsData);
    setPagination(isLegacyArrayResponse ? legacyPagination : responseData?.pagination || DEFAULT_PAGINATION);
    setSummary(isLegacyArrayResponse ? calculateAccountsSummary(legacyFilteredItems) : responseData?.summary || DEFAULT_SUMMARY);
    setIsLoading(false);
  };

  const fetchAccountTypes = async () => {
    const response = await fetch(`${getApiBaseUrl()}/api/account-types`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao carregar tipos de conta.');
    }

    const items = ((result.data || []) as ApiAccountType[]).filter(
      (item) => item.type === 'Receita' && isActiveStatus(item.status),
    );
    setAccountTypes(items);
  };

  const fetchPaymentTypes = async () => {
    const response = await fetch(`${getApiBaseUrl()}/api/payment-types`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao carregar tipos de pagamento.');
    }

    const items = ((result.data || []) as ApiPaymentType[]).filter((item) => isActiveStatus(item.status));
    setPaymentTypes(items);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([fetchAccountTypes(), fetchPaymentTypes()]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar módulo de contas a receber.');
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    fetchContas().catch((error) => {
      setIsLoading(false);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar contas a receber.');
    });
  }, [
    currentPage,
    registrosPorPagina,
    debouncedSearchTerm,
    statusFiltro,
    paymentTypeFiltro,
    accountTypeFiltro,
    originFiltro,
    dataInicioFiltro,
    dataFimFiltro,
    sortColumn,
    sortDirection,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    registrosPorPagina,
    debouncedSearchTerm,
    statusFiltro,
    paymentTypeFiltro,
    accountTypeFiltro,
    originFiltro,
    dataInicioFiltro,
    dataFimFiltro,
    sortColumn,
    sortDirection,
  ]);

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
  }, [isLoading, contas]);

  const scrollToPaginationBottomAfterLoad = () => {
    scrollToPaginationBottomRef.current = true;
  };

  const handleRegistrosPorPaginaChange = (value: string) => {
    scrollToPaginationBottomAfterLoad();
    setRegistrosPorPagina(Number(value));
  };

  const handlePageChange = (page: number) => {
    scrollToPaginationBottomAfterLoad();
    setCurrentPage(page);
  };

  const handleSort = (column: keyof ContaReceber) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: keyof ContaReceber) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1 inline" /> : <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  const getStatusBadge = (status: ContaReceber['status']) => {
    switch (status) {
      case 'recebido':
        return <Badge className="bg-green-100 text-green-700 dark:bg-[#273447] dark:text-[#8bd8b1]">Recebido</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-[#273447] dark:text-[#f9c87b]">Pendente</Badge>;
      case 'vencido':
        return <Badge className="bg-red-100 text-red-700 dark:bg-[#273447] dark:text-[#e7a0a9]">Vencido</Badge>;
      default:
        return <Badge className="dark:bg-[#273447] dark:text-slate-200">{status}</Badge>;
    }
  };

  const openCreateDialog = () => {
    setEditingConta(null);
    setFormData(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const handleEdit = (conta: ContaReceber) => {
    setEditingConta(conta);
    setFormData({
      descricao: conta.descricao,
      accountTypeId: conta.accountTypeId ? String(conta.accountTypeId) : '',
      paymentTypeId: conta.paymentTypeId ? String(conta.paymentTypeId) : '',
      dataNominal: conta.dataNominal,
      dataVencimento: conta.dataVencimento,
      numeroDoc: conta.numeroDoc,
      valor: conta.valor ? formatCurrencyValue(conta.valor) : '',
      status: conta.status === 'recebido' ? 'recebido' : 'pendente',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta conta a receber?')) {
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/accounts-receivable/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao excluir conta a receber.');
      }

      toast.success('Conta a receber excluída com sucesso.');
      await fetchContas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir conta a receber.');
    }
  };

  const handleViewDetails = (conta: ContaReceber) => {
    setSelectedConta(conta);
    setDetailsOpen(true);
  };

  const handleViewOrigin = (conta: ContaReceber) => {
    setSelectedOriginName(conta.origemConta || 'Origem não localizada.');
    setOriginDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingConta(null);
    setFormData(DEFAULT_FORM);
  };

  const saveConta = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const valor = parseCurrencyInput(formData.valor);

    if (
      !formData.descricao.trim() ||
      !formData.accountTypeId ||
      !formData.paymentTypeId ||
      !formData.valor.trim() ||
      valor <= 0 ||
      !formData.dataNominal ||
      !formData.dataVencimento
    ) {
      toast.error('Preencha todos os campos obrigatórios. Somente o número do documento é opcional.');
      return;
    }

    if (formData.dataNominal > formData.dataVencimento) {
      toast.error('A data nominal não pode ser maior que a data de vencimento.');
      return;
    }

    if (editingConta?.status === 'recebido' && !confirm('Esta conta já está recebida. Deseja salvar as alterações mesmo assim?')) {
      return;
    }

    setIsSaving(true);

    try {
      const isEditing = Boolean(editingConta);
      const endpoint = isEditing ? `${getApiBaseUrl()}/api/accounts-receivable/${editingConta!.id}` : `${getApiBaseUrl()}/api/accounts-receivable`;
      const method = isEditing ? 'PUT' : 'POST';

      const payload: Record<string, unknown> = {
        description: formData.descricao.trim(),
        accountTypeId: Number(formData.accountTypeId),
        paymentTypeId: Number(formData.paymentTypeId),
        nominalDate: formData.dataNominal,
        dueDate: formData.dataVencimento,
        value: valor,
      };

      if (!isEditing) {
        payload.paid = false;
      }

      if (formData.numeroDoc.trim()) {
        payload.documentNumber = formData.numeroDoc.trim();
      }

      const response = await fetch(endpoint, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao salvar conta a receber.');
      }

      const savedContaId = isEditing ? editingConta!.id : (result.data as ApiAccountsReceivable).id;

      if (isEditing && editingConta!.status === 'recebido' && formData.status !== 'recebido') {
        const unreceiveResponse = await fetch(`${getApiBaseUrl()}/api/accounts-receivable/${savedContaId}/unreceive`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({}),
        });
        const unreceiveResult = await unreceiveResponse.json();

        if (!unreceiveResponse.ok || !unreceiveResult?.success) {
          throw new Error(unreceiveResult?.error || 'Erro ao marcar conta como não recebida.');
        }
      }

      if (formData.status === 'recebido' && (!isEditing || editingConta!.status !== 'recebido')) {
        const payPayload = formData.paymentTypeId ? { paymentTypeId: Number(formData.paymentTypeId) } : {};
        const payResponse = await fetch(`${getApiBaseUrl()}/api/accounts-receivable/${savedContaId}/receive`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payPayload),
        });
        const payResult = await payResponse.json();

        if (!payResponse.ok || !payResult?.success) {
          throw new Error(payResult?.error || 'Erro ao marcar conta como recebida.');
        }
      }

      toast.success(isEditing ? 'Conta a receber atualizada com sucesso.' : 'Conta a receber cadastrada com sucesso.');
      handleCloseDialog();
      await fetchContas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar conta a receber.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseMassDialog = () => {
    setMassDialogOpen(false);
    setMassForm(DEFAULT_MASS_FORM);
  };

  const saveMassContas = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const valorTotal = parseCurrencyInput(massForm.valorTotal);
    const parcelas = Number(massForm.parcelas);

    if (
      !massForm.origemConta.trim() ||
      !massForm.descricao.trim() ||
      !massForm.accountTypeId ||
      !massForm.paymentTypeId ||
      !massForm.valorTotal.trim() ||
      valorTotal <= 0 ||
      !Number.isInteger(parcelas) ||
      parcelas < 1 ||
      !massForm.dataInicio
    ) {
      toast.error('Preencha todos os campos obrigatórios para gerar as contas.');
      return;
    }

    setIsMassSaving(true);

    try {
      const originResponse = await fetch(`${getApiBaseUrl()}/api/origin-accounts`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          description: massForm.origemConta.trim(),
          obs: massForm.observacoes.trim() || null,
          category: 2,
          person: massForm.origemCliente,
        }),
      });
      const originResult = await originResponse.json();

      if (!originResponse.ok || !originResult?.success) {
        throw new Error(originResult?.error || 'Erro ao registrar origem da conta.');
      }

      const response = await fetch(`${getApiBaseUrl()}/api/accounts-receivable/multiple`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          originId: Number(originResult.data.id),
          description: massForm.descricao.trim(),
          accountTypeId: Number(massForm.accountTypeId),
          paymentTypeId: Number(massForm.paymentTypeId),
          value: valorTotal,
          installments: parcelas,
          nominalDate: massForm.dataInicio,
          dueDate: massForm.dataInicio,
          obs: massForm.observacoes.trim() || null,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao gerar contas a receber em massa.');
      }

      toast.success(`${parcelas} conta(s) a receber gerada(s) com sucesso.`);
      handleCloseMassDialog();
      await fetchContas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar contas a receber em massa.');
    } finally {
      setIsMassSaving(false);
    }
  };

  const handleMarcarRecebido = (conta: ContaReceber) => {
    setContaToReceber(conta);
    setReceberDialogOpen(true);
  };

  const confirmMarcarRecebido = async () => {
    if (!contaToReceber) {
      return;
    }

    try {
      const payload = contaToReceber.paymentTypeId ? { paymentTypeId: contaToReceber.paymentTypeId } : {};
      const response = await fetch(`${getApiBaseUrl()}/api/accounts-receivable/${contaToReceber.id}/receive`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao marcar conta como recebida.');
      }

      toast.success('Conta marcada como recebida.');
      setReceberDialogOpen(false);
      setContaToReceber(null);
      await fetchContas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao marcar conta como recebida.');
    }
  };

  const clearFilters = () => {
    setStatusFiltro('todos');
    setPaymentTypeFiltro('todos');
    setAccountTypeFiltro('todos');
    setOriginFiltro('todas');
    setDataInicioFiltro('');
    setDataFimFiltro('');
  };

  const clearSearchAndFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    clearFilters();
  };

  const hasAdvancedFilters =
    statusFiltro !== 'todos' ||
    paymentTypeFiltro !== 'todos' ||
    accountTypeFiltro !== 'todos' ||
    originFiltro !== 'todas' ||
    Boolean(dataInicioFiltro) ||
    Boolean(dataFimFiltro);

  const originsWithAccounts = origins;
  const sortedContas = contas;
  const totalPendente = summary.pendente.valor;
  const totalPago = summary.recebido.valor;
  const totalVencido = summary.vencido.valor;
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600 dark:text-slate-300">Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-yellow-600 dark:text-[#f9c87b]">{totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <p className="text-gray-500 dark:text-slate-400">{summary.pendente.quantidade} contas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600 dark:text-slate-300">Recebido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-green-600 dark:text-[#8bd8b1]">{totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <p className="text-gray-500 dark:text-slate-400">{summary.recebido.quantidade} contas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600 dark:text-slate-300">Vencido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-red-600 dark:text-[#e7a0a9]">{totalVencido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <p className="text-gray-500 dark:text-slate-400">{summary.vencido.quantidade} contas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar contas a receber..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100 dark:placeholder:text-slate-400"
                />
              </div>
              <Button variant="outline" className="sm:w-auto cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100 dark:hover:bg-[#314155]" onClick={() => setShowFilters((prev) => !prev)}>
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </Button>
              {(searchTerm || hasAdvancedFilters) && (
                <Button variant="outline" className="sm:w-auto cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100 dark:hover:bg-[#314155]" onClick={clearSearchAndFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Dialog open={massDialogOpen} onOpenChange={(open) => (open ? setMassDialogOpen(true) : handleCloseMassDialog())}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-[#3b4658] dark:bg-[#273447] dark:text-[#8ab4f8] dark:hover:bg-[#314155]">
                    <Copy className="w-4 h-4 mr-2" />
                    Gerar em Massa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto dark:border-[#2f394a] dark:bg-[#1f2a37] dark:text-slate-100">
                  <form onSubmit={saveMassContas}>
                    <DialogHeader>
                      <DialogTitle>Gerar Contas a Receber em Massa</DialogTitle>
                      <DialogDescription>Gere múltiplas contas a partir de uma origem</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="origemMassa" className="dark:text-slate-300">Origem da Conta <span className="text-red-600 dark:text-[#e7a0a9]">*</span></Label>
                        <Input
                          id="origemMassa"
                          name="origemMassa"
                          required
                          placeholder="Ex: Escritório Imóveis Ltda"
                          value={massForm.origemConta}
                          onInvalid={(e) => setRequiredMessage(e, 'Informe a origem da conta.')}
                          onInput={clearFieldValidity}
                          onChange={(e) => setMassForm((prev) => ({ ...prev, origemConta: e.target.value }))}
                          className="dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100 dark:placeholder:text-slate-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="origemCliente" className="dark:text-slate-300">Tipo da Origem</Label>
                        <Select
                          value={massForm.origemCliente ? 'cliente' : 'operacao'}
                          onValueChange={(value) => setMassForm((prev) => ({ ...prev, origemCliente: value === 'cliente' }))}
                        >
                          <SelectTrigger id="origemCliente" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cliente" className="cursor-pointer">Cliente</SelectItem>
                            <SelectItem value="operacao" className="cursor-pointer">Operação</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-full space-y-2">
                        <Label htmlFor="descricaoMassa" className="dark:text-slate-300">Descrição <span className="text-red-600 dark:text-[#e7a0a9]">*</span></Label>
                        <Input
                          id="descricaoMassa"
                          name="descricaoMassa"
                          required
                          placeholder="Descrição das contas"
                          value={massForm.descricao}
                          onInvalid={(e) => setRequiredMessage(e, 'Informe a descrição das contas.')}
                          onInput={clearFieldValidity}
                          onChange={(e) => setMassForm((prev) => ({ ...prev, descricao: e.target.value }))}
                          className="dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100 dark:placeholder:text-slate-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tipoContaMassa" className="dark:text-slate-300">Tipo de Conta <span className="text-red-600 dark:text-[#e7a0a9]">*</span></Label>
                        <Select value={massForm.accountTypeId} onValueChange={(value) => setMassForm((prev) => ({ ...prev, accountTypeId: value }))}>
                          <SelectTrigger id="tipoContaMassa" aria-required="true" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {accountTypes.map((item) => (
                              <SelectItem key={item.id} value={String(item.id)} className="cursor-pointer">
                                {item.description} {item.category?.description ? `- ${item.category.description}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <select
                          ref={massAccountTypeRequiredRef}
                          required
                          aria-hidden="true"
                          tabIndex={-1}
                          className="sr-only"
                          value={massForm.accountTypeId}
                          onInvalid={(e) => setRequiredMessage(e, 'Selecione o tipo de conta.')}
                          onChange={(e) => setMassForm((prev) => ({ ...prev, accountTypeId: e.target.value }))}
                        >
                          <option value="">Selecione o tipo</option>
                          {accountTypes.map((item) => (
                            <option key={item.id} value={String(item.id)}>
                              {item.description}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="formaPgtoMassa" className="dark:text-slate-300">Forma de Pagamento <span className="text-red-600 dark:text-[#e7a0a9]">*</span></Label>
                        <Select value={massForm.paymentTypeId} onValueChange={(value) => setMassForm((prev) => ({ ...prev, paymentTypeId: value }))}>
                          <SelectTrigger id="formaPgtoMassa" aria-required="true" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentTypes.map((item) => (
                              <SelectItem key={item.id} value={String(item.id)} className="cursor-pointer">
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <select
                          ref={massPaymentTypeRequiredRef}
                          required
                          aria-hidden="true"
                          tabIndex={-1}
                          className="sr-only"
                          value={massForm.paymentTypeId}
                          onInvalid={(e) => setRequiredMessage(e, 'Selecione a forma de pagamento.')}
                          onChange={(e) => setMassForm((prev) => ({ ...prev, paymentTypeId: e.target.value }))}
                        >
                          <option value="">Selecione</option>
                          {paymentTypes.map((item) => (
                            <option key={item.id} value={String(item.id)}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="valorMassa" className="dark:text-slate-300">Valor Total <span className="text-red-600 dark:text-[#e7a0a9]">*</span></Label>
                        <Input
                          id="valorMassa"
                          name="valorMassa"
                          required
                          type="text"
                          inputMode="numeric"
                          placeholder="0,00"
                          value={massForm.valorTotal}
                          onInvalid={(e) => setRequiredMessage(e, 'Informe o valor total.')}
                          onInput={clearFieldValidity}
                          onChange={(e) => setMassForm((prev) => ({ ...prev, valorTotal: formatCurrencyInput(e.target.value) }))}
                          className="dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100 dark:placeholder:text-slate-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="parcelas" className="dark:text-slate-300">Quantidade de Parcelas <span className="text-red-600 dark:text-[#e7a0a9]">*</span></Label>
                        <Input
                          id="parcelas"
                          name="parcelas"
                          required
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Ex: 3"
                          value={massForm.parcelas}
                          onInvalid={(e) => setNumberMessage(e, 'Informe a quantidade de parcelas.', 'Informe pelo menos 1 parcela.')}
                          onInput={clearFieldValidity}
                          onChange={(e) => setMassForm((prev) => ({ ...prev, parcelas: e.target.value }))}
                          className="dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100 dark:placeholder:text-slate-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dataInicio" className="dark:text-slate-300">Data Primeira Parcela (Efetiva) <span className="text-red-600 dark:text-[#e7a0a9]">*</span></Label>
                        <Input
                          id="dataInicio"
                          name="dataInicio"
                          required
                          type="date"
                          value={massForm.dataInicio}
                          onInvalid={(e) => setDateMessage(e, 'Informe a data da primeira parcela.', 'Informe uma data válida.')}
                          onInput={clearFieldValidity}
                          onChange={(e) => setMassForm((prev) => ({ ...prev, dataInicio: e.target.value }))}
                          className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100"
                        />
                      </div>
                      <div className="col-span-full space-y-2">
                        <Label htmlFor="obsMassa" className="dark:text-slate-300">Observações</Label>
                        <Textarea
                          id="obsMassa"
                          name="obsMassa"
                          placeholder="Observações"
                          rows={3}
                          value={massForm.observacoes}
                          onChange={(e) => setMassForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                          className="dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100 dark:placeholder:text-slate-400"
                        />
                      </div>
                      <div className="col-span-full p-4 bg-blue-50 border border-blue-200 rounded-lg dark:border-[#2f394a] dark:bg-[#273447]">
                        <p className="text-blue-800 dark:text-[#8ab4f8]">
                          <strong>Exemplo:</strong> Se informar valor total de R$ 9.000,00 e 3 parcelas, serão geradas 3 contas de R$ 3.000,00 cada, com vencimentos mensais a partir da data informada.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={handleCloseMassDialog}>
                        Cancelar
                      </Button>
                      <Button type="submit" className="cursor-pointer disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 dark:bg-[#075985] dark:hover:bg-[#0e7490] dark:text-white" disabled={isMassSaving}>
                        <Copy className="w-4 h-4 mr-2" />
                        {isMassSaving ? 'Gerando...' : 'Gerar Contas'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="cursor-pointer disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 dark:bg-[#273447] dark:text-[#8bd8b1] dark:hover:bg-[#314155] dark:border dark:border-[#3b4658]" onClick={openCreateDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Conta
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:border-[#2f394a] dark:bg-[#1f2a37] dark:text-slate-100">
                  <form onSubmit={saveConta}>
                    <DialogHeader>
                      <DialogTitle>{editingConta ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}</DialogTitle>
                      <DialogDescription>
                        {editingConta ? 'Altere as informações da conta' : 'Cadastre uma nova conta a receber no sistema'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                      <div className="col-span-full space-y-2">
                        <Label htmlFor="descricao" className="dark:text-slate-300">Descrição <span className="text-red-600 dark:text-[#e7a0a9]">*</span></Label>
                        <Input
                          id="descricao"
                          name="descricao"
                          required
                          placeholder="Descrição da conta"
                          value={formData.descricao}
                          onInvalid={(e) => setRequiredMessage(e, 'Informe a descrição da conta.')}
                          onInput={clearFieldValidity}
                          onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
                          className="dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100 dark:placeholder:text-slate-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tipoConta" className="dark:text-slate-300">Tipo de Conta <span className="text-red-600 dark:text-[#e7a0a9]">*</span></Label>
                        <Select value={formData.accountTypeId} onValueChange={(value) => setFormData((prev) => ({ ...prev, accountTypeId: value }))}>
                          <SelectTrigger id="tipoConta" aria-required="true" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {accountTypes.map((item) => (
                              <SelectItem key={item.id} value={String(item.id)} className="cursor-pointer">
                                {item.description} {item.category?.description ? `- ${item.category.description}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <select
                          ref={accountTypeRequiredRef}
                          required
                          aria-hidden="true"
                          tabIndex={-1}
                          className="sr-only"
                          value={formData.accountTypeId}
                          onInvalid={(e) => setRequiredMessage(e, 'Selecione o tipo de conta.')}
                          onChange={(e) => setFormData((prev) => ({ ...prev, accountTypeId: e.target.value }))}
                        >
                          <option value="">Selecione o tipo</option>
                          {accountTypes.map((item) => (
                            <option key={item.id} value={String(item.id)}>
                              {item.description}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="formaPgto" className="dark:text-slate-300">Forma de Pagamento <span className="text-red-600 dark:text-[#e7a0a9]">*</span></Label>
                        <Select value={formData.paymentTypeId} onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentTypeId: value }))}>
                          <SelectTrigger id="formaPgto" aria-required="true" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentTypes.map((item) => (
                              <SelectItem key={item.id} value={String(item.id)} className="cursor-pointer">
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <select
                          ref={paymentTypeRequiredRef}
                          required
                          aria-hidden="true"
                          tabIndex={-1}
                          className="sr-only"
                          value={formData.paymentTypeId}
                          onInvalid={(e) => setRequiredMessage(e, 'Selecione a forma de pagamento.')}
                          onChange={(e) => setFormData((prev) => ({ ...prev, paymentTypeId: e.target.value }))}
                        >
                          <option value="">Selecione</option>
                          {paymentTypes.map((item) => (
                            <option key={item.id} value={String(item.id)}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="numeroDoc" className="dark:text-slate-300">Número do Documento</Label>
                        <Input
                          id="numeroDoc"
                          name="numeroDoc"
                          placeholder="Ex: NF-1234"
                          value={formData.numeroDoc}
                          onChange={(e) => setFormData((prev) => ({ ...prev, numeroDoc: e.target.value }))}
                          className="dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100 dark:placeholder:text-slate-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="valor" className="dark:text-slate-300">Valor <span className="text-red-600 dark:text-[#e7a0a9]">*</span></Label>
                        <Input
                          id="valor"
                          name="valor"
                          required
                          type="text"
                          inputMode="numeric"
                          placeholder="0,00"
                          value={formData.valor}
                          onInvalid={(e) => setRequiredMessage(e, 'Informe o valor da conta.')}
                          onInput={clearFieldValidity}
                          onChange={(e) => setFormData((prev) => ({ ...prev, valor: formatCurrencyInput(e.target.value) }))}
                          className="dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100 dark:placeholder:text-slate-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dataNominal" className="dark:text-slate-300">Data Nominal (Emissão) <span className="text-red-600 dark:text-[#e7a0a9]">*</span></Label>
                        <Input
                          id="dataNominal"
                          name="dataNominal"
                          required
                          type="date"
                          value={formData.dataNominal}
                          max={formData.dataVencimento || undefined}
                          onInvalid={(e) => setDateMessage(e, 'Informe a data nominal.', 'A data nominal não pode ser maior que a data de vencimento.')}
                          onInput={clearFieldValidity}
                          onChange={(e) => setFormData((prev) => ({ ...prev, dataNominal: e.target.value }))}
                          className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dataVencimento" className="dark:text-slate-300">Data Vencimento <span className="text-red-600 dark:text-[#e7a0a9]">*</span></Label>
                        <Input
                          id="dataVencimento"
                          name="dataVencimento"
                          required
                          type="date"
                          value={formData.dataVencimento}
                          min={formData.dataNominal || undefined}
                          onInvalid={(e) => setDateMessage(e, 'Informe a data de vencimento.', 'A data de vencimento não pode ser menor que a data nominal.')}
                          onInput={clearFieldValidity}
                          onChange={(e) => setFormData((prev) => ({ ...prev, dataVencimento: e.target.value }))}
                          className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="recebido" className="dark:text-slate-300">Status da Conta <span className="text-red-600 dark:text-[#e7a0a9]">*</span></Label>
                        <div className="flex h-10 items-center gap-3 px-1">
                          <Switch
                            id="recebido"
                            className="cursor-pointer"
                            checked={formData.status === 'recebido'}
                            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, status: checked ? 'recebido' : 'pendente' }))}
                          />
                          <Label htmlFor="recebido" className={formData.status === 'recebido' ? 'text-green-700 dark:text-[#8bd8b1]' : 'text-gray-600 dark:text-slate-400'}>
                            {formData.status === 'recebido' ? 'Recebido' : 'Não recebido'}
                          </Label>
                        </div>
                        <input type="hidden" name="status" required value={formData.status} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={handleCloseDialog}>
                        Cancelar
                      </Button>
                      <Button type="submit" className="cursor-pointer disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 dark:bg-[#273447] dark:text-[#8bd8b1] dark:hover:bg-[#314155] dark:border dark:border-[#3b4658]" disabled={isSaving}>
                        {isSaving ? 'Salvando...' : editingConta ? 'Atualizar' : 'Salvar'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4 pt-4 border-t dark:border-[#2f394a]">
              <div className="space-y-2">
                <Label htmlFor="statusFiltro" className="dark:text-slate-300">Status</Label>
                <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                  <SelectTrigger id="statusFiltro" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos" className="cursor-pointer">Todos</SelectItem>
                    <SelectItem value="pendente" className="cursor-pointer">Pendente</SelectItem>
                    <SelectItem value="recebido" className="cursor-pointer">Recebido</SelectItem>
                    <SelectItem value="vencido" className="cursor-pointer">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentTypeFiltro" className="dark:text-slate-300">Forma Pgto</Label>
                <Select value={paymentTypeFiltro} onValueChange={setPaymentTypeFiltro}>
                  <SelectTrigger id="paymentTypeFiltro" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos" className="cursor-pointer">Todas</SelectItem>
                    {paymentTypes.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)} className="cursor-pointer">
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountTypeFiltro" className="dark:text-slate-300">Tipo de Conta</Label>
                <Select value={accountTypeFiltro} onValueChange={setAccountTypeFiltro}>
                  <SelectTrigger id="accountTypeFiltro" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos" className="cursor-pointer">Todos</SelectItem>
                    {accountTypes.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)} className="cursor-pointer">
                        {item.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="originFiltro" className="dark:text-slate-300">Origem</Label>
                <Select value={originFiltro} onValueChange={setOriginFiltro}>
                  <SelectTrigger id="originFiltro" className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas" className="cursor-pointer">Todas</SelectItem>
                    {originsWithAccounts.map((origin) => (
                      <SelectItem key={origin.id} value={String(origin.id)} className="cursor-pointer">
                        {origin.description || `Origem ${origin.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataInicioFiltro" className="dark:text-slate-300">Vencimento Inicial</Label>
                <Input id="dataInicioFiltro" type="date" value={dataInicioFiltro} onChange={(e) => setDataInicioFiltro(e.target.value)} className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataFimFiltro" className="dark:text-slate-300">Vencimento Final</Label>
                <Input id="dataFimFiltro" type="date" value={dataFimFiltro} onChange={(e) => setDataFimFiltro(e.target.value)} className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-[#243043]">
                  <TableHead className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2c394d]" onClick={() => handleSort('id')}>
                    Código {getSortIcon('id')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2c394d]" onClick={() => handleSort('descricao')}>
                    Descrição {getSortIcon('descricao')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2c394d]" onClick={() => handleSort('dataVencimento')}>
                    Data Vcto {getSortIcon('dataVencimento')}
                  </TableHead>
                  <TableHead>Forma Pgto</TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2c394d]" onClick={() => handleSort('valor')}>
                    Valor {getSortIcon('valor')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2c394d]" onClick={() => handleSort('status')}>
                    Status {getSortIcon('status')}
                  </TableHead>
                  <TableHead className="text-center">Marcar Recebido</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && sortedContas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8 dark:text-slate-300">
                      Carregando contas a receber...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && sortedContas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8 dark:text-slate-300">
                      Nenhuma conta a receber encontrada.
                    </TableCell>
                  </TableRow>
                )}
                {(!isLoading || sortedContas.length > 0) &&
                  sortedContas.map((conta) => (
                    <TableRow key={conta.id} className="dark:hover:bg-[#273447]">
                      <TableCell>{conta.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{conta.descricao || '-'}</span>
                          {conta.originId && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer dark:text-[#8ab4f8] dark:hover:bg-[#314155] dark:hover:text-[#bcd6ff]"
                              title="Ver origem da conta"
                              onClick={() => handleViewOrigin(conta)}
                            >
                              <Info className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{conta.dataVencimento ? formatDateBR(conta.dataVencimento) : '-'}</TableCell>
                      <TableCell>{conta.formaPgto}</TableCell>
                      <TableCell>{conta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                      <TableCell>{getStatusBadge(conta.status)}</TableCell>
                      <TableCell className="text-center">
                        {conta.status === 'pendente' || conta.status === 'vencido' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarcarRecebido(conta)}
                            className="cursor-pointer disabled:cursor-not-allowed text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-[#8bd8b1] dark:hover:bg-[#314155] dark:hover:text-[#b7f0cf]"
                            title="Marcar como Recebido"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="cursor-pointer disabled:cursor-not-allowed text-gray-600 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-[#314155] dark:hover:text-slate-200" onClick={() => handleViewDetails(conta)} title="Visualizar">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="cursor-pointer disabled:cursor-not-allowed text-gray-600 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-[#314155] dark:hover:text-slate-200" onClick={() => handleEdit(conta)} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(conta.id)} className="cursor-pointer disabled:cursor-not-allowed text-red-600 hover:text-red-700 dark:text-[#e7a0a9] dark:hover:bg-[#314155] dark:hover:text-[#ffb3be]" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          <div ref={paginationRef} className="mt-4 flex flex-col items-center gap-3 border-t pt-4 dark:border-[#2f394a] md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col items-center gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-slate-300">Registros por página</span>
                <Select value={String(registrosPorPagina)} onValueChange={handleRegistrosPorPaginaChange}>
                  <SelectTrigger className="h-9 w-[84px] cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-100">
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
              <span className="text-center text-sm text-gray-500 md:text-left dark:text-slate-400">
                Mostrando {primeiroRegistro}-{ultimoRegistro} de {pagination.total} registros
              </span>
              {isLoading && sortedContas.length > 0 && (
                <span className="hidden items-center gap-1.5 text-sm text-blue-600 dark:text-[#8ab4f8] md:inline-flex">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando...
                </span>
              )}
            </div>

            {isLoading && sortedContas.length > 0 && (
              <span className="inline-flex items-center justify-center gap-1.5 text-sm text-blue-600 dark:text-[#8ab4f8] md:hidden">
                <Loader2 className="h-4 w-4 animate-spin" />
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
                    variant={pagination.page === item ? 'default' : 'outline'}
                    size="sm"
                    className={pagination.page === item ? 'cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-[#075985] dark:hover:bg-[#0e7490] dark:text-white' : 'cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]'}
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
        <DialogContent className="max-w-2xl dark:border-[#2f394a] dark:bg-[#1f2a37] dark:text-slate-100">
          <DialogHeader>
            <DialogTitle>Detalhes da Conta a Receber</DialogTitle>
          </DialogHeader>
          {selectedConta && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Código</Label>
                  <p className="text-gray-900 dark:text-slate-100">{selectedConta.id}</p>
                </div>
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedConta.status)}</div>
                </div>
              </div>
              <div>
                <Label className="text-gray-500 dark:text-slate-300">Descrição</Label>
                <p className="text-gray-900 dark:text-slate-100">{selectedConta.descricao || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Forma de Pagamento</Label>
                  <p className="text-gray-900 dark:text-slate-100">{selectedConta.formaPgto}</p>
                </div>
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Número do Documento</Label>
                  <p className="text-gray-900 dark:text-slate-100">{selectedConta.numeroDoc || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Data Nominal (Emissão)</Label>
                  <p className="text-gray-900 dark:text-slate-100">{selectedConta.dataNominal ? formatDateBR(selectedConta.dataNominal) : '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Data Vencimento</Label>
                  <p className="text-gray-900 dark:text-slate-100">{selectedConta.dataVencimento ? formatDateBR(selectedConta.dataVencimento) : '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Valor</Label>
                  <p className="text-gray-900 dark:text-slate-100">{selectedConta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Data Recebimento</Label>
                  <p className="text-gray-900 dark:text-slate-100">{selectedConta.dataPagamento ? formatDateBR(selectedConta.dataPagamento) : '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Tipo de Conta</Label>
                  <p className="text-gray-900 dark:text-slate-100">{selectedConta.tipoConta}</p>
                </div>
                <div>
                  <Label className="text-gray-500 dark:text-slate-300">Categoria</Label>
                  <p className="text-gray-900 dark:text-slate-100">{selectedConta.categoria}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={() => setDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={originDialogOpen} onOpenChange={setOriginDialogOpen}>
        <DialogContent className="max-w-md dark:border-[#2f394a] dark:bg-[#1f2a37] dark:text-slate-100">
          <DialogHeader>
            <DialogTitle>Origem da Conta</DialogTitle>
            <DialogDescription>Conta gerada a partir da origem abaixo.</DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-blue-100 bg-blue-50 p-4 dark:border-[#2f394a] dark:bg-[#273447]">
            <Label className="dark:text-slate-300">Origem</Label>
            <p className="mt-1 text-gray-900 dark:text-slate-100">{selectedOriginName}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]" onClick={() => setOriginDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={receberDialogOpen} onOpenChange={setReceberDialogOpen}>
        <AlertDialogContent className="dark:border-[#2f394a] dark:bg-[#1f2a37] dark:text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Recebimento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja marcar esta conta como recebida? Esta ação irá atualizar o status e registrar a data de recebimento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMarcarRecebido} className="cursor-pointer bg-green-600 hover:bg-green-700 dark:bg-[#273447] dark:text-[#8bd8b1] dark:hover:bg-[#314155]">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
