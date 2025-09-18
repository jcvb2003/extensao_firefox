# Extensão SINPESCA para Firefox

Extensão para automatizar processos em sistemas governamentais brasileiros, com foco em PesqBrasil, Gov.br, eSocial e INSS.

## Funcionalidades Principais

### 1. Login Múltiplo
- **PesqBrasil**: Permite realizar múltiplos logins simultâneos no sistema PesqBrasil
- **eSocial**: Suporte completo para login múltiplo no eSocial
- Cria contêineres isolados para cada par de CPF/senha
- Mantém sessões independentes para cada usuário
- Aceita entrada de múltiplos CPFs e senhas separados por tabulação, espaço ou quebras de linha
- Interface moderna com botões dedicados para cada sistema

### 2. Sistema de Escuta (Sinpesca)
- Monitora botões específicos no sistema Sinpesca:
  - **Login Gov**: Automatiza o processo de login no Gov.br
    1. Abre o site do Gov.br
    2. Insere CPF e prossegue
    3. Insere senha e finaliza o login
  - **Login eSocial**: Automatiza o processo de login no eSocial
    1. Abre o eSocial
    2. Clica em "Entrar com Gov.br"
    3. Executa o fluxo completo do Login Gov
- **Automação via Parâmetros de URL**: Permite iniciar automaticamente o processo de login
  - Funciona quando uma URL contém os parâmetros `cpf` e `senha` no formato de hash
  - Compatível com PesqBrasil, Gov.br, eSocial e INSS
  - Útil para integração com outros sistemas ou scripts externos

### 3. Redirecionamento Automático no eSocial
- Oferece duas opções de redirecionamento automático a partir da página inicial de empregador doméstico:
  - **Consultar Guias Pagas**: Redireciona para a página de competências da folha de pagamento
    - Suporte para seleção de ano específico (atual ou anos anteriores)
    - Automação de filtros por ano na página de competências
  - **Gerar GPS**: Redireciona para a página de geração de GPS
    - Configuração de mês específico para competência
    - Preenchimento automático de valor comercializado
    - Automação completa do processo de geração de GPS
- As opções são configuráveis através de toggles na interface da extensão
- Apenas uma opção pode estar ativa por vez
- Ativado após o login no eSocial quando a URL corresponde ao padrão específico

### 4. Renomeação de Downloads
- **INSS (GERID)**: Renomeia automaticamente comprovantes gerados pelo GERID
  - Padroniza os nomes de arquivos para o formato: `nome - CPF - protocolo`
  - Extrai informações diretamente da página para criar nomes de arquivos organizados
- **PesqBrasil**: Renomeia PDFs gerados no sistema PesqBrasil
  - Detecta automaticamente PDFs em iframes e links
  - Gera nomes baseados no usuário logado e tipo de documento
  - Suporta diferentes tipos: Protocolo, Carteira Profissional, Certificado de Regularidade
  - Interface visual com botão de download renomeado

### 5. Preenchimento Automático de REAP
- **Interface Avançada**: Sistema de abas para diferentes anos (2021-2024)
- **Armazenamento de Dados**: Salva dados por ano para reutilização
- **Preenchimento Inteligente**: 
  - Valores padrão para meses de pesca
  - Lista de espécies comuns pré-configuradas
  - Seleção automática de opções gerais (Economia Familiar, Emalhe, Água Doce)
  - Configuração de comercialização por estado (PA)
  - Seleção de venda direta ao consumidor
- **Sistema de Prompts**: Interface moderna para entrada de dados
  - Opção de usar dados salvos por ano
  - Entrada manual com validação de formato
  - Suporte para dados copiados do Excel (separados por TAB)
- **Automação Completa**: Botão para executar todo o processo automaticamente

## Requisitos

- Firefox versão 78 ou superior
- Permissões para acessar sites governamentais específicos
- Contêineres de contexto habilitados (para login múltiplo)

## Como Usar

### Login Múltiplo
1. Clique no ícone da extensão na barra de ferramentas do Firefox
2. Selecione o sistema desejado (PesqBrasil ou eSocial)
3. Cole os pares de CPF/senha no formato solicitado (separados por TAB, espaço ou quebra de linha)
4. A extensão abrirá abas separadas em contêineres isolados para cada login

### Configuração do eSocial
1. Use os toggles para ativar as funcionalidades desejadas:
   - **Consultar Guias Pagas**: Configure o ano desejado
   - **Gerar GPS**: Configure o mês e valor comercializado
2. As configurações são salvas automaticamente
3. Apenas uma opção pode estar ativa por vez

### REAP (PesqBrasil)
1. Navegue até a página do REAP no PesqBrasil
2. Use o sistema de abas para inserir dados por ano (2021-2024)
3. Cole dados do Excel no formato: Quantidade[TAB]Preço (uma linha por espécie)
4. Clique em "Iniciar Automação REAP" para preenchimento automático
5. Use "Abrir Prompt Quantidade e Preço" para entrada manual de dados

