import { useState, useEffect } from "react";
import { format, subDays, startOfDay, endOfDay, subMonths } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Eye, TrendingUp, Clock, MapPin, Users, MousePointer, 
  Smartphone, Monitor, Tablet, ArrowUpRight, ArrowDownRight,
  Calendar, Filter, Download, Share2, Target, Zap, Mail,  
  Plus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type PropertyView = Tables<"property_views">;
type Property = Tables<"properties">;

interface PropertyAnalyticsProps {
  properties: Property[];
  userId: string;
}

interface ViewStats {
  totalViews: number;
  viewsThisWeek: number;
  viewsThisMonth: number;
  avgViewDuration: number;
  bounceRate: number;
  topSources: { name: string; value: number; color: string }[];
  deviceBreakdown: { name: string; value: number; icon: any }[];
  dailyViews: { date: string; fullDate: string; views: number; trend: number }[];
  hourlyDistribution: { hour: string; views: number }[];
  propertyViews: { name: string; views: number; id: string; trend: number }[];
  engagementScore: number;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))", 
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))"
];

const sourceLabels: Record<string, string> = {
  direct: "Direct",
  search: "Recherche",
  recommendation: "Recommandation",
  assistant: "Assistant IA",
  social: "Réseaux sociaux",
  email: "Email"
};

const sourceIcons: Record<string, any> = {
  direct: Target,
  search: Zap,
  recommendation: Users,
  assistant: Zap,
  social: Share2,
  email: Mail
};

