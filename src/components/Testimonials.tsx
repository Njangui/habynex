import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, Quote, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

// Default testimonials for when DB is empty
const defaultTestimonials = [
  {
    id: "1",
    name: "Aminata Diallo",
    role: "Locataire à Douala",
    avatar: "",
    rating: 5,
    content: "Grâce à Habynex, j'ai trouvé mon appartement idéal en seulement 3 jours ! L'assistant IA a parfaitement compris mes besoins et m'a proposé des biens correspondant exactement à mes critères.",
    likes_count: 24,
  },
  {
    id: "2",
    name: "Jean-Pierre Kamga",
    role: "Propriétaire à Yaoundé",
    avatar: "",
    rating: 5,
    content: "En tant que propriétaire, Habynex m'a permis de louer mon bien rapidement. La plateforme est intuitive et les locataires sont sérieux. Je recommande vivement !",
    likes_count: 18,
  },
  {
    id: "3",
    name: "Fatou Ndiaye",
    role: "Étudiante à Dakar",
    avatar: "",
    rating: 5,
    content: "La fonctionnalité de colocation est géniale ! J'ai pu trouver des colocataires compatibles et un logement abordable près de mon université. Merci Habynex !",
    likes_count: 32,
  },
  {
    id: "4",
    name: "Emmanuel Okonkwo",
    role: "Entrepreneur à Lagos",
    avatar: "",
    rating: 5,
    content: "Habynex a révolutionné ma recherche immobilière. L'IA comprend vraiment ce que je cherche et me fait gagner un temps précieux. Service exceptionnel !",
    likes_count: 15,
  },
];

interface Testimonial {
  id: string;
  name?: string;
  role?: string;
  avatar?: string;
  rating: number;
  content: string;
  likes_count: number;
  user_id?: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    city: string | null;
  };
}

const Testimonials = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [testimonials, setTestimonials] = useState<Testimonial[]>(defaultTestimonials);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  // Fetch top liked testimonials from DB
  useEffect(() => {
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
            created_at
          `)
          .eq("is_approved", true)
          .order("likes_count", { ascending: false })
          .limit(8);

        if (error) throw error;

        if (data && data.length > 0) {
          // Fetch profiles for these users
          const userIds = data.map(t => t.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url, city")
            .in("user_id", userIds);

          const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

          const formattedTestimonials: Testimonial[] = data.map(testimonial => {
            const profile = profileMap.get(testimonial.user_id);
            return {
              id: testimonial.id,
              content: testimonial.content,
              rating: testimonial.rating,
              likes_count: testimonial.likes_count,
              user_id: testimonial.user_id,
              name: profile?.full_name || t("testimonials.user"),
              role: profile?.city ? `${t("testimonials.userAt")} ${profile.city}` : t("testimonials.userImmoIA"),
              avatar: profile?.avatar_url || "",
            };
          });

          setTestimonials(formattedTestimonials);
        }
      } catch (error) {
        console.error("Error fetching testimonials:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, [t]);

  // Auto-scroll effect
  useEffect(() => {
    if (!api) return;

    const autoplayPlugin = api.plugins()?.autoplay;
    if (autoplayPlugin) {
      autoplayPlugin.play();
    }
  }, [api]);

  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            {t("testimonials.badge")}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("testimonials.title")}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("testimonials.subtitle")}
          </p>
        </motion.div>

        {/* Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-5xl mx-auto px-12"
        >
          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              loop: true,
            }}
            plugins={[
              Autoplay({
                delay: 4000,
                stopOnInteraction: true,
                stopOnMouseEnter: true,
              }),
            ]}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {testimonials.map((testimonial) => (
                <CarouselItem key={testimonial.id} className="pl-4 md:basis-1/2">
                  <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 hover:shadow-md transition-shadow duration-300 h-full flex flex-col">
                    {/* Quote Icon */}
                    <Quote className="w-8 h-8 text-primary/20 mb-4" />
                    
                    {/* Content */}
                    <p className="text-foreground/90 leading-relaxed mb-6 flex-grow">
                      "{testimonial.content}"
                    </p>
                    
                    {/* Rating & Likes */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex gap-1">
                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                          <Star
                            key={i}
                            className="w-4 h-4 fill-amber-400 text-amber-400"
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Heart className="w-4 h-4 fill-destructive text-destructive" />
                        <span className="text-sm">{testimonial.likes_count}</span>
                      </div>
                    </div>
                    
                    {/* Author */}
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12 border-2 border-primary/20">
                        <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {testimonial.name?.split(" ").map(n => n[0]).join("") || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.slice(0, Math.min(testimonials.length, 4)).map((_, index) => (
              <button
                key={index}
                className="w-2 h-2 rounded-full bg-primary/30 hover:bg-primary transition-colors"
                onClick={() => api?.scrollTo(index)}
              />
            ))}
          </div>
        </motion.div>

        {/* CTA to testimonials page */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mt-10"
        >
          <Link to="/testimonials">
            <Button variant="outline" size="lg">
              {t("testimonials.viewAll")}
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;