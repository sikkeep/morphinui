import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gsap } from 'gsap';
import {
  PromptInput, PromptInputAttach, PromptInputAttachments, PromptInputModelSelect, PromptInputSubmit, PromptInputTextarea,
  PromptInputToolbar, PromptInputTools, PromptInputVoice, PromptInputSelect, promptInputEfforts, type PromptInputMessage, type PromptInputStatus,
} from '@/registry/morphin/ui/prompt-input';

// jsdom has no object URLs; image attachments make one for their thumbnail.
beforeEach(() => {
  Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() });
});

afterEach(() => {
  gsap.globalTimeline.clear();
  gsap.ticker.sleep();
  vi.unstubAllGlobals();
});

const models = [
  { value: 'fast', label: 'Fast', description: 'Quick answers' },
  { value: 'deep', label: 'Deep', description: 'Thinks first' },
];

function Composer({ status = 'ready', onSubmit = () => {}, onStop, accept, maxFiles, onFilesRejected, disabled }: {
  status?: PromptInputStatus;
  onSubmit?: (message: PromptInputMessage) => void;
  onStop?: () => void;
  accept?: string;
  maxFiles?: number;
  onFilesRejected?: (files: File[]) => void;
  disabled?: boolean;
}) {
  return <PromptInput status={status} onSubmit={onSubmit} onStop={onStop} accept={accept} maxFiles={maxFiles} onFilesRejected={onFilesRejected} disabled={disabled}>
    <PromptInputAttachments />
    <PromptInputTextarea placeholder="Ask anything" />
    <PromptInputToolbar>
      <PromptInputTools>
        <PromptInputAttach />
        <PromptInputModelSelect models={models} />
      </PromptInputTools>
      <PromptInputTools>
        <PromptInputVoice />
        <PromptInputSubmit />
      </PromptInputTools>
    </PromptInputToolbar>
  </PromptInput>;
}

const file = (name: string, type: string, size = 2048) => new File(['x'.repeat(size)], name, { type });

