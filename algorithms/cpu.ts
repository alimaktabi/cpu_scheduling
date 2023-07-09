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

const calculateWaitingTimes = (data: LoggedValue[]) => {
  const res: { [key: string | number]: { start: number; end: number } } = {}

  data.forEach((item) => {
    if (!res[item.processId]) {
      res[item.processId] = { start: item.from, end: item.to }
    }

    res[item.processId].end = item.to
  })
}

const mapToKey = {
  arrivalTime: "start",
  ioTime: "start-io",
}

const calculateFormulas = (data: LoggedValue[]) => {
  const { res: utilization, idleTime, totalTime } = calculateUtilization(data)
  return {
    utilization,
    idleTime,
    totalTime,
    responseTimes: calculateResponseTimes(data),
  }
}

export class Scheduler {
  public allTasks: Task[] = []

  public waitingStateList: Task[] = []

  public newStateList: Task[] = []

  public terminatedStateList: Task[] = []

  private loggedValues: LoggedValue[] = []

  private events: { eventName: string; task: Task | null; time: number }[] = []

  private tasksList: string[] = []

  private resultProcesses: {
    [key: number | string]: { waitingTime: number }
  } = {}

  private _upTime = 0

  constructor(public algorithm: BaseAlgorithm) {}

  public get upTime() {
    return this._upTime
  }

  public run() {
    while (
      this.allTasks.length ||
      this.waitingStateList.length ||
      this.newStateList.length
    ) {
      this.admitNewProcesses()
      this.tasksList.push(
        JSON.stringify({
          terminatedStateList: this.terminatedStateList,
          waitingStateList: this.waitingStateList,
          newStateList: this.newStateList,
        })
      )
      if (this.newStateList.length) {
        const task = this.algorithm.dispatch()
        this.events.push({ eventName: "mine", task, time: this._upTime })
        this.processMicroSecond(task)
        this.analyzeTasks(task)
      } else {
        this.events.push({ eventName: "idle", task: null, time: this._upTime })
        this.processMicroSecond(undefined)
        this.analyzeTasks(undefined)
      }

      this.terminateFinishedJobs()
    }

    return this.calculatePerformance()
  }

  public analyzeTasks(task: undefined | Task) {
    this.newStateList.forEach((item) => {
      if (item === task) return

      if (!this.resultProcesses[item.processId]) {
        this.resultProcesses[item.processId] = {
          waitingTime: 0,
        }
      }

      this.resultProcesses[item.processId].waitingTime++
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
    const res = calculateFormulas(this.loggedValues)

    const responseTimes = Object.values(res.responseTimes)

    const resultProcesses = Object.values(this.resultProcesses)

    return {
      averageResponseTime:
        responseTimes.reduce((partialSum, a) => partialSum + a, 0) /
        responseTimes.length,
      totalTime: res.totalTime,
      utilization: res.utilization,
      averageWaitingTime:
        resultProcesses.reduce(
          (partialSum, a) => partialSum + a.waitingTime,
          0
        ) / responseTimes.length,
      loggedValues: this.loggedValues,
      events: this.events,
      tasksList: this.tasksList,
    }
  }

  private terminateFinishedJobs(): void {
    const indexesToBeRemoved: number[] = []
    const indexesForIo: number[] = []

    this.newStateList.forEach((item, index) => {
      if (this.isFinishedAndhasIo(item)) {
        this.events.push({ eventName: "io", task: item, time: this._upTime })
        indexesForIo.push(index)
      }

      if (this.isFinished(item)) {
        this.events.push({
          eventName: "finished",
          task: item,
          time: this._upTime,
        })
        indexesToBeRemoved.push(index)
      }
    })

    indexesToBeRemoved.forEach((index, offset) => {
      const item = this.newStateList[index - offset]
      this.newStateList.splice(index - offset, 1)
      this.terminatedStateList.push(item)
    })

    indexesForIo.forEach((index, offset) => {
      const item = this.newStateList[index - offset]
      this.newStateList.splice(index - offset, 1)
      this.waitingStateList.push(item)
    })
  }

  private admitNewProcesses() {
    if (this.upTime === 300) {
      console.log(this.loggedValues)
      throw new Error("this ")
    }

    this.removeFromAndAdd(
      this.allTasks,
      this.newStateList,
      this.upTime,
      "arrivalTime"
    )

    this.removeFromAndAdd(this.waitingStateList, this.newStateList, 0, "ioTime")
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

        this.events.push({ eventName: key, task: item, time: this._upTime })
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
        arrivalTime: 0,
        ioTime: 0,
        cpuTime1: 0,
        cpuTime2: 0,
      })
    } else {
      task[this.getJobProcessTimeKey(task)]--
      this.logTask(task)
    }

    this.waitingStateList.forEach((item) => {
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
        arrivalTime: parseInt(row[taskKeys.arrival_time]),
        cpuTime1: parseInt(row[taskKeys.cpu_time1]),
        ioTime: parseInt(row[taskKeys.io_time]),
        cpuTime2: parseInt(row[taskKeys.cpu_time2]),
      })
    }

    return res
  }
}
