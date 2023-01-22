import { parseString } from "fast-csv"
import { BaseAlgorithm, Task } from "./base"

const calculateUtilization = (data: LoggedValue[]) => {
  let idleTime = 0
  let totalTime = 0

  data.forEach((item: any) => {
    if (item.processId === "idle") {
      idleTime += item.to - item.from
    }

    totalTime += item.to - item.from
  })

  return { res: (totalTime - idleTime) / totalTime, idleTime, totalTime }
}

export type LoggedValue = {
  from: number
  to: number
  processId: number | string
}

const calculateResponseTimes = (data: LoggedValue[]) => {
  const values: { [key: string | number]: number } = {}

  data.forEach((item) => {
    if (!values[item.processId]) {
      values[item.processId] = item.from
    }
  })

  return values
}

const calculateWaittingTimes = (data: LoggedValue[]) => {
  const res: { [key: string | number]: { start: number; end: number } } = {}

  data.forEach((item) => {
    if (!res[item.processId]) {
      res[item.processId] = { start: item.from, end: item.to }
    }

    res[item.processId].end = item.to
  })
}

const caluclateFormulas = (data: LoggedValue[]) => {
  const { res: utilization, idleTime, totalTime } = calculateUtilization(data)
  return {
    utilization,
    idleTime,
    totalTime,
    responseTimes: calculateResponseTimes(data),
  }
}

export class CPU {
  public allTasks: Task[] = []

  public ioTasks: Task[] = []

  public arraivalTasks: Task[] = []

  public finishedTasks: Task[] = []

  private loggedValues: LoggedValue[] = []

  private resultProcesses: {
    [key: number | string]: { waittingTime: number }
  } = {}

  private _upTime = 0

  constructor(public algorithm: BaseAlgorithm) {}

  public get upTime() {
    return this._upTime
  }

  public run() {
    while (
      this.allTasks.length ||
      this.ioTasks.length ||
      this.arraivalTasks.length
    ) {
      this.bringNewProcesses()
      if (this.arraivalTasks.length) {
        const task = this.algorithm.choose()
        this.processMicroSecond(task)
        this.analyzeTasks(task)
      } else {
        this.processMicroSecond(undefined)
        this.analyzeTasks(undefined)
      }

      this.postFinishedJobs()
    }

    return this.calculatePerformance()
  }

  public analyzeTasks(task: undefined | Task) {
    this.arraivalTasks.forEach((item) => {
      if (item === task) return

      if (!this.resultProcesses[item.processId]) {
        this.resultProcesses[item.processId] = {
          waittingTime: 0,
        }
      }

      this.resultProcesses[item.processId].waittingTime++
    })
  }

  public readFromCsvFile(file: { buffer: Buffer }) {
    const item = parseString(file.buffer.toString())

    return new Promise((resolve, reject) => {
      const buffer: any[] = []
      item.on("data", (data) => {
        buffer.push(data)
      })

      item.on("close", () => {
        this.allTasks = this.parseTasks(buffer)
        resolve("ok")
      })

      setTimeout(() => reject(new Error("Timeout")), 10000)
    })
  }

  public getJobProcessTimeKey(task: Task): "cpuTime1" | "cpuTime2" {
    return task.cpuTime1 <= 0 ? "cpuTime2" : "cpuTime1"
  }

  private calculatePerformance() {
    const res = caluclateFormulas(this.loggedValues)

    const responseTimes = Object.values(res.responseTimes)

    const resultProcesses = Object.values(this.resultProcesses)

    return {
      averageResponseTime:
        responseTimes.reduce((partialSum, a) => partialSum + a, 0) /
        responseTimes.length,
      totalTime: res.totalTime,
      utilization: res.utilization,
      averageWaittingTime:
        resultProcesses.reduce(
          (partialSum, a) => partialSum + a.waittingTime,
          0
        ) / responseTimes.length,
      loggedValues: this.loggedValues,
    }
  }

  private postFinishedJobs(): void {
    const indexesToBeRemoved: number[] = []
    const indexesForIo: number[] = []

    this.arraivalTasks.forEach((item, index) => {
      if (this.isFinishedAndhasIo(item)) {
        indexesForIo.push(index)
      }

      if (this.isFinished(item)) {
        indexesToBeRemoved.push(index)
      }
    })

    indexesToBeRemoved.forEach((index, offset) => {
      const item = this.arraivalTasks[index - offset]
      this.arraivalTasks.splice(index - offset, 1)
      this.finishedTasks.push(item)
    })

    indexesForIo.forEach((index, offset) => {
      const item = this.arraivalTasks[index - offset]
      this.arraivalTasks.splice(index - offset, 1)
      this.ioTasks.push(item)
    })
  }

  private bringNewProcesses() {
    if (this.upTime === 100) {
      console.log(this.loggedValues)
      throw new Error("this ")
    }

    this.removeFromAndAdd(
      this.allTasks,
      this.arraivalTasks,
      this.upTime,
      "arraivalTime"
    )

    this.removeFromAndAdd(this.ioTasks, this.arraivalTasks, 0, "ioTime")
  }

  private removeFromAndAdd(
    array: Task[],
    dest: Task[],
    value: any,
    key: string
  ) {
    const indexesToBeRemoved: number[] = []

    array.forEach((item, index) => {
      if ((item as any)[key] === value) {
        indexesToBeRemoved.push(index)
      }
    })

    indexesToBeRemoved.forEach((index, offset) => {
      const existing = array[index - offset]

      array.splice(index - offset, 1)
      dest.push(existing)
    })
  }

  private processMicroSecond(task: Task | undefined): void {
    this._upTime++

    if (task === undefined) {
      this.logTask({
        processId: "idle",
        arraivalTime: 0,
        ioTime: 0,
        cpuTime1: 0,
        cpuTime2: 0,
      })
    } else {
      task[this.getJobProcessTimeKey(task)]--
      this.logTask(task)
    }

    this.ioTasks.forEach((item) => {
      item.ioTime -= 1
    })
  }

  private logTask(task: Task) {
    if (
      this.loggedValues.length &&
      this.loggedValues[this.loggedValues.length - 1].processId ===
        task.processId
    ) {
      this.loggedValues[this.loggedValues.length - 1].to++

      return
    }

    this.loggedValues.push({
      from: this.upTime - 1,
      to: this.upTime,
      processId: task.processId,
    })
  }

  private isFinishedAndhasIo(task: Task): boolean {
    return task.cpuTime1 == 0 && task.ioTime !== 0
  }

  private isFinished(task: Task): boolean {
    return task.cpuTime1 === 0 && task.ioTime === 0 && task.cpuTime2 === 0
  }

  private parseTasks(tasks: string[][]): Task[] {
    const res: Task[] = []

    const taskKeys = {
      process_id: 0,
      arrival_time: 0,
      cpu_time1: 0,
      io_time: 0,
      cpu_time2: 0,
    }

    tasks[0].forEach((key: string, index) => {
      ;(taskKeys as any)[key] = index
    })

    for (const row of tasks.slice(1)) {
      res.push(<Task>{
        processId: parseInt(row[taskKeys.process_id]),
        arraivalTime: parseInt(row[taskKeys.arrival_time]),
        cpuTime1: parseInt(row[taskKeys.cpu_time1]),
        ioTime: parseInt(row[taskKeys.io_time]),
        cpuTime2: parseInt(row[taskKeys.cpu_time2]),
      })
    }

    return res
  }
}
