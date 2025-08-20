type AsyncFn<Args extends unknown[], Ret> = (...args: Args) => Promise<Ret>;

export type ModelHandle = { readonly __brand: unique symbol };

export type TheorySpec =
    | { kind: "empty" }
    | { kind: "schema" }
    | { kind: "nullableSigned" }
    | { kind: "signed" }
    | { kind: "symMonoidal" };

export type WorkerAPI = {
    makeModel: AsyncFn<[judgments: unknown[], theorySpec: TheorySpec], ModelHandle>;
    dispose: AsyncFn<[handle: ModelHandle], void>;
};

