import axios from "axios";
import { useForm } from "react-hook-form";

export default function Home() {
  const { register, handleSubmit, watch } = useForm();

  const onSubmit = (data: any) => {
    const formData = new FormData();

    formData.append("file", data.file[0]);
    formData.append("method", data.method);
    formData.append("period", data.period);

    axios.post("/api/round-rubin", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  };

  return (
    <div className="px-10">
      <h3 className="text-bold font-lg">CPU Algorithms </h3>
      <div className="flex mt-52 align-center justify-center">
        <form className="" onSubmit={handleSubmit(onSubmit)} method="POST">
          <input type="file" {...register("file")} />
          <select {...register("method")}>
            <option value="round-rubin">Round Rubin</option>
            <option value="fcfs">First come First serve</option>
          </select>
          {watch("method") === "round-rubin" && (
            <input
              type="number"
              className="ml-5"
              placeholder="period (microseconds)"
              {...register("period")}
            />
          )}
          <div className="mt-6">
            <button type="submit" className="px-4 py-2 rounded bg-gray-500">
              Process
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
