import { StrictMode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gsap } from 'gsap';
import { toast, Toaster, type ToasterProps, type ToastEffects } from '@/registry/morphin/ui/toast';
import { MotionProvider } from '@/registry/morphin/lib/motion';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});

afterEach(() => {
  act(() => toast.dismiss());
  gsap.globalTimeline.clear();
  gsap.ticker.sleep();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setup(props?: ToasterProps) {
  return render(<Toaster {...props} />);
}
const cards = () => [...document.querySelectorAll<HTMLElement>('[data-slot="toast"]')];
const title = () => document.querySelector('[data-slot="toast-title"]');
const slot = (name: string, card = cards()[0]) => card.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;

describe('Toast', () => {
  it('shows a title and a description and closes from its button', async () => {
    setup();
    act(() => { toast({ title: 'Saved', description: 'Your changes are in.' }); });
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('Your changes are in.')).toBeInTheDocument();
    expect(cards()[0]).toHaveAttribute('data-state', 'default');
    expect(slot('toast-badge')).toHaveClass('hidden');

    await userEvent.setup().click(slot('toast-close'));
    await waitFor(() => expect(cards()).toHaveLength(0));
  });

  it('accepts a plain string as the title', async () => {
    setup();
    act(() => { toast('Copied'); });
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });

  it('marks each state and shows the matching badge', async () => {
    setup({ timeout: 0 });
    act(() => { toast.loading('Working'); toast.success('Done'); toast.error('Failed'); });
    await waitFor(() => expect(cards()).toHaveLength(3));
    const byTitle = (title: string) => cards().find(card => card.textContent?.includes(title))!;
    expect(byTitle('Working')).toHaveAttribute('data-state', 'loading');
    expect(byTitle('Done')).toHaveAttribute('data-state', 'success');
    expect(byTitle('Failed')).toHaveAttribute('data-state', 'error');
    expect(slot('toast-badge', byTitle('Done')).querySelector('svg')).toBeInTheDocument();
    expect(slot('toast-badge', byTitle('Working')).querySelector('[class*="ld-"], svg, span')).toBeTruthy();
  });

  it('renders a custom icon instead of the bell', async () => {
    setup();
    act(() => { toast({ title: 'Deployed', icon: <svg data-testid="rocket" /> }); });
    expect(await screen.findByTestId('rocket')).toBeInTheDocument();
  });

  it('keeps a loading toast open while others close by themselves', async () => {
    setup({ timeout: 40 });
    act(() => { toast.loading('Working'); toast('Passing'); });
    await waitFor(() => expect(cards()).toHaveLength(2));
    await waitFor(() => expect(screen.queryByText('Passing')).not.toBeInTheDocument());
    await act(() => new Promise(done => setTimeout(done, 120)));
    expect(screen.getByText('Working')).toBeInTheDocument();
  });

  it('changes a toast in place and starts the auto-close timer when it settles', async () => {
    setup({ timeout: 150 });
    let id = '';
    act(() => { id = toast.loading({ title: 'Working', description: 'One moment' }); });
    expect(await screen.findByText('Working')).toBeInTheDocument();

    act(() => toast.update(id, { state: 'success', title: 'Finished', description: 'All good' }));
    await waitFor(() => expect(title()).toHaveTextContent('Finished'));
    expect(cards()).toHaveLength(1);
    expect(cards()[0]).toHaveAttribute('data-state', 'success');
    await waitFor(() => expect(cards()).toHaveLength(0), { timeout: 2000 });
  });

  it('follows a promise to success with the result', async () => {
    setup({ timeout: 0 });
    let resolve!: (value: string) => void;
    const promise = new Promise<string>(done => { resolve = done; });
    act(() => { void toast.promise(promise, { loading: 'Exporting', success: name => ({ title: 'Ready', description: name }), error: 'Failed' }); });
    expect(await screen.findByText('Exporting')).toBeInTheDocument();
    expect(cards()[0]).toHaveAttribute('data-state', 'loading');

    await act(async () => { resolve('report.pdf'); await promise; });
    await waitFor(() => expect(title()).toHaveTextContent('Ready'));
    expect(document.querySelector('[data-slot="toast-description"]')).toHaveTextContent('report.pdf');
    expect(cards()[0]).toHaveAttribute('data-state', 'success');
  });

  it('follows a promise to error', async () => {
    setup({ timeout: 0 });
    let reject!: (error: Error) => void;
    const promise = new Promise<never>((_, fail) => { reject = fail; });
    act(() => { void toast.promise(promise, { loading: 'Uploading', success: 'Uploaded', error: error => ({ title: 'Upload failed', description: (error as Error).message }) }).catch(() => undefined); });
    expect(await screen.findByText('Uploading')).toBeInTheDocument();
    await act(async () => { reject(new Error('Quota exceeded')); await promise.catch(() => undefined); });
    await waitFor(() => expect(title()).toHaveTextContent('Upload failed'));
    expect(document.querySelector('[data-slot="toast-description"]')).toHaveTextContent('Quota exceeded');
    expect(cards()[0]).toHaveAttribute('data-state', 'error');
  });

  it('dismisses one toast by id, or all of them', async () => {
    setup({ timeout: 0 });
    let first = '';
    act(() => { first = toast('First'); toast('Second'); });
    await waitFor(() => expect(cards()).toHaveLength(2));
    act(() => toast.dismiss(first));
    await waitFor(() => expect(screen.queryByText('First')).not.toBeInTheDocument());
    expect(screen.getByText('Second')).toBeInTheDocument();
    act(() => toast.dismiss());
    await waitFor(() => expect(cards()).toHaveLength(0));
  });

  it('shows at most `limit` toasts; older ones wait out of sight', async () => {
    setup({ timeout: 0, limit: 2 });
    act(() => { toast('One'); toast('Two'); toast('Three'); });
    await waitFor(() => expect(cards()).toHaveLength(3));
    expect(cards().filter(card => card.hasAttribute('data-limited'))).toHaveLength(1);
    expect(cards().find(card => card.hasAttribute('data-limited'))).toHaveTextContent('One');
  });

  it('exposes stable slots and the position on the viewport', async () => {
    setup({ position: 'bottom-left' });
    act(() => { toast({ title: 'Hello', description: 'World' }); });
    await screen.findByText('Hello');
    for (const name of ['toast-viewport', 'toast-card', 'toast-icon', 'toast-title', 'toast-description', 'toast-close']) {
      expect(document.querySelector(`[data-slot="${name}"]`), name).toBeInTheDocument();
    }
    expect(document.querySelector('[data-slot="toast-viewport"]')).toHaveClass('left-4');
  });

  it('renders inside a container passed through portalProps', async () => {
    const container = document.createElement('div');
    container.id = 'themed';
    document.body.append(container);
    setup({ portalProps: { container } });
    act(() => { toast('Themed'); });
    await screen.findByText('Themed');
    expect(container.querySelector('[data-slot="toast-viewport"]')).toBeInTheDocument();
    container.remove();
  });

  it('handles a failed promise itself, so a fire-and-forget call never leaks a rejection', async () => {
    setup({ timeout: 0 });
    const failure = new Error('Quota exceeded');
    const promise = Promise.reject(failure);
    let returned: Promise<unknown> | undefined;
    act(() => { returned = toast.promise(promise, { loading: 'Uploading', success: 'Uploaded', error: 'Upload failed' }); });
    expect(returned).toBe(promise);
    await waitFor(() => expect(document.querySelector('[data-slot="toast"]')).toHaveAttribute('data-state', 'error'));
    await expect(returned).rejects.toBe(failure);
  });

  describe('motion', () => {
    // Freeze the running tweens so the real-time ticker cannot advance them between lines.
    const pause = () => gsap.globalTimeline.getChildren(true, true, true).forEach(tween => tween.pause());
    const motion = (card = cards()[0]) => slot('toast-motion', card);

    const title_ = () => document.querySelector('[data-slot="toast-title"]');

    it('rises in when a toast appears', async () => {
      setup({ timeout: 0 });
      act(() => { toast('Hello'); });
      await screen.findByText('Hello');
      pause();
      expect(Number(motion().style.opacity)).toBeLessThan(1);
      expect(motion().style.filter).toContain('blur(');
      expect(motion().style.transform).toContain('translate');
    });

    it('drops out when a toast closes', async () => {
      setup({ timeout: 0 });
      act(() => { toast('Bye'); });
      await screen.findByText('Bye');
      const layer = motion();
      // jsdom has no animations, so Base UI removes the toast at once; check the exit was started.
      const to = vi.spyOn(gsap, 'to');
      act(() => toast.dismiss());
      await waitFor(() => expect(to.mock.calls.some(([target, vars]) => target === layer && (vars as gsap.TweenVars).opacity === 0)).toBe(true));
    });

    it('dims and softens toasts behind the newest one', async () => {
      setup({ timeout: 0 });
      act(() => { toast('Older'); });
      await screen.findByText('Older');
      const older = motion();
      act(() => { toast('Newer'); });
      await screen.findByText('Newer');
      await waitFor(() => expect(gsap.getTweensOf(older).some(tween => String(tween.vars.filter) === 'blur(1px)')).toBe(true));
    });

    it('sweeps a shimmer across the title while loading, and stops when it settles', async () => {
      setup({ timeout: 0 });
      let id = '';
      act(() => { id = toast.loading({ title: 'Working' }); });
      await screen.findByText('Working');
      expect(title_()).toHaveAttribute('data-shimmer');
      expect(gsap.getTweensOf(title_())).toHaveLength(1);
      act(() => toast.update(id, { state: 'success', title: 'Done' }));
      await waitFor(() => expect(title_()).not.toHaveAttribute('data-shimmer'));
      expect(gsap.getTweensOf(title_()).filter(tween => tween.vars.repeat === -1)).toHaveLength(0);
    });

    it('swaps a state with no state effects unless Pro effects are passed', async () => {
      setup({ timeout: 0 });
      let id = '';
      act(() => { id = toast.loading({ title: 'Working', description: 'One moment' }); });
      await screen.findByText('Working');
      act(() => toast.update(id, { state: 'error', title: 'Failed', description: 'Try again' }));
      await waitFor(() => expect(title_()).toHaveTextContent('Failed'));
      pause();
      expect(cards()[0]).toHaveAttribute('data-state', 'error');
      expect(slot('toast-badge').querySelector('svg')).toBeInTheDocument();
      for (const name of ['toast-bloom', 'toast-wave', 'toast-tint', 'toast-halo']) {
        expect(cards()[0].querySelector(`[data-slot="${name}"]`), name).toBeNull();
      }
      expect(gsap.getTweensOf(motion()).filter(tween => typeof tween.vars.x === 'number')).toHaveLength(0);
      expect(title_()?.querySelector('[data-morph-out]')).not.toBeInTheDocument();
    });

    it('lets the effects prop add layers and text behavior', async () => {
      const effects: ToastEffects = {
        useStatus: (_refs, { state }) => ({ bloom: <span data-slot="toast-bloom" data-state-seen={state} /> }),
        Text: ({ value, part }) => <span data-custom={part}>{value}</span>,
      };
      setup({ timeout: 0, effects });
      act(() => { toast({ title: 'Custom', description: 'Text' }); });
      await screen.findByText('Custom');
      expect(slot('toast-bloom')).toHaveAttribute('data-state-seen', 'default');
      expect(title_()?.querySelector('[data-custom="title"]')).toBeInTheDocument();
      expect(document.querySelector('[data-slot="toast-description"] [data-custom="description"]')).toBeInTheDocument();
    });

    it('plays nothing under reduced motion', async () => {
      render(<MotionProvider reducedMotion="always"><Toaster timeout={0} /></MotionProvider>);
      let id = '';
      act(() => { id = toast.loading({ title: 'Working' }); });
      await screen.findByText('Working');
      expect(motion().style.opacity).toBe('');
      expect(title_()).not.toHaveAttribute('data-shimmer');
      act(() => toast.update(id, { state: 'success', title: 'Done' }));
      await screen.findByText('Done');
      pause();
      expect(slot('toast-badge').style.transform).toBe('');
      expect(document.querySelector('[data-slot="toast-viewport"]')).toHaveAttribute('data-reduced-motion');
    });
  });

  it('drops the stack styles when reduced motion is switched on, and never replays the entrance', async () => {
    const { rerender } = render(<Toaster timeout={0} />);
    act(() => { toast('Older'); });
    await screen.findByText('Older');
    act(() => { toast('Newer'); });
    await screen.findByText('Newer');
    const older = [...document.querySelectorAll<HTMLElement>('[data-slot="toast-motion"]')].find(node => node.textContent?.includes('Older'))!;
    await waitFor(() => expect(gsap.getTweensOf(older).length).toBeGreaterThan(0));
    gsap.globalTimeline.getChildren(true, true, true).forEach(tween => tween.progress(1));
    expect(older.style.filter).toContain('blur(1px)');

    rerender(<Toaster timeout={0} reduceMotion />);
    expect(older.style.filter).toBe('');
    expect(older.style.opacity).toBe('');

    const enter = vi.spyOn(gsap, 'fromTo');
    rerender(<Toaster timeout={0} />);
    expect(enter.mock.calls.filter(([target]) => target === older)).toHaveLength(0);
  });

  describe('border beam', () => {
    const beamOf = () => document.querySelector<HTMLElement>('[data-slot="toast-beam"]')!;
    const beamActive = () => beamOf().hasAttribute('data-active');

    it('travels around a loading toast and stops when it settles', async () => {
      setup({ timeout: 0 });
      let id = '';
      act(() => { id = toast.loading({ title: 'Working' }); });
      await screen.findByText('Working');
      await waitFor(() => expect(beamActive()).toBe(true));

      act(() => toast.update(id, { state: 'success', title: 'Done' }));
      await waitFor(() => expect(title()).toHaveTextContent('Done'));
      await waitFor(() => expect(beamActive()).toBe(false));
    });

    it('is off for other states unless asked for, and can be turned off while loading', async () => {
      setup({ timeout: 0 });
      act(() => { toast('Plain'); });
      await screen.findByText('Plain');
      expect(beamActive()).toBe(false);

      act(() => toast.dismiss());
      await waitFor(() => expect(cards()).toHaveLength(0));
      act(() => { toast({ title: 'Highlighted', beam: true }); });
      await screen.findByText('Highlighted');
      await waitFor(() => expect(beamActive()).toBe(true));

      act(() => toast.dismiss());
      await waitFor(() => expect(cards()).toHaveLength(0));
      act(() => { toast.loading({ title: 'Quiet', beam: false }); });
      await screen.findByText('Quiet');
      expect(beamActive()).toBe(false);
    });

    it('keeps the icon and the beam choice when an update names neither', async () => {
      setup({ timeout: 0 });
      let id = '';
      act(() => { id = toast.loading({ title: 'Working', icon: <svg data-testid="rocket" />, beam: false }); });
      await screen.findByTestId('rocket');
      act(() => toast.update(id, { title: 'Still working' }));
      await waitFor(() => expect(title()).toHaveTextContent('Still working'));
      expect(screen.getByTestId('rocket')).toBeInTheDocument();
      expect(beamActive()).toBe(false);
    });

    it('stays off under reduced motion', async () => {
      render(<MotionProvider reducedMotion="always"><Toaster timeout={0} /></MotionProvider>);
      act(() => { toast.loading({ title: 'Working' }); });
      await screen.findByText('Working');
      expect(beamActive()).toBe(false);
    });

    it('follows the theme of the container it renders in, and when that changes', async () => {
      const container = document.createElement('div');
      container.className = 'light';
      document.body.append(container);
      setup({ timeout: 0, portalProps: { container } });
      act(() => { toast.loading({ title: 'Working' }); });
      await screen.findByText('Working');
      // The theme only shows in the CSS the beam writes for itself.
      const css = () => [...document.querySelectorAll('style')]
        .filter(style => style.textContent?.includes(beamOf().getAttribute('data-beam')!))
        .map(style => style.textContent).join('\n');
      const light = css();
      expect(light).not.toBe('');

      act(() => { container.className = 'dark'; });
      await waitFor(() => expect(css()).not.toBe(light));
      act(() => { container.className = 'light'; });
      await waitFor(() => expect(css()).toBe(light));
      container.remove();
    });
  });

  describe('entering and stacking', () => {
    it('moves the stack with the translate and scale properties Tailwind writes, not transform', async () => {
      setup();
      act(() => { toast({ title: 'Saved' }); });
      await screen.findByText('Saved');
      // `transition-[transform]` does not cover `translate`/`scale`, so older toasts would snap, and so would a swipe.
      const root = cards()[0];
      expect(root).toHaveClass('transition-[translate,scale,opacity,height,visibility]');
      expect(root.className).not.toContain('transition-[transform');
      // Base UI unmounts when the root's transition ends, so it must outlast GSAP's exit.
      expect(root).toHaveClass('data-ending-style:duration-300');
    });

    it('plays the entrance in Strict Mode, which mounts, reverts and mounts the hook again', async () => {
      render(<StrictMode><Toaster /></StrictMode>);
      act(() => { toast({ title: 'Saved' }); });
      await screen.findByText('Saved');
      const motion = slot('toast-motion');
      const enter = gsap.getTweensOf(motion).find(tween => 'opacity' in tween.vars && tween.vars.opacity === 1);
      expect(enter).toBeDefined();
      enter!.pause(0);
      expect(motion.style.opacity).toBe('0');
      expect(motion.style.filter).toBe('blur(2px)');
      enter!.progress(1);
      expect(motion.style.opacity).toBe('1');
    });

    it('opens in 350 ms and closes in 250 ms on one curve', async () => {
      setup({ timeout: 0 });
      act(() => { toast({ title: 'Saved' }); });
      await screen.findByText('Saved');
      const motion = slot('toast-motion');
      const enter = gsap.getTweensOf(motion).find(tween => 'opacity' in tween.vars && tween.vars.opacity === 1)!;
      expect(enter.duration()).toBeCloseTo(0.35);
      // jsdom unmounts a closed toast at once and takes its tweens with it, so read the exit from the call.
      const to = vi.spyOn(gsap, 'to');
      act(() => toast.dismiss());
      await waitFor(() => expect(to.mock.calls.some(([target, vars]) => target === motion && (vars as gsap.TweenVars).opacity === 0)).toBe(true));
      const exit = to.mock.calls.find(([target, vars]) => target === motion && (vars as gsap.TweenVars).opacity === 0)![1] as gsap.TweenVars;
      expect(exit.duration).toBeCloseTo(0.25);
      expect(exit.ease).toBe(enter.vars.ease);
    });

    it('moves an older toast behind the new one without redrawing it at the first change', async () => {
      setup({ timeout: 0 });
      act(() => { toast({ title: 'First' }); });
      await screen.findByText('First');
      const first = cards()[0];
      gsap.getTweensOf(slot('toast-motion', first)).forEach(tween => tween.progress(1));
      act(() => { toast({ title: 'Second' }); });
      await waitFor(() => expect(cards()).toHaveLength(2));
      const depth = gsap.getTweensOf(slot('toast-motion', first)).find(tween => 'opacity' in tween.vars && (tween.vars.opacity as number) < 1);
      expect(depth).toBeDefined();
      depth!.progress(1);
      expect(slot('toast-motion', first).style.opacity).toBe('0.78');
    });
  });
});
