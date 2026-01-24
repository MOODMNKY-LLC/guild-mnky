/**
 * Tool Registry
 * Centralized tool management with validation and execution
 */

import { z } from "zod";

export type ToolDef = {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
  run: (args: any) => Promise<any>;
};

export class ToolRegistry {
  private tools = new Map<string, ToolDef>();

  register(tool: ToolDef) {
    this.tools.set(tool.name, tool);
  }

  listForOpenAI() {
    return Array.from(this.tools.values()).map((t) => ({
      type: "function",
      name: t.name,
      description: t.description,
      // Minimal JSON schema - can be enhanced with zod-to-json-schema later
      parameters: { type: "object" },
    }));
  }

  async exec(name: string, args: any) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    const parsed = tool.schema.parse(args);
    return tool.run(parsed);
  }
}
