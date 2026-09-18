# CRM Notes — Notas profissionais + Pipeline de Vendas

Um **“Google Keep profissional”** com foco em CRM para empresas de tecnologia: notas coloridas e categorizáveis,
**pipeline de vendas em Kanban com as 6 etapas de atendimento**, dados de cliente/negócio em cada nota,
**alarmes programáveis com popup e som** e telas de acompanhamento (Agenda & Análises).

O sistema já sobe **com dados de exemplo reais de uma empresa de tecnologia** — 29 notas, 8 categorias,
11 alarmes e 15 negócios distribuídos no funil — para você testar tudo imediatamente.

---

## 🚀 Como rodar

```bash
npm install
npm run dev
```

| Serviço | Endereço | Descrição |
| --- | --- | --- |
| **App (Vite + React)** | **http://localhost:5173** | Interface completa com hot reload (proxy `/api` → backend) |
| API + interface compilada | http://localhost:3001 | REST + SSE **e também serve o app** (build mantido atualizado em tempo real) |
| Dados | `server/data/db.json` | Criado automaticamente na primeira execução |

> ℹ️ **As duas portas abrem o sistema.** A porta 3001 (API) passou a servir a interface compilada,
> então não aparece mais o erro `Cannot GET /` se o preview abrir a porta da API.
> Em `npm run preview` a interface e a API ficam na **mesma porta** (3001).

Outros comandos: `npm run build` (build de produção em `dist/`), `npm run build:web` (build sem typecheck),
`npm run preview` (build + serve tudo na 3001), `npm run typecheck`.

---

## 🧭 O que já está implementado

### 📌 Notas estilo Keep — só que mais robustas
- **20 cores** de organização visual (do “Padrão” ao “Limão”), aplicáveis por card ou pelo editor.
- **Fixar**, **arquivar**, **lixeira** com *restaurar* e *excluir definitivamente* + **esvaziar lixeira**.
- **Exclusão automática após 30 dias** na lixeira (como no Keep).
- **Busca global** (`Ctrl+K`) por título, conteúdo, cliente, empresa, e-mail, telefone e tags.
- **Categorias personalizadas** criadas por você, cada uma com cor própria (renomear, trocar cor, excluir — as notas são preservadas).
- **Edição fácil e persistente**: título, conteúdo, cor, categoria, prioridade, tags, checklist e campos de CRM são salvos automaticamente (debounce), inclusive ao fechar o editor.
- Layouts: **mosaico**, **grade** e **lista**; ordenação por recentes, criação, título, maior valor, previsão de fechamento e prioridade.
- **Badges de prioridade** (baixa / média / alta / urgente) e **detalhes de CRM** visíveis no próprio card (empresa, contato, e-mail, telefone, valor).
- **Checklist** com barra de progresso e **histórico de movimentações** por nota (mudança de etapa, cor, lixeira, reordenação).

### 🔄 Pipeline de atendimento (o diferencial)
Menu lateral → **Pipeline de Vendas** → quadro Kanban com as 6 etapas exatas:

**Prospecção → 1º Atendimento → Criação → Apresentação → Venda → Fechamento**

- **Arraste e solte** os cards entre colunas (com indicador visual de posição de inserção e reordenação dentro da coluna).
- Cada nota pode ter **empresa, contato, e-mail, telefone e valor do negócio (R$)**; contato e telefone viram links de e-mail/WhatsApp.
- **Cabeçalho de cada coluna com quantidade e soma de valores em R$**; o rodapé do topo mostra **Total no pipeline**, **Em negociação** e **Fechado (ganho)**.
- **Criação rápida** de negócio direto na coluna (título, empresa e valor) e busca/filtro por categoria dentro do quadro.
- Mudanças de etapa geram automaticamente entrada no histórico da nota e novo `updatedAt`.

