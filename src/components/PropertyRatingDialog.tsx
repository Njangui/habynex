import { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PropertyRatingDialogProps {
  propertyId: string;
  propertyTitle: string;
  children: React.ReactNode;
}

export const PropertyRatingDialog = ({
  propertyId,
  propertyTitle,
  children,
}: PropertyRatingDialogProps) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) return;

    setLoading(true);
    try {
      // Check if user already reviewed
      const { data: existing } = await supabase
        .from("property_reviews")
        .select("id")
        .eq("property_id", propertyId)
        .eq("reviewer_id", user.id)
        .maybeSingle();

      if (existing) {
        // Update existing review
        await supabase
          .from("property_reviews")
          .update({ rating, comment: comment || null })
          .eq("id", existing.id);
        toast.success(language === "fr" ? "Avis mis à jour !" : "Review updated!");
      } else {
        // Create new review
        await supabase.from("property_reviews").insert({
          property_id: propertyId,
          reviewer_id: user.id,
          rating,
          comment: comment || null,
        });
        toast.success(language === "fr" ? "Merci pour votre avis !" : "Thanks for your review!");
      }

      setOpen(false);
      setRating(0);
      setComment("");
    } catch (error: any) {
      toast.error(error.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === "fr" ? "Noter cette annonce" : "Rate this listing"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-1">{propertyTitle}</p>

          {/* Star Rating */}
          <div className="flex items-center justify-center gap-2 py-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="transition-transform hover:scale-110"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? "fill-gold text-gold"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>

          {rating > 0 && (
            <p className="text-center text-sm font-medium">
              {rating}/5 —{" "}
              {rating === 1
                ? "😕"
                : rating === 2
                ? "😐"
                : rating === 3
                ? "🙂"
                : rating === 4
                ? "😊"
                : "🤩"}
            </p>
          )}

          {/* Comment */}
          <Textarea
            placeholder={
              language === "fr"
                ? "Laissez un commentaire (optionnel)"
                : "Leave a comment (optional)"
            }
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {language === "fr" ? "Annuler" : "Cancel"}
          </Button>
          <Button onClick={handleSubmit} disabled={rating === 0 || loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {language === "fr" ? "Envoyer" : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
