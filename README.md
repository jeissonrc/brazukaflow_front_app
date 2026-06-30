
# BRazucaFlow

Interface web responsiva do **BRazucaFlow**, uma plataforma para organização e acompanhamento da vida financeira de pessoas e empresas.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=08232c)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/status-em%20desenvolvimento-F9C74F)](#status-do-projeto)

## Sobre o projeto

O frontend oferece uma visão integrada das operações financeiras, desde o lançamento diário até relatórios gerenciais. A aplicação possui layout adaptável, temas claro e escuro, paginação, filtros avançados e controles de acesso de acordo com o perfil autenticado.

## Acesso online

A versão publicada está disponível em [brazukaflow.com.br](https://brazukaflow.com.br/).

## Principais recursos

- home com indicadores e gráficos alimentados pela API;
- contas a pagar e a receber;
- geração de contas em massa com origens reutilizáveis;
- confirmação e reversão de pagamentos e recebimentos;
- criação vinculada de receitas e despesas;
- controle de receitas, despesas e livro-caixa;
- plano de contas com categorias e tipos;
- tipos de pagamento e origens de contas;
- relatórios em PDF e Excel;
- usuários com perfis Super Admin, Administrador e Operacional;
- auditoria, limpeza de logs e backup SQL;
- temas claro e escuro persistidos no navegador;
- experiência responsiva para desktop e dispositivos móveis.

## Tecnologias

- React 18
- TypeScript
- Vite 6
- Tailwind CSS 4
- Radix UI
- Recharts
- Lucide React
- Sonner

## Perfis

| Perfil | Experiência no sistema |
| --- | --- |
| Super Admin | Acesso integral, incluindo manutenção, auditoria e backup |
| Administrador | Gerenciamento financeiro, usuários e cadastros estruturais |
| Operacional | Rotinas financeiras e acesso à própria conta |

As regras definitivas de autorização são aplicadas pela API.

## Requisitos

- Node.js 18 ou superior
- npm
- acesso à [API online do BRazucaFlow](https://api.brazukaflow.com.br/)

## Configuração

Instale as dependências:

```bash
npm install
```

Crie um arquivo `.env.local` na raiz do frontend e informe o endereço da API publicada:

```env
VITE_API_URL=https://api.brazukaflow.com.br
```

O arquivo de ambiente não deve conter credenciais de usuário e não deve ser enviado ao Git.

## Execução

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

A aplicação será disponibilizada em:

```text
http://localhost:5173
```

## Build

Gere a versão otimizada:

```bash
npm run build
```

Os arquivos serão criados no diretório `build/`.

## Organização

```text
src/
├── components/
│   ├── ui/               # Componentes visuais reutilizáveis
│   ├── Home.tsx          # Dashboard principal
│   ├── ContasPagar.tsx
│   ├── ContasReceber.tsx
│   ├── Receitas.tsx
│   ├── Despesas.tsx
│   ├── Relatorios.tsx
│   ├── Usuarios.tsx
│   └── ...
├── lib/
│   ├── auth.ts           # Persistência da sessão
│   └── profileRoles.ts   # Mapeamento dos perfis
├── styles/               # Estilos globais e temas
├── App.tsx               # Navegação e composição da aplicação
└── main.tsx              # Inicialização do React
```

## Integração com a API

As requisições utilizam a URL definida em `VITE_API_URL`. Depois do login, o token JWT é mantido no armazenamento local do navegador e enviado nas rotas protegidas:

```http
Authorization: Bearer <token>
```

Links relacionados:

- [Aplicação online](https://brazukaflow.com.br/)
- [API online](https://api.brazukaflow.com.br/)
- [Documentação técnica da API](https://api.brazukaflow.com.br/docs)
- [Repositório da API](https://github.com/jeissonrc/bruzukaflow_api)

## Segurança

- Não versione arquivos `.env.local`.
- Não registre senhas ou tokens no código.
- O frontend controla a apresentação das funções, enquanto a API valida as permissões.
- Use apenas conexões HTTPS em produção.

## Status do projeto

Projeto em desenvolvimento ativo, atualmente na versão `0.1.0`.
  
