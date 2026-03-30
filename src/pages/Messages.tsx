import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, 
  Plus, 
  Users, 
  Building2, 
  ArrowLeft, 
  Search, 
  MoreVertical,
  Send,
  Home
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { ConversationList } from "@/components/ConversationList";
import { MessageThread } from "@/components/MessageThread";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface PropertyWithOwner {
  id: string;
  title: string;
  owner_id: string;
  images: string[] | null;
  owner_profile?: {
    full_name: string | null;
  };
  price?: number;
  location?: string;
}

// Détection du thème local
const getInitialTheme = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
};

const Messages = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const {
    conversations,
    messages,
    activeConversation,
    setActiveConversation,
    sendMessage,
    startConversation,
    loading,
    refreshConversations
  } = useMessages();
  
  const [showNewChat, setShowNewChat] = useState(false);
  const [properties, setProperties] = useState<PropertyWithOwner[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState(getInitialTheme());

  const isDark = theme === "dark";

  // Appliquer le thème
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  // Classes dynamiques
  const themeClasses = {
    bg: isDark ? "bg-slate-950" : "bg-slate-50",
    sidebar: isDark ? "bg-slate-900" : "bg-white",
    header: isDark ? "bg-slate-800" : "bg-white",
    border: isDark ? "border-slate-700" : "border-slate-200",
    text: isDark ? "text-slate-100" : "text-slate-900",
    textMuted: isDark ? "text-slate-400" : "text-slate-500",
  };

  // Filtrer les propriétés
  const filteredProperties = properties.filter(prop => 
    prop.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prop.owner_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchProperties = async () => {
    if (!user) return;
    setLoadingProperties(true);
    
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, owner_id, images, price, location")
        .neq("owner_id", user.id)
        .eq("is_published", true)
        .limit(20);
      
      if (error) throw error;
      
      // Fetch owner profiles
      const propertiesWithOwners = await Promise.all(
        (data || []).map(async (prop) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", prop.owner_id)
            .single();
          
          return {
            ...prop,
            owner_profile: profile
          };
        })
      );
      
      setProperties(propertiesWithOwners);
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setLoadingProperties(false);
    }
  };

  const handleStartConversation = async (property: PropertyWithOwner) => {
    const convo = await startConversation(property.id, property.owner_id);
    if (convo) {
      setShowNewChat(false);
      setSearchQuery("");
      await refreshConversations();
      const fullConvo = conversations.find(c => c.id === convo.id) || {
        ...convo,
        property: { title: property.title, images: property.images },
        other_user_profile: property.owner_profile,
        last_message_at: convo.created_at
      };
      setActiveConversation(fullConvo as any);
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/messages");
    }
  }, [user, authLoading, navigate]);

  // Handle URL params
  useEffect(() => {
    const conversationId = searchParams.get("conversation");
    const inquiryPropertyId = searchParams.get("property");
    
    if (conversationId && conversations.length > 0) {
      const convo = conversations.find(c => c.id === conversationId);
      if (convo) {
        setActiveConversation(convo);
      }
    } else if (inquiryPropertyId && user && conversations.length > 0) {
      const matchingConvo = conversations.find(c => 
        c.property_id === inquiryPropertyId
      );
      
      if (matchingConvo) {
        setActiveConversation(matchingConvo);
      }
    }
  }, [searchParams, conversations, setActiveConversation, user]);

  if (authLoading) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center", themeClasses.bg)}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  // Si pas d'utilisateur, ne rien afficher (redirection en cours)
  if (!user) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{t("messages.title") || "Messages"} | Habynex</title>
        <meta name="description" content={language === "fr" 
          ? "Consultez vos conversations avec les propriétaires et locataires" 
          : "View your conversations with owners and tenants"
        } />
      </Helmet>

      <div className={cn("min-h-screen", themeClasses.bg)}>
        <Navbar />

        <main className="pt-16">
          <div className="h-[calc(100vh-4rem)]">
            <div className="container mx-auto h-full max-w-7xl px-0 sm:px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full flex flex-col md:flex-row overflow-hidden rounded-none md:rounded-2xl shadow-2xl border-0 md:border"
              >
                {/* Sidebar Conversations */}
                <div
                  className={cn(
                    "w-full md:w-[400px] flex-shrink-0 transition-all duration-300",
                    themeClasses.sidebar,
                    themeClasses.border,
                    activeConversation ? "hidden md:flex md:flex-col" : "flex flex-col"
                  )}
                >
                  {/* Header */}
                  <div className="px-4 py-4 flex items-center justify-between bg-gradient-to-r from-orange-500 via-yellow-500 to-green-500">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <MessageCircle className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h1 className="text-xl font-bold text-white">
                          {language === "fr" ? "Messages" : "Messages"}
                        </h1>
                        <p className="text-xs text-white/80">
                          {conversations.length} {language === "fr" ? "conversations" : "chats"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* New conversation button */}
                      <Dialog open={showNewChat} onOpenChange={(open) => {
                        setShowNewChat(open);
                        if (open) fetchProperties();
                      }}>
                        <DialogTrigger asChild>
                          <button 
                            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all hover:scale-105"
                            title={language === "fr" ? "Nouvelle conversation" : "New conversation"}
                          >
                            <Plus className="h-5 w-5 text-white" />
                          </button>
                        </DialogTrigger>
                        <DialogContent className={cn(
                          "max-w-lg border-0 shadow-2xl",
                          themeClasses.sidebar,
                          themeClasses.text
                        )}>
                          <DialogHeader className="pb-4 border-b border-orange-100 dark:border-orange-900/30">
                            <DialogTitle className={cn("flex items-center gap-2 text-xl", themeClasses.text)}>
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center">
                                <Users className="w-4 h-4 text-white" />
                              </div>
                              {language === "fr" ? "Nouvelle conversation" : "New conversation"}
                            </DialogTitle>
                          </DialogHeader>
                          
                          <div className="py-4 space-y-4">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
                              <Input
                                placeholder={language === "fr" ? "Rechercher une annonce..." : "Search listings..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={cn(
                                  "pl-10 border-orange-200 dark:border-orange-800 focus-visible:ring-orange-500",
                                  themeClasses.bg,
                                  themeClasses.text
                                )}
                              />
                            </div>
                            
                            <p className={cn("text-sm", themeClasses.textMuted)}>
                              {language === "fr" 
                                ? "Sélectionnez une annonce pour contacter le propriétaire :"
                                : "Select a listing to contact the owner:"
                              }
                            </p>
                            
                            {loadingProperties ? (
                              <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
                              </div>
                            ) : filteredProperties.length === 0 ? (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-12"
                              >
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 flex items-center justify-center">
                                  <Building2 className="w-10 h-10 text-orange-500" />
                                </div>
                                <p className={cn("text-lg font-medium mb-2", themeClasses.text)}>
                                  {searchQuery 
                                    ? (language === "fr" ? "Aucune annonce trouvée" : "No listings found")
                                    : (language === "fr" ? "Aucune annonce disponible" : "No listings available")
                                  }
                                </p>
                                <p className={cn("text-sm mb-6", themeClasses.textMuted)}>
                                  {language === "fr" 
                                    ? "Découvrez des biens disponibles près de chez vous"
                                    : "Discover available properties near you"
                                  }
                                </p>
                                <Button 
                                  onClick={() => {
                                    setShowNewChat(false);
                                    navigate("/search");
                                  }}
                                  className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white shadow-lg hover:shadow-xl transition-all"
                                >
                                  {language === "fr" ? "Parcourir les annonces" : "Browse listings"}
                                </Button>
                              </motion.div>
                            ) : (
                              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                <AnimatePresence>
                                  {filteredProperties.map((property, index) => (
                                    <motion.button
                                      key={property.id}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: index * 0.05 }}
                                      onClick={() => handleStartConversation(property)}
                                      className={cn(
                                        "w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 group",
                                        "bg-gradient-to-r from-transparent to-transparent",
                                        "hover:from-orange-50 hover:to-yellow-50",
                                        "dark:hover:from-orange-900/20 dark:hover:to-yellow-900/20",
                                        "border border-transparent hover:border-orange-200 dark:hover:border-orange-800",
                                        "shadow-sm hover:shadow-md"
                                      )}
                                    >
                                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 flex-shrink-0 shadow-inner">
                                        {property.images?.[0] ? (
                                          <img 
                                            src={property.images[0]} 
                                            alt={property.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center">
                                            <Building2 className="w-8 h-8 text-orange-400" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0 text-left">
                                        <p className={cn("font-semibold truncate mb-1", themeClasses.text)}>
                                          {property.title}
                                        </p>
                                        <div className="flex items-center gap-2 text-sm">
                                          <span className="text-green-600 dark:text-green-400 font-medium">
                                            {property.price?.toLocaleString()} FCFA
                                          </span>
                                          <span className="text-slate-300">•</span>
                                          <span className={themeClasses.textMuted}>
                                            {property.owner_profile?.full_name || (language === "fr" ? "Propriétaire" : "Owner")}
                                          </span>
                                        </div>
                                        {property.location && (
                                          <p className="text-xs text-orange-500 mt-1 truncate">
                                            {property.location}
                                          </p>
                                        )}
                                      </div>
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <MessageCircle className="w-5 h-5 text-white" />
                                      </div>
                                    </motion.button>
                                  ))}
                                </AnimatePresence>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {/* Menu options */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all">
                            <MoreVertical className="h-5 w-5 text-white" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className={cn("w-48", themeClasses.sidebar, themeClasses.border)}>
                          <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                            {isDark ? "☀️ Mode clair" : "🌙 Mode sombre"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                            ⚙️ {language === "fr" ? "Paramètres" : "Settings"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* Search bar */}
                  <div className={cn("px-4 py-3 border-b", themeClasses.border, themeClasses.bg)}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
                      <Input
                        placeholder={language === "fr" ? "Rechercher une conversation..." : "Search conversations..."}
                        className={cn(
                          "pl-10 bg-transparent border-orange-200 dark:border-orange-800 focus-visible:ring-orange-500",
                          themeClasses.text
                        )}
                      />
                    </div>
                  </div>
                  
                  {/* Conversation list */}
                  <div className="flex-1 overflow-hidden">
                    {loading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 flex items-center justify-center mb-4">
                          <MessageCircle className="w-8 h-8 text-orange-400" />
                        </div>
                        <p className={cn("text-sm mb-4", themeClasses.textMuted)}>
                          {language === "fr" 
                            ? "Aucune conversation. Commencez en contactant un propriétaire !" 
                            : "No conversations. Start by contacting an owner!"}
                        </p>
                        <Button 
                          onClick={() => setShowNewChat(true)}
                          className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {language === "fr" ? "Nouvelle conversation" : "New conversation"}
                        </Button>
                      </div>
                    ) : (
                      <ConversationList
                        conversations={conversations}
                        activeConversation={activeConversation}
                        onSelect={setActiveConversation}
                        loading={loading}
                      />
                    )}
                  </div>
                </div>

                {/* Message thread area */}
                <div
                  className={cn(
                    "flex-1 flex flex-col",
                    themeClasses.bg,
                    activeConversation ? "flex" : "hidden md:flex"
                  )}
                >
                  {activeConversation ? (
                    <MessageThread
                      conversation={activeConversation}
                      messages={messages}
                      onSendMessage={sendMessage}
                      onBack={() => setActiveConversation(null)}
                      theme={theme}
                    />
                  ) : (
                    <div className={cn(
                      "h-full flex flex-col items-center justify-center text-center p-8",
                      themeClasses.bg
                    )}>
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="w-full max-w-md"
                      >
                        {/* Animated illustration */}
                        <div className="relative w-64 h-64 mx-auto mb-8">
                          <motion.div
                            animate={{ 
                              rotate: [0, 10, -10, 0],
                              y: [0, -10, 0]
                            }}
                            transition={{ 
                              duration: 4,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            className="absolute inset-0"
                          >
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-200/30 to-yellow-200/30 dark:from-orange-900/20 dark:to-yellow-900/20 blur-3xl" />
                          </motion.div>
                          
                          <div className="relative z-10 w-full h-full flex items-center justify-center">
                            <div className="w-48 h-48 rounded-3xl bg-gradient-to-br from-orange-400 via-yellow-400 to-green-400 p-1 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                              <div className={cn("w-full h-full rounded-3xl flex items-center justify-center", themeClasses.sidebar)}>
                                <MessageCircle className="w-24 h-24 text-orange-500" />
                              </div>
                            </div>
                          </div>
                          
                          <motion.div
                            animate={{ y: [0, -20, 0], rotate: [0, 360] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="absolute top-0 right-0 w-12 h-12 rounded-full bg-green-400 shadow-lg flex items-center justify-center"
                          >
                            <Send className="w-6 h-6 text-white" />
                          </motion.div>
                          
                          <motion.div
                            animate={{ y: [0, 15, 0] }}
                            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                            className="absolute bottom-4 left-0 w-10 h-10 rounded-full bg-yellow-400 shadow-lg flex items-center justify-center"
                          >
                            <Users className="w-5 h-5 text-white" />
                          </motion.div>
                        </div>
                        
                        <h2 className={cn("text-3xl font-bold mb-4 bg-gradient-to-r from-orange-500 via-yellow-500 to-green-500 bg-clip-text text-transparent")}>
                          Habynex Messages
                        </h2>
                        
                        <p className={cn("text-lg leading-relaxed max-w-sm mx-auto mb-8", themeClasses.textMuted)}>
                          {language === "fr" 
                            ? "Communiquez directement avec les propriétaires et locataires en temps réel. Sélectionnez une conversation pour démarrer."
                            : "Communicate directly with owners and tenants in real-time. Select a conversation to start."}
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                          <Button 
                            onClick={() => setShowNewChat(true)}
                            className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white shadow-lg hover:shadow-xl transition-all px-8 py-6 text-lg rounded-xl"
                          >
                            <Plus className="w-5 h-5 mr-2" />
                            {language === "fr" ? "Nouvelle conversation" : "New conversation"}
                          </Button>
                          
                          <Button 
                            variant="outline"
                            onClick={() => navigate("/search")}
                            className={cn(
                              "border-2 border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-8 py-6 text-lg rounded-xl",
                              themeClasses.text
                            )}
                          >
                            <Home className="w-5 h-5 mr-2 text-orange-500" />
                            {language === "fr" ? "Explorer les annonces" : "Browse listings"}
                          </Button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Messages;