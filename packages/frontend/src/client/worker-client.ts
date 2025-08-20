import * as Comlink from "comlink";
import type { WorkerAPI } from "./worker-contract";

// spin up the worker
const worker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
});

// wrap with Comlink proxy
export const workerAPI = Comlink.wrap<WorkerAPI>(worker);

