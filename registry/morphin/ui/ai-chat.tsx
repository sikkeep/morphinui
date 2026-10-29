'use client';

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckListIcon, FlashIcon, Idea01Icon, Mail01Icon, NoteEditIcon, PencilEdit02Icon, RefreshIcon, SourceCodeIcon, SparklesIcon, ThumbsDownIcon, ThumbsUpIcon, ViewIcon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { Button, IconButton } from '@/registry/morphin/ui/button';
import { Card } from '@/registry/morphin/ui/card';
import {
  ChatMessage, ChatMessageAction, ChatMessageActions, ChatMessageAvatar, ChatMessageBody, ChatMessageContent, ChatMessageCopy,
  ChatMessageError, ChatReasoning, ChatThinking, ChatThread,
} from '@/registry/morphin/ui/chat';
import {
  PromptInput, PromptInputAttach, PromptInputAttachments, PromptInputFileIcon, PromptInputModelSelect,
  PromptInputSubmit, PromptInputTextarea, PromptInputToolbar, PromptInputTools, PromptInputVoice, promptInputEfforts,
  type PromptInputMessage, type PromptInputModel, type PromptInputOption, type PromptInputStatus,
} from '@/registry/morphin/ui/prompt-input';

/** `pending` waits for the first token; `stopped` was cut short by Stop; `error` failed and can be retried. */
export type AiChatMessageStatus = 'pending' | 'streaming' | 'done' | 'stopped' | 'error';

export interface AiChatFile {
  name: string;
  type: string;
  size: number;
}

export interface AiChatMessage {
  id: string;
  from: 'user' | 'assistant';
  text: string;
  /** The model's reasoning, shown folded above the answer. */
  reasoning?: string;
  /** Seconds spent reasoning, for "Thought for 4s". */
  thoughtFor?: number;
  /** The model that wrote an assistant message. */
  model?: string;
  /** The effort it answered with. */
  effort?: string;
  /** Attached files. Messages sent in this session keep the `File` objects, so images show thumbnails. */
  files?: (AiChatFile | File)[];
  status?: AiChatMessageStatus;
  error?: string;
  feedback?: 'up' | 'down';
}

/** A piece of a reply: a string is answer text; reasoning comes as `{ type: 'reasoning', delta }`. */
export type AiChatChunk = string | { type: 'text' | 'reasoning'; delta: string };

export interface AiChatRequest {
  /** The conversation so far, ending with the user's message. */
  messages: AiChatMessage[];
  model: string;
  /** The chosen effort: `low`, `medium` or `high` by default. */
  effort: string;
  /** The files attached to that last message. */
  files: File[];
  /** Aborted by Stop, by New chat and on unmount. */
  signal: AbortSignal;
}

/** Answers a message: yield chunks as they arrive (an async generator), or resolve the whole reply at once. */
export type AiChatRespond = (request: AiChatRequest) => AsyncIterable<AiChatChunk> | Promise<string>;

export interface AiChatSuggestion {
  label: string;
  /** What is sent; the label when left out. */
  prompt?: string;
  icon?: ReactNode;
}

/** Stand-in models for the demo, with sample prices. Replace them with the models your server can call. */
export const aiChatModels: PromptInputModel[] = [
  { value: 'general', label: 'General', meta: '$2 · $10', icon: <HugeiconsIcon icon={SparklesIcon} aria-hidden="true" strokeWidth={1.8} /> },
  { value: 'mini', label: 'Mini', meta: '$0.10 · $0.50', icon: <HugeiconsIcon icon={FlashIcon} aria-hidden="true" strokeWidth={1.8} /> },
  { value: 'code', label: 'Code', meta: '$3 · $15', icon: <HugeiconsIcon icon={SourceCodeIcon} aria-hidden="true" strokeWidth={1.8} /> },
  { value: 'vision', label: 'Vision', meta: '$4 · $20', icon: <HugeiconsIcon icon={ViewIcon} aria-hidden="true" strokeWidth={1.8} /> },
];

/** Low to max, as in the effort row of the composer's model menu. */
export const aiChatEfforts: PromptInputOption[] = promptInputEfforts;

