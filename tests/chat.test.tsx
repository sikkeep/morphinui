import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gsap } from 'gsap';
import {
  ChatMessage, ChatMessageActions, ChatMessageAvatar, ChatMessageBody, ChatMessageContent, ChatMessageCopy, ChatMessageError,
  ChatReasoning, ChatThinking, ChatThread,
} from '@/registry/morphin/ui/chat';
import { MotionProvider } from '@/registry/morphin/lib/motion';

afterEach(() => {
  gsap.globalTimeline.clear();
  gsap.ticker.sleep();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// jsdom has no matchMedia, which the motion policy reads as "reduce".
const motionAllowed = () => vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

/** jsdom has no layout: give the viewport a scroll height and a visible height. */
function layout(viewport: HTMLElement, { scrollHeight, clientHeight }: { scrollHeight: number; clientHeight: number }) {
  Object.defineProperty(viewport, 'scrollHeight', { value: scrollHeight, configurable: true });
  Object.defineProperty(viewport, 'clientHeight', { value: clientHeight, configurable: true });
}

function Conversation({ initial = ['Hello'] }: { initial?: string[] }) {
  const [messages, setMessages] = useState(initial);
  return <>
    <ChatThread>
      {messages.map((text, index) => <ChatMessage key={index} from={index % 2 ? 'assistant' : 'user'}>
        <ChatMessageContent>{text}</ChatMessageContent>
      </ChatMessage>)}
    </ChatThread>
    <button type="button" onClick={() => setMessages(list => [...list, `Message ${list.length + 1}`])}>Add</button>
  </>;
}

describe('ChatThread', () => {
  it('is a named log that marks itself busy while a reply is written', () => {
    const { rerender } = render(<ChatThread busy><p>Hi</p></ChatThread>);
    const log = screen.getByRole('log', { name: 'Conversation' });
    expect(log).toHaveAttribute('aria-busy', 'true');
    expect(log).toHaveAttribute('data-slot', 'chat-thread-viewport');
    rerender(<ChatThread><p>Hi</p></ChatThread>);
    expect(log).not.toHaveAttribute('aria-busy');
  });

  it('offers Jump to latest only after the reader scrolls up, and goes back down', async () => {
    const user = userEvent.setup();
    render(<Conversation />);
    const log = screen.getByRole('log');
    const jump = log.parentElement!.querySelector('[data-slot=chat-thread-jump]')!;
    expect(jump).toHaveAttribute('data-hidden');
    expect(jump).toHaveAttribute('inert');
    layout(log, { scrollHeight: 2000, clientHeight: 400 });
    log.scrollTop = 1600;
    fireEvent.scroll(log);
    expect(jump).toHaveAttribute('data-hidden');
    log.scrollTop = 900;
    fireEvent.scroll(log);
    expect(jump).not.toHaveAttribute('data-hidden');
    expect(jump).not.toHaveAttribute('inert');
    await user.click(screen.getByRole('button', { name: 'Jump to latest' }));
    expect(log.scrollTop).toBe(2000);
  });

  it('brings the thread down when the user sends a message, even after scrolling up', async () => {
    const user = userEvent.setup();
    render(<Conversation initial={['Hello', 'Hi there']} />);
    const log = screen.getByRole('log');
    layout(log, { scrollHeight: 3000, clientHeight: 400 });
    log.scrollTop = 2600;
    fireEvent.scroll(log);
    log.scrollTop = 500;
    fireEvent.scroll(log);
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(log.scrollTop).toBe(3000);
  });
});

describe('ChatMessage', () => {
  it('lays out a user bubble and an assistant message beside its mark', () => {
    render(<>
      <ChatMessage from="user"><ChatMessageContent>Question</ChatMessageContent></ChatMessage>
      <ChatMessage from="assistant">
        <ChatMessageAvatar />
        <ChatMessageBody><ChatMessageContent>Answer</ChatMessageContent></ChatMessageBody>
      </ChatMessage>
    </>);
    const user = screen.getByRole('article', { name: 'You' });
    expect(user).toHaveAttribute('data-from', 'user');
    expect(user).toHaveClass('items-end');
    expect(screen.getByText('Question')).toHaveClass('bg-secondary', 'rounded-[20px]', '[corner-shape:var(--corner-shape)]', 'whitespace-pre-wrap');
    const assistant = screen.getByRole('article', { name: 'Assistant' });
    expect(screen.getByText('Answer')).not.toHaveClass('bg-secondary');
    expect(assistant.querySelector('[data-slot=chat-message-avatar]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not animate the messages a thread opens with, but raises the ones added later', async () => {
    motionAllowed();
    const user = userEvent.setup();
    const fromTo = vi.spyOn(gsap, 'fromTo');
    render(<Conversation initial={['One', 'Two']} />);
    expect(fromTo).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(fromTo).toHaveBeenCalledTimes(1);
    const [target, from, to] = fromTo.mock.calls[0] as unknown as [Element, gsap.TweenVars, gsap.TweenVars];
    expect(target).toHaveTextContent('Message 3');
    expect(from).toMatchObject({ opacity: 0, y: 8, filter: 'blur(2px)' });
    expect(to).toMatchObject({ opacity: 1, y: 0, clearProps: 'opacity,transform,filter' });
  });

  it('adds messages without motion under reduced motion', async () => {
    motionAllowed();
    const user = userEvent.setup();
    const fromTo = vi.spyOn(gsap, 'fromTo');
    render(<MotionProvider reducedMotion="always"><Conversation /></MotionProvider>);
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Message 2')).toBeInTheDocument();
    expect(fromTo).not.toHaveBeenCalled();
  });

  it('reverts its tween when it leaves mid-animation', async () => {
    motionAllowed();
    const user = userEvent.setup();
    const { unmount } = render(<Conversation />);
    await user.click(screen.getByRole('button', { name: 'Add' }));
    const added = screen.getByText('Message 2').closest('article')!;
    const tween = gsap.getTweensOf(added)[0];
    tween.pause().progress(0.5);
    expect(added.style.opacity).not.toBe('');
    unmount();
    expect(added.style.opacity).toBe('');
  });
});

describe('Chat actions', () => {
  it('copies the text and says so for a moment', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const onCopy = vi.fn();
    render(<ChatMessage from="assistant"><ChatMessageActions><ChatMessageCopy text="Answer" onCopy={onCopy} /></ChatMessageActions></ChatMessage>);
    expect(screen.getByRole('group', { name: 'Message actions' })).toHaveClass('opacity-0', 'group-hover/message:opacity-100');
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith('Answer');
    expect(onCopy).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1700); });
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('keeps actions visible with reveal="always"', () => {
    render(<ChatMessageActions reveal="always" />);
    expect(screen.getByRole('group')).not.toHaveClass('opacity-0');
  });

  it('announces thinking and errors', () => {
    render(<>
      <ChatThinking />
      <ChatMessageError action={<button type="button">Retry</button>}>The model is busy.</ChatMessageError>
    </>);
    expect(screen.getByRole('status')).toHaveTextContent('Thinking');
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('The model is busy.');
    expect(alert).toContainElement(screen.getByRole('button', { name: 'Retry' }));
  });

  it('shimmers the thinking label only while motion is allowed', () => {
    motionAllowed();
    const { container, unmount } = render(<ChatThinking />);
    const label = container.querySelector('[data-slot=chat-shimmer]')!;
    expect(label).toHaveAttribute('data-shimmer');
    expect(gsap.getTweensOf(label)).toHaveLength(1);
    unmount();
    const reduced = render(<MotionProvider reducedMotion="always"><ChatThinking /></MotionProvider>);
    expect(reduced.container.querySelector('[data-slot=chat-shimmer]')).not.toHaveAttribute('data-shimmer');
  });
});

describe('ChatReasoning', () => {
  it('folds the reasoning behind "Thought for Ns" and opens it', async () => {
    const user = userEvent.setup();
    render(<ChatReasoning duration={3.6}>First, the dates.</ChatReasoning>);
    const trigger = screen.getByRole('button', { name: 'Thought for 4s' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('First, the dates.')).toBeVisible();
  });

  it('says Thinking while it streams', () => {
    render(<ChatReasoning streaming>Working</ChatReasoning>);
    expect(screen.getByRole('button', { name: 'Thinking' })).toBeInTheDocument();
  });
});
