// Supabase Edge Function: backup-record
// Secure server-side execution: reads original file from college-records-originals,
// computes SHA-256 hash, and transfers an independent snapshot to college-records-backups.

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
    const { fileId, backupType = "MANUAL", operator = "Administrator" } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch file metadata from PostgreSQL
    const { data: file, error: fileError } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (fileError || !file) {
      throw new Error(`File record not found: ${fileError?.message}`);
    }

    // 2. Download original file from 'college-records-originals' bucket
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("college-records-originals")
      .download(file.storage_path);

    if (downloadError || !fileBlob) {
      throw new Error(`Failed to retrieve original file: ${downloadError?.message}`);
    }

    const fileBuffer = await fileBlob.arrayBuffer();

    // 3. Compute cryptographic SHA-256 hash using Web Crypto API
    const hashBuffer = await crypto.subtle.digest("SHA-256", fileBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const liveSha256 = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // 4. Check existing backups for duplicate prevention
    const { data: existingBackups } = await supabase
      .from("backups")
      .select("*")
      .eq("file_id", fileId)
      .order("created_at", { ascending: false });

    const latestBackup = existingBackups && existingBackups[0];
    if (latestBackup && latestBackup.backup_hash === liveSha256) {
      return new Response(
        JSON.stringify({
          status: "SKIPPED",
          message: `Identical backup v${latestBackup.version} already exists with identical SHA-256 hash.`,
          version: latestBackup.version,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nextVersion = latestBackup ? latestBackup.version + 1 : 1;
    const backupStoragePath = `backups/${file.id}/v${nextVersion}_${file.file_name}`;

    // 5. Upload independent snapshot to 'college-records-backups' bucket
    const { error: uploadError } = await supabase.storage
      .from("college-records-backups")
      .upload(backupStoragePath, fileBlob, {
        contentType: file.file_type,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload to backups bucket: ${uploadError.message}`);
    }

    // 6. Record backup record in PostgreSQL
    const { data: backupRecord, error: insertBackupError } = await supabase
      .from("backups")
      .insert({
        file_id: file.id,
        file_name: file.file_name,
        category: file.category,
        department: file.department,
        version: nextVersion,
        backup_storage_path: backupStoragePath,
        backup_size: fileBlob.size,
        backup_hash: liveSha256,
        backup_type: backupType,
        status: "SUCCESS",
        notes: `${backupType} backup archive v${nextVersion} created by ${operator}`,
      })
      .select()
      .single();

    if (insertBackupError) {
      throw new Error(`Failed to record backup metadata: ${insertBackupError.message}`);
    }

    // 7. Update original file status in PostgreSQL
    await supabase
      .from("files")
      .update({
        backup_status: "Backed Up",
        tampered: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", file.id);

    // 8. Add immutable audit log entry
    await supabase.from("activity_logs").insert({
      action: backupType === "AUTOMATIC" ? "AUTO_BACKUP" : "MANUAL_BACKUP",
      file_name: file.file_name,
      description: `Created ${backupType.toLowerCase()} cloud backup v${nextVersion} for '${file.file_name}'`,
      status: "SUCCESS",
      operator,
      details: `Target: college-records-backups/${backupStoragePath} | SHA-256: ${liveSha256.substring(0, 16)}...`,
    });

    return new Response(
      JSON.stringify({
        status: "SUCCESS",
        backup: backupRecord,
        version: nextVersion,
        hash: liveSha256,
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
