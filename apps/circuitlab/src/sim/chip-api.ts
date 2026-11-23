/**
 * Mixed-signal bridge between the analog MNA solver and behavioral IC models.
 * CONTRACT FILE — do not modify without coordinating with the integrator.
 *
 * How chips work in the engine loop (see src/sim/engine.ts):
 *  1. Each sim step, BEFORE the analog solve, every chip's step() runs.
 *  2. step() reads its pin node voltages from the PREVIOUS solution
 *     (ctx.readPin) and updates internal state (edge detection, timers...).
 *  3. step() declares output drives via ctx.drivePin(pin, {v, rout}).
 *     The engine stamps each drive as a Norton equivalent (G = 1/rout,
 *     I = v/rout into the pin's net). drivePin(pin, null) releases the pin
 *     (high-impedance — used for open-drain outputs like the 555 DISCH).
 *  4. The analog solve then runs with those stamps.
 *
 * Conventions:
 *  - Logic threshold: input is HIGH when v > 0.5·VDD of the chip.
 *  - Push-pull outputs: rout = 50Ω, v = VDD (high) or 0 (low).
 *  - Open-drain conducting: {v: 0, rout: 25}.
 *  - A chip whose supply pin reads < 2V is unpowered: release all outputs.
 */

import type { ComponentInstance, ComponentTelemetry, ParamValue } from '../model/types'

export interface PinDrive {
  /** Thevenin voltage of the driver */
  v: number
  /** Thevenin output resistance (Ω), must be > 0 */
  rout: number
}

export interface ChipStepCtx {
  /** simulation time (s) at the start of this step */
  time: number
  /** step size (s) */
  dt: number
  /** node voltage of a pin from the previous solve; NaN if the pin is unconnected */
  readPin(pin: string): number
  /** declare/refresh this pin's output drive for the coming solve; null = release */
  drivePin(pin: string, drive: PinDrive | null): void

  // ---- Circuit Lab extensions (optional: ohmlet's chips ignore them) ----
  /** other chips whose pins share this pin's net (I²C devices, sensors on a data line) */
  peers?(pin: string): ChipInstance[]
  /** exact-time edges other chips drove on this pin's net during the PREVIOUS step */
  pinEdges?(pin: string): PinEdge[]
  /** report a teaching issue (deduplicated by message) */
  issue?(level: 'error' | 'warning', message: string): void
}

/** A logic edge at an exact simulation time (sub-step precision). */
export interface PinEdge {
  t: number
  high: boolean
}

/** A device on an I²C bus (transaction level, as Circuit Lab models buses). */
export interface I2cDevice {
  readonly address: number
  /** powered and able to acknowledge */
  ready(): boolean
  /** one write transaction: the bytes after the address byte */
  write(bytes: number[]): void
  /** one read transaction of n bytes (optional) */
  read?(n: number): number[]
}

export interface ChipInstance {
  comp: ComponentInstance
  step(ctx: ChipStepCtx): void
  /** optional: logic-state info for telemetry/visualization (pin → high?) */
  outputs?(): Record<string, boolean>

  // ---- Circuit Lab extensions ----
  /** live tweaks while running (sensor distance, temperature…) */
  setRuntimeParam?(key: string, value: ParamValue): void
  /** add part-specific telemetry (servo angle, LCD text, board state…) */
  fillTelemetry?(t: ComponentTelemetry): void
  /** exact-time edges this chip drove on a pin during its last step */
  edges?(pin: string): readonly PinEdge[] | null
  /** I²C slave interface, when the part is an I²C device */
  i2c?: I2cDevice
  /** WS2812 data in: the colours (0xRRGGBB) of one show() */
  neopixelShow?(pixels: number[]): void
  /** DHT one-wire sensor: a reading, or null when it does not answer */
  dhtRead?(): { temperature: number; humidity: number } | null
}

export type ChipFactory = (comp: ComponentInstance) => ChipInstance

const registry = new Map<string, ChipFactory>()

export function registerChip(model: string, factory: ChipFactory): void {
  registry.set(model, factory)
}

export function createChip(model: string, comp: ComponentInstance): ChipInstance | null {
  const f = registry.get(model)
  return f ? f(comp) : null
}

export function registeredChips(): string[] {
  return [...registry.keys()]
}

// --------------------------------------------------------------- helpers

export const PUSH_PULL_ROUT = 50
export const OPEN_DRAIN_ROUT = 25
export const MIN_SUPPLY = 2

/** Supply voltage of the chip as seen on its VCC/VDD pin (0 if unconnected). */
export function supplyOf(ctx: ChipStepCtx, vccPin: string): number {
  const v = ctx.readPin(vccPin)
  return Number.isNaN(v) ? 0 : v
}

/** Read a pin as a logic level against the given supply. NaN/floating reads as low. */
export function readLogic(ctx: ChipStepCtx, pin: string, vdd: number): boolean {
  const v = ctx.readPin(pin)
  if (Number.isNaN(v)) return false
  return v > 0.5 * vdd
}

/** Drive a pin push-pull high/low against the given supply. */
export function driveLogic(ctx: ChipStepCtx, pin: string, high: boolean, vdd: number): void {
  ctx.drivePin(pin, { v: high ? vdd : 0, rout: PUSH_PULL_ROUT })
}
