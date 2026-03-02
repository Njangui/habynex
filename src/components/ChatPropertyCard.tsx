import { motion } from "framer-motion";
import { MapPin, Bed, Bath, Square, Check, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface ChatPropertyCardProps {
  id: string;
  title: string;
  city: string;
  neighborhood?: string | null;
  price: number;
  priceUnit: string;
  image?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area?: number | null;
  isVerified?: boolean;
  propertyType: string;
}

const ChatPropertyCard = ({
  id,
  title,
  city,
  neighborhood,
  price,
  priceUnit,
  image,
  bedrooms,
  bathrooms,
  area,
  isVerified = false,
  propertyType,
}: ChatPropertyCardProps) => {
  const location = neighborhood ? `${neighborhood}, ${city}` : city;
  const displayImage = image || "/placeholder.svg";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="block"
    >
      <Link 
        to={`/property/${id}?source=ai-assistant`}
        className="flex gap-3 p-3 rounded-xl bg-secondary/50 border border-border hover:border-primary/50 hover:bg-secondary transition-all group"
      >
        {/* Image */}
        <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-muted">
          <img
            src={displayImage}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">
              {title}
            </h4>
            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          
          <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </div>

          {/* Features */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
            {bedrooms && (
              <div className="flex items-center gap-1">
                <Bed className="w-3 h-3" />
                <span>{bedrooms}</span>
              </div>
            )}
            {bathrooms && (
              <div className="flex items-center gap-1">
                <Bath className="w-3 h-3" />
                <span>{bathrooms}</span>
              </div>
            )}
            {area && (
              <div className="flex items-center gap-1">
                <Square className="w-3 h-3" />
                <span>{area}m²</span>
              </div>
            )}
            {isVerified && (
              <div className="flex items-center gap-1 text-accent-foreground">
                <Check className="w-3 h-3" />
                <span>Vérifié</span>
              </div>
            )}
          </div>

          {/* Price & Type */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {propertyType}
            </span>
            <span className="font-semibold text-sm text-foreground">
              {price.toLocaleString('fr-FR')} <span className="text-xs font-normal text-muted-foreground">FCFA/{priceUnit}</span>
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ChatPropertyCard;
