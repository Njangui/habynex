import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, Loader2, Check, X, Sparkles, Sun, Contrast, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ImageEnhancerProps {
  imageUrl: string;
  onEnhanced: (newUrl: string) => void;
  onCancel: () => void;
}

type EnhancementType = "auto" | "brightness" | "contrast" | "vibrance";

const enhancements: { type: EnhancementType; label: string; icon: React.ElementType; description: string }[] = [
  { type: "auto", label: "Auto", icon: Sparkles, description: "Amélioration automatique IA" },
  { type: "brightness", label: "Luminosité", icon: Sun, description: "Éclaircir les zones sombres" },
  { type: "contrast", label: "Contraste", icon: Contrast, description: "Améliorer les détails" },
  { type: "vibrance", label: "Couleurs", icon: Palette, description: "Couleurs plus vives" },
];

export const ImageEnhancer = ({ imageUrl, onEnhanced, onCancel }: ImageEnhancerProps) => {
  const [enhancing, setEnhancing] = useState(false);
  const [selectedType, setSelectedType] = useState<EnhancementType>("auto");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const enhanceImage = async () => {
    setEnhancing(true);
    
    try {
      // Call the AI enhancement edge function
      const { data, error } = await supabase.functions.invoke("enhance-image", {
        body: { 
          imageUrl, 
          enhancementType: selectedType 
        }
      });

      if (error) throw error;

      if (data?.enhancedUrl) {
        setPreviewUrl(data.enhancedUrl);
        setShowComparison(true);
        toast.success("Image améliorée avec succès !");
      }
    } catch (error) {
      console.error("Enhancement error:", error);
      toast.error("Impossible d'améliorer l'image. Réessayez.");
    } finally {
      setEnhancing(false);
    }
  };

  const confirmEnhancement = () => {
    if (previewUrl) {
      onEnhanced(previewUrl);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Amélioration IA</h3>
              <p className="text-sm text-muted-foreground">
                Améliorez la qualité de votre image
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Image Preview */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
            {showComparison && previewUrl ? (
              <div className="relative w-full h-full">
                {/* Before/After slider */}
                <div className="absolute inset-0 flex">
                  <div className="w-1/2 overflow-hidden border-r-2 border-primary">
                    <img
                      src={imageUrl}
                      alt="Original"
                      className="w-[200%] h-full object-cover"
                    />
                    <span className="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-background/80 text-xs font-medium">
                      Avant
                    </span>
                  </div>
                  <div className="w-1/2 overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="Améliorée"
                      className="w-[200%] h-full object-cover -ml-full"
                    />
                    <span className="absolute bottom-4 right-4 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      Après
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <img
                src={imageUrl}
                alt="À améliorer"
                className="w-full h-full object-cover"
              />
            )}

            {enhancing && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-pulse" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Amélioration en cours...
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Enhancement Options */}
          {!showComparison && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {enhancements.map((enhancement) => {
                const Icon = enhancement.icon;
                const isSelected = selectedType === enhancement.type;
                
                return (
                  <button
                    key={enhancement.type}
                    onClick={() => setSelectedType(enhancement.type)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm text-foreground">
                      {enhancement.label}
                    </span>
                    <span className="text-xs text-muted-foreground text-center">
                      {enhancement.description}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border bg-muted/30">
          {showComparison ? (
            <>
              <Button variant="outline" onClick={() => setShowComparison(false)}>
                Réessayer
              </Button>
              <Button onClick={confirmEnhancement} className="gap-2">
                <Check className="w-4 h-4" />
                Appliquer
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onCancel}>
                Annuler
              </Button>
              <Button onClick={enhanceImage} disabled={enhancing} className="gap-2">
                {enhancing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                Améliorer
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};