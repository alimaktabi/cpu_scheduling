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

export class FirstComeFirstServeAlgorithm extends BaseAlgorithm {
  public dispatch(): Task {
    return this.availableTasks[0]
  }
}

const handler = async (
  req: NextApiRequest & { [key: string]: any },
  res: NextApiResponse
): Promise<void> => {
  await runMiddleware(req, res, uploads.single("file"))

  const cpu = new Scheduler(null as any)

  cpu.algorithm = new FirstComeFirstServeAlgorithm(cpu)

  await cpu.readFromCsvFile(req.file)

  const cpuRes = cpu.run()

  res.send(cpuRes)
}

export default handler