### Renomeação de Downloads
- **INSS**: Funciona automaticamente ao baixar comprovantes
- **PesqBrasil**: Aparece botão "Baixar PDF Renomeado" quando PDF é detectado

## Observações

- Esta extensão foi desenvolvida para uso específico com sistemas governamentais brasileiros
- As funcionalidades são ativadas de acordo com as URLs visitadas
- Os dados de login são armazenados temporariamente apenas na sessão atual do navegador
- As configurações do eSocial e dados do REAP são salvos localmente no navegador

---

## Documentação Técnica

Esta seção fornece detalhes técnicos sobre a implementação da extensão, destinada a desenvolvedores que precisam entender, manter ou estender suas funcionalidades.

### Estrutura de Arquivos

```
├── META-INF/               # Arquivos de assinatura da extensão
├── background.js          # Script principal executado em segundo plano
├── content-download.js    # Script para renomear downloads (INSS e PesqBrasil)
├── content-esocial.js     # Script para redirecionamento e automação no eSocial
├── content-reap.js        # Script para automação do formulário REAP
├── content-script.js      # Script para comunicação entre página e extensão
├── icon.png               # Ícone da extensão
├── manifest.json          # Configuração da extensão
├── popup.html             # Interface principal da extensão
├── popup.js               # Lógica da interface popup
├── popup.css              # Estilos da interface popup
├── prompt.html            # Página HTML para exibir prompts
└── prompt.js              # Script para gerenciar prompts
```

### Componentes Principais

#### 1. Script de Background (background.js)

O script de background é o componente central da extensão, responsável por:

- Gerenciar contêineres isolados para múltiplas sessões
- Processar mensagens dos scripts de conteúdo e popup
- Armazenar e gerenciar credenciais temporárias
- Coordenar o fluxo de automação entre diferentes páginas
- Suporte para automação via parâmetros de URL (hash)
- Gerenciamento de configurações do eSocial

Funções principais:
- `getPromptInput()`: Exibe um prompt para o usuário e retorna o valor inserido
- `setReactInputValue()`: Preenche campos em aplicações React
- `clickElement()`: Simula cliques em elementos da página
- `waitForElement()`: Aguarda a disponibilidade de elementos na página
- `processarAba()`: Gerencia o fluxo de automação para PesqBrasil
- `processarAbaESocial()`: Gerencia o fluxo de automação para eSocial
- `processarAbaHash()`: Processa automação via parâmetros de URL
- `armazenarCredenciais()`: Armazena credenciais temporariamente
- `recuperarCredenciais()`: Recupera credenciais armazenadas

#### 2. Scripts de Conteúdo

##### content-script.js
Script genérico que repassa mensagens do site para o background da extensão, permitindo a comunicação entre a página web e a extensão.

##### content-download.js
Implementa funcionalidades de renomeação de downloads para INSS e PesqBrasil:

**Módulo INSS (DownloadManager)**:
- Extrai dados do sócio da página (nome, CPF, protocolo)
- Gera nomes padronizados para arquivos baixados
- Intercepta cliques em links de download para renomear arquivos

**Módulo PesqBrasil**:
- Detecta PDFs em iframes e links automaticamente
- Extrai nome do usuário logado da interface
- Determina tipo de documento (Protocolo, Carteira, Certificado)
- Cria botão visual "Baixar PDF Renomeado"
- Suporte para diferentes tipos de documentos

##### content-esocial.js
Script que gerencia o redirecionamento e automação no eSocial:

**Funcionalidades**:
- Redirecionamento automático baseado em configurações
- Automação de filtros por ano na página de competências
- Preenchimento automático de valores na geração de GPS
- Resposta a atualizações de configuração em tempo real
- Suporte para diferentes páginas do eSocial

**Módulos**:
- `processarConfiguracoes()`: Gerencia redirecionamentos
- `automatizarCompetencias()`: Automação de filtros por ano
- `automatizarGPS()`: Preenchimento automático de valores

##### content-reap.js
Implementa automação completa para o formulário REAP:

**Módulos Principais**:
- `Config`: Valores padrão e configurações
- `Utils`: Utilitários para manipulação de elementos
- `SelectionManager`: Gerenciamento de seleções em listas
- `FillManager`: Preenchimento automático de campos
- `SpeciesManager`: Gerenciamento de espécies
- `UIManager`: Interface de usuário
- `AutomationManager`: Execução da automação completa

**Funcionalidades**:
- Sistema de abas para diferentes anos (2021-2024)
- Armazenamento de dados por ano
- Interface moderna para entrada de dados
- Validação de formato de entrada
- Suporte para dados do Excel

