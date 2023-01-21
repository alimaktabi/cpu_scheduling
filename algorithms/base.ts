import { CPU } from "./cpu";

export interface Task {
  processId: number | string;
  arraivalTime: number;
  cpuTime1: number;
  ioTime: number;
  cpuTime2: number;
}

export abstract class BaseAlgorithm {
  public get availableTasks(): Task[] {
    return this.cpu.arraivalTasks;
  }

  constructor(protected cpu: CPU) {}

  public abstract choose(): Task;
}
