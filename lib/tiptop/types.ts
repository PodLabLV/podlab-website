// The UI message type the panel renders and the route streams. Type-only import
// of the server tool set: erased at compile time, so the browser bundle never
// pulls in the tools.

import type { InferUITools, UIDataTypes, UIMessage } from 'ai';
import type { TipTopTools } from './tools';

export type TipTopUIMessage = UIMessage<unknown, UIDataTypes, InferUITools<TipTopTools>>;
