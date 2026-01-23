"use server";

import { fetchGuidesFromNotion } from "@/lib/notion/guides";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function syncNotionGuides() {
  const databaseId = process.env.NOTION_GUIDES_DATABASE_ID;
  if (!databaseId) {
    throw new Error("NOTION_GUIDES_DATABASE_ID is not set.");
  }

  const guides = await fetchGuidesFromNotion(databaseId);
  const supabase = createAdminClient();

  const { error } = await supabase.from("guides").upsert(
    guides.map((guide) => ({
      notion_id: guide.notionId,
      title: guide.title,
      tag: guide.tag,
      updated_at: guide.updatedAt,
      published: true,
    })),
    { onConflict: "notion_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/guides");
  revalidatePath("/protected");
}
