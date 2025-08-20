import { wrap } from "comlink";
import {
    ThSignedCategory,
    elaborateModel,
    type DblModel,
    type ModelJudgment,
    type MotifsOptions,
} from "catlog-wasm";
import type { LoopsWorkerAPI } from "./loops.worker";

type SerializedDblModel = {
    theory: "signed";
    judgments: ModelJudgment[];
};

// Stable main-thread theory instance (pointer identity used for re-elaboration)
const thSignedMain = new ThSignedCategory();

const norm = (o: MotifsOptions): MotifsOptions => ({
    maxPathLength: typeof o?.maxPathLength === "number" ? o.maxPathLength : null,
});

let remote: import("comlink").Remote<LoopsWorkerAPI> | null = null;

function getRemote() {
    if (remote) return remote;
    const w = new Worker(new URL("./loops.worker.ts", import.meta.url), { type: "module" });
    remote = wrap<LoopsWorkerAPI>(w);
    return remote;
}

// Serialize a live DblModel on main
export function serializeDblModel(model: DblModel): SerializedDblModel {
    const judgments: ModelJudgment[] = [];
    for (const ob of model.objects()) {
        const id = ob.tag === "Basic" ? ob.content : crypto.randomUUID();
        judgments.push({ tag: "object", id, name: id, obType: model.obType(ob) });
    }
    for (const mor of model.morphisms()) {
        const id = mor.tag === "Basic" ? mor.content : crypto.randomUUID();
        judgments.push({
            tag: "morphism",
            id,
            name: id,
            morType: model.morType(mor),
            dom: model.getDom(id) ?? null,
            cod: model.getCod(id) ?? null,
        });
    }
    return { theory: "signed", judgments };
}

export async function positiveLoopsWorker(
    serial: SerializedDblModel,
    opts: MotifsOptions
): Promise<DblModel[]> {
    const api = getRemote();
    const res = await api.positiveLoops(serial, norm(opts));
    if (!res.ok) return []; // or throw with res.errors
    // Rebuild loop models with the SAME main-thread theory instance
    return res.loops.map(s => elaborateModel(s.judgments, thSignedMain.theory()));
}