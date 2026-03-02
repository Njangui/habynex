import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Bell, Check, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  notification_type: string;
  channel: string;
  title: string;
  content: string | null;
  is_read: boolean;
  sent_at: string;
  metadata: any;
}

const NotificationHistory = () => {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const dateLocale = language === "fr" ? fr : enUS;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?redirect=/notifications");
  }, [user, authLoading]);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("notification_history")
      .select("*")
      .eq("user_id", user.id)
      .gte("sent_at", thirtyDaysAgo)
      .order("sent_at", { ascending: false })
      .limit(100);
    setNotifications(data || []);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notification_history").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notification_history").update({ is_read: true, read_at: new Date().toISOString() }).eq("user_id", user.id).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      new_message: "💬",
      new_contact: "📩",
      new_review: "⭐",
      identity_approved: "✅",
      identity_rejected: "❌",
      new_matching_property: "🏠",
      visit_accepted: "📅",
      visit_reminder: "⏰",
    };
    return icons[type] || "🔔";
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{language === "fr" ? "Notifications" : "Notifications"} | Habynex</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Bell className="w-6 h-6" />
                  {language === "fr" ? "Notifications" : "Notifications"}
                  {unreadCount > 0 && (
                    <Badge variant="destructive">{unreadCount}</Badge>
                  )}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {language === "fr" ? "30 derniers jours" : "Last 30 days"}
                </p>
              </div>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2">
                  <Check className="w-4 h-4" />
                  {language === "fr" ? "Tout marquer lu" : "Mark all read"}
                </Button>
              )}
            </motion.div>

            {notifications.length === 0 ? (
              <Card className="p-12 text-center">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {language === "fr" ? "Aucune notification" : "No notifications"}
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {notifications.map((notif, i) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <Card 
                      className={`cursor-pointer transition-colors ${!notif.is_read ? "border-primary/40 bg-primary/5" : ""}`}
                      onClick={() => !notif.is_read && markAsRead(notif.id)}
                    >
                      <CardContent className="p-4 flex items-start gap-3">
                        <span className="text-xl mt-0.5">{getTypeIcon(notif.notification_type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`font-medium text-sm ${!notif.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                              {notif.title}
                            </p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(notif.sent_at), "d MMM, HH:mm", { locale: dateLocale })}
                            </span>
                          </div>
                          {notif.content && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{notif.content}</p>
                          )}
                        </div>
                        {!notif.is_read && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default NotificationHistory;
