import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Mail, MessageSquare, Smartphone, Moon, Clock, TrendingUp, Heart, Megaphone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export const NotificationPreferencesPanel = () => {
  const { preferences, loading, saving, updatePreferences, togglePreference } = useNotificationPreferences();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!preferences) {
    return null;
  }

  const NotificationRow = ({ 
    icon: Icon, 
    label, 
    prefKey, 
    disabled = false 
  }: { 
    icon: any; 
    label: string; 
    prefKey: keyof typeof preferences;
    disabled?: boolean;
  }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor={prefKey} className={disabled ? "text-muted-foreground" : ""}>
          {label}
        </Label>
      </div>
      <Switch
        id={prefKey}
        checked={preferences[prefKey] as boolean}
        onCheckedChange={() => togglePreference(prefKey)}
        disabled={saving || disabled}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t("notif.email")}
          </CardTitle>
          <CardDescription>{t("notif.emailDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <NotificationRow icon={MessageSquare} label={t("notif.newMessage")} prefKey="email_new_message" />
          <NotificationRow icon={Bell} label={t("notif.newInquiry")} prefKey="email_new_inquiry" />
          <NotificationRow icon={TrendingUp} label={t("notif.propertyViews")} prefKey="email_property_views" />
          <NotificationRow icon={Heart} label={t("notif.recommendations")} prefKey="email_recommendations" />
          <NotificationRow icon={Megaphone} label={t("notif.marketing")} prefKey="email_marketing" />
          
          <div className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label>{t("notif.weeklyDigest")}</Label>
              </div>
              <Select
                value={preferences.digest_frequency}
                onValueChange={(value) => updatePreferences({ digest_frequency: value as any })}
                disabled={saving}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t("notif.daily")}</SelectItem>
                  <SelectItem value="weekly">{t("notif.weekly")}</SelectItem>
                  <SelectItem value="monthly">{t("notif.monthly")}</SelectItem>
                  <SelectItem value="never">{t("notif.never")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Push Notifications - Coming Soon */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("notif.push")}
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">
              {t("notif.comingSoon")}
            </span>
          </CardTitle>
          <CardDescription>{t("notif.pushDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <NotificationRow icon={MessageSquare} label={t("notif.newMessage")} prefKey="push_new_message" disabled />
          <NotificationRow icon={Bell} label={t("notif.newInquiry")} prefKey="push_new_inquiry" disabled />
          <NotificationRow icon={TrendingUp} label={t("notif.propertyViews")} prefKey="push_property_views" disabled />
          <NotificationRow icon={Heart} label={t("notif.recommendations")} prefKey="push_recommendations" disabled />
        </CardContent>
      </Card>

      {/* SMS Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            {t("notif.sms")}
          </CardTitle>
          <CardDescription>{t("notif.smsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <NotificationRow icon={MessageSquare} label={t("notif.newMessage")} prefKey="sms_new_message" />
          <NotificationRow icon={Bell} label={t("notif.newInquiry")} prefKey="sms_new_inquiry" />
          <NotificationRow icon={Bell} label={t("notif.urgentOnly")} prefKey="sms_urgent_only" />
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            {t("notif.quietHours")}
          </CardTitle>
          <CardDescription>{t("notif.quietHoursDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Label htmlFor="quiet_hours_enabled">{t("notif.quietHours")}</Label>
            <Switch
              id="quiet_hours_enabled"
              checked={preferences.quiet_hours_enabled}
              onCheckedChange={() => togglePreference("quiet_hours_enabled")}
              disabled={saving}
            />
          </div>
          
          {preferences.quiet_hours_enabled && (
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="quiet_start" className="text-sm text-muted-foreground">
                  {t("notif.from")}
                </Label>
                <Input
                  id="quiet_start"
                  type="time"
                  value={preferences.quiet_hours_start}
                  onChange={(e) => updatePreferences({ quiet_hours_start: e.target.value })}
                  className="w-28"
                  disabled={saving}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="quiet_end" className="text-sm text-muted-foreground">
                  {t("notif.to")}
                </Label>
                <Input
                  id="quiet_end"
                  type="time"
                  value={preferences.quiet_hours_end}
                  onChange={(e) => updatePreferences({ quiet_hours_end: e.target.value })}
                  className="w-28"
                  disabled={saving}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
