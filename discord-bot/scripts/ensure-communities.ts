/**
 * Ensure Communities Script
 * Ensures both Jupiter's Girth and Sherpa Hub communities exist in the database
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function ensureCommunities() {
  console.log("🔄 Ensuring communities exist...");

  // Ensure Jupiter's Girth
  const { data: jupiterData, error: jupiterError } = await supabase
    .from("communities")
    .upsert(
      {
        name: "Jupiter's Girth",
        anchor_discord_guild_id: "573823015511392268",
        connected_discord_guild_ids: ["1291190711919837234"],
      },
      {
        onConflict: "anchor_discord_guild_id",
      }
    )
    .select()
    .single();

  if (jupiterError) {
    console.error("❌ Error ensuring Jupiter's Girth:", jupiterError);
  } else {
    console.log("✅ Jupiter's Girth community:", jupiterData?.id);
  }

  // Ensure Sherpa Hub
  const { data: sherpaData, error: sherpaError } = await supabase
    .from("communities")
    .upsert(
      {
        name: "Sherpa Hub",
        anchor_discord_guild_id: "1291190711919837234",
        connected_discord_guild_ids: ["573823015511392268"],
      },
      {
        onConflict: "anchor_discord_guild_id",
      }
    )
    .select()
    .single();

  if (sherpaError) {
    console.error("❌ Error ensuring Sherpa Hub:", sherpaError);
  } else {
    console.log("✅ Sherpa Hub community:", sherpaData?.id);
  }

  // Verify both exist
  const { data: allCommunities, error: verifyError } = await supabase
    .from("communities")
    .select("id, name, anchor_discord_guild_id")
    .in("anchor_discord_guild_id", [
      "573823015511392268",
      "1291190711919837234",
    ]);

  if (verifyError) {
    console.error("❌ Error verifying communities:", verifyError);
    process.exit(1);
  }

  console.log("\n✅ Communities verified:");
  allCommunities?.forEach((comm) => {
    console.log(`   - ${comm.name} (${comm.anchor_discord_guild_id}): ${comm.id}`);
  });

  if (allCommunities?.length === 2) {
    console.log("\n✅ Both communities exist! Bot should work now.");
  } else {
    console.log(`\n⚠️  Expected 2 communities, found ${allCommunities?.length}`);
  }
}

ensureCommunities().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
