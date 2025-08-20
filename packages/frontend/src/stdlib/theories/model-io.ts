// model-io.ts (signed-only)
import {
    elaborateModel,
    currentVersion,
    ThSignedCategory,
    type DblModel,
    type ModelJudgment,
    type Ob,
    type ObType,
    type Mor,
    type MorType,
    type DblTheory,
} from "catlog-wasm";

/** Locked to signed-only for POC. */
export type TheoryKey = "signed";

/** Cloneable snapshot that can be posted to workers or saved. */
export interface SerializedDblModel {
    /** Wasm crate version for sanity checks/migrations. */
    version: string;
    /** Always "signed" in this file. */
    theory: TheoryKey;
    /** Judgments sufficient to rebuild the model. */
    judgments: ModelJudgment[];
}

/** Convert a live DblModel → cloneable JSON (judgments). */
export function serializeDblModel(model: DblModel): SerializedDblModel {
    const judgments: ModelJudgment[] = [];

    // Objects -> ObDecl judgments
    for (const ob of model.objects()) {
        const id = ob.tag === "Basic" ? ob.content : genId("ob"); // Basic expected
        const obType: ObType = model.obType(ob);
        judgments.push({ tag: "object", id, name: id, obType });
    }

    // Morphisms -> MorDecl judgments
    for (const mor of model.morphisms()) {
        const id = mor.tag === "Basic" ? mor.content : genId("mor"); // Basic expected
        const morType: MorType = model.morType(mor);
        const dom: Ob | null = model.getDom(id) ?? null;
        const cod: Ob | null = model.getCod(id) ?? null;
        judgments.push({ tag: "morphism", id, name: id, morType, dom, cod });
    }

    return { version: safeVersion(), theory: "signed", judgments };
}

/**
 * Rebuild a fresh DblModel from JSON using the EXACT theory instance
 * you will later analyze with (pointer identity must match).
 */
export function deserializeDblModelWithTheory(
    serial: SerializedDblModel,
    theory: DblTheory
): DblModel {
    // serial.theory is always "signed" here; caller picks the actual instance.
    return elaborateModel(serial.judgments, theory);
}

/** Convenience: create (or reuse) a local signed theory instance. */
export function getSignedTheory(): DblTheory {
    return new ThSignedCategory().theory();
}

/** Utility: stable version string, guarded (older builds may not export it). */
function safeVersion(): string {
    try {
        return currentVersion();
    } catch {
        return "unknown";
    }
}

/** Only used if a non-basic sneaks in (shouldn’t, given .objects()/.morphisms()). */
function genId(prefix: "ob" | "mor"): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}