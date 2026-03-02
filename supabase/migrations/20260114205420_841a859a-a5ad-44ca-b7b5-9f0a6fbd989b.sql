-- Table pour les préférences de notifications des utilisateurs
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  
  -- Email notifications
  email_new_message BOOLEAN DEFAULT true,
  email_new_inquiry BOOLEAN DEFAULT true,
  email_property_views BOOLEAN DEFAULT true,
  email_recommendations BOOLEAN DEFAULT true,
  email_marketing BOOLEAN DEFAULT false,
  email_weekly_digest BOOLEAN DEFAULT true,
  
  -- Push notifications (for future)
  push_new_message BOOLEAN DEFAULT true,
  push_new_inquiry BOOLEAN DEFAULT true,
  push_property_views BOOLEAN DEFAULT true,
  push_recommendations BOOLEAN DEFAULT true,
  push_marketing BOOLEAN DEFAULT false,
  
  -- SMS notifications
  sms_new_message BOOLEAN DEFAULT false,
  sms_new_inquiry BOOLEAN DEFAULT true,
  sms_urgent_only BOOLEAN DEFAULT true,
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  
  -- Frequency settings
  digest_frequency TEXT DEFAULT 'weekly' CHECK (digest_frequency IN ('daily', 'weekly', 'monthly', 'never')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notification preferences"
ON public.notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
ON public.notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create notification preferences for new users
CREATE OR REPLACE FUNCTION public.init_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create preferences on user signup
CREATE TRIGGER create_notification_preferences_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.init_notification_preferences();

-- Table pour stocker l'historique des notifications envoyées
CREATE TABLE public.notification_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'push', 'sms', 'in_app')),
  title TEXT NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notification history"
ON public.notification_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (mark as read)"
ON public.notification_history FOR UPDATE
USING (auth.uid() = user_id);

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications"
ON public.notification_history FOR INSERT
WITH CHECK (true);

-- Index for faster queries
CREATE INDEX idx_notification_history_user_id ON public.notification_history(user_id);
CREATE INDEX idx_notification_history_sent_at ON public.notification_history(sent_at DESC);
CREATE INDEX idx_notification_history_is_read ON public.notification_history(user_id, is_read) WHERE NOT is_read;