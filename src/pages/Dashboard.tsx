import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { 
  Home, Plus, Eye, MessageSquare, Heart, TrendingUp, 
  Building2, Calendar, MoreVertical, Edit, Trash2, 
  ToggleLeft, ToggleRight, Mail, Phone, Clock, User,
  BarChart3, Reply, AlertTriangle, FileText
} from "lucide-react";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { PropertyAnalytics } from "@/components/PropertyAnalytics";
import { NotificationActivateButton } from "@/components/NotificationActivateButton";

type Property = Tables<"properties">;
type Inquiry = Tables<"property_inquiries"> & {
  property?: { title: string };
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const dateLocale = language === "fr" ? fr : enUS;
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<any>(null);

  // Stats
  const totalViews = properties.reduce((acc, p) => acc + (p.view_count || 0), 0);
  const activeListings = properties.filter(p => p.is_published).length;
  const unreadInquiries = inquiries.filter(i => !i.is_read).length;

  // Check if documents were rejected or need resubmission
  const needsResubmission = verificationStatus && (
    verificationStatus.level_2_status === "rejected" || 
    verificationStatus.level_2_status === "expired" ||
    (!verificationStatus.identity_document_verified && verificationStatus.level_2_status !== "approved")
  );

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/dashboard");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch verification status
      const { data: verifData } = await supabase
        .from("user_verifications")
        .select("level_2_status, identity_document_verified")
        .eq("user_id", user.id)
        .maybeSingle();
      
      setVerificationStatus(verifData);

      // Fetch properties
      const { data: propsData, error: propsError } = await supabase
        .from("properties")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (propsError) throw propsError;
      setProperties(propsData || []);

      // Fetch inquiries for all properties
      if (propsData && propsData.length > 0) {
        const propertyIds = propsData.map(p => p.id);
        const { data: inqData, error: inqError } = await supabase
          .from("property_inquiries")
          .select("*, property:properties(title)")
          .in("property_id", propertyIds)
          .order("created_at", { ascending: false });

        if (inqError) throw inqError;
        setInquiries(inqData || []);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("error.generic")
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePublished = async (propertyId: string, currentState: boolean) => {
    try {
      // If trying to publish, check identity verification first
      if (!currentState) {
        const { data: verificationData } = await supabase
          .from("user_verifications")
          .select("identity_document_verified, level_2_status")
          .eq("user_id", user!.id)
          .maybeSingle();

        const isVerified = verificationData?.identity_document_verified === true || verificationData?.level_2_status === "approved";

        if (!isVerified) {
          toast({
            variant: "destructive",
            title: language === "fr" ? "Identité non vérifiée" : "Identity not verified",
            description: language === "fr"
              ? "Votre identité doit être vérifiée par un administrateur avant de pouvoir publier vos annonces."
              : "Your identity must be verified by an administrator before you can publish your listings.",
          });
          return;
        }
      }

      const { error } = await supabase
        .from("properties")
        .update({ is_published: !currentState })
        .eq("id", propertyId);

      if (error) throw error;
      
      setProperties(prev => 
        prev.map(p => p.id === propertyId ? { ...p, is_published: !currentState } : p)
      );
      
      toast({
        title: currentState ? t("toast.listingHidden") : t("toast.listingPublished"),
        description: currentState 
          ? t("dashboard.hide") 
          : t("dashboard.show")
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("error.generic")
      });
    }
  };

  const handleDelete = async () => {
    if (!propertyToDelete) return;

    try {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", propertyToDelete);

      if (error) throw error;
      
      setProperties(prev => prev.filter(p => p.id !== propertyToDelete));
      toast({
        title: t("toast.listingDeleted"),
        description: t("common.success")
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("error.generic")
      });
    } finally {
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
    }
  };

  const markInquiryAsRead = async (inquiryId: string) => {
    try {
      const { error } = await supabase
        .from("property_inquiries")
        .update({ is_read: true })
        .eq("id", inquiryId);

      if (error) throw error;
      
      setInquiries(prev => 
        prev.map(i => i.id === inquiryId ? { ...i, is_read: true } : i)
      );
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t("dashboard.title")} | Habynex</title>
        <meta name="description" content={t("dashboard.subtitle")} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="pt-20 pb-12">
          <div className="container mx-auto px-4">
            {/* Header - Responsive */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
            >
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{t("dashboard.title")}</h1>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                  {t("dashboard.subtitle")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => navigate("/create-listing")} className="gap-2" size="sm">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("dashboard.newListing")}</span>
                  <span className="sm:hidden">Nouveau</span>
                </Button>
                <NotificationActivateButton />
              </div>
            </motion.div>

            {/* Resubmit Documents Banner - Responsive */}
            {needsResubmission && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mb-8"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-destructive/30 bg-destructive/5">
                  <div className="p-2 rounded-lg bg-destructive/10 flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm sm:text-base">
                      {language === "fr" 
                        ? "Vérification d'identité requise" 
                        : "Identity verification required"}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {verificationStatus?.level_2_status === "rejected"
                        ? (language === "fr" ? "Vos documents ont été rejetés. Veuillez les resoumettre." : "Your documents were rejected. Please resubmit them.")
                        : (language === "fr" ? "Vos annonces resteront en brouillon tant que votre identité n'est pas vérifiée." : "Your listings will remain as drafts until your identity is verified.")}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="gap-2 flex-shrink-0 w-full sm:w-auto text-sm"
                    onClick={() => navigate("/identity-verification")}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">{language === "fr" ? "Resoumettre mes documents" : "Resubmit documents"}</span>
                    <span className="sm:hidden">{language === "fr" ? "Resoumettre" : "Resubmit"}</span>
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Stats Cards - Responsive Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8"
            >
              <Card className="overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl sm:text-2xl font-bold text-foreground">{properties.length}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t("dashboard.totalListings")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-success/10 flex-shrink-0">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl sm:text-2xl font-bold text-foreground">{activeListings}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t("dashboard.activeListings")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-secondary flex-shrink-0">
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl sm:text-2xl font-bold text-foreground">{totalViews}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t("dashboard.totalViews")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-destructive/10 flex-shrink-0">
                      <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl sm:text-2xl font-bold text-foreground">{unreadInquiries}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t("dashboard.newInquiries")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Tabs - Responsive */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Tabs defaultValue="properties" className="space-y-4 sm:space-y-6">
                <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
                  <TabsTrigger value="properties" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
                    <Home className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t("dashboard.myListings")}</span>
                    <span className="sm:hidden">Annonces</span>
                  </TabsTrigger>
                  <TabsTrigger value="inquiries" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
                    <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t("dashboard.inquiries")}</span>
                    <span className="sm:hidden">Messages</span>
                    {unreadInquiries > 0 && (
                      <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0">
                        {unreadInquiries}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
                    <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t("dashboard.analytics")}</span>
                    <span className="sm:hidden">Stats</span>
                  </TabsTrigger>
                </TabsList>

                {/* Properties Tab - Responsive */}
                <TabsContent value="properties">
                  {properties.length === 0 ? (
                    <Card className="p-8 sm:p-12 text-center">
                      <Building2 className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">
                        {t("dashboard.noListings")}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        {t("dashboard.noListingsMessage")}
                      </p>
                      <Button onClick={() => navigate("/create-listing")} size="sm" className="w-full sm:w-auto">
                        {t("dashboard.newListing")}
                      </Button>
                    </Card>
                  ) : (
                    <div className="grid gap-3 sm:gap-4">
                      {properties.map((property, index) => (
                        <motion.div
                          key={property.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="overflow-hidden">
                            <div className="flex flex-col sm:flex-row">
                              {/* Image - Responsive */}
                              <div 
                                className="w-full sm:w-48 h-40 sm:h-auto min-h-[160px] bg-cover bg-center cursor-pointer flex-shrink-0"
                                style={{ 
                                  backgroundImage: property.images?.[0] 
                                    ? `url(${property.images[0]})` 
                                    : 'linear-gradient(135deg, hsl(var(--muted)), hsl(var(--secondary)))'
                                }}
                                onClick={() => navigate(`/property/${property.id}`)}
                              />
                              
                              {/* Content - Responsive */}
                              <div className="flex-1 p-3 sm:p-4">
                                <div className="flex items-start justify-between gap-2 sm:gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                                      <h3 
                                        className="font-semibold text-foreground text-sm sm:text-base truncate cursor-pointer hover:text-primary transition-colors"
                                        onClick={() => navigate(`/property/${property.id}`)}
                                      >
                                        {property.title}
                                      </h3>
                                      {property.is_published ? (
                                        <Badge variant="default" className="flex-shrink-0 text-xs px-1.5 py-0">
                                          <span className="hidden sm:inline">{t("dashboard.published")}</span>
                                          <span className="sm:hidden">Publié</span>
                                        </Badge>
                                      ) : (
                                        <Badge variant="secondary" className="flex-shrink-0 text-xs px-1.5 py-0">
                                          <span className="hidden sm:inline">{t("dashboard.draft")}</span>
                                          <span className="sm:hidden">Brouillon</span>
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 truncate">
                                      {property.city} {property.neighborhood && `• ${property.neighborhood}`}
                                    </p>
                                    
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                                      <span className="font-semibold text-primary text-sm sm:text-base">
                                        {property.price.toLocaleString()} FCFA/{property.price_unit === "month" ? (language === "fr" ? "mois" : "month") : property.price_unit}
                                      </span>
                                      <span className="flex items-center gap-1 text-muted-foreground">
                                        <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span className="hidden xs:inline">{property.view_count || 0} {t("property.views")}</span>
                                        <span className="xs:hidden">{property.view_count || 0}</span>
                                      </span>
                                      <span className="flex items-center gap-1 text-muted-foreground">
                                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span className="hidden xs:inline">{format(new Date(property.created_at || ""), "d MMM yyyy", { locale: dateLocale })}</span>
                                        <span className="xs:hidden">{format(new Date(property.created_at || ""), "d MMM", { locale: dateLocale })}</span>
                                      </span>
                                    </div>
                                  </div>

                                  {/* Actions - Responsive */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem onClick={() => navigate(`/property/${property.id}`)} className="text-xs sm:text-sm">
                                        <Eye className="w-4 h-4 mr-2" />
                                        {t("common.view")}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => togglePublished(property.id, property.is_published || false)}
                                        className="text-xs sm:text-sm"
                                      >
                                        {property.is_published ? (
                                          <>
                                            <ToggleLeft className="w-4 h-4 mr-2" />
                                            <span className="hidden sm:inline">{t("dashboard.hide")}</span>
                                            <span className="sm:hidden">Masquer</span>
                                          </>
                                        ) : (
                                          <>
                                            <ToggleRight className="w-4 h-4 mr-2" />
                                            <span className="hidden sm:inline">{t("dashboard.show")}</span>
                                            <span className="sm:hidden">Publier</span>
                                          </>
                                        )}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="text-destructive text-xs sm:text-sm"
                                        onClick={() => {
                                          setPropertyToDelete(property.id);
                                          setDeleteDialogOpen(true);
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        {t("common.delete")}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Inquiries Tab - Responsive */}
                <TabsContent value="inquiries">
                  {inquiries.length === 0 ? (
                    <Card className="p-8 sm:p-12 text-center">
                      <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">
                        {t("dashboard.noInquiries")}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {t("dashboard.noInquiriesMessage")}
                      </p>
                    </Card>
                  ) : (
                    <div className="grid gap-3 sm:gap-4">
                      {inquiries.map((inquiry, index) => (
                        <motion.div
                          key={inquiry.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card 
                            className={`overflow-hidden transition-colors ${
                              !inquiry.is_read ? "border-primary/50 bg-primary/5" : ""
                            }`}
                            onClick={() => !inquiry.is_read && markInquiryAsRead(inquiry.id)}
                          >
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex items-start gap-3 sm:gap-4">
                                <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm">
                                    {inquiry.sender_name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="font-medium text-foreground text-sm sm:text-base truncate">
                                        {inquiry.sender_name}
                                      </span>
                                      {!inquiry.is_read && (
                                        <Badge variant="default" className="text-[10px] sm:text-xs px-1.5 py-0 flex-shrink-0">{t("common.new")}</Badge>
                                      )}
                                    </div>
                                    <span className="text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">
                                      {format(new Date(inquiry.created_at || ""), "d MMM, HH:mm", { locale: dateLocale })}
                                    </span>
                                  </div>

                                  <p className="text-xs text-primary mb-1.5 sm:mb-2 truncate">
                                    {t("dashboard.for")} {inquiry.property?.title || "Propriété"}
                                  </p>

                                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 line-clamp-2 sm:line-clamp-3">
                                    {inquiry.message}
                                  </p>

                                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1.5 sm:gap-4 text-xs text-muted-foreground">
                                    <a 
                                      href={`mailto:${inquiry.sender_email}`}
                                      className="flex items-center gap-1 hover:text-primary transition-colors truncate"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Mail className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{inquiry.sender_email}</span>
                                    </a>
                                    {inquiry.sender_phone && (
                                      <a 
                                        href={`tel:${inquiry.sender_phone}`}
                                        className="flex items-center gap-1 hover:text-primary transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Phone className="w-3 h-3 flex-shrink-0" />
                                        <span>{inquiry.sender_phone}</span>
                                      </a>
                                    )}
                                    {inquiry.move_in_date && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3 flex-shrink-0" />
                                        <span className="hidden sm:inline">{t("dashboard.moveIn")} {format(new Date(inquiry.move_in_date), "d MMM yyyy", { locale: dateLocale })}</span>
                                        <span className="sm:hidden">{format(new Date(inquiry.move_in_date), "d MMM", { locale: dateLocale })}</span>
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Reply Button - Responsive */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-2 sm:mt-3 gap-1.5 sm:gap-2 w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!inquiry.is_read) {
                                        markInquiryAsRead(inquiry.id);
                                      }
                                      navigate(`/messages?inquiry=${inquiry.id}&email=${inquiry.sender_email}&name=${encodeURIComponent(inquiry.sender_name)}&property=${inquiry.property_id}`);
                                    }}
                                  >
                                    <Reply className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span className="hidden sm:inline">{t("dashboard.replyToInquiry")}</span>
                                    <span className="sm:hidden">Répondre</span>
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics">
                  <PropertyAnalytics properties={properties} userId={user?.id || ""} />
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Dialog - Responsive */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">{t("dashboard.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              {t("dashboard.deleteMessage")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto text-xs sm:text-sm">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs sm:text-sm"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Dashboard;
