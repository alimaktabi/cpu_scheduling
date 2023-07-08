import { Scheduler } from "./cpu"

export interface Task {
  processId: number | string
  arrivalTime: number
  cpuTime1: number
  ioTime: number
  cpuTime2: number
  queue?: number
}

export abstract class BaseAlgorithm {
  public get availableTasks(): Task[] {
    return this.cpu.newStateList
  }

  constructor(protected cpu: Scheduler) {}

  public abstract dispatch(): Task
}
