// Runs WAEL's optional AI brain (WebLLM) off the main thread, so the game keeps its frame rate while it thinks.
import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg: MessageEvent) => handler.onmessage(msg);
