import { NextApiRequest, NextApiResponse } from "next"
import multer from "multer"
import { parseString } from "fast-csv"
import { Scheduler } from "../../../algorithms/cpu"
import { BaseAlgorithm, Task } from "../../../algorithms/base"

export const config = {
  api: {
    bodyParser: false,
  },
}

const uploads = multer({ storage: multer.memoryStorage() })

function runMiddleware(
  req: NextApiRequest & { [key: string]: any },
  res: NextApiResponse,
  fn: (...args: any[]) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result)
      }

      return resolve(result)
    })
  })
}

export class RoundRubinAlgorithm extends BaseAlgorithm {
  private numberOfRuns = 0
  private previousTask: Task | null = null

  constructor(cpu: Scheduler, private period: number) {
    super(cpu)
  }

  public dispatch(): Task {
    if (this.previousTask != this.availableTasks[0]) this.numberOfRuns = 0
    this.swapTasks()
    this.numberOfRuns++
    this.previousTask = this.availableTasks[0]
    return this.availableTasks[0]
  }

  private swapTasks(): void {
    if (this.numberOfRuns !== this.period) return

    this.numberOfRuns = 0

    const item = this.availableTasks.shift()
    if (!item) throw new Error("availableTasks where empty!")
    this.availableTasks.push(item)
  }
}

const handler = async (
  req: NextApiRequest & { [key: string]: any },
  res: NextApiResponse
): Promise<void> => {
  await runMiddleware(req, res, uploads.single("file"))

  const cpu = new Scheduler(null as any)

  cpu.algorithm = new RoundRubinAlgorithm(cpu, Number(req.body.period))

  await cpu.readFromCsvFile(req.file)

  const cpuRes = cpu.run()

  res.send(cpuRes)
}

export default handler