describe('PromptInput', () => {
  it('is a form on the field surface with the signature shape', () => {
    const { container } = render(<Composer />);
    const form = container.querySelector('form')!;
    expect(form).toHaveAttribute('data-slot', 'prompt-input');
    expect(form).toHaveAttribute('data-status', 'ready');
    expect(form).toHaveClass('bg-field', 'border-field-border', '[corner-shape:var(--corner-shape)]', '[--prompt-radius:24px]');
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveAttribute('data-slot', 'prompt-input-textarea');
  });

  it('sends on Enter, keeps Shift+Enter as a new line, and clears itself', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);
    const field = screen.getByRole('textbox', { name: 'Message' });
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
    await user.type(field, 'Hello{Shift>}{Enter}{/Shift}there');
    expect(field).toHaveValue('Hello\nthere');
    expect(onSubmit).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledWith({ text: 'Hello\nthere', files: [] });
    expect(field).toHaveValue('');
  });

  it('does not send a blank message or an Enter that ends an IME composition', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);
    const field = screen.getByRole('textbox', { name: 'Message' });
    await user.type(field, '   {Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
    await user.type(field, 'kana');
    fireEvent.keyDown(field, { key: 'Enter', isComposing: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('sends with the button', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Hi');
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(onSubmit).toHaveBeenCalledWith({ text: 'Hi', files: [] });
  });

  it('turns the button into Stop while a reply is in flight, and Escape stops too', async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    const onSubmit = vi.fn();
    const { rerender } = render(<Composer status="streaming" onStop={onStop} onSubmit={onSubmit} />);
    const stop = screen.getByRole('button', { name: 'Stop generating' });
    expect(stop).toBeEnabled();
    expect(stop).toHaveAttribute('type', 'button');
    await user.click(stop);
    expect(onStop).toHaveBeenCalledTimes(1);
    const field = screen.getByRole('textbox', { name: 'Message' });
    await user.type(field, 'Next{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(onStop).toHaveBeenCalledTimes(2);
    rerender(<Composer status="ready" onStop={onStop} onSubmit={onSubmit} />);
    expect(screen.getByRole('button', { name: 'Send message' })).toHaveAttribute('type', 'submit');
  });

  it('works controlled and clears through onValueChange', async () => {
    const user = userEvent.setup();
    const sent: string[] = [];
    function Controlled() {
      const [value, setValue] = useState('Draft');
      return <PromptInput value={value} onValueChange={setValue} onSubmit={message => sent.push(message.text)}>
        <PromptInputTextarea />
        <PromptInputSubmit />
        <output>{value}</output>
      </PromptInput>;
    }
    render(<Controlled />);
    await user.type(screen.getByRole('textbox'), '!');
    expect(screen.getByRole('status')).toHaveTextContent('Draft!');
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(sent).toEqual(['Draft!']);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('attaches picked files, lists them with a remove button, and sends them', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<Composer onSubmit={onSubmit} />);
    const input = container.querySelector<HTMLInputElement>('input[type=file]')!;
    await user.upload(input, [file('brief.pdf', 'application/pdf'), file('chart.png', 'image/png')]);
    const list = screen.getByRole('list', { name: 'Attachments' });
    expect(list).toHaveTextContent('brief.pdf');
    expect(list).toHaveTextContent('2.0 KB');
    // A file alone can be sent.
    expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Remove brief.pdf' }));
    expect(list).not.toHaveTextContent('brief.pdf');
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveFocus();
    // The image gets a thumbnail; its object URL is released with it.
    expect(list.querySelector('img')).toHaveAttribute('src', 'blob:preview');
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(onSubmit.mock.calls[0][0].files.map((item: File) => item.name)).toEqual(['chart.png']);
    expect(screen.queryByRole('list', { name: 'Attachments' })).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('takes dropped files, and rejects what accept and maxFiles leave out', () => {
    const onFilesRejected = vi.fn();
    const { container } = render(<Composer accept="image/*,.md" maxFiles={2} onFilesRejected={onFilesRejected} />);
    const form = container.querySelector('form')!;
    const files = [file('a.png', 'image/png'), file('notes.md', ''), file('b.zip', 'application/zip'), file('c.jpg', 'image/jpeg')];
    const dataTransfer = { types: ['Files'], files };
    fireEvent.dragEnter(form, { dataTransfer });
    expect(form).toHaveAttribute('data-dragging');
    fireEvent.drop(form, { dataTransfer });
    expect(form).not.toHaveAttribute('data-dragging');
    const list = screen.getByRole('list', { name: 'Attachments' });
    expect(list).toHaveTextContent('a.png');
    expect(list).toHaveTextContent('notes.md');
    expect(onFilesRejected.mock.calls[0][0].map((item: File) => item.name)).toEqual(['b.zip', 'c.jpg']);
  });

  it('attaches a pasted image', () => {
    render(<Composer />);
    fireEvent.paste(screen.getByRole('textbox', { name: 'Message' }), {
      clipboardData: { files: [file('screenshot.png', 'image/png')], getData: () => '' },
    });
    expect(screen.getByRole('list', { name: 'Attachments' })).toHaveTextContent('screenshot.png');
  });

  it('picks a model from a menu above the composer', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<PromptInput><PromptInputModelSelect models={models} onValueChange={onValueChange} /></PromptInput>);
    const trigger = screen.getByRole('button', { name: 'Model: Fast' });
    await user.click(trigger);
    expect(await screen.findByRole('menuitemradio', { name: /Fast/ })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('menuitemradio', { name: /Deep/ }));
    expect(onValueChange).toHaveBeenCalledWith('deep');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Model: Deep' })).toBeInTheDocument());
  });

  it('puts the effort in the model menu as a segmented row, defaulting to medium', async () => {
    const user = userEvent.setup();
    const onEffortChange = vi.fn();
    render(<PromptInput>
      <PromptInputModelSelect models={models} efforts={promptInputEfforts} onEffortChange={onEffortChange} footer="Sample prices." />
    </PromptInput>);
    const trigger = screen.getByRole('button', { name: 'Model: Fast, Effort: Medium' });
    expect(trigger).toHaveAttribute('data-slot', 'prompt-input-model');
    expect(screen.getByText('Med')).toHaveClass('@max-[28rem]/prompt-input:hidden');
    await user.click(trigger);
    const efforts = await screen.findByRole('group', { name: 'Effort' });
    expect(efforts.querySelector('[data-variant=segmented]')).not.toBeNull();
    expect(screen.getByRole('menuitemradio', { name: 'Medium' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Sample prices.')).toBeInTheDocument();
    await user.click(screen.getByRole('menuitemradio', { name: 'Extra high' }));
    expect(onEffortChange).toHaveBeenCalledWith('xhigh');
    // The effort row keeps the menu open, so a model can still be picked.
    expect(screen.getByRole('menuitemradio', { name: /Deep/ })).toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveAccessibleName('Model: Fast, Effort: Extra high'));
  });

  it('shows a model detail at the end of its row', async () => {
    const user = userEvent.setup();
    render(<PromptInput><PromptInputModelSelect models={[{ value: 'a', label: 'Alpha', meta: '$2 · $10' }]} /></PromptInput>);
    await user.click(screen.getByRole('button', { name: 'Model: Alpha' }));
    expect(await screen.findByRole('menuitemradio', { name: /Alpha/ })).toHaveTextContent('$2 · $10');
  });

  it('collapses a select to its icon on a narrow composer', () => {
    render(<PromptInput>
      <PromptInputSelect label="Tone" collapse options={[{ value: 'warm', label: 'Warm', icon: <span /> }]} />
    </PromptInput>);
    expect(screen.getByRole('button', { name: 'Tone: Warm' })).toBeInTheDocument();
    expect(screen.getByText('Warm')).toHaveClass('@max-[28rem]/prompt-input:sr-only');
  });

  it('gives the disabled send button a visible fill', () => {
    render(<Composer />);
    expect(screen.getByRole('button', { name: 'Send message' })).toHaveClass('[&[data-disabled]:not([data-loading])]:bg-accent');
  });

  it('disables every control with the composer', () => {
    const { container } = render(<Composer disabled />);
    expect(container.querySelector('form')).toHaveAttribute('data-disabled');
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Attach files' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Record voice message' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Model: Fast' })).toBeDisabled();
  });

  it('throws a clear error outside a PromptInput', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<PromptInputSubmit />)).toThrow('inside <PromptInput>');
  });
});

