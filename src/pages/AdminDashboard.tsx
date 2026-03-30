import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { 
  Shield, Users, FileCheck, AlertTriangle, 
  CheckCircle, XCircle, Eye, Clock, 
  Filter, Loader2, ArrowLeft,
  FileText, Image, Video, TrendingUp, BarChart3, Activity, Home,
  MessageSquare, Building2, UserCheck, Globe, Percent, Target,
  Star, ThumbsUp, Send, Ban, Trash2, Power, UserX, CheckSquare,
  Lock, Unlock
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, subWeeks } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VerificationDocument {
  id: string;
  user_id: string;
  verification_id: string;
  document_type: string;
  file_url: string;
  file_name: string | null;
  status: string | null;
  verification_level: string;
  created_at: string;
  rejection_reason: string | null;
  user_email?: string;
  user_name?: string;
}

interface UserReport {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_property_id: string | null;
  reason: string;
  description: string | null;
  status: string | null;
  created_at: string;
  resolution_notes: string | null;
}

interface Property {
  id: string;
  title: string;
  city: string;
  price: number;
  is_published: boolean;
  is_verified: boolean;
  created_at: string;
  owner_id: string;
  images: string[] | null;
  owner_name?: string;
  view_count?: number | null;
  property_id?: string;
}

interface Testimonial {
  id: string;
  content: string;
  rating: number;
  is_approved: boolean;
  created_at: string;
  user_id: string;
  likes_count: number;
  user_name?: string;
}

interface PropertyInquiry {
  id: string;
  property_id: string;
  sender_id: string | null;
  sender_name: string;
  sender_email: string;
  sender_phone: string | null;
  message: string;
  is_read: boolean | null;
  created_at: string;
  property_title?: string;
  owner_id?: string;
}

interface AnalyticsData {
  date: string;
  views: number;
  users: number;
  inquiries: number;
  registrations: number;
  properties: number;
}

interface PropertyTypeData {
  name: string;
  value: number;
  color: string;
}

interface UserTypeData {
  name: string;
  value: number;
  color: string;
}

interface SparklineData {
  value: number;
}

interface AppUser {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  user_type: string;
  is_suspended: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  properties_count: number;
  verification_status: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--gold))', 'hsl(var(--success))', 'hsl(var(--destructive))'];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const dateLocale = language === "fr" ? fr : enUS;
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [inquiries, setInquiries] = useState<PropertyInquiry[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<VerificationDocument | null>(null);
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<PropertyInquiry | null>(null);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [testimonialDialogOpen, setTestimonialDialogOpen] = useState(false);
  const [inquiryDialogOpen, setInquiryDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userActionDialogOpen, setUserActionDialogOpen] = useState(false);
  const [userActionType, setUserActionType] = useState<"suspend" | "delete" | "unsuspend" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [filter, setFilter] = useState("pending");
  const [respondingToInquiry, setRespondingToInquiry] = useState(false);
  const [selectedUserDocs, setSelectedUserDocs] = useState<VerificationDocument[]>([]);
  const [validatingAllDocs, setValidatingAllDocs] = useState(false);
  
  // Chart dialog state
  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState<"views" | "users" | "properties" | "inquiries" | null>(null);
  
  // Enhanced Analytics state
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [sparklineData, setSparklineData] = useState<{
    views: SparklineData[];
    users: SparklineData[];
    properties: SparklineData[];
    inquiries: SparklineData[];
    registrations: SparklineData[];
  }>({
    views: [],
    users: [],
    properties: [],
    inquiries: [],
    registrations: [],
  });
  const [totalViews, setTotalViews] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalProperties, setTotalProperties] = useState(0);
  const [publishedProperties, setPublishedProperties] = useState(0);
  const [todayViews, setTodayViews] = useState(0);
  const [totalConversations, setTotalConversations] = useState(0);
  const [totalInquiries, setTotalInquiries] = useState(0);
  const [verifiedUsers, setVerifiedUsers] = useState(0);
  const [propertyTypeStats, setPropertyTypeStats] = useState<PropertyTypeData[]>([]);
  const [listingTypeStats, setListingTypeStats] = useState<PropertyTypeData[]>([]);
  const [userTypeStats, setUserTypeStats] = useState<UserTypeData[]>([]);
  const [newUsersThisWeek, setNewUsersThisWeek] = useState(0);
  const [newUsersThisMonth, setNewUsersThisMonth] = useState(0);
  const [newPropertiesThisWeek, setNewPropertiesThisWeek] = useState(0);
  const [newPropertiesThisMonth, setNewPropertiesThisMonth] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [avgViewsPerProperty, setAvgViewsPerProperty] = useState(0);

  useEffect(() => {
    if (!authLoading && user) {
      checkAdminRole();
    } else if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading]);

  const checkAdminRole = async () => {
    try {
      const { data, error } = await supabase.rpc("current_user_has_role", { _role: "admin" });
      if (error) throw error;
      
      if (data) {
        setIsAdmin(true);
        fetchData();
      } else {
        toast({
          variant: "destructive",
          title: t("admin.accessDenied"),
          description: t("admin.noAdminRights")
        });
        navigate("/");
      }
    } catch (error) {
      console.error("Error checking admin role:", error);
      navigate("/");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Récupérer tous les utilisateurs avec leurs métadonnées
      await fetchUsers();

      // Fetch verification documents
      const { data: docsData, error: docsError } = await supabase
        .from("verification_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (docsError) throw docsError;

      // Get user names for documents
      const enrichedDocs = await Promise.all(
        (docsData || []).map(async (doc) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", doc.user_id)
            .maybeSingle();
          
          return {
            ...doc,
            user_name: profile?.full_name || user.auth || (language === "fr" ? "Utilisateur inconnu" : "Unknown user")
          };
        })
      );

      setDocuments(enrichedDocs);

      // Fetch user reports
      const { data: reportsData, error: reportsError } = await supabase
        .from("user_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (reportsError) throw reportsError;
      setReports(reportsData || []);

      // Fetch all properties with owner names
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });

      if (propertiesError) throw propertiesError;
      
      const enrichedProperties = await Promise.all(
        (propertiesData || []).map(async (prop) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", prop.owner_id)
            .maybeSingle();
          
          return {
            ...prop,
            owner_name: profile?.full_name || (language === "fr" ? "Propriétaire inconnu" : "Unknown owner")
          };
        })
      );
      setProperties(enrichedProperties);

      // Fetch testimonials with user names
      const { data: testimonialsData, error: testimonialsError } = await supabase
        .from("testimonials")
        .select("*")
        .order("created_at", { ascending: false });

      if (testimonialsError) throw testimonialsError;
      
      const enrichedTestimonials = await Promise.all(
        (testimonialsData || []).map(async (test) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", test.user_id)
            .maybeSingle();
          
          return {
            ...test,
            user_name: profile?.full_name || (language === "fr" ? "Utilisateur inconnu" : "Unknown user")
          };
        })
      );
      setTestimonials(enrichedTestimonials);

      // Fetch property inquiries with property titles
      const { data: inquiriesData, error: inquiriesError } = await supabase
        .from("property_inquiries")
        .select("*")
        .order("created_at", { ascending: false });

      if (inquiriesError) throw inquiriesError;
      
      const enrichedInquiries = await Promise.all(
        (inquiriesData || []).map(async (inq) => {
          const { data: property } = await supabase
            .from("properties")
            .select("title, owner_id")
            .eq("id", inq.property_id)
            .maybeSingle();
          
          return {
            ...inq,
            property_title: property?.title || (language === "fr" ? "Annonce inconnue" : "Unknown listing"),
            owner_id: property?.owner_id
          };
        })
      );
      setInquiries(enrichedInquiries);

      // Fetch comprehensive analytics data
      await fetchAnalytics();

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.loadError")
      });
    } finally {
      setLoading(false);
    }
  };

  // NOUVELLE FONCTION : Récupérer tous les utilisateurs avec métadonnées complètes
