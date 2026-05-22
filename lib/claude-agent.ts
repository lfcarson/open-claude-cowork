import OpenAI from 'openai';
import { M365_TOOLS } from './m365-tools';
import { executeTool } from './tool-executor';

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

## Capabilities
You have direct access to the user's Microsoft 365 environment via function tools:
- **Mail**: list, read, search, send, and reply to Outlook emails
- **Calendar**: view upcoming events, create new calendar events
- **Files**: list and search OneDrive / SharePoint documents
- **Tasks**: view and create tasks in Microsoft To Do
- **People**: search the organisational directory

Always use these tools to fetch live data — never guess or fabricate email subjects, dates, or file names.

## Li & Fung Domain Knowledge
Li & Fung is a global supply chain and logistics company. The user is likely a:
- Merchandiser, Buyer, or Sourcing Manager working with vendors across Asia
- Involved in: vendor RFQs, sample approvals, costing reviews, TNA (Time & Action) calendars, buying trips, contract negotiations, customer approvals

Key terminology to recognise:
- **RFQ** – Request for Quotation from a vendor
- **TNA** – Time & Action calendar; a critical-path tracker for product development milestones
- **Sample approval** – Physical or digital sign-off on a product prototype before bulk production
- **CMT** – Cut, Make & Trim (a type of vendor arrangement)
- **FOB / DDP / LDP** – Incoterms used in vendor contracts
- **OTB** – Open-to-Buy (budget for purchasing)
- **APS** – Approved Product/Proto Sample

## Response style
- Professional, concise, action-oriented — the user is busy
- After a tool call returns data, synthesise it into a readable summary with bold headings and bullet points
- If an operation (send email, create event) succeeded, confirm it in one sentence
- If you need multiple tool calls to answer a question, proceed with them in sequence without asking permission
- Today's date: ${new Date().toLocaleDateString('en-HK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- User's timezone context: Hong Kong (HKT, UTC+8) — format dates/times accordingly`;

// Safety cap on how many tool-call rounds the agent can make per user message
const MAX_TOOL_TURNS = 6;

export async function* streamAgentResponse(params: AgentStreamParams) {
  const { message, history, userName = 'User', userEmail = '', accessToken } = params;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt(userName, userEmail) },
    ...history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const stream = await getClient().chat.completions.create({
      model: getModel(),
      messages,
      tools: M365_TOOLS,
      tool_choice: 'auto',
      stream: true,
      max_tokens: 4096,
    });

    let textAccum = '';
    // Tool call deltas arrive piecemeal; accumulate by index
    const tcAccum: Record<number, { id: string; name: string; args: string }> = {};
    let finishReason: string | null = null;

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      finishReason = choice.finish_reason ?? finishReason;
      const delta = choice.delta;

      if (delta.content) {
        textAccum += delta.content;
        yield { type: 'text', content: delta.content };
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!tcAccum[idx]) {
            tcAccum[idx] = { id: tc.id ?? crypto.randomUUID(), name: '', args: '' };
          }
          if (tc.id) tcAccum[idx].id = tc.id;
          if (tc.function?.name) tcAccum[idx].name += tc.function.name;
          if (tc.function?.arguments) tcAccum[idx].args += tc.function.arguments;
        }
      }
    }

    const toolCalls = Object.values(tcAccum);

    if (finishReason === 'tool_calls' && toolCalls.length > 0) {
      // Append assistant turn (with tool_calls) so the next round has context
      messages.push({
        role: 'assistant',
        content: textAccum || null,
        tool_calls: toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.args },
        })),
      });

      // Execute each tool call and stream the events
      for (const tc of toolCalls) {
        let input: Record<string, unknown> = {};
        try { input = JSON.parse(tc.args || '{}'); } catch { /* keep empty */ }

        yield { type: 'tool_use', id: tc.id, name: tc.name, input };

        let result: string;
        let isError = false;
        if (accessToken) {
          result = await executeTool(tc.name, input, accessToken);
        } else {
          result = 'No M365 access token available. Please sign out and sign in again.';
          isError = true;
        }

        yield { type: 'tool_result', tool_use_id: tc.id, content: result, is_error: isError };

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result,
        });
      }
      // Continue to next turn so the LLM can synthesise the results
    } else {
      // LLM finished with a text response — we're done
      yield { type: 'done' };
      return;
    }
  }

  // Reached turn limit — tell the user
  yield {
    type: 'text',
    content: '\n\n*Reached the maximum number of tool-use rounds. Please try a more specific question.*',
  };
  yield { type: 'done' };
}