describe('PromptInputVoice', () => {
  function stubRecorder() {
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] };
    const getUserMedia = vi.fn(async () => stream);
    const recorders: FakeRecorder[] = [];
    class FakeRecorder {
      state: 'inactive' | 'recording' = 'inactive';
      mimeType = 'audio/webm;codecs=opus';
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      constructor() { recorders.push(this); }
      start() { this.state = 'recording'; }
      stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['voice'], { type: 'audio/webm' }) });
        this.onstop?.();
      }
    }
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
    return { track, getUserMedia, recorders };
  }

  it('records, shows the time, and attaches the recording when pressed again', async () => {
    const user = userEvent.setup();
    const { track, getUserMedia } = stubRecorder();
    const onRecordingChange = vi.fn();
    render(<PromptInput>
      <PromptInputAttachments />
      <PromptInputVoice onRecordingChange={onRecordingChange} />
    </PromptInput>);
    const toggle = screen.getByRole('button', { name: 'Record voice message' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle);
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.getByRole('status')).toHaveTextContent('Recording');
    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(onRecordingChange).toHaveBeenLastCalledWith(true);
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(track.stop).toHaveBeenCalled();
    expect(onRecordingChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('list', { name: 'Attachments' })).toHaveTextContent('voice-message.webm');
  });

  it('discards a recording', async () => {
    const user = userEvent.setup();
    stubRecorder();
    const onRecorded = vi.fn();
    render(<PromptInput><PromptInputVoice onRecorded={onRecorded} /></PromptInput>);
    await user.click(screen.getByRole('button', { name: 'Record voice message' }));
    await user.click(await screen.findByRole('button', { name: 'Discard recording' }));
    expect(onRecorded).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Record voice message' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports a browser without recording, and releases the microphone on unmount', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const { unmount } = render(<PromptInput><PromptInputVoice onError={onError} /></PromptInput>);
    vi.stubGlobal('MediaRecorder', undefined);
    await user.click(screen.getByRole('button', { name: 'Record voice message' }));
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    unmount();

    const { track } = stubRecorder();
    const onRecorded = vi.fn();
    const second = render(<PromptInput><PromptInputVoice onRecorded={onRecorded} /></PromptInput>);
    await user.click(screen.getByRole('button', { name: 'Record voice message' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Record voice message' })).toHaveAttribute('aria-pressed', 'true'));
    act(() => second.unmount());
    expect(track.stop).toHaveBeenCalled();
    expect(onRecorded).not.toHaveBeenCalled();
  });
});
