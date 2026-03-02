import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface WhatsAppButtonProps {
  phoneNumber: string | null;
  propertyTitle: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export const WhatsAppButton = ({ 
  phoneNumber, 
  propertyTitle, 
  className = "",
  variant = "default",
  size = "default"
}: WhatsAppButtonProps) => {
  const { t, language } = useLanguage();

  if (!phoneNumber) return null;

  // Clean phone number (remove spaces, dashes, etc.)
  const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, "");
  
  // Ensure it starts with country code
  const formattedNumber = cleanNumber.startsWith("+") 
    ? cleanNumber.substring(1) 
    : cleanNumber.startsWith("237") 
      ? cleanNumber 
      : `237${cleanNumber}`;

  // Get translated message and replace placeholder
  const messageTemplate = t("whatsapp.message");
  const message = encodeURIComponent(
    messageTemplate.replace("{title}", propertyTitle)
  );

  const whatsappUrl = `https://wa.me/${formattedNumber}?text=${message}`;

  return (
    <Button
      variant={variant}
      size={size}
      className={`gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white ${className}`}
      onClick={() => window.open(whatsappUrl, "_blank")}
    >
      <MessageCircle className="w-5 h-5" />
      {t("whatsapp.contact")}
    </Button>
  );
};

export default WhatsAppButton;