export const aiChatSuggestions: AiChatSuggestion[] = [
  { label: 'Plan a product launch', prompt: 'Help me plan a product launch for next month.', icon: <HugeiconsIcon icon={CheckListIcon} aria-hidden="true" strokeWidth={1.8} /> },
  { label: 'Write a follow-up email', prompt: 'Write a short, friendly follow-up email after a client call.', icon: <HugeiconsIcon icon={Mail01Icon} aria-hidden="true" strokeWidth={1.8} /> },
  { label: 'Explain an idea simply', prompt: 'Explain how a neural network learns, in simple words.', icon: <HugeiconsIcon icon={Idea01Icon} aria-hidden="true" strokeWidth={1.8} /> },
  { label: 'Summarize my notes', prompt: 'Summarize my meeting notes into three action items.', icon: <HugeiconsIcon icon={NoteEditIcon} aria-hidden="true" strokeWidth={1.8} /> },
];

const demoReplies: { match: RegExp; reasoning: string; text: string }[] = [
  {
    match: /launch/i,
    reasoning: 'A month is short, so the plan should run backwards from the launch day. Group the work into weeks, keep each week to a few outcomes, and leave the last days for checks instead of new work.',
    text: 'Here is a four-week plan that works backwards from launch day:\n\n1. Week 1: settle the audience, the one-line message and the date. Book anything with a lead time.\n2. Week 2: write the launch page, the announcement and a short demo. Line up early users for quotes.\n3. Week 3: run a private preview, fix what it finds and prepare support answers.\n4. Week 4: final checks, schedule the posts, and keep launch day free for replies.\n\nWant me to turn any week into a checklist with owners?',
  },
  {
    match: /email|follow-up|follow up/i,
    reasoning: 'A follow-up should thank them, restate what was agreed and make the next step easy. Short and warm beats complete.',
    text: 'Subject: Thanks for today\n\nHi Sam,\n\nThank you for the time today. It was good to hear how the team works and where the new flow could help.\n\nAs agreed, I will send the revised proposal by Thursday. If anything else comes up before then, just reply here.\n\nBest,\nAlex',
  },
  {
    match: /explain|neural|learn/i,
    reasoning: 'Keep it concrete: guess, measure the mistake, nudge, repeat. One everyday image is enough.',
    text: 'Think of a neural network as a long row of tiny dials.\n\nIt makes a guess, checks how wrong the guess was, and turns every dial a little in the direction that would have made the guess better. Then it does it again, millions of times, on many examples.\n\nNo single dial knows anything. Together, after all that nudging, they turn an input like a photo into a good answer like "cat".',
  },
  {
    match: /summar|notes/i,
    reasoning: 'Action items need an owner and a date. Without the notes, show the shape and ask for the text.',
    text: 'Paste your notes and I will pull out the action items. Each one will look like this:\n\n1. What needs to happen, in one line\n2. Who owns it\n3. When it is due\n\nYou can also attach the notes as a file with the paperclip.',
  },
];

const demoFallback = 'This is a demo reply, written word by word so you can watch the thread follow it.\n\nConnect your model with the respond prop. It receives the conversation, the chosen model, the attached files and an abort signal, and yields text as it arrives. Stop and New chat abort the signal.';

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, milliseconds);
    signal.addEventListener('abort', abort, { once: true });
  });
}

/** One to three words at a time, with their spacing and line breaks. */
function pieces(text: string) {
  const words = text.match(/\S+\s*/g) ?? [];
  const result: string[] = [];
  for (let index = 0; index < words.length;) {
    const size = 1 + ((index * 7) % 3);
    result.push(words.slice(index, index + size).join(''));
    index += size;
  }
  return result;
}

/**
 * A stand-in for a model, so the block works before it is connected: canned replies streamed in small pieces.
 * Above `low` effort it reasons first, slower at each step up.
 */
export async function* demoRespond({ messages, effort, files, signal }: AiChatRequest): AsyncGenerator<AiChatChunk> {
  let prompt = '';
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].from === 'user') { prompt = messages[index].text; break; }
  }
  const reply = demoReplies.find(item => item.match.test(prompt));
  const voice = files.some(file => file.type.startsWith('audio/'));
  const attached = files.length === 0 ? ''
    : voice ? 'I got your voice message. Send the audio to a speech-to-text service in respond and pass me the words.\n\n'
      : `I can see ${files.length === 1 ? `"${files[0].name}"` : `${files.length} files`}. Read them in respond and include their text in the request.\n\n`;
  await wait(600, signal);
  const step = ['low', 'medium', 'high', 'xhigh', 'max'].indexOf(effort);
  if (step > 0) {
    for (const delta of pieces(reply?.reasoning ?? 'There is no canned answer for this one, so explain how to connect a real model.')) {
      yield { type: 'reasoning', delta };
      await wait(10 + step * 30, signal);
    }
    await wait(300, signal);
  }
  for (const delta of pieces(attached + (reply?.text ?? demoFallback))) {
    yield delta;
    await wait(32, signal);
  }
}

