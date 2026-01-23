import { createNotionClient } from "@/lib/notion/client";

export type NotionGuide = {
  notionId: string;
  title: string;
  tag: string | null;
  updatedAt: string;
};

function getTitleFromProperties(properties: Record<string, any>) {
  const titleProperty = Object.values(properties).find(
    (property) => property?.type === "title",
  );

  if (!titleProperty || !titleProperty.title) {
    return "Untitled";
  }

  return titleProperty.title.map((part: any) => part.plain_text).join("");
}

function getTagFromProperties(properties: Record<string, any>) {
  const tagProperty = Object.values(properties).find((property) =>
    ["select", "multi_select"].includes(property?.type),
  );

  if (!tagProperty) {
    return null;
  }

  if (tagProperty.type === "select") {
    return tagProperty.select?.name ?? null;
  }

  if (tagProperty.type === "multi_select") {
    return tagProperty.multi_select?.[0]?.name ?? null;
  }

  return null;
}

export async function fetchGuidesFromNotion(databaseId: string): Promise<NotionGuide[]> {
  const notion = createNotionClient();

  const response = await (notion.databases as any).query({
    database_id: databaseId,
    filter: {
      property: "Published",
      checkbox: { equals: true },
    },
    sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
  });

  return response.results.map((page: any): NotionGuide => {
    const title = getTitleFromProperties(page.properties ?? {});
    const tag = getTagFromProperties(page.properties ?? {});

    return {
      notionId: page.id,
      title,
      tag,
      updatedAt: page.last_edited_time,
    } satisfies NotionGuide;
  });
}
