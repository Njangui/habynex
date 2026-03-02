import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  property_id: string;
  tenant_id: string;
  owner_id: string;
  last_message_at: string;
  created_at: string;
  property?: {
    title: string;
    images: string[] | null;
  };
  other_user_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  last_message?: Message;
  unread_count?: number;
}

export const useMessages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data: convos, error } = await supabase
        .from("conversations")
        .select(`
          *,
          property:properties(title, images)
        `)
        .or(`tenant_id.eq.${user.id},owner_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      // Fetch other user profiles and last messages
      const enrichedConvos = await Promise.all(
        (convos || []).map(async (convo) => {
          const otherUserId = convo.tenant_id === user.id ? convo.owner_id : convo.tenant_id;
          
          const [profileResult, messageResult, unreadResult] = await Promise.all([
            supabase.from("profiles").select("full_name, avatar_url").eq("user_id", otherUserId).single(),
            supabase.from("messages").select("*").eq("conversation_id", convo.id).order("created_at", { ascending: false }).limit(1),
            supabase.from("messages").select("id", { count: "exact" }).eq("conversation_id", convo.id).eq("is_read", false).neq("sender_id", user.id)
          ]);

          return {
            ...convo,
            other_user_profile: profileResult.data,
            last_message: messageResult.data?.[0],
            unread_count: unreadResult.count || 0
          };
        })
      );

      setConversations(enrichedConvos);
      
      // Calculate total unread
      const totalUnread = enrichedConvos.reduce((acc, c) => acc + (c.unread_count || 0), 0);
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      if (user) {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("conversation_id", conversationId)
          .neq("sender_id", user.id);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  }, [user]);

  // Send a message
  const sendMessage = async (content: string) => {
    if (!user || !activeConversation) return;

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: activeConversation.id,
        sender_id: user.id,
        content
      });

      if (error) throw error;

      // Send email notification to the recipient
      const recipientId = activeConversation.tenant_id === user.id 
        ? activeConversation.owner_id 
        : activeConversation.tenant_id;

      // Get sender profile
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      // Trigger email notification via edge function
      try {
        await supabase.functions.invoke("send-notification-email", {
          body: {
            type: "new_message",
            recipientId,
            senderName: senderProfile?.full_name || "Un utilisateur",
            propertyTitle: activeConversation.property?.title || "Propriété",
            messagePreview: content
          }
        });
      } catch (emailError) {
        console.log("Email notification skipped:", emailError);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive"
      });
    }
  };

  // Start or get conversation
  const startConversation = async (propertyId: string, ownerId: string) => {
    if (!user) return null;

    try {
      // Check if conversation exists
      const { data: existing } = await supabase
        .from("conversations")
        .select("*")
        .eq("property_id", propertyId)
        .eq("tenant_id", user.id)
        .eq("owner_id", ownerId)
        .single();

      if (existing) return existing;

      // Create new conversation
      const { data: newConvo, error } = await supabase
        .from("conversations")
        .insert({
          property_id: propertyId,
          tenant_id: user.id,
          owner_id: ownerId
        })
        .select()
        .single();

      if (error) throw error;
      return newConvo;
    } catch (error) {
      console.error("Error starting conversation:", error);
      return null;
    }
  };

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchConversations();

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages"
        },
        (payload) => {
          const newMessage = payload.new as Message;
          
          // Update messages if viewing this conversation
          if (activeConversation?.id === newMessage.conversation_id) {
            setMessages(prev => [...prev, newMessage]);
            
            // Mark as read if not sender
            if (newMessage.sender_id !== user.id) {
              supabase
                .from("messages")
                .update({ is_read: true })
                .eq("id", newMessage.id);
            }
          } else if (newMessage.sender_id !== user.id) {
            // Show notification for other conversations
            toast({
              title: "Nouveau message",
              description: "Vous avez reçu un nouveau message"
            });
          }

          // Refresh conversations list
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeConversation, fetchConversations, toast]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
    }
  }, [activeConversation, fetchMessages]);

  return {
    conversations,
    messages,
    activeConversation,
    setActiveConversation,
    sendMessage,
    startConversation,
    loading,
    unreadCount,
    refreshConversations: fetchConversations
  };
};
