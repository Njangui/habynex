import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Property = {
  id: string;
  title: string;
  city: string;
  neighborhood?: string | null;
  price: number;
  price_unit: string;
  images?: string[] | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area?: number | null;
  is_verified?: boolean;
  property_type: string;
};

type Message = { 
  role: "user" | "assistant"; 
  content: string;
  properties?: Property[];
};

type AIConversation = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export const usePropertyAI = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setLoadingConversations(true);
    try {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setConversations((data as AIConversation[]) || []);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Load a specific conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const loadedMessages: Message[] = (data || []).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      setMessages(loadedMessages);
      setCurrentConversationId(conversationId);
    } catch (error) {
      console.error("Error loading conversation:", error);
      toast.error("Erreur lors du chargement de la conversation.");
    }
  }, []);

  // Create a new conversation
  const createConversation = useCallback(async (firstMessage: string): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    try {
      const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
      
      const { data, error } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: session.user.id,
          title,
        })
        .select()
        .single();

      if (error) throw error;
      
      const newConversation = data as AIConversation;
      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversationId(newConversation.id);
      
      return newConversation.id;
    } catch (error) {
      console.error("Error creating conversation:", error);
      return null;
    }
  }, []);

  // Save a message to the database
  const saveMessage = useCallback(async (conversationId: string, role: "user" | "assistant", content: string) => {
    try {
      const { error } = await supabase
        .from("ai_messages")
        .insert({
          conversation_id: conversationId,
          role,
          content,
        });

      if (error) throw error;
    } catch (error) {
      console.error("Error saving message:", error);
    }
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from("ai_conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (currentConversationId === conversationId) {
        setMessages([]);
        setCurrentConversationId(null);
      }

      toast.success("Conversation supprimée");
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Erreur lors de la suppression.");
    }
  }, [currentConversationId]);

  const sendMessage = useCallback(async (input: string) => {
    if (!input.trim()) return;

    // Refresh session to ensure token is valid
    const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !session) {
      // Try to get existing session
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (!existingSession) {
        toast.error("Veuillez vous connecter pour utiliser l'assistant IA.");
        return;
      }
    }
    
    // Get fresh session after potential refresh
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) {
      toast.error("Session expirée. Veuillez vous reconnecter.");
      return;
    }

    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Create conversation if needed
    let convId = currentConversationId;
    if (!convId) {
      convId = await createConversation(input);
      if (!convId) {
        setIsLoading(false);
        toast.error("Erreur lors de la création de la conversation.");
        return;
      }
    }

    // Save user message
    await saveMessage(convId, "user", input);

    let assistantSoFar = "";
    
    const updateAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/property-ai-search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentSession.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ messages: [...messages, userMsg] }),
        }
      );

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        if (resp.status === 401) {
          toast.error("Session expirée. Veuillez vous reconnecter.");
        } else if (resp.status === 429) {
          toast.error("Trop de requêtes. Veuillez patienter un moment.");
        } else if (resp.status === 402) {
          toast.error("Service temporairement indisponible.");
        } else {
          toast.error(errorData.error || "Erreur lors de la communication avec l'assistant.");
        }
        setIsLoading(false);
        return;
      }

      if (!resp.body) {
        throw new Error("No response body");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) updateAssistant(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Flush remaining buffer
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) updateAssistant(content);
          } catch {
            /* ignore */
          }
        }
      }

      // Parse properties from the response
      const propertyIdsMatch = assistantSoFar.match(/```properties\s*\n?([\s\S]*?)\n?```/);
      let messageProperties: Property[] = [];
      let cleanContent = assistantSoFar;

      if (propertyIdsMatch) {
        try {
          const propertyIds = JSON.parse(propertyIdsMatch[1]) as { id: string }[];
          if (propertyIds.length > 0) {
            const ids = propertyIds.map(p => p.id);
            const { data: props } = await supabase
              .from("properties")
              .select("id, title, city, neighborhood, price, price_unit, images, bedrooms, bathrooms, area, is_verified, property_type")
              .in("id", ids);
            
            if (props) {
              messageProperties = props as Property[];
            }
          }
          // Remove the properties block from the displayed content
          cleanContent = assistantSoFar.replace(/```properties\s*\n?[\s\S]*?\n?```/g, "").trim();
        } catch (e) {
          console.error("Error parsing properties:", e);
        }
      }

      // Update the final message with properties
      if (messageProperties.length > 0) {
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIdx = newMessages.length - 1;
          if (newMessages[lastIdx]?.role === "assistant") {
            newMessages[lastIdx] = { 
              ...newMessages[lastIdx], 
              content: cleanContent,
              properties: messageProperties 
            };
          }
          return newMessages;
        });
      }

      // Save assistant message after streaming is complete
      if (assistantSoFar && convId) {
        await saveMessage(convId, "assistant", assistantSoFar);
      }
    } catch (error) {
      console.error("AI error:", error);
      toast.error("Erreur de connexion avec l'assistant.");
    } finally {
      setIsLoading(false);
    }
  }, [messages, currentConversationId, createConversation, saveMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
  }, []);

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
  }, []);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return { 
    messages, 
    isLoading, 
    sendMessage, 
    clearMessages,
    conversations,
    currentConversationId,
    loadConversation,
    deleteConversation,
    startNewConversation,
    loadingConversations,
    loadConversations,
  };
};
