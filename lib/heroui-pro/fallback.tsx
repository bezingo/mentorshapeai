'use client'

/**
 * OSS fallbacks mirroring HeroUI Pro compound APIs when Pro artifacts are not installed.
 * Replaced at build time via next.config alias when `heroui-pro install` has run.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Drawer, Switch, Button, useOverlayState } from '@heroui/react'

type UseOverlayStateReturn = ReturnType<typeof useOverlayState>
import { cn } from '@/lib/utils'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

type SheetContextValue = {
  placement: 'top' | 'bottom' | 'left' | 'right'
  state: UseOverlayStateReturn
}

const SheetContext = createContext<SheetContextValue | null>(null)

function useSheetContext() {
  const ctx = useContext(SheetContext)
  if (!ctx) {
    throw new Error('Sheet subcomponents must be used within Sheet')
  }
  return ctx
}

type SidebarContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

function useSidebarContext() {
  const ctx = useContext(SidebarContext)
  if (!ctx) {
    throw new Error('Sidebar components must be used within Sidebar.Provider')
  }
  return ctx
}

function SidebarProvider({
  children,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
}: {
  children: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const open = openProp ?? uncontrolledOpen

  const setOpen = useCallback(
    (next: boolean) => {
      onOpenChange?.(next)
      if (openProp === undefined) {
        setUncontrolledOpen(next)
      }
    },
    [onOpenChange, openProp]
  )

  const toggle = useCallback(() => setOpen(!open), [open, setOpen])

  const value = useMemo(() => ({ open, setOpen, toggle }), [open, setOpen, toggle])

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

function SidebarRoot({
  children,
  className,
  collapsible,
}: {
  children?: ReactNode
  className?: string
  collapsible?: 'offcanvas' | 'icon' | false
}) {
  const { open } = useSidebarContext()
  if (collapsible === 'offcanvas' && !open) {
    return null
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-sidebar text-sidebar-foreground',
        className
      )}
    >
      {children}
    </aside>
  )
}

function SidebarHeader({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-2 border-b border-sidebar-border px-4 py-3',
        className
      )}
    >
      {children}
    </div>
  )
}

function SidebarContent({ children, className }: { children?: ReactNode; className?: string }) {
  return <div className={cn('min-h-0 flex-1 overflow-hidden', className)}>{children}</div>
}

function SidebarMain({ children, className }: { children?: ReactNode; className?: string }) {
  return <div className={cn('flex flex-1 flex-col gap-2 p-2', className)}>{children}</div>
}

function SidebarMenu({ children, className }: { children?: ReactNode; className?: string }) {
  return <nav className={cn('flex flex-col gap-1', className)}>{children}</nav>
}

function SidebarMenuSection({ children }: { children?: ReactNode }) {
  return <div className="flex flex-col gap-1">{children}</div>
}

function SidebarMenuItem({
  children,
  className,
  onAction,
}: {
  children?: ReactNode
  className?: string
  onAction?: () => void
}) {
  return (
    <Button
      variant="ghost"
      className={cn('h-auto w-full justify-start py-2', className)}
      onPress={onAction}
    >
      {children}
    </Button>
  )
}

function SidebarMenuLabel({ children, className }: { children?: ReactNode; className?: string }) {
  return <span className={cn('text-sm font-medium', className)}>{children}</span>
}

function SidebarMenuIcon({ children }: { children?: ReactNode }) {
  return <span className="mr-2 inline-flex shrink-0">{children}</span>
}

function SidebarMenuItemContent({ children }: { children?: ReactNode }) {
  return <span className="flex flex-col items-start gap-0.5">{children}</span>
}

function SidebarTrigger({ className }: { className?: string }) {
  const { open, toggle } = useSidebarContext()
  return (
    <Button
      isIconOnly
      variant="ghost"
      className={className}
      aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
      onPress={toggle}
    >
      {open ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
    </Button>
  )
}

function SidebarRail() {
  return null
}

function SidebarMobile({ children }: { children?: ReactNode }) {
  return <>{children}</>
}

function SidebarFooter({ children, className }: { children?: ReactNode; className?: string }) {
  return <div className={cn('mt-auto border-t border-sidebar-border p-3', className)}>{children}</div>
}

function SidebarGroup({ children }: { children?: ReactNode }) {
  return <div className="px-2 py-1">{children}</div>
}

function SidebarGroupLabel({ children }: { children?: ReactNode }) {
  return <p className="px-2 text-xs font-medium text-muted-foreground">{children}</p>
}

function SidebarSeparator() {
  return <div className="my-2 h-px bg-sidebar-border" />
}

function SidebarPages({ children }: { children?: ReactNode; defaultValue?: string; value?: string }) {
  return <div className="relative flex flex-1 flex-col overflow-hidden">{children}</div>
}

function SidebarPage({ children }: { children?: ReactNode; value?: string }) {
  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>
}

export const Sidebar = Object.assign(SidebarRoot, {
  Provider: SidebarProvider,
  Header: SidebarHeader,
  Content: SidebarContent,
  Main: SidebarMain,
  Menu: SidebarMenu,
  MenuSection: SidebarMenuSection,
  MenuItem: SidebarMenuItem,
  MenuLabel: SidebarMenuLabel,
  MenuIcon: SidebarMenuIcon,
  MenuItemContent: SidebarMenuItemContent,
  Trigger: SidebarTrigger,
  Rail: SidebarRail,
  Mobile: SidebarMobile,
  Footer: SidebarFooter,
  Group: SidebarGroup,
  GroupLabel: SidebarGroupLabel,
  Separator: SidebarSeparator,
  Pages: SidebarPages,
  Page: SidebarPage,
})

type SheetRootProps = {
  children?: ReactNode
  isOpen?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

function SheetRoot({
  children,
  isOpen,
  defaultOpen,
  onOpenChange,
  placement = 'bottom',
}: SheetRootProps) {
  const state = useOverlayState({ isOpen, defaultOpen, onOpenChange })
  const value = useMemo(() => ({ placement, state }), [placement, state])

  return (
    <SheetContext.Provider value={value}>
      <Drawer state={state}>{children}</Drawer>
    </SheetContext.Provider>
  )
}

function SheetTrigger({ children }: { children: ReactNode }) {
  return <Drawer.Trigger>{children}</Drawer.Trigger>
}

function SheetBackdrop({ children }: { children?: ReactNode }) {
  return <>{children}</>
}

function SheetContent({ children, className }: { children?: ReactNode; className?: string }) {
  const { placement } = useSheetContext()
  return (
    <Drawer.Backdrop>
      <Drawer.Content placement={placement} className={className}>
        {children}
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}

function SheetDialog({ children }: { children?: ReactNode }) {
  return <Drawer.Dialog>{children}</Drawer.Dialog>
}

function SheetHeader({ children }: { children?: ReactNode }) {
  return <Drawer.Header>{children}</Drawer.Header>
}

function SheetHeading({ children }: { children?: ReactNode }) {
  return <Drawer.Heading>{children}</Drawer.Heading>
}

function SheetBody({ children, className }: { children?: ReactNode; className?: string }) {
  return <Drawer.Body className={className}>{children}</Drawer.Body>
}

function SheetFooter({ children }: { children?: ReactNode }) {
  return <Drawer.Footer>{children}</Drawer.Footer>
}

function SheetHandle() {
  return <Drawer.Handle />
}

function SheetCloseTrigger() {
  return <Drawer.CloseTrigger />
}

function SheetClose({ children }: { children: ReactNode }) {
  const { state } = useSheetContext()
  return (
    <Button variant="ghost" onPress={() => state.close()}>
      {children}
    </Button>
  )
}

export const Sheet = Object.assign(SheetRoot, {
  Trigger: SheetTrigger,
  Backdrop: SheetBackdrop,
  Content: SheetContent,
  Dialog: SheetDialog,
  Header: SheetHeader,
  Heading: SheetHeading,
  Body: SheetBody,
  Footer: SheetFooter,
  Handle: SheetHandle,
  CloseTrigger: SheetCloseTrigger,
  Close: SheetClose,
})

type CellSwitchRootProps = {
  children?: ReactNode
  variant?: 'default' | 'secondary'
  isSelected?: boolean
  defaultSelected?: boolean
  onChange?: (selected: boolean) => void
  isDisabled?: boolean
}

function CellSwitchRoot({
  children,
  variant = 'default',
  isSelected,
  defaultSelected,
  onChange,
  isDisabled,
}: CellSwitchRootProps) {
  return (
    <Switch
      isSelected={isSelected}
      defaultSelected={defaultSelected}
      onChange={onChange}
      isDisabled={isDisabled}
      className={cn(
        'w-full',
        variant === 'secondary' && 'rounded-lg bg-muted/40 px-3 py-2'
      )}
    >
      {children}
    </Switch>
  )
}

function CellSwitchTrigger({ children }: { children?: ReactNode }) {
  return (
    <Switch.Content className="flex w-full items-center justify-between gap-3">
      {children}
    </Switch.Content>
  )
}

function CellSwitchLabel({ children }: { children?: ReactNode }) {
  return (
    <span className="cell-switch__label flex flex-col items-start gap-0.5 text-left">
      {children}
    </span>
  )
}

function CellSwitchControl() {
  return (
    <Switch.Control>
      <Switch.Thumb />
    </Switch.Control>
  )
}

export const CellSwitch = Object.assign(CellSwitchRoot, {
  Trigger: CellSwitchTrigger,
  Label: CellSwitchLabel,
  Control: CellSwitchControl,
})
