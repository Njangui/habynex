import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle, Plus, Users, Building2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { ConversationList } from "@/components/ConversationList";
import { MessageThread } from "@/components/MessageThread";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
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
      // Find and select the conversation
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
      // Handle reply from inquiry - find existing conversation or check if we need to create one
      // First, look for a conversation for this property with sender matching email
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t("messages.title")} | Habinex</title>
        <meta name="description" content={language === "fr" 
          ? "Consultez vos conversations avec les propriétaires et locataires" 
          : "View your conversations with owners and tenants"
        } />
      </Helmet>

      <div className="min-h-screen bg-[#111b21]">
        <Navbar />

        <main className="pt-16">
          <div className="h-[calc(100vh-4rem)]">
            <div className="container mx-auto h-full max-w-6xl px-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full flex flex-col md:flex-row overflow-hidden shadow-2xl"
              >
                {/* Conversations sidebar */}
                <div
                  className={`w-full md:w-[420px] border-r border-[#2a3942] flex-shrink-0 ${
                    activeConversation ? "hidden md:flex md:flex-col" : "flex flex-col"
                  }`}
                >
                  {/* Header */}
                  <div className="px-4 py-3 bg-[#202c33] flex items-center justify-between">
                    <h1 className="text-xl font-medium text-[#e9edef]">
                      {language === "fr" ? "Discussions" : "Chats"}
                    </h1>
                    <div className="flex items-center gap-2">
                      {/* New conversation button */}
                      <Dialog open={showNewChat} onOpenChange={(open) => {
                        setShowNewChat(open);
                        if (open) fetchProperties();
                      }}>
                        <DialogTrigger asChild>
                          <button 
                            className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center hover:bg-[#00a884]/30 transition-colors"
                            title={t("messages.startConversation")}
                          >
                            <Plus className="h-5 w-5 text-[#00a884]" />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#111b21] border-[#2a3942] text-[#e9edef] max-w-md">
                          <DialogHeader>
                            <DialogTitle className="text-[#e9edef] flex items-center gap-2">
                              <Users className="w-5 h-5 text-[#00a884]" />
                              {t("messages.startConversation")}
                            </DialogTitle>
                          </DialogHeader>
                          
                          <div className="py-4">
                            <p className="text-[#8696a0] text-sm mb-4">
                              {language === "fr" 
                                ? "Sélectionnez une annonce pour contacter le propriétaire :"
                                : "Select a listing to contact the owner:"
                              }
                            </p>
                            
                            {loadingProperties ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00a884]" />
                              </div>
                            ) : properties.length === 0 ? (
                              <div className="text-center py-8">
                                <Building2 className="w-12 h-12 text-[#8696a0] mx-auto mb-3" />
                                <p className="text-[#8696a0]">
                                  {language === "fr" ? "Aucune annonce disponible" : "No listings available"}
                                </p>
                                <Button 
                                  onClick={() => {
                                    setShowNewChat(false);
                                    navigate("/search");
                                  }}
                                  className="mt-4 bg-[#00a884] hover:bg-[#00a884]/80"
                                >
                                  {language === "fr" ? "Parcourir les annonces" : "Browse listings"}
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {properties.map((property) => (
                                  <button
                                    key={property.id}
                                    onClick={() => handleStartConversation(property)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#202c33] hover:bg-[#2a3942] transition-colors text-left"
                                  >
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#2a3942] flex-shrink-0">
                                      {property.images?.[0] ? (
                                        <img 
                                          src={property.images[0]} 
                                          alt={property.title}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <Building2 className="w-6 h-6 text-[#8696a0]" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-[#e9edef] truncate">
                                        {property.title}
                                      </p>
                                      <p className="text-sm text-[#8696a0] truncate">
                                        {property.owner_profile?.full_name || (language === "fr" ? "Propriétaire" : "Owner")}
                                      </p>
                                    </div>
                                    <MessageCircle className="w-5 h-5 text-[#00a884] flex-shrink-0" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center">
                        <MessageCircle className="h-5 w-5 text-[#00a884]" />
                      </div>
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
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-[#222e35]">
                      <div 
                        className="w-full max-w-md text-center"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='200' height='200' fill='%23222e35'/%3E%3C/svg%3E")`
                        }}
                      >
                        <div className="w-80 h-80 mx-auto mb-8 opacity-30">
                          <svg viewBox="0 0 303 172" className="w-full h-full">
                            <path fill="#364147" d="M229.565 160.229c-5.547 7.308-18.418 9.937-18.418 9.937s-12.926-9.937-7.379-17.245c5.547-7.308 13.893-4.679 18.418-2.05 4.525 2.628 12.926 2.05 7.379 9.358z"/>
                            <path fill="#364147" d="M79.436 160.229c5.547 7.308 18.417 9.937 18.417 9.937s12.927-9.937 7.38-17.245c-5.548-7.308-13.894-4.679-18.418-2.05-4.525 2.628-12.926 2.05-7.38 9.358z"/>
                            <path fill="#364147" d="M254.781 9.163c5.547 7.308 18.418 9.937 18.418 9.937s12.926-9.937 7.379-17.245c-5.547-7.308-13.893-4.679-18.418-2.05-4.525 2.628-12.926 2.05-7.379 9.358z"/>
                            <path fill="#3B4A54" d="M223.941 56.315h-47.263c-3.867 0-7.003 3.136-7.003 7.003v41.869c0 3.867 3.136 7.003 7.003 7.003h47.263c3.867 0 7.003-3.136 7.003-7.003V63.318c0-3.867-3.136-7.003-7.003-7.003z"/>
                            <path fill="#3B4A54" d="M112.322 112.19H65.059c-3.867 0-7.003-3.136-7.003-7.003V63.318c0-3.867 3.136-7.003 7.003-7.003h47.263c3.867 0 7.003 3.136 7.003 7.003v41.869c0 3.867-3.136 7.003-7.003 7.003z"/>
                            <path fill="#3B4A54" d="M168.132 56.315h-47.264c-3.866 0-7.003 3.136-7.003 7.003v64.96c0 3.867 3.137 7.003 7.003 7.003h47.264c3.866 0 7.003-3.136 7.003-7.003v-64.96c0-3.867-3.137-7.003-7.003-7.003z"/>
                          </svg>
                        </div>
                        
                        <h2 className="text-3xl font-light text-[#e9edef] mb-3">
                          Habinex {language === "fr" ? "pour Desktop" : "for Desktop"}
                        </h2>
                        <p className="text-[#8696a0] text-sm leading-relaxed">
                          {language === "fr" 
                            ? "Envoyez et recevez des messages en temps réel. Sélectionnez une conversation pour commencer."
                            : "Send and receive messages in real time. Select a conversation to start."
                          }
                        </p>
                      </div>
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
