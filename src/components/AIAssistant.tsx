import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, MessageCircle, Lightbulb, MapPin, Loader2, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { usePropertyAI } from "@/hooks/usePropertyAI";

const suggestions = [
  "Studio meublé à Yaoundé moins de 100 000 FCFA",
  "Appartement 3 chambres à Douala avec parking",
  "Colocation proche université de Ngoa-Ekelle",
  "Maison à vendre à Bonapriso avec jardin",
];

const AIAssistant = () => {
  const [message, setMessage] = useState("");
  const { messages, isLoading, sendMessage, clearMessages } = usePropertyAI();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      sendMessage(message);
      setMessage("");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-4">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Assistant Intelligent</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Décrivez votre logement idéal
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Notre IA comprend vos besoins et vous propose les meilleures options 
              adaptées à votre budget et vos critères.
            </p>
          </motion.div>

          {/* Chat Interface */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl shadow-elegant border border-border overflow-hidden"
          >
            {/* Chat Messages Area */}
            <div className="p-6 min-h-[300px] max-h-[400px] overflow-y-auto bg-gradient-to-b from-secondary/20 to-transparent">
              {/* Welcome message */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="bg-card rounded-2xl rounded-tl-sm p-4 shadow-sm border border-border max-w-[85%]">
                  <p className="text-foreground">
                    Bonjour ! 👋 Je suis votre assistant immobilier. Décrivez-moi le logement 
                    que vous recherchez et je trouverai les meilleures options pour vous.
                  </p>
                </div>
              </div>

              {/* Messages */}
              <AnimatePresence mode="popLayout">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex items-start gap-3 mb-4 ${
                      msg.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl p-4 max-w-[85%] ${
                        msg.role === "user"
                          ? "gradient-primary text-primary-foreground rounded-tr-sm"
                          : "bg-card shadow-sm border border-border rounded-tl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Loading indicator */}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-start gap-3 mb-4"
                >
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                    <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
                  </div>
                  <div className="bg-card rounded-2xl rounded-tl-sm p-4 shadow-sm border border-border">
                    <p className="text-muted-foreground">Recherche en cours...</p>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {messages.length === 0 && (
              <div className="px-6 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-gold" />
                  <span className="text-sm text-muted-foreground">Suggestions populaires</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-4 py-2 rounded-full bg-secondary text-sm text-secondary-foreground hover:bg-secondary/80 transition-colors text-left"
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear chat button */}
            {messages.length > 0 && (
              <div className="px-6 pb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearMessages}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Nouvelle conversation
                </Button>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-card">
              <div className="flex gap-3">
                <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary">
                  <MessageCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Décrivez le logement de vos rêves..."
                    className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  variant="hero" 
                  size="lg" 
                  className="gap-2 shrink-0"
                  onClick={handleSend}
                  disabled={isLoading || !message.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  <span className="hidden sm:inline">Envoyer</span>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8"
          >
            {[
              {
                icon: MessageCircle,
                title: "Recherche naturelle",
                description: "Décrivez simplement ce que vous cherchez",
              },
              {
                icon: Sparkles,
                title: "Suggestions IA",
                description: "Recommandations personnalisées",
              },
              {
                icon: MapPin,
                title: "Analyse locale",
                description: "Connaissance des quartiers et prix",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AIAssistant;
