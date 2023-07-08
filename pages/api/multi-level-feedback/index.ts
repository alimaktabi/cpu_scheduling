import { NextApiRequest, NextApiResponse } from "next"
import multer from "multer"
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

export class MultiLevelFeedbackAlgorithm extends BaseAlgorithm {
  private previousTask: Task | null = null
  private numberOfRuns = 0

  constructor(cpu: Scheduler, private queuesTime: number[]) {
    super(cpu)
  }

  public dispatch(): Task {
    if (!this.availableTasks[0].queue) {
      this.availableTasks[0].queue = 1
    }

    if (this.previousTask === this.availableTasks[0]) {
      if (
        this.numberOfRuns >= this.queuesTime[this.previousTask.queue as any]
      ) {
        ;(this.previousTask.queue as number)++

        let index = 0

        while (index < this.availableTasks.length - 1) {
          this.availableTasks[index] = this.availableTasks[index + 1]
          this.availableTasks[index + 1] = this.previousTask
          index++
        }

        // push element to the last
      }
    } else {
      this.numberOfRuns = 0
    }

    this.numberOfRuns++

    let lowest: Task = this.availableTasks[0]

    this.availableTasks.forEach((item) => {
      if (!item.queue) item.queue = 1
      if (!lowest.queue) lowest.queue = 1

      if (item.queue < lowest.queue) {
        lowest = item
      }
    })

    return lowest
  }
}

const handler = async (
  req: NextApiRequest & { [key: string]: any },
  res: NextApiResponse
): Promise<void> => {
  await runMiddleware(req, res, uploads.single("file"))

  const cpu = new Scheduler(null as any)

  const queuesTime = (<string>req.body.queuesTime).split(",")

  cpu.algorithm = new MultiLevelFeedbackAlgorithm(
    cpu,
    queuesTime.map((item) => Number(item))
  )

  await cpu.readFromCsvFile(req.file)

  const cpuRes = cpu.run()

  res.send(cpuRes)
}

export default handler
