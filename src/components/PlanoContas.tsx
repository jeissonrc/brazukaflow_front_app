import { useState } from 'react';
import { Plus, ChevronRight, ChevronDown, Pencil, Trash2, Settings, Eye, FolderTree } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';

type ContaItem = {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  nivel: number;
  children?: ContaItem[];
};

type TipoConta = {
  id: number;
  nome: string;
  categoria: string;
  categoriaId: number;
  ativo: boolean;
};

type Categoria = {
  id: number;
  nome: string;
  descricao: string;
};

const mockPlanoContas: ContaItem[] = [
  {
    id: '1',
    codigo: '1',
    nome: 'RECEITAS',
    tipo: 'receita',
    nivel: 1,
    children: [
      {
        id: '1.1',
        codigo: '1.1',
        nome: 'Receitas Operacionais',
        tipo: 'receita',
        nivel: 2,
        children: [
          { id: '1.1.1', codigo: '1.1.1', nome: 'Vendas de Produtos', tipo: 'receita', nivel: 3 },
          { id: '1.1.2', codigo: '1.1.2', nome: 'Prestação de Serviços', tipo: 'receita', nivel: 3 },
          { id: '1.1.3', codigo: '1.1.3', nome: 'Consultoria e Assessoria', tipo: 'receita', nivel: 3 },
          { id: '1.1.4', codigo: '1.1.4', nome: 'Royalties', tipo: 'receita', nivel: 3 },
        ],
      },
    ],
  },
  {
    id: '2',
    codigo: '2',
    nome: 'DESPESAS',
    tipo: 'despesa',
    nivel: 1,
    children: [
      {
        id: '2.1',
        codigo: '2.1',
        nome: 'Despesas Operacionais',
        tipo: 'despesa',
        nivel: 2,
        children: [
          { id: '2.1.1', codigo: '2.1.1', nome: 'Salários e Encargos', tipo: 'despesa', nivel: 3 },
          { id: '2.1.2', codigo: '2.1.2', nome: 'Aluguel e Condomínio', tipo: 'despesa', nivel: 3 },
          { id: '2.1.3', codigo: '2.1.3', nome: 'Água, Luz e Telefone', tipo: 'despesa', nivel: 3 },
          { id: '2.1.4', codigo: '2.1.4', nome: 'Material de Escritório', tipo: 'despesa', nivel: 3 },
        ],
      },
      {
        id: '2.2',
        codigo: '2.2',
        nome: 'Impostos e Taxas',
        tipo: 'despesa',
        nivel: 2,
        children: [
          { id: '2.2.1', codigo: '2.2.1', nome: 'Impostos Federais', tipo: 'despesa', nivel: 3 },
          { id: '2.2.2', codigo: '2.2.2', nome: 'Impostos Estaduais', tipo: 'despesa', nivel: 3 },
        ],
      },
    ],
  },
];

const mockCategorias: Categoria[] = [
  { id: 1, nome: 'Receitas Operacionais', descricao: 'Receitas provenientes das atividades principais' },
  { id: 2, nome: 'Despesas Operacionais', descricao: 'Despesas relacionadas à operação do negócio' },
  { id: 3, nome: 'Impostos e Taxas', descricao: 'Tributos e taxas diversas' },
];

const mockTiposContas: TipoConta[] = [
  { id: 1, nome: 'Vendas de Produtos', categoria: 'Receitas Operacionais', categoriaId: 1, ativo: true },
  { id: 2, nome: 'Prestação de Serviços', categoria: 'Receitas Operacionais', categoriaId: 1, ativo: true },
  { id: 3, nome: 'Consultoria e Assessoria', categoria: 'Receitas Operacionais', categoriaId: 1, ativo: true },
  { id: 4, nome: 'Royalties', categoria: 'Receitas Operacionais', categoriaId: 1, ativo: true },
  { id: 5, nome: 'Salários e Encargos', categoria: 'Despesas Operacionais', categoriaId: 2, ativo: true },
  { id: 6, nome: 'Aluguel e Condomínio', categoria: 'Despesas Operacionais', categoriaId: 2, ativo: true },
  { id: 7, nome: 'Água, Luz e Telefone', categoria: 'Despesas Operacionais', categoriaId: 2, ativo: true },
  { id: 8, nome: 'Material de Escritório', categoria: 'Despesas Operacionais', categoriaId: 2, ativo: true },
  { id: 9, nome: 'Impostos Federais', categoria: 'Impostos e Taxas', categoriaId: 3, ativo: true },
  { id: 10, nome: 'Impostos Estaduais', categoria: 'Impostos e Taxas', categoriaId: 3, ativo: true },
];

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
  const [planoContas] = useState<ContaItem[]>(mockPlanoContas);

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
            {planoContas.map((conta) => (
              <ContaTreeItem key={conta.id} conta={conta} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}