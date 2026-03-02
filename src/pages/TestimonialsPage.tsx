import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Star, Heart, Quote, Send, MessageSquare } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Testimonial {
  id: string;
  content: string;
  rating: number;
  likes_count: number;
  user_id: string;
  created_at: string;
  is_approved: boolean;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    city: string | null;
  };
  has_liked?: boolean;
}

const TestimonialsPage = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());

  // Fetch testimonials
  useEffect(() => {
    fetchTestimonials();
  }, [user]);

  const fetchTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from("testimonials")
        .select(`
          id,
          content,
          rating,
          likes_count,
          user_id,
          created_at,
          is_approved
        `)
        .order("likes_count", { ascending: false });

      if (error) throw error;

      if (data) {
        // Get profiles
        const userIds = [...new Set(data.map(t => t.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, city")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        // Get user's likes
        if (user) {
          const { data: likes } = await supabase
            .from("testimonial_likes")
            .select("testimonial_id")
            .eq("user_id", user.id);

          setUserLikes(new Set(likes?.map(l => l.testimonial_id) || []));
        }

        const formatted = data.map(t => ({
          ...t,
          profile: profileMap.get(t.user_id),
        }));

        setTestimonials(formatted);
      }
    } catch (error) {
      console.error("Error fetching testimonials:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error(t("testimonialsPage.loginRequired"));
      return;
    }

    if (!newContent.trim()) {
      toast.error(t("testimonialsPage.writeTestimonial"));
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("testimonials").insert({
        user_id: user.id,
        content: newContent.trim(),
        rating: newRating,
      });

      if (error) throw error;

      // Get user profile for the notification
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      // Notify admins about the new testimonial
      try {
        const { data: adminUsers } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        if (adminUsers && adminUsers.length > 0) {
          // Send notification to each admin
          for (const admin of adminUsers) {
            await supabase.functions.invoke("send-notification", {
              body: {
                type: "new_testimonial",
                recipientId: admin.user_id,
                language: language,
                data: {
                  authorName: profile?.full_name || (language === "fr" ? "Utilisateur" : "User"),
                  rating: newRating,
                  content: newContent.trim(),
                },
              },
            });
          }
        }
      } catch (notifyError) {
        console.error("Error notifying admins:", notifyError);
        // Don't fail the submission if notification fails
      }

      toast.success(t("testimonialsPage.success"));
      setNewContent("");
      setNewRating(5);
      fetchTestimonials();
    } catch (error) {
      console.error("Error submitting testimonial:", error);
      toast.error(t("testimonialsPage.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (testimonialId: string) => {
    if (!user) {
      toast.error(t("testimonialsPage.loginToLike"));
      return;
    }

    const hasLiked = userLikes.has(testimonialId);

    try {
      if (hasLiked) {
        // Unlike
        await supabase
          .from("testimonial_likes")
          .delete()
          .eq("testimonial_id", testimonialId)
          .eq("user_id", user.id);

        setUserLikes(prev => {
          const next = new Set(prev);
          next.delete(testimonialId);
          return next;
        });
      } else {
        // Like
        await supabase.from("testimonial_likes").insert({
          testimonial_id: testimonialId,
          user_id: user.id,
        });

        setUserLikes(prev => new Set(prev).add(testimonialId));
      }

      // Refresh testimonials to get updated count
      fetchTestimonials();
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error(t("testimonialsPage.likeError"));
    }
  };

  const approvedTestimonials = testimonials.filter(t => t.is_approved);
  const myTestimonials = testimonials.filter(t => t.user_id === user?.id);

  return (
    <>
      <Helmet>
        <title>{t("testimonialsPage.metaTitle")}</title>
        <meta
          name="description"
          content={t("testimonialsPage.metaDesc")}
        />
      </Helmet>

      <main className="min-h-screen bg-background">
        <Navbar />

        <div className="container mx-auto px-4 py-12 pt-24">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <MessageSquare className="w-4 h-4 inline mr-2" />
              {t("testimonialsPage.title")}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t("testimonialsPage.headerTitle")}
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("testimonialsPage.headerSubtitle")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Submit form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-1"
            >
              <div className="bg-card rounded-2xl p-6 border border-border/50 sticky top-24">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  {t("testimonialsPage.shareExperience")}
                </h2>

                {user ? (
                  <div className="space-y-4">
                    {/* Rating */}
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">
                        {t("testimonialsPage.yourRating")}
                      </label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setNewRating(star)}
                            className="p-1"
                          >
                            <Star
                              className={`w-6 h-6 transition-colors ${
                                star <= newRating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Content */}
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">
                        {t("testimonialsPage.yourTestimonial")}
                      </label>
                      <Textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder={t("testimonialsPage.placeholder")}
                        rows={4}
                        className="resize-none"
                      />
                    </div>

                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || !newContent.trim()}
                      className="w-full"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {submitting ? t("testimonialsPage.submitting") : t("testimonialsPage.submit")}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      {t("testimonialsPage.approvalNotice")}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-4">
                      {t("testimonialsPage.loginToShare")}
                    </p>
                    <Link to="/auth">
                      <Button>{t("common.login")}</Button>
                    </Link>
                  </div>
                )}

                {/* My testimonials */}
                {myTestimonials.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h3 className="text-sm font-medium text-foreground mb-3">
                      {t("testimonialsPage.myTestimonials")}
                    </h3>
                    <div className="space-y-2">
                      {myTestimonials.map((testimonial) => (
                        <div
                          key={testimonial.id}
                          className="text-xs p-2 rounded bg-secondary/50"
                        >
                          <p className="line-clamp-2">{testimonial.content}</p>
                          <span
                            className={`mt-1 inline-block px-2 py-0.5 rounded text-xs ${
                              testimonial.is_approved
                                ? "bg-success/20 text-success"
                                : "bg-amber-500/20 text-amber-600"
                            }`}
                          >
                            {testimonial.is_approved ? t("testimonialsPage.approved") : t("testimonialsPage.pending")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Testimonials list */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="lg:col-span-2"
            >
              {loading ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-card rounded-2xl p-6 border border-border/50 animate-pulse"
                    >
                      <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : approvedTestimonials.length === 0 ? (
                <div className="bg-card rounded-2xl p-12 border border-border/50 text-center">
                  <Quote className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {t("testimonialsPage.noTestimonials")}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {approvedTestimonials.map((testimonial, index) => (
                    <motion.div
                      key={testimonial.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="bg-card rounded-2xl p-6 border border-border/50 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12 border-2 border-primary/20">
                          <AvatarImage
                            src={testimonial.profile?.avatar_url || ""}
                            alt={testimonial.profile?.full_name || "User"}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {testimonial.profile?.full_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("") || "U"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-grow">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold text-foreground">
                                {testimonial.profile?.full_name || (language === "fr" ? "Utilisateur" : "User")}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {testimonial.profile?.city
                                  ? `${t("testimonialsPage.userAt")} ${testimonial.profile.city}`
                                  : t("testimonialsPage.immoiaUser")}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {Array.from({ length: testimonial.rating }).map((_, i) => (
                                <Star
                                  key={i}
                                  className="w-4 h-4 fill-amber-400 text-amber-400"
                                />
                              ))}
                            </div>
                          </div>

                          <p className="text-foreground/90 leading-relaxed mb-4">
                            "{testimonial.content}"
                          </p>

                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => handleLike(testimonial.id)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
                                userLikes.has(testimonial.id)
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                              }`}
                            >
                              <Heart
                                className={`w-4 h-4 ${
                                  userLikes.has(testimonial.id) ? "fill-current" : ""
                                }`}
                              />
                              <span className="text-sm">{testimonial.likes_count}</span>
                            </button>

                            <span className="text-xs text-muted-foreground">
                              {new Date(testimonial.created_at).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>

        <Footer />
      </main>
    </>
  );
};

export default TestimonialsPage;
