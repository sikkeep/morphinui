'use client';

import {
  createContext, use, useCallback, useEffect, useLayoutEffect, useRef, useState,
  type ClipboardEvent, type ComponentProps, type CSSProperties, type DragEvent, type FormEvent, type ReactNode, type RefObject,
} from 'react';
import { gsap } from 'gsap';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, ArrowUp02Icon, Attachment01Icon, AudioWave01Icon, Cancel01Icon, File02Icon, Image01Icon, Mic01Icon, StopIcon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/registry/morphin/lib/motion';
import { useTypingSound } from '@/registry/morphin/lib/sound';
import { Button, IconButton, type IconButtonProps } from '@/registry/morphin/ui/button';
import {
  Dropdown, DropdownContent, DropdownGroup, DropdownLabel, DropdownRadioGroup, DropdownRadioItem, DropdownSeparator, DropdownTrigger,
  type DropdownContentProps,
} from '@/registry/morphin/ui/dropdown';
import {
  promptInputAttachmentClasses, promptInputAttachmentPreviewClasses, promptInputAttachmentsClasses, promptInputRecordingClasses,
  promptInputRecordingDotClasses, promptInputSubmitDisabledClasses, promptInputTextareaClasses, promptInputToolbarClasses, promptInputToolsClasses, promptInputVariants,
  type PromptInputOptions,
} from '@/registry/morphin/ui/prompt-input-variants';

export { promptInputVariants } from '@/registry/morphin/ui/prompt-input-variants';
export type { PromptInputOptions, PromptInputSize } from '@/registry/morphin/ui/prompt-input-variants';

/** `submitted` waits for the first token and `streaming` writes the reply; both turn the send button into Stop. */
export type PromptInputStatus = 'ready' | 'submitted' | 'streaming' | 'error';

export interface PromptInputMessage {
  text: string;
  files: File[];
}

export interface PromptInputAttachment {
  id: string;
  file: File;
}