function toStream(result: AsyncIterable<AiChatChunk> | Promise<string>): AsyncIterable<AiChatChunk> {
  if (Symbol.asyncIterator in Object(result)) return result as AsyncIterable<AiChatChunk>;
  return (async function* () { yield await (result as Promise<string>); })();
}

let messageId = 0;
const nextId = () => `message-${++messageId}`;

export interface AiChatProps extends Omit<ComponentProps<'div'>, 'title' | 'children'> {
  /** The header title. Defaults to the first message, or "New chat". */
  title?: string;
  greeting?: ReactNode;
  description?: ReactNode;
  suggestions?: AiChatSuggestion[];
  /** Models in the composer's menu, with an optional `meta` (a price, a speed). An empty list hides the menu. */
  models?: PromptInputModel[];
  defaultModel?: string;
  onModelChange?: (model: string) => void;
  /** Effort steps, a segmented row in the model menu. An empty list leaves them out. Default low to max. */
  efforts?: PromptInputOption[];
  /** Default `medium` when it is one of `efforts`, otherwise the first. */
  defaultEffort?: string;
  onEffortChange?: (effort: string) => void;
  /** A note at the bottom of the model menu, such as what the prices mean. Pass `null` to hide it. */
  modelNote?: ReactNode;
  /** Connects a model. Defaults to `demoRespond`, which streams canned replies. */
  respond?: AiChatRespond;
  initialMessages?: AiChatMessage[];
  /** Called when a reply is rated, or un-rated with `undefined`. */
  onFeedback?: (message: AiChatMessage, value: 'up' | 'down' | undefined) => void;
  onNewChat?: () => void;
  /** Renders an answer's text, such as a Markdown renderer. Plain text with line breaks by default. */
  renderText?: (text: string, message: AiChatMessage) => ReactNode;
  placeholder?: string;
  /** A short line under the composer. Pass `null` to hide it. */
  disclaimer?: ReactNode;
  /** Which files can be attached. */
  accept?: string;
  /** Shows the attach button. Default true. */
  attachments?: boolean;
  /** Shows the voice button. Default true. */
  voice?: boolean;
}

/**
 * A complete chat with an assistant: a header with New chat, a greeting with suggestions, a thread that follows
 * the reply as it streams, folded reasoning, copy, retry and feedback, and a composer with attachments, voice
 * and a model menu. It is a demo until `respond` connects a model.
 */
