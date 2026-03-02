import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserType = "seeker" | "owner" | "agent" | "agency" | "both" | null;

interface UserProfile {
  user_type: UserType;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  city: string | null;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_type, full_name, avatar_url, phone, city")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data as UserProfile);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const isSeeker = profile?.user_type === "seeker";
  const isOwner = profile?.user_type === "owner" || profile?.user_type === "both";
  const isAgent = profile?.user_type === "agent";
  const isAgency = profile?.user_type === "agency";
  const isPropertyProvider = isOwner || isAgent || isAgency;

  return {
    profile,
    loading,
    isSeeker,
    isOwner,
    isAgent,
    isAgency,
    isPropertyProvider,
    refetch: fetchProfile,
  };
};
