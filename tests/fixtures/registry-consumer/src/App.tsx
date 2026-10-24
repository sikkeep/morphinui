import { useState } from 'react';
import { Button, IconButton } from '@/components/ui/button';
import {
  Dropdown, DropdownContent, DropdownGroup, DropdownItem, DropdownLabel,
  DropdownRadioGroup, DropdownRadioItem, DropdownSeparator, DropdownTrigger,
} from '@/components/ui/dropdown';
import { ButtonGroup, ButtonGroupItem } from '@/components/ui/button-group';
import { SplitButton, SplitButtonAction, SplitButtonMenu } from '@/components/ui/split-button';
import { LinkButton } from '@/components/ui/link-button';
import { Badge } from '@/components/ui/badge';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { Avatar, AvatarGroup } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Announcement } from '@/components/ui/announcement';
import { Checkbox, CheckboxGroup } from '@/components/ui/checkbox';
import { Radio, RadioGroup } from '@/components/ui/radio';
import { ActionCard, ActionCardMedia } from '@/components/ui/action-card';
import { ActionCardMenu } from '@/components/ui/action-card-menu';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { toast, Toaster } from '@/components/ui/toast';
import { Field, FieldLabel, FieldDescription } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch, SwitchGroup } from '@/components/ui/switch';
import { Modal, ModalBody, ModalClose, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle, ModalTrigger } from '@/components/ui/modal';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar } from '@/components/ui/calendar';
import { DatePicker } from '@/components/ui/date-picker';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton, SkeletonReveal } from '@/components/ui/skeleton';
import { MotionProvider } from '@/lib/motion';
import { SoundProvider } from '@/lib/sound';
import { cuelumeSound } from '@/lib/sound-cuelume';