interface PromptInputContextValue {
  value: string;
  setValue: (value: string) => void;
  attachments: PromptInputAttachment[];
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  status: PromptInputStatus;
  busy: boolean;
  disabled: boolean;
  canSubmit: boolean;
  accept?: string;
  submit: () => void;
  stop: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

const PromptInputContext = createContext<PromptInputContextValue | null>(null);

/** The composer's state and actions, for custom parts inside a `PromptInput`. */
export function usePromptInput() {
  const context = use(PromptInputContext);
  if (!context) throw new Error('PromptInput parts must be placed inside <PromptInput>.');
  return context;
}

/** `accept` works like the file input's: MIME types, `type/*` wildcards and `.ext` suffixes. */
function accepts(file: File, accept?: string) {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept.split(',').map(part => part.trim().toLowerCase()).filter(Boolean).some(rule =>
    rule.startsWith('.') ? name.endsWith(rule)
      : rule.endsWith('/*') ? type.startsWith(rule.slice(0, -1))
        : type === rule);
}

let attachmentId = 0;

export interface PromptInputProps extends Omit<ComponentProps<'form'>, 'onSubmit' | 'children'>, PromptInputOptions {
  children?: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called with the text and the attached files. The composer clears itself afterwards (through `onValueChange` when controlled). */
  onSubmit?: (message: PromptInputMessage) => void;
  /** Called by the Stop button and by Escape while `status` is `submitted` or `streaming`. */
  onStop?: () => void;
  status?: PromptInputStatus;
  disabled?: boolean;
  /** Which files can be attached, dropped or pasted, like the file input's `accept`. */
  accept?: string;
  /** Most files at once; extra files are passed to `onFilesRejected`. */
  maxFiles?: number;
  onFilesRejected?: (files: File[]) => void;
}

/**
 * A message composer: a form with a growing textarea, a toolbar and optional attachments. Enter sends,
 * Shift+Enter adds a line, Escape stops a reply in flight. Files can be attached, dropped or pasted.
 */
export function PromptInput({
  ref, size, value: controlled, defaultValue = '', onValueChange, onSubmit, onStop, status = 'ready', disabled = false,
  accept, maxFiles = Infinity, onFilesRejected, className, children,
  onDragEnter, onDragOver, onDragLeave, onDrop, ...props
}: PromptInputProps) {
  const [inner, setInner] = useState(defaultValue);
  const [attachments, setAttachments] = useState<PromptInputAttachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const value = controlled ?? inner;
  const busy = status === 'submitted' || status === 'streaming';
  const canSubmit = !disabled && !busy && (value.trim() !== '' || attachments.length > 0);

  const setValue = (next: string) => {
    setInner(next);
    onValueChange?.(next);
  };

  const addFiles = (files: File[]) => {
    if (disabled || files.length === 0) return;
    const allowed = files.filter(file => accepts(file, accept));
    const room = Math.max(0, maxFiles - attachments.length);
    const added = allowed.slice(0, room);
    const rejected = files.filter(file => !added.includes(file));
    if (added.length) setAttachments(current => [...current, ...added.map(file => ({ id: `attachment-${++attachmentId}`, file }))]);
    if (rejected.length) onFilesRejected?.(rejected);
  };

  const removeFile = (id: string) => {
    setAttachments(current => current.filter(item => item.id !== id));
    textareaRef.current?.focus();
  };

  const submit = () => {
    if (!canSubmit) return;
    onSubmit?.({ text: value, files: attachments.map(item => item.file) });
    setValue('');
    setAttachments([]);
  };

  const stop = () => {
    if (busy) onStop?.();
  };

  const hasFiles = (event: DragEvent) => !disabled && Array.from(event.dataTransfer.types).includes('Files');

  const context: PromptInputContextValue = {
    value, setValue, attachments, addFiles, removeFile, status, busy, disabled, canSubmit, accept, submit, stop, textareaRef,
  };

  return <PromptInputContext value={context}>
    <form
      data-slot="prompt-input"
      data-status={status}
      data-disabled={disabled || undefined}
      data-dragging={dragging || undefined}
      {...props}
      ref={ref}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        submit();
      }}
      onDragEnter={event => {
        onDragEnter?.(event);
        if (hasFiles(event)) setDragging(true);
      }}
      onDragOver={event => {
        onDragOver?.(event);
        // Without this the browser opens the dropped file instead.
        if (hasFiles(event)) event.preventDefault();
      }}
      onDragLeave={event => {
        onDragLeave?.(event);
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={event => {
        onDrop?.(event);
        setDragging(false);
        if (!hasFiles(event)) return;
        event.preventDefault();
        addFiles(Array.from(event.dataTransfer.files));
      }}
      className={cn(promptInputVariants({ size }), className)}
    >
      {children}
    </form>
  </PromptInputContext>;
}

export interface PromptInputTextareaProps extends Omit<ComponentProps<'textarea'>, 'value' | 'defaultValue' | 'rows'> {
  /** The resting height in lines. Default 1. */
  rows?: number;
  /** The tallest it grows, in lines; longer text scrolls. Default 8. */
  maxRows?: number;
  /** Enter sends and Shift+Enter adds a line. With `false` Enter adds a line and only the button sends. Default true. */
  submitOnEnter?: boolean;
}

/** The composer's text. It grows with its content between `rows` and `maxRows` lines. */
export function PromptInputTextarea({
  ref, rows = 1, maxRows = 8, submitOnEnter = true, className, style, disabled, onChange, onKeyDown, onPaste,
  'aria-label': ariaLabel, ...props
}: PromptInputTextareaProps) {
  const prompt = usePromptInput();
  const typing = useTypingSound();
  const { textareaRef } = prompt;
  const minimum = Math.max(1, rows);
  const maximum = Math.max(minimum, maxRows);

  const measure = useCallback(() => {
    const node = textareaRef.current;
    if (!node) return;
    // The CSS min and max heights clamp both reads, so the field rests between rows and maxRows.
    node.style.height = '0px';
    node.style.height = `${node.scrollHeight}px`;
  }, [textareaRef]);

  useLayoutEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    let frame = 0;
    let width = node.getBoundingClientRect().width;
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(entries => {
      const next = entries[0]?.contentRect.width;
      if (next !== width) { width = next; schedule(); }
    });
    observer?.observe(node);
    void document.fonts?.ready.then(schedule);
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      node.style.height = '';
    };
  }, [textareaRef, measure]);

  useLayoutEffect(measure, [measure, prompt.value, minimum, maximum]);

  const setRefs = useCallback((node: HTMLTextAreaElement | null) => {
    textareaRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }, [textareaRef, ref]);

  return <textarea
    data-slot="prompt-input-textarea"
    aria-label={ariaLabel ?? (props['aria-labelledby'] ? undefined : 'Message')}
    {...typing.fieldProps}
    {...props}
    ref={setRefs}
    rows={minimum}
    value={prompt.value}
    disabled={disabled || prompt.disabled}
    style={{ ...style, '--prompt-rows': minimum, '--prompt-max-rows': maximum } as CSSProperties}
    onChange={event => {
      onChange?.(event);
      prompt.setValue(event.currentTarget.value);
    }}
    onKeyDown={event => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;
      typing.onKeyDown?.(event);
      if (event.key === 'Escape' && prompt.busy) {
        event.preventDefault();
        prompt.stop();
        return;
      }
      // An Enter that confirms an IME composition (Japanese, Chinese…) must not send the message.
      if (event.key !== 'Enter' || !submitOnEnter || event.shiftKey || event.nativeEvent.isComposing) return;
      event.preventDefault();
      prompt.submit();
    }}
    onPaste={(event: ClipboardEvent<HTMLTextAreaElement>) => {
      onPaste?.(event);
      const files = Array.from(event.clipboardData.files);
      if (event.defaultPrevented || files.length === 0) return;
      prompt.addFiles(files);
      // A copied picture often carries its name as text too; keep that paste only when there is no file.
      if (!event.clipboardData.getData('text/plain')) event.preventDefault();
    }}
    className={cn(promptInputTextareaClasses, 'overflow-y-auto', className)}
  />;
}

