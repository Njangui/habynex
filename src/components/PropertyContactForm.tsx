import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Send, User, Mail, Phone, Calendar, Loader2, MessageCircle } from "lucide-react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";

interface PropertyContactFormProps {
  propertyId: string;
  ownerId?: string;
  ownerName?: string;
}

const contactSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  message: z.string().min(10, "Le message doit contenir au moins 10 caractères"),
});

const PropertyContactForm = ({ propertyId, ownerId, ownerName }: PropertyContactFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [sent, setSent] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [moveInDate, setMoveInDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    try {
      contactSchema.parse({ name, email, phone, message });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Erreur de validation",
          description: error.errors[0].message,
        });
        return;
      }
    }

    if (!user) {
      toast({
        variant: "destructive",
        title: "Connexion requise",
        description: "Veuillez vous connecter pour contacter le propriétaire.",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("property_inquiries").insert({
        property_id: propertyId,
        sender_id: user.id,
        sender_name: name,
        sender_email: email,
        sender_phone: phone || null,
        message,
        move_in_date: moveInDate || null,
      });

      if (error) throw error;

      setSent(true);
      toast({
        title: "Message envoyé !",
        description: "Le propriétaire recevra votre demande et vous répondra bientôt.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le message.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!user || !ownerId) return;

    setStartingChat(true);
    try {
      // Check if conversation exists
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("property_id", propertyId)
        .eq("tenant_id", user.id)
        .eq("owner_id", ownerId)
        .single();

      if (existing) {
        navigate(`/messages?conversation=${existing.id}`);
        return;
      }

      // Create new conversation
      const { data: newConvo, error } = await supabase
        .from("conversations")
        .insert({
          property_id: propertyId,
          tenant_id: user.id,
          owner_id: ownerId
        })
        .select("id")
        .single();

      if (error) throw error;
      navigate(`/messages?conversation=${newConvo.id}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de démarrer la conversation."
      });
    } finally {
      setStartingChat(false);
    }
  };

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-border bg-card p-6 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="w-8 h-8 text-success" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Message envoyé !</h3>
        <p className="text-muted-foreground mb-4">
          Votre demande a été transmise au propriétaire. 
          Vous recevrez une réponse par email.
        </p>
        <Button variant="outline" onClick={() => setSent(false)}>
          Envoyer un autre message
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Contacter le propriétaire</h3>
            {ownerName && (
              <p className="text-primary-foreground/80 text-sm">
                Envoyez un message à {ownerName}
              </p>
            )}
          </div>
          {user && ownerId && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleStartChat}
              disabled={startingChat}
              className="gap-1"
            >
              <MessageCircle className="w-4 h-4" />
              Chat
            </Button>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 bg-card space-y-4">
        {!user && (
          <div className="p-3 rounded-lg bg-secondary text-sm text-muted-foreground">
            <a href="/auth" className="text-primary font-medium hover:underline">
              Connectez-vous
            </a>{" "}
            pour contacter le propriétaire
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact-name">Nom complet *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="contact-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
                className="pl-10"
                required
                disabled={!user}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="pl-10"
                required
                disabled={!user}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact-phone">Téléphone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="contact-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+237 6 00 00 00 00"
                className="pl-10"
                disabled={!user}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-date">Date d'emménagement souhaitée</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="contact-date"
                type="date"
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
                className="pl-10"
                disabled={!user}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-message">Message *</Label>
          <Textarea
            id="contact-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Bonjour, je suis intéressé(e) par ce logement. J'aimerais avoir plus d'informations sur..."
            rows={4}
            required
            disabled={!user}
          />
        </div>

        <Button 
          type="submit" 
          variant="hero" 
          className="w-full gap-2" 
          disabled={loading || !user}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Envoyer ma demande
        </Button>
      </form>
    </div>
  );
};

export default PropertyContactForm;
