import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

const SYSTEM_PROMPT = (userName: string, userEmail: string) => `You are LF Cowork, an AI assistant embedded in the Li & Fung enterprise workspace.

The signed-in user is: ${userName} (${userEmail})

You have access to their Microsoft 365 environment through MCP tools — Outlook, Teams, OneDrive, SharePoint, Calendar, and ToDo. When the user asks about emails, meetings, files, or colleagues, use those tools.

Li & Fung context:
- Global supply chain and logistics company
- Key business areas: sourcing, merchandising, vendor management, buying trips, sample approvals, costing reviews
- Users frequently deal with: vendor RFQs, TNA calendars, customer approvals, travel logistics, contract management

Always be professional, concise, and action-oriented. When performing M365 operations, confirm what you found or did.`;

export async function* streamAgentResponse(params: AgentStreamParams) {
  const { message, history, userName = 'User', userEmail = '' } = params;

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT(userName, userEmail),
    messages,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      if (event.delta.type === 'text_delta') {
        yield { type: 'text', content: event.delta.text };
      }
    } else if (event.type === 'content_block_start') {
      if (event.content_block.type === 'tool_use') {
        yield {
          type: 'tool_use',
          id: event.content_block.id,
          name: event.content_block.name,
          input: {},
        };
      }
    } else if (event.type === 'message_stop') {
      yield { type: 'done' };
    }
  }
}
