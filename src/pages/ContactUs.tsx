import { useState } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Star, Send, Loader2, MessageSquare, Mail, Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ContactUs = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    try {
      // Save as testimonial if rating > 0, otherwise just a contact message
      if (rating > 0) {
        await supabase.from("testimonials").insert({
          user_id: user?.id || "00000000-0000-0000-0000-000000000000",
          content: message,
          rating,
          is_approved: false,
        });
      }
      
      toast.success(
        language === "fr" 
          ? "Merci pour votre message ! Nous vous répondrons bientôt." 
          : "Thanks for your message! We'll get back to you soon."
      );
      setName("");
      setEmail("");
      setMessage("");
      setRating(0);
    } catch (error) {
      toast.error(language === "fr" ? "Erreur lors de l'envoi" : "Error sending message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{language === "fr" ? "Nous contacter" : "Contact Us"} | Habynex</title>
        <meta name="description" content={language === "fr" ? "Contactez l'équipe Habynex et notez notre plateforme." : "Contact the Habynex team and rate our platform."} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-3xl font-bold text-foreground mb-2 text-center">
                {language === "fr" ? "Nous contacter" : "Contact Us"}
              </h1>
              <p className="text-muted-foreground text-center mb-8">
                {language === "fr" 
                  ? "Une question, une suggestion ou un avis ? Écrivez-nous !" 
                  : "A question, suggestion or feedback? Write to us!"}
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <a href="mailto:contact@habynex.com" className="font-medium text-foreground hover:text-primary">
                        contact@habynex.com
                      </a>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{language === "fr" ? "Téléphone" : "Phone"}</p>
                      <a href="tel:+237600000000" className="font-medium text-foreground hover:text-primary">
                        +237 6 00 00 00 00
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    {language === "fr" ? "Envoyez-nous un message" : "Send us a message"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {!user && (
                      <>
                        <Input
                          placeholder={language === "fr" ? "Votre nom" : "Your name"}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                        <Input
                          type="email"
                          placeholder={language === "fr" ? "Votre email" : "Your email"}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </>
                    )}

                    <Textarea
                      placeholder={language === "fr" ? "Votre message..." : "Your message..."}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      required
                    />

                    {/* Rate the platform */}
                    <div>
                      <p className="text-sm font-medium mb-2">
                        {language === "fr" ? "Notez notre plateforme (optionnel)" : "Rate our platform (optional)"}
                      </p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(0)}
                            onClick={() => setRating(star)}
                            className="transition-transform hover:scale-110"
                          >
                            <Star
                              className={`w-7 h-7 transition-colors ${
                                star <= (hoveredRating || rating)
                                  ? "fill-gold text-gold"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </button>
                        ))}
                        {rating > 0 && (
                          <span className="text-sm text-muted-foreground ml-2">{rating}/5</span>
                        )}
                      </div>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full gap-2">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {language === "fr" ? "Envoyer" : "Send"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ContactUs;
