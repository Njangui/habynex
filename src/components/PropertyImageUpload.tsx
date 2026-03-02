import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Image as ImageIcon, Loader2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageEnhancer } from "./ImageEnhancer";

interface PropertyImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  userId: string;
  maxImages?: number;
}

const PropertyImageUpload = ({
  images,
  onChange,
  userId,
  maxImages = 10,
}: PropertyImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [enhancingIndex, setEnhancingIndex] = useState<number | null>(null);

  const handleEnhanced = (index: number, newUrl: string) => {
    const newImages = [...images];
    newImages[index] = newUrl;
    onChange(newImages);
    setEnhancingIndex(null);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error } = await supabase.storage
      .from("property-images")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data } = supabase.storage
      .from("property-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remainingSlots = maxImages - images.length;

      if (fileArray.length > remainingSlots) {
        toast.error(`Vous ne pouvez ajouter que ${remainingSlots} image(s) supplémentaire(s).`);
        return;
      }

      const validFiles = fileArray.filter((file) => {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} n'est pas une image valide.`);
          return false;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} dépasse la taille maximale de 5MB.`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      setUploading(true);
      const uploadPromises = validFiles.map(uploadImage);
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((url): url is string => url !== null);

      if (successfulUploads.length > 0) {
        onChange([...images, ...successfulUploads]);
        toast.success(`${successfulUploads.length} image(s) téléchargée(s) avec succès.`);
      }

      if (successfulUploads.length < validFiles.length) {
        toast.error("Certaines images n'ont pas pu être téléchargées.");
      }

      setUploading(false);
    },
    [images, maxImages, onChange, userId]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const newImages = [...images];
    const [moved] = newImages.splice(from, 1);
    newImages.splice(to, 0, moved);
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading || images.length >= maxImages}
        />
        <div className="flex flex-col items-center gap-3">
          {uploading ? (
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          ) : (
            <Upload className="w-10 h-10 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium text-foreground">
              {uploading ? "Téléchargement en cours..." : "Glissez vos photos ici"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              ou cliquez pour sélectionner (max {maxImages} photos, 5MB chacune)
            </p>
          </div>
        </div>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {images.map((url, index) => (
              <motion.div
                key={url}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative aspect-square rounded-xl overflow-hidden group"
              >
                <img
                  src={url}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {index === 0 && (
                  <span className="absolute top-2 left-2 px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium">
                    Photo principale
                  </span>
                )}
                <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {/* AI Enhancement button */}
                  <button
                    type="button"
                    onClick={() => setEnhancingIndex(index)}
                    className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
                    title="Améliorer avec l'IA"
                  >
                    <Wand2 className="w-4 h-4" />
                  </button>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => moveImage(index, 0)}
                      className="p-2 rounded-lg bg-card text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                      title="Définir comme photo principale"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="p-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-colors"
                    title="Supprimer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {images.length} / {maxImages} photos
      </p>

      {/* AI Enhancement Modal */}
      <AnimatePresence>
        {enhancingIndex !== null && images[enhancingIndex] && (
          <ImageEnhancer
            imageUrl={images[enhancingIndex]}
            onEnhanced={(newUrl) => handleEnhanced(enhancingIndex, newUrl)}
            onCancel={() => setEnhancingIndex(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PropertyImageUpload;
