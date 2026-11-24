/** The EE Lab I track: every JSON file in ./ee-lab-1, in experiment order. */
import type { Experiment } from './types'

const files = import.meta.glob('./ee-lab-1/*.json', { eager: true, import: 'default' }) as Record<string, Experiment>

export const TRACK = {
  id: 'ee-lab-1',
  title: 'EE Lab I (CCNY EE 22100 topics)',
  note: 'Original experiments on the topics in the CCNY EE 22100 catalog description: test and measurement instruments, virtual and computer instrumentation, electric and electronic circuits, transient and frequency response, logic circuits, discrete circuits and operational amplifiers.',
}

export const EXPERIMENTS: Experiment[] = Object.values(files).sort((a, b) => a.number - b.number)

export function experimentById(id: string): Experiment | undefined {
  return EXPERIMENTS.find((e) => e.id === id)
}
