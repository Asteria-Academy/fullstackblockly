// src/components/AiChatbox.tsx

"use client";

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  type UIMessage,
  type UIMessagePart,
  type UIDataTypes,
  type UITools,
  type DynamicToolUIPart,
  isToolUIPart,
} from 'ai';

interface AiChatboxProps {
  onAiCreateBlock: (args: { block_type: string }) => { success: boolean; message?: string; error?: string };
  onAiCreateVariable: (args: { variable_name: string }) => { success: boolean; message?: string; error?: string };
}

export function AiChatbox({ onAiCreateBlock, onAiCreateVariable }: AiChatboxProps) {
  const { messages, sendMessage, status, error, clearError } = useChat<UIMessage>({
    transport: new DefaultChatTransport({ api: '/api/agent' }),
    onError: (err) => {
      console.error('Chat error:', err);
    },
  onToolCall: async ({ toolCall }) => {
      let output: string | { error?: string } | undefined;

      switch (toolCall.toolName) {
        case 'create_block': {
      // Normalize alias: some models may send { type: "controls_if" }
      const input = toolCall.input as { block_type?: string; type?: string };
      const normalized = { block_type: input.block_type ?? input.type } as { block_type: string };
      const { success, message, error } = onAiCreateBlock(normalized);
          output = success ? message : { error: error };
          break;
        }

        case 'create_variable': {
          const { success, message, error } = onAiCreateVariable(toolCall.input as { variable_name: string });
          output = success ? message : { error: error };
          break;
        }

        default: {
          output = { error: `Unknown tool "${toolCall.toolName}"` };
        }
      }

      const maybeToolCall = toolCall as { setOutput?: (value: unknown) => void };
      if (typeof maybeToolCall.setOutput === 'function') {
        maybeToolCall.setOutput(output);
      }
    },
  });


  const [input, setInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    try {
      await sendMessage({ text });
      setInput('');
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const renderParts = (parts: UIMessagePart<UIDataTypes, UITools>[]) => {
    return parts
      .map((part) => {
        if (!part || typeof part !== 'object') return '';
        switch (part.type) {
          case 'text':
            return part.text ?? '';
          case 'reasoning':
            return `<reasoning>${part.text ?? ''}</reasoning>`;
          case 'file':
            return `[file: ${part.mediaType ?? 'unknown'}]`;
          case 'source-url':
            return `[source: ${part.title ?? part.url}]`;
          case 'source-document':
            return `[document: ${part.title ?? part.filename ?? 'untitled'}]`;
          default: {
            if ('type' in part && part.type === 'dynamic-tool') {
              const t = part as DynamicToolUIPart;
              const name = t.toolName;
              const state = t.state;
              const inputStr = t.input ? `\ninput: ${safeStringify(t.input)}` : '';
              const outputStr = 'output' in t && t.output ? `\noutput: ${safeStringify(t.output)}` : '';
              const errStr = t.errorText ? `\nerror: ${t.errorText}` : '';
              return `[tool ${name} • ${state}]${inputStr}${outputStr}${errStr}`;
            }
            if (isToolUIPart(part)) {
              const name = (part.type as string).replace('tool-', '');
              const state = part.state;
              const inputStr = part.input ? `\ninput: ${safeStringify(part.input)}` : '';
              const outputStr = 'output' in part && part.output ? `\noutput: ${safeStringify(part.output)}` : '';
              const errStr = part.errorText ? `\nerror: ${part.errorText}` : '';
              return `[tool ${name} • ${state}]${inputStr}${outputStr}${errStr}`;
            }
            return '';
          }
        }
      })
      .filter(Boolean)
      .join('\n');
  };

  const safeStringify = (v: unknown) => {
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-md border p-4">
      <h3 className="mb-2 text-lg font-semibold">MCP Agent</h3>

      {error && (
        <div className="mb-2 rounded-md bg-red-100 p-2 text-sm text-red-800">
          {String(error.message || error)}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => clearError()}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex-grow overflow-y-auto rounded-md border bg-gray-50 p-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`whitespace-pre-wrap my-2 p-2 rounded-md ${
              m.role === 'user' ? 'bg-blue-100 text-right' : 'bg-gray-200'
            }`}
          >
            {renderParts(m.parts ?? [])}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question or give a command..."
          className="flex-grow rounded-md border p-2 text-sm"
          disabled={status === 'streaming'}
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          disabled={status === 'streaming'}
        >
          {status === 'streaming' ? 'Thinking…' : 'Send'}
        </button>
      </form>
    </div>
  );
}