### ⏰ Alarmes e lembretes programáveis
- Data/hora + **repetição**: nenhuma / diária / semanal / mensal (reagendamento automático ao concluir).
- **Popup com som** disparado na hora certa — verificação **a cada 20 segundos**.
- **4 toques de alarme** sintetizados (Sino, Alerta, Campainha, Digital), com controle de volume e botão de teste.
- **Notificação nativa do navegador** (pedido de permissão em Configurações → Notificações).
- Ações no popup: **+5 min**, **+15 min**, **+1 hora**, **Concluir**, **Abrir nota**.
- Tela dedicada **Lembretes**: atrasados, hoje, próximos 7 dias, mais adiante e concluídos, com *adiar*, *concluir*, *excluir* e **testar popup na hora** (⚡).
- Cada nota mostra o **próximo alarme pendente** no card e o editor tem a aba **Alarmes** para agendar (+5 min, +1 h, amanhã ou data específica).

### 🎨 Visual profissional
- Sidebar fixa com navegação por **CRM** (Pipeline, Lembretes, Agenda), **Etapas de atendimento** (com contadores),
  **Categorias** (com cor, edição rápida e criação inline), **Fixadas**, **Arquivadas** e **Lixeira**.
- Feito com **Tailwind CSS v4**, tema claro/escuro, tipografia Inter, sombras suaves e microinterações.
- **Pills de etapa coloridas**, chips de prioridade, contadores por seção e estados vazios orientativos.
- Layout responsivo: drawer lateral no mobile, mosaico adaptativo no desktop.

### 📊 Agenda & Análises
- Calendário mensal com marcadores de alarmes (🔔) e previsões de fechamento (💰) e lista do dia selecionado.
- KPIs: pipeline total, receita fechada, em negociação e **taxa de conversão**.
- **Funil por etapa** com valor, quantidade, ticket médio e barras comparativas.
- Painel de produtividade (notas ativas, fixadas, alarmes pendentes/atrasados, arquivadas, lixeira).

---

## 🗂 Estrutura do projeto

```
├── index.html
├── vite.config.ts            # Tailwind v4 + proxy /api → :3001 + allowedHosts p/ preview
├── server/
│   ├── index.js              # API REST (Express) + SSE + reseed + export
│   ├── store.js              # Persistência em JSON com escrita atômica e limpeza da lixeira
│   ├── seed.js               # Dados de exemplo (empresa de tecnologia brasileira)
│   └── data/db.json          # Banco (criado automaticamente; ignorado no git)
└── src/
    ├── App.tsx               # Orquestração das telas, filtros, composer e modais
    ├── types.ts              # Modelos (Note, Category, Reminder, Settings...)
    ├── hooks/useCrmNotes.ts  # Estado global, persistência, motor de alarmes (20 s)
    ├── lib/                  # api, cores (20), constantes/etapas, datas pt-BR, som, notificações
    └── components/           # Sidebar, TopBar, NoteCard, NoteEditorModal, Pipeline,
                              # RemindersView, AgendaView, ReminderPopup, SettingsModal
```

### Modelo de dados (resumo)

```ts
Note        { title, content, color, categoryId, tags[], pinned, archived, trashed, priority,
              stage, inPipeline, order, company, client, email, phone, dealValue, dueDate,
              checklist[], history[], createdAt, updatedAt }
Category    { name, color }
Reminder    { noteId, title, at, repeat: none|daily|weekly|monthly, done, active }
Settings    { theme, soundEnabled, sound, volume, notificationsEnabled, mondayFirst }
```

---

## 🔌 API