/** Everything a project gets from `shadcn add @morphin/theme @morphin/dropdown @morphin/select …`. */
export function App({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [view, setView] = useState('grid');
  return (
    <SoundProvider player={cuelumeSound} enabled={false}>
    <MotionProvider>
      <main className="flex min-h-svh flex-wrap items-center justify-center gap-3 bg-background p-10 text-foreground">
        <Button>Get started</Button>
        <Button variant="outline">Learn more</Button>
        <Button variant="secondary" loading loadingLabel="Saving">Save</Button>
        <IconButton label="Add" variant="accent">+</IconButton>
        <Button variant="destructive" size="sm">Delete</Button>
        <Dropdown defaultOpen={defaultOpen}>
          <DropdownTrigger>Options</DropdownTrigger>
          <DropdownContent align="start">
            <DropdownGroup>
              <DropdownLabel>View</DropdownLabel>
              <DropdownRadioGroup value={view} onValueChange={setView}>
                <DropdownRadioItem value="grid">Grid</DropdownRadioItem>
                <DropdownRadioItem value="list">List</DropdownRadioItem>
              </DropdownRadioGroup>
            </DropdownGroup>
            <DropdownSeparator />
            <DropdownItem>Duplicate</DropdownItem>
            <DropdownItem variant="destructive">Delete</DropdownItem>
          </DropdownContent>
        </Dropdown>
        <Select defaultValue="apple">
          <SelectTrigger aria-label="Fruit" placeholder="Pick a fruit" />
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </Select>
        <SplitButton>
          <SplitButtonAction>Join for free</SplitButtonAction>
          <SplitButtonMenu label="More options">
            <DropdownContent>
              <DropdownItem>Docs</DropdownItem>
            </DropdownContent>
          </SplitButtonMenu>
        </SplitButton>
        <ButtonGroup aria-label="View">
          <ButtonGroupItem selected>List</ButtonGroupItem>
          <ButtonGroupItem>Grid</ButtonGroupItem>
        </ButtonGroup>
        <LinkButton href="/changelog">View changelog</LinkButton>
        <Badge variant="success" dot>Online</Badge>
        <ChipGroup aria-label="Added"><Chip shimmer uppercase>New</Chip><Chip variant="outline" uppercase>2d ago</Chip></ChipGroup>
        <ActionCard href="/new" preview={<ActionCardMedia src="/new.png" />} active>New</ActionCard>
        <ActionCardMenu title="Sort by" defaultValue="new" options={[{ value: 'new', label: 'New' }, { value: 'popular', label: 'Popular' }]} />
        <Button variant="ghost" onClick={() => toast.success({ title: 'Saved', description: 'Your changes are in.' })}>Notify</Button>
        <Field name="email"><FieldLabel>Email</FieldLabel><Input type="email" placeholder="you@example.com" hint="Work email." maxLength={64} /><FieldDescription>Work email.</FieldDescription></Field>
        <Field name="message"><FieldLabel>Message</FieldLabel><Textarea autoResize defaultValue="Hello Morphin" maxLength={160} hint="A short note." /></Field>
        <SwitchGroup legend="Notifications"><Switch label="Email" description="Mentions only." defaultChecked /><Switch label="Push" size="sm" /></SwitchGroup>
        <Slider label="Volume" defaultValue={40} className="w-60" />
        <Slider label="Price" defaultValue={[20, 80]} format={{ style: 'currency', currency: 'USD' }} getThumbLabel={index => (index ? 'Maximum' : 'Minimum')} className="w-60" />
        <Modal>
          <ModalTrigger>Open modal</ModalTrigger>
          <ModalContent size="sm">
            <ModalHeader><ModalTitle>Invite</ModalTitle><ModalDescription>Add people to the project.</ModalDescription></ModalHeader>
            <ModalBody>Body</ModalBody>
            <ModalFooter><ModalClose>Cancel</ModalClose></ModalFooter>
          </ModalContent>
        </Modal>
        <Tabs defaultValue="one">
          <TabsList aria-label="Demo">
            <TabsTab value="one">One</TabsTab>
            <TabsTab value="two">Two</TabsTab>
          </TabsList>
          <TabsPanel value="one">First</TabsPanel>
          <TabsPanel value="two">Second</TabsPanel>
        </Tabs>
        <Accordion variant="card" defaultValue={['shipping']} className="w-80">
          <AccordionItem value="shipping">
            <AccordionTrigger>Shipping</AccordionTrigger>
            <AccordionPanel>Orders ship within two days.</AccordionPanel>
          </AccordionItem>
          <AccordionItem value="returns">
            <AccordionTrigger>Returns</AccordionTrigger>
            <AccordionPanel>Free returns for 30 days.</AccordionPanel>
          </AccordionItem>
        </Accordion>
        <Calendar mode="range" defaultMonth={new Date(2026, 0, 1)} selected={{ from: new Date(2026, 0, 5), to: new Date(2026, 0, 9) }} />
        <DatePicker aria-label="Due date" name="due" defaultValue={new Date(2026, 0, 12)} />
        <Field name="stay"><FieldLabel>Stay</FieldLabel><DatePicker mode="range" calendarProps={{ numberOfMonths: 2 }} /></Field>
        <Spinner label="Loading" />
        <CheckboxGroup legend="Notify me" defaultValue={['email']}>
          <Checkbox value="email" label="Email" />
          <Checkbox value="sms" label="SMS" />
        </CheckboxGroup>
        <RadioGroup legend="Plan" defaultValue="pro">
          <Radio value="free" label="Free" />
          <Radio value="pro" label="Pro" />
        </RadioGroup>
        <Announcement title="What's new in v2" description="Charts and a command menu." actionLabel="See the changelog" dismissible />
        <Card size="sm">
          <CardHeader>
            <CardTitle>Elena Voss</CardTitle>
            <CardDescription>Product designer</CardDescription>
          </CardHeader>
          <CardContent>
            <AvatarGroup aria-label="Team" max={2}>
              <Avatar name="Elena Voss" status="online" />
              <Avatar name="Marcus Chen" />
              <Avatar name="Ada Lovelace" />
            </AvatarGroup>
          </CardContent>
        </Card>
        <SkeletonReveal loading>
          <Skeleton lines={2} />
        </SkeletonReveal>
        <Toaster />
      </main>
    </MotionProvider>
    </SoundProvider>
  );
}