export function AiChat({
  title, greeting = 'What can I help with?', description = 'Ask a question, attach a file or record a voice message.',
  suggestions = aiChatSuggestions, models = aiChatModels, defaultModel, onModelChange,
  efforts = aiChatEfforts, defaultEffort, onEffortChange, modelNote = 'Input · output per 1M tokens. Sample prices.', respond = demoRespond,
  initialMessages, onFeedback, onNewChat, renderText, placeholder = 'Ask anything', disclaimer = 'Answers can be wrong. Check anything important.',
  accept, attachments = true, voice = true, className, ...props
}: AiChatProps) {
  const [messages, setMessages] = useState<AiChatMessage[]>(initialMessages ?? []);
  const [status, setStatus] = useState<PromptInputStatus>('ready');
  const [model, setModel] = useState(defaultModel ?? models[0]?.value ?? '');
  const [effort, setEffort] = useState(defaultEffort ?? (efforts.some(item => item.value === 'medium') ? 'medium' : efforts[0]?.value ?? ''));
  const running = useRef<{ id: string; controller: AbortController } | null>(null);
  const busy = status === 'submitted' || status === 'streaming';
  const empty = messages.length === 0;

  useEffect(() => () => running.current?.controller.abort(), []);

  const update = (id: string, patch: (message: AiChatMessage) => Partial<AiChatMessage>) =>
    setMessages(list => list.map(message => (message.id === id ? { ...message, ...patch(message) } : message)));

  const run = async (history: AiChatMessage[]) => {
    running.current?.controller.abort();
    const controller = new AbortController();
    const id = nextId();
    running.current = { id, controller };
    const { signal } = controller;
    const last = history[history.length - 1];
    setMessages([...history, { id, from: 'assistant', text: '', status: 'pending', model, effort }]);
    setStatus('submitted');
    let reasoningStart: number | undefined;
    let thoughtFor: number | undefined;
    const thought = () => (reasoningStart === undefined ? undefined : (performance.now() - reasoningStart) / 1000);
    try {
      const attached = (last.files ?? []).filter((file): file is File => file instanceof File);
      for await (const chunk of toStream(respond({ messages: history, model, effort, files: attached, signal }))) {
        if (signal.aborted) break;
        const { type, delta } = typeof chunk === 'string' ? { type: 'text' as const, delta: chunk } : chunk;
        if (type === 'reasoning') {
          reasoningStart ??= performance.now();
          update(id, message => ({ reasoning: (message.reasoning ?? '') + delta, status: 'streaming' }));
        } else {
          if (thoughtFor === undefined) thoughtFor = thought();
          update(id, message => ({ text: message.text + delta, status: 'streaming', thoughtFor }));
        }
        setStatus('streaming');
      }
      if (!signal.aborted) update(id, message => ({ status: 'done', thoughtFor: message.thoughtFor ?? thought() }));
    } catch (error) {
      if (!signal.aborted) update(id, () => ({ status: 'error', error: error instanceof Error ? error.message : String(error) }));
    } finally {
      if (running.current?.controller === controller) {
        running.current = null;
        setStatus('ready');
      }
    }
  };

  const stop = () => {
    const current = running.current;
    if (!current) return;
    running.current = null;
    current.controller.abort();
    update(current.id, () => ({ status: 'stopped' }));
    setStatus('ready');
  };

  const send = ({ text, files }: PromptInputMessage) => {
    void run([...messages, { id: nextId(), from: 'user', text: text.trim(), files }]);
  };

  const retry = (id: string) => {
    const index = messages.findIndex(message => message.id === id);
    if (index > 0) void run(messages.slice(0, index));
  };

  const rate = (message: AiChatMessage, value: 'up' | 'down') => {
    const next = message.feedback === value ? undefined : value;
    update(message.id, () => ({ feedback: next }));
    onFeedback?.({ ...message, feedback: next }, next);
  };

  const newChat = () => {
    stop();
    setMessages([]);
    onNewChat?.();
  };

  const heading = title ?? messages.find(message => message.from === 'user' && message.text)?.text ?? 'New chat';
  let lastAssistant = messages.length - 1;
  while (lastAssistant >= 0 && messages[lastAssistant].from !== 'assistant') lastAssistant -= 1;

  return <Card
    data-slot="ai-chat"
    size="sm"
    {...props}
    className={cn('h-(--chat-height) gap-0 p-0 [--chat-height:640px]', className)}
  >
    <header data-slot="ai-chat-header" className="flex h-14 shrink-0 items-center gap-2 border-b border-border ps-5 pe-3">
      <h2 className="min-w-0 flex-1 truncate text-sm font-medium tracking-tight">{heading}</h2>
      <IconButton variant="ghost" size="sm" label="New chat" disabled={empty} onClick={newChat}>
        <HugeiconsIcon icon={PencilEdit02Icon} aria-hidden="true" strokeWidth={1.8} />
      </IconButton>
    </header>

    <ChatThread busy={busy} contentClassName={cn(empty && 'min-h-full justify-center')}>
      {empty && <div data-slot="ai-chat-empty" className="flex flex-col items-center gap-6 py-6 text-center">
        <ChatMessageAvatar className="size-11"><HugeiconsIcon icon={SparklesIcon} aria-hidden="true" strokeWidth={1.6} className="size-5" /></ChatMessageAvatar>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-2xl font-semibold tracking-tight text-foreground">{greeting}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {suggestions.length > 0 && <ul aria-label="Suggestions" className="flex max-w-xl flex-wrap justify-center gap-2">
          {suggestions.map(suggestion => <li key={suggestion.label}>
            <Button variant="outline" size="sm" leadingIcon={suggestion.icon} onClick={() => send({ text: suggestion.prompt ?? suggestion.label, files: [] })}>
              {suggestion.label}
            </Button>
          </li>)}
        </ul>}
      </div>}

      {messages.map((message, index) => {
        if (message.from === 'user') {
          return <ChatMessage key={message.id} from="user">
            {message.files && message.files.length > 0 && <ul aria-label="Attachments" className="flex flex-wrap justify-end gap-1.5">
              {message.files.map((file, fileIndex) => <li key={`${file.name}-${fileIndex}`} className="flex h-10 max-w-60 items-center gap-2 rounded-[14px] [corner-shape:var(--corner-shape)] border border-border ps-1.5 pe-3 text-xs">
                <PromptInputFileIcon file={file} />
                <span className="truncate">{file.name}</span>
              </li>)}
            </ul>}
            {message.text && <ChatMessageContent>{message.text}</ChatMessageContent>}
            {message.text && <ChatMessageActions className="ms-0 -me-1">
              <ChatMessageCopy text={message.text} />
            </ChatMessageActions>}
          </ChatMessage>;
        }
        const label = models.find(item => item.value === message.model)?.label;
        const settled = message.status === 'done' || message.status === 'stopped';
        return <ChatMessage key={message.id} from="assistant" name={label ? `Assistant, ${label}` : undefined}>
          <ChatMessageAvatar />
          <ChatMessageBody>
            {message.reasoning && <ChatReasoning streaming={message.status === 'streaming' && !message.text} duration={message.thoughtFor}>
              {message.reasoning}
            </ChatReasoning>}
            {message.status === 'pending' && !message.reasoning && <ChatThinking />}
            {message.text && <ChatMessageContent>{renderText ? renderText(message.text, message) : message.text}</ChatMessageContent>}
            {message.status === 'stopped' && <p className="text-xs text-subtle-foreground">Stopped</p>}
            {message.status === 'error' && <ChatMessageError action={<Button variant="outline" size="xs" leadingIcon={<HugeiconsIcon icon={RefreshIcon} aria-hidden="true" strokeWidth={1.8} />} onClick={() => retry(message.id)}>Retry</Button>}>
              {message.error || 'Something went wrong.'}
            </ChatMessageError>}
            {settled && <ChatMessageActions reveal={index === lastAssistant ? 'always' : 'hover'}>
              {message.text && <ChatMessageCopy text={message.text} />}
              <ChatMessageAction label="Regenerate" disabled={busy} onClick={() => retry(message.id)}>
                <HugeiconsIcon icon={RefreshIcon} aria-hidden="true" strokeWidth={1.8} />
              </ChatMessageAction>
              {message.text && <>
                <ChatMessageAction label="Good response" aria-pressed={message.feedback === 'up'} onClick={() => rate(message, 'up')}>
                  <HugeiconsIcon icon={ThumbsUpIcon} aria-hidden="true" strokeWidth={1.8} className={cn(message.feedback === 'up' && 'fill-current')} />
                </ChatMessageAction>
                <ChatMessageAction label="Bad response" aria-pressed={message.feedback === 'down'} onClick={() => rate(message, 'down')}>
                  <HugeiconsIcon icon={ThumbsDownIcon} aria-hidden="true" strokeWidth={1.8} className={cn(message.feedback === 'down' && 'fill-current')} />
                </ChatMessageAction>
              </>}
            </ChatMessageActions>}
          </ChatMessageBody>
        </ChatMessage>;
      })}
    </ChatThread>

    <div data-slot="ai-chat-composer" className="mx-auto flex w-full max-w-[var(--chat-column,720px)] shrink-0 flex-col gap-2 px-4 pb-3">
      <PromptInput status={status} onSubmit={send} onStop={stop} accept={accept}>
        <PromptInputAttachments />
        <PromptInputTextarea placeholder={placeholder} />
        <PromptInputToolbar>
          <PromptInputTools>
            {attachments && <PromptInputAttach />}
            {models.length > 0 && <PromptInputModelSelect
              models={models}
              value={model}
              onValueChange={next => {
                setModel(next);
                onModelChange?.(next);
              }}
              efforts={efforts}
              effort={effort}
              onEffortChange={next => {
                setEffort(next);
                onEffortChange?.(next);
              }}
              footer={modelNote}
            />}
          </PromptInputTools>
          <PromptInputTools>
            {voice && <PromptInputVoice />}
            <PromptInputSubmit />
          </PromptInputTools>
        </PromptInputToolbar>
      </PromptInput>
      {disclaimer != null && <p className="text-center text-2xs text-subtle-foreground">{disclaimer}</p>}
    </div>
  </Card>;
}
