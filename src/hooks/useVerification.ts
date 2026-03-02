import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { BadgeType } from "@/components/TrustBadge";

export interface UserVerification {
  id: string;
  user_id: string;
  account_type: "owner" | "agent" | "agency";
  current_level: "level_1" | "level_2" | "level_3" | "level_4";
  level_1_status: "pending" | "approved" | "rejected" | "expired";
  level_1_completed_at: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  has_real_photo: boolean;
  level_2_status: "pending" | "approved" | "rejected" | "expired";
  level_2_completed_at: string | null;
  level_2_eligible_at: string | null;
  identity_document_verified: boolean;
  selfie_verified: boolean;
  signature_verified: boolean;
  level_3_status: "pending" | "approved" | "rejected" | "expired";
  level_3_completed_at: string | null;
  level_3_eligible_at: string | null;
  level_4_status: "pending" | "approved" | "rejected" | "expired";
  level_4_completed_at: string | null;
  level_4_eligible_at: string | null;
  business_verified: boolean;
  interview_completed: boolean;
  trust_score: number;
  is_suspended: boolean;
  suspension_reason: string | null;
  reports_count: number;
  response_rate: number;
  cancellation_count: number;
  positive_reviews_count: number;
  negative_reviews_count: number;
  created_at: string;
  updated_at: string;
}

export interface LevelEligibility {
  level_1_eligible: boolean;
  level_2_eligible: boolean;
  level_2_eligible_at: string | null;
  level_3_eligible: boolean;
  level_3_eligible_at: string | null;
  level_4_eligible: boolean;
  level_4_eligible_at: string | null;
  current_level: string;
}

export const useVerification = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [verification, setVerification] = useState<UserVerification | null>(null);
  const [eligibility, setEligibility] = useState<LevelEligibility | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchVerification = useCallback(async () => {
    if (!user) {
      setVerification(null);
      setLoading(false);
      return;
    }

    try {
      // Get verification record
      const { data, error } = await supabase
        .from("user_verifications")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setVerification(data as UserVerification);

        // Check eligibility
        const { data: eligData, error: eligError } = await supabase
          .rpc("check_level_eligibility", { p_user_id: user.id });

        if (!eligError && eligData) {
          setEligibility(eligData as unknown as LevelEligibility);
        }
      } else {
        // Create initial verification record if not exists (all levels accessible now)
        const { data: newData, error: insertError } = await supabase
          .from("user_verifications")
          .insert({
            user_id: user.id,
          })
          .select()
          .single();

        if (!insertError && newData) {
          setVerification(newData as UserVerification);
          // Set eligibility - all levels accessible
          setEligibility({
            level_1_eligible: true,
            level_2_eligible: true,
            level_2_eligible_at: null,
            level_3_eligible: true,
            level_3_eligible_at: null,
            level_4_eligible: true,
            level_4_eligible_at: null,
            current_level: "level_1",
          });
        }
      }
    } catch (error: any) {
      console.error("Error fetching verification:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchVerification();
  }, [fetchVerification]);

  const getBadges = useCallback((): BadgeType[] => {
    if (!verification) return [];

    const badges: BadgeType[] = [];

    if (verification.level_1_status === "approved") {
      badges.push("account_confirmed");
    }

    if (verification.level_2_status === "approved") {
      badges.push("identity_verified");
    }

    if (verification.level_3_status === "approved") {
      badges.push("property_verified");
    }

    if (verification.level_4_status === "approved") {
      // Badge depends on account type
      if (verification.account_type === "owner") {
        badges.push("owner_certified");
      } else if (verification.account_type === "agent") {
        badges.push("agent_certified");
      } else if (verification.account_type === "agency") {
        badges.push("agency_certified");
      }
    }

    if (verification.trust_score >= 80) {
      badges.push("super_owner");
    }

    return badges;
  }, [verification]);

  const updateAccountType = async (accountType: "owner" | "agent" | "agency") => {
    if (!user || !verification) return false;

    try {
      const { error } = await supabase
        .from("user_verifications")
        .update({ account_type: accountType })
        .eq("user_id", user.id);

      if (error) throw error;

      await fetchVerification();
      return true;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
      return false;
    }
  };

  const completeLevel1 = async (data: {
    email_verified: boolean;
    phone_verified: boolean;
    has_real_photo: boolean;
  }) => {
    if (!user || !verification) return false;

    try {
      // Level 1 is "approved" if at least email + photo are done (phone is optional)
      const minVerified = data.email_verified && data.has_real_photo;
      const allVerified = data.email_verified && data.phone_verified && data.has_real_photo;

      const { error } = await supabase
        .from("user_verifications")
        .update({
          email_verified: data.email_verified,
          phone_verified: data.phone_verified,
          has_real_photo: data.has_real_photo,
          level_1_status: minVerified ? "approved" : "pending",
          level_1_completed_at: minVerified ? new Date().toISOString() : null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      await fetchVerification();

      // Calculate points earned
      let points = 0;
      if (data.email_verified) points += 5;
      if (data.has_real_photo) points += 10;
      if (data.phone_verified) points += 5;

      if (minVerified) {
        toast({
          title: "Niveau 1 complété ! 🎉",
          description: `Votre compte est confirmé. +${points} points de confiance.`,
        });
      }

      return true;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
      return false;
    }
  };

  const uploadVerificationDocument = async (
    file: File,
    documentType: string,
    level: "level_1" | "level_2" | "level_3" | "level_4"
  ) => {
    if (!user || !verification) return null;

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${level}/${documentType}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("verification-documents")
        .getPublicUrl(filePath);

      // Create document record
      const { data: docData, error: docError } = await supabase
        .from("verification_documents")
        .insert({
          user_id: user.id,
          verification_id: verification.id,
          document_type: documentType as "id_card" | "passport" | "selfie_with_id" | "digital_signature" | "property_photo" | "property_video" | "utility_bill" | "business_register" | "management_mandate" | "other",
          file_url: urlData.publicUrl,
          file_name: file.name,
          verification_level: level,
        })
        .select()
        .single();

      if (docError) throw docError;

      toast({
        title: "Document téléchargé",
        description: "Votre document est en cours de vérification.",
      });

      return docData;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
      return null;
    }
  };

  const reportUser = async (
    reportedUserId: string | null,
    reportedPropertyId: string | null,
    reason: string,
    description?: string
  ) => {
    if (!user) return false;

    try {
      const { error } = await supabase.from("user_reports").insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        reported_property_id: reportedPropertyId,
        reason,
        description,
      });

      if (error) throw error;

      toast({
        title: "Signalement envoyé",
        description: "Merci de nous aider à maintenir la sécurité de la plateforme.",
      });

      return true;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
      return false;
    }
  };

  return {
    verification,
    eligibility,
    loading,
    badges: getBadges(),
    refetch: fetchVerification,
    updateAccountType,
    completeLevel1,
    uploadVerificationDocument,
    reportUser,
  };
};

export default useVerification;
