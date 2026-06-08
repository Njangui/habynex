import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ─────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PUSH_SERVICE_URL = Deno.env.get("PUSH_SERVICE_URL") || "https://habynex-push-service.onrender.com";
const MAX_RETRIES = 5;
const BASE_DELAY = 2000; // ms
const CONCURRENCY_LIMIT = 5;

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface PushJob {
  id: string;
  userId: string;
  type: "document_verification" | "welcome" | "owner_report" | "account_action";
  payload: NotificationPayload;
  attempts: number;
  createdAt: number;
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, any>;
  actions?: Array<{ action: string; title: string }>;
}

interface AdminInfo {
  user_id: string;
  full_name: string | null;
  language: string | null;
  notification_preferences: {
    push_document_verification?: boolean;
    push_admin_alerts?: boolean;
    push_account?: boolean;
    push_marketing?: boolean;
    quiet_hours_enabled?: boolean;
    quiet_hours_start?: string;
    quiet_hours_end?: string;
  } | null;
}

// ─────────────────────────────────────────────
// VALIDATION SCHEMAS
// ─────────────────────────────────────────────

const documentVerificationSchema = z.object({
  userId: z.string().uuid(),
  documentType: z.enum(["passport", "id_card", "driver_license", "proof_of_address", "other"]),
  submissionId: z.string().uuid(),
  metadata: z.record(z.any()).optional(),
});

const accountActionSchema = z.object({
  userId: z.string().uuid(),
  actionType: z.enum(["document_approved", "document_rejected", "account_verified", "kyc_completed"]),
  payload: z.object({
    title: z.string(),
    body: z.string(),
    icon: z.string().optional(),
    badge: z.string().optional(),
    tag: z.string().optional(),
    requireInteraction: z.boolean().optional(),
    data: z.record(z.any()).optional(),
    actions: z.array(z.object({
      action: z.string(),
      title: z.string()
    })).optional(),
  }),
});

const welcomeSchema = z.object({
  userId: z.string().uuid(),
  language: z.enum(["fr", "en"]).optional(),
});

const ownerReportSchema = z.object({
  userId: z.string().uuid(),
  reportType: z.string(),
  propertyId: z.string().uuid().optional(),
  payload: z.object({
    title: z.string(),
    body: z.string(),
    data: z.record(z.any()).optional(),
  }),
});

// ─────────────────────────────────────────────
// QUEUE AVEC CONCURRENCE CONTRÔLÉE
// ─────────────────────────────────────────────

class PushQueue {
  private queue: PushJob[] = [];
  private processing = false;
  private activeJobs = 0;

  add(job: Omit<PushJob, "id" | "attempts" | "createdAt">): string {
    const fullJob: PushJob = {
      ...job,
      id: crypto.randomUUID(),
      attempts: 0,
      createdAt: Date.now(),
    };
    this.queue.push(fullJob);
    this.process();
    return fullJob.id;
  }

