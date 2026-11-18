// Supabase Edge Function: restore-record
// Secure server-side execution: retrieves clean backup from college-records-backups,
// validates SHA-256 hash, and restores the original file into college-records-originals.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { backupId, operator = "Disaster Recovery Administrator" } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch backup metadata
    const { data: backup, error: bkpError } = await supabase
      .from("backups")
      .select("*")
      .eq("id", backupId)
      .single();

    if (bkpError || !backup) {
      throw new Error(`Backup record not found: ${bkpError?.message}`);
    }

    // 2. Download snapshot from 'college-records-backups'
    const { data: backupBlob, error: downloadError } = await supabase.storage
      .from("college-records-backups")
      .download(backup.backup_storage_path);

    if (downloadError || !backupBlob) {
      throw new Error(`Failed to download backup archive: ${downloadError?.message}`);
    }

    const buffer = await backupBlob.arrayBuffer();

    // 3. Cryptographically verify SHA-256
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const liveSha256 = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const isMatch = liveSha256 === backup.backup_hash;
    if (!isMatch) {
      throw new Error(
        `Critical integrity mismatch! Backup archive hash (${liveSha256}) does not match registered baseline (${backup.backup_hash}).`
      );
    }

    // 4. Restore file into 'college-records-originals' bucket
    const originalStoragePath = `originals/${backup.file_id}/${backup.file_name}`;
    const { error: uploadError } = await supabase.storage
      .from("college-records-originals")
      .upload(originalStoragePath, backupBlob, {
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to restore file to originals storage: ${uploadError.message}`);
    }

    // 5. Update public.files record
    await supabase
      .from("files")
      .update({
        storage_path: originalStoragePath,
        file_size: backupBlob.size,
        sha256_hash: liveSha256,
        backup_status: "Backed Up",
        is_deleted: false,
        deleted_at: null,
        tampered: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", backup.file_id);

    // 6. Record disaster recovery audit event
    const { data: recoveryLog, error: recoveryError } = await supabase
      .from("recovery_logs")
      .insert({
        file_id: backup.file_id,
        backup_id: backup.id,
        file_name: backup.file_name,
        category: backup.category,
        department: backup.department,
        recovery_status: "SUCCESS",
        restored_by: operator,
        integrity_verified: true,
        details: `Restored from cloud backup v${backup.version}. SHA-256 integrity match confirmed: ${liveSha256.substring(0, 16)}...`,
      })
      .select()
      .single();

    if (recoveryError) {
      throw new Error(`Failed to log recovery record: ${recoveryError.message}`);
    }

    // 7. Activity Log
    await supabase.from("activity_logs").insert({
      action: "FILE_RESTORATION",
      file_name: backup.file_name,
      description: `Restored record '${backup.file_name}' from backup v${backup.version}`,
      status: "SUCCESS",
      operator,
      details: `Reconstituted to college-records-originals/${originalStoragePath}. Integrity Verified: 100%`,
    });

    return new Response(
      JSON.stringify({
        status: "SUCCESS",
        message: "Record successfully restored to originals storage bucket.",
        recoveryLog,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
