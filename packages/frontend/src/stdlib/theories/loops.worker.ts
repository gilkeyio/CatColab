/// <reference lib="webworker" />
import { expose } from "comlink";
import {
    set_panic_hook,
    elaborateModel,
    ThSignedCategory,
    type MotifsOptions,
    type ModelJudgment,
} from "catlog-wasm";

set_panic_hook();

// One stable theory instance inside the worker
const thSigned = new ThSignedCategory();

type SerializedDblModel = {
    theory: "signed";
    judgments: ModelJudgment[];
};

const norm = (o?: Partial<MotifsOptions>): MotifsOptions => ({
    maxPathLength: typeof o?.maxPathLength === "number" ? o.maxPathLength : null,
});

// Convert a DblModel -> judgments
function toJudgments(model: import("catlog-wasm").DblModel): ModelJudgment[] {
    const out: ModelJudgment[] = [];
    for (const ob of model.objects()) {
        const id = ob.tag === "Basic" ? ob.content : crypto.randomUUID();
        out.push({ tag: "object", id, name: id, obType: model.obType(ob) });
    }
    for (const mor of model.morphisms()) {
        const id = mor.tag === "Basic" ? mor.content : crypto.randomUUID();
        out.push({
            tag: "morphism",
            id,
            name: id,
            morType: model.morType(mor),
            dom: model.getDom(id) ?? null,
            cod: model.getCod(id) ?? null,
        });
    }
    return out;
}

const api = {
    // Input: serialized base model
    // Output: array of serialized loop models (cloneable JSON)
    async positiveLoops(base: SerializedDblModel, options?: Partial<MotifsOptions>) {
        const model = elaborateModel(base.judgments, thSigned.theory());

        const v = model.validate();
        if (v.tag === "Err") {
            return { ok: false as const, errors: v.content };
        }

        const loops = thSigned.positiveLoops(model, norm(options));
        const loopsSerialized: SerializedDblModel[] = loops.map(loop => ({
            theory: "signed",
            judgments: toJudgments(loop),
        }));

        return { ok: true as const, loops: loopsSerialized };
    },
};

export type LoopsWorkerAPI = typeof api;
expose(api);