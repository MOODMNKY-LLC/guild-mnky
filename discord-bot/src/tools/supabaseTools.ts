/**
 * Supabase Tools
 * Voice-accessible tools that integrate with existing bot functionality
 */

import { z } from "zod";
import { supabase } from "../utils/database.js";
import type { ToolRegistry } from "./registry.js";

export function registerSupabaseTools(reg: ToolRegistry, communityId: string) {
  // Query Sherpa sessions
  reg.register({
    name: "query_sherpa_sessions",
    description: "Query Sherpa sessions from the database. Use status 'upcoming', 'past', or 'active'.",
    schema: z.object({
      status: z.enum(["upcoming", "past", "active"]).optional(),
      limit: z.number().int().min(1).max(50).default(10),
    }),
    run: async ({ status, limit }) => {
      try {
        let query = supabase
          .from("sherpa_sessions")
          .select("*")
          .eq("community_id", communityId)
          .limit(limit)
          .order("scheduled_time", { ascending: false });

        const now = new Date().toISOString();
        if (status === "upcoming") {
          query = query.gt("scheduled_time", now);
        } else if (status === "past") {
          query = query.lt("scheduled_time", now);
        } else if (status === "active") {
          query = query.eq("status", "active");
        }

        const { data, error } = await query;
        if (error) throw error;

        return {
          ok: true,
          count: data?.length || 0,
          sessions: data || [],
        };
      } catch (error: any) {
        return {
          ok: false,
          error: error.message || "Database query failed",
        };
      }
    },
  });

  // Get Sherpa profile
  reg.register({
    name: "get_sherpa_profile",
    description: "Get a Sherpa's profile information by Discord user ID or profile ID",
    schema: z.object({
      userId: z.string().optional(),
      profileId: z.string().optional(),
    }),
    run: async ({ userId, profileId }) => {
      try {
        if (!userId && !profileId) {
          return { ok: false, error: "Either userId or profileId required" };
        }

        let query = supabase.from("sherpas").select("*").eq("community_id", communityId);

        if (profileId) {
          query = query.eq("profile_id", profileId);
        } else if (userId) {
          // First get profile_id from profiles table
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("discord_user_id", userId)
            .eq("community_id", communityId)
            .single();

          if (!profile) {
            return { ok: false, error: "Profile not found" };
          }

          query = query.eq("profile_id", profile.id);
        }

        const { data, error } = await query.single();
        if (error) throw error;

        return { ok: true, sherpa: data };
      } catch (error: any) {
        return {
          ok: false,
          error: error.message || "Failed to get Sherpa profile",
        };
      }
    },
  });

  // Health check tool
  reg.register({
    name: "ping",
    description: "Health check tool that returns pong",
    schema: z.object({}),
    run: async () => {
      return { ok: true, pong: true, timestamp: new Date().toISOString() };
    },
  });
}