#### 3. Interface Popup

##### popup.html, popup.js e popup.css
Implementam a interface principal da extensão:

**popup.html**:
- Estrutura HTML da interface moderna
- Seções organizadas para cada funcionalidade
- Sistema de abas para configurações REAP
- Toggles para configurações do eSocial
- Botões para login múltiplo

**popup.js (SinpescaPopup)**:
- Classe principal para gerenciamento da interface
- Comunicação com background script
- Armazenamento de configurações
- Validação de entrada de dados
- Formatação automática de valores monetários

**popup.css**:
- Design moderno e responsivo
- Animações e transições suaves
- Tema consistente com cores oficiais
- Interface adaptável para diferentes tamanhos

#### 4. Sistema de Prompt

##### prompt.html e prompt.js
Implementam um mecanismo simples para solicitar informações ao usuário:
- `prompt.html`: Página minimalista que carrega o script
- `prompt.js`: Exibe o prompt, captura a resposta e envia de volta para o background

### Fluxos de Execução

#### Login Múltiplo
1. Usuário clica no ícone da extensão
2. Seleciona o sistema desejado (PesqBrasil ou eSocial)
3. Extensão solicita CPFs e senhas através do prompt
4. Para cada par CPF/senha:
   - Cria um contêiner isolado
   - Abre uma nova aba no contêiner
   - Navega para o site correspondente
   - Armazena as credenciais temporariamente
   - Executa o fluxo de login específico

#### Automação de Login Gov.br
1. Script de conteúdo detecta clique no botão "Login Gov"
2. Envia mensagem para o background
3. Background abre o site do Gov.br
4. Preenche CPF e senha automaticamente
5. Completa o processo de login

#### Automação via Parâmetros de URL
1. A extensão detecta quando uma URL contém parâmetros de CPF e senha no formato de hash
2. Extrai as credenciais do hash da URL
3. Identifica o site atual (PesqBrasil, Gov.br, eSocial, INSS)
4. Executa o fluxo de automação específico para o site
5. Preenche os campos de login e senha automaticamente

#### Redirecionamento eSocial
1. Usuário configura opções na interface popup
2. Configurações são salvas no storage local
3. Ao acessar página inicial do eSocial, verifica configurações ativas
4. Redireciona automaticamente para página correspondente
5. Executa automações específicas (filtros, preenchimento de valores)

#### Renomeação de Downloads
**INSS**:
1. `content-download.js` é injetado em páginas do INSS
2. Quando detecta um link de download, extrai informações da página
3. Intercepta o clique no link e modifica o atributo `download` com o nome padronizado

**PesqBrasil**:
1. Detecta PDFs em iframes ou links
2. Extrai nome do usuário e tipo de documento
3. Cria botão visual "Baixar PDF Renomeado"
4. Intercepta download e aplica nome personalizado

#### Automação REAP
1. Usuário navega para página do REAP
2. Script detecta página e cria botões de interface
3. Usuário pode inserir dados por ano nas abas
4. Ao clicar "Iniciar Automação", executa sequência completa:
   - Seleciona opções gerais
   - Adiciona espécies
   - Preenche meses com valores padrão
   - Solicita dados de quantidade e preço
   - Preenche campos automaticamente

### Considerações de Segurança

- As credenciais são armazenadas apenas temporariamente na memória do navegador
- Os contêineres isolados garantem que as sessões não interfiram entre si
- As credenciais são removidas quando as abas são fechadas
- Configurações são armazenadas localmente no navegador (não enviadas para servidores externos)
- Dados do REAP são mantidos apenas no storage local do navegador

### Limitações Conhecidas

- A extensão depende da estrutura atual dos sites governamentais
- Alterações nos seletores CSS ou na estrutura das páginas podem quebrar a automação
- O preenchimento automático do REAP utiliza valores padrão que podem precisar de ajustes
- A detecção de PDFs no PesqBrasil pode falhar se a estrutura da página mudar
- As configurações do eSocial são específicas para empregador doméstico

### Versão Atual

**v1.4** - Principais funcionalidades implementadas:
- Login múltiplo para PesqBrasil e eSocial
- Interface moderna com popup responsivo
- Sistema de configurações persistente
- Renomeação de downloads para INSS e PesqBrasil
- Automação completa do REAP com interface de abas
- Redirecionamento automático no eSocial
- Suporte para automação via parâmetros de URL

### Extensão e Manutenção

Para adicionar suporte a novos sites ou funcionalidades:

1. Crie um novo script de conteúdo específico para o site
2. Adicione a configuração do script no `manifest.json`
3. Implemente a lógica de automação necessária
4. Se necessário, adicione comunicação com o script de background
5. Para novas funcionalidades na interface, atualize `popup.html`, `popup.js` e `popup.css`