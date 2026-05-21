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

type ApiAccountsPayable = {
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

type ContaPagar = {
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
  status: 'pendente' | 'pago' | 'vencido';
};

type ContaPagarForm = {
  descricao: string;
  accountTypeId: string;
  paymentTypeId: string;
  dataNominal: string;
  dataVencimento: string;
  numeroDoc: string;
  valor: string;
  status: 'pendente' | 'pago';
};

type MassForm = {
  origemConta: string;
  origemFornecedor: boolean;
  descricao: string;
  accountTypeId: string;
  paymentTypeId: string;
  valorTotal: string;
  parcelas: string;
  dataInicio: string;
  observacoes: string;
};

type AccountsPayablePagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type AccountsPayableSummary = {
  total: number;
  pendente: { valor: number; quantidade: number };
  pago: { valor: number; quantidade: number };
  vencido: { valor: number; quantidade: number };
};

type AccountsPayablePaginatedResponse = {
  items: ApiAccountsPayable[];
  pagination: AccountsPayablePagination;
  summary: AccountsPayableSummary;
};

const DEFAULT_FORM: ContaPagarForm = {
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
  origemFornecedor: true,
  descricao: '',
  accountTypeId: '',
  paymentTypeId: '',
  valorTotal: '',
  parcelas: '',
  dataInicio: '',
  observacoes: '',
};

const DEFAULT_PAGINATION: AccountsPayablePagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

const DEFAULT_SUMMARY: AccountsPayableSummary = {
  total: 0,
  pendente: { valor: 0, quantidade: 0 },
  pago: { valor: 0, quantidade: 0 },
  vencido: { valor: 0, quantidade: 0 },
};

const calculateAccountsSummary = (items: ContaPagar[]): AccountsPayableSummary =>
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
      pago: { valor: 0, quantidade: 0 },
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

const getContaStatus = (conta: ApiAccountsPayable): ContaPagar['status'] => {
  const isPaid = conta.paid === true || conta.paid === 1 || conta.paid === '1' || conta.paid === 'true';

  if (isPaid) {
    return 'pago';
  }

  const dueDate = normalizeDateInput(conta.dueDate);
  if (dueDate && dueDate < new Date().toISOString().slice(0, 10)) {
    return 'vencido';
  }

  return 'pendente';
};

const mapApiContaToConta = (conta: ApiAccountsPayable, originsById: Map<number, ApiOriginAccount> = new Map()): ContaPagar => ({
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

export default function ContasPagar() {
  const [contas, setContas] = useState<ContaPagar[]>([]);
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
  const [selectedConta, setSelectedConta] = useState<ContaPagar | null>(null);
  const [originDialogOpen, setOriginDialogOpen] = useState(false);
  const [selectedOriginName, setSelectedOriginName] = useState('');
  const [editingConta, setEditingConta] = useState<ContaPagar | null>(null);
  const [accountTypes, setAccountTypes] = useState<ApiAccountType[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<ApiPaymentType[]>([]);
  const [origins, setOrigins] = useState<ApiOriginAccount[]>([]);
  const [formData, setFormData] = useState<ContaPagarForm>(DEFAULT_FORM);
  const [massForm, setMassForm] = useState<MassForm>(DEFAULT_MASS_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMassSaving, setIsMassSaving] = useState(false);
  const [pagarDialogOpen, setPagarDialogOpen] = useState(false);
  const [contaToPagar, setContaToPagar] = useState<ContaPagar | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof ContaPagar | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [pagination, setPagination] = useState<AccountsPayablePagination>(DEFAULT_PAGINATION);
  const [summary, setSummary] = useState<AccountsPayableSummary>(DEFAULT_SUMMARY);
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
      fetch(`${getApiBaseUrl()}/api/accounts-payable?${params.toString()}`, {
        headers: getAuthHeaders(),
      }),
      fetch(`${getApiBaseUrl()}/api/origin-accounts`, {
        headers: getAuthHeaders(),
      }),
    ]);

    const result = await response.json();
    const originsResult = await originsResponse.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Erro ao carregar contas a pagar.');
    }

    if (!originsResponse.ok || !originsResult?.success) {
      throw new Error(originsResult?.error || 'Erro ao carregar origens das contas.');
    }

    const originsData = (originsResult.data || []) as ApiOriginAccount[];
    const originsById = new Map(originsData.map((origin) => [origin.id, origin]));
    const responseData = result.data as AccountsPayablePaginatedResponse | ApiAccountsPayable[];
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
      (item) => item.type === 'Despesa' && isActiveStatus(item.status),
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
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar módulo de contas a pagar.');
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    fetchContas().catch((error) => {
      setIsLoading(false);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar contas a pagar.');
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

  const handleSort = (column: keyof ContaPagar) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: keyof ContaPagar) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1 inline" /> : <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  const getStatusBadge = (status: ContaPagar['status']) => {
    switch (status) {
      case 'pago':
        return <Badge className="bg-green-100 text-green-700">Pago</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-100 text-yellow-700">Pendente</Badge>;
      case 'vencido':
        return <Badge className="bg-red-100 text-red-700">Vencido</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const openCreateDialog = () => {
    setEditingConta(null);
    setFormData(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const handleEdit = (conta: ContaPagar) => {
    setEditingConta(conta);
    setFormData({
      descricao: conta.descricao,
      accountTypeId: conta.accountTypeId ? String(conta.accountTypeId) : '',
      paymentTypeId: conta.paymentTypeId ? String(conta.paymentTypeId) : '',
      dataNominal: conta.dataNominal,
      dataVencimento: conta.dataVencimento,
      numeroDoc: conta.numeroDoc,
      valor: conta.valor ? formatCurrencyValue(conta.valor) : '',
      status: conta.status === 'pago' ? 'pago' : 'pendente',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta conta a pagar?')) {
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/accounts-payable/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao excluir conta a pagar.');
      }

      toast.success('Conta a pagar excluída com sucesso.');
      await fetchContas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir conta a pagar.');
    }
  };

  const handleViewDetails = (conta: ContaPagar) => {
    setSelectedConta(conta);
    setDetailsOpen(true);
  };

  const handleViewOrigin = (conta: ContaPagar) => {
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

    if (editingConta?.status === 'pago' && !confirm('Esta conta já está paga. Deseja salvar as alterações mesmo assim?')) {
      return;
    }

    setIsSaving(true);

    try {
      const isEditing = Boolean(editingConta);
      const endpoint = isEditing ? `${getApiBaseUrl()}/api/accounts-payable/${editingConta!.id}` : `${getApiBaseUrl()}/api/accounts-payable`;
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
        throw new Error(result?.error || 'Erro ao salvar conta a pagar.');
      }

      const savedContaId = isEditing ? editingConta!.id : (result.data as ApiAccountsPayable).id;

      if (isEditing && editingConta!.status === 'pago' && formData.status !== 'pago') {
        const unpayResponse = await fetch(`${getApiBaseUrl()}/api/accounts-payable/${savedContaId}/unpay`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({}),
        });
        const unpayResult = await unpayResponse.json();

        if (!unpayResponse.ok || !unpayResult?.success) {
          throw new Error(unpayResult?.error || 'Erro ao marcar conta como não paga.');
        }
      }

      if (formData.status === 'pago' && (!isEditing || editingConta!.status !== 'pago')) {
        const payPayload = formData.paymentTypeId ? { paymentTypeId: Number(formData.paymentTypeId) } : {};
        const payResponse = await fetch(`${getApiBaseUrl()}/api/accounts-payable/${savedContaId}/pay`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payPayload),
        });
        const payResult = await payResponse.json();

        if (!payResponse.ok || !payResult?.success) {
          throw new Error(payResult?.error || 'Erro ao marcar conta como paga.');
        }
      }

      toast.success(isEditing ? 'Conta a pagar atualizada com sucesso.' : 'Conta a pagar cadastrada com sucesso.');
      handleCloseDialog();
      await fetchContas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar conta a pagar.');
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
          category: 1,
          person: massForm.origemFornecedor,
        }),
      });
      const originResult = await originResponse.json();

      if (!originResponse.ok || !originResult?.success) {
        throw new Error(originResult?.error || 'Erro ao registrar origem da conta.');
      }

      const response = await fetch(`${getApiBaseUrl()}/api/accounts-payable/multiple`, {
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
        throw new Error(result?.error || 'Erro ao gerar contas a pagar em massa.');
      }

      toast.success(`${parcelas} conta(s) a pagar gerada(s) com sucesso.`);
      handleCloseMassDialog();
      await fetchContas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar contas a pagar em massa.');
    } finally {
      setIsMassSaving(false);
    }
  };

  const handleMarcarPago = (conta: ContaPagar) => {
    setContaToPagar(conta);
    setPagarDialogOpen(true);
  };

  const confirmMarcarPago = async () => {
    if (!contaToPagar) {
      return;
    }

    try {
      const payload = contaToPagar.paymentTypeId ? { paymentTypeId: contaToPagar.paymentTypeId } : {};
      const response = await fetch(`${getApiBaseUrl()}/api/accounts-payable/${contaToPagar.id}/pay`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Erro ao marcar conta como paga.');
      }

      toast.success('Conta marcada como paga.');
      setPagarDialogOpen(false);
      setContaToPagar(null);
      await fetchContas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao marcar conta como paga.');
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
  const totalPago = summary.pago.valor;
  const totalVencido = summary.vencido.valor;
  const primeiroRegistro = pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const ultimoRegistro = Math.min(pagination.page * pagination.limit, pagination.total);
  const visiblePageWindow = 5;
  const halfVisiblePageWindow = Math.floor(visiblePageWindow / 2);
  const middleStartPage = Math.max(
    1,
    Math.min(
      pagination.page - halfVisiblePageWindow,
      pagination.totalPages - visiblePageWindow + 1,
    ),
  );
  const middleEndPage = Math.min(pagination.totalPages, middleStartPage + visiblePageWindow - 1);
  const paginas = Array.from({ length: Math.max(0, middleEndPage - middleStartPage + 1) }, (_, index) => middleStartPage + index);
  const showFirstPageShortcut = middleStartPage > 1;
  const showLeadingEllipsis = middleStartPage > 2;
  const showTrailingEllipsis = middleEndPage < pagination.totalPages - 1;
  const showLastPageShortcut = middleEndPage < pagination.totalPages;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-yellow-600">{totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <p className="text-gray-500">{summary.pendente.quantidade} contas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-green-600">{totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <p className="text-gray-500">{summary.pago.quantidade} contas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-600">Vencido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-red-600">{totalVencido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <p className="text-gray-500">{summary.vencido.quantidade} contas</p>
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
                  placeholder="Buscar contas a pagar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="sm:w-auto cursor-pointer" onClick={() => setShowFilters((prev) => !prev)}>
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </Button>
              {(searchTerm || hasAdvancedFilters) && (
                <Button variant="outline" className="sm:w-auto cursor-pointer" onClick={clearSearchAndFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Dialog open={massDialogOpen} onOpenChange={(open) => (open ? setMassDialogOpen(true) : handleCloseMassDialog())}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed border-blue-600 text-blue-600 hover:bg-blue-50">
                    <Copy className="w-4 h-4 mr-2" />
                    Gerar em Massa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <form onSubmit={saveMassContas}>
                    <DialogHeader>
                      <DialogTitle>Gerar Contas a Pagar em Massa</DialogTitle>
                      <DialogDescription>Gere múltiplas contas a partir de uma origem</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="origemMassa">Origem da Conta <span className="text-red-600">*</span></Label>
                        <Input
                          id="origemMassa"
                          name="origemMassa"
                          required
                          placeholder="Ex: Escritório Imóveis Ltda"
                          value={massForm.origemConta}
                          onInvalid={(e) => setRequiredMessage(e, 'Informe a origem da conta.')}
                          onInput={clearFieldValidity}
                          onChange={(e) => setMassForm((prev) => ({ ...prev, origemConta: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="origemFornecedor">Tipo da Origem</Label>
                        <Select
                          value={massForm.origemFornecedor ? 'fornecedor' : 'operacao'}
                          onValueChange={(value) => setMassForm((prev) => ({ ...prev, origemFornecedor: value === 'fornecedor' }))}
                        >
                          <SelectTrigger id="origemFornecedor" className="cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fornecedor" className="cursor-pointer">Fornecedor</SelectItem>
                            <SelectItem value="operacao" className="cursor-pointer">Operação</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-full space-y-2">
                        <Label htmlFor="descricaoMassa">Descrição <span className="text-red-600">*</span></Label>
                        <Input
                          id="descricaoMassa"
                          name="descricaoMassa"
                          required
                          placeholder="Descrição das contas"
                          value={massForm.descricao}
                          onInvalid={(e) => setRequiredMessage(e, 'Informe a descrição das contas.')}
                          onInput={clearFieldValidity}
                          onChange={(e) => setMassForm((prev) => ({ ...prev, descricao: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tipoContaMassa">Tipo de Conta <span className="text-red-600">*</span></Label>
                        <Select value={massForm.accountTypeId} onValueChange={(value) => setMassForm((prev) => ({ ...prev, accountTypeId: value }))}>
                          <SelectTrigger id="tipoContaMassa" aria-required="true" className="cursor-pointer">
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
                        <Label htmlFor="formaPgtoMassa">Forma de Pagamento <span className="text-red-600">*</span></Label>
                        <Select value={massForm.paymentTypeId} onValueChange={(value) => setMassForm((prev) => ({ ...prev, paymentTypeId: value }))}>
                          <SelectTrigger id="formaPgtoMassa" aria-required="true" className="cursor-pointer">
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
                        <Label htmlFor="valorMassa">Valor Total <span className="text-red-600">*</span></Label>
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
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="parcelas">Quantidade de Parcelas <span className="text-red-600">*</span></Label>
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
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dataInicio">Data Primeira Parcela (Efetiva) <span className="text-red-600">*</span></Label>
                        <Input
                          id="dataInicio"
                          name="dataInicio"
                          required
                          type="date"
                          value={massForm.dataInicio}
                          onInvalid={(e) => setDateMessage(e, 'Informe a data da primeira parcela.', 'Informe uma data válida.')}
                          onInput={clearFieldValidity}
                          onChange={(e) => setMassForm((prev) => ({ ...prev, dataInicio: e.target.value }))}
                          className="cursor-pointer"
                        />
                      </div>
                      <div className="col-span-full space-y-2">
                        <Label htmlFor="obsMassa">Observações</Label>
                        <Textarea
                          id="obsMassa"
                          name="obsMassa"
                          placeholder="Observações"
                          rows={3}
                          value={massForm.observacoes}
                          onChange={(e) => setMassForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                        />
                      </div>
                      <div className="col-span-full p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-800">
                          <strong>Exemplo:</strong> Se informar valor total de R$ 9.000,00 e 3 parcelas, serão geradas 3 contas de R$ 3.000,00 cada, com vencimentos mensais a partir da data informada.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" className="cursor-pointer disabled:cursor-not-allowed" onClick={handleCloseMassDialog}>
                        Cancelar
                      </Button>
                      <Button type="submit" className="cursor-pointer disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700" disabled={isMassSaving}>
                        <Copy className="w-4 h-4 mr-2" />
                        {isMassSaving ? 'Gerando...' : 'Gerar Contas'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="cursor-pointer disabled:cursor-not-allowed bg-green-600 hover:bg-green-700" onClick={openCreateDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Conta
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <form onSubmit={saveConta}>
                    <DialogHeader>
                      <DialogTitle>{editingConta ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}</DialogTitle>
                      <DialogDescription>
                        {editingConta ? 'Altere as informações da conta' : 'Cadastre uma nova conta a pagar no sistema'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                      <div className="col-span-full space-y-2">
                        <Label htmlFor="descricao">Descrição <span className="text-red-600">*</span></Label>
                        <Input
                          id="descricao"
                          name="descricao"
                          required
                          placeholder="Descrição da conta"
                          value={formData.descricao}
                          onInvalid={(e) => setRequiredMessage(e, 'Informe a descrição da conta.')}
                          onInput={clearFieldValidity}
                          onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tipoConta">Tipo de Conta <span className="text-red-600">*</span></Label>
                        <Select value={formData.accountTypeId} onValueChange={(value) => setFormData((prev) => ({ ...prev, accountTypeId: value }))}>
                          <SelectTrigger id="tipoConta" aria-required="true" className="cursor-pointer">
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
                        <Label htmlFor="formaPgto">Forma de Pagamento <span className="text-red-600">*</span></Label>
                        <Select value={formData.paymentTypeId} onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentTypeId: value }))}>
                          <SelectTrigger id="formaPgto" aria-required="true" className="cursor-pointer">
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
                        <Label htmlFor="numeroDoc">Número do Documento</Label>
                        <Input
                          id="numeroDoc"
                          name="numeroDoc"
                          placeholder="Ex: NF-1234"
                          value={formData.numeroDoc}
                          onChange={(e) => setFormData((prev) => ({ ...prev, numeroDoc: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="valor">Valor <span className="text-red-600">*</span></Label>
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
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dataNominal">Data Nominal (Emissão) <span className="text-red-600">*</span></Label>
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
                          className="cursor-pointer"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dataVencimento">Data Vencimento <span className="text-red-600">*</span></Label>
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
                          className="cursor-pointer"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pago">Status da Conta <span className="text-red-600">*</span></Label>
                        <div className="flex h-10 items-center gap-3 rounded-md border border-input px-3">
                          <Switch
                            id="pago"
                            className="cursor-pointer"
                            checked={formData.status === 'pago'}
                            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, status: checked ? 'pago' : 'pendente' }))}
                          />
                          <Label htmlFor="pago" className={formData.status === 'pago' ? 'text-green-700' : 'text-gray-600'}>
                            {formData.status === 'pago' ? 'Pago' : 'Não pago'}
                          </Label>
                        </div>
                        <input type="hidden" name="status" required value={formData.status} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" className="cursor-pointer disabled:cursor-not-allowed" onClick={handleCloseDialog}>
                        Cancelar
                      </Button>
                      <Button type="submit" className="cursor-pointer disabled:cursor-not-allowed bg-green-600 hover:bg-green-700" disabled={isSaving}>
                        {isSaving ? 'Salvando...' : editingConta ? 'Atualizar' : 'Salvar'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="statusFiltro">Status</Label>
                <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                  <SelectTrigger id="statusFiltro" className="cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos" className="cursor-pointer">Todos</SelectItem>
                    <SelectItem value="pendente" className="cursor-pointer">Pendente</SelectItem>
                    <SelectItem value="pago" className="cursor-pointer">Pago</SelectItem>
                    <SelectItem value="vencido" className="cursor-pointer">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentTypeFiltro">Forma Pgto</Label>
                <Select value={paymentTypeFiltro} onValueChange={setPaymentTypeFiltro}>
                  <SelectTrigger id="paymentTypeFiltro" className="cursor-pointer">
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
                <Label htmlFor="accountTypeFiltro">Tipo de Conta</Label>
                <Select value={accountTypeFiltro} onValueChange={setAccountTypeFiltro}>
                  <SelectTrigger id="accountTypeFiltro" className="cursor-pointer">
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
                <Label htmlFor="originFiltro">Origem</Label>
                <Select value={originFiltro} onValueChange={setOriginFiltro}>
                  <SelectTrigger id="originFiltro" className="cursor-pointer">
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
                <Label htmlFor="dataInicioFiltro">Vencimento Inicial</Label>
                <Input id="dataInicioFiltro" type="date" value={dataInicioFiltro} onChange={(e) => setDataInicioFiltro(e.target.value)} className="cursor-pointer" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataFimFiltro">Vencimento Final</Label>
                <Input id="dataFimFiltro" type="date" value={dataFimFiltro} onChange={(e) => setDataFimFiltro(e.target.value)} className="cursor-pointer" />
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
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('id')}>
                    Código {getSortIcon('id')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('descricao')}>
                    Descrição {getSortIcon('descricao')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('dataVencimento')}>
                    Data Vcto {getSortIcon('dataVencimento')}
                  </TableHead>
                  <TableHead>Forma Pgto</TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('valor')}>
                    Valor {getSortIcon('valor')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('status')}>
                    Status {getSortIcon('status')}
                  </TableHead>
                  <TableHead className="text-center">Marcar Pago</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && sortedContas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      Carregando contas a pagar...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && sortedContas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      Nenhuma conta a pagar encontrada.
                    </TableCell>
                  </TableRow>
                )}
                {(!isLoading || sortedContas.length > 0) &&
                  sortedContas.map((conta) => (
                    <TableRow key={conta.id}>
                      <TableCell>{conta.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{conta.descricao || '-'}</span>
                          {conta.originId && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
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
                            onClick={() => handleMarcarPago(conta)}
                            className="cursor-pointer disabled:cursor-not-allowed text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Marcar como Pago"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="cursor-pointer disabled:cursor-not-allowed" onClick={() => handleViewDetails(conta)} title="Visualizar">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="cursor-pointer disabled:cursor-not-allowed" onClick={() => handleEdit(conta)} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(conta.id)} className="cursor-pointer disabled:cursor-not-allowed text-red-600 hover:text-red-700" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
              {isLoading && sortedContas.length > 0 && (
                <span className="hidden items-center gap-1.5 text-sm text-blue-600 md:inline-flex">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando...
                </span>
              )}
            </div>

            {isLoading && sortedContas.length > 0 && (
              <span className="inline-flex items-center justify-center gap-1.5 text-sm text-blue-600 md:hidden">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </span>
            )}

            <div className="flex w-full max-w-sm items-center justify-center gap-2 md:hidden">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer disabled:cursor-not-allowed"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-600">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer disabled:cursor-not-allowed"
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
                className="cursor-pointer disabled:cursor-not-allowed"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
              >
                Anterior
              </Button>
              {showFirstPageShortcut && (
                <Button
                  variant={pagination.page === 1 ? 'default' : 'outline'}
                  size="sm"
                  className={pagination.page === 1 ? 'cursor-pointer bg-blue-600 hover:bg-blue-700' : 'cursor-pointer'}
                  onClick={() => handlePageChange(1)}
                  disabled={isLoading}
                >
                  1
                </Button>
              )}
              {showLeadingEllipsis && <span className="px-1 text-sm text-gray-500">...</span>}
              {paginas.map((pagina) => (
                <Button
                  key={pagina}
                  variant={pagina === pagination.page ? 'default' : 'outline'}
                  size="sm"
                  className={pagina === pagination.page ? 'cursor-pointer bg-blue-600 hover:bg-blue-700' : 'cursor-pointer'}
                  onClick={() => handlePageChange(pagina)}
                  disabled={isLoading}
                >
                  {pagina}
                </Button>
              ))}
              {showTrailingEllipsis && <span className="px-1 text-sm text-gray-500">...</span>}
              {showLastPageShortcut && (
                <Button
                  variant={pagination.page === pagination.totalPages ? 'default' : 'outline'}
                  size="sm"
                  className={pagination.page === pagination.totalPages ? 'cursor-pointer bg-blue-600 hover:bg-blue-700' : 'cursor-pointer'}
                  onClick={() => handlePageChange(pagination.totalPages)}
                  disabled={isLoading}
                >
                  {pagination.totalPages}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer disabled:cursor-not-allowed"
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Conta a Pagar</DialogTitle>
          </DialogHeader>
          {selectedConta && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Código</Label>
                  <p className="text-gray-900">{selectedConta.id}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedConta.status)}</div>
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <p className="text-gray-900">{selectedConta.descricao || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Forma de Pagamento</Label>
                  <p className="text-gray-900">{selectedConta.formaPgto}</p>
                </div>
                <div>
                  <Label>Número do Documento</Label>
                  <p className="text-gray-900">{selectedConta.numeroDoc || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Nominal (Emissão)</Label>
                  <p className="text-gray-900">{selectedConta.dataNominal ? formatDateBR(selectedConta.dataNominal) : '-'}</p>
                </div>
                <div>
                  <Label>Data Vencimento</Label>
                  <p className="text-gray-900">{selectedConta.dataVencimento ? formatDateBR(selectedConta.dataVencimento) : '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor</Label>
                  <p className="text-gray-900">{selectedConta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div>
                  <Label>Data Pagamento</Label>
                  <p className="text-gray-900">{selectedConta.dataPagamento ? formatDateBR(selectedConta.dataPagamento) : '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Conta</Label>
                  <p className="text-gray-900">{selectedConta.tipoConta}</p>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <p className="text-gray-900">{selectedConta.categoria}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed" onClick={() => setDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={originDialogOpen} onOpenChange={setOriginDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Origem da Conta</DialogTitle>
            <DialogDescription>Conta gerada a partir da origem abaixo.</DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-blue-100 bg-blue-50 p-4">
            <Label>Origem</Label>
            <p className="mt-1 text-gray-900">{selectedOriginName}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="cursor-pointer disabled:cursor-not-allowed" onClick={() => setOriginDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pagarDialogOpen} onOpenChange={setPagarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja marcar esta conta como paga? Esta ação irá atualizar o status e registrar a data de pagamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMarcarPago} className="cursor-pointer bg-green-600 hover:bg-green-700">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
