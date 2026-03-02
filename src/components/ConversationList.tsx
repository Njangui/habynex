import { motion } from "framer-motion";
import { MessageCircle, User, Check, CheckCheck, Search } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Conversation } from "@/hooks/useMessages";
import { useState } from "react";

interface ConversationListProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  onSelect: (conversation: Conversation) => void;
  loading: boolean;
}

const formatConversationDate = (date: Date) => {
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Hier";
  return format(date, "dd/MM/yyyy");
};

export const ConversationList = ({
  conversations,
  activeConversation,
  onSelect,
  loading
}: ConversationListProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter(convo => 
    convo.other_user_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    convo.property?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#111b21]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00a884]" />
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col h-full"
      style={{
        backgroundColor: "#111b21",
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23182229' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}
    >
      {/* Search bar - WhatsApp style */}
      <div className="p-2" style={{ backgroundColor: "#111b21" }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8696a0]" />
          <Input
            type="text"
            placeholder="Rechercher ou démarrer une discussion"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#202c33] border-0 text-[#e9edef] placeholder-[#8696a0] rounded-lg focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {/* Conversations */}
      {filteredConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <div className="w-20 h-20 rounded-full bg-[#00a884]/20 flex items-center justify-center mb-4">
            <MessageCircle className="h-10 w-10 text-[#00a884]" />
          </div>
          <h3 className="font-medium text-[#e9edef]">
            {searchQuery ? "Aucun résultat" : "Aucune conversation"}
          </h3>
          <p className="text-sm text-[#8696a0] mt-2">
            {searchQuery 
              ? "Essayez avec d'autres termes" 
              : "Contactez un propriétaire pour démarrer une conversation"
            }
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="divide-y divide-[#2a3942]">
            {filteredConversations.map((conversation, index) => {
              const isActive = activeConversation?.id === conversation.id;
              const hasUnread = conversation.unread_count && conversation.unread_count > 0;
              
              return (
                <motion.button
                  key={conversation.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => onSelect(conversation)}
                  className={`w-full flex items-start gap-3 px-3 py-3 text-left transition-colors ${
                    isActive
                      ? "bg-[#2a3942]"
                      : "hover:bg-[#202c33]"
                  }`}
                >
                  {/* Avatar */}
                  <Avatar className="h-12 w-12 flex-shrink-0 ring-0">
                    <AvatarImage src={conversation.other_user_profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-[#6b7c85] text-white text-lg">
                      {conversation.other_user_profile?.full_name?.charAt(0)?.toUpperCase() || (
                        <User className="h-6 w-6" />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-medium truncate ${
                        hasUnread ? "text-[#e9edef]" : "text-[#e9edef]"
                      }`}>
                        {conversation.other_user_profile?.full_name || "Utilisateur"}
                      </span>
                      <span className={`text-xs flex-shrink-0 ${
                        hasUnread ? "text-[#00a884]" : "text-[#8696a0]"
                      }`}>
                        {formatConversationDate(new Date(conversation.last_message_at))}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        {/* Read status for own messages */}
                        {conversation.last_message && (
                          <span className="flex-shrink-0">
                            {conversation.last_message.is_read ? (
                              <CheckCheck className="w-4 h-4 text-[#53bdeb]" />
                            ) : (
                              <Check className="w-4 h-4 text-[#8696a0]" />
                            )}
                          </span>
                        )}
                        
                        <p className={`text-sm truncate ${
                          hasUnread ? "text-[#e9edef]" : "text-[#8696a0]"
                        }`}>
                          {conversation.last_message?.content || conversation.property?.title || "Nouvelle conversation"}
                        </p>
                      </div>

                      {hasUnread && (
                        <Badge className="bg-[#00a884] text-white text-xs px-1.5 py-0.5 min-w-[20px] flex items-center justify-center rounded-full">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};