import { useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Sparkles, 
  Send, 
  Loader2, 
  Plus,
  Copy,
  Check,
  RotateCcw,
  User,
  Bot,
  Home,
  MessageSquare,
  Trash2,
  Menu,
  X,
  Building
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePropertyAI } from "@/hooks/usePropertyAI";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import logo from "@/assets/habinex-logo.jpeg";
import ChatPropertyCard from "@/components/ChatPropertyCard";

const Assistant = () => {
  const [message, setMessage] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t, language } = useLanguage();
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    conversations,
    currentConversationId,
    loadConversation,
    deleteConversation,
    startNewConversation,
    loadingConversations
  } = usePropertyAI();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = [
    {
      title: t("assistant.suggestion1Title"),
      prompt: t("assistant.suggestion1Prompt"),
    },
    {
      title: t("assistant.suggestion2Title"),
      prompt: t("assistant.suggestion2Prompt"),
    },
    {
      title: t("assistant.suggestion3Title"),
      prompt: t("assistant.suggestion3Prompt"),
    },
    {
      title: t("assistant.suggestion4Title"),
      prompt: t("assistant.suggestion4Prompt"),
    },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      sendMessage(message);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleSuggestionClick = (prompt: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    sendMessage(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success(t("assistant.copied"));
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const hasMessages = messages.length > 0;

  return (
    <>
      <Helmet>
        <title>{t("assistant.title")}</title>
        <meta 
          name="description" 
          content={t("assistant.metaDesc")} 
        />
      </Helmet>

      <div className="min-h-screen bg-background flex">
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transform transition-transform duration-300 lg:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}>
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={logo} alt="Habinex" className="w-8 h-8 rounded-lg object-contain" />
                  <span className="font-semibold text-foreground">Habinex</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <Button
                variant="outline"
                className="w-full mt-4 gap-2 justify-start"
                onClick={() => {
                  startNewConversation();
                  setSidebarOpen(false);
                }}
              >
                <Plus className="w-4 h-4" />
                {t("assistant.newConversation")}
              </Button>
            </div>

            {/* Conversations List */}
            <ScrollArea className="flex-1 p-2">
              {loadingConversations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {t("assistant.noConversations")}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                        currentConversationId === conv.id 
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-secondary text-foreground"
                      }`}
                      onClick={() => {
                        loadConversation(conv.id);
                        setSidebarOpen(false);
                      }}
                    >
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-sm truncate">{conv.title}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-border">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => navigate("/")}
              >
                <Home className="w-4 h-4" />
                {t("assistant.backHome")}
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Header */}
          <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
            <div className="flex items-center justify-between h-14 px-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
                
                <span className="font-medium text-foreground">{t("assistant.realEstateAssistant")}</span>
              </div>

              <div className="flex items-center gap-2">
                {!authLoading && !user ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/auth")}
                  >
                    {t("assistant.login")}
                    Connexion
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full w-8 h-8"
                    onClick={() => navigate("/profile")}
                  >
                    <User className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 flex flex-col">
            {!hasMessages ? (
              /* Welcome Screen */
              <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center max-w-2xl mx-auto"
                >
                  <img src={logo} alt="Habinex" className="w-20 h-20 mx-auto mb-6 rounded-2xl shadow-lg" />
                  
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                    {t("assistant.howCanIHelp")}
                  </h1>
                  
                  <p className="text-lg text-muted-foreground mb-10">
                    {t("assistant.describeHome")}
                  </p>

                  {/* Suggestions Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                    {suggestions.map((suggestion, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSuggestionClick(suggestion.prompt)}
                        className="group p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all text-left"
                      >
                        <p className="font-medium text-foreground mb-1 group-hover:text-primary transition-colors">
                          {suggestion.title}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {suggestion.prompt}
                        </p>
                      </motion.button>
                    ))}
                  </div>

                  {!user && !authLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="mt-8 p-4 rounded-xl bg-secondary/50 border border-border"
                    >
                      <p className="text-sm text-muted-foreground">
                        <Button
                          variant="link"
                          className="p-0 h-auto text-primary"
                          onClick={() => navigate("/auth")}
                        >
                          {t("assistant.login")}
                        </Button>
                        {" "}{t("assistant.loginPrompt")}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            ) : (
              /* Chat Messages */
              <ScrollArea className="flex-1">
                <div className="max-w-3xl mx-auto px-4 py-6">
                  <AnimatePresence mode="popLayout">
                    {messages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mb-6"
                      >
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden ${
                            msg.role === "user" 
                              ? "bg-primary/10" 
                              : ""
                          }`}>
                            {msg.role === "user" ? (
                              <User className="w-4 h-4 text-primary" />
                            ) : (
                              <img src={logo} alt="Habinex" className="w-full h-full object-contain" />
                            )}
                          </div>

                          {/* Message Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-foreground text-sm">
                                {msg.role === "user" ? t("assistant.you") : t("assistant.assistantName")}
                              </span>
                            </div>
                            
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                                {msg.content}
                              </p>
                            </div>

                            {/* Property Cards */}
                            {msg.properties && msg.properties.length > 0 && (
                              <div className="mt-4 space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                  <Building className="w-4 h-4" />
                                  <span>{msg.properties.length} propriété{msg.properties.length > 1 ? "s" : ""} trouvée{msg.properties.length > 1 ? "s" : ""}</span>
                                </div>
                                <div className="grid gap-2">
                                  {msg.properties.map((property) => (
                                    <ChatPropertyCard
                                      key={property.id}
                                      id={property.id}
                                      title={property.title}
                                      city={property.city}
                                      neighborhood={property.neighborhood}
                                      price={property.price}
                                      priceUnit={property.price_unit}
                                      image={property.images?.[0]}
                                      bedrooms={property.bedrooms}
                                      bathrooms={property.bathrooms}
                                      area={property.area}
                                      isVerified={property.is_verified}
                                      propertyType={property.property_type}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            {msg.role === "assistant" && (
                              <div className="flex items-center gap-1 mt-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                                  onClick={() => copyToClipboard(msg.content, i)}
                                >
                                  {copiedIndex === i ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                                  onClick={() => {
                                    const userMsg = messages[i - 1];
                                    if (userMsg?.role === "user") {
                                      startNewConversation();
                                      sendMessage(userMsg.content);
                                    }
                                  }}
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Loading indicator */}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6"
                    >
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
                          <img src={logo} alt="Habinex" className="w-full h-full object-contain animate-pulse" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground text-sm">{t("assistant.assistantName")}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            )}

            {/* Input Area */}
            <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pt-6 pb-4 px-4">
              <div className="max-w-3xl mx-auto">
                <div className="relative flex items-end gap-2 p-2 rounded-2xl bg-card border border-border shadow-elegant">
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={user ? t("assistant.inputPlaceholder") : t("assistant.inputPlaceholderDisabled")}
                    className="flex-1 min-h-[44px] max-h-[200px] px-3 py-3 bg-transparent outline-none text-foreground placeholder:text-muted-foreground resize-none"
                    disabled={isLoading || !user}
                    rows={1}
                  />
                  
                  <Button
                    size="icon"
                    variant={message.trim() && user ? "default" : "ghost"}
                    className={`shrink-0 rounded-xl h-10 w-10 transition-all ${
                      message.trim() && user 
                        ? "gradient-primary text-primary-foreground shadow-md" 
                        : "text-muted-foreground"
                    }`}
                    onClick={handleSend}
                    disabled={isLoading || !message.trim() || !user}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
                
                <p className="text-center text-xs text-muted-foreground mt-3">
                  {t("assistant.disclaimer")}
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default Assistant;
