import axios from "axios"
import {
  Button,
  Card,
  FileInput,
  Label,
  Select,
  Table,
  TextInput,
} from "flowbite-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Task } from "../algorithms/base"
import { LoggedValue } from "../algorithms/cpu"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

export type ResponseType = {
  averageResponseTime: number
  totalTime: number
  utilization: number
  averageWaitingTime: number
  loggedValues: LoggedValue[]
  events: { eventName: string; task: Task | null; time: number }[]
  tasksList: string[]
}

const objColors = {
  idle: "the cpu was idle as there were no jobs available",
  arrivalTime: "has arrived",
  mine: "is executing",
  io: "is going to io",
  ioTime: "is coming back from io",
  finished: "is finished",
}

export default function Home() {
  const [loading, setLoading] = useState(false)

  const [timerValue, setTimerValue] = useState(0)

  const [result, setResult] = useState<ResponseType>({
    averageResponseTime: 0,
    averageWaitingTime: 0,
    loggedValues: [],
    utilization: 0,
    totalTime: 0,
    events: [],
    tasksList: [],
  })

  const [algorithm, setAlgorithm] = useState("")

  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      method: "round-rubin",
      file: null,
      period: 0,
      queuesTime: "",
    },
  })

  const onSubmit = (data: any) => {
    const formData = new FormData()

    formData.append("file", data.file[0])
    formData.append("method", data.method)
    formData.append("period", data.period)
    formData.append("queuesTime", data.queuesTime)
    setLoading(true)

    axios
      .post<ResponseType>("/api/" + data.method, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((res) => {
        setAlgorithm(data.method)
        setResult(res.data)
      })
      .finally(() => setLoading(false))
  }

  const method = watch("method")

  return (
    <div className="container mx-auto">
      <Card className="mt-20 p-5">
        <div className="">
          <form onSubmit={handleSubmit(onSubmit)} method="POST">
            <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
              <div>
                <Label value="Csv input file" />
                <FileInput required {...register("file")} />
              </div>
              <div>
                <Label value="Algorithm Method" />
                <Select required {...register("method")}>
                  <option value="round-rubin">Round Rubin</option>
                  <option value="shortest-remaining">Shortest Remaining</option>
                  <option value="shortest-job-first">Shortest Job First</option>
                  <option value="first-come-first-serve">
                    First come First serve
                  </option>
                  <option value="multi-level-feedback">
                    Multi Level Feedback
                  </option>
                </Select>
              </div>
              {method === "round-rubin" && (
                <div>
                  <Label value="Period Time" />
                  <TextInput
                    type="number"
                    required
                    placeholder="period (microseconds)"
                    key={1}
                    {...register("period")}
                  />
                </div>
              )}
              {method === "multi-level-feedback" && (
                <div>
                  <Label value="Queues timers" />
                  <TextInput
                    key={2}
                    required
                    placeholder="queues timer sceprated by comma"
                    {...register("queuesTime")}
                  />
                </div>
              )}
            </div>

            <div className="mt-20 text-right">
              <Button
                disabled={loading}
                type="submit"
                className="px-4 py-2 ml-auto"
              >
                Process
              </Button>
            </div>
          </form>
        </div>
      </Card>
      {!!result.totalTime && (
        <>
          <Card className="my-10">
            <h3 className="dark:text-gray-300">Algorithm Result</h3>
            <strong className="dark:text-gray-300">{algorithm}</strong>
            <div className="flex gap-3">
              <div className="flex-1">
                <Table>
                  <Table.Head>
                    <Table.HeadCell>Process Id</Table.HeadCell>
                    <Table.HeadCell>From</Table.HeadCell>
                    <Table.HeadCell>To</Table.HeadCell>
                  </Table.Head>
                  <Table.Body>
                    {result.loggedValues.map((item, index) => (
                      <Table.Row key={index}>
                        <Table.Cell>{item.processId}</Table.Cell>
                        <Table.Cell className="font-bold">
                          {item.from}
                        </Table.Cell>
                        <Table.Cell className="font-bold">{item.to}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>

              <div className="w-96">
                <input
                  placeholder="1231"
                  value={timerValue}
                  onChange={(e) => setTimerValue(Number(e.target.value))}
                  min={0}
                  max={result.totalTime}
                  type="range"
                  className="w-80 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="bg-gray-900 p-5 rounded-lg border border-gray-600 text-gray-100 mt-10 shadow">
                  <p>Second: {timerValue}</p>
                  <div>
                    <div>data: </div>
                    <div className="mt-5">
                      {result.events
                        .filter((key) => key.time === timerValue)
                        .map((event, key) => (
                          <div key={key} className="flex items-center">
                            <span className="ml-3">
                              {!!event.task && "Process: "}
                              {event.task?.processId}
                            </span>
                            <strong>
                              {(objColors as any)[event.eventName]}
                            </strong>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          <Card className="my-10">
            <h3 className="dark:text-gray-300">Algorithm Summary</h3>
            <div className="mt-4">
              <LineChart width={500} height={300} data={result.loggedValues}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="to" />
                <YAxis />
                <Tooltip />
                <Legend />
                {/* <Line type="monotone" dataKey="from" stroke="#8884d8" /> */}
                <Line type="monotone" dataKey="processId" stroke="#82ca9d" />
              </LineChart>
            </div>
          </Card>
          <Card className="my-10 dark:text-gray-300">
            <h3 className="font-bold">🛑Analyzing the Processes</h3>
            <div className="mt-5">
              <p>Average Response Time: {result.averageResponseTime}</p>
              <p>Average Waitting Time: {result.averageWaitingTime}</p>
              <p>CPU Utilization: {result.utilization}</p>
              <p>Total Execution Time: {result.totalTime}</p>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
