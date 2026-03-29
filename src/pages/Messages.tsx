import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, 
  Plus, 
  Users, 
  Building2, 
  Sun, 
  Moon, 
  Globe,
  X,
  Send,
  ArrowLeft,
  Search,
  User,
  Clock,
  CheckCheck,
  Check,
  Image as ImageIcon,
  Smile,
  Paperclip,
  MoreVertical
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { ConversationList } from "@/components/ConversationList";
import { MessageThread } from "@/components/MessageThread";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface PropertyWithOwner {
  id: string;
  title: string;
  owner_id: string;
  images: string[] | null;
  owner_profile?: {
    full_name: string | null;
  };
}

const Messages = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
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
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // Fetch available properties to start a conversation
  const fetchProperties = async () => {
    if (!user) return;
    setLoadingProperties(true);
    
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, owner_id, images")
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

  // Filter properties based on search query
  const filteredProperties = properties.filter(property => 
    property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (property.owner_profile?.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/messages");
    }
  }, [user, authLoading, navigate]);

  // Handle property/conversation from URL params
  useEffect(() => {
    const conversationId = searchParams.get("conversation");
    const inquiryPropertyId = searchParams.get("property");
    const inquirySenderEmail = searchParams.get("email");
    
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

  // Theme-based styles
  const isDark = theme === 'dark';
  const bgGradient = isDark 
    ? "bg-gradient-to-br from-gray-900 via-orange-950/20 to-green-950/20"
    : "bg-gradient-to-br from-orange-50 via-white to-green-50";
  const sidebarBg = isDark ? "bg-gray-900/95" : "bg-white/95";
  const chatBg = isDark ? "bg-gray-800/50" : "bg-orange-50/30";
  const borderColor = isDark ? "border-gray-700" : "border-orange-200";
  const textColor = isDark ? "text-gray-100" : "text-gray-800";
  const textMuted = isDark ? "text-gray-400" : "text-gray-500";
  const headerBg = isDark ? "bg-gray-900/80" : "bg-white/80";
  const inputBg = isDark ? "bg-gray-800" : "bg-white";
  const buttonPrimary = "bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white shadow-lg";
  const buttonSecondary = isDark ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-orange-50 border border-orange-200";
  
  if (authLoading) {
    return (
      <div className={`min-h-screen ${bgGradient} flex items-center justify-center`}>
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-3 bg-yellow-500 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t("messages.title")} | Habynex</title>
        <meta name="description" content={language === "fr" 
          ? "Consultez vos conversations avec les propriétaires et locataires" 
          : "View your conversations with owners and tenants"
        } />
      </Helmet>

      <div className={`min-h-screen ${bgGradient} transition-colors duration-300`}>
        <Navbar />

        <main className="pt-16">
          <div className="h-[calc(100dvh-4rem)]">
            <div className="mx-auto h-full max-w-7xl px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full flex flex-col md:flex-row overflow-hidden rounded-2xl shadow-2xl backdrop-blur-sm"
                style={{
                  background: isDark ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                {/* Conversations sidebar */}
                <div
                  className={`w-full md:w-[380px] border-r ${borderColor} flex-shrink-0 ${
                    activeConversation ? "hidden md:flex md:flex-col" : "flex flex-col"
                  }`}
                >
                  {/* Header with actions */}
                  <div className={`px-4 py-4 ${headerBg} backdrop-blur-sm border-b ${borderColor}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shadow-lg">
                          <MessageCircle className="h-5 w-5 text-white" />
                        </div>
                        <h1 className={`text-xl font-bold ${textColor}`}>
                          {language === "fr" ? "Messages" : "Messages"}
                        </h1>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Theme toggle button */}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={toggleTheme}
                          className={`w-10 h-10 rounded-xl ${buttonSecondary} flex items-center justify-center transition-all duration-300`}
                        >
                          {isDark ? (
                            <Sun className="h-5 w-5 text-yellow-500" />
                          ) : (
                            <Moon className="h-5 w-5 text-orange-500" />
                          )}
                        </motion.button>
                        
                        {/* Language toggle button */}
                        <div className="relative">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                            className={`w-10 h-10 rounded-xl ${buttonSecondary} flex items-center justify-center transition-all duration-300`}
                          >
                            <Globe className="h-5 w-5 text-green-500" />
                          </motion.button>
                          
                          <AnimatePresence>
                            {showLanguageMenu && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className={`absolute right-0 mt-2 w-32 rounded-xl shadow-xl ${sidebarBg} border ${borderColor} overflow-hidden z-50`}
                              >
                                <button
                                  onClick={() => {
                                    setLanguage('fr');
                                    setShowLanguageMenu(false);
                                  }}
                                  className={`w-full px-4 py-2 text-left ${textColor} hover:bg-orange-500/10 transition-colors ${language === 'fr' ? 'bg-orange-500/20 text-orange-500' : ''}`}
                                >
                                  🇫🇷 Français
                                </button>
                                <button
                                  onClick={() => {
                                    setLanguage('en');
                                    setShowLanguageMenu(false);
                                  }}
                                  className={`w-full px-4 py-2 text-left ${textColor} hover:bg-orange-500/10 transition-colors ${language === 'en' ? 'bg-orange-500/20 text-orange-500' : ''}`}
                                >
                                  🇬🇧 English
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        
                        {/* New conversation button */}
                        <Dialog open={showNewChat} onOpenChange={(open) => {
                          setShowNewChat(open);
                          if (open) fetchProperties();
                        }}>
                          <DialogTrigger asChild>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-yellow-500 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                              <Plus className="h-5 w-5 text-white" />
                            </motion.button>
                          </DialogTrigger>
                          <DialogContent className="rounded-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2 text-xl">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 flex items-center justify-center">
                                  <Users className="w-4 h-4 text-white" />
                                </div>
                                {t("messages.startConversation")}
                              </DialogTitle>
                            </DialogHeader>
                            
                            <div className="py-4">
                              <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder={language === "fr" ? "Rechercher une annonce..." : "Search listings..."}
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-orange-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                                />
                              </div>
                              
                              {loadingProperties ? (
                                <div className="flex items-center justify-center py-8">
                                  <div className="relative">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
                                    </div>
                                  </div>
                                </div>
                              ) : filteredProperties.length === 0 ? (
                                <div className="text-center py-8">
                                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-orange-500/10 to-yellow-500/10 flex items-center justify-center mx-auto mb-3">
                                    <Building2 className="w-8 h-8 text-orange-500" />
                                  </div>
                                  <p className="text-gray-500 mb-4">
                                    {language === "fr" ? "Aucune annonce disponible" : "No listings available"}
                                  </p>
                                  <Button 
                                    onClick={() => {
                                      setShowNewChat(false);
                                      navigate("/search");
                                    }}
                                    className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white shadow-lg"
                                  >
                                    {language === "fr" ? "Parcourir les annonces" : "Browse listings"}
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                  {filteredProperties.map((property, index) => (
                                    <motion.button
                                      key={property.id}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.05 }}
                                      onClick={() => handleStartConversation(property)}
                                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-yellow-500/10 transition-all duration-300 text-left group"
                                    >
                                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-r from-orange-500/20 to-yellow-500/20 flex-shrink-0">
                                        {property.images?.[0] ? (
                                          <img 
                                            src={property.images[0]} 
                                            alt={property.title}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center">
                                            <Building2 className="w-6 h-6 text-orange-500" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                                          {property.title}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                                          <User className="w-3 h-3" />
                                          {property.owner_profile?.full_name || (language === "fr" ? "Propriétaire" : "Owner")}
                                        </p>
                                      </div>
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                        <MessageCircle className="w-4 h-4 text-white" />
                                      </div>
                                    </motion.button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    
                    {/* Search bar for conversations */}
                    <div className="relative">
                      <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${textMuted}`} />
                      <input
                        type="text"
                        placeholder={language === "fr" ? "Rechercher une conversation..." : "Search conversations..."}
                        className={`w-full pl-10 pr-4 py-2 rounded-xl ${inputBg} ${borderColor} border focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all ${textColor}`}
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                    <ConversationList
                      conversations={conversations}
                      activeConversation={activeConversation}
                      onSelect={setActiveConversation}
                      loading={loading}
                    />
                  </div>
                </div>

                {/* Message thread */}
                <div
                  className={`flex-1 ${
                    activeConversation ? "flex flex-col" : "hidden md:flex"
                  }`}
                >
                  {activeConversation ? (
                    <MessageThread
                      conversation={activeConversation}
                      messages={messages}
                      onSendMessage={sendMessage}
                      onBack={() => setActiveConversation(null)}
                    />
                  ) : (
                    <div className={`h-full flex flex-col items-center justify-center text-center p-6 ${chatBg}`}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md"
                      >
                        <div className="relative mb-8">
                          <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-r from-orange-500/10 to-yellow-500/10 flex items-center justify-center">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 flex items-center justify-center shadow-2xl">
                              <MessageCircle className="w-12 h-12 text-white" />
                            </div>
                          </div>
                          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </div>
                        
                        <h2 className={`text-3xl font-bold ${textColor} mb-3 bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent`}>
                          Habynex Messages
                        </h2>
                        <p className={`${textMuted} text-sm leading-relaxed max-w-sm mx-auto`}>
                          {language === "fr" 
                            ? "Envoyez et recevez des messages en temps réel. Sélectionnez une conversation pour commencer à discuter."
                            : "Send and receive messages in real time. Select a conversation to start chatting."
                          }
                        </p>
                        
                        <div className="flex gap-2 justify-center mt-8">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10">
                            <Clock className="w-3 h-3 text-orange-500" />
                            <span className="text-xs text-orange-500">Réponse rapide</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10">
                            <CheckCheck className="w-3 h-3 text-green-500" />
                            <span className="text-xs text-green-500">Messages sécurisés</span>
                          </div>
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