/** The row under the text: tools at the start, the send button at the end. */
export function PromptInputToolbar({ ref, className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="prompt-input-toolbar" {...props} ref={ref} className={cn(promptInputToolbarClasses, className)} />;
}

/** A group of tools (attach, model, voice) in the toolbar. */
export function PromptInputTools({ ref, className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="prompt-input-tools" {...props} ref={ref} className={cn(promptInputToolsClasses, className)} />;
}

/** A quiet icon button for the toolbar. Disabled with the composer. */
export function PromptInputButton({ variant = 'ghost', size = 'sm', disabled, ...props }: IconButtonProps) {
  const prompt = usePromptInput();
  return <IconButton data-slot="prompt-input-button" {...props} variant={variant} size={size} disabled={disabled || prompt.disabled} />;
}

export interface PromptInputAttachProps extends Omit<IconButtonProps, 'label' | 'children'> {
  /** Default "Attach files". */
  label?: string;
  children?: ReactNode;
  /** Overrides the composer's `accept` for this picker. */
  accept?: string;
  /** Default true. */
  multiple?: boolean;
}

/** Opens the file picker; chosen files appear in `PromptInputAttachments`. */
export function PromptInputAttach({ label = 'Attach files', accept, multiple = true, children, onClick, ...props }: PromptInputAttachProps) {
  const prompt = usePromptInput();
  const input = useRef<HTMLInputElement>(null);
  return <>
    <PromptInputButton
      data-slot="prompt-input-attach"
      {...props}
      label={label}
      onClick={event => {
        onClick?.(event);
        if (!event.defaultPrevented) input.current?.click();
      }}
    >
      {children ?? <HugeiconsIcon icon={Attachment01Icon} aria-hidden="true" strokeWidth={1.8} />}
    </PromptInputButton>
    <input
      ref={input}
      type="file"
      hidden
      tabIndex={-1}
      aria-hidden="true"
      accept={accept ?? prompt.accept}
      multiple={multiple}
      onChange={event => {
        prompt.addFiles(Array.from(event.currentTarget.files ?? []));
        // The same file can be picked again after it is removed.
        event.currentTarget.value = '';
      }}
    />
  </>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit += 1; }
  return `${size < 10 ? size.toFixed(1) : Math.round(size)} ${units[unit]}`;
}

/** A small picture of the file: a thumbnail for images, an icon for anything else. */
export function PromptInputFileIcon({ file, className }: { file: Blob | { type: string }; className?: string }) {
  // A real file gets a thumbnail; a plain description of one (a sent message's file) gets an icon.
  const image = file.type.startsWith('image/') && file instanceof Blob;
  // The object URL lives exactly as long as the image element; React 19 runs the returned cleanup on detach.
  const attach = useCallback((node: HTMLImageElement | null) => {
    if (!node || !image) return;
    const url = URL.createObjectURL(file as Blob);
    node.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, image]);
  return <span data-slot="prompt-input-file-icon" className={cn(promptInputAttachmentPreviewClasses, className)} aria-hidden="true">
    {image ? <img ref={attach} alt="" />
      : file.type.startsWith('audio/') ? <HugeiconsIcon icon={AudioWave01Icon} aria-hidden="true" strokeWidth={1.8} />
        : file.type.startsWith('image/') ? <HugeiconsIcon icon={Image01Icon} aria-hidden="true" strokeWidth={1.8} />
          : <HugeiconsIcon icon={File02Icon} aria-hidden="true" strokeWidth={1.8} />}
  </span>;
}

export interface PromptInputAttachmentsProps extends ComponentProps<'ul'> {
  /** The remove button's name for a file. Default `Remove <name>`. */
  removeLabel?: (file: File) => string;
}

/** The attached files, each with its size and a remove button. Renders nothing while there are none. */
export function PromptInputAttachments({
  ref, removeLabel = file => `Remove ${file.name}`, className, 'aria-label': ariaLabel = 'Attachments', ...props
}: PromptInputAttachmentsProps) {
  const prompt = usePromptInput();
  if (prompt.attachments.length === 0) return null;
  return <ul data-slot="prompt-input-attachments" aria-label={ariaLabel} {...props} ref={ref} className={cn(promptInputAttachmentsClasses, className)}>
    {prompt.attachments.map(({ id, file }) => <li key={id} data-slot="prompt-input-attachment" className={promptInputAttachmentClasses}>
      <PromptInputFileIcon file={file} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-xs leading-4 font-medium">{file.name}</span>
        <span className="text-2xs text-muted-foreground">{formatBytes(file.size)}</span>
      </span>
      <IconButton variant="ghost" size="xs" label={removeLabel(file)} disabled={prompt.disabled} onClick={() => prompt.removeFile(id)}>
        <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" strokeWidth={1.8} />
      </IconButton>
    </li>)}
  </ul>;
}

export interface PromptInputOption {
  value: string;
  label: string;
  /** A shorter name for tight places: the effort row and the trigger ("Med" for Medium). */
  shortLabel?: string;
  /** A short second line in the menu: what the choice is good for. */
  description?: string;
  /** A quiet detail at the row's end, such as a price or a speed. */
  meta?: ReactNode;
  icon?: ReactNode;
}

/** A model in `PromptInputModelSelect`. */
export type PromptInputModel = PromptInputOption;

const chevron = <HugeiconsIcon
  icon={ArrowDown01Icon}
  aria-hidden="true"
  strokeWidth={1.8}
  className="transition-transform duration-200 ease-out in-data-popup-open:rotate-180 motion-reduce:transition-none"
/>;

/** A row of the menu: icon, the label (with its description under it) and the detail at the end. */
function OptionItem({ option, closeOnClick }: { option: PromptInputOption; closeOnClick?: boolean }) {
  return <DropdownRadioItem value={option.value} leadingIcon={option.icon} closeOnClick={closeOnClick}>
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate">{option.label}</span>
      {option.description && <span className="text-xs font-normal text-pretty text-muted-foreground">{option.description}</span>}
    </span>
    {option.meta !== undefined && <span className="ms-3 shrink-0 text-xs font-normal whitespace-nowrap text-muted-foreground tabular-nums">{option.meta}</span>}
  </DropdownRadioItem>;
}

/** Controlled or uncontrolled, like the other Morphin inputs. */
function useChoice(options: PromptInputOption[], controlled?: string, defaultValue?: string, onChange?: (value: string) => void) {
  const [inner, setInner] = useState(defaultValue ?? options[0]?.value ?? '');
  const value = controlled ?? inner;
  const current = options.find(option => option.value === value) ?? options[0];
  const change = (next: unknown) => {
    setInner(String(next));
    onChange?.(String(next));
  };
  return [value, current, change] as const;
}

export interface PromptInputSelectProps {
  options: PromptInputOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Names the menu and the trigger ("Tone: Friendly"). */
  label: string;
  /** Below 28rem of composer width the trigger shows only its icon (when the option has one). */
  collapse?: boolean;
  disabled?: boolean;
  className?: string;
  contentProps?: Omit<DropdownContentProps, 'children'>;
}

/** A quiet toolbar button with the current choice that opens a menu above the composer, for any one choice. */
export function PromptInputSelect({
  options, value: controlled, defaultValue, onValueChange, label, collapse = false, disabled, className, contentProps,
  ...props
}: PromptInputSelectProps) {
  const prompt = usePromptInput();
  const [value, current, change] = useChoice(options, controlled, defaultValue, onValueChange);
  const iconOnly = collapse && current?.icon !== undefined;
  return <Dropdown>
    <DropdownTrigger
      data-slot="prompt-input-select"
      {...props}
      aria-label={current ? `${label}: ${current.label}` : label}
      disabled={disabled || prompt.disabled}
      render={<Button variant="ghost" size="sm" leadingIcon={current?.icon} trailingIcon={chevron} className={cn('max-w-48 min-w-0 text-muted-foreground', className)} />}
    >
      <span className={cn('truncate', iconOnly && '@max-[28rem]/prompt-input:sr-only')}>{current?.label ?? label}</span>
    </DropdownTrigger>
    <DropdownContent align="start" side="top" width={288} {...contentProps}>
      <DropdownRadioGroup value={value} onValueChange={change}>
        <DropdownLabel>{label}</DropdownLabel>
        {options.map(option => <OptionItem key={option.value} option={option} closeOnClick />)}
      </DropdownRadioGroup>
    </DropdownContent>
  </Dropdown>;
}

/** Five steps of how long the model may think before it answers, medium by default. */
export const promptInputEfforts: PromptInputOption[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium', shortLabel: 'Med' },
  { value: 'high', label: 'High' },
  { value: 'xhigh', label: 'Extra high', shortLabel: 'XHigh' },
  { value: 'max', label: 'Max' },
];

export interface PromptInputModelSelectProps {
  models: PromptInputModel[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (model: string) => void;
  /**
   * Effort steps, shown as a segmented row under the models and beside the model on the trigger.
   * Leave it out for a model menu alone; `promptInputEfforts` has five steps.
   */
  efforts?: PromptInputOption[];
  effort?: string;
  /** Default `medium` when it is one of `efforts`, otherwise the first. */
  defaultEffort?: string;
  onEffortChange?: (effort: string) => void;
  /** A small note at the bottom of the menu, such as what the prices mean. */
  footer?: ReactNode;
  /** Default "Model". */
  label?: string;
  /** Default "Effort". */
  effortLabel?: string;
  disabled?: boolean;
  className?: string;
  contentProps?: Omit<DropdownContentProps, 'children'>;
}

/**
 * The model and its effort in one menu: models with their detail and a check, then the effort as a
 * segmented row. Picking a model closes the menu; the effort row keeps it open. The trigger reads
 * "General High", and drops the effort below 28rem of composer width.
 */
export function PromptInputModelSelect({
  models, value, defaultValue, onValueChange, efforts = [], effort, defaultEffort, onEffortChange, footer,
  label = 'Model', effortLabel = 'Effort', disabled, className, contentProps, ...props
}: PromptInputModelSelectProps) {
  const prompt = usePromptInput();
  const [model, currentModel, changeModel] = useChoice(models, value, defaultValue, onValueChange);
  const [level, currentEffort, changeEffort] = useChoice(
    efforts, effort, defaultEffort ?? (efforts.some(item => item.value === 'medium') ? 'medium' : undefined), onEffortChange,
  );
  const name = [currentModel && `${label}: ${currentModel.label}`, currentEffort && `${effortLabel}: ${currentEffort.label}`].filter(Boolean).join(', ');
  return <Dropdown>
    <DropdownTrigger
      data-slot="prompt-input-model"
      {...props}
      aria-label={name || label}
      disabled={disabled || prompt.disabled}
      render={<Button variant="ghost" size="sm" leadingIcon={currentModel?.icon} trailingIcon={chevron} className={cn('max-w-64 min-w-0', className)} />}
    >
      <span className="truncate">{currentModel?.shortLabel ?? currentModel?.label ?? label}</span>
      {currentEffort && <span className="shrink-0 text-muted-foreground @max-[28rem]/prompt-input:hidden">{currentEffort.shortLabel ?? currentEffort.label}</span>}
    </DropdownTrigger>
    <DropdownContent align="start" side="top" width={320} {...contentProps}>
      <DropdownRadioGroup value={model} onValueChange={changeModel} aria-label={label}>
        {models.map(option => <OptionItem key={option.value} option={option} closeOnClick />)}
      </DropdownRadioGroup>
      {efforts.length > 0 && <>
        <DropdownSeparator />
        <DropdownGroup>
          <DropdownLabel>{effortLabel}</DropdownLabel>
          <DropdownRadioGroup variant="segmented" value={level} onValueChange={changeEffort} className="mx-1 mb-1">
            {efforts.map(option => <DropdownRadioItem key={option.value} value={option.value} aria-label={option.label}>
              {option.shortLabel ?? option.label}
            </DropdownRadioItem>)}
          </DropdownRadioGroup>
        </DropdownGroup>
      </>}
      {footer && <p className="px-2.5 pt-1 pb-1.5 text-xs text-pretty text-muted-foreground">{footer}</p>}
    </DropdownContent>
  </Dropdown>;
}

type RecorderState = 'idle' | 'starting' | 'recording';
type Session = { recorder?: MediaRecorder; stream?: MediaStream; chunks: Blob[]; keep: boolean; cancelled: boolean };

function extensionOf(type: string) {
  if (type.includes('mp4') || type.includes('aac')) return 'm4a';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('wav')) return 'wav';
  return 'webm';
}

export interface VoiceRecorderOptions {
  /** The finished recording, as an audio file. Not called for a discarded one. */
  onRecorded?: (file: File) => void;
  /** No microphone, permission refused, or no MediaRecorder in this browser. */
  onError?: (error: unknown) => void;
  /** True when the microphone starts recording, false when it stops or is discarded. */
  onRecordingChange?: (recording: boolean) => void;
}

/**
 * Records the microphone with MediaRecorder. `stop()` delivers the recording to `onRecorded`, `stop(false)`
 * discards it, and unmounting releases the microphone. `elapsed` is in milliseconds.
 */
export function useVoiceRecorder({ onRecorded, onError, onRecordingChange }: VoiceRecorderOptions = {}) {
  const [state, setState] = useState<RecorderState>('idle');
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const session = useRef<Session | null>(null);
  const handlers = useRef({ onRecorded, onError, onRecordingChange });
  useEffect(() => { handlers.current = { onRecorded, onError, onRecordingChange }; });

  useEffect(() => {
    if (state !== 'recording') return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [state]);

  useEffect(() => () => {
    const current = session.current;
    if (!current) return;
    current.keep = false;
    current.cancelled = true;
    if (current.recorder && current.recorder.state !== 'inactive') current.recorder.stop();
    current.stream?.getTracks().forEach(track => track.stop());
  }, []);

  const start = async () => {
    if (session.current) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      handlers.current.onError?.(new Error('Voice recording is not available in this browser.'));
      return;
    }
    const current: Session = { chunks: [], keep: true, cancelled: false };
    session.current = current;
    setState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (current.cancelled) { stream.getTracks().forEach(track => track.stop()); return; }
      const recorder = new MediaRecorder(stream);
      current.stream = stream;
      current.recorder = recorder;
      recorder.ondataavailable = event => { if (event.data.size > 0) current.chunks.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        if (session.current === current) session.current = null;
        setState('idle');
        handlers.current.onRecordingChange?.(false);
        if (!current.keep || current.chunks.length === 0) return;
        const type = recorder.mimeType || current.chunks[0]?.type || 'audio/webm';
        handlers.current.onRecorded?.(new File(current.chunks, `voice-message.${extensionOf(type)}`, { type }));
      };
      recorder.start();
      const time = Date.now();
      setStartedAt(time);
      setNow(time);
      setState('recording');
      handlers.current.onRecordingChange?.(true);
    } catch (error) {
      if (session.current === current) session.current = null;
      setState('idle');
      if (!current.cancelled) handlers.current.onError?.(error);
    }
  };

  const stop = (keep = true) => {
    const current = session.current;
    if (!current) return;
    current.keep = keep;
    if (current.recorder && current.recorder.state !== 'inactive') {
      current.recorder.stop();
      return;
    }
    // Still waiting for permission: give up on it.
    current.cancelled = true;
    session.current = null;
    setState('idle');
  };

  return { state, recording: state === 'recording', elapsed: state === 'recording' ? Math.max(0, now - startedAt) : 0, start, stop };
}

