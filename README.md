# morphin-ui

React components for morphin.dev, built with **React, TypeScript, Tailwind CSS v4, Base UI and GSAP**.

morphin-ui works like [shadcn/ui](https://ui.shadcn.com): you don't install a component package. The `morphinui` CLI (or the shadcn CLI) copies the component source into your project, and from then on you own it and can change it. The registry is served at `https://morphin.dev/r/{name}.json`.

```sh
npx morphinui@latest add button
```

One command sets the project up (shadcn, the `@morphin` registry) and adds the component with everything it needs. [Install](#install) has the details, and the same registry works with `npx shadcn@latest add @morphin/button`.

Buttons and dropdown menus come with light and dark themes. The signature shape uses `border-radius: 999px` with `corner-shape: superellipse(1.2)`, and content changes animate with GSAP.

Components need **React 19**. They follow its API: `ref` is a regular prop (no `forwardRef`), so `<Button ref={ref} />` works on every component, and composition goes through Base UI's `render` prop (`render={<Link href="/pricing" />}`) rather than `asChild`.

Registry development and CI use Node.js **24.22.1 LTS** (the October 2026 security release). Run `nvm install && nvm use` in this checkout; `.nvmrc` selects the version.

## Install

### With the Morphin CLI

One command sets the project up and adds components:

```sh
npx morphinui@latest add button
npx morphinui@latest add dropdown modal slider
npx morphinui@latest list
```

`morphinui` is a thin layer over the shadcn CLI. It runs `shadcn init` when the project has no `components.json`, adds the `@morphin` registry, then runs `shadcn add @morphin/<name>`. Add `--theme` for the Morphin palette and type scale, `--all` for every component. `npm`, `pnpm`, `yarn` and `bun` all work; see [`packages/morphinui`](packages/morphinui/README.md).

### With the shadcn CLI

The registry is a plain shadcn registry, so the shadcn CLI works on its own, with no extra package:

#### 1. Set up shadcn

In a React project with Tailwind CSS v4 (Next.js, Vite, React Router and others):

```sh
npx shadcn@latest init
```

This creates `components.json`, adds the shadcn theme to your CSS and creates `lib/utils.ts`.

#### 2. Add the Morphin registry

Add the `@morphin` namespace to `components.json`:

```json
{
  "registries": {
    "@morphin": "https://morphin.dev/r/{name}.json"
  }
}
```

#### 3. Add components

```sh
# Optional: the Morphin palette and type scale instead of your current shadcn theme.
npx shadcn@latest add @morphin/theme @morphin/typography

npx shadcn@latest add @morphin/button @morphin/dropdown @morphin/select @morphin/button-group @morphin/split-button @morphin/link-button @morphin/badge @morphin/chip @morphin/avatar @morphin/card @morphin/announcement @morphin/checkbox @morphin/radio @morphin/action-card @morphin/action-card-menu @morphin/toast @morphin/input @morphin/textarea @morphin/switch @morphin/slider @morphin/calendar @morphin/date-picker @morphin/modal @morphin/tabs @morphin/spinner @morphin/skeleton
```

Each component brings what it needs: the npm dependencies (Base UI, CVA, GSAP, loading-dev), the shared `@morphin/motion` helper, `@morphin/tokens` and shadcn's `cn` helper. A direct URL also works without the namespace: `npx shadcn@latest add https://morphin.dev/r/button.json`.

```tsx
import { Button } from '@/components/ui/button';

export function App() {
  return <Button>Get started</Button>;
}
```

What gets installed:

| Item | Files | Notes |
| --- | --- | --- |
| `@morphin/button` | `components/ui/button.tsx`, `button-variants.ts`, `button-content.tsx` | |
| `@morphin/dropdown` | `components/ui/dropdown.tsx`, `dropdown-variants.ts`, `dropdown-highlight.tsx` | Depends on button; uses `lucide-react` |
| `@morphin/select` | `components/ui/select.tsx`, `select-variants.ts` | Depends on button and dropdown; uses `lucide-react` |
| `@morphin/button-group` | `components/ui/button-group.tsx` | Depends on button |
| `@morphin/split-button` | `components/ui/split-button.tsx` | Depends on button, dropdown and motion; a main action with an arrow that opens a menu on hover |
| `@morphin/link-button` | `components/ui/link-button.tsx`, `link-button-variants.ts` | Standalone |
| `@morphin/badge` | `components/ui/badge.tsx`, `badge-variants.ts` | Standalone; counts, statuses and labels |
| `@morphin/chip` | `components/ui/chip.tsx`, `chip-variants.ts` | `@morphin/motion`; tags, statuses and filters, with a shimmering label |
| `@morphin/avatar` | `components/ui/avatar.tsx`, `avatar-variants.ts` | `@morphin/motion`; Base UI Avatar, with a status dot and a group that overlaps avatars; uses `lucide-react` |
| `@morphin/card` | `components/ui/card.tsx`, `card-variants.ts` | `@morphin/motion`; a surface with header, content, footer and media parts |
| `@morphin/announcement` | `components/ui/announcement.tsx`, `announcement-variants.ts` | `@morphin/card`, `@morphin/button` and `@morphin/motion`; a compact notice with an icon, text, an action and an animated dismiss; uses `lucide-react` |
| `@morphin/action-card` | `components/ui/action-card.tsx`, `action-card-variants.ts` | `@morphin/motion`; a preview tile (icon, image or video) with a label, as a link or a button |
| `@morphin/action-card-menu` | `components/ui/action-card-menu.tsx` | `@morphin/action-card`, `@morphin/dropdown`; the card opens into a menu in its place (GSAP) |
| `@morphin/toast` | `components/ui/toast.tsx`, `toast-variants.ts`, `toast-effects.ts` | Needs `loading-dev`, `border-beam` and `lucide-react`; uses the `success`, `success-soft`, `warning`, `destructive` and `destructive-soft` tokens |
| `@morphin/input` | `components/ui/input.tsx` | Depends on field; three sizes and decorative icons |
| `@morphin/textarea` | `components/ui/textarea.tsx` | Depends on field; native and automatic resizing |
| `@morphin/checkbox` | `components/ui/checkbox.tsx`, `checkbox-variants.ts` | `@morphin/motion`; Base UI Checkbox and CheckboxGroup, the tick draws itself; uses `lucide-react` |
| `@morphin/radio` | `components/ui/radio.tsx`, `radio-variants.ts` | `@morphin/motion`; Base UI Radio and RadioGroup, the dot scales in |
| `@morphin/switch` | `components/ui/switch.tsx`, `switch-variants.ts` | Standalone; GSAP toggle bounce |
| `@morphin/slider` | `components/ui/slider.tsx`, `slider-variants.ts` | Standalone; ranges, vertical orientation, live value |
| `@morphin/calendar` | `components/ui/calendar.tsx`, `calendar-variants.ts` | Depends on button and motion; a month grid on [react-day-picker](https://daypicker.dev) (single, multiple, range) with a GSAP month change; uses `lucide-react` |
| `@morphin/date-picker` | `components/ui/date-picker.tsx` | Depends on calendar, select and dropdown; a Base UI Popover with a calendar, for a date or a range; uses `lucide-react` |
| `@morphin/modal` | `components/ui/modal.tsx`, `modal-variants.ts` | Depends on button; sizes, placements, backdrops, scroll modes |
| `@morphin/tabs` | `components/ui/tabs.tsx`, `tabs-variants.ts` | Primary pill and secondary underline; overflow chevrons; uses `lucide-react` |
| `@morphin/spinner` | `components/ui/spinner.tsx` | Any `loading-dev` spinner, Atom by default |
| `@morphin/skeleton` | `components/ui/skeleton.tsx` | `@morphin/motion`; an ASCII skeleton and the reveal that decodes real content into place, on [ascii-reveal](https://github.com/quanhoangindex/ascii-reveal) (MIT) |
| `@morphin/field` | `components/ui/field.tsx`, `text-field-variants.ts`, `text-field-feedback.tsx` | Accessible labels, descriptions, errors and shared text-control recipes |
| `@morphin/motion` | `lib/motion.tsx` | `MotionProvider`, `useReducedMotion`, `motionTokens` |
| `@morphin/sound` | `lib/sound.tsx` | `SoundProvider`, `useSound`; every interactive component depends on it. Silent and loads nothing until a provider turns it on |
| `@morphin/sound-cuelume` | `lib/sound-cuelume.ts` | The sound player: `cuelumeSound`, `unlockSound`, `setSoundTheme`, `setSoundVolume`; installs `cuelume` |
| `@morphin/tokens` | CSS variables only | The extra tokens below; never overwrites existing values |
| `@morphin/theme` | CSS variables only | The Morphin palette: warm neutrals for `:root`; for `.dark`, pure black with solid `#171717` cards and popovers |
| `@morphin/typography` | CSS variables only | The Morphin type scale on the Tailwind sizes |

Icons come from [lucide-react](https://lucide.dev), which the items that draw one (dropdown, select, toast, tabs) install as a dependency; pass your own icons to `leadingIcon`, `icon` and friends as usual.

The file names match shadcn's own `button.tsx`. If your project already has a shadcn button, the CLI asks before overwriting it.

## Theming

Components use the shadcn token names, so they follow whatever theme your project has: `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--border`, `--input`, `--ring`, `--popover` and `--popover-foreground`. `--accent` is the hover surface of ghost buttons and menu items, as in shadcn.

`@morphin/tokens` adds the few tokens shadcn doesn't have. Hover and pressed states are derived from your colors, so they follow your theme until you set them yourself:

| Token | Default |
| --- | --- |
| `--primary-hover`, `--primary-active` | `--primary` mixed with white / black |
| `--secondary-hover`, `--secondary-active` | `--secondary` mixed with `--foreground` |
| `--subtle-foreground` | a third text level, `--muted-foreground` mixed with `--background` |
| `--success`, `--warning`, `--info` and their `-foreground` | status colors, with dark-mode values |
| `--destructive-hover`, `--destructive-active`, `--destructive-foreground` | derived from `--destructive` |
| `--brand`, `--brand-foreground`, `--brand-hover`, `--brand-active` | Morphin pink, used by `variant="accent"` |
| `--disabled`, `--disabled-foreground` | derived from `--muted` |
| `--corner-shape` | `superellipse(1.2)` |
| `--popover-shadow` | the menu shadow, utility `shadow-popover` |
| `--field`, `--field-border` | the fill and border of inputs, textareas and select triggers: `--background` and `--input` on light, the solid `--card` with a `--border` hairline on dark |
| `--menu` | the surface of menus and lists (Dropdown, Select, Date Picker): `--popover` on light, on dark a 5% wash of `--foreground` over `--background` (`#0d0d0d` on pure black), a step below the field that opens it, so a segmented row's track and the sliding highlight read against it; modals and toasts stay on `--popover` |
| `--surface-raised` | a surface one step above a bar, for the sliding tab pill: `--popover` on light, `--card` mixed with 8% `--foreground` on dark |

Dark mode uses the `.dark` class, like shadcn and next-themes. Change any token in your CSS:

```css
:root {
  --brand: #dbe7ff;
  --brand-foreground: #1f2a44;
}
.dark {
  --primary: #f1f1ed;
}
```

Browsers without `corner-shape` support fall back to plain rounded corners.

## Typography

`@morphin/typography` sets the standard Tailwind sizes to the Morphin scale, so `text-sm` and friends work everywhere, including inside `cn`, without extra configuration. Use `font-medium` for labels and headings, and `font-semibold` with a tighter letter spacing for display titles.

| Utility | Size / line height / letter spacing |
| --- | --- |
| `text-2xs` | 11 / 12 px, 0.02em |
| `text-xs` | 12 / 16 px |
| `text-sm` | 14 / 20 px, -0.006em |
| `text-base` | 16 / 24 px, -0.011em |
| `text-lg` | 18 / 24 px, -0.015em |
| `text-xl` | 20 / 28 px |
| `text-2xl` | 24 / 32 px |
| `text-3xl` | 32 / 40 px, -0.005em |
| `text-4xl` | 40 / 48 px, -0.01em |
| `text-5xl` | 48 / 56 px, -0.01em |
| `text-6xl` | 56 / 64 px, -0.01em |

The Morphin look uses Inter for text and display titles (semibold, with tight letter spacing) and IBM Plex Mono for code; load them in your app and point `--font-sans` and `--font-mono` at them.

## Buttons

```tsx
import { Button, ButtonLink, IconButton } from '@/components/ui/button';

<Button variant="primary" size="lg">Get started</Button>
<Button variant="outline">View details</Button>
<Button loading loadingLabel="Saving">Save changes</Button>
<Button className="h-12 px-8">Custom sizing</Button>
<IconButton label="Add item" variant="accent">+</IconButton>
<ButtonLink href="https://morphin.dev">Explore Morphin</ButtonLink>
```

| Prop | Values / behavior |
| --- | --- |
| `variant` | `primary` (default), `secondary`, `outline`, `ghost`, `accent`, `destructive` |
| `size` | `xs` (28), `sm` (32), `md` (36, default), `lg` (48 px) |
| `leadingIcon`, `trailingIcon` | ReactNode; decorative icons are hidden from screen readers |
| `loading`, `loadingLabel` | Loading indicator, repeat-action prevention, retained focus |
| `disabled` | Native disabled behavior; Base UI also supports `focusableWhenDisabled` |
| `fullWidth` | Fill the parent width |
| `static` | Disable press scaling (a gentle 0.97 on press) |
| `reduceMotion` | Disable content transitions, press scaling and spinner animation for this button |
| `className` | Tailwind utilities or a Base UI state callback; conflicting utilities are merged |
| `render`, `nativeButton` | Base UI composition |

Button defaults to `type="button"`; use `type="submit"` to submit a form. ButtonLink preserves native anchor semantics. IconButton requires an accessible `label`.

Loading buttons use the **Atom** indicator from [loading-dev](https://github.com/jakubkrehel/loading). It inherits the button's color and icon size (13 / 14 / 16 / 18 px), including icon-only buttons. Its CSS animation pauses under the shared reduced-motion policy; content transitions use GSAP.

### Variants and composition

`buttonVariants` is a callable [CVA](https://cva.style/docs/getting-started/variants) recipe. Component props derive from `VariantProps<typeof buttonVariants>`, so the recipe and component share one set of variant types. `buttonClasses` also merges conflicting Tailwind utilities through `cn`. The iterable lists are `buttonVariantNames` and `buttonSizes`.

`button-variants.ts` has no React hooks, GSAP or Atom, so it also works in React Server Components:

```tsx
import { buttonClasses } from '@/components/ui/button-variants';

<a href="/docs" className={buttonClasses({ variant: 'outline', size: 'sm', className: 'px-6' })}>
  Read the docs
</a>
```

For Base UI triggers, compose through `render` so props, events and refs reach the same element:

```tsx
import { Popover } from '@base-ui/react/popover';

<Popover.Trigger render={<Button variant="outline" />}>Options</Popover.Trigger>
```

Use triggers within the corresponding Base UI root. For navigation, use `ButtonLink` or a styled anchor; Base UI Button enforces button semantics even when rendering another tag.

To navigate with your framework's link (Next.js, React Router…), pass it to `ButtonLink` through `render`. You keep a real link, without the `button` role, together with the animated content:

```tsx
import Link from 'next/link';

<ButtonLink render={<Link href="/pricing" />} variant="outline">Pricing</ButtonLink>
```

Buttons expose `data-slot="button"`, `data-variant` and `data-size`; links expose `data-slot="button-link"`. Internal slots are `button-content`, `button-label` and `button-icon`. Leading/trailing icon props add logical `data-icon="inline-start"` / `inline-end` markers and adjust the corresponding padding in LTR and RTL. SVG icons receive the default icon size unless they have an explicit `size-*` class. Composed child icons can also use these markers:

```tsx
<Button>
  <UploadIcon data-icon="inline-start" aria-hidden="true" />
  Upload
</Button>
```

`aria-expanded="true"` receives an expanded surface, and `aria-invalid="true"` receives a destructive border and focus outline.

## Dropdown

```tsx
import { Button } from '@/components/ui/button';
import {
  Dropdown, DropdownTrigger, DropdownContent,
  DropdownGroup, DropdownLabel, DropdownItem,
  DropdownLinkItem, DropdownSeparator,
} from '@/components/ui/dropdown';

<Dropdown>
  <DropdownTrigger render={<Button variant="outline" />}>Account</DropdownTrigger>
  <DropdownContent align="end" sideOffset={8}>
    <DropdownGroup>
      <DropdownLabel>Account</DropdownLabel>
      <DropdownItem onClick={openSettings}>Settings</DropdownItem>
      <DropdownLinkItem href="/saved">Saved</DropdownLinkItem>
    </DropdownGroup>
    <DropdownSeparator />
    <DropdownItem onClick={signOut}>Log out</DropdownItem>
  </DropdownContent>
</Dropdown>
```

Behavior comes from [Base UI Menu](https://base-ui.com/react/components/menu): arrow navigation, typeahead, checked state, disabled items, focus return, outside dismissal and collision-aware positioning. `Dropdown` supports controlled `open` / `onOpenChange` and uncontrolled `defaultOpen`. Menus are non-modal by default, so the page keeps scrolling and outside content stays interactive while one is open; pass `modal` to lock page scroll and block outside pointer interaction.

`DropdownContent` includes its portal and positioner. It accepts Base UI popup props plus `side`, `align`, `sideOffset`, `alignOffset`, `collisionPadding`, `portalProps`, `positionerProps`, `reduceMotion`, `restOnChecked`, `width` and `iconPosition`. It defaults to end alignment and an 8 px offset. Popup refs point to the menu surface. `width` is a number of pixels, any CSS length or `"trigger"` (the width of the element that opened the menu); without it the menu is 14rem wide, and a `className` such as `w-80` still overrides. `iconPosition="end"` puts every item's `leadingIcon` after its label at the right edge, with text on the left, and a `trailingIcon` (a count, say) sits just before it; checks and submenu chevrons stay at the edge, and a submenu inherits the setting.

Items accept `leadingIcon`, `trailingIcon`, `inset` and `variant="default" | "destructive"`. `DropdownItem` and `DropdownLinkItem` also accept `size="icon"` for compact chips, such as social links in a row. `DropdownShortcut` displays a shortcut hint; the application owns the shortcut handler. `DropdownRadioGroup` / `DropdownRadioItem` and `DropdownCheckboxItem` support controlled and uncontrolled choices and stay open when selected by default; use `closeOnClick` to change this. Radio items require `value`. `DropdownRadioGroup variant="segmented"` lays compact choices out in a row on a faint track with its own moving surface; its items hide the check indicator by default, and `size` sets the segments to `xs` (24 px), `sm` (28 px) or `md` (32 px, default). `DropdownSub` / `DropdownSubTrigger` compose nested menus with a nested `DropdownContent side="inline-end" align="start"`. `DropdownLabel` must be inside a `DropdownGroup` or `DropdownRadioGroup`. `DropdownLinkItem` closes the menu when chosen (set `closeOnClick={false}` to keep it open); pass your router's link as `render={<Link href="/settings" />}` to keep client-side navigation.

A single GSAP highlight slides and resizes between hovered or keyboard-focused items over 240 ms. Over separators, labels and padding it holds its row. When the pointer leaves the menu, or moves onto a segmented group, an icon chip or any region marked `data-highlight="none"`, it returns to the checked radio item (disable with `restOnChecked={false}`) or fades out, and it glides back in from where it left. It stays on a submenu trigger while that submenu is open. Each submenu and segmented group owns its own surface. Reduced motion removes the moving surfaces and uses immediate row highlights. Stable slots use the `dropdown-*` prefix.

The same surface works for any list, such as a cmdk command palette: put `DropdownHighlight` inside a `relative` element marked `data-highlight-scope` and pass it the active row, for example `useHighlightedElement(scope, '[cmdk-item][data-selected=true]')`. Skip it under `useReducedMotion()` and keep the rows' own highlight.

To theme one region of the page, put `.dark` (or token overrides) on a container and render the menu inside it with `portalProps={{ container }}`.

## Select

```tsx
import {
  Select, SelectTrigger, SelectContent,
  SelectGroup, SelectLabel, SelectItem, SelectSeparator,
} from '@/components/ui/select';

<Select name="region" defaultValue="eu">
  <SelectTrigger aria-label="Region" placeholder="Choose a region" />
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Production</SelectLabel>
      <SelectItem value="eu" description="Frankfurt, Paris">Europe</SelectItem>
      <SelectItem value="us" description="Virginia, Oregon">North America</SelectItem>
    </SelectGroup>
    <SelectSeparator />
    <SelectItem value="sandbox">Sandbox</SelectItem>
  </SelectContent>
</Select>
```

A form control on [Base UI Select](https://base-ui.com/react/components/select): arrow navigation, typeahead, `name` / `required` / `disabled` in native forms, controlled `value` / `onValueChange` and uncontrolled `defaultValue`. The trigger looks like an outline `Button` (`variant`, `size="sm" | "md" | "lg"`, `fullWidth`, `leadingIcon`, `placeholder`) and shows `aria-invalid` and `disabled` like one. The list reuses the dropdown surface and its sliding highlight, which rests on the selected option.

The trigger shows the selected item's label: `Select` reads it from the `SelectItem` children, or pass `items` (`{ value, label }[]`) when items render lazily. `SelectContent` opens below the trigger (`alignItemWithTrigger={false}`), is at least as wide as the trigger and accepts the same positioning props as `DropdownContent`. Like dropdowns, selects are non-modal by default; pass `modal` to lock page scroll. `multiple` is not supported yet. Stable slots use the `select-*` prefix.

## Input and textarea

```sh
npx shadcn@latest add @morphin/input @morphin/textarea
```

```tsx
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail } from 'lucide-react';

<FieldGroup>
  <Field name="email">
    <FieldLabel>Email</FieldLabel>
    <Input type="email" required placeholder="you@example.com" leadingIcon={<Mail strokeWidth={1.8} />} />
    <FieldDescription>Use your work email.</FieldDescription>
    <FieldError match="typeMismatch">Enter a valid email.</FieldError>
  </Field>
  <Field name="message">
    <FieldLabel>Message</FieldLabel>
    <Textarea autoResize rows={2} maxRows={8} placeholder="Tell us more…" />
  </Field>
</FieldGroup>
```

Both controls use the Morphin superellipse shape, semantic shadcn tokens and `size="sm" | "md" | "lg"` (Input heights: 32, 40, 48 px). `Field`, `FieldLabel`, `FieldDescription` and `FieldError` wrap Base UI Field and connect accessible names, hints and validation automatically. `FieldGroup` lays out a group of fields. Fields accept `disabled`, `invalid`, `name` and the other Base UI root props. Use `FieldError match` for an externally controlled error, or a validity key (`valueMissing`, `typeMismatch`, …) for native validation. Standalone controls also work with native labels or `aria-label`.

`Input` wraps Base UI Input. `leadingIcon` / `trailingIcon` are decorative (`aria-hidden`), inherit 16 px icon sizing and preserve explicit SVG `size-*` classes. Use a separate labelled button for interactive actions. `className` lays out the field; `inputClassName` styles the native input. The ref points to the native input. Examples import icons from `lucide-react`; add that dependency when using them.

`Textarea` renders a native textarea through Base UI Field.Control. Its superellipse corners use a 20 px radius cap so growing text stays inside the outline. It defaults to three rows and vertical resizing. `rows` is also the shortest and `maxRows` (default 8) the tallest it gets: the resize grip stops at both. `resize="none"` removes the native handle; `autoResize` takes precedence and grows or shrinks between them, then scrolls. The focus ring follows the same superellipse, 4 px outside the field. It recalculates after text, width, fonts and form resets change. The native resize handle is inset 6 px from the shell, keeping it clear of the rounded border. Height changes are immediate, with no animation. `className` lays out the field; `style` and ref target the textarea. Automatic sizing owns its inline height and overflow while enabled and restores previous values when disabled or unmounted.

Both accept native `onChange`, controlled `value` / `onValueChange`, uncontrolled `defaultValue`, and native form props (`name`, `required`, `disabled`, `readOnly`, `minLength`, `maxLength`, …). `hint` adds associated help text below either control. `maxLength` enforces the native limit and enables a built-in counter beside the hint by default. Use `showCount` for an unlimited count, or `showCount={false}` to hide it. Counters follow controlled values, uncontrolled edits and native form resets; existing descriptions and errors remain associated. Stable slots: `input-field`, `input-wrapper`, `input`, `input-icon`, `input-feedback`, `input-hint`, `input-counter` (and the matching `textarea-*` slots), plus `field-*`.

## Button group

```tsx
import { ButtonGroup, ButtonGroupItem } from '@/components/ui/button-group';

<ButtonGroup aria-label="Range" size="sm">
  {ranges.map(range => (
    <ButtonGroupItem key={range} selected={value === range} onClick={() => setValue(range)}>
      {range}
    </ButtonGroupItem>
  ))}
</ButtonGroup>

<ButtonGroupItem iconOnly aria-label="Bold"><BoldIcon /></ButtonGroupItem>
```

Buttons joined into one pill with shared borders; only the outer edges are rounded and the focused button rises above its neighbors. `ButtonGroup` is a `role="group"` (give it an `aria-label`) and passes `size` to its items. `ButtonGroupItem` is an outline `Button`: `selected` sets `aria-pressed` and an accent background, `leadingIcon` / `trailingIcon` work as on `Button`, and `iconOnly` requires `aria-label`. The group keeps no state; own it in your component, as a filter, a view switch or a toolbar needs.

## Split button

```tsx
import { SplitButton, SplitButtonAction, SplitButtonLink, SplitButtonMenu } from '@/components/ui/split-button';
import { DropdownContent, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';

<SplitButton>
  <SplitButtonAction onClick={join}>Join for free</SplitButtonAction>
  {/* or, for navigation: <SplitButtonLink href="/register">Join for free</SplitButtonLink> */}
  <SplitButtonMenu label="More options">
    <DropdownContent>
      <DropdownItem>Docs</DropdownItem>
      <DropdownSeparator />
      <DropdownItem>Contact us</DropdownItem>
    </DropdownContent>
  </SplitButtonMenu>
</SplitButton>
```

One pill in two segments: a main action and an arrow beside it that opens a menu. The menu opens when the pointer rests on the arrow (`delay`, 80 ms) and closes shortly after it leaves the arrow and the menu (`closeDelay`, 120 ms); click, Enter and the arrow keys open it too, so touch and keyboard users lose nothing. Pass `openOnHover={false}` for a click-only menu. `SplitButton` is a `role="group"` that passes `variant` (any button variant) and `size` to both segments through context; only the outer corners are round, and a hairline of the label color divides the segments (an outline pair shares one border). `SplitButtonAction` is a `Button` (`leadingIcon`, `loading` and the rest work as usual). For navigation use `SplitButtonLink` instead: a real anchor (a `ButtonLink`) in the same slot, with `href` or `render={<Link href="/pricing" />}` for your router. `SplitButtonMenu` takes a required `label` for the arrow button, `icon` to replace the chevron, `disabled`, and the `Dropdown` root props (`open`, `onOpenChange`, `modal`); its children are a `DropdownContent` with its items, aligned to the arrow's end edge. The arrow turns over while the menu is open (CSS, off under reduced motion). Stable slots: `split-button`, `split-button-action`, `split-button-trigger`, plus the `dropdown-*` slots.

## Link button

```tsx
import { LinkButton } from '@/components/ui/link-button';

<LinkButton href="/changelog" trailingIcon={<ArrowRight />}>View changelog</LinkButton>
<LinkButton variant="secondary" size="sm" underline="always" onClick={report}>Report a problem</LinkButton>
<LinkButton render={<Link href="/pricing" />}>Pricing</LinkButton>
```

An inline text action, not a button-shaped link (that is `ButtonLink`). With `href` or `render` it is a link; without them it is a `<button type="button">`. Options: `variant="primary" | "secondary"`, `size="md" | "sm" | "xs"` (icons follow at 16, 14 and 12 px), `underline="hover" | "always" | "none"`, `leadingIcon` / `trailingIcon`. A disabled link drops its `href`, gets `aria-disabled` and cancels the click, so it cannot be followed, even when `render` passes a router link with its own `href`.

## Badge

```tsx
import { Badge } from '@/components/ui/badge';

<Badge>91</Badge>
<Badge variant="primary">152</Badge>
<Badge variant="success" dot>Online</Badge>
<Badge variant="outline" size="lg" leadingIcon={<Sparkles />}>New</Badge>
<Badge render={<a href="/inbox" />}>Inbox</Badge>
```

A small pill for counts, statuses and labels, like a nav counter. It is static: no hover or press, so it sits inside a button, a menu item or a nav row. Options: `variant="neutral" | "primary" | "outline" | "brand" | "success" | "warning" | "info" | "destructive"`, `size="sm" | "md" | "lg"` (heights 16, 20 and 24 px on the `text-2xs`, `text-xs` and `text-sm` steps), `dot`, `leadingIcon` / `trailingIcon`. One digit is a circle (`min-width` equals the height) and digits are tabular, so a counter does not jitter as it changes. Status variants are a tint of the status token with its own color as text, and follow light and dark themes. The dot and icons are decorative (`aria-hidden`): put anything that matters ("3 unread") in the text or an `aria-label`. `render` renders another element, such as a link. Stable slots: `badge`, `badge-dot`, `badge-icon`.

## Chip

```tsx
import { Chip, ChipGroup } from '@/components/ui/chip';

<ChipGroup aria-label="Added">
  <Chip shimmer uppercase>New</Chip>
  <Chip variant="outline" uppercase>2d ago</Chip>
</ChipGroup>
<Chip selected={value === 'hero'} onClick={() => setValue('hero')}>Hero</Chip>
<Chip href="/inspirations" selected>Inspirations</Chip>
<Chip trailingIcon={<X />} aria-label="Remove React" onClick={remove}>React</Chip>
```

A roomier pill than `Badge`, for a tag, a status or a filter (the New and age pair on a card). Options: `variant="filled" | "outline"`, `size="sm" | "md" | "lg"` (heights 22, 26 and 32 px on the `text-2xs`, `text-xs` and `text-sm` steps), `uppercase`, `shimmer`, `leadingIcon` / `trailingIcon`, `selected`, `disabled` (a disabled link chip is `aria-disabled`, leaves the tab order and does not navigate), `render`. It is a `<span>` until it can be used: `href` makes it a link, a click handler or `selected` makes it a `<button type="button">`. `selected` is a toggle (`aria-pressed`, the inverse colors while true; pass `false` for "off"); on a link it is the current page (`aria-current="page"`). `filled` sits on the solid `--accent`, one step above a card, so it reads on the page and on a card; `outline` is a 15% `--foreground` border. `shimmer` sweeps a band lighter than the label across it with GSAP (`motionTokens.shimmer`, 2 s; the same shimmer as a rotating search hint) and is off under reduced motion; the gradient only exists while it runs. `ChipGroup` puts chips side by side with no gap. Stable slots: `chip`, `chip-label`, `chip-icon`, `chip-group`.

## Avatar

```tsx
import { Avatar, AvatarGroup } from '@/components/ui/avatar';

<Avatar src="/elena.jpg" name="Elena Voss" size="lg" status="online" />

<AvatarGroup aria-label="Team" max={3} size="sm" className="[--avatar-ring:var(--card)]">
  {team.map(person => <Avatar key={person.id} src={person.photo} name={person.name} />)}
</AvatarGroup>
```

A person or a team as an image with initials behind it, in the signature shape: a 999px radius with the superellipse corner, so a round avatar is a soft squircle like the buttons (`shape="square"` is a squarer one with the same corner). Behavior is Base UI's Avatar: the picture preloads, and the initials show while it loads or when it fails (or when there is no `src`); `fallbackDelay` keeps a fast image from flashing them. `name` gives the initials ("Elena Voss" is "EV") and, without `alt`, the accessible name; `fallback` replaces the initials with anything, and with neither a person icon shows. Give an avatar an `alt` or a `name` and it is one image with that name; give it neither and it is decorative and hidden from assistive technology. Options: `size="xs" | "sm" | "md" | "lg" | "xl" | "2xl"` (24, 32, 40, 48, 64 and 96 px on the standard type scale), `shape`, `status="online" | "busy" | "away" | "offline"` (a dot on the lower corner, with its meaning in the accessible name; `statusLabel` translates it) and `imageProps` for the `<img>`. The dot sits in a ring in the surface color, `--avatar-ring`, which defaults to `--background`: set it where the avatar sits on a card (`[--avatar-ring:var(--card)]`).

`AvatarGroup` overlaps its avatars in a row, each in the same ring, and lifts the hovered one (no lift under reduced motion). `size` and `shape` apply to every avatar that does not set its own; `max` shows that many and a "+N" count for the rest, named "and N more" for assistive technology (`countLabel` translates it). It is a `role="group"`: give it an `aria-label`. Stable slots: `avatar`, `avatar-surface`, `avatar-image`, `avatar-fallback`, `avatar-status`, `avatar-group`, `avatar-group-count`.

## Card

```tsx
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardMedia, CardTitle } from '@/components/ui/card';

<Card>
  <CardMedia className="aspect-video"><img src="/cover.jpg" alt="" /></CardMedia>
  <CardHeader>
    <CardTitle>Team plan</CardTitle>
    <CardDescription>For small teams</CardDescription>
    <CardAction><Badge variant="brand">New</Badge></CardAction>
  </CardHeader>
  <CardContent>Up to ten seats, with shared libraries.</CardContent>
  <CardFooter><Button size="sm">Choose plan</Button></CardFooter>
</Card>

<Card render={<a href="/pricing" />}>…</Card>
```

A surface for grouped content in the signature shape: the superellipse corner rounds a card more softly than a plain radius of the same size. `variant="filled"` (default) sits on `--card`; `outline` is a border with no fill. `size="xs" | "sm" | "md" | "lg"` sets the padding, the gap between parts and the radius (16, 20, 28 and 36 px; the padding is 12, 16, 24 and 32 px) through `--card-padding`, `--card-gap` and `--card-radius`. A card is a `<div>`. Pass `render` to make the whole card a link or a button (`render={<a href="/pricing" />}`): it then gets hover, press and focus styles (`data-interactive`, or force it with `interactive`), and `disabled` dims it, sets `aria-disabled`, takes it out of the tab order and cancels the click, so a disabled link card does not navigate. `CardHeader` is a grid with a `CardTitle` (a `<h3>`: pass `render={<h2 />}` to match your outline), a `CardDescription` and an optional `CardAction` in the top-right corner. `CardMedia` is an image, video or any block that fills its box: inset in its own rounded box by default (size it with `aspect-video` or a height), or `bleed` to run it to the card's edges, where the card's own clip gives it the card's corners (to the top edge when it is the first part, to the bottom when it is the last). Every part takes `render` and `className`. Stable slots: `card`, `card-header`, `card-title`, `card-description`, `card-action`, `card-content`, `card-footer`, `card-media`.

## Announcement

```tsx
import { Announcement } from '@/components/ui/announcement';

<Announcement
  icon={<SparklesIcon />}
  title="What's new in v2"
  description="Charts, a command menu and a brand-new data table."
  actionLabel="See the changelog"
  actionRender={<Link href="/changelog" />}
  dismissible
/>
```

A compact card for a sidebar footer or a corner of the page, in the signature shape (it is a `Card`, so the superellipse corner and the card colors come with it). Every part shows when its prop is given, so a card can be a title and an action, or a title and a description that can be closed: `media`, `icon` (a soft disc at the top left, hidden from assistive technology), `title`, `description`, an action and `dismissible`. `media` is an image or a video across the top of the card, bleeding to its edges so the card's corners round it: pass the element itself (`<img alt="" />`, or `<video muted loop playsInline autoPlay />`), which fills a 16:9 box unless `mediaClassName` sets another ratio (`aspect-[2/1]`). A video that autoplays should stay still under reduced motion (read `useReducedMotion()` and leave `autoPlay` off), and over a picture the close button turns into a secondary button so it stays visible. The action is a full-width secondary button: give it `actionLabel` and `onAction`, make it a link with `actionHref` or a framework link with `actionRender`, or replace it with anything through `action`. `size="sm"` is the tight 12 px card and `md` (default) the 16 px one; `variant="filled" | "outline"` is the card's. A card with a title is a region named by it; give one that appears while the person is using the page `role="status"` so a screen reader announces it. Dismissing collapses the card, so what sits below it glides up (GSAP, 300 ms) and then it leaves the tree; opening it again opens it up from nothing; the first render never animates. Under reduced motion it appears and goes at once. `dismissLabel` names the close button ("Dismiss"). Control it with `open` and `onOpenChange`, or let it manage itself with `defaultOpen`; remember a dismissal yourself (the card does not touch storage). Stable slots: `announcement`, `announcement-media`, `announcement-icon`, `announcement-text`, `announcement-title`, `announcement-description`, `announcement-action`, `announcement-dismiss`.

## Action card

```tsx
import { ActionCard, ActionCardMedia } from '@/components/ui/action-card';
import { ActionCardMenu } from '@/components/ui/action-card-menu';

<ActionCard href="/inspirations/new" preview={<Sparkles />} active>New</ActionCard>
<ActionCard preview={<ActionCardMedia src="/filters/hero.mp4" />} onClick={pick}>Hero</ActionCard>
<ActionCard render={<Link href="/inspirations/hero" />} preview={<ActionCardMedia src="/filters/hero.png" />}>Hero</ActionCard>

<ActionCardMenu
  title="Sort by"
  icon={<ListFilter />}
  value={sort}
  onValueChange={setSort}
  options={[{ value: 'new', label: 'New' }, { value: 'popular', label: 'Popular' }]}
/>
```

A small card (116 × 128 px; `--action-card-width` and `--action-card-height` change it) that is one action: a white preview tile and a one-line label under it, on the muted surface. It takes the accent on hover and a ring while it is `active`, and it moves on a spring (GSAP, `motionTokens.spring`: stiffness 300, mass 0.8, with about 18% overshoot): it grows 4% under a mouse, sinks to 95% under a press and springs back on release, and pops (a dip to 90%, then the spring) when it becomes `active` or, right after a press on it, stops being so; a card that another card deactivates stays still. Touch gets the press and the pop but no hover growth. Reduced motion (the system, a `MotionProvider` or `reduceMotion`) and `disabled` turn the spring off, leaving the color transitions. Leave about 8 px of room around a row of cards, since a card grows past its box. With `href` or `render` it is a link and `active` sets `aria-current="page"`; without them it is a `<button type="button">`, and passing `active` (`true` or `false`) makes it a toggle with `aria-pressed`, so a row of cards works as a filter; leave `active` out for a card that is only an action. `disabled` on a link drops its `href`, sets `aria-disabled` and cancels the click, so a router link passed through `render` does not navigate either. The label is truncated to one line and names the card; the preview is decorative (`aria-hidden`). `ActionCardMedia` puts an image or a video in the tile (a video is chosen by the file extension or `type="video"`; it is muted, loops, plays inline and stays paused under reduced motion). Stable slots: `action-card`, `action-card-preview`, `action-card-label`, `action-card-media`.

`ActionCardMenu` (`@morphin/action-card-menu`, built on the dropdown) turns the card into a menu where it stands. Its popup is placed over the card; GSAP clips the surface to the card and grows it on a gentle curve, the card's tile and label are gone by the time the rows arrive, the title and icon travel into the menu's header (the icon slides sideways first, so it passes beside the title), and the rows rise one after another with the checked row's highlight (`motionTokens.morph`, about 0.5 s). Closing runs it back into the card, which shows again before focus returns to it. Options are `{ value, label, leadingIcon?, disabled? }`; the card shows the chosen label and is named "Title: label". Pass `preview` (for example `ActionCardMedia`) instead of the default title and icon tile; then the surface and the rows animate and the words do not travel. It takes `value` / `defaultValue` / `onValueChange`, `open` / `defaultOpen` / `onOpenChange`, `modal` (non-modal by default, like `Dropdown`), `portalProps`, `reduceMotion` and `contentClassName`. Reduced motion opens and closes at once. Stable slots: `action-card-menu-trigger`, `action-card-menu`, `action-card-menu-header`.

## Toast

```tsx
import { toast, Toaster } from '@/components/ui/toast';

// Once, near the root of the app:
<Toaster position="bottom-right" />

// Anywhere, including outside React:
toast({ title: 'Saved', description: 'Your changes are in.' });
toast.error('Something went wrong');

// One toast that changes in place:
const id = toast.loading({ title: 'Waiting for transaction', description: 'Ready to process the deposit.' });
toast.update(id, { title: 'Transaction in progress…' });
toast.update(id, { state: 'success', title: 'Transaction completed', description: 'The deposit was credited.' });

// Or follow a promise:
toast.promise(exportReport(), {
  loading: 'Exporting…',
  success: file => ({ title: 'Report ready', description: file.name }),
  error: error => ({ title: 'Export failed', description: String(error) }),
});
```

Notifications on [Base UI Toast](https://base-ui.com/react/components/toast): a stack that peeks out behind the newest toast and spreads out when you hover or focus it, swipe to dismiss, timers that pause while the stack is hovered or focused, and live-region announcements (errors are announced urgently). The manager is shared, so `toast()` works from anywhere and every `Toaster` shows the same toasts.

States are `default`, `loading`, `success` and `error`. A `loading` toast stays until it changes; the others close after the Toaster's `timeout` (5000 ms, or per toast with `timeout`, where `0` keeps it open).

The motion follows Morphin's motion scale (`motionTokens`), all with GSAP:

- **Appear, stack, leave.** A new toast rises in with a fade, a cross-blur and a slight scale (350 ms) while the toasts behind it glide up on the same curve. They dim and soften one step per depth, and sharpen when the stack spreads out on hover or focus (the spread, and a swipe away, ease too). Closing drops the toast back the same way on a faster clock (250 ms).
- **Pending.** A ring spinner in a neutral badge, a shimmer sweeping across the title, and the border beam.
- **Success and failure.** Free swaps the badge color and the icon with a quick fade. **Max** (`toast-pro`, see [Max](#max)) plays the full story: when a toast **changes** to `success` or `error`, the spinner gives way as the badge fills with the state color and swells, then settles with a bounce while the check (or the cross, stroke by stroke) draws itself. A soft pulse of that color spreads from the badge across the card over about two seconds, nudging each word outward as it passes like light through a lens, while the card's whole outline swells with the color and fades slowly (on light surfaces the colors are the softer `success-soft` and `destructive-soft` tokens); a failure also shakes the toast. The beats are tuned in `proToastMotion`. The pulse animates only transform and opacity, so it stays on the compositor.
- **Text.** With Max, only the words that changed cross-blur; the words both texts share stay put ("Deposit processing…" to "Deposit completed" keeps "Deposit"). When the text takes more or fewer lines, the toast eases to its new height.

A toast created already settled shows no state effect, and reduced motion plays none of it. `Toaster` takes `effects`: the free default is a plain swap; pass `proToastEffects` from `toast-pro` for the animated one. Pass a module-level constant, since the effects are hooks.

`toast(input)` takes a title string or `{ title, description, state, icon, beam, timeout, onClose }` and returns an id. Also `toast.loading`, `.success`, `.error`, `.update(id, input)`, `.dismiss(id?)` and `.promise(promise, { loading, success, error })` (`success` and `error` can be functions of the result). `icon` replaces the bell in the circle at the start of the toast.

A `loading` toast also gets a **border beam**: a beam of light that travels around its border while it waits and fades out when it settles. Ask for it on any toast with `beam: true`, or turn it off with `beam: false`; `Toaster`'s `beamColor` picks the palette (`colorful`, `mono`, `ocean`, `sunset`, `forest`, `candy`, `ice`, `gold`). It follows the theme of the container the toasts render in, and reduced motion turns it off. The beam comes from the MIT-licensed [border-beam](https://github.com/Jakubantalik/Libraries.dev/tree/main/packages/border-beam) package by Jakub Antalik, which `@morphin/toast` installs as a dependency.

`Toaster` accepts `position` (`bottom-right`, `bottom-left`, `bottom-center`), `limit` (3; older toasts wait out of sight), `timeout`, `beamColor`, `reduceMotion`, `closeLabel` (the close button's accessible name, "Dismiss notification" by default; translate it here), `className` and `portalProps` (for example `{ container }` to render inside a themed region; the element must exist when the `Toaster` mounts). Stable slots use the `toast-*` prefix. The close button is hidden from assistive technology until the stack is expanded or focused, as Base UI intends; reach it with F6.

## Checkbox

```tsx
import { Checkbox, CheckboxGroup } from '@/components/ui/checkbox';

<Checkbox label="Email me updates" description="One message a week." name="updates" />

<CheckboxGroup legend="Notify me" value={value} onValueChange={setValue}>
  <Checkbox value="email" label="Email" />
  <Checkbox value="sms" label="SMS" />
</CheckboxGroup>

<CheckboxGroup legend="Fruit" allValues={['apple', 'pear']}>
  <Checkbox parent label="All fruit" />
  <Checkbox value="apple" label="Apple" />
  <Checkbox value="pear" label="Pear" />
</CheckboxGroup>
```

A box that fills, then draws its tick, in the signature shape: a rounded square with the superellipse corner (`--corner-shape`). The fill is the solid field color with the input border (the same as an input, so a form's controls match), and the primary color when checked. The box fills over 150 ms, then the tick draws itself by stroke-dashoffset over 350 ms; unchecking undraws it in 150 ms with no draw. It is pure CSS driven by Base UI's `data-checked` (no JavaScript), so it follows a controlled value, a form reset and a group alike, and a mid-draw uncheck reverses cleanly. Reduced motion (the system or a `MotionProvider`) removes the transitions and the press. Behavior is Base UI's Checkbox: Space toggles, `checked` / `defaultChecked` / `onCheckedChange`, `name` and `value` for forms (a hidden input submits it), `required`, `disabled`, `readOnly`, `inputRef`. `indeterminate` shows a dash and `aria-checked="mixed"`. Options: `size="sm" | "md"` (a 14 px box for dense tables and a 16 px one, the default), `label` and `description` (the box then sits inside a `<label>`, so the whole row is the click target, and the box is named and described by them), `labelPosition="start" | "end"`, `reduceMotion`. Without a `label`, give the box an `aria-label`.

`CheckboxCard` is a checkbox as a card, with a `title` and an optional `description`: the box, the text and a solid surface that is one big click target, lighter on hover and with the primary border when ticked. `CheckboxGroup` shares one value, the `value`s of the ticked checkboxes (`value`, `defaultValue`, `onValueChange`), and gives its checkboxes its `size`. `legend` is a visible group name (a fieldset legend), `orientation` lays the items out in a column or a row. Pass `allValues` and a checkbox with `parent` for a "select all": it ticks and unticks every box and shows a dash while only some are ticked. `CheckboxCard` takes the checkbox's props (no `label`). Stable slots: `checkbox`, `checkbox-indicator`, `checkbox-field`, `checkbox-content`, `checkbox-label`, `checkbox-description`, `checkbox-group`, `checkbox-group-legend`, `checkbox-group-items`.

## Radio

```tsx
import { Radio, RadioGroup } from '@/components/ui/radio';

<RadioGroup legend="Plan" value={plan} onValueChange={setPlan}>
  <Radio value="free" label="Free" description="For trying things out." />
  <Radio value="pro" label="Pro" />
  <Radio value="max" label="Max" disabled />
</RadioGroup>
```

A round choice that fills and shows a dot, in the signature shape (a 999px radius with the superellipse corner, like the avatars and buttons), with the checkbox's colors and sizes (a 16 px circle, or a 14 px one with `size="sm"`). The dot scales in from half its size as it fades in, over 150 ms on the same ease; it is CSS driven by `data-checked`, and reduced motion removes it. Behavior is Base UI's RadioGroup: exactly one choice, arrow keys move the choice (the group is one Tab stop), `value` / `defaultValue` / `onValueChange` on the group, `name` for forms, `disabled`, `readOnly` and `required` on the group or on a single radio. `RadioGroup` takes `legend` (a visible fieldset legend that names the radio group; without one, give it an `aria-label`), `orientation` and `size`, which its radios inherit. A `Radio` takes `value`, `label`, `description`, `labelPosition`, `size` and `reduceMotion`. `RadioCard` is the radio as a card (`title`, `description`): a surface that is one big click target, lighter on hover and with the primary border when chosen; put cards in a `RadioGroup`. `RadioDot` is the bare circle and dot (`selected`, `size`, `reduceMotion`), with no behavior, for a menu row that is itself the choice (a dropdown item that manages the selection), where a nested focusable radio would be invalid; it is hidden from assistive technology, and the row carries the state. Stable slots: `radio`, `radio-indicator`, `radio-dot`, `radio-dot-glyph`, `radio-field`, `radio-content`, `radio-label`, `radio-description`, `radio-group`, `radio-group-legend`, `radio-group-items`.

## Switch

```tsx
import { Switch, SwitchGroup } from '@/components/ui/switch';

<Switch label="Email notifications" description="Get a message when someone mentions you." defaultChecked />
<Switch aria-label="Dark mode" size="lg" checkedIcon={<Moon />} uncheckedIcon={<Sun />} />
<Switch name="beta" label="Beta features" checked={beta} onCheckedChange={setBeta} />

<SwitchGroup legend="Notifications">
  <Switch label="Comments" />
  <Switch label="Mentions" />
</SwitchGroup>
```

[Base UI Switch](https://base-ui.com/react/components/switch) with Morphin's shape. Sizes are `sm`, `md` (default) and `lg`. `label` and `description` wrap the track in a `<label>`, so the whole row toggles; the label names the switch and the description is linked through `aria-describedby`. `labelPosition="start"` puts the text before the track. `checkedIcon` / `uncheckedIcon` are decorative thumb icons. Every Base UI prop works: `checked` / `defaultChecked` / `onCheckedChange`, `disabled`, `readOnly`, `required`, and `name` / `value` / `uncheckedValue` for forms. Inside a `Field`, `FieldLabel` names it as usual. `SwitchGroup` is a fieldset with an optional `legend` and `orientation="vertical" | "horizontal"`. `className` goes on the label row when there is text, otherwise on the track. Stable slots: `switch`, `switch-thumb`, `switch-icon`, `switch-field`, `switch-content`, `switch-label`, `switch-description`, `switch-group`.

The toggle bounces: the track color changes at once while the thumb travels for 350 ms on `cubic-bezier(0.34, 1.35, 0.64, 1)`, overshooting its rest by 1 px before it lands (`motionTokens.toggle`). Thumb icons swap in one grid cell (250 ms, scale 0.25, 2 px blur). Nothing animates on mount; a toggle in mid-flight reverses from where the thumb is drawn; reduced motion and `reduceMotion` move the thumb straight to its rest.

## Slider

```tsx
import { Slider } from '@/components/ui/slider';

<Slider label="Volume" defaultValue={30} />
<Slider
  label="Price"
  defaultValue={[200, 750]}
  max={1000}
  format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
  getThumbLabel={index => (index === 0 ? 'Minimum price' : 'Maximum price')}
/>
<Slider label="Temperature" defaultValue={21} step={0.5} showValue={(_, [value]) => `${value} °C`} />
<Slider aria-label="Bass" orientation="vertical" className="h-40" defaultValue={40} />
```

[Base UI Slider](https://base-ui.com/react/components/slider) with a label and live value on top, then the track, fill and thumbs. An array value renders one thumb per value. `format` takes `Intl.NumberFormat` options (with `locale`); `showValue` defaults to on when there is a `label`, and a function renders the output from the formatted and raw values. Sizes are `sm` (14 px track), `md` (20 px, default) and `lg` (28 px). The look is a thick pill track with a fill of the same color and a pill thumb: a primary pill holding a lighter one, which shrinks to 0.9 (150 ms) while the thumb is dragged. Thumbs stay inside the track (`thumbAlignment="edge"` by default); reduced motion keeps them still. The value is plain tabular text that changes at once: while a thumb is dragged it must read at a glance, so it never animates. Custom `SliderValue` children that are not a string or number are rendered as is. The whole slider dims when disabled. Every Base UI prop works: `value` / `onValueChange` / `onValueCommitted`, `min`, `max`, `step`, `largeStep`, `minStepsBetweenValues`, `orientation`, `disabled`, `name`. Pass `children` to compose `SliderLabel`, `SliderValue`, `SliderControl`, `SliderTrack`, `SliderIndicator` and `SliderThumb` yourself. Stable slots: `slider`, `slider-header`, `slider-label`, `slider-value`, `slider-control`, `slider-track`, `slider-indicator`, `slider-thumb`.

## Max

Free components are MIT and public. Max adds extra polish on top of them (Components Max) and page templates, delivered the same way (the source is copied into your project and you own it) but through the `morphinui` CLI, from a private registry. Max comes with the Lifetime plan on [morphin.dev](https://morphin.dev/pricing), together with everything in PRO. The items keep their original registry names (`toast-pro`), so existing install commands keep working.

| Item | Adds to | What it does |
| --- | --- | --- |
| `toast-pro` | `@morphin/toast` | The success and error story: badge swell, drawn check or cross, a pulse wave that nudges the words, an edge glow, a shake on failure and a word-level text morph |
| `split-bar-pro` | `chart-pro` | One bar that adds up to 100%: pointing at a segment widens it and shows its numbers, the legend switches segments off and the rest stretch to fill the bar, small segments are labelled beneath on thin lines |

```bash
npx morphinui@latest login      # signs in with your morphin.dev account in the browser
npx morphinui@latest add toast-pro
```

```tsx
import { Toaster } from '@/components/ui/toast';
import { proToastEffects } from '@/components/ui/toast-pro';

<Toaster effects={proToastEffects} />
```

`login` signs in through the browser and saves a token in `~/.morphinui/config.json`. The CLI adds a `@morphin-pro` registry to `components.json` whose header reads the token from `MORPHIN_TOKEN`, so the token is never written into your project; set that variable in CI (or in `.env.local`, never in a committed `.env`). With the plain shadcn CLI, add the registry yourself:

```json
{
  "registries": {
    "@morphin-pro": {
      "url": "https://morphin.dev/components/max/{name}.json",
      "headers": { "Authorization": "Bearer ${MORPHIN_TOKEN}" }
    }
  }
}
```

then `MORPHIN_TOKEN=… npx shadcn@latest add @morphin-pro/toast-pro`. Without Max the toast keeps working: it just swaps the icon and the color.

## Modal

```tsx
import { Button } from '@/components/ui/button';
import {
  Modal, ModalBody, ModalClose, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle, ModalTrigger,
} from '@/components/ui/modal';

<Modal>
  <ModalTrigger>Open modal</ModalTrigger>
  <ModalContent size="sm">
    <ModalHeader>
      <ModalTitle>Invite your team</ModalTitle>
      <ModalDescription>Collaborators can edit, comment and share.</ModalDescription>
    </ModalHeader>
    <ModalBody>…</ModalBody>
    <ModalFooter>
      <ModalClose>Cancel</ModalClose>
      <ModalClose render={<Button />}>Send invites</ModalClose>
    </ModalFooter>
  </ModalContent>
</Modal>
```

[Base UI Dialog](https://base-ui.com/react/components/dialog) on the Morphin surface. It is modal by default: focus is trapped, the page does not scroll, and Escape, the corner close button or a backdrop press close it, returning focus to the trigger. `ModalContent` includes the portal, backdrop and centering layer, and takes `size` (`xs`, `sm`, `md`, `lg`, `cover`, `full`), `placement` (`center`, `top`, `bottom`), `backdrop` (`opaque`, `blur`, `transparent`) and `scroll` (`inside` keeps the popup on screen and scrolls `ModalBody`; `outside` lets the popup grow and the page layer scroll). `showCloseButton={false}` removes the corner button, `disablePointerDismissal` on `Modal` ignores backdrop presses, and `render` turns the popup into another element, e.g. a `<form>`. `ModalClose` renders an outline button; pass `render={<Button />}` for another look. Every Base UI root prop works: `open` / `onOpenChange`, `defaultOpen`, `modal`, `actionsRef`, `handle`. Pass `role="alertdialog"` for destructive confirmations. The title names the dialog and the description describes it.

The popup scales up from 0.96 and fades in over 250 ms, then leaves faster (150 ms) on the same smooth-out curve; the backdrop fades on the same timing. Base UI keeps the popup mounted until those CSS transitions end. Reduced motion removes them.

## Tabs

```tsx
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';

<Tabs defaultValue="overview">
  <TabsList aria-label="Project">
    <TabsTab value="overview">Overview</TabsTab>
    <TabsTab value="analytics">Analytics</TabsTab>
    <TabsTab value="reports">Reports</TabsTab>
  </TabsList>
  <TabsPanel value="overview">A summary of the project.</TabsPanel>
  <TabsPanel value="analytics">Traffic and conversions.</TabsPanel>
  <TabsPanel value="reports">Scheduled exports.</TabsPanel>
</Tabs>
```

[Base UI Tabs](https://base-ui.com/react/components/tabs) on the Morphin surface. Arrow keys move focus; Enter or Space selects (Base UI's default). `variant` is `primary` (a filled pill on a soft bar, default) or `secondary` (a 2 px line along the rule). `size` is `xs` (24 px, on the `text-2xs` step, in a bar with 2 px padding: for compact controls in toolbars and menus), `sm`, `md` (default) or `lg`. `align` is `start`, `center` (default) or `end`, useful for a vertical sidebar. `orientation="vertical"` stacks the tabs; arrows then move up and down.

The indicator slides and resizes over 250 ms on a smooth ease-out (`cubic-bezier(0.22,1,0.36,1)`). A new panel fades in over 150 ms. Reduced motion removes both. A list wider than its parent scrolls inside the bar; chevrons appear at the hidden ends, over fades that keep the bar's round ends, so labels dissolve before they reach a chevron. `TabsList` can hide the indicator with `indicator={false}`.

When the tabs no longer fit, the list scrolls. Chevrons and a fade appear on the hidden side, and the active tab stays in view. `overflow={false}` on `TabsList` turns that chrome off. Sit `TabsSeparator` between tabs for a thin rule. Pass `render` on a tab (with `nativeButton={false}`) to use a link. Every Base UI root prop works: `value` / `onValueChange`, `defaultValue`, `orientation`. Stable slots: `tabs`, `tabs-scroller`, `tabs-list`, `tabs-tab`, `tabs-indicator`, `tabs-panel`, `tabs-separator`, `tabs-scroll`, `tabs-fade`.

## Accordion

```tsx
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from '@/components/ui/accordion';

<Accordion defaultValue={['shipping']}>
  <AccordionItem value="shipping">
    <AccordionTrigger>Shipping</AccordionTrigger>
    <AccordionPanel>Orders ship within two days.</AccordionPanel>
  </AccordionItem>
  <AccordionItem value="returns">
    <AccordionTrigger>Returns</AccordionTrigger>
    <AccordionPanel>Free returns for 30 days.</AccordionPanel>
  </AccordionItem>
</Accordion>
```

[Base UI Accordion](https://base-ui.com/react/components/accordion) with the Morphin look. One panel opens at a time; `multiple` lets several stay open. `value` / `defaultValue` are arrays of item values, `onValueChange` gets the new array; `disabled`, `hiddenUntilFound` (find-in-page opens a panel) and `keepMounted` work on the root, and `disabled` on an item. `variant` is `ghost` (rows divided by hairlines, default) or `card` (each item a solid surface in the signature shape, with a gap; a closed card lightens on hover and the whole card takes the focus ring). `size` is `sm` or `md` (default). Both reach every item through context. Each trigger is a heading (`h3`; `headerProps={{ render: <h2 /> }}` changes it) holding a button: Tab moves between triggers, Enter or Space toggles. The lucide chevron at the end (`data-icon="inline-end"`) turns over as the panel opens; `icon` replaces it and `icon={null}` removes it. The panel eases its height from Base UI's `--accordion-panel-height` (250 ms open, 200 ms close, `cubic-bezier(0.22,1,0.36,1)`) while the content fades in from a 2 px blur; reduced motion (system, `MotionProvider` or `reduceMotion`) opens and closes at once. `className` on `AccordionPanel` styles the content (where the padding lives); `panelClassName` styles the animated panel, which must stay unpadded. Stable slots: `accordion`, `accordion-item`, `accordion-header`, `accordion-trigger`, `accordion-label`, `accordion-panel`, `accordion-content`.

## Calendar

```tsx
import { Calendar, type DateRange } from '@/components/ui/calendar';

<Calendar mode="single" selected={date} onSelect={setDate} />

<Calendar mode="range" numberOfMonths={2} selected={range} onSelect={setRange} disabled={{ before: new Date() }} />
```

A month grid on [react-day-picker](https://daypicker.dev) (v10) with the Morphin look; every DayPicker prop passes through: `mode` (`single`, `multiple`, `range`), `selected` / `onSelect`, `required`, `min` / `max`, `disabled` and `hidden` matchers, `defaultMonth` / `month` / `onMonthChange`, `startMonth` / `endMonth`, `numberOfMonths`, `captionLayout="dropdown"` (native month and year menus), `locale` (a date-fns locale from `react-day-picker/locale`), `weekStartsOn`, `showWeekNumber`, `footer`. Outside days show by default, muted. Days are circles in the signature shape; the chosen day's primary fill scales in from 0.75 as it fades in (200 ms), hover lights a day on `--accent`, today has a small dot in the text color, disabled days take `--disabled-foreground`, and a range joins its ends with an `--accent` band that rounds where a week row breaks. Month navigation uses ghost `IconButton`s with lucide chevrons. `size` is `sm` (32 px days) or `md` (36 px, default). `classNames` adds classes to any part (merged with the defaults), `components` replaces one.

When the month changes (arrows, keyboard, a controlled `month`), each month slides 8 px in the direction of travel and cross-blurs: an inert, `aria-hidden` copy of the old month leaves while the new caption and weeks arrive, over 250 ms on `cubic-bezier(0.22,1,0.36,1)` with GSAP. It never plays on the first render, reverts its inline styles and removes the copy on settle, interruption and unmount, and is off under reduced motion (the system, a `MotionProvider` or `reduceMotion`). DayPicker's own `animate` is not used. Keyboard: the grid is one Tab stop (the chosen day or today); arrows move by day and week, Page Up / Page Down by month (Shift: year), Home / End to the week's ends. `ref` targets the root. Stable slots: `calendar`, `calendar-months`, `calendar-month`, `calendar-caption`, `calendar-nav`, `calendar-nav-button`, `calendar-grid`, `calendar-weekdays`, `calendar-weeks`, `calendar-week`, `calendar-day`, `calendar-day-button`, `calendar-footer`; a day cell also carries `data-range-start`, `data-range-middle` and `data-range-end`.

## Date picker

```tsx
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldLabel } from '@/components/ui/field';

<Field>
  <FieldLabel>Due date</FieldLabel>
  <DatePicker name="due" value={date} onValueChange={setDate} />
</Field>

<DatePicker mode="range" aria-label="Stay" calendarProps={{ numberOfMonths: 2, disabled: { before: new Date() } }} />
```

A field-like button that opens a `Calendar` in a [Base UI Popover](https://base-ui.com/react/components/popover). The trigger is the outline select trigger (`--field` fill, `--field-border`, `size="xs" | "sm" | "md" | "lg"`, `variant`, `fullWidth`, `aria-invalid`, `disabled`) with a lucide `CalendarDays` icon and the date, or a muted `placeholder`. The popup reuses the dropdown surface and its enter and exit motion. Opening moves focus to the chosen day (or today); choosing a day closes the popover and returns focus to the button. `mode="range"` takes `{ from, to }`, starts a new range on each open (`resetOnSelect`) and closes once both ends are chosen; the button shows `formatRange` ("Oct 30 – Nov 2, 2026").

`value` / `defaultValue` / `onValueChange` (`Date`, or a `DateRange` in range mode; `null` keeps a controlled picker empty), `format` (`Intl.DateTimeFormat` options, default `{ dateStyle: 'medium' }`), `locale` (a BCP 47 tag for the button's text, or a date-fns locale that also localizes the calendar; default `en-US`), `name` (a hidden input submits `yyyy-mm-dd`, or `yyyy-mm-dd/yyyy-mm-dd` for a range; `toISODate` is exported), `open` / `defaultOpen` / `onOpenChange`, `calendarProps` (any calendar prop except the selection: `disabled`, `startMonth`, `endMonth`, `numberOfMonths`, `weekStartsOn`, `captionLayout`, `size`…), `dialogLabel`, `portalProps` (`container` for a themed region), `positionerProps`, `reduceMotion`. Inside a Base UI `Field`, the `FieldLabel` points at the button and names it together with the date ("Due date Oct 23, 2026"), and descriptions and errors describe it; outside one, give it an `aria-label`, which is also read with the date. `ref` targets the button. Stable slots: `date-picker-trigger`, `date-picker-icon`, `date-picker-value`, `date-picker-positioner`, `date-picker-content`.

## Spinner

```tsx
import { Ring } from 'loading-dev';
import { Spinner } from '@/components/ui/spinner';

<Spinner />
<Spinner label="Loading projects" size="lg" />
<Spinner loader={Ring} size={14} className="text-muted-foreground" />
```

A [loading-dev](https://github.com/jakubkrehel/loading) spinner, Atom by default; `loader` takes any of its 29 spinners (`SPINNERS` from `loading-dev` lists them all). It inherits the text color. `size` is `xs` 12, `sm` 16, `md` 20 (default), `lg` 24, `xl` 32 px or a number; `duration` sets one cycle in milliseconds. With `label` it is a `role="status"` with that text for assistive technology; without one it is decorative, for when nearby text already says what is loading. It pauses under the reduced-motion policy and with `reduceMotion`. It renders a `<span>` through Base UI's `useRender`; `render` swaps the element (`render={<div />}`).

## Skeleton

```tsx
import { Skeleton, SkeletonReveal } from '@/components/ui/skeleton';

{data ? <Profile data={data} /> : <Skeleton lines={3} />}

<SkeletonReveal loading={!data}>
  {data ? <Profile data={data} /> : <Skeleton lines={3} />}
</SkeletonReveal>
```

A skeleton drawn in glyphs, and the hand-over to the real content. `Skeleton`'s glyphs are plain markup and CSS: they paint on the first frame, render on the server and reserve the space your content will take (patterns are deterministic, so server and client match). Faint glyph rows carry a band of denser glyphs that sweeps across them; the sweep is drawn on one small canvas per skeleton after mount (much cheaper than animating the markup), pauses off screen and stops under reduced motion. Options: `variant="dither" | "scan" | "braille" | "terminal"` (shaded blocks, decode glyphs, fine dots, 0s and 1s), `lines` and `widths` for a paragraph, `rows` with `width`, `height` and `circle` for an image or an avatar, `seed` so neighbors differ, `animate={false}` for a still pattern (long lists), `as`. It is hidden from assistive technology, so mark the region yourself (`aria-busy`, or a `role="status"` label).

`SkeletonReveal` wraps the content and follows `loading`. While it is `true` the skeleton is left alone; when it turns `false` the content that replaced it decodes into place through a character grid in about 400 ms. The content stays in the DOM in its real place (no layout shift) and screen readers read it the whole time. Options: `preset` (`decode`, `dither`, `terminal`, `blueprint`), `duration` (`fast` for data, `cinematic` for heroes), `speed`, `origin` (where the wave starts), `selector`, `mascot` (an ASCII mascot instead of the shimmer when there is no skeleton), `revealOnMount` (default `false`: the reveal follows `loading`), `lazy`, `onRevealComplete`. A ref gives `reveal()` and `hide()` to replay it from code. Mark cards `data-ascii="surface"`, buttons and chips `data-ascii="fade"`, and anything that must stay put `data-ascii="skip"`. The glyphs take `--muted-foreground` and the accent `--foreground`; set `--ascii-skeleton`, `--ascii-accent` or `--ascii-font` to change them. Under reduced motion (the system or a `MotionProvider`) the sweep stops and content appears at once.

The effect is [ascii-reveal](https://github.com/quanhoangindex/ascii-reveal) by Quan Hoang (MIT), added as a dependency and not copied. The item installs it from npm (`ascii-reveal@^0.3.0`). Stable slots: `skeleton`, `skeleton-reveal`.

## Motion and accessibility

Text and icon changes animate automatically: old text exits upward while the new text enters from below with a 4 px shift and 2 px blur (150 ms); icons cross-fade with scale and 2 px blur (250 ms). An inert, aria-hidden copy retains the outgoing state until the transition finishes. Content that is replaced fades where it was drawn, so a label a spinner pushes aside never runs into the shrinking edge. Changes in content width ease over 240 ms, clipped only while the width changes; the content grows from its start edge, everything that stays (an unchanged icon, a label pushed aside by a spinner) glides to its new place on the same curve, and text that changes the width fades on that curve too (180 ms), so it clears the moving edge in time. Initial rendering and unchanged content stay still. Rapid updates replace the previous animation, while the accessible label always reflects the current content.

The default policy follows live `prefers-reduced-motion` changes. In reduced mode, content updates immediately, press scaling is disabled and the loading indicator stays static. Use the shared provider to reduce motion throughout a subtree:

```tsx
import { MotionProvider } from '@/lib/motion';

<MotionProvider reducedMotion="always">
  <Button>Save changes</Button>
</MotionProvider>
```

`MotionProvider` accepts `system` (default) or `always`. A local setting never re-enables animations against the operating system or an outer provider's reduction. New components use `useReducedMotion()` and `motionTokens` from `@/lib/motion`.

## Sound

```tsx
import { SoundProvider } from '@/lib/sound';
import { cuelumeSound, unlockSound } from '@/lib/sound-cuelume';

// Near the root; `soundOn` is the user's choice, kept by your app.
<SoundProvider player={cuelumeSound} enabled={soundOn}>
  <App />
</SoundProvider>

// In the setting that turns it on:
onCheckedChange={(next) => { setSoundOn(next); if (next) void unlockSound(); }}
```

Optional interface sounds. Every interactive component plays a cue for its job through `@morphin/sound`, which is silent and loads nothing until a `SoundProvider` turns it on; `npx shadcn add @morphin/sound-cuelume` adds the player, [Cuelume](https://github.com/danielwh2/cuelume) (MIT), whose fourteen cues are synthesized live with Web Audio, with no audio files. Keep sound a user setting, off by default, and never the only feedback. Call `unlockSound()` from the click that turns it on: some browsers only start audio inside a gesture, and a cue played later from code (a toast for a finished upload) would stay silent.

| Component | Cue |
| --- | --- |
| `Button`, `IconButton` | `tap`; Cuelume plays it as the `select` detent that tabs use, always subtle, in place of its glassy `tap`, or as the theme's own tap if you call `setSoundButtonTheme` |
| `ButtonLink`; `LinkButton`, `Chip`, `ActionCard` as links | `navigate` |
| `LinkButton`, `Chip`, `ActionCard` as buttons | `tap` |
| `Switch`, `Checkbox`, a checkbox menu item; `Chip`, `ActionCard`, `ButtonGroupItem` as toggles | `toggle`, played backwards when it turns off |
| `Radio`, `Tabs` (subtle), `Select`, menu items | `select`; radios and tabs play it backwards when the choice moves back |
| `Slider` | `select` (subtle), one tick per step |
| `Dropdown` and its submenus, `Select` | `select` when it opens (the same sound as picking an item), a quiet `close` when it closes |
| `DatePicker`, `Accordion` | `open` / `close` (subtle) |
| `Modal` | `open` / `close` |
| `Announcement` dismiss | `close` (subtle) |
| `Calendar` | `select` for a day, `navigate` between months |
| `Toast` | `success`, `error`, `loading`, or `ready` for a plain toast (subtle), as it appears or changes state; closing is silent |
| `Input`, `Textarea` | `type`, only with `typing`; Cuelume sounds it itself from `data-cuelume-type` on the field |

When one interaction raises several cues (a picked menu item also closes the menu, a trigger button also opens its dialog), only the most specific plays; a tap within 250 ms after a richer cue belongs to the same gesture and is dropped, and the same cue within 50 ms is dropped, so a dragged slider ticks instead of buzzing. A tap waits one frame before it plays, because a menu opens a frame after the press: on a quick click the open arrives in that frame and replaces it. Nothing plays on hover, for a value the app sets by itself, or for an overlay the app closes through `actionsRef`.

`SoundProvider` takes `player` (any `(cue, options) => void`, so your own sounds work too; a nested provider inherits it; a player can also carry `fieldProps`, attributes for the native field when it sounds typing from the DOM, as Cuelume does with `data-cuelume-type`: it presses on keydown, lets go on keyup, skips passwords and follows held deletes, and the field carries the attribute only while sound and `typing` are on), `enabled` (a nested `enabled={false}` silences a region) and `typing` (keystroke sounds in text fields, off by default). `setSoundTheme('default' | 'mech' | 'bubble' | 'press')` and `setSoundVolume(0–1)` tune Cuelume, and `setSoundButtonTheme('mech' | 'bubble')` gives button presses a material of their own (a dry shutter click or a playful knock) at the emphasis each button asks for; `undefined` goes back to the tabs' detent. A custom component plays a cue with `const play = useSound(); play('select', { emphasis: 'subtle' })` from its event handler.

## Develop

```sh
npm install
npm test                # component behavior
npm run build           # typecheck and registry JSON
npm run test:registry   # install the registry into fresh shadcn projects with the real CLI
npm run site:install    # install every component into the morphin.dev site (../cmllia/front by default)
```

The sources live in `registry/morphin/` and import each other through `@/registry/morphin/...`; the shadcn CLI rewrites those imports to the project's aliases. `registry.json` lists the items, and `npm run registry:build` writes one JSON file per item to `public/r/`. There is no preview app here: the components are shown on [morphin.dev/docs](https://morphin.dev/docs). `npm run site:install` installs this checkout into the site with the real shadcn CLI, so a change can be seen there before it is published.

`npm run test:registry` serves `public/r` locally and runs `shadcn add` in a copy of `tests/fixtures/registry-consumer` (a Vite project right after `shadcn init`). It checks the installed files and imports, the CSS variables, a type-check, a production build and server rendering, once with `@morphin/theme` and once on top of the default shadcn theme.

Contributions are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md). Architecture notes (in Russian): [docs/architecture.md](docs/architecture.md). Released under the [MIT license](LICENSE).

## Credits

- [Base UI](https://base-ui.com) for accessible behavior.
- [border-beam](https://github.com/Jakubantalik/Libraries.dev/tree/main/packages/border-beam) by Jakub Antalik (MIT) for the toast border beam. It is installed as an npm dependency, not copied.
- [GSAP](https://gsap.com) for animation and [loading-dev](https://www.npmjs.com/package/loading-dev) for spinners.
- [Cuelume](https://github.com/danielwh2/cuelume) by Daniel Belyi (MIT) for interface sounds. It is installed as an npm dependency by `@morphin/sound-cuelume`, not copied.