export function PropertyAnalytics({ properties, userId }: PropertyAnalyticsProps) {
  const { language } = useLanguage();
  const [views, setViews] = useState<PropertyView[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [selectedMetric, setSelectedMetric] = useState("views");
  const [isExporting, setIsExporting] = useState(false);
  
  const [stats, setStats] = useState<ViewStats>({
    totalViews: 0,
    viewsThisWeek: 0,
    viewsThisMonth: 0,
    avgViewDuration: 0,
    bounceRate: 0,
    topSources: [],
    deviceBreakdown: [],
    dailyViews: [],
    hourlyDistribution: [],
    propertyViews: [],
    engagementScore: 0
  });

  const locale = language === "fr" ? fr : enUS;

  useEffect(() => {
    if (properties.length > 0) {
      fetchViews();
    } else {
      setLoading(false);
    }
  }, [properties, dateRange]);

  const fetchViews = async () => {
    setLoading(true);
    try {
      const propertyIds = properties.map(p => p.id);
      const startDate = subDays(new Date(), parseInt(dateRange));

      const { data, error } = await supabase
        .from("property_views")
        .select("*")
        .in("property_id", propertyIds)
        .gte("viewed_at", startDate.toISOString())
        .order("viewed_at", { ascending: false });

      if (error) throw error;
      setViews(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error("Error fetching views:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (viewsData: PropertyView[]) => {
    const now = new Date();
    const weekAgo = subDays(now, 7);
    const monthAgo = subDays(now, 30);

    // Basic counts
    const totalViews = viewsData.length;
    const viewsThisWeek = viewsData.filter(v => new Date(v.viewed_at) >= weekAgo).length;
    const viewsThisMonth = viewsData.filter(v => new Date(v.viewed_at) >= monthAgo).length;

    // Average duration
    const viewsWithDuration = viewsData.filter(v => (v.view_duration_seconds || 0) > 0);
    const avgViewDuration = viewsWithDuration.length > 0
      ? Math.round(viewsWithDuration.reduce((acc, v) => acc + (v.view_duration_seconds || 0), 0) / viewsWithDuration.length)
      : 0;

    // Bounce rate (views < 5 seconds)
    const bouncedViews = viewsData.filter(v => (v.view_duration_seconds || 0) < 5).length;
    const bounceRate = totalViews > 0 ? Math.round((bouncedViews / totalViews) * 100) : 0;

    // Engagement score (0-100)
    const engagementScore = Math.min(100, Math.round(
      (avgViewDuration / 60) * 20 + // Duration factor
      ((100 - bounceRate) / 100) * 30 + // Low bounce bonus
      (viewsThisWeek / 10) * 20 + // Recent activity
      (totalViews / 100) * 30 // Total volume
    ));

    // Sources with colors
    const sourceCounts: Record<string, number> = {};
    viewsData.forEach(v => {
      const source = v.source || "direct";
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    const topSources = Object.entries(sourceCounts)
      .map(([name, value], index) => ({ 
        name: sourceLabels[name] || name, 
        value,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);

    // Device breakdown
    const deviceCounts: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 };
    viewsData.forEach(v => {
      const device = v.device_type || "desktop";
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });
    const deviceBreakdown = [
      { name: "Desktop", value: deviceCounts.desktop, icon: Monitor },
      { name: "Mobile", value: deviceCounts.mobile, icon: Smartphone },
      { name: "Tablette", value: deviceCounts.tablet, icon: Tablet }
    ].filter(d => d.value > 0);

    // Daily views with trend
    const dailyMap: Record<string, number> = {};
    const days = parseInt(dateRange);
    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(now, i), "yyyy-MM-dd");
      dailyMap[date] = 0;
    }
    viewsData.forEach(v => {
      const date = format(new Date(v.viewed_at), "yyyy-MM-dd");
      if (dailyMap[date] !== undefined) dailyMap[date]++;
    });
    
    const dailyViews = Object.entries(dailyMap).map(([date, views], index, arr) => {
      const prevViews = index > 0 ? arr[index - 1][1] : views;
      const trend = prevViews > 0 ? ((views - prevViews) / prevViews) * 100 : 0;
      return {
        date: format(new Date(date), "d MMM", { locale }),
        fullDate: format(new Date(date), "EEEE d MMMM", { locale }),
        views,
        trend: Math.round(trend)
      };
    });

    // Hourly distribution
    const hourlyMap: Record<number, number> = {};
    viewsData.forEach(v => {
      const hour = new Date(v.viewed_at).getHours();
      hourlyMap[hour] = (hourlyMap[hour] || 0) + 1;
    });
    const hourlyDistribution = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}h`,
      views: hourlyMap[i] || 0
    }));

    // Property views with trend
    const propertyViewCounts: Record<string, { current: number; previous: number }> = {};
    const midPoint = subDays(now, Math.floor(days / 2));
    
    viewsData.forEach(v => {
      const pid = v.property_id;
      if (!propertyViewCounts[pid]) propertyViewCounts[pid] = { current: 0, previous: 0 };
      if (new Date(v.viewed_at) >= midPoint) {
        propertyViewCounts[pid].current++;
      } else {
        propertyViewCounts[pid].previous++;
      }
    });

    const propertyViews = properties
      .map(p => {
        const counts = propertyViewCounts[p.id] || { current: 0, previous: 0 };
        const trend = counts.previous > 0 
          ? ((counts.current - counts.previous) / counts.previous) * 100 
          : 0;
        return {
          id: p.id,
          name: p.title.length > 20 ? p.title.substring(0, 20) + "..." : p.title,
          views: counts.current + counts.previous,
          trend: Math.round(trend)
        };
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    setStats({
      totalViews,
      viewsThisWeek,
      viewsThisMonth,
      avgViewDuration,
      bounceRate,
      topSources,
      deviceBreakdown,
      dailyViews,
      hourlyDistribution,
      propertyViews,
      engagementScore
    });
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const exportData = async () => {
    setIsExporting(true);
    // Simulation d'export
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsExporting(false);
  };

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend, 
    trendUp,
    color = "primary",
    delay = 0 
  }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      <Card className="overflow-hidden group hover:shadow-hover transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-xl transition-colors duration-300",
                color === "primary" && "bg-primary/10 text-primary group-hover:bg-primary/20",
                color === "success" && "bg-success/10 text-success group-hover:bg-success/20",
                color === "secondary" && "bg-secondary/10 text-secondary group-hover:bg-secondary/20",
                color === "accent" && "bg-accent/10 text-accent-foreground group-hover:bg-accent/20"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{value}</h3>
              </div>
            </div>
            {trend !== undefined && (
              <div className={cn(
                "flex items-center gap-1 text-sm font-medium",
                trendUp ? "text-success" : "text-destructive"
              )}>
                {trendUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">{subtitle}</p>
        </CardContent>
      </Card>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed border-2">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
          <TrendingUp className="w-10 h-10 text-muted-foreground/40" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          {language === "fr" ? "Aucune donnée disponible" : "No data available"}
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          {language === "fr" 
            ? "Publiez des annonces pour commencer à suivre vos statistiques et optimiser votre visibilité"
            : "Publish listings to start tracking your statistics and optimize your visibility"}
        </p>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          {language === "fr" ? "Publier une annonce" : "Publish a listing"}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header avec contrôles */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            {language === "fr" ? "Tableau de bord" : "Analytics Dashboard"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {language === "fr" 
              ? `Performance de vos ${properties.length} annonces sur les ${dateRange} derniers jours`
              : `Performance of your ${properties.length} listings over the last ${dateRange} days`}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-44">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{language === "fr" ? "7 derniers jours" : "Last 7 days"}</SelectItem>
              <SelectItem value="30">{language === "fr" ? "30 derniers jours" : "Last 30 days"}</SelectItem>
              <SelectItem value="90">{language === "fr" ? "3 derniers mois" : "Last 3 months"}</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={exportData}
            disabled={isExporting}
            className="relative"
          >
            {isExporting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </Button>
        </div>
      </motion.div>

      {/* Score d'engagement global */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke="hsl(var(--muted))"
                      strokeWidth="8"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${stats.engagementScore * 2.26} 226`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-foreground">
                      {stats.engagementScore}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {language === "fr" ? "Score d'engagement" : "Engagement Score"}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    {language === "fr" 
                      ? "Basé sur la durée de visite, le taux de rebond et l'activité récente"
                      : "Based on view duration, bounce rate and recent activity"}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-8 text-center">
                <div>
                  <p className="text-3xl font-bold text-foreground">{stats.totalViews}</p>
                  <p className="text-sm text-muted-foreground">{language === "fr" ? "Vues totales" : "Total views"}</p>
                </div>
                <div className="w-px bg-border" />
                <div>
                  <p className="text-3xl font-bold text-success">{100 - stats.bounceRate}%</p>
                  <p className="text-sm text-muted-foreground">{language === "fr" ? "Taux d'engagement" : "Engagement rate"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={language === "fr" ? "Vues totales" : "Total views"}
          value={stats.totalViews.toLocaleString()}
          subtitle={language === "fr" ? "Sur la période sélectionnée" : "Over selected period"}
          icon={Eye}
          trend={12}
          trendUp={true}
          color="primary"
          delay={0.2}
        />
        <StatCard
          title={language === "fr" ? "Cette semaine" : "This week"}
          value={stats.viewsThisWeek.toLocaleString()}
          subtitle={language === "fr" ? "vs semaine dernière" : "vs last week"}
          icon={TrendingUp}
          trend={8}
          trendUp={true}
          color="success"
          delay={0.3}
        />
        <StatCard
          title={language === "fr" ? "Durée moyenne" : "Avg. duration"}
          value={formatDuration(stats.avgViewDuration)}
          subtitle={language === "fr" ? "Temps sur vos annonces" : "Time on your listings"}
          icon={Clock}
          trend={5}
          trendUp={true}
          color="secondary"
          delay={0.4}
        />
        <StatCard
          title={language === "fr" ? "Taux de rebond" : "Bounce rate"}
          value={`${stats.bounceRate}%`}
          subtitle={language === "fr" ? "Visites < 5 secondes" : "Views < 5 seconds"}
          icon={MousePointer}
          trend={-3}
          trendUp={false}
          color="accent"
          delay={0.5}
        />
      </div>

      {/* Charts Row 1 - Évolution et Top propriétés */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily Views avec Area Chart */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  {language === "fr" ? "Évolution des vues" : "View trends"}
                </CardTitle>
                <CardDescription>
                  {language === "fr" ? "Activité quotidienne sur vos annonces" : "Daily activity on your listings"}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="font-medium">
                {stats.dailyViews.reduce((acc, d) => acc + d.views, 0)} {language === "fr" ? "vues" : "views"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {stats.dailyViews.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={stats.dailyViews}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
                    tickLine={false}
                    axisLine={false}
                    width={35}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-card border border-border rounded-lg p-3 shadow-elevated">
                            <p className="text-sm font-medium text-foreground mb-1">{data.fullDate}</p>
                            <p className="text-2xl font-bold text-primary">{data.views} {language === "fr" ? "vues" : "views"}</p>
                            {data.trend !== 0 && (
                              <p className={cn(
                                "text-xs mt-1",
                                data.trend > 0 ? "text-success" : "text-destructive"
                              )}>
                                {data.trend > 0 ? "+" : ""}{data.trend}% {language === "fr" ? "vs veille" : "vs previous"}
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="views" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorViews)"
                    name="Vues"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground bg-muted/30 rounded-lg">
                {language === "fr" ? "Aucune donnée pour cette période" : "No data for this period"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Properties avec Bar Chart horizontal */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  {language === "fr" ? "Top 5 annonces" : "Top 5 listings"}
                </CardTitle>
                <CardDescription>
                  {language === "fr" ? "Vos biens les plus consultés" : "Your most viewed properties"}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-primary">
                {language === "fr" ? "Voir tout" : "See all"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {stats.propertyViews.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.propertyViews} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: "hsl(var(--foreground))", width: 130 }} 
                    tickLine={false}
                    axisLine={false}
                    width={140}
                  />
                  <Tooltip 
                    cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-card border border-border rounded-lg p-3 shadow-elevated">
                            <p className="text-sm font-medium text-foreground mb-1">{data.name}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xl font-bold text-primary">{data.views} vues</p>
                              {data.trend !== 0 && (
                                <Badge variant={data.trend > 0 ? "success" : "destructive"} className="text-xs">
                                  {data.trend > 0 ? "+" : ""}{data.trend}%
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="views" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 6, 6, 0]}
                    barSize={28}
                  >
                    {stats.propertyViews.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground bg-muted/30 rounded-lg">
                {language === "fr" ? "Aucune donnée disponible" : "No data available"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2 - Sources et Appareils */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sources de trafic */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              {language === "fr" ? "Sources de trafic" : "Traffic sources"}
            </CardTitle>
            <CardDescription>
              {language === "fr" ? "D'où viennent vos visiteurs" : "Where your visitors come from"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="relative">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={stats.topSources}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stats.topSources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const percent = stats.totalViews > 0 
                            ? Math.round((data.value / stats.totalViews) * 100) 
                            : 0;
                          return (
                            <div className="bg-card border border-border rounded-lg p-3 shadow-elevated">
                              <p className="text-sm font-medium text-foreground">{data.name}</p>
                              <p className="text-lg font-bold" style={{ color: data.color }}>
                                {data.value} ({percent}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-foreground">{stats.topSources.length}</p>
                    <p className="text-xs text-muted-foreground">{language === "fr" ? "sources" : "sources"}</p>
                  </div>
                </div>
              </div>

              {/* Legend détaillée */}
              <div className="flex flex-col justify-center gap-4">
                {stats.topSources.map((source, index) => {
                  const Icon = sourceIcons[Object.keys(sourceLabels).find(key => sourceLabels[key] === source.name) || "direct"] || Target;
                  const percent = stats.totalViews > 0 
                    ? Math.round((source.value / stats.totalViews) * 100) 
                    : 0;
                  
                  return (
                    <motion.div 
                      key={source.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${source.color}20` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: source.color }} />
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{source.name}</p>
                          <p className="text-xs text-muted-foreground">{source.value} {language === "fr" ? "visites" : "visits"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">{percent}%</p>
                        <div className="w-16 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${percent}%`, backgroundColor: source.color }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Répartition des appareils */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {language === "fr" ? "Appareils" : "Devices"}
            </CardTitle>
            <CardDescription>
              {language === "fr" ? "Comment vos visiteurs vous consultent" : "How visitors view your listings"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.deviceBreakdown.map((device, index) => {
                const Icon = device.icon;
                const percent = stats.totalViews > 0 
                  ? Math.round((device.value / stats.totalViews) * 100) 
                  : 0;
                
                return (
                  <motion.div
                    key={device.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          index === 0 && "bg-primary/10 text-primary",
                          index === 1 && "bg-success/10 text-success",
                          index === 2 && "bg-secondary/10 text-secondary"
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{device.name}</p>
                          <p className="text-xs text-muted-foreground">{device.value} {language === "fr" ? "visites" : "visits"}</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-foreground">{percent}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                        className={cn(
                          "h-full rounded-full",
                          index === 0 && "bg-primary",
                          index === 1 && "bg-success",
                          index === 2 && "bg-secondary"
                        )}
                      />
                    </div>
                  </motion.div>
                );
              })}
              
              {stats.deviceBreakdown.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {language === "fr" ? "Aucune donnée disponible" : "No data available"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3 - Distribution horaire */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {language === "fr" ? "Distribution horaire" : "Hourly distribution"}
          </CardTitle>
          <CardDescription>
            {language === "fr" ? "Quand vos visiteurs sont les plus actifs" : "When your visitors are most active"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.hourlyDistribution}>
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval={2}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip 
                cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-card border border-border rounded-lg p-2 shadow-elevated">
                        <p className="text-sm font-medium">{payload[0].payload.hour}</p>
                        <p className="text-lg font-bold text-primary">{payload[0].value} vues</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="views" 
                fill="hsl(var(--primary) / 0.6)" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