function formatDuration(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** The recording dot breathes while motion is allowed. The tween owns its opacity and is reverted with it. */
function usePulse(target: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const node = target.current;
    if (!node || !active) return;
    const tween = gsap.to(node, { opacity: 0.25, duration: 0.8, ease: 'sine.inOut', repeat: -1, yoyo: true });
    return () => { tween.revert(); };
  }, [target, active]);
}

export interface PromptInputVoiceProps extends Omit<IconButtonProps, 'label' | 'children' | 'onError'>, VoiceRecorderOptions {
  /** The toggle's name; it is pressed while recording. Default "Record voice message". */
  label?: string;
  /** Default "Discard recording". */
  discardLabel?: string;
  /** Announced when recording starts. Default "Recording". */
  recordingLabel?: string;
}

/**
 * Records a voice message. Press to start, press again to keep it, or discard it with the button beside the
 * timer. Without `onRecorded` the recording is attached to the message as an audio file.
 */
export function PromptInputVoice({
  label = 'Record voice message', discardLabel = 'Discard recording', recordingLabel = 'Recording',
  onRecorded, onError, onRecordingChange, onClick, disabled, variant = 'ghost', size = 'sm', className, ...props
}: PromptInputVoiceProps) {
  const prompt = usePromptInput();
  const reduced = useReducedMotion();
  const dot = useRef<HTMLSpanElement>(null);
  const recorder = useVoiceRecorder({
    onRecorded: file => (onRecorded ? onRecorded(file) : prompt.addFiles([file])),
    onError,
    onRecordingChange,
  });
  const active = recorder.state !== 'idle';
  usePulse(dot, recorder.recording && !reduced);

  return <span data-slot="prompt-input-voice" data-recording={recorder.recording || undefined} className="inline-flex items-center gap-1">
    {recorder.recording && <>
      <span data-slot="prompt-input-recording" className={promptInputRecordingClasses}>
        <span ref={dot} className={promptInputRecordingDotClasses} aria-hidden="true" />
        <span aria-hidden="true">{formatDuration(recorder.elapsed)}</span>
      </span>
      <IconButton variant="ghost" size={size} label={discardLabel} onClick={() => recorder.stop(false)}>
        <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" strokeWidth={1.8} />
      </IconButton>
    </>}
    <span role="status" className="sr-only">{recorder.recording ? recordingLabel : ''}</span>
    <IconButton
      {...props}
      variant={recorder.recording ? 'secondary' : variant}
      size={size}
      label={label}
      aria-pressed={active}
      disabled={disabled || prompt.disabled}
      className={className}
      onClick={event => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (active) recorder.stop(true);
        else void recorder.start();
      }}
    >
      {active ? <HugeiconsIcon icon={StopIcon} aria-hidden="true" strokeWidth={0} className="size-3 fill-current" /> : <HugeiconsIcon icon={Mic01Icon} aria-hidden="true" strokeWidth={1.8} />}
    </IconButton>
  </span>;
}

