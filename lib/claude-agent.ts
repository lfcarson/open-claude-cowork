import OpenAI from 'openai';

// Lazy singleton — avoids instantiation at build time when env vars aren't set
let _openai: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
        'X-Title': 'LF Cowork',
      },
    });
  }
  return _openai;
}

// Default model — override via OPENROUTER_MODEL env var
// Any slug from https://openrouter.ai/models works (e.g. openai/gpt-4o)
function getModel(): string {
  return process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4-5';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentStreamParams {
  message: string;
  history: ChatMessage[];
  userName?: string;
  userEmail?: string;
  accessToken?: string;
}

const systemPrompt = (userName: string, userEmail: string) =>
  `You are LF Cowork, an AI assistant embedded in the Li & Fung enterprise workspace.

The signed-in user is: ${userName} (${userEmail})

You have access to their Microsoft 365 environment through MCP tools — Outlook, Teams, OneDrive, SharePoint, Calendar, and ToDo. When the user asks about emails, meetings, files, or colleagues, use those tools.

Li & Fung context:
- Global supply chain and logistics company
- Key business areas: sourcing, merchandising, vendor management, buying trips, sample approvals, costing reviews, TNA calendars
- Users frequently deal with: vendor RFQs, customer approvals, travel logistics, contract management, sample feedback

Always be professional, concise, and action-oriented. When performing M365 operations, confirm what you found or did.`;

export async function* streamAgentResponse(params: AgentStreamParams) {
  const { message, history, userName = 'User', userEmail = '' } = params;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt(userName, userEmail) },
    ...history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  const stream = await getClient().chat.completions.create({
    model: getModel(),
    messages,
    stream: true,
    max_tokens: 4096,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (!delta) continue;

    if (delta.content) {
      yield { type: 'text', content: delta.content };
    }

    // Tool calls (Phase 3: will be populated when MCP tools are wired in)
    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        if (tc.function?.name) {
          yield {
            type: 'tool_use',
            id: tc.id ?? crypto.randomUUID(),
            name: tc.function.name,
            input: tc.function.arguments ? JSON.parse(tc.function.arguments) : {},
          };
        }
      }
    }

    if (chunk.choices[0]?.finish_reason === 'stop') {
      yield { type: 'done' };
    }
  }
}
