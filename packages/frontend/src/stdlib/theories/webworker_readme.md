## Limitations of the POC here

Right now, our model-io.ts layer is doing a lot of heavy lifting just to move data back and forth. Every time the UI thread wants to call into Rust, we end up serializing and deserializing DblModels so they can cross the boundary into the worker. That’s workable, but it introduces overhead and complexity.

### Core Question

The real question is whether we actually need to expose Rust models directly in most of the TypeScript code. If the UI only ever consumes data that originates from Rust, then carrying around wasm-backed objects in the main thread may not make sense.

### The strategy 

Instead of shuttling Rust objects between the UI and workers, we could push all Rust logic into the worker and make the TypeScript side operate purely on well-defined, serializable types. In other words:
	•	Treat the worker as the single source of truth for all model operations.
	•	Define a stable TypeScript API (essentially an interface/contract) that describes what the UI can ask the worker to do and what shape of data it gets back.
	•	Keep DblModel and friends fully encapsulated inside Rust/wasm. The UI should never need to hold them directly—just structured responses (objects, morphisms, validation results, loop analyses, etc.).

This way, serialization isn’t a hack we tolerate, it’s the intentional contract. The UI becomes thinner and simpler, while all the heavyweight logic (and memory management) lives where it belongs—in Rust inside the worker.

### Caveats / Considerations

Everywhere that we are calling WASM code synchronously will need to be converted to async. From a UI perspective we would want to make sure that there is an indication while we are waiting for something to load. It might be nice to include a single, shared way of handling starting a long task, waiting for a long task, and completing a long task. Probably the "client" to the webworker would use an async iterable