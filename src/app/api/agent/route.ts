// src/app/api/agent/route.ts

import { streamText, convertToModelMessages } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { type UIMessage, type UIMessagePart, type UIDataTypes, type UITools } from 'ai';

const groq = createGroq({});

export const runtime = 'edge';

const tools = {
  create_variable: {
    description: 'Creates a new variable in the workspace.',
    parameters: {
      type: 'object',
      properties: {
        variable_name: {
          type: 'string',
          description: 'The name of the variable to create, e.g., "score".',
        },
      },
      required: ['variable_name'],
  additionalProperties: false, 
    },
  },
  create_block: {
    description: `Creates a new, unconnected block in the workspace.
      Common block types include:
      - "controls_if" for an if statement.
      - "controls_for" for a for loop.
      - "text_print" for printing a message.
      - "math_number" for a number value.`,
    parameters: {
      type: 'object',
      properties: {
        block_type: {
          type: 'string',
          description: 'The type of the block to create, e.g., "controls_if".',
        },
        // Accept a common alias 'type' to reduce tool-call friction from models
        type: {
          type: 'string',
          description: 'Alias for block_type. If provided, it will be treated as block_type.',
        },
      },
      // Require at least one of the accepted keys
      anyOf: [
        { required: ['block_type'] },
        { required: ['type'] },
      ],
      additionalProperties: false,
    },
  },
};

const systemPrompt = `
You are an expert AI assistant that can control a Blockly visual programming workspace.
You have access to a set of tools to create and manipulate blocks.

- When the user asks you to perform an action (e.g., "create a variable", "make a loop"), you MUST use the provided tools.
- When calling a tool, you MUST ONLY use the parameters that are explicitly defined in the tool's schema. Do not invent new parameters.
- If the user is just having a normal conversation (e.g., "hello", "how does this work?"), respond as a helpful assistant without using any tools.
`;

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  // Workaround: filter out unsupported tool UI parts (e.g., state: 'input-available')
  const sanitizedMessages: UIMessage[] = messages.map((m) => {
    if (!m?.parts || !Array.isArray(m.parts)) return m;
    const filteredParts = (m.parts as UIMessagePart<UIDataTypes, UITools>[]).filter((p) => {
      if (!p || typeof p !== 'object') return true;
      const t = p.type;
      if (t === 'dynamic-tool' || (typeof t === 'string' && t.startsWith('tool-'))) {
        // Drop parts in the transitional state that the converter doesn't support
        const toolState = (p as unknown as { state?: string }).state;
        if (toolState === 'input-available') return false;
      }
      return true;
    });
    return { ...m, parts: filteredParts } as UIMessage;
  });

  const modelMessages = convertToModelMessages(sanitizedMessages);

  const result = await streamText({
    model: groq('llama3-8b-8192'),
    system: systemPrompt,
    messages: modelMessages,
    tools,
  });

  return result.toUIMessageStreamResponse();
}