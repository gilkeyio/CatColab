// worker.ts
import * as Comlink from "comlink";

import type { WorkerAPI, ModelHandle, TheorySpec } from "./worker-contract";
import { DblModel, DblTheory, ThEmpty, ThSchema, ThNullableSignedCategory, ThSignedCategory, ThSymMonoidalCategory, elaborateModel } from "catlog-wasm";

// --- internal registry ---
type Id = number;
let nextId = 0;
const models = new Map<Id, DblModel>();
const toHandle = (id: Id) => id as unknown as ModelHandle;
const fromHandle = (h: ModelHandle) => h as unknown as Id;

// Build a DblTheory from a serializable spec
function buildTheory(spec: TheorySpec): DblTheory {
    switch (spec.kind) {
        case "empty": return new ThEmpty().theory();
        case "schema": return new ThSchema().theory();
        case "nullableSigned": return new ThNullableSignedCategory().theory();
        case "signed": return new ThSignedCategory().theory();
        case "symMonoidal": return new ThSymMonoidalCategory().theory();
    }
}

const api: WorkerAPI = {
    async makeModel(judgments: any[], theory: TheorySpec): Promise<ModelHandle> {
        const dblTheory = buildTheory(theory);
        const model = elaborateModel(judgments, dblTheory);
        const id = ++nextId;
        models.set(id, model);
        return toHandle(id);
    },

    async dispose(handle) {
        const id = fromHandle(handle);
        const m = models.get(id);
        if (m) {
            m.free?.();
            models.delete(id);
        }
    },
};

Comlink.expose(api);