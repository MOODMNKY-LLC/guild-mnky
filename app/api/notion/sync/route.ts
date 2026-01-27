import { NextResponse } from "next/server";
import { fetchGuidesFromNotion, type NotionGuide } from "@/lib/notion/guides";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const secret = process.env.NOTION_SYNC_SECRET;
  const databaseId = process.env.NOTION_GUIDES_DATABASE_ID;

  if (secret) {
    const header = request.headers.get("x-sync-secret");
    if (header !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!databaseId) {
    return NextResponse.json(
      { error: "NOTION_GUIDES_DATABASE_ID is not set." },
      { status: 400 },
    );
  }

  const guides = await fetchGuidesFromNotion(databaseId);
  const supabase = createAdminClient();

  const { error } = await supabase.from("guides").upsert(
    guides.map((guide: NotionGuide) => ({
      notion_id: guide.notionId,
      title: guide.title,
      tag: guide.tag,
      updated_at: guide.updatedAt,
      published: true,
    })) as any,
    { onConflict: "notion_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ synced: guides.length });
}