// REMPLACER la fonction fetchUsers par celle-ci :
const fetchUsers = async () => {
  try {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    console.log("Profiles data:", profilesData); // Debug

    if (!profilesData || profilesData.length === 0) {
      console.warn("No profiles found in database");
      setUsers([]);
      setTotalUsers(0);
      return;
    }

    // Pour chaque profil, récupérer les infos supplémentaires
    const enrichedUsers = await Promise.all(
      profilesData.map(async (profile) => {
        // Compter les propriétés
        const { count: propertiesCount, error: countError } = await supabase
          .from("properties")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", profile.user_id);

        if (countError) {
          console.error("Error counting properties:", countError);
        }

        // Vérifier le statut de vérification
        const { data: verification, error: verifError } = await supabase
          .from("user_verifications")
          .select("level_1_status, level_2_status")
          .eq("user_id", profile.user_id)
          .maybeSingle();

        if (verifError) {
          console.error("Error fetching verification:", verifError);
        }

        let verificationStatus = "none";
        if (verification?.level_2_status === "approved") {
          verificationStatus = "level_2";
        } else if (verification?.level_1_status === "approved") {
          verificationStatus = "level_1";
        }

        return {
          id: profile.id,
          user_id: profile.user_id,
          email: profile.email || "",
          full_name: profile.full_name,
          user_type: profile.user_type || "seeker",
          is_suspended: profile.is_suspended || false,
          created_at: profile.created_at,
          last_sign_in_at: profile.last_sign_in_at,
          properties_count: propertiesCount || 0,
          verification_status: verificationStatus,
        };
      })
    );

    console.log("Enriched users:", enrichedUsers); // Debug
    setUsers(enrichedUsers);
    setTotalUsers(enrichedUsers.length);
    
  } catch (error) {
    console.error("Error in fetchUsers:", error);
    toast({
      variant: "destructive",
      title: t("common.error"),
      description: language === "fr" ? "Erreur lors du chargement des utilisateurs" : "Error loading users"
    });
  }
};


  const fetchAnalytics = async () => {
    try {
      // Get total properties count
      const { count: propertiesCount } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true });
      setTotalProperties(propertiesCount || 0);

      // Get published properties count
      const { count: publishedCount } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("is_published", true);
      setPublishedProperties(publishedCount || 0);

      // Get total conversations
      const { count: conversationsCount } = await supabase
        .from("conversations")
        .select("*", { count: "exact", head: true });
      setTotalConversations(conversationsCount || 0);

      // Get total inquiries
      const { count: inquiriesCount } = await supabase
        .from("property_inquiries")
        .select("*", { count: "exact", head: true });
      setTotalInquiries(inquiriesCount || 0);

      // Get verified users (level 2 completed - identité vérifiée)
      const { count: verifiedCount } = await supabase
        .from("user_verifications")
        .select("*", { count: "exact", head: true })
        .eq("level_2_status", "approved");
      setVerifiedUsers(verifiedCount || 0);

      // Get new users this week
      const weekAgo = subWeeks(new Date(), 1).toISOString();
      const { count: newUsersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo);
      setNewUsersThisWeek(newUsersCount || 0);

      // Get new properties this week
      const { count: newPropertiesCount } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo);
      setNewPropertiesThisWeek(newPropertiesCount || 0);

      // Get property type distribution
      const { data: propertyTypesData } = await supabase
        .from("properties")
        .select("property_type");
      
      if (propertyTypesData) {
        const typeCounts: Record<string, number> = {};
        propertyTypesData.forEach(p => {
          typeCounts[p.property_type] = (typeCounts[p.property_type] || 0) + 1;
        });
        
        const typeLabels: Record<string, string> = {
          studio: "Studio",
          apartment: language === "fr" ? "Appartement" : "Apartment",
          house: language === "fr" ? "Maison" : "House",
          villa: "Villa",
          room: language === "fr" ? "Chambre" : "Room",
          duplex: "duplex",
          land: language === "fr" ? "Terrain" : "Land",
          shop: language === "fr" ? "Boutique" : "Shop",
          store: language === "fr" ? "Magasin" : "Store",
          commercial_space: language === "fr" ? "Espace commercial" : "Commercial space",
          warehouse: language === "fr" ? "Entrepôt" : "Warehouse",
          office: language === "fr" ? "Bureau" : "Office",
          building: language === "fr" ? "Bâtiment" : "Building",
        };
        
        setPropertyTypeStats(Object.entries(typeCounts).map(([key, value], index) => ({
          name: typeLabels[key] || key,
          value,
          color: COLORS[index % COLORS.length]
        })));
      }

      // Get listing type distribution
      const { data: listingTypesData } = await supabase
        .from("properties")
        .select("listing_type");
      
      if (listingTypesData) {
        const typeCounts: Record<string, number> = {};
        listingTypesData.forEach(p => {
          typeCounts[p.listing_type] = (typeCounts[p.listing_type] || 0) + 1;
        });
        
        const typeLabels: Record<string, string> = {
          rent: language === "fr" ? "Location" : "Rent",
          sale: language === "fr" ? "Vente" : "Sale",
          colocation: language === "fr" ? "Colocation" : "Roommate",
          short_term: language === "fr" ? "Court séjour" : "Short stay"
        };
        
        setListingTypeStats(Object.entries(typeCounts).map(([key, value], index) => ({
          name: typeLabels[key] || key,
          value,
          color: COLORS[index % COLORS.length]
        })));
      }

      // Get user type distribution
      const { data: userTypesData } = await supabase
        .from("profiles")
        .select("user_type");
      
      if (userTypesData) {
        const typeCounts: Record<string, number> = {};
        userTypesData.forEach(p => {
          const type = p.user_type || "seeker";
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        
        const typeLabels: Record<string, string> = {
          seeker: language === "fr" ? "Chercheurs" : "Seekers",
          owner: language === "fr" ? "Propriétaires" : "Owners",
          both: language === "fr" ? "Les deux" : "Both"
        };
        
        setUserTypeStats(Object.entries(typeCounts).map(([key, value], index) => ({
          name: typeLabels[key] || key,
          value,
          color: COLORS[index % COLORS.length]
        })));
      }

      // Get property views for last 30 days for sparklines
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i);
        return {
          date: format(date, "yyyy-MM-dd"),
          label: format(date, "dd MMM", { locale: dateLocale }),
          start: startOfDay(date).toISOString(),
          end: endOfDay(date).toISOString(),
        };
      });

      const sparklinePromises = last30Days.map(async (day) => {
        const { count: viewsCount } = await supabase
          .from("property_views")
          .select("*", { count: "exact", head: true })
          .gte("viewed_at", day.start)
          .lte("viewed_at", day.end);

        const { count: inquiriesCount } = await supabase
          .from("property_inquiries")
          .select("*", { count: "exact", head: true })
          .gte("created_at", day.start)
          .lte("created_at", day.end);

        const { count: registrationsCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", day.start)
          .lte("created_at", day.end);

        const { count: propertiesCreated } = await supabase
          .from("properties")
          .select("*", { count: "exact", head: true })
          .gte("created_at", day.start)
          .lte("created_at", day.end);

        return {
          date: day.label,
          views: viewsCount || 0,
          users: Math.floor((viewsCount || 0) * 0.7),
          inquiries: inquiriesCount || 0,
          registrations: registrationsCount || 0,
          properties: propertiesCreated || 0,
        };
      });

      const sparklineResults = await Promise.all(sparklinePromises);
      setAnalyticsData(sparklineResults);

      // Set sparkline data for KPI cards
      setSparklineData({
        views: sparklineResults.map(d => ({ value: d.views })),
        users: sparklineResults.map(d => ({ value: d.registrations })),
        properties: sparklineResults.map(d => ({ value: d.properties })),
        inquiries: sparklineResults.map(d => ({ value: d.inquiries })),
        registrations: sparklineResults.map(d => ({ value: d.registrations })),
      });

      // Calculate totals
      const totalViewsSum = sparklineResults.reduce((sum, d) => sum + d.views, 0);
      setTotalViews(totalViewsSum);
      setTodayViews(sparklineResults[sparklineResults.length - 1]?.views || 0);

      // New users this month
      const monthRegistrations = sparklineResults.reduce((sum, d) => sum + d.registrations, 0);
      setNewUsersThisMonth(monthRegistrations);

      // New properties this month
      const monthProperties = sparklineResults.reduce((sum, d) => sum + d.properties, 0);
      setNewPropertiesThisMonth(monthProperties);

      // Calculate conversion rate (inquiries / views * 100)
      const totalInquiriesInPeriod = sparklineResults.reduce((sum, d) => sum + d.inquiries, 0);
      setConversionRate(totalViewsSum > 0 ? Math.round((totalInquiriesInPeriod / totalViewsSum) * 100 * 10) / 10 : 0);

      // Calculate average views per property
      setAvgViewsPerProperty(propertiesCount && propertiesCount > 0 ? Math.round(totalViewsSum / propertiesCount) : 0);

    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  // Stats computed from state
  const pendingDocs = documents.filter(d => d.status === "pending").length;
  const pendingReports = reports.filter(r => r.status === "pending").length;
  const pendingTestimonials = testimonials.filter(t => !t.is_approved).length;
  const unreadInquiries = inquiries.filter(i => !i.is_read).length;

  // NOUVELLE FONCTION : Valider tous les documents d'un utilisateur d'un coup
  const handleApproveAllUserDocuments = async (userId: string) => {
    setValidatingAllDocs(true);
    try {
      // Récupérer tous les documents pending de l'utilisateur pour level_2
      const userPendingDocs = documents.filter(
        d => d.user_id === userId && d.status === "pending" && d.verification_level === "level_2"
      );

      if (userPendingDocs.length === 0) {
        toast({
          variant: "destructive",
          title: language === "fr" ? "Aucun document en attente" : "No pending documents",
          description: language === "fr" ? "Cet utilisateur n'a pas de documents à valider" : "This user has no documents to validate"
        });
        return;
      }

      // Valider tous les documents
      const { error: docsError } = await supabase
        .from("verification_documents")
        .update({ 
          status: "approved",
          verified_at: new Date().toISOString(),
          verified_by: user?.id
        })
        .eq("user_id", userId)
        .eq("verification_level", "level_2")
        .eq("status", "pending");

      if (docsError) throw docsError;

      // Mettre à jour le statut de vérification level_2
      const { error: verifError } = await supabase
        .from("user_verifications")
        .update({ 
          level_2_status: "approved",
          identity_document_verified: true,
          selfie_verified: true,
          level_2_completed_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (verifError) throw verifError;

      // Publier automatiquement toutes les annonces en brouillon
      const { data: draftProperties } = await supabase
        .from("properties")
        .select("id")
        .eq("owner_id", userId)
        .eq("is_published", false);

      if (draftProperties && draftProperties.length > 0) {
        const { error: publishError } = await supabase
          .from("properties")
          .update({ is_published: true })
          .eq("owner_id", userId)
          .eq("is_published", false);

        if (publishError) throw publishError;
      }

      toast({ 
        title: language === "fr" 
          ? `Identité vérifiée ! ${userPendingDocs.length} document(s) validé(s) et ${draftProperties?.length || 0} annonce(s) publiée(s).` 
          : `Identity verified! ${userPendingDocs.length} document(s) approved and ${draftProperties?.length || 0} listing(s) published.`
      });

      setDocDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error approving all documents:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.loadError")
      });
    } finally {
      setValidatingAllDocs(false);
    }
  };

  const handleApproveDocument = async (doc: VerificationDocument) => {
    try {
      const { error } = await supabase
        .from("verification_documents")
        .update({ 
          status: "approved",
          verified_at: new Date().toISOString(),
          verified_by: user?.id
        })
        .eq("id", doc.id);

      if (error) throw error;

      // Update verification level status
      const levelField = `level_${doc.verification_level.split("_")[1]}_status`;
      await supabase
        .from("user_verifications")
        .update({ [levelField]: "approved" })
        .eq("id", doc.verification_id);

      // Check if all identity documents for this user are now approved (level_2)
      if (doc.verification_level === "level_2") {
        const { data: allUserDocs } = await supabase
          .from("verification_documents")
          .select("status, document_type")
          .eq("user_id", doc.user_id)
          .eq("verification_level", "level_2");

        const allApproved = allUserDocs && allUserDocs.length >= 3 && 
          allUserDocs.every(d => d.status === "approved");

        if (allApproved) {
          // Mark identity as verified
          await supabase
            .from("user_verifications")
            .update({ 
              identity_document_verified: true,
              selfie_verified: true,
              level_2_status: "approved",
              level_2_completed_at: new Date().toISOString(),
            })
            .eq("user_id", doc.user_id);

          // Auto-publish all draft listings from this user
          await supabase
            .from("properties")
            .update({ is_published: true })
            .eq("owner_id", doc.user_id)
            .eq("is_published", false);

          toast({ 
            title: language === "fr" 
              ? "Identité vérifiée ! Annonces publiées automatiquement." 
              : "Identity verified! Listings auto-published."
          });
        } else {
          toast({ title: t("admin.documentApproved") });
        }
      } else {
        toast({ title: t("admin.documentApproved") });
      }

      setDocDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.loadError")
      });
    }
  };

  const handleRejectDocument = async (doc: VerificationDocument) => {
    if (!rejectionReason.trim()) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.rejectionReasonRequired")
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("verification_documents")
        .update({ 
          status: "rejected",
          rejection_reason: rejectionReason,
          verified_at: new Date().toISOString(),
          verified_by: user?.id
        })
        .eq("id", doc.id);

      if (error) throw error;

      toast({ title: t("admin.documentRejected") });
      setDocDialogOpen(false);
      setRejectionReason("");
      fetchData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.loadError")
      });
    }
  };

  const handleResolveReport = async (report: UserReport, action: "approved" | "rejected") => {
    try {
      const { error } = await supabase
        .from("user_reports")
        .update({ 
          status: action,
          resolution_notes: resolutionNotes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          action_taken: action === "approved" ? 
            (language === "fr" ? "Signalement validé" : "Report validated") : 
            (language === "fr" ? "Signalement rejeté" : "Report rejected")
        })
        .eq("id", report.id);

      if (error) throw error;

      // If report is approved and there's a reported user, increment their report count
      if (action === "approved" && report.reported_user_id) {
        const { data: currentVerification } = await supabase
          .from("user_verifications")
          .select("reports_count")
          .eq("user_id", report.reported_user_id)
          .maybeSingle();
        
        const currentCount = currentVerification?.reports_count || 0;
        await supabase
          .from("user_verifications")
          .update({ reports_count: currentCount + 1 })
          .eq("user_id", report.reported_user_id);
      }

      toast({ title: action === "approved" ? t("admin.reportValidated") : t("admin.reportRejected") });
      setReportDialogOpen(false);
      setResolutionNotes("");
      fetchData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.loadError")
      });
    }
  };

  const handleApproveTestimonial = async (testimonial: Testimonial) => {
    try {
      const { error } = await supabase
        .from("testimonials")
        .update({ is_approved: true })
        .eq("id", testimonial.id);

      if (error) throw error;

      toast({ title: language === "fr" ? "Témoignage approuvé" : "Testimonial approved" });
      setTestimonialDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.loadError")
      });
    }
  };

  const handleRejectTestimonial = async (testimonial: Testimonial) => {
    try {
      const { error } = await supabase
        .from("testimonials")
        .delete()
        .eq("id", testimonial.id);

      if (error) throw error;

      toast({ title: language === "fr" ? "Témoignage supprimé" : "Testimonial deleted" });
      setTestimonialDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.loadError")
      });
    }
  };

  const handleRespondToInquiry = async (inquiry: PropertyInquiry) => {
    if (!inquiry.owner_id) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: language === "fr" ? "Propriétaire introuvable" : "Owner not found"
      });
      return;
    }

    setRespondingToInquiry(true);

    try {
      // Mark as read
      await supabase
        .from("property_inquiries")
        .update({ is_read: true })
        .eq("id", inquiry.id);

      // Create or find existing conversation
      const { data: existingConvo } = await supabase
        .from("conversations")
        .select("id")
        .eq("property_id", inquiry.property_id)
        .eq("owner_id", inquiry.owner_id)
        .eq("tenant_id", inquiry.sender_id || user?.id)
        .maybeSingle();

      if (existingConvo) {
        navigate(`/messages?conversation=${existingConvo.id}`);
      } else if (inquiry.sender_id) {
        const { data: newConvo, error } = await supabase
          .from("conversations")
          .insert({
            property_id: inquiry.property_id,
            owner_id: inquiry.owner_id,
            tenant_id: inquiry.sender_id
          })
          .select()
          .single();

        if (error) throw error;
        navigate(`/messages?conversation=${newConvo.id}`);
      } else {
        // If no sender_id, just mark as read and show a message
        toast({
          title: language === "fr" ? "Demande marquée comme lue" : "Inquiry marked as read",
          description: language === "fr" 
            ? "Cette demande provient d'un utilisateur non connecté. Contactez-le par email."
            : "This inquiry is from a non-logged user. Contact them by email."
        });
      }

      setInquiryDialogOpen(false);
    } catch (error) {
      console.error("Error responding to inquiry:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("admin.loadError")
      });
    } finally {
      setRespondingToInquiry(false);
    }
  };

  // NOUVELLES FONCTIONS : Gestion des utilisateurs
  const handleSuspendUser = async (userId: string) => {
    try {
      // Mettre à jour le profil pour marquer comme suspendu
      const { error } = await supabase
        .from("profiles")
        .update({ is_suspended: true, suspended_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (error) throw error;

      // Dépublier toutes les annonces de l'utilisateur
      await supabase
        .from("properties")
        .update({ is_published: false })
        .eq("owner_id", userId);

      toast({
        title: language === "fr" ? "Utilisateur suspendu" : "User suspended",
        description: language === "fr" 
          ? "Le compte a été suspendu et les annonces dépubliées" 
          : "Account suspended and listings unpublished"
      });

      setUserActionDialogOpen(false);
      setSelectedUser(null);
      fetchData();
    } catch (error) {
      console.error("Error suspending user:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: language === "fr" ? "Erreur lors de la suspension" : "Error suspending user"
      });
    }
  };

  const handleUnsuspendUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_suspended: false, suspended_at: null })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: language === "fr" ? "Utilisateur réactivé" : "User reactivated",
        description: language === "fr" 
          ? "Le compte a été réactivé" 
          : "Account reactivated"
      });

      setUserActionDialogOpen(false);
      setSelectedUser(null);
      fetchData();
    } catch (error) {
      console.error("Error unsuspending user:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: language === "fr" ? "Erreur lors de la réactivation" : "Error reactivating user"
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // Supprimer les données associées d'abord (cascade)
      // 1. Supprimer les propriétés
      await supabase.from("properties").delete().eq("owner_id", userId);
      
      // 2. Supprimer les documents de vérification
      await supabase.from("verification_documents").delete().eq("user_id", userId);
      
      // 3. Supprimer les vérifications utilisateur
      await supabase.from("user_verifications").delete().eq("user_id", userId);
      
      // 4. Supprimer les témoignages
      await supabase.from("testimonials").delete().eq("user_id", userId);
      
      // 5. Supprimer les messages et conversations
      await supabase.from("messages").delete().eq("sender_id", userId);
      await supabase.from("conversations").delete().or(`owner_id.eq.${userId},tenant_id.eq.${userId}`);
      
      // 6. Supprimer le profil
      await supabase.from("profiles").delete().eq("user_id", userId);
      
      // 7. Supprimer l'utilisateur de auth (nécessite une fonction RPC ou edge function)
      const { error: authError } = await supabase.rpc("delete_user", { user_id: userId });
      
      if (authError) {
        console.warn("Could not delete auth user, may need manual cleanup:", authError);
      }

      toast({
        title: language === "fr" ? "Utilisateur supprimé" : "User deleted",
        description: language === "fr" 
          ? "Le compte et toutes les données associées ont été supprimés" 
          : "Account and all associated data deleted"
      });

      setUserActionDialogOpen(false);
      setSelectedUser(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: language === "fr" ? "Erreur lors de la suppression" : "Error deleting user"
      });
    }
  };

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, Record<string, string>> = {
      id_card: { fr: "Carte d'identité", en: "ID Card" },
      passport: { fr: "Passeport", en: "Passport" },
      selfie_with_id: { fr: "Selfie avec pièce", en: "Selfie with ID" },
      digital_signature: { fr: "Signature numérique", en: "Digital signature" },
      property_photo: { fr: "Photo du bien", en: "Property photo" },
      property_video: { fr: "Vidéo du bien", en: "Property video" },
      utility_bill: { fr: "Facture", en: "Utility bill" },
      business_register: { fr: "Registre commerce", en: "Business register" },
      management_mandate: { fr: "Mandat de gestion", en: "Management mandate" },
      ownership_proof: { fr: "Attestation propriété", en: "Ownership proof" },
      other: { fr: "Autre", en: "Other" }
    };
    return labels[type]?.[language] || type;
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, Record<string, string>> = {
      level_1: { fr: "Niveau 1", en: "Level 1" },
      level_2: { fr: "Niveau 2", en: "Level 2" },
      level_3: { fr: "Niveau 3", en: "Level 3" },
      level_4: { fr: "Niveau 4", en: "Level 4" }
    };
    return labels[level]?.[language] || level;
  };

  const getVerificationStatusLabel = (status: string) => {
    const labels: Record<string, Record<string, string>> = {
      none: { fr: "Non vérifié", en: "Not verified" },
      level_1: { fr: "Niveau 1", en: "Level 1" },
      level_2: { fr: "Identité vérifiée", en: "Identity verified" }
    };
    return labels[status]?.[language] || status;
  };

  const filteredDocs = documents.filter(d => 
    filter === "all" || d.status === filter
  );

  const filteredReports = reports.filter(r => 
    filter === "all" || r.status === filter
  );

  const filteredTestimonials = testimonials.filter(t => {
    if (filter === "all") return true;
    if (filter === "pending") return !t.is_approved;
    if (filter === "approved") return t.is_approved;
    return true;
  });

  const filteredInquiries = inquiries.filter(i => {
    if (filter === "all") return true;
    if (filter === "pending") return !i.is_read;
    if (filter === "approved") return i.is_read;
    return true;
  });

  const filteredUsers = users.filter(u => {
    if (filter === "all") return true;
    if (filter === "pending") return u.verification_status === "none";
    if (filter === "approved") return u.verification_status !== "none";
    if (filter === "rejected") return u.is_suspended;
    return true;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{t("admin.title")} | Habynex</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="pt-20 pb-12">
          <div className="container mx-auto px-4">
            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t("admin.back")}</span>
            </button>

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 mb-8"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t("common.admin")}</h1>
                <p className="text-muted-foreground">
                  {t("admin.subtitle")}
                </p>
              </div>
            </motion.div>

            {/* Quick Stats Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8"
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/10">
                      <Clock className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{pendingDocs}</p>
                      <p className="text-xs text-muted-foreground">{t("admin.pendingDocs")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{pendingReports}</p>
                      <p className="text-xs text-muted-foreground">{t("admin.pendingReports")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Star className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{pendingTestimonials}</p>
                      <p className="text-xs text-muted-foreground">
                        {language === "fr" ? "Avis en attente" : "Pending reviews"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <MessageSquare className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{unreadInquiries}</p>
                      <p className="text-xs text-muted-foreground">
                        {language === "fr" ? "Demandes non lues" : "Unread inquiries"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10">
                      <Building2 className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{properties.length}</p>
                      <p className="text-xs text-muted-foreground">
                        {language === "fr" ? "Total annonces" : "Total listings"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <Users className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{users.length}</p>
                      <p className="text-xs text-muted-foreground">
                        {language === "fr" ? "Utilisateurs" : "Users"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Tabs defaultValue="analytics" className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <TabsList className="flex-wrap h-auto">
                    <TabsTrigger value="analytics" className="gap-2">
                      <BarChart3 className="w-4 h-4" />
                      {t("admin.analytics")}
                    </TabsTrigger>
                    <TabsTrigger value="users" className="gap-2">
                      <Users className="w-4 h-4" />
                      {language === "fr" ? "Utilisateurs" : "Users"}
                      <Badge variant="secondary" className="ml-1">
                        {users.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="properties" className="gap-2">
                      <Building2 className="w-4 h-4" />
                      {language === "fr" ? "Annonces" : "Listings"}
                      <Badge variant="secondary" className="ml-1">
                        {properties.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="testimonials" className="gap-2">
                      <Star className="w-4 h-4" />
                      {language === "fr" ? "Avis" : "Reviews"}
                      {pendingTestimonials > 0 && (
                        <Badge variant="destructive" className="ml-1">
                          {pendingTestimonials}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="inquiries" className="gap-2">
                      <MessageSquare className="w-4 h-4" />
                      {language === "fr" ? "Demandes" : "Inquiries"}
                      {unreadInquiries > 0 && (
                        <Badge variant="destructive" className="ml-1">
                          {unreadInquiries}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="gap-2">
                      <FileCheck className="w-4 h-4" />
                      {t("admin.documents")}
                      {pendingDocs > 0 && (
                        <Badge variant="destructive" className="ml-1">
                          {pendingDocs}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {t("admin.reports")}
                      {pendingReports > 0 && (
                        <Badge variant="destructive" className="ml-1">
                          {pendingReports}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-40">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("admin.all")}</SelectItem>
                      <SelectItem value="pending">{t("admin.pending")}</SelectItem>
                      <SelectItem value="approved">{t("admin.approved")}</SelectItem>
                      <SelectItem value="rejected">{t("admin.rejected")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Analytics Tab */}
                <TabsContent value="analytics">
                  <div className="space-y-6">
                    {/* Global Overview Stats with Sparklines - Clickable */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {/* Total Views - 30 days - Clickable */}
                      <Card 
                        className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                        onClick={() => {
                          setSelectedChartType("views");
                          setChartDialogOpen(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <TrendingUp className="w-5 h-5 text-primary" />
                            </div>
                            <p className="text-2xl font-bold">{totalViews}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {language === "fr" ? "Vues (30j)" : "Views (30d)"}
                          </p>
                          {sparklineData.views.length > 0 && (
                            <div className="h-10">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={sparklineData.views}>
                                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={1.5} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                          <p className="text-xs text-center text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {language === "fr" ? "Cliquer pour agrandir" : "Click to expand"}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Today Views */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-lg bg-success/10">
                              <Activity className="w-5 h-5 text-success" />
                            </div>
                            <p className="text-2xl font-bold">{todayViews}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{t("admin.viewsToday")}</p>
                        </CardContent>
                      </Card>

                      {/* Total Users with Sparkline - Clickable */}
                      <Card 
                        className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                        onClick={() => {
                          setSelectedChartType("users");
                          setChartDialogOpen(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                              <Users className="w-5 h-5 text-blue-500" />
                            </div>
                            <p className="text-2xl font-bold">{totalUsers}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{t("admin.users")}</p>
                          {sparklineData.registrations.length > 0 && (
                            <div className="h-10">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={sparklineData.registrations}>
                                  <Area type="monotone" dataKey="value" stroke="hsl(210, 100%, 50%)" fill="hsl(210, 100%, 50%)" fillOpacity={0.2} strokeWidth={1.5} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Published Properties with Sparkline - Clickable */}
                      <Card 
                        className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                        onClick={() => {
                          setSelectedChartType("properties");
                          setChartDialogOpen(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-lg bg-orange-500/10">
                              <Home className="w-5 h-5 text-orange-500" />
                            </div>
                            <p className="text-2xl font-bold">{publishedProperties}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{t("admin.publishedProperties")}</p>
                          {sparklineData.properties.length > 0 && (
                            <div className="h-10">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={sparklineData.properties}>
                                  <Area type="monotone" dataKey="value" stroke="hsl(25, 100%, 50%)" fill="hsl(25, 100%, 50%)" fillOpacity={0.2} strokeWidth={1.5} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Total Inquiries with Sparkline - Clickable */}
                      <Card 
                        className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                        onClick={() => {
                          setSelectedChartType("inquiries");
                          setChartDialogOpen(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-lg bg-purple-500/10">
                              <MessageSquare className="w-5 h-5 text-purple-500" />
                            </div>
                            <p className="text-2xl font-bold">{totalInquiries}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{t("admin.totalInquiries")}</p>
                          {sparklineData.inquiries.length > 0 && (
                            <div className="h-10">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={sparklineData.inquiries}>
                                  <Area type="monotone" dataKey="value" stroke="hsl(280, 100%, 50%)" fill="hsl(280, 100%, 50%)" fillOpacity={0.2} strokeWidth={1.5} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Verified Users */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-lg bg-emerald-500/10">
                              <UserCheck className="w-5 h-5 text-emerald-500" />
                            </div>
                            <p className="text-2xl font-bold">{verifiedUsers}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{t("admin.verifiedUsers")}</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Performance Indicators with Month Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/20">
                              <Percent className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-2xl font-bold">{conversionRate}%</p>
                              <p className="text-xs text-muted-foreground">{t("admin.conversionRate")}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-accent/20">
                              <Target className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                              <p className="text-2xl font-bold">{avgViewsPerProperty}</p>
                              <p className="text-xs text-muted-foreground">{t("admin.avgViewsPerProperty")}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-success/20">
                              <Users className="w-5 h-5 text-success" />
                            </div>
                            <div>
                              <p className="text-2xl font-bold">+{newUsersThisMonth}</p>
                              <p className="text-xs text-muted-foreground">
                                {language === "fr" ? "Inscriptions (30j)" : "Registrations (30d)"}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-gold/5 to-gold/10 border-gold/20">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gold/20">
                              <Building2 className="w-5 h-5 text-gold" />
                            </div>
                            <div>
                              <p className="text-2xl font-bold">+{newPropertiesThisMonth}</p>
                              <p className="text-xs text-muted-foreground">
                                {language === "fr" ? "Annonces (30j)" : "Listings (30d)"}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Charts Row */}
                    <div className="grid lg:grid-cols-2 gap-6">
                      {/* Traffic Evolution Chart - 30 days */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            {language === "fr" ? "Évolution du trafic (30j)" : "Traffic Evolution (30d)"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={analyticsData}>
                                <defs>
                                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                  </linearGradient>
                                  <linearGradient id="colorInquiries" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} interval={4} />
                                <YAxis className="text-xs" />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: 'hsl(var(--card))', 
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px'
                                  }}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="views" 
                                  stroke="hsl(var(--primary))" 
                                  fillOpacity={1}
                                  fill="url(#colorViews)"
                                  name={language === "fr" ? "Vues" : "Views"}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="inquiries" 
                                  stroke="hsl(var(--accent))" 
                                  fillOpacity={1}
                                  fill="url(#colorInquiries)"
                                  name={language === "fr" ? "Demandes" : "Inquiries"}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Registrations Evolution Chart - 30 days */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            {language === "fr" ? "Inscriptions & Annonces (30j)" : "Registrations & Listings (30d)"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={analyticsData}>
                                <defs>
                                  <linearGradient id="colorRegistrations" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                                  </linearGradient>
                                  <linearGradient id="colorProperties" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--gold))" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="hsl(var(--gold))" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} interval={4} />
                                <YAxis className="text-xs" />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: 'hsl(var(--card))', 
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px'
                                  }}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="registrations" 
                                  stroke="hsl(var(--success))" 
                                  fillOpacity={1}
                                  fill="url(#colorRegistrations)"
                                  name={language === "fr" ? "Inscriptions" : "Registrations"}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="properties" 
                                  stroke="hsl(var(--gold))" 
                                  fillOpacity={1}
                                  fill="url(#colorProperties)"
                                  name={language === "fr" ? "Annonces" : "Listings"}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Additional Charts Row */}
                    <div className="grid lg:grid-cols-3 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Home className="w-5 h-5" />
                            {language === "fr" ? "Types de biens" : "Property Types"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={propertyTypeStats}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={100}
                                  fill="#8884d8"
                                  paddingAngle={5}
                                  dataKey="value"
                                  label={({ name, value }) => `${name}: ${value}`}
                                >
                                  {propertyTypeStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      {/* User Types Distribution */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            {language === "fr" ? "Types d'utilisateurs" : "User Types"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={userTypeStats}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="name" className="text-xs" />
                                <YAxis className="text-xs" />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: 'hsl(var(--card))', 
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px'
                                  }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                  {userTypeStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Listing Types Distribution */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Globe className="w-5 h-5" />
                            {language === "fr" ? "Types de location" : "Listing Types"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={listingTypeStats}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={100}
                                  fill="#8884d8"
                                  paddingAngle={5}
                                  dataKey="value"
                                  label={({ name, value }) => `${name}: ${value}`}
                                >
                                  {listingTypeStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                {/* NOUVEL ONGLET : Utilisateurs */}
                <TabsContent value="users">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        {language === "fr" ? "Gestion des utilisateurs" : "User Management"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {filteredUsers.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            {language === "fr" ? "Aucun utilisateur" : "No users"}
                          </p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[600px]">
                          <div className="space-y-3">
                            {filteredUsers.map((appUser) => (
                              <div
                                key={appUser.id}
                                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                                  appUser.is_suspended 
                                    ? "border-destructive/50 bg-destructive/5" 
                                    : "border-border hover:bg-secondary/50"
                                }`}
                              >
                                <div className="flex items-center gap-4 flex-1">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    appUser.is_suspended ? "bg-destructive/20" : "bg-primary/10"
                                  }`}>
                                    <UserCheck className={`w-5 h-5 ${
                                      appUser.is_suspended ? "text-destructive" : "text-primary"
                                    }`} />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">{appUser.full_name || appUser.email}</p>
                                      {appUser.is_suspended && (
                                        <Badge variant="destructive" className="text-xs">
                                          <Ban className="w-3 h-3 mr-1" />
                                          {language === "fr" ? "Suspendu" : "Suspended"}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{appUser.email}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                      <span className="capitalize">{appUser.user_type}</span>
                                      <span>•</span>
                                      <span>{getVerificationStatusLabel(appUser.verification_status)}</span>
                                      <span>•</span>
                                      <span>{appUser.properties_count} {language === "fr" ? "annonces" : "listings"}</span>
                                      <span>•</span>
                                      <span>{format(new Date(appUser.created_at), "dd MMM yyyy", { locale: dateLocale })}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUser(appUser);
                                      setUserDialogOpen(true);
                                    }}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {appUser.is_suspended ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-success hover:text-success"
                                      onClick={() => {
                                        setSelectedUser(appUser);
                                        setUserActionType("unsuspend");
                                        setUserActionDialogOpen(true);
                                      }}
                                    >
                                      <Unlock className="w-4 h-4" />
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => {
                                        setSelectedUser(appUser);
                                        setUserActionType("suspend");
                                        setUserActionDialogOpen(true);
                                      }}
                                    >
                                      <Lock className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUser(appUser);
                                      setUserActionType("delete");
                                      setUserActionDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Properties Tab - Grouped by User */}
                <TabsContent value="properties">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        {language === "fr" ? "Annonces par utilisateur" : "Listings by User"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {properties.length === 0 ? (
                        <div className="text-center py-8">
                          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            {language === "fr" ? "Aucune annonce" : "No listings"}
                          </p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[600px]">
                          <div className="space-y-4">
                            {Object.entries(
                              properties.reduce<Record<string, Property[]>>((acc, prop) => {
                                const key = prop.owner_id;
                                if (!acc[key]) acc[key] = [];
                                acc[key].push(prop);
                                return acc;
                              }, {})
                            ).map(([ownerId, ownerProps]) => {
                              const published = ownerProps.filter(p => p.is_published).length;
                              const drafts = ownerProps.filter(p => !p.is_published).length;
                              const totalViews = ownerProps.reduce((s, p) => s + (p.view_count || 0), 0);
                              const ownerName = ownerProps[0]?.owner_name || (language === "fr" ? "Inconnu" : "Unknown");

                              return (
                                <div key={ownerId} className="rounded-xl border border-border p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-primary" />
                                      </div>
                                      <div>
                                        <p className="font-semibold">{ownerName}</p>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                          <span>{published} {language === "fr" ? "publiée(s)" : "published"}</span>
                                          <span>{drafts} {language === "fr" ? "brouillon(s)" : "draft(s)"}</span>
                                          <span>{totalViews} {language === "fr" ? "vues" : "views"}</span>
                                          <span>
                                            {language === "fr" ? "Conversion" : "Conv."}: {totalViews > 0 
                                              ? Math.round((inquiries.filter(i => ownerProps.some(p => p.id === i.property_id)).length / totalViews) * 100) 
                                              : 0}%
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <Badge variant="secondary">{ownerProps.length} {language === "fr" ? "annonces" : "listings"}</Badge>
                                  </div>
                                  <div className="grid gap-2 pl-13">
                                    {ownerProps.map((property) => (
                                      <div
                                        key={property.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                            {property.images?.[0] ? (
                                              <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center">
                                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                              </div>
                                            )}
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium line-clamp-1">{property.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {property.city} • {property.price.toLocaleString()} FCFA
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge
                                            variant={property.is_published ? "default" : "secondary"}
                                            className={property.is_published ? "bg-success text-xs" : "text-xs"}
                                          >
                                            {property.is_published 
                                              ? (language === "fr" ? "Publiée" : "Published") 
                                              : (language === "fr" ? "Brouillon" : "Draft")}
                                          </Badge>
                                          <Button variant="ghost" size="sm" onClick={() => navigate(`/property/${property.id}`)}>
                                            <Eye className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Testimonials Tab */}
                <TabsContent value="testimonials">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5" />
                        {language === "fr" ? "Témoignages" : "Testimonials"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {filteredTestimonials.length === 0 ? (
                        <div className="text-center py-8">
                          <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            {language === "fr" ? "Aucun témoignage" : "No testimonials"}
                          </p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[500px]">
                          <div className="space-y-4">
                            {filteredTestimonials.map((testimonial) => (
                              <div
                                key={testimonial.id}
                                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                              >
                                <div className="flex items-center gap-4 flex-1">
                                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <Star className="w-5 h-5 text-purple-500" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-medium">{testimonial.user_name}</p>
                                      <div className="flex items-center">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                          <Star 
                                            key={i} 
                                            className={`w-3 h-3 ${i < testimonial.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {testimonial.content}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1">
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(testimonial.created_at), "dd MMM yyyy", { locale: dateLocale })}
                                      </span>
                                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <ThumbsUp className="w-3 h-3" />
                                        {testimonial.likes_count}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge
                                    variant={testimonial.is_approved ? "default" : "secondary"}
                                    className={testimonial.is_approved ? "bg-success" : ""}
                                  >
                                    {testimonial.is_approved 
                                      ? (language === "fr" ? "Approuvé" : "Approved") 
                                      : (language === "fr" ? "En attente" : "Pending")}
                                  </Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTestimonial(testimonial);
                                      setTestimonialDialogOpen(true);
                                    }}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Inquiries Tab */}
                <TabsContent value="inquiries">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        {language === "fr" ? "Demandes de renseignements" : "Property Inquiries"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {filteredInquiries.length === 0 ? (
                        <div className="text-center py-8">
                          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            {language === "fr" ? "Aucune demande" : "No inquiries"}
                          </p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[500px]">
                          <div className="space-y-4">
                            {filteredInquiries.map((inquiry) => (
                              <div
                                key={inquiry.id}
                                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                                  inquiry.is_read 
                                    ? "border-border hover:bg-secondary/50" 
                                    : "border-primary/50 bg-primary/5 hover:bg-primary/10"
                                }`}
                              >
                                <div className="flex items-center gap-4 flex-1">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                    inquiry.is_read ? "bg-blue-500/10" : "bg-primary/20"
                                  }`}>
                                    <MessageSquare className={`w-5 h-5 ${
                                      inquiry.is_read ? "text-blue-500" : "text-primary"
                                    }`} />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium">{inquiry.sender_name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {inquiry.property_title}
                                    </p>
                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                      {inquiry.message}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {format(new Date(inquiry.created_at), "dd MMM yyyy HH:mm", { locale: dateLocale })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge
                                    variant={inquiry.is_read ? "secondary" : "default"}
                                  >
                                    {inquiry.is_read 
                                      ? (language === "fr" ? "Lu" : "Read") 
                                      : (language === "fr" ? "Non lu" : "Unread")}
                                  </Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedInquiry(inquiry);
                                      setInquiryDialogOpen(true);
                                    }}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Documents Tab - Grouped by User avec validation groupée */}
                <TabsContent value="documents">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("admin.verificationDocs")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {filteredDocs.length === 0 ? (
                        <div className="text-center py-8">
                          <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">{t("admin.noDocsToShow")}</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[600px]">
                          <div className="space-y-6">
                            {/* Group docs by user_id */}
                            {Object.entries(
                              filteredDocs.reduce<Record<string, VerificationDocument[]>>((acc, doc) => {
                                const key = doc.user_id;
                                if (!acc[key]) acc[key] = [];
                                acc[key].push(doc);
                                return acc;
                              }, {})
                            ).map(([userId, userDocs]) => {
                              const pendingDocsForUser = userDocs.filter(d => d.status === "pending");
                              const hasPendingLevel2 = pendingDocsForUser.some(d => d.verification_level === "level_2");

                              return (
                                <div key={userId} className="rounded-xl border border-border p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-primary" />
                                      </div>
                                      <div>
                                        <p className="font-semibold">{userDocs[0].user_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {userDocs.length} {language === "fr" ? "document(s)" : "document(s)"} • {getLevelLabel(userDocs[0].verification_level)}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {hasPendingLevel2 && pendingDocsForUser.length >= 3 && (
                                        <Button
                                          size="sm"
                                          className="gap-2 bg-success hover:bg-success/90"
                                          onClick={() => handleApproveAllUserDocuments(userId)}
                                          disabled={validatingAllDocs}
                                        >
                                          {validatingAllDocs ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <CheckSquare className="w-4 h-4" />
                                          )}
                                          {language === "fr" ? "Tout valider" : "Validate all"}
                                        </Button>
                                      )}
                                      <Badge variant={
                                        userDocs.every(d => d.status === "approved") ? "default" :
                                        userDocs.some(d => d.status === "rejected") ? "destructive" : "secondary"
                                      } className={userDocs.every(d => d.status === "approved") ? "bg-success" : ""}>
                                        {userDocs.every(d => d.status === "approved") 
                                          ? (language === "fr" ? "Tous validés" : "All approved")
                                          : userDocs.some(d => d.status === "rejected")
                                          ? (language === "fr" ? "Rejeté" : "Rejected")
                                          : (language === "fr" ? "En attente" : "Pending")}
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  {/* Individual documents in grid */}
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {userDocs.map((doc) => (
                                      <div
                                        key={doc.id}
                                        className="rounded-lg border border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                                        onClick={() => {
                                          setSelectedDoc(doc);
                                          setDocDialogOpen(true);
                                        }}
                                      >
                                        {/* Image preview */}
                                        <div className="aspect-[4/3] bg-muted relative">
                                          <img
                                            src={doc.file_url}
                                            alt={getDocTypeLabel(doc.document_type)}
                                            className="w-full h-full object-cover"
                                            crossOrigin="anonymous"
                                            onError={(e) => {
                                              const img = e.target as HTMLImageElement;
                                              // Try signed URL if public URL fails
                                              if (!img.dataset.retried) {
                                                img.dataset.retried = "true";
                                                const path = doc.file_url.split("/verification-documents/").pop();
                                                if (path) {
                                                  supabase.storage.from("verification-documents").createSignedUrl(path, 3600).then(({ data }) => {
                                                    if (data?.signedUrl) img.src = data.signedUrl;
                                                    else img.style.display = "none";
                                                  });
                                                }
                                              } else {
                                                img.style.display = "none";
                                              }
                                            }}
                                          />
                                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <FileText className="w-8 h-8 text-muted-foreground opacity-30" />
                                          </div>
                                          <Badge 
                                            variant={doc.status === "approved" ? "default" : doc.status === "rejected" ? "destructive" : "secondary"}
                                            className={`absolute top-2 right-2 text-xs ${doc.status === "approved" ? "bg-success" : ""}`}
                                          >
                                            {doc.status === "approved" ? "✓" : doc.status === "rejected" ? "✗" : "⏳"}
                                          </Badge>
                                        </div>
                                        <div className="p-2">
                                          <p className="text-xs font-medium truncate">{getDocTypeLabel(doc.document_type)}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {format(new Date(doc.created_at), "dd MMM yyyy", { locale: dateLocale })}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Reports Tab */}
                <TabsContent value="reports">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("admin.userReports")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {filteredReports.length === 0 ? (
                        <div className="text-center py-8">
                          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">{t("admin.noReportsToShow")}</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[500px]">
                          <div className="space-y-4">
                            {filteredReports.map((report) => (
                              <div
                                key={report.id}
                                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-destructive" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{report.reason}</p>
                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                      {report.description || t("admin.noDescription")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(report.created_at), "dd MMM yyyy HH:mm", { locale: dateLocale })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge
                                    variant={
                                      report.status === "approved" ? "default" :
                                      report.status === "rejected" ? "destructive" : "secondary"
                                    }
                                  >
                                    {report.status === "approved" ? t("admin.processed") :
                                     report.status === "rejected" ? t("admin.rejected") : t("admin.pending")}
                                  </Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedReport(report);
                                      setReportDialogOpen(true);
                                    }}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>
        </main>

        {/* Document Review Dialog */}
        <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("admin.reviewDocument")}</DialogTitle>
              <DialogDescription>
                {selectedDoc && getDocTypeLabel(selectedDoc.document_type)} - {selectedDoc && getLevelLabel(selectedDoc.verification_level)}
              </DialogDescription>
            </DialogHeader>
            
            {selectedDoc && (
              <div className="space-y-4">
                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                  {selectedDoc.file_url && (
                    selectedDoc.document_type.includes("video") ? (
                      <video 
                        src={selectedDoc.file_url} 
                        controls 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <img 
                        src={selectedDoc.file_url} 
                        alt="Document" 
                        className="w-full h-full object-contain"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          if (!img.dataset.retried) {
                            img.dataset.retried = "true";
                            const path = selectedDoc.file_url.split("/verification-documents/").pop();
                            if (path) {
                              supabase.storage.from("verification-documents").createSignedUrl(path, 3600).then(({ data }) => {
                                if (data?.signedUrl) img.src = data.signedUrl;
                              });
                            }
                          }
                        }}
                      />
                    )
                  )}
                </div>

                {/* Download button */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = selectedDoc.file_url;
                      link.target = "_blank";
                      link.download = selectedDoc.file_name || "document";
                      link.click();
                    }}
                  >
                    {language === "fr" ? "📥 Télécharger" : "📥 Download"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t("admin.user")}</p>
                    <p className="font-medium">{selectedDoc.user_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("admin.date")}</p>
                    <p className="font-medium">
                      {format(new Date(selectedDoc.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </div>

                {selectedDoc.status === "pending" && (
                  <>
                    <Textarea
                      placeholder={t("admin.rejectionReason")}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                    
                    <DialogFooter className="gap-2">
                      <Button
                        variant="destructive"
                        onClick={() => handleRejectDocument(selectedDoc)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        {t("admin.reject")}
                      </Button>
                      <Button
                        onClick={() => handleApproveDocument(selectedDoc)}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {t("admin.approve")}
                      </Button>
                    </DialogFooter>
                  </>
                )}

                {selectedDoc.status === "rejected" && selectedDoc.rejection_reason && (
                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                    <p className="text-sm text-destructive font-medium">{t("admin.rejectionReason")}:</p>
                    <p className="text-sm text-destructive/80">{selectedDoc.rejection_reason}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Report Review Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("admin.reviewReport")}</DialogTitle>
              <DialogDescription>
                {selectedReport?.reason}
              </DialogDescription>
            </DialogHeader>
            
            {selectedReport && (
              <div className="space-y-4">
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-sm">{selectedReport.description || t("admin.noDescription")}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t("admin.date")}</p>
                    <p className="font-medium">
                      {format(new Date(selectedReport.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("admin.type")}</p>
                    <p className="font-medium">
                      {selectedReport.reported_property_id ? t("admin.property") : t("admin.user")}
                    </p>
                  </div>
                </div>

                {selectedReport.status === "pending" && (
                  <>
                    <Textarea
                      placeholder={t("admin.resolutionNotes")}
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                    />
                    
                    <DialogFooter className="gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleResolveReport(selectedReport, "rejected")}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        {t("admin.reject")}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleResolveReport(selectedReport, "approved")}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {t("admin.validateReport")}
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Testimonial Review Dialog */}
        <Dialog open={testimonialDialogOpen} onOpenChange={setTestimonialDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {language === "fr" ? "Examiner le témoignage" : "Review Testimonial"}
              </DialogTitle>
              <DialogDescription>
                {selectedTestimonial?.user_name}
              </DialogDescription>
            </DialogHeader>
            
            {selectedTestimonial && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-5 h-5 ${i < selectedTestimonial.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`}
                    />
                  ))}
                  <span className="text-sm text-muted-foreground ml-2">
                    ({selectedTestimonial.rating}/5)
                  </span>
                </div>

                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-sm">{selectedTestimonial.content}</p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {format(new Date(selectedTestimonial.created_at), "dd/MM/yyyy HH:mm")}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <ThumbsUp className="w-4 h-4" />
                    {selectedTestimonial.likes_count} likes
                  </span>
                </div>

                {!selectedTestimonial.is_approved && (
                  <DialogFooter className="gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => handleRejectTestimonial(selectedTestimonial)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {language === "fr" ? "Supprimer" : "Delete"}
                    </Button>
                    <Button
                      onClick={() => handleApproveTestimonial(selectedTestimonial)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {language === "fr" ? "Approuver" : "Approve"}
                    </Button>
                  </DialogFooter>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Inquiry Review Dialog */}
        <Dialog open={inquiryDialogOpen} onOpenChange={setInquiryDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {language === "fr" ? "Demande de renseignements" : "Property Inquiry"}
              </DialogTitle>
              <DialogDescription>
                {selectedInquiry?.property_title}
              </DialogDescription>
            </DialogHeader>
            
            {selectedInquiry && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{language === "fr" ? "Nom" : "Name"}</p>
                    <p className="font-medium">{selectedInquiry.sender_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedInquiry.sender_email}</p>
                  </div>
                  {selectedInquiry.sender_phone && (
                    <div>
                      <p className="text-muted-foreground">{language === "fr" ? "Téléphone" : "Phone"}</p>
                      <p className="font-medium">{selectedInquiry.sender_phone}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {format(new Date(selectedInquiry.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-sm font-medium mb-2">Message:</p>
                  <p className="text-sm">{selectedInquiry.message}</p>
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setInquiryDialogOpen(false)}
                  >
                    {language === "fr" ? "Fermer" : "Close"}
                  </Button>
                  <Button
                    onClick={() => handleRespondToInquiry(selectedInquiry)}
                    disabled={respondingToInquiry}
                  >
                    {respondingToInquiry ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {language === "fr" ? "Répondre" : "Respond"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* NOUVEAU : User Details Dialog */}
        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {language === "fr" ? "Détails de l'utilisateur" : "User Details"}
              </DialogTitle>
              <DialogDescription>
                {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>
            
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{language === "fr" ? "Nom" : "Name"}</p>
                    <p className="font-medium">{selectedUser.full_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium capitalize">{selectedUser.user_type}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{language === "fr" ? "Inscription" : "Registered"}</p>
                    <p className="font-medium">
                      {format(new Date(selectedUser.created_at), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{language === "fr" ? "Dernière connexion" : "Last login"}</p>
                    <p className="font-medium">
                      {selectedUser.last_sign_in_at 
                        ? format(new Date(selectedUser.last_sign_in_at), "dd/MM/yyyy HH:mm")
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{language === "fr" ? "Vérification" : "Verification"}</p>
                    <p className="font-medium">{getVerificationStatusLabel(selectedUser.verification_status)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{language === "fr" ? "Annonces" : "Listings"}</p>
                    <p className="font-medium">{selectedUser.properties_count}</p>
                  </div>
                </div>

                {selectedUser.is_suspended && (
                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                    <p className="text-sm text-destructive font-medium">
                      {language === "fr" ? "Compte suspendu" : "Account suspended"}
                    </p>
                  </div>
                )}

                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setUserDialogOpen(false)}
                  >
                    {language === "fr" ? "Fermer" : "Close"}
                  </Button>
                  {selectedUser.is_suspended ? (
                    <Button
                      variant="outline"
                      className="text-success"
                      onClick={() => {
                        setUserDialogOpen(false);
                        setUserActionType("unsuspend");
                        setUserActionDialogOpen(true);
                      }}
                    >
                      <Unlock className="w-4 h-4 mr-2" />
                      {language === "fr" ? "Réactiver" : "Reactivate"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="text-destructive"
                      onClick={() => {
                        setUserDialogOpen(false);
                        setUserActionType("suspend");
                        setUserActionDialogOpen(true);
                      }}
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      {language === "fr" ? "Suspendre" : "Suspend"}
                    </Button>
                  )}
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* NOUVEAU : User Action Confirmation Dialog */}
        <Dialog open={userActionDialogOpen} onOpenChange={setUserActionDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {userActionType === "suspend" && <Lock className="w-5 h-5 text-destructive" />}
                {userActionType === "unsuspend" && <Unlock className="w-5 h-5 text-success" />}
                {userActionType === "delete" && <Trash2 className="w-5 h-5 text-destructive" />}
                {userActionType === "suspend" && (language === "fr" ? "Confirmer la suspension" : "Confirm suspension")}
                {userActionType === "unsuspend" && (language === "fr" ? "Confirmer la réactivation" : "Confirm reactivation")}
                {userActionType === "delete" && (language === "fr" ? "Confirmer la suppression" : "Confirm deletion")}
              </DialogTitle>
              <DialogDescription>
                {userActionType === "suspend" && (language === "fr" 
                  ? `Voulez-vous vraiment suspendre le compte de ${selectedUser?.full_name || selectedUser?.email} ? Les annonces seront dépubliées.` 
                  : `Do you really want to suspend ${selectedUser?.full_name || selectedUser?.email}'s account? Listings will be unpublished.`)}
                {userActionType === "unsuspend" && (language === "fr" 
                  ? `Voulez-vous vraiment réactiver le compte de ${selectedUser?.full_name || selectedUser?.email} ?` 
                  : `Do you really want to reactivate ${selectedUser?.full_name || selectedUser?.email}'s account?`)}
                {userActionType === "delete" && (language === "fr" 
                  ? `ATTENTION : Cette action est irréversible. Toutes les données de ${selectedUser?.full_name || selectedUser?.email} seront supprimées définitivement.` 
                  : `WARNING: This action is irreversible. All data for ${selectedUser?.full_name || selectedUser?.email} will be permanently deleted.`)}
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setUserActionDialogOpen(false);
                  setUserActionType(null);
                }}
              >
                {language === "fr" ? "Annuler" : "Cancel"}
              </Button>
              {userActionType === "suspend" && (
                <Button
                  variant="destructive"
                  onClick={() => selectedUser && handleSuspendUser(selectedUser.user_id)}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {language === "fr" ? "Suspendre" : "Suspend"}
                </Button>
              )}
              {userActionType === "unsuspend" && (
                <Button
                  variant="default"
                  className="bg-success hover:bg-success/90"
                  onClick={() => selectedUser && handleUnsuspendUser(selectedUser.user_id)}
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  {language === "fr" ? "Réactiver" : "Reactivate"}
                </Button>
              )}
              {userActionType === "delete" && (
                <Button
                  variant="destructive"
                  onClick={() => selectedUser && handleDeleteUser(selectedUser.user_id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {language === "fr" ? "Supprimer définitivement" : "Delete permanently"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Expanded Chart Dialog */}
        <Dialog open={chartDialogOpen} onOpenChange={setChartDialogOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedChartType === "views" && (
                  <>
                    <TrendingUp className="w-5 h-5 text-primary" />
                    {language === "fr" ? "Évolution des vues (30 jours)" : "Views Evolution (30 days)"}
                  </>
                )}
                {selectedChartType === "users" && (
                  <>
                    <Users className="w-5 h-5 text-blue-500" />
                    {language === "fr" ? "Évolution des inscriptions (30 jours)" : "Registrations Evolution (30 days)"}
                  </>
                )}
                {selectedChartType === "properties" && (
                  <>
                    <Home className="w-5 h-5 text-orange-500" />
                    {language === "fr" ? "Évolution des annonces (30 jours)" : "Listings Evolution (30 days)"}
                  </>
                )}
                {selectedChartType === "inquiries" && (
                  <>
                    <MessageSquare className="w-5 h-5 text-purple-500" />
                    {language === "fr" ? "Évolution des demandes (30 jours)" : "Inquiries Evolution (30 days)"}
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {language === "fr" 
                  ? "Graphique détaillé sur les 30 derniers jours" 
                  : "Detailed chart for the last 30 days"}
              </DialogDescription>
            </DialogHeader>
            
            <div className="h-[400px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData}>
                  <defs>
                    <linearGradient id="colorChartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop 
                        offset="5%" 
                        stopColor={
                          selectedChartType === "views" ? "hsl(var(--primary))" :
                          selectedChartType === "users" ? "hsl(210, 100%, 50%)" :
                          selectedChartType === "properties" ? "hsl(25, 100%, 50%)" :
                          "hsl(280, 100%, 50%)"
                        } 
                        stopOpacity={0.4}
                      />
                      <stop 
                        offset="95%" 
                        stopColor={
                          selectedChartType === "views" ? "hsl(var(--primary))" :
                          selectedChartType === "users" ? "hsl(210, 100%, 50%)" :
                          selectedChartType === "properties" ? "hsl(25, 100%, 50%)" :
                          "hsl(280, 100%, 50%)"
                        } 
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs" 
                    tick={{ fontSize: 11 }}
                    interval={2}
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey={
                      selectedChartType === "views" ? "views" :
                      selectedChartType === "users" ? "registrations" :
                      selectedChartType === "properties" ? "properties" :
                      "inquiries"
                    }
                    stroke={
                      selectedChartType === "views" ? "hsl(var(--primary))" :
                      selectedChartType === "users" ? "hsl(210, 100%, 50%)" :
                      selectedChartType === "properties" ? "hsl(25, 100%, 50%)" :
                      "hsl(280, 100%, 50%)"
                    }
                    fillOpacity={1}
                    fill="url(#colorChartGradient)"
                    strokeWidth={2}
                    name={
                      selectedChartType === "views" ? (language === "fr" ? "Vues" : "Views") :
                      selectedChartType === "users" ? (language === "fr" ? "Inscriptions" : "Registrations") :
                      selectedChartType === "properties" ? (language === "fr" ? "Annonces" : "Listings") :
                      (language === "fr" ? "Demandes" : "Inquiries")
                    }
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {selectedChartType === "views" ? totalViews :
                   selectedChartType === "users" ? newUsersThisMonth :
                   selectedChartType === "properties" ? newPropertiesThisMonth :
                   analyticsData.reduce((sum, d) => sum + d.inquiries, 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === "fr" ? "Total (30j)" : "Total (30d)"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {Math.round(
                    (selectedChartType === "views" ? totalViews :
                     selectedChartType === "users" ? newUsersThisMonth :
                     selectedChartType === "properties" ? newPropertiesThisMonth :
                     analyticsData.reduce((sum, d) => sum + d.inquiries, 0)) / 30
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === "fr" ? "Moyenne/jour" : "Avg/day"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {analyticsData.length > 0 
                    ? Math.max(...analyticsData.map(d => 
                        selectedChartType === "views" ? d.views :
                        selectedChartType === "users" ? d.registrations :
                        selectedChartType === "properties" ? d.properties :
                        d.inquiries
                      ))
                    : 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === "fr" ? "Maximum" : "Maximum"}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default AdminDashboard;