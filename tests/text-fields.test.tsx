import { createRef, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Mail, Search } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/registry/morphin/ui/field';
import { Input } from '@/registry/morphin/ui/input';
import { Textarea } from '@/registry/morphin/ui/textarea';

describe('text fields', () => {
  it('connects labels, descriptions, refs and native form values', async () => {
    const user = userEvent.setup();
    const input = createRef<HTMLInputElement>();
    const textarea = createRef<HTMLTextAreaElement>();
    const { container } = render(<form>
      <Field name="email"><FieldLabel>Email</FieldLabel><Input ref={input} type="email" leadingIcon={<Mail />} /><FieldDescription>Work email only.</FieldDescription></Field>
      <Field name="message"><FieldLabel>Message</FieldLabel><Textarea ref={textarea} /><FieldDescription>A short note.</FieldDescription></Field>
    </form>);
    expect(screen.getByLabelText('Email')).toBe(input.current);
    expect(screen.getByLabelText('Message')).toBe(textarea.current);
    expect(input.current).toHaveAccessibleDescription('Work email only.');
    expect(textarea.current).toHaveAccessibleDescription('A short note.');
    await user.click(screen.getByText('Message'));
    expect(textarea.current).toHaveFocus();
    await user.type(input.current!, 'hello@morphin.dev');
    await user.type(textarea.current!, 'Hello\nMorphin');
    expect(Object.fromEntries(new FormData(container.querySelector('form')!))).toEqual({ email: 'hello@morphin.dev', message: 'Hello\nMorphin' });
    expect(container.querySelector('[data-icon="inline-start"]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('supports controlled values and both native and Base UI change callbacks', async () => {
    const user = userEvent.setup();
    const changed = vi.fn();
    function Example() {
      const [email, setEmail] = useState('');
      const [message, setMessage] = useState('');
      return <><Input aria-label="Email" value={email} onValueChange={setEmail} /><Textarea aria-label="Message" value={message} onValueChange={setMessage} onChange={changed} /></>;
    }
    render(<Example />);
    await user.type(screen.getByLabelText('Email'), 'abc');
    await user.type(screen.getByLabelText('Message'), 'note');
    expect(screen.getByLabelText('Email')).toHaveValue('abc');
    expect(screen.getByLabelText('Message')).toHaveValue('note');
    expect(changed).toHaveBeenCalledTimes(4);
  });

  it('inherits disabled and invalid state from Field and keeps readonly values focusable', async () => {
    const user = userEvent.setup();
    render(<>
      <Field disabled><FieldLabel>Locked</FieldLabel><Input defaultValue="Locked value" /></Field>
      <Field disabled><FieldLabel>Locked note</FieldLabel><Textarea defaultValue="Locked note" /></Field>
      <Field invalid><FieldLabel>Invalid note</FieldLabel><Textarea required /><FieldError match>Write a note.</FieldError></Field>
      <Input aria-label="Read only" readOnly defaultValue="Reference" />
    </>);
    expect(screen.getByLabelText('Locked')).toBeDisabled();
    expect(screen.getByLabelText('Locked note')).toBeDisabled();
    expect(screen.getByLabelText('Invalid note')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Invalid note')).toHaveAccessibleDescription('Write a note.');
    await user.click(screen.getByLabelText('Read only'));
    await user.keyboard('Changed');
    expect(screen.getByLabelText('Read only')).toHaveFocus();
    expect(screen.getByLabelText('Read only')).toHaveValue('Reference');
  });

  it('enforces textarea maxLength and preserves explicit icon sizes', async () => {
    const user = userEvent.setup();
    const { container } = render(<><Input aria-label="Search" trailingIcon={<Search className="size-6" />} /><Textarea aria-label="Bio" maxLength={5} /></>);
    await user.type(screen.getByLabelText('Bio'), 'Too many characters');
    expect(screen.getByLabelText('Bio')).toHaveValue('Too m');
    expect(container.querySelector('svg')).toHaveClass('size-6');
  });

  it('preserves native textarea states and associates a composed hint and counter', () => {
    render(<>
      <Textarea aria-label="Disabled note" disabled required />
      <Textarea aria-label="Read-only note" readOnly defaultValue="Reference" />
      <Field><FieldLabel>Bio</FieldLabel><Textarea /><FieldDescription><span>Your public bio.</span><span>0/160</span></FieldDescription></Field>
    </>);
    expect(screen.getByLabelText('Disabled note')).toBeDisabled();
    expect(screen.getByLabelText('Disabled note')).toBeRequired();
    expect(screen.getByLabelText('Read-only note')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Bio')).toHaveAccessibleDescription(/0\/160/);
    expect(screen.getByLabelText('Bio')).toHaveAccessibleDescription(/Your public bio/);
  });

  it('renders built-in hints and maxLength counters and combines external descriptions', async () => {
    const user = userEvent.setup();
    const { container } = render(<>
      <span id="external">External context.</span>
      <Field><FieldLabel>Name</FieldLabel><Input hint="Choose a short name." maxLength={5} aria-describedby="external" /><FieldDescription>Visible on your profile.</FieldDescription></Field>
      <Field><FieldLabel>Note</FieldLabel><Textarea hint="Be kind." maxLength={8} defaultValue="Hi" /></Field>
    </>);
    const input = screen.getByLabelText('Name');
    expect(input).toHaveAccessibleDescription(/External context/);
    expect(input).toHaveAccessibleDescription(/Visible on your profile/);
    expect(input).toHaveAccessibleDescription(/Choose a short name.*0\/5/);
    expect(screen.getByLabelText('Note')).toHaveAccessibleDescription('Be kind. 2/8');
    await user.type(input, 'Morphin');
    expect(input).toHaveValue('Morph');
    expect(container.querySelector('[data-slot="input-counter"]')).toHaveTextContent('5/5');
    await user.type(screen.getByLabelText('Note'), '!');
    expect(container.querySelector('[data-slot="textarea-counter"]')).toHaveTextContent('3/8');
  });

  it('tracks controlled replacements, rejected edits, count opt-out and unlimited counts', async () => {
    const user = userEvent.setup();
    const { rerender, container } = render(<Input aria-label="Name" value="Fixed" onValueChange={() => {}} maxLength={20} />);
    await user.type(screen.getByLabelText('Name'), 'ignored');
    expect(container.querySelector('[data-slot="input-counter"]')).toHaveTextContent('5/20');
    rerender(<Input aria-label="Name" value="New" onValueChange={() => {}} showCount />);
    expect(container.querySelector('[data-slot="input-counter"]')).toHaveTextContent('3');
    rerender(<Input aria-label="Name" value="New" onValueChange={() => {}} maxLength={20} showCount={false} hint="A hint without a counter." />);
    expect(container.querySelector('[data-slot="input-counter"]')).toBeNull();
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('A hint without a counter.');
  });

  it('resets uncontrolled counters with native forms and respects cancelled resets', async () => {
    const user = userEvent.setup();
    const { container } = render(<form>
      <Input aria-label="Name" defaultValue="A" maxLength={20} />
      <Textarea aria-label="Note" defaultValue="Hi" showCount />
      <button type="reset">Reset</button>
    </form>);
    await user.type(screen.getByLabelText('Name'), 'bc');
    await user.type(screen.getByLabelText('Note'), ' there');
    expect(container.querySelector('[data-slot="input-counter"]')).toHaveTextContent('3/20');
    expect(container.querySelector('[data-slot="textarea-counter"]')).toHaveTextContent('8');
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(container.querySelector('[data-slot="input-counter"]')).toHaveTextContent('1/20');
    expect(container.querySelector('[data-slot="textarea-counter"]')).toHaveTextContent('2');
    expect(screen.getByLabelText('Name')).toHaveValue('A');
    container.querySelector('form')!.addEventListener('reset', event => event.preventDefault());
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Abc');
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(container.querySelector('[data-slot="input-counter"]')).toHaveTextContent('3/20');
  });

  it('keeps controlled auto-height unchanged when the parent rejects an edit', () => {
    const computed = vi.spyOn(window, 'getComputedStyle').mockReturnValue({ lineHeight: '20px', paddingTop: '9px', paddingBottom: '9px' } as CSSStyleDeclaration);
    try {
      render(<Textarea aria-label="Controlled note" value="Hi" onValueChange={() => {}} autoResize rows={1} />);
      const node = screen.getByLabelText('Controlled note') as HTMLTextAreaElement;
      Object.defineProperty(node, 'scrollHeight', { configurable: true, get: () => node.value.length > 2 ? 198 : 38 });
      fireEvent.change(node, { target: { value: 'An edit the parent rejects' } });
      expect(node).toHaveValue('Hi');
      expect(node.style.height).toBe('38px');
    } finally { computed.mockRestore(); }
  });

  it('grows, caps, shrinks, reacts to controlled changes and restores sizing when autoResize is disabled', async () => {
    const style = vi.spyOn(window, 'getComputedStyle').mockReturnValue({ lineHeight: '20px', paddingTop: '9px', paddingBottom: '9px' } as CSSStyleDeclaration);
    try {
      const { rerender } = render(<Textarea aria-label="Note" autoResize rows={2} maxRows={4} defaultValue="" />);
      const node = screen.getByLabelText('Note');
      let height = 38;
      Object.defineProperty(node, 'scrollHeight', { configurable: true, get: () => height });
      expect(node.style.height).toBe('58px');
      height = 78;
      fireEvent.change(node, { target: { value: 'Three lines' } });
      expect(node.style.height).toBe('78px');
      height = 198;
      fireEvent.change(node, { target: { value: 'Lots of lines' } });
      expect(node.style.height).toBe('98px');
      expect(node.style.overflowY).toBe('auto');
      height = 38;
      fireEvent.change(node, { target: { value: '' } });
      expect(node.style.height).toBe('58px');
      expect(node.style.overflowY).toBe('hidden');
      height = 78;
      rerender(<Textarea aria-label="Note" autoResize rows={2} maxRows={4} value="Updated" onChange={() => {}} />);
      await waitFor(() => expect(node.style.height).toBe('78px'));
      rerender(<Textarea aria-label="Note" value="Updated" onChange={() => {}} />);
      expect(node.style.height).toBe('');
      expect(node.style.overflowY).toBe('');
    } finally { style.mockRestore(); }
  });

  it('gives a Textarea id, name and disabled state to the Field control', () => {
    render(<form>
      <Field><FieldLabel>Bio</FieldLabel><Textarea id="bio" name="bio" defaultValue="Hi" /></Field>
      <Field><FieldLabel>Locked</FieldLabel><Textarea disabled /></Field>
    </form>);
    const bio = screen.getByLabelText('Bio');
    expect(bio).toHaveAttribute('id', 'bio');
    expect(screen.getByText('Bio')).toHaveAttribute('for', 'bio');
    expect(new FormData(bio.closest('form')!).get('bio')).toBe('Hi');
    expect(screen.getByLabelText('Locked')).toBeDisabled();
    expect(screen.getByLabelText('Locked')).toHaveAttribute('data-disabled');
  });

  it('styles the native textarea through textareaClassName', () => {
    render(<Textarea aria-label="Note" textareaClassName="font-mono" />);
    expect(screen.getByLabelText('Note')).toHaveClass('font-mono');
  });
});
