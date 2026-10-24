import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionProvider } from '@/registry/morphin/lib/motion';
import {
  Modal, ModalBody, ModalClose, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle, ModalTrigger,
  type ModalContentProps,
} from '@/registry/morphin/ui/modal';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function Example(props: Partial<ModalContentProps> & { defaultOpen?: boolean }) {
  const { defaultOpen, ...content } = props;
  return <Modal defaultOpen={defaultOpen}>
    <ModalTrigger>Open</ModalTrigger>
    <ModalContent {...content}>
      <ModalHeader>
        <ModalTitle>Invite</ModalTitle>
        <ModalDescription>Add people to the project.</ModalDescription>
      </ModalHeader>
      <ModalBody>Body</ModalBody>
      <ModalFooter><ModalClose>Cancel</ModalClose></ModalFooter>
    </ModalContent>
  </Modal>;
}

const popup = () => document.querySelector('[data-slot=modal-content]') as HTMLElement;

describe('Modal', () => {
  it('opens from the trigger as a dialog named by its title and described by its description', async () => {
    const user = userEvent.setup();
    render(<Example />);
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = await screen.findByRole('dialog', { name: 'Invite' });
    expect(dialog).toHaveAccessibleDescription('Add people to the project.');
    expect(dialog).toHaveAttribute('data-slot', 'modal-content');
    expect(screen.getByText('Body')).toHaveAttribute('data-slot', 'modal-body');
  });

  it('closes with Escape, the corner button and ModalClose', async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Open' });

    await user.click(trigger);
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await user.click(trigger);
    await screen.findByRole('dialog');
    await user.click(document.querySelector('[data-slot=modal-close-button]')!);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await user.click(trigger);
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('names the corner button and can drop it', async () => {
    const { unmount } = render(<Example defaultOpen closeLabel="Dismiss" />);
    expect(await screen.findByRole('button', { name: 'Dismiss' })).toHaveAttribute('data-slot', 'modal-close-button');
    unmount();
    render(<Example defaultOpen showCloseButton={false} />);
    await screen.findByRole('dialog');
    expect(document.querySelector('[data-slot=modal-close-button]')).toBeNull();
  });

  it('closes on a backdrop press unless pointer dismissal is disabled', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Example defaultOpen />);
    await screen.findByRole('dialog');
    await user.click(document.querySelector('[data-slot=modal-viewport]')!);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    unmount();

    render(<Modal defaultOpen disablePointerDismissal>
      <ModalContent><ModalTitle>Sure?</ModalTitle></ModalContent>
    </Modal>);
    await screen.findByRole('dialog');
    await user.click(document.querySelector('[data-slot=modal-viewport]')!);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('works controlled', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [open, setOpen] = useState(false);
      return <>
        <button onClick={() => setOpen(true)}>External</button>
        <Modal open={open} onOpenChange={setOpen}><ModalContent><ModalTitle>Controlled</ModalTitle></ModalContent></Modal>
      </>;
    }
    render(<Controlled />);
    await user.click(screen.getByRole('button', { name: 'External' }));
    await screen.findByRole('dialog', { name: 'Controlled' });
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('exposes size, placement and scroll as data attributes and sizes the layers', async () => {
    render(<Example defaultOpen size="lg" placement="top" scroll="outside" backdrop="blur" />);
    await screen.findByRole('dialog');
    expect(popup()).toHaveAttribute('data-size', 'lg');
    expect(popup()).toHaveAttribute('data-placement', 'top');
    expect(popup()).toHaveAttribute('data-scroll', 'outside');
    expect(popup().className).toContain('max-w-lg');
    expect(document.querySelector('[data-slot=modal-backdrop]')).toHaveAttribute('data-backdrop', 'blur');
    expect(document.querySelector('[data-slot=modal-backdrop]')!.className).toContain('backdrop-blur-sm');
  });

  it('gives a scrolling body room around its content so focus rings are not clipped', async () => {
    render(<Example defaultOpen />);
    await screen.findByRole('dialog');
    const classes = screen.getByText('Body').className;
    for (const token of ['in-data-[scroll=inside]:overflow-y-auto', 'in-data-[scroll=inside]:p-2', 'in-data-[scroll=inside]:-m-2']) {
      expect(classes).toContain(token);
    }
  });

  it('keeps the signature corner shape, and full goes edge to edge', async () => {
    const { unmount } = render(<Example defaultOpen />);
    await screen.findByRole('dialog');
    expect(popup().className).toContain('[corner-shape:var(--corner-shape)]');
    unmount();
    render(<Example defaultOpen size="full" />);
    await screen.findByRole('dialog');
    expect(popup().className).toContain('rounded-none');
    expect(document.querySelector('[data-slot=modal-viewport]')!.className).toContain('p-0');
  });

  it('scales up in 250 ms and leaves softer and faster in 150 ms', async () => {
    render(<Example defaultOpen />);
    await screen.findByRole('dialog');
    const classes = popup().className;
    for (const token of ['duration-250', 'ease-[cubic-bezier(0.22,1,0.36,1)]', 'data-starting-style:scale-96', 'data-starting-style:opacity-0', 'data-ending-style:scale-96', 'data-ending-style:opacity-0', 'data-ending-style:duration-150']) {
      expect(classes).toContain(token);
    }
    expect(document.querySelector('[data-slot=modal-backdrop]')!.className).toContain('data-ending-style:duration-150');
  });

  it('drops the transitions under reduced motion', async () => {
    render(<MotionProvider reducedMotion="always"><Example defaultOpen /></MotionProvider>);
    await screen.findByRole('dialog');
    expect(popup()).toHaveAttribute('data-reduced-motion');
    expect(popup().className).toContain('transition-none');
    expect(popup().className).not.toContain('duration-250');
    expect(document.querySelector('[data-slot=modal-backdrop]')!.className).toContain('transition-none');
  });

  it('renders the popup as another element through render', async () => {
    render(<Modal defaultOpen><ModalContent render={<form aria-label="Create" />}><ModalTitle>Create</ModalTitle></ModalContent></Modal>);
    expect((await screen.findByRole('dialog')).tagName).toBe('FORM');
  });
});
