import { NextApiRequest, NextApiResponse } from "next"
import multer from "multer"
import { parseString } from "fast-csv"
import { CPU } from "../../../algorithms/cpu"
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

export class ShortestRemainingAlgorithm extends BaseAlgorithm {
  public choose(): Task {
    let lowest: Task = this.availableTasks[0]

    this.availableTasks.forEach((element) => {
      if (
        element[this.cpu.getJobProcessTimeKey(element)] <
        lowest[this.cpu.getJobProcessTimeKey(lowest)]
      )
        lowest = element
    })

    return lowest
  }
}

const handler = async (
  req: NextApiRequest & { [key: string]: any },
  res: NextApiResponse
): Promise<void> => {
  await runMiddleware(req, res, uploads.single("file"))

  const cpu = new CPU(null as any)

  cpu.algorithm = new ShortestRemainingAlgorithm(cpu)

  await cpu.readFromCsvFile(req.file)

  const cpuRes = cpu.run()

  res.send(cpuRes)
}

export default handler
