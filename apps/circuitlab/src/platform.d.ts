// The platform's shared How-to-play panel (src/shared/helpPanel.js), reused as-is.
declare module '@platform/helpPanel' {
  export const HELP_KEYS: string[]
  export class HelpPanel {
    constructor(o: { host: HTMLElement; id: string; table: unknown; text?: Record<string, string>; onOpen?: () => void; onClose?: () => void })
    readonly isOpen: boolean
    toggle(): void
    open(): void
    close(): void
    openFirstTime(): boolean
    dispose(): void
  }
  export function helpButton(host: HTMLElement, onClick: () => void, o?: { label?: string; style?: string }): HTMLButtonElement
}
