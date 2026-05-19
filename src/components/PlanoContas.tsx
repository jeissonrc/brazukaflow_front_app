import { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, Settings, FolderTree } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { getAuthToken } from '../lib/auth';

type ApiCategoria = {
  id: number;
  description: string;
  type: 'Receita' | 'Despesa';
  specie?: string | null;
  status?: boolean | number;
};

type ApiTipoConta = {
  id: number;
  description: string;
  type: 'Receita' | 'Despesa';
  specie?: string | null;
  status?: boolean | number;
  categoryId: number;
  category?: ApiCategoria;
};

type ContaItem = {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  nivel: number;
  children?: ContaItem[];
};

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || '';

const getContaTipo = (tipo: string): 'receita' | 'despesa' => (tipo === 'Receita' ? 'receita' : 'despesa');

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

const buildPlanoContas = (categorias: ApiCategoria[], tiposContas: ApiTipoConta[]): ContaItem[] => {
  const tiposAtivos = tiposContas.filter((tipo) => tipo.status !== false && tipo.status !== 0);
  const categoriasAtivas = categorias.filter((categoria) => categoria.status !== false && categoria.status !== 0);

  const buildGrupo = (tipoGrupo: 'Receita' | 'Despesa', codigoGrupo: string, nomeGrupo: string): ContaItem => {
    const categoriasDoGrupo = categoriasAtivas.filter((categoria) => categoria.type === tipoGrupo);
    const contaTipo = getContaTipo(tipoGrupo);

    return {
      id: codigoGrupo,
      codigo: codigoGrupo,
      nome: nomeGrupo,
      tipo: contaTipo,
      nivel: 1,
      children: categoriasDoGrupo.map((categoria, categoriaIndex) => {
        const codigoCategoria = `${codigoGrupo}.${categoriaIndex + 1}`;
        const tiposDaCategoria = tiposAtivos.filter((tipo) => tipo.categoryId === categoria.id);

        return {
          id: `categoria-${categoria.id}`,
          codigo: codigoCategoria,
          nome: categoria.description,
          tipo: contaTipo,
          nivel: 2,
          children: tiposDaCategoria.map((tipoConta, tipoIndex) => ({
            id: `tipo-${tipoConta.id}`,
            codigo: `${codigoCategoria}.${tipoIndex + 1}`,
            nome: tipoConta.description,
            tipo: contaTipo,
            nivel: 3,
          })),
        };
      }),
    };
  };

  return [
    buildGrupo('Receita', '1', 'RECEITAS'),
    buildGrupo('Despesa', '2', 'DESPESAS'),
  ];
};

function ContaTreeItem({ conta }: { conta: ContaItem }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="ml-0">
      <div className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-lg group">
        {conta.children && conta.children.length > 0 ? (
          <button onClick={() => setIsOpen(!isOpen)} className="text-gray-500 hover:text-gray-700">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <div className="w-4" />
        )}
        
        <span
          className={`${
            conta.nivel === 1 ? 'font-semibold text-gray-900' : conta.nivel === 2 ? 'font-medium text-gray-700' : 'text-gray-600'
          }`}
        >
          {conta.codigo} - {conta.nome}
        </span>

        <Badge variant="outline" className={conta.tipo === 'receita' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}>
          {conta.tipo === 'receita' ? 'Receita' : 'Despesa'}
        </Badge>
      </div>
      
      {isOpen && conta.children && (
        <div className="ml-6 border-l-2 border-gray-200 pl-2">
          {conta.children.map((child) => (
            <ContaTreeItem key={child.id} conta={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlanoContas({ onNavigateToTipos }: { onNavigateToTipos: () => void }) {
  const [planoContas, setPlanoContas] = useState<ContaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPlanoContas = async () => {
      setIsLoading(true);
      try {
        const [categoriasResponse, tiposContasResponse] = await Promise.all([
          fetch(`${getApiBaseUrl()}/api/category-types`, { headers: getAuthHeaders() }),
          fetch(`${getApiBaseUrl()}/api/account-types`, { headers: getAuthHeaders() }),
        ]);

        const [categoriasResult, tiposContasResult] = await Promise.all([
          categoriasResponse.json(),
          tiposContasResponse.json(),
        ]);

        if (!categoriasResponse.ok || !categoriasResult?.success) {
          throw new Error(categoriasResult?.error || 'Erro ao carregar categorias.');
        }

        if (!tiposContasResponse.ok || !tiposContasResult?.success) {
          throw new Error(tiposContasResult?.error || 'Erro ao carregar tipos de contas.');
        }

        setPlanoContas(buildPlanoContas(categoriasResult.data || [], tiposContasResult.data || []));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar plano de contas.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPlanoContas();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header com botão de gerenciar tipos */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="w-6 h-6" />
                Plano de Contas
              </CardTitle>
              <CardDescription className="mt-2">
                Estrutura hierárquica das contas contábeis
              </CardDescription>
            </div>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={onNavigateToTipos}
            >
              <Settings className="w-4 h-4 mr-2" />
              Gerenciar Tipos de Contas
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Árvore do Plano de Contas */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            {isLoading && (
              <p className="text-center text-gray-500 py-8">Carregando plano de contas...</p>
            )}
            {!isLoading && planoContas.length === 0 && (
              <p className="text-center text-gray-500 py-8">Nenhuma conta encontrada.</p>
            )}
            {!isLoading && planoContas.map((conta) => (
              <ContaTreeItem key={conta.id} conta={conta} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
