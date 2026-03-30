import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, 
  ArrowLeft, 
  User, 
  Home, 
  Phone, 
  Video, 
  MoreVertical, 
  Check, 
  CheckCheck, 
  Smile, 
  Paperclip, 
  Mic,
  Info,
  Star
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read?: boolean;
}

interface Conversation {
  id: string;
  property_id: string;
  other_user_profile?: {
    full_name?: string | null;
    avatar_url?: string | null;
    is_verified?: boolean;
  } | null;
  property?: {
    title?: string;
    images?: string[] | null;
  } | null;
  last_message_at?: string;
}

interface MessageThreadProps {
  conversation: Conversation;
  messages: Message[];
  onSendMessage: (content: string) => void;
  onBack: () => void;
  theme?: string;
}

export const MessageThread = ({
  conversation,
  messages,
  onSendMessage,
  onBack,
  theme = "light"
}: MessageThreadProps) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isDark = theme === "dark";
  const locale = language === "fr" ? fr : enUS;

  const themeClasses = {
    bg: isDark ? "bg-slate-950" : "bg-slate-50",
    header: isDark ? "bg-slate-900/95 backdrop-blur-md" : "bg-white/95 backdrop-blur-md",
    border: isDark ? "border-slate-700" : "border-slate-200",
    text: isDark ? "text-slate-100" : "text-slate-900",
    textMuted: isDark ? "text-slate-400" : "text-slate-500",
    inputBg: isDark ? "bg-slate-800" : "bg-slate-100",
    messageOwn: isDark 
      ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white" 
      : "bg-gradient-to-br from-orange-400 to-orange-500 text-white",
    messageOther: isDark 
      ? "bg-slate-800 text-slate-100" 
      : "bg-white text-slate-900 shadow-sm",
    dateBadge: isDark 
      ? "bg-slate-800/80 text-slate-400" 
      : "bg-white/80 text-slate-500",
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

  const formatMessageDate = (date: Date) => {
    if (isToday(date)) return language === "fr" ? "Aujourd'hui" : "Today";
    if (isYesterday(date)) return language === "fr" ? "Hier" : "Yesterday";
    return format(date, "EEEE d MMMM", { locale });
  };

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

  // Vérification de sécurité
  if (!conversation) {
    return (
      <div className={cn("h-full flex items-center justify-center", themeClasses.bg)}>
        <p className={themeClasses.textMuted}>Conversation non disponible</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full overflow-hidden", themeClasses.bg)}>
      {/* Header */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 border-b flex-shrink-0 sticky top-0 z-20",
        themeClasses.header,
        themeClasses.border
      )}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className={cn(
            "md:hidden rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/20",
            isDark ? "text-slate-300" : "text-slate-600"
          )}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="relative">
          <Avatar className="h-12 w-12 ring-2 ring-orange-200 dark:ring-orange-800 ring-offset-2 ring-offset-transparent">
            <AvatarImage src={conversation.other_user_profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-yellow-400 text-white font-semibold">
              {conversation.other_user_profile?.full_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn("font-semibold truncate text-base", themeClasses.text)}>
              {conversation.other_user_profile?.full_name || (language === "fr" ? "Utilisateur" : "User")}
            </h3>
            {conversation.other_user_profile?.is_verified && (
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          
          <Link
            to={`/property/${conversation.property_id}`}
            className="flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-600 transition-colors group"
          >
            <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
              <Home className="h-3 w-3" />
              <span className="truncate max-w-[150px]">
                {conversation.property?.title || (language === "fr" ? "Voir la propriété" : "View property")}
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/20",
              isDark ? "text-slate-400" : "text-slate-600"
            )}
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/20",
              isDark ? "text-slate-400" : "text-slate-600"
            )}
          >
            <Video className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/20",
                  isDark ? "text-slate-400" : "text-slate-600"
                )}
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={cn("w-48", themeClasses.header, themeClasses.border)}>
              <DropdownMenuItem className="cursor-pointer">
                <Info className="w-4 h-4 mr-2" />
                {language === "fr" ? "Infos de contact" : "Contact info"}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Star className="w-4 h-4 mr-2" />
                {language === "fr" ? "Ajouter aux favoris" : "Add to favorites"}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-red-500">
                {language === "fr" ? "Bloquer" : "Block"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages area */}
      <div 
        className={cn(
          "flex-1 overflow-y-auto px-4 py-4 min-h-0 relative",
          themeClasses.bg
        )}
        ref={scrollRef}
      >
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${isDark ? '#f97316' : '#ea580c'} 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        />

        <div className="space-y-4 max-w-3xl mx-auto relative z-10">
          <AnimatePresence initial={false}>
            {groupedMessages.map((group, groupIndex) => (
              <div key={group.date}>
                <div className="flex justify-center my-4">
                  <motion.span 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "text-xs font-medium px-4 py-1.5 rounded-full shadow-sm backdrop-blur-sm",
                      themeClasses.dateBadge
                    )}
                  >
                    {formatMessageDate(new Date(group.date))}
                  </motion.span>
                </div>

                {group.messages.map((message, index) => {
                  const isOwn = message.sender_id === user?.id;
                  const showAvatar = index === 0 || 
                    group.messages[index - 1]?.sender_id !== message.sender_id;
                  const isLastInGroup = index === group.messages.length - 1 || 
                    group.messages[index + 1]?.sender_id !== message.sender_id;

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className={cn(
                        "flex gap-2 mb-1",
                        isOwn ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      {!isOwn && showAvatar ? (
                        <Avatar className="w-8 h-8 mt-auto flex-shrink-0">
                          <AvatarImage src={conversation.other_user_profile?.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-green-400 to-green-600 text-white text-xs">
                            {conversation.other_user_profile?.full_name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                      ) : !isOwn ? (
                        <div className="w-8 flex-shrink-0" />
                      ) : null}

                      <div
                        className={cn(
                          "relative max-w-[85%] sm:max-w-[70%] px-4 py-2.5 shadow-md",
                          "rounded-2xl transition-all duration-200",
                          isOwn
                            ? cn(themeClasses.messageOwn, "rounded-br-sm")
                            : cn(themeClasses.messageOther, "rounded-bl-sm"),
                          !isLastInGroup && (isOwn ? "rounded-br-2xl" : "rounded-bl-2xl")
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {message.content}
                        </p>
                        
                        <div className={cn(
                          "flex items-center justify-end gap-1 mt-1",
                          isOwn ? "text-white/80" : "text-slate-400"
                        )}>
                          <span className="text-[10px] font-medium">
                            {format(new Date(message.created_at), "HH:mm")}
                          </span>
                          {isOwn && (
                            message.is_read ? (
                              <CheckCheck className="w-4 h-4 text-blue-400" />
                            ) : (
                              <Check className="w-4 h-4 opacity-60" />
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

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 ml-10"
            >
              <div className="bg-slate-200 dark:bg-slate-700 rounded-full px-4 py-2 flex items-center gap-1">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  className="w-2 h-2 bg-slate-400 rounded-full"
                />
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                  className="w-2 h-2 bg-slate-400 rounded-full"
                />
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                  className="w-2 h-2 bg-slate-400 rounded-full"
                />
              </div>
            </motion.div>
          )}

          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full text-center py-16"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 flex items-center justify-center mb-6 shadow-inner">
                <Send className="w-10 h-10 text-orange-500" />
              </div>
              <h4 className={cn("text-lg font-semibold mb-2", themeClasses.text)}>
                {language === "fr" ? "Démarrez la conversation" : "Start the conversation"}
              </h4>
              <p className={cn("text-sm max-w-xs", themeClasses.textMuted)}>
                {language === "fr" 
                  ? "Écrivez votre premier message pour entrer en contact" 
                  : "Write your first message to get in touch"}
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className={cn(
        "px-4 py-3 border-t flex-shrink-0",
        themeClasses.header,
        themeClasses.border
      )}>
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "rounded-full h-10 w-10 hover:bg-orange-100 dark:hover:bg-orange-900/20",
                isDark ? "text-slate-400" : "text-slate-600"
              )}
            >
              <Smile className="h-5 w-5" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "rounded-full h-10 w-10 hover:bg-orange-100 dark:hover:bg-orange-900/20",
                isDark ? "text-slate-400" : "text-slate-600"
              )}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </div>

          <div className={cn(
            "flex-1 rounded-2xl px-4 py-2.5 border-2 transition-all duration-200",
            "focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-400/20",
            themeClasses.inputBg,
            isDark ? "border-slate-700" : "border-slate-200"
          )}>
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={language === "fr" ? "Écrivez un message..." : "Type a message..."}
              rows={1}
              className={cn(
                "w-full bg-transparent resize-none focus:outline-none text-sm",
                "placeholder:text-slate-400",
                themeClasses.text
              )}
              style={{ maxHeight: "120px", minHeight: "24px" }}
            />
          </div>

          <AnimatePresence mode="wait">
            {newMessage.trim() ? (
              <motion.div
                key="send"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  onClick={handleSend}
                  size="icon"
                  className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white rounded-full h-12 w-12 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  <Send className="h-5 w-5 ml-0.5" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="mic"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "rounded-full h-12 w-12 hover:bg-orange-100 dark:hover:bg-orange-900/20",
                    isDark ? "text-slate-400" : "text-slate-600"
                  )}
                >
                  <Mic className="h-6 w-6" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="text-center mt-2">
          <p className="text-[10px] text-slate-400">
            {language === "fr" 
              ? "Appuyez sur Entrée pour envoyer, Maj+Entrée pour un saut de ligne"
              : "Press Enter to send, Shift+Enter for new line"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MessageThread;