  private async process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 || this.activeJobs > 0) {
      while (this.activeJobs < CONCURRENCY_LIMIT && this.queue.length > 0) {
        const job = this.queue.shift();
        if (job) {
          this.activeJobs++;
          this.executeJob(job).finally(() => {
            this.activeJobs--;
          });
        }
      }
      await new Promise((r) => setTimeout(r, 10));
    }

    this.processing = false;
  }

  private async executeJob(job: PushJob) {
    try {
      await this.sendPushNotification(job);
      console.log(`[push-queue] Job ${job.id} completed successfully`);
    } catch (error: any) {
      job.attempts++;

      if (job.attempts < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, job.attempts);
        console.log(`[push-queue] Job ${job.id} failed, retry ${job.attempts}/${MAX_RETRIES} in ${delay}ms`);

        setTimeout(() => {
          this.queue.push(job);
          this.process();
        }, delay);
      } else {
        console.error(`[push-queue] Job ${job.id} failed permanently after ${MAX_RETRIES} attempts`);
        await this.logFailedJob(job, error.message);
      }
    }
  }

  private async sendPushNotification(job: PushJob) {
    const supabase = getSupabaseClient();

    // 1. Récupérer les subscriptions
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", job.userId);

    if (!subs?.length) {
      throw new Error("NO_SUBSCRIPTIONS");
    }

    const subscriptions = subs.map((s) => ({
      endpoint: s.endpoint,
      keys: { p256dh: s.p256dh, auth: s.auth },
    }));

    // 2. Appeler le service de rendu push
    const response = await fetch(`${PUSH_SERVICE_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscriptions,
        payload: job.payload,
      }),
    });

    if (!response.ok) {
      throw new Error(`PUSH_SERVICE_ERROR: ${response.status}`);
    }

    const result = await response.json();

    // 3. Nettoyer les subscriptions expirées
    const expired = result.details?.filter((d: any) => d.expired)?.map((d: any) => d.endpoint);

    if (expired?.length) {
      await supabase.from("push_subscriptions").delete().in("endpoint", expired);
    }

    // 4. Logger dans l'historique
    await supabase.from("notification_history").insert({
      user_id: job.userId,
      type: job.type,
      title: job.payload.title,
      content: job.payload.body,
      metadata: {
        ...job.payload.data,
        channels: ["push"],
        render_result: result,
      },
      created_at: new Date().toISOString(),
    });

    return result.successful > 0;
  }

  private async logFailedJob(job: PushJob, error: string) {
    const supabase = getSupabaseClient();
    await supabase.from("failed_push_jobs").insert({
      job_id: job.id,
      user_id: job.userId,
      type: job.type,
      payload: job.payload,
      error,
      attempts: job.attempts,
      created_at: new Date().toISOString(),
    }).catch(console.error);
  }
}

// Singleton
const pushQueue = new PushQueue();

// ─────────────────────────────────────────────
// SUPABASE CLIENT
// ─────────────────────────────────────────────

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

// ─────────────────────────────────────────────
// LOGIQUE DOCUMENT VERIFICATION (ADMIN)
// ─────────────────────────────────────────────

async function handleDocumentVerification(data: z.infer<typeof documentVerificationSchema>) {
  const supabase = getSupabaseClient();
  const { userId, documentType, submissionId, metadata } = data;

  console.log(`[document-verification] Processing submission ${submissionId}`);

  // 1. Récupérer le soumetteur
  const { data: submitter, error: submitterError } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("user_id", userId)
    .single();

  if (submitterError || !submitter) {
    throw new Error(`Submitter not found: ${submitterError?.message}`);
  }

  // 2. Récupérer les IDs admin
  const { data: adminRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  const adminIds = adminRoles?.map(r => r.user_id) || [];
  
  if (adminIds.length === 0) {
    return { success: true, message: "No admins found", count: 0 };
  }

  // 3. Récupérer les admins actifs avec préférences
  const { data: admins, error: adminError } = await supabase
    .from("profiles")
    .select(`
      user_id,
      full_name,
      language,
      notification_preferences!inner (
        push_document_verification,
        quiet_hours_enabled,
        quiet_hours_start,
        quiet_hours_end
      )
    `)
    .eq("is_active", true)
    .in("user_id", adminIds);

  if (adminError) throw new Error(`Failed to fetch admins: ${adminError.message}`);
  if (!admins?.length) {
    return { success: true, message: "No active admins to notify", count: 0 };
  }

  // 4. Créer les jobs pour chaque admin éligible
  let queuedCount = 0;
  let skippedCount = 0;

  for (const admin of admins as AdminInfo[]) {
    const prefs = admin.notification_preferences;

    // Vérifier préférences push
    if (prefs?.push_document_verification === false) {
      skippedCount++;
      continue;
    }

    // Vérifier heures silencieuses
    if (isQuietHours(prefs)) {
      skippedCount++;
      continue;
    }

    // Construire le payload
    const isFr = admin.language !== "en";
    const notificationId = `doc-${submissionId}-${admin.user_id}`;

    const jobId = pushQueue.add({
      userId: admin.user_id,
      type: "document_verification",
      payload: {
        title: isFr ? "📄 Nouveau document à vérifier" : "📄 New document to verify",
        body: isFr
          ? `${submitter.full_name} a soumis un ${formatDocumentType(documentType, "fr")}`
          : `${submitter.full_name} submitted a ${formatDocumentType(documentType, "en")}`,
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        tag: `document_verification-${notificationId}`,
        requireInteraction: true,
        data: {
          type: "document_verification",
          notificationId,
          submissionId,
          documentType,
          submitterName: submitter.full_name,
          submitterEmail: submitter.email,
          hasDocument: true,
          url: `/admin/documents/${submissionId}`,
          timestamp: new Date().toISOString(),
          ...metadata,
        },
        actions: [
          { action: "view", title: isFr ? "👁️ Vérifier" : "👁️ Review" },
          { action: "dismiss", title: isFr ? "✓ Lu" : "✓ Read" },
        ],
      },
    });

    queuedCount++;
    console.log(`[document-verification] Queued job ${jobId} for admin ${admin.user_id}`);
  }

  return {
    success: true,
    submissionId,
    totalAdmins: admins.length,
    queued: queuedCount,
    skipped: skippedCount,
  };
}

// ─────────────────────────────────────────────
// LOGIQUE ACCOUNT ACTION (UTILISATEUR)
// ─────────────────────────────────────────────

async function handleAccountAction(data: z.infer<typeof accountActionSchema>) {
  const { userId, actionType, payload } = data;

  console.log(`[account-action] Processing ${actionType} for user ${userId}`);

  // Vérifier si l'utilisateur a des subscriptions actives
  const supabase = getSupabaseClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (!subs?.length) {
    return { 
      success: false, 
      message: "User has no active push subscriptions",
      queued: 0 
    };
  }

  // Ajouter des données spécifiques selon le type d'action
  const enhancedData = {
    ...payload.data,
    actionType,
    userId,
    timestamp: new Date().toISOString(),
  };

  const jobId = pushQueue.add({
    userId,
    type: "account_action",
    payload: {
      ...payload,
      data: enhancedData,
    },
  });

  return {
    success: true,
    jobId,
    actionType,
    userId,
    queued: 1,
  };
}

// ─────────────────────────────────────────────
// LOGIQUE WELCOME (NOUVELLE SUBSCRIPTION)
// ─────────────────────────────────────────────

async function handleWelcome(data: z.infer<typeof welcomeSchema>) {
  const { userId, language } = data;
  
  console.log(`[welcome] Sending welcome notification to ${userId}`);

  const supabase = getSupabaseClient();
  
  // Récupérer la langue du profil si non spécifiée
  let userLang = language;
  if (!userLang) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("language")
      .eq("user_id", userId)
      .single();
    userLang = profile?.language || "fr";
  }

  const isFr = userLang === "fr";

  const jobId = pushQueue.add({
    userId,
    type: "welcome",
    payload: {
      title: isFr ? "👋 Bienvenue sur Habynex !" : "👋 Welcome to Habynex!",
      body: isFr
        ? "Vous recevrez maintenant les alertes importantes sur vos biens et documents."
        : "You will now receive important alerts about your properties and documents.",
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      tag: "welcome-notification",
      requireInteraction: false,
      data: {
        type: "welcome",
        url: "/dashboard",
        timestamp: new Date().toISOString(),
      },
      actions: [
        { 
          action: "explore", 
          title: isFr ? "🏠 Explorer" : "🏠 Explore" 
        },
        { 
          action: "dismiss", 
          title: "✓ OK" 
        },
      ],
    },
  });

  return {
    success: true,
    jobId,
    userId,
    language: userLang,
    queued: 1,
  };
}

// ─────────────────────────────────────────────
// LOGIQUE OWNER REPORT (PROPRIÉTAIRE)
// ─────────────────────────────────────────────

async function handleOwnerReport(data: z.infer<typeof ownerReportSchema>) {
  const { userId, reportType, propertyId, payload } = data;
  
  console.log(`[owner-report] Sending ${reportType} to owner ${userId}`);

  const jobId = pushQueue.add({
    userId,
    type: "owner_report",
    payload: {
      ...payload,
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      tag: `owner-report-${reportType}-${propertyId || "general"}`,
      data: {
        ...payload.data,
        reportType,
        propertyId,
        timestamp: new Date().toISOString(),
      },
    },
  });

  return {
    success: true,
    jobId,
    userId,
    reportType,
    queued: 1,
  };
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function isQuietHours(prefs: AdminInfo["notification_preferences"]): boolean {
  if (!prefs?.quiet_hours_enabled || !prefs?.quiet_hours_start || !prefs?.quiet_hours_end) {
    return false;
  }

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  const { quiet_hours_start: start, quiet_hours_end: end } = prefs;

  return start < end 
    ? currentTime >= start && currentTime <= end 
    : currentTime >= start || currentTime <= end;
}

function formatDocumentType(type: string, lang: "fr" | "en"): string {
  const translations = {
    fr: {
      passport: "passeport",
      id_card: "carte d'identité",
      driver_license: "permis de conduire",
      proof_of_address: "justificatif de domicile",
      other: "document",
    },
    en: {
      passport: "passport",
      id_card: "ID card",
      driver_license: "driver's license",
      proof_of_address: "proof of address",
      other: "document",
    },
  };
  return translations[lang][type as keyof typeof translations["fr"]] || type;
}

// ─────────────────────────────────────────────
// API PUBLIQUE (pour appels externes)
// ─────────────────────────────────────────────

export function queuePushNotification(event: {
  type: "welcome" | "owner_report" | "account_action" | "document_verification";
  userId: string;
  payload: NotificationPayload;
}): string {
  return pushQueue.add({
    userId: event.userId,
    type: event.type,
    payload: event.payload,
  });
}

// ─────────────────────────────────────────────
// SERVEUR HTTP
// ─────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Route: document_verification (pour admins)
    if (body.type === "document_verification") {
      const data = documentVerificationSchema.parse(body);
      const result = await handleDocumentVerification(data);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: account_action (pour utilisateurs - documents approuvés, etc.)
    if (body.type === "account_action") {
      const data = accountActionSchema.parse(body);
      const result = await handleAccountAction(data);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: welcome (nouvelle subscription push)
    if (body.type === "welcome") {
      const data = welcomeSchema.parse(body);
      const result = await handleWelcome(data);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: owner_report (rapports propriétaires)
    if (body.type === "owner_report") {
      const data = ownerReportSchema.parse(body);
      const result = await handleOwnerReport(data);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown notification type");
  } catch (error: any) {
    console.error("[push-notifier] Error:", error);

    const status = error.name === "ZodError" ? 400 : 500;
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        type: error.name === "ZodError" ? "validation_error" : "runtime_error",
      }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});// supabase/functions/admin-notification/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ─────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// URL de la Edge Function handle-events (interne)
const HANDLE_EVENTS_URL = Deno.env.get("HANDLE_EVENTS_URL") || 
  `${Deno.env.get("SUPABASE_URL")}/functions/v1/handle-events`;

const MAX_RETRIES = 5;
const BASE_DELAY = 2000; // ms
const CONCURRENCY_LIMIT = 5;
const REQUEST_TIMEOUT = 15000; // 15s

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface NotificationJob {
  id: string;
  userId: string;
  type: "document_verification" | "welcome" | "owner_report" | "account_action";
  payload: NotificationPayload;
  attempts: number;
  createdAt: number;
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, any>;
  actions?: Array<{ action: string; title: string }>;
}

interface AdminInfo {
  user_id: string;
  full_name: string | null;
  language: string | null;
  notification_preferences: {
    push_document_verification?: boolean;
    push_admin_alerts?: boolean;
    push_account?: boolean;
    push_marketing?: boolean;
    quiet_hours_enabled?: boolean;
    quiet_hours_start?: string;
    quiet_hours_end?: string;
  } | null;
}

// ─────────────────────────────────────────────
// VALIDATION SCHEMAS
// ─────────────────────────────────────────────

const documentVerificationSchema = z.object({
  userId: z.string().uuid(),
  documentType: z.enum(["passport", "id_card", "driver_license", "proof_of_address", "other"]),
  submissionId: z.string().uuid(),
  metadata: z.record(z.any()).optional(),
});

const accountActionSchema = z.object({
  userId: z.string().uuid(),
  actionType: z.enum(["document_approved", "document_rejected", "account_verified", "kyc_completed"]),
  payload: z.object({
    title: z.string(),
    body: z.string(),
    icon: z.string().optional(),
    badge: z.string().optional(),
    tag: z.string().optional(),
    requireInteraction: z.boolean().optional(),
    data: z.record(z.any()).optional(),
    actions: z.array(z.object({
      action: z.string(),
      title: z.string()
    })).optional(),
  }),
});

const welcomeSchema = z.object({
  userId: z.string().uuid(),
  language: z.enum(["fr", "en"]).optional(),
});

const ownerReportSchema = z.object({
  userId: z.string().uuid(),
  reportType: z.string(),
  propertyId: z.string().uuid().optional(),
  payload: z.object({
    title: z.string(),
    body: z.string(),
    data: z.record(z.any()).optional(),
  }),
});

// ─────────────────────────────────────────────
// QUEUE AVEC CONCURRENCE CONTRÔLÉE
// ─────────────────────────────────────────────

class NotificationQueue {
  private queue: NotificationJob[] = [];
  private processing = false;
  private activeJobs = 0;

  add(job: Omit<NotificationJob, "id" | "attempts" | "createdAt">): string {
    const fullJob: NotificationJob = {
      ...job,
      id: crypto.randomUUID(),
      attempts: 0,
      createdAt: Date.now(),
    };
    this.queue.push(fullJob);
    this.process();
    return fullJob.id;
  }

  private async process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 || this.activeJobs > 0) {
      while (this.activeJobs < CONCURRENCY_LIMIT && this.queue.length > 0) {
        const job = this.queue.shift();
        if (job) {
          this.activeJobs++;
          this.executeJob(job).finally(() => {
            this.activeJobs--;
          });
        }
      }
      await new Promise((r) => setTimeout(r, 10));
    }

    this.processing = false;
  }

  private async executeJob(job: NotificationJob) {
    try {
      await this.sendViaHandleEvents(job);
      console.log(`[admin-notification] Job ${job.id} completed successfully`);
    } catch (error: any) {
      job.attempts++;

      if (job.attempts < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, job.attempts);
        console.log(`[admin-notification] Job ${job.id} failed, retry ${job.attempts}/${MAX_RETRIES} in ${delay}ms`);

        setTimeout(() => {
          this.queue.push(job);
          this.process();
        }, delay);
      } else {
        console.error(`[admin-notification] Job ${job.id} failed permanently after ${MAX_RETRIES} attempts`);
        await this.logFailedJob(job, error.message);
      }
    }
  }

  /**
   * NOUVEAU : Envoie la notification via handle-events au lieu du service Render directement
   */
  private async sendViaHandleEvents(job: NotificationJob) {
    const supabase = getSupabaseClient();
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Vérifier que l'utilisateur a des subscriptions actives
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint")
      .eq("user_id", job.userId)
      .limit(1);

    if (!subs?.length) {
      throw new Error("NO_SUBSCRIPTIONS");
    }

    // 2. Préparer le payload pour handle-events
    // On mappe nos types internes vers les types supportés par handle-events
    const eventType = this.mapToHandleEventsType(job.type);
    
    const handleEventsPayload = {
      type: eventType,
      record: {
        user_id: job.userId,
        // Données spécifiques selon le type
        ...job.payload.data,
        // Pour document_verification, on ajoute les infos nécessaires
        ...(job.type === "document_verification" && {
          document_type: job.payload.data?.documentType,
          submission_id: job.payload.data?.submissionId,
          submitter_name: job.payload.data?.submitterName,
          submitter_email: job.payload.data?.submitterEmail,
        }),
        // Pour account_action
        ...(job.type === "account_action" && {
          action_type: job.payload.data?.actionType,
        }),
        // Pour owner_report
        ...(job.type === "owner_report" && {
          report_type: job.payload.data?.reportType,
          property_id: job.payload.data?.propertyId,
        }),
        // Pour welcome
        ...(job.type === "welcome" && {
          welcome_type: "new_subscription",
        }),
      },
      user_ids: [job.userId], // Envoi ciblé à un seul utilisateur
    };

    console.log(`[admin-notification] Calling handle-events for job ${job.id}, type: ${eventType}`);

    // 3. Appeler handle-events avec timeout et retry
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(HANDLE_EVENTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify(handleEventsPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`handle-events error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      // Vérifier le résultat
      if (!result.success) {
        throw new Error(`handle-events returned error: ${JSON.stringify(result)}`);
      }

      console.log(`[admin-notification] handle-events response:`, result);

      // 4. Logger dans l'historique local (redondant mais utile pour le traçage admin)
      await supabase.from("notification_history").insert({
        user_id: job.userId,
        type: job.type,
        title: job.payload.title,
        content: job.payload.body,
        metadata: {
          ...job.payload.data,
          channels: ["push"],
          handle_events_result: result,
          sent_via: "handle-events",
        },
        created_at: new Date().toISOString(),
      }).catch(console.error);

      return result;

    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Mappe les types internes vers les types handle-events
   */
  private mapToHandleEventsType(internalType: string): string {
    const mapping: Record<string, string> = {
      "document_verification": "new_inquiry", // handle-events n'a pas de type spécifique admin, on utilise new_inquiry ou on pourrait ajouter un type dédié
      "account_action": "account_verified", // ou "verification_update" selon l'action
      "welcome": "welcome",
      "owner_report": "high_views", // ou un autre type existant, ou ajouter "owner_report"
    };

    // Note: Si handle-events n'a pas de type exact, on peut l'étendre
    // Pour l'instant, on utilise les types existants ou on propose d'ajouter:
    // - "admin_alert" pour les notifications admin
    // - "owner_report" pour les rapports propriétaires
    
    return mapping[internalType] || "new_message"; // Fallback sur new_message si inconnu
  }

  private async logFailedJob(job: NotificationJob, error: string) {
    const supabase = getSupabaseClient();
    await supabase.from("failed_push_jobs").insert({
      job_id: job.id,
      user_id: job.userId,
      type: job.type,
      payload: job.payload,
      error,
      attempts: job.attempts,
      created_at: new Date().toISOString(),
    }).catch(console.error);
  }
}

// Singleton
const notificationQueue = new NotificationQueue();

// ─────────────────────────────────────────────
// SUPABASE CLIENT
// ─────────────────────────────────────────────

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

// ─────────────────────────────────────────────
// LOGIQUE DOCUMENT VERIFICATION (ADMIN)
// ─────────────────────────────────────────────

async function handleDocumentVerification(data: z.infer<typeof documentVerificationSchema>) {
  const supabase = getSupabaseClient();
  const { userId, documentType, submissionId, metadata } = data;

  console.log(`[admin-notification] Processing document verification ${submissionId}`);

  // 1. Récupérer le soumetteur
  const { data: submitter, error: submitterError } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("user_id", userId)
    .single();

  if (submitterError || !submitter) {
    throw new Error(`Submitter not found: ${submitterError?.message}`);
  }

  // 2. Récupérer les IDs admin
  const { data: adminRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  const adminIds = adminRoles?.map(r => r.user_id) || [];
  
  if (adminIds.length === 0) {
    return { success: true, message: "No admins found", count: 0 };
  }

  // 3. Récupérer les admins actifs avec préférences
  const { data: admins, error: adminError } = await supabase
    .from("profiles")
    .select(`
      user_id,
      full_name,
      language,
      notification_preferences!inner (
        push_document_verification,
        quiet_hours_enabled,
        quiet_hours_start,
        quiet_hours_end
      )
    `)
    .eq("is_active", true)
    .in("user_id", adminIds);

  if (adminError) throw new Error(`Failed to fetch admins: ${adminError.message}`);
  if (!admins?.length) {
    return { success: true, message: "No active admins to notify", count: 0 };
  }

  // 4. Créer les jobs pour chaque admin éligible
  let queuedCount = 0;
  let skippedCount = 0;

  for (const admin of admins as AdminInfo[]) {
    const prefs = admin.notification_preferences;

    // Vérifier préférences push
    if (prefs?.push_document_verification === false) {
      skippedCount++;
      continue;
    }

    // Vérifier heures silencieuses
    if (isQuietHours(prefs)) {
      skippedCount++;
      continue;
    }

    // Construire le payload
    const isFr = admin.language !== "en";
    const notificationId = `doc-${submissionId}-${admin.user_id}`;

    const jobId = notificationQueue.add({
      userId: admin.user_id,
      type: "document_verification",
      payload: {
        title: isFr ? "📄 Nouveau document à vérifier" : "📄 New document to verify",
        body: isFr
          ? `${submitter.full_name} a soumis un ${formatDocumentType(documentType, "fr")}`
          : `${submitter.full_name} submitted a ${formatDocumentType(documentType, "en")}`,
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        tag: `document_verification-${notificationId}`,
        requireInteraction: true,
        data: {
          type: "document_verification",
          notificationId,
          submissionId,
          documentType,
          submitterName: submitter.full_name,
          submitterEmail: submitter.email,
          hasDocument: true,
          url: `/admin/documents/${submissionId}`,
          timestamp: new Date().toISOString(),
          ...metadata,
        },
        actions: [
          { action: "view", title: isFr ? "👁️ Vérifier" : "👁️ Review" },
          { action: "dismiss", title: isFr ? "✓ Lu" : "✓ Read" },
        ],
      },
    });

    queuedCount++;
    console.log(`[admin-notification] Queued job ${jobId} for admin ${admin.user_id}`);
  }

  return {
    success: true,
    submissionId,
    totalAdmins: admins.length,
    queued: queuedCount,
    skipped: skippedCount,
  };
}

// ─────────────────────────────────────────────
// LOGIQUE ACCOUNT ACTION (UTILISATEUR)
// ─────────────────────────────────────────────

async function handleAccountAction(data: z.infer<typeof accountActionSchema>) {
  const { userId, actionType, payload } = data;

  console.log(`[admin-notification] Processing account action ${actionType} for user ${userId}`);

  // Vérifier si l'utilisateur a des subscriptions actives
  const supabase = getSupabaseClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (!subs?.length) {
    return { 
      success: false, 
      message: "User has no active push subscriptions",
      queued: 0 
    };
  }

  // Ajouter des données spécifiques selon le type d'action
  const enhancedData = {
    ...payload.data,
    actionType,
    userId,
    timestamp: new Date().toISOString(),
  };

  const jobId = notificationQueue.add({
    userId,
    type: "account_action",
    payload: {
      ...payload,
      data: enhancedData,
    },
  });

  return {
    success: true,
    jobId,
    actionType,
    userId,
    queued: 1,
  };
}

// ─────────────────────────────────────────────
// LOGIQUE WELCOME (NOUVELLE SUBSCRIPTION)
// ─────────────────────────────────────────────

async function handleWelcome(data: z.infer<typeof welcomeSchema>) {
  const { userId, language } = data;
  
  console.log(`[admin-notification] Sending welcome notification to ${userId}`);

  const supabase = getSupabaseClient();
  
  // Récupérer la langue du profil si non spécifiée
  let userLang = language;
  if (!userLang) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("language")
      .eq("user_id", userId)
      .single();
    userLang = profile?.language || "fr";
  }

  const isFr = userLang === "fr";

  const jobId = notificationQueue.add({
    userId,
    type: "welcome",
    payload: {
      title: isFr ? "👋 Bienvenue sur Habynex !" : "👋 Welcome to Habynex!",
      body: isFr
        ? "Vous recevrez maintenant les alertes importantes sur vos biens et documents."
        : "You will now receive important alerts about your properties and documents.",
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      tag: "welcome-notification",
      requireInteraction: false,
      data: {
        type: "welcome",
        url: "/dashboard",
        timestamp: new Date().toISOString(),
      },
      actions: [
        { 
          action: "explore", 
          title: isFr ? "🏠 Explorer" : "🏠 Explore" 
        },
        { 
          action: "dismiss", 
          title: "✓ OK" 
        },
      ],
    },
  });

  return {
    success: true,
    jobId,
    userId,
    language: userLang,
    queued: 1,
  };
}

// ─────────────────────────────────────────────
// LOGIQUE OWNER REPORT (PROPRIÉTAIRE)
// ─────────────────────────────────────────────

async function handleOwnerReport(data: z.infer<typeof ownerReportSchema>) {
  const { userId, reportType, propertyId, payload } = data;
  
  console.log(`[admin-notification] Sending owner report ${reportType} to owner ${userId}`);

  const jobId = notificationQueue.add({
    userId,
    type: "owner_report",
    payload: {
      ...payload,
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      tag: `owner-report-${reportType}-${propertyId || "general"}`,
      data: {
        ...payload.data,
        reportType,
        propertyId,
        timestamp: new Date().toISOString(),
      },
    },
  });

  return {
    success: true,
    jobId,
    userId,
    reportType,
    queued: 1,
  };
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function isQuietHours(prefs: AdminInfo["notification_preferences"]): boolean {
  if (!prefs?.quiet_hours_enabled || !prefs?.quiet_hours_start || !prefs?.quiet_hours_end) {
    return false;
  }

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  const { quiet_hours_start: start, quiet_hours_end: end } = prefs;

  return start < end 
    ? currentTime >= start && currentTime <= end 
    : currentTime >= start || currentTime <= end;
}

function formatDocumentType(type: string, lang: "fr" | "en"): string {
  const translations = {
    fr: {
      passport: "passeport",
      id_card: "carte d'identité",
      driver_license: "permis de conduire",
      proof_of_address: "justificatif de domicile",
      other: "document",
    },
    en: {
      passport: "passport",
      id_card: "ID card",
      driver_license: "driver's license",
      proof_of_address: "proof of address",
      other: "document",
    },
  };
  return translations[lang][type as keyof typeof translations["fr"]] || type;
}

// ─────────────────────────────────────────────
// API PUBLIQUE (pour appels externes)
// ─────────────────────────────────────────────

export function queueNotification(event: {
  type: "welcome" | "owner_report" | "account_action" | "document_verification";
  userId: string;
  payload: NotificationPayload;
}): string {
  return notificationQueue.add({
    userId: event.userId,
    type: event.type,
    payload: event.payload,
  });
}

// ─────────────────────────────────────────────
// SERVEUR HTTP
// ─────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Route: document_verification (pour admins)
    if (body.type === "document_verification") {
      const data = documentVerificationSchema.parse(body);
      const result = await handleDocumentVerification(data);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: account_action (pour utilisateurs - documents approuvés, etc.)
    if (body.type === "account_action") {
      const data = accountActionSchema.parse(body);
      const result = await handleAccountAction(data);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: welcome (nouvelle subscription push)
    if (body.type === "welcome") {
      const data = welcomeSchema.parse(body);
      const result = await handleWelcome(data);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: owner_report (rapports propriétaires)
    if (body.type === "owner_report") {
      const data = ownerReportSchema.parse(body);
      const result = await handleOwnerReport(data);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown notification type");
  } catch (error: any) {
    console.error("[admin-notification] Error:", error);

    const status = error.name === "ZodError" ? 400 : 500;
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        type: error.name === "ZodError" ? "validation_error" : "runtime_error",
      }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});