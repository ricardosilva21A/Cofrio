# CloudVault

Gestor de passwords com web app e extensão de browser. Tudo é encriptado no teu dispositivo, e o servidor guarda apenas dados cifrados.

## Funcionalidades

**Web app**

- Conta com email e cofre protegido por master password.
- Chave de recuperação para o caso de esqueceres a master password.
- Reconhecimento de websites a partir do nome ou do link, como `GitHub` ou `https://accounts.google.com/...`.
- Pesquisa por site ou utilizador, com várias palavras por qualquer ordem.
- Botões para copiar o utilizador e a password em cada linha da lista.
- Atalhos de teclado: `Alt+U` copia o utilizador e `Alt+P` copia a password.
- Gerador de passwords configurável.
- Bloqueio automático após 5 minutos sem atividade.
- Limpeza da área de transferência 30 segundos depois de copiar, com o separador em foco.
- Interface em português, com tema claro e escuro, adaptada a telemóvel.

**Extensão para Chrome, Edge e Brave**

- Mostra as contas do site aberto e preenche o login com um clique ou com `Enter`.
- Abre com `Ctrl+Shift+L`.
- Pesquisa em todo o cofre, com cópia do utilizador e da password.
- Bloqueio automático após 15 minutos sem a abrires e quando fechas o browser.

## O que mudou face à versão anterior

A versão anterior era uma aplicação de desktop em Python com Tkinter e SQLite. Foi substituída por completo.

| | Versão anterior | Versão atual |
| --- | --- | --- |
| Plataforma | Desktop, só no computador local | Web app e extensão de browser |
| Dados | SQLite local | Supabase, disponível em vários dispositivos |
| Chave de encriptação | Ficheiro `key.key` | Derivada da master password com Argon2id |
| Master password | Hash SHA-256 que só abria a interface | Protege realmente a encriptação |
| O que é cifrado | Apenas a password | Site, utilizador, password e notas |
| Recuperação | Nenhuma | Chave de recuperação |
| Gerador | `random`, previsível | Aleatoriedade criptográfica |
| Gerir entradas | Adicionar e ver | Adicionar, ver, editar e apagar |
| Pesquisa | Falhava na maioria dos casos | Por site, domínio e utilizador |
| Preenchimento de logins | Não existia | Extensão de browser |

Foram também corrigidos os problemas da versão anterior: entradas duplicadas ao adicionar, mostrar a password de outro site com nome parecido e erros ao cancelar pedidos.

## Segurança

- A master password nunca sai do dispositivo. Sem ela e sem a chave de recuperação, o cofre não pode ser recuperado.
- Os dados são cifrados com **AES-256-GCM** antes de serem enviados.
- No Supabase, as políticas de Row Level Security limitam cada utilizador às suas próprias linhas.
- A extensão só acede à página aberta quando a ativas e nunca preenche sozinha.
- O preenchimento exige HTTPS e que o domínio corresponda ao da entrada. Domínios parecidos, como `github.com.evil.io`, são rejeitados.
- A lista de websites é local, para nenhum serviço externo saber em que sites tens conta.

## Tecnologias

Next.js, TypeScript, Tailwind CSS, Supabase, Vitest, esbuild e Chrome Extensions Manifest V3.

## Instalação

Requer Node.js e um projeto Supabase. O plano gratuito é suficiente para uso pessoal, mas os projetos sem atividade são pausados e têm de ser reativados no painel.

1. Instala as dependências:

   ```bash
   npm install
   ```

2. Aplica a migração em `supabase/migrations` no teu projeto Supabase.

3. Copia `.env.example` para `.env.local` e preenche o URL e a chave publicável do projeto.

4. Inicia a web app em http://localhost:3000:

   ```bash
   npm run dev
   ```

## Instalar a extensão

A instalação em modo de programador é gratuita.

1. Compila a extensão:

   ```bash
   npm run build:extension
   ```

2. Abre `chrome://extensions` ou `edge://extensions` e ativa o **Modo de programador**.

3. Clica em **Carregar expandida** e escolhe a pasta `extension/dist`.

4. Cria o cofre na web app antes de entrares na extensão.

Depois de voltares a compilar, carrega no botão de atualizar da extensão em `chrome://extensions`.

## Limitações conhecidas

- A extensão ainda não guarda passwords novas. As entradas são criadas na web app.
- Logins alojados noutro domínio não aparecem em **Neste site**, mas podem ser pesquisados e copiados.
- Campos dentro de iframes não são preenchidos.

## Comandos

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção da web app |
| `npm run build:extension` | Compila a extensão para `extension/dist` |
| `npm test` | Testes de encriptação, gerador e reconhecimento de websites |
| `npm run lint` | Lint |

## Estrutura

- `src/lib/crypto`: encriptação e gerador de passwords
- `src/lib/sites.ts`: reconhecimento de websites e correspondência de domínios
- `src/lib/vault-api.ts`: acesso aos dados no Supabase
- `src/components`: ecrãs da web app
- `extension`: extensão de browser
- `supabase/migrations`: esquema e políticas de acesso

## Autores

Ricardo Silva, Guillermo López de Arechavaleta e Saúl Sauca.