| Método | Rota | Uso |
| --- | --- | --- |
| GET | `/api/state` | Estado completo (notas + categorias + alarmes + preferências) |
| PUT | `/api/state` | Substitui a coleção (usado por importação de backup) |
| GET/POST | `/api/notes` | Lista / cria ou atualiza nota |
| PUT | `/api/notes` | Salva várias notas (usado ao arrastar cards no Kanban) |
| PUT/DELETE | `/api/notes/:id` | Atualiza parcialmente / exclui definitivamente |
| POST/PUT/DELETE | `/api/categories` `/api/categories/:id` | CRUD de categorias (notas ficam sem categoria ao excluir) |
| POST/PUT/DELETE | `/api/reminders` `/api/reminders/:id` | CRUD de alarmes |
| PATCH | `/api/settings` | Preferências (tema, som, notificações) |
| GET | `/api/events` | SSE — sincroniza várias abas/dispositivos em tempo real |
| POST | `/api/reseed` · GET `/api/export` | Restaurar dados de exemplo · baixar backup |

---

## 🧪 Roteiro de teste rápido (com os dados de exemplo)

1. **Notas**: abra *Todas as notas* → clique em um card → troque a cor (paleta), a categoria, a prioridade e as tags; feche e reabra para confirmar a persistência.
2. **Pipeline**: *Pipeline de Vendas* → arraste “Grupo Andrade” de **Prospecção** para **1º Atendimento** e observe o contador e a soma em R$ de cada coluna.
3. **Categoria**: em *Categorias*, crie “Financeiro 2” com cor própria, renomeie, e exclua — as notas permanecem.
4. **Alarme**: abra uma nota → aba **Alarmes** → **+5 min (teste)**; volte a qualquer tela e aguarde a verificação (no máximo 20 s) → o popup com som abre. Use ⚡ na tela *Lembretes* para ver o popup na hora.
5. **Notificação nativa**: *Configurações* → **Permitir** → o navegador passa a exibir notificações junto ao popup.
6. **Lixeira**: mova uma nota para a lixeira, restaure e depois use *Esvaziar lixeira*.
7. **Agenda**: selecione um dia com 🔔/💰 e abra o compromisso direto da lista.
8. **Backup**: *Configurações* → **Exportar backup** / **Importar backup** / **Restaurar dados de exemplo**.

### Atalhos
- `Ctrl+K` (ou `⌘K`) — foca a busca global
- `Esc` — fecha o editor, popups e modais

### Se aparecer "Cannot GET ..."
1. Confirme que está usando a porta **5173** (Vite) ou a **3001** — nas duas o app carrega normalmente.
2. Se a mensagem for em outra porta, rode `npm run dev` (sobe API + Vite + build automático) ou `npm run preview`.
3. `GET /api/rota-inexistente` continua respondendo JSON de erro — isso é esperado na API.

---

## 🧱 Decisões técnicas

- **Vite + React 19 + TypeScript estrito** no front e **Express 5** no back: dois processos simples (`npm run dev` sobe os dois).
- **Tailwind v4** (`@tailwindcss/vite`) com `@theme` para a paleta da marca e variante `dark` por classe.
- **Persistência em arquivo JSON** com escrita atômica e *debounce*: zero dependências nativas, fácil de inspecionar e mover para banco depois.
- **SSE** em vez de polling para refletir alterações entre abas; o cliente também reconcilia o estado após cada operação.
- **Fallback de duas portas**: o servidor Express serve `dist/` (SPA) quando existe build e, se não existir,
  mostra uma página que redireciona para a porta do Vite — assim nenhuma porta do preview devolve "Cannot GET".
- **Alarme com estado “acknowledged”**: som e notificação tocam apenas quando o horário vence (sem repetir a cada checagem), e alarmes recorrentes são reprogramados ao concluir.
- **Som gerado via WebAudio** (sem arquivos de áudio) e desbloqueado no primeiro clique, respeitando a política de autoplay.

## 🔭 Próximos passos sugeridos
Autenticação e multiusuário (com trilha de auditoria por usuário), troca de JSON por PostgreSQL/SQLite,
anexos e áudios nas notas, campos personalizados por etapa, automações (“sem interação por 3 dias → criar alarme”),
webhooks para WhatsApp/e-mail e importação de CSV de leads.
