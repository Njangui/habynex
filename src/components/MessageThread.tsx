import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, User, Home, Phone, Video, MoreVertical, Check, CheckCheck, Smile, Paperclip, Mic } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Conversation, Message } from "@/hooks/useMessages";

interface MessageThreadProps {
  conversation: Conversation;
  messages: Message[];
  onSendMessage: (content: string) => void;
  onBack: () => void;
}

const formatMessageDate = (date: Date) => {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return "Hier";
  return format(date, "EEEE d MMMM", { locale: fr });
};

export const MessageThread = ({
  conversation,
  messages,
  onSendMessage,
  onBack
}: MessageThreadProps) => {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [newMessage]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage.trim());
    setNewMessage("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach((message) => {
    const dateKey = format(new Date(message.created_at), "yyyy-MM-dd");
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    
    if (lastGroup && lastGroup.date === dateKey) {
      lastGroup.messages.push(message);
    } else {
      groupedMessages.push({ date: dateKey, messages: [message] });
    }
  });

  return (
    <div className="flex flex-col h-full bg-[#0b141a]">
      {/* Header - WhatsApp style */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#202c33] border-b border-[#2a3942]">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden text-[#aebac1] hover:bg-[#2a3942]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <Avatar className="h-10 w-10 ring-0">
          <AvatarImage src={conversation.other_user_profile?.avatar_url || undefined} />
          <AvatarFallback className="bg-[#6b7c85] text-white">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-[#e9edef] truncate">
            {conversation.other_user_profile?.full_name || "Utilisateur"}
          </h3>
          <Link
            to={`/property/${conversation.property_id}`}
            className="flex items-center gap-1 text-xs text-[#8696a0] hover:text-[#00a884]"
          >
            <Home className="h-3 w-3" />
            {conversation.property?.title || "Voir la propriété"}
          </Link>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-[#aebac1] hover:bg-[#2a3942]">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-[#aebac1] hover:bg-[#2a3942]">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-[#aebac1] hover:bg-[#2a3942]">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages area with WhatsApp wallpaper */}
      <ScrollArea 
        className="flex-1 px-4 py-2"
        ref={scrollRef}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23182229' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: "#0b141a"
        }}
      >
        <div className="space-y-2 max-w-3xl mx-auto">
          <AnimatePresence initial={false}>
            {groupedMessages.map((group) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="flex justify-center my-3">
                  <span className="text-xs text-[#8696a0] bg-[#182229] px-3 py-1.5 rounded-lg shadow-sm">
                    {formatMessageDate(new Date(group.date))}
                  </span>
                </div>

                {/* Messages */}
                {group.messages.map((message, index) => {
                  const isOwn = message.sender_id === user?.id;
                  const showTail = index === 0 || 
                    group.messages[index - 1]?.sender_id !== message.sender_id;

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-0.5`}
                    >
                      <div
                        className={`relative max-w-[85%] sm:max-w-[65%] px-3 py-1.5 shadow-sm ${
                          isOwn
                            ? "bg-[#005c4b] rounded-lg" + (showTail ? " rounded-tr-none" : "")
                            : "bg-[#202c33] rounded-lg" + (showTail ? " rounded-tl-none" : "")
                        }`}
                      >
                        {/* Tail */}
                        {showTail && (
                          <div 
                            className={`absolute top-0 w-3 h-3 ${
                              isOwn 
                                ? "-right-2 bg-[#005c4b]" 
                                : "-left-2 bg-[#202c33]"
                            }`}
                            style={{
                              clipPath: isOwn 
                                ? "polygon(0 0, 100% 0, 0 100%)"
                                : "polygon(0 0, 100% 0, 100% 100%)"
                            }}
                          />
                        )}

                        <p className="text-sm text-[#e9edef] whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        
                        <div className="flex items-center justify-end gap-1 -mb-0.5 mt-0.5">
                          <span className="text-[10px] text-[#8696a0]">
                            {format(new Date(message.created_at), "HH:mm")}
                          </span>
                          {isOwn && (
                            message.is_read ? (
                              <CheckCheck className="w-4 h-4 text-[#53bdeb]" />
                            ) : (
                              <Check className="w-4 h-4 text-[#8696a0]" />
                            )
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </AnimatePresence>

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-20 h-20 rounded-full bg-[#00a884]/20 flex items-center justify-center mb-4">
                <Send className="w-8 h-8 text-[#00a884]" />
              </div>
              <p className="text-[#8696a0]">
                Démarrez la conversation en envoyant un message
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area - WhatsApp style */}
      <div className="px-4 py-3 bg-[#202c33] border-t border-[#2a3942]">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-[#8696a0] hover:bg-[#2a3942] flex-shrink-0"
          >
            <Smile className="h-6 w-6" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-[#8696a0] hover:bg-[#2a3942] flex-shrink-0"
          >
            <Paperclip className="h-6 w-6" />
          </Button>

          <div className="flex-1 bg-[#2a3942] rounded-xl px-4 py-2">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Tapez un message"
              rows={1}
              className="w-full bg-transparent text-[#e9edef] placeholder-[#8696a0] resize-none focus:outline-none text-sm"
              style={{ maxHeight: "120px" }}
            />
          </div>

          {newMessage.trim() ? (
            <Button
              onClick={handleSend}
              size="icon"
              className="bg-[#00a884] hover:bg-[#00a884]/90 text-white rounded-full flex-shrink-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-[#8696a0] hover:bg-[#2a3942] flex-shrink-0"
            >
              <Mic className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};