export interface PromptInputSubmitProps extends Omit<IconButtonProps, 'label' | 'children'> {
  /** Default "Send message". */
  label?: string;
  /** The name while a reply is in flight. Default "Stop generating". */
  stopLabel?: string;
  children?: ReactNode;
}

/** Sends the message; while a reply is in flight it is the Stop button. Disabled while there is nothing to send. */
export function PromptInputSubmit({
  label = 'Send message', stopLabel = 'Stop generating', variant = 'primary', size = 'sm', disabled, children, className, onClick, ...props
}: PromptInputSubmitProps) {
  const prompt = usePromptInput();
  return <IconButton
    data-slot="prompt-input-submit"
    {...props}
    type={prompt.busy ? 'button' : 'submit'}
    variant={variant}
    size={size}
    label={prompt.busy ? stopLabel : label}
    data-state={prompt.busy ? 'stop' : 'send'}
    disabled={disabled || prompt.disabled || (!prompt.busy && !prompt.canSubmit)}
    className={cn(promptInputSubmitDisabledClasses, className)}
    onClick={event => {
      onClick?.(event);
      if (!event.defaultPrevented && prompt.busy) prompt.stop();
    }}
  >
    {children ?? (prompt.busy ? <HugeiconsIcon icon={StopIcon} aria-hidden="true" strokeWidth={0} className="size-3 fill-current" /> : <HugeiconsIcon icon={ArrowUp02Icon} aria-hidden="true" strokeWidth={2} />)}
  </IconButton>;
}
