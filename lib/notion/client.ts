import "server-only";
import { Client } from "@notionhq/client";

export function createNotionClient() {
  const token = process.env.NOTION_API_KEY;
  if (!token) {
    throw new Error("Missing NOTION_API_KEY.");
  }
  return new Client({ auth: token });
}
