/**
 * Tool Policy
 * Safety controls for tool execution
 */

export const ToolPolicy = {
  web: {
    allowedHosts: (process.env.WEB_ALLOWED_HOSTS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    maxBytes: 350_000,
    timeoutMs: 8_000,
  },
  mcp: {
    allowedBaseUrls: (process.env.MCP_ALLOWED_BASEURLS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    timeoutMs: 10_000,
  },
};
