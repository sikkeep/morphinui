import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gsap } from 'gsap';
import { AiChat, demoRespond, type AiChatChunk, type AiChatRequest } from '@/registry/morphin/ui/ai-chat';

afterEach(() => {
  gsap.globalTimeline.clear();
  gsap.ticker.sleep();
  vi.restoreAllMocks();
});

/** A reply that streams the given chunks at once. */
const replyWith = (...chunks: AiChatChunk[]) => vi.fn(async function* (_request: AiChatRequest) {
  for (const chunk of chunks) yield chunk;
});

/** A reply that never ends until it is aborted. */
const endless = vi.fn(async function* ({ signal }: AiChatRequest) {
  yield 'Working on it';
  await new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
});

const assistant = () => screen.getAllByRole('article').filter(article => article.getAttribute('data-from') === 'assistant').at(-1)!;

describe('AiChat', () => {
  it('greets with suggestions, and a suggestion sends its prompt', async () => {
    const user = userEvent.setup();
    const respond = replyWith('Here ', 'is a plan.');
    render(<AiChat respond={respond} />);
    expect(screen.getByRole('heading', { name: 'What can I help with?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'New chat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New chat' })).toBeDisabled();
    await user.click(within(screen.getByRole('list', { name: 'Suggestions' })).getByRole('button', { name: 'Plan a product launch' }));
    expect(screen.getByRole('article', { name: 'You' })).toHaveTextContent('Help me plan a product launch for next month.');
    await waitFor(() => expect(assistant()).toHaveTextContent('Here is a plan.'));
    expect(respond.mock.calls[0][0]).toMatchObject({ model: 'general', effort: 'medium', files: [] });
    expect(respond.mock.calls[0][0].messages.map(message => message.from)).toEqual(['user']);
    expect(screen.queryByRole('list', { name: 'Suggestions' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Help me plan a product launch for next month.' })).toBeInTheDocument();
  });

  it('sends from the composer with the chosen model, effort and history', async () => {
    const user = userEvent.setup();
    const respond = replyWith('Sure.');
    render(<AiChat respond={respond} defaultModel="code" defaultEffort="high" initialMessages={[
      { id: 'a', from: 'user', text: 'Hi' },
      { id: 'b', from: 'assistant', text: 'Hello!', status: 'done' },
    ]} />);
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Next question{Enter}');
    await waitFor(() => expect(assistant()).toHaveTextContent('Sure.'));
    const request = respond.mock.calls[0][0];
    expect(request.model).toBe('code');
    expect(request.effort).toBe('high');
    expect(request.messages.map(message => message.text)).toEqual(['Hi', 'Hello!', 'Next question']);
    expect(assistant()).toHaveAccessibleName('Assistant, Code');
  });

  it('shows thinking, then folds the reasoning above the answer', async () => {
    const user = userEvent.setup();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const respond = vi.fn(async function* () {
      await gate;
      yield { type: 'reasoning' as const, delta: 'Check the dates.' };
      yield 'Done.';
    });
    render(<AiChat respond={respond} />);
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Plan it{Enter}');
    expect(within(assistant()).getByRole('status')).toHaveTextContent('Thinking');
    expect(screen.getByRole('log')).toHaveAttribute('aria-busy', 'true');
    release();
    await waitFor(() => expect(assistant()).toHaveTextContent('Done.'));
    expect(within(assistant()).getByRole('button', { name: /^Thought for \ds$/ })).toBeInTheDocument();
    expect(screen.getByRole('log')).not.toHaveAttribute('aria-busy');
  });

  it('stops a reply in flight and keeps what was written', async () => {
    const user = userEvent.setup();
    render(<AiChat respond={endless} />);
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Go{Enter}');
    await waitFor(() => expect(assistant()).toHaveTextContent('Working on it'));
    expect(endless.mock.calls[0][0].signal.aborted).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Stop generating' }));
    expect(endless.mock.calls[0][0].signal.aborted).toBe(true);
    expect(assistant()).toHaveTextContent('Working on itStopped');
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
  });

  it('shows a failed reply with Retry, which answers again', async () => {
    const user = userEvent.setup();
    let attempt = 0;
    const respond = vi.fn(async function* (_request: AiChatRequest) {
      attempt += 1;
      if (attempt === 1) throw new Error('The model is busy.');
      yield 'Second time lucky.';
    });
    render(<AiChat respond={respond} />);
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Try{Enter}');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The model is busy.');
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(assistant()).toHaveTextContent('Second time lucky.'));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(respond.mock.calls[1][0].messages.map(message => message.text)).toEqual(['Try']);
  });

  it('accepts a reply resolved at once', async () => {
    const user = userEvent.setup();
    render(<AiChat respond={async () => 'All at once.'} />);
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Hi{Enter}');
    await waitFor(() => expect(assistant()).toHaveTextContent('All at once.'));
  });

  it('rates a reply, regenerates it and starts a new chat', async () => {
    const user = userEvent.setup();
    const onFeedback = vi.fn();
    const onNewChat = vi.fn();
    const respond = replyWith('An answer.');
    render(<AiChat respond={respond} onFeedback={onFeedback} onNewChat={onNewChat} />);
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Question{Enter}');
    await waitFor(() => expect(assistant()).toHaveTextContent('An answer.'));
    const actions = within(assistant()).getByRole('group', { name: 'Message actions' });
    // The newest answer keeps its actions visible.
    expect(actions).not.toHaveClass('opacity-0');
    const good = within(actions).getByRole('button', { name: 'Good response' });
    await user.click(good);
    expect(good).toHaveAttribute('aria-pressed', 'true');
    expect(onFeedback).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'An answer.' }), 'up');
    await user.click(good);
    expect(good).toHaveAttribute('aria-pressed', 'false');
    expect(onFeedback).toHaveBeenLastCalledWith(expect.anything(), undefined);

    await user.click(within(actions).getByRole('button', { name: 'Regenerate' }));
    await waitFor(() => expect(respond).toHaveBeenCalledTimes(2));
    expect(screen.getAllByRole('article')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'New chat' }));
    expect(onNewChat).toHaveBeenCalled();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.getByRole('heading', { name: 'What can I help with?' })).toBeInTheDocument();
  });

  it('offers models and effort in one menu, and sends the picks', async () => {
    const user = userEvent.setup();
    const respond = replyWith('Ok.');
    const onModelChange = vi.fn();
    const onEffortChange = vi.fn();
    render(<AiChat respond={respond} onModelChange={onModelChange} onEffortChange={onEffortChange} />);
    await user.click(screen.getByRole('button', { name: 'Model: General, Effort: Medium' }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'High' }));
    expect(onEffortChange).toHaveBeenCalledWith('high');
    expect(screen.getByText('Input · output per 1M tokens. Sample prices.')).toBeInTheDocument();
    await user.click(screen.getByRole('menuitemradio', { name: /Vision/ }));
    expect(onModelChange).toHaveBeenCalledWith('vision');
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Look{Enter}');
    await waitFor(() => expect(respond).toHaveBeenCalled());
    expect(respond.mock.calls[0][0]).toMatchObject({ model: 'vision', effort: 'high' });
  });

  it('hides the tools it is told to', () => {
    render(<AiChat models={[]} efforts={[]} attachments={false} voice={false} disclaimer={null} />);
    expect(screen.queryByRole('button', { name: 'Attach files' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Record voice message' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Model/ })).toBeNull();
    expect(screen.queryByText('Answers can be wrong. Check anything important.')).toBeNull();
  });
});

describe('demoRespond', () => {
  it('streams a canned reply in pieces, reasoning first with more effort', async () => {
    vi.useFakeTimers();
    const chunks: AiChatChunk[] = [];
    const run = (async () => {
      for await (const chunk of demoRespond({
        messages: [{ id: '1', from: 'user', text: 'Explain an idea' }], model: 'general', effort: 'high', files: [], signal: new AbortController().signal,
      })) chunks.push(chunk);
    })();
    await vi.runAllTimersAsync();
    await run;
    vi.useRealTimers();
    expect(chunks[0]).toMatchObject({ type: 'reasoning' });
    const text = chunks.filter((chunk): chunk is string => typeof chunk === 'string').join('');
    expect(text).toContain('row of tiny dials');
    expect(chunks.length).toBeGreaterThan(10);
  });

  it('stops when its signal is aborted', async () => {
    const controller = new AbortController();
    const stream = demoRespond({ messages: [{ id: '1', from: 'user', text: 'Hi' }], model: 'mini', effort: 'low', files: [], signal: controller.signal });
    const next = stream.next();
    controller.abort();
    await expect(next).rejects.toBeDefined();
  });
});
