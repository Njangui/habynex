import { useState } from "react";
import { format, addDays } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { CalendarIcon, Clock, MessageSquare, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BookingDialogProps {
  propertyId: string;
  propertyTitle: string;
  ownerId: string;
  ownerName?: string;
  children: React.ReactNode;
}

const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "14:00", "15:00", "16:00", "17:00", "18:00"
];

export const BookingDialog = ({ 
  propertyId, 
  propertyTitle, 
  ownerId,
  ownerName,
  children 
}: BookingDialogProps) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: t("toast.loginRequired"),
        description: t("booking.loginMessage"),
      });
      navigate(`/auth?redirect=/property/${propertyId}`);
      return;
    }

    if (!date || !time) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("booking.selectDateTime"),
      });
      return;
    }

    setLoading(true);
    
    try {
      // Create or find conversation
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("property_id", propertyId)
        .eq("tenant_id", user.id)
        .eq("owner_id", ownerId)
        .maybeSingle();

      let conversationId = existingConv?.id;

      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            property_id: propertyId,
            tenant_id: user.id,
            owner_id: ownerId,
          })
          .select("id")
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // Create booking message
      const bookingDate = format(date, "EEEE d MMMM yyyy", { locale: language === "fr" ? fr : enUS });
      const bookingMessage = `${t("booking.requestTitle")}\n\n📅 ${t("booking.date")}: ${bookingDate}\n⏰ ${t("booking.time")}: ${time}\n👤 ${t("contact.name")}: ${name || user.email}\n📱 ${t("contact.phone")}: ${phone || t("common.optional")}\n\n${message || t("booking.defaultMessage")}`;

      const { error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: bookingMessage,
        });

      if (msgError) throw msgError;

      // Update last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      toast({
        title: t("booking.success"),
        description: t("booking.successMessage"),
      });

      setOpen(false);
      
      // Redirect to messages
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error) {
      console.error("Booking error:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("booking.errorMessage"),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            {t("booking.title")}
          </DialogTitle>
          <DialogDescription>
            {t("booking.subtitle")} {ownerName && `(${ownerName})`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Property Info */}
          <div className="p-3 rounded-lg bg-secondary">
            <p className="text-sm font-medium text-foreground line-clamp-1">
              {propertyTitle}
            </p>
          </div>

          {/* Date Picker */}
          <div className="grid gap-2">
            <Label>{t("booking.selectDate")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: language === "fr" ? fr : enUS }) : t("booking.pickDate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Slot */}
          <div className="grid gap-2">
            <Label>{t("booking.selectTime")}</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger>
                <Clock className="mr-2 h-4 w-4" />
                <SelectValue placeholder={t("booking.pickTime")} />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contact Info */}
          <div className="grid gap-2">
            <Label>{t("contact.name")}</Label>
            <Input
              placeholder={t("contact.name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>{t("contact.phone")} ({t("common.optional")})</Label>
            <Input
              placeholder="+237..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* Message */}
          <div className="grid gap-2">
            <Label>{t("contact.message")} ({t("common.optional")})</Label>
            <Textarea
              placeholder={t("booking.messagePlaceholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-1 gap-2">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageSquare className="w-4 h-4" />
            )}
            {t("booking.confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDialog;
