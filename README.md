# CloudVault

Gestor de passwords web com encriptação no próprio dispositivo. O servidor guarda apenas dados cifrados.

## Como funciona

- A chave é derivada da master password com **Argon2id**, no browser.
- Site, utilizador, password e notas são cifrados com **AES-256-GCM** antes de serem enviados.
- A master password nunca sai do dispositivo. Se a perderes, só a **chave de recuperação** dá acesso ao cofre.
- No **Supabase**, as políticas de Row Level Security limitam cada utilizador às suas próprias linhas.

## Tecnologias

Next.js, TypeScript, Tailwind CSS, Supabase e Vitest.

## Instalação

1. Instala as dependências:

   ```bash
   npm install
   ```

2. Cria um projeto no Supabase e aplica a migração em `supabase/migrations`.

3. Copia `.env.example` para `.env.local` e preenche o URL e a chave publicável do projeto.

4. Inicia a aplicação em http://localhost:3000:

   ```bash
   npm run dev
   ```

## Comandos

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm test` | Testes de encriptação e do gerador |
| `npm run lint` | Lint |

## Estrutura

- `src/lib/crypto`: encriptação e gerador de passwords
- `src/lib/vault-api.ts`: acesso aos dados no Supabase
- `src/components`: ecrãs da aplicação
- `supabase/migrations`: esquema e políticas de acesso

## Autores

Ricardo Silva, Guillermo López de Arechavaleta e Saúl Sauca.
