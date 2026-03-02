import { useState, useEffect } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, TrendingUp, Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type PropertyView = Tables<"property_views">;
type Property = Tables<"properties">;

interface PropertyAnalyticsProps {
  properties: Property[];
  userId: string;
}

interface ViewStats {
  totalViews: number;
  viewsThisWeek: number;
  avgViewDuration: number;
  topSources: { name: string; value: number }[];
  dailyViews: { date: string; views: number }[];
  propertyViews: { name: string; views: number; id: string }[];
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

const sourceLabels: Record<string, string> = {
  direct: "Direct",
  search: "Recherche",
  recommendation: "Recommandation",
  assistant: "Assistant IA"
};

export function PropertyAnalytics({ properties, userId }: PropertyAnalyticsProps) {
  const [views, setViews] = useState<PropertyView[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [stats, setStats] = useState<ViewStats>({
    totalViews: 0,
    viewsThisWeek: 0,
    avgViewDuration: 0,
    topSources: [],
    dailyViews: [],
    propertyViews: []
  });

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

    // Total views
    const totalViews = viewsData.length;

    // Views this week
    const viewsThisWeek = viewsData.filter(v => 
      new Date(v.viewed_at) >= weekAgo
    ).length;

    // Average view duration (only for views with duration > 0)
    const viewsWithDuration = viewsData.filter(v => (v.view_duration_seconds || 0) > 0);
    const avgViewDuration = viewsWithDuration.length > 0
      ? Math.round(viewsWithDuration.reduce((acc, v) => acc + (v.view_duration_seconds || 0), 0) / viewsWithDuration.length)
      : 0;

    // Top sources
    const sourceCounts: Record<string, number> = {};
    viewsData.forEach(v => {
      const source = v.source || "direct";
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    const topSources = Object.entries(sourceCounts)
      .map(([name, value]) => ({ name: sourceLabels[name] || name, value }))
      .sort((a, b) => b.value - a.value);

    // Daily views for the selected period
    const dailyMap: Record<string, number> = {};
    const days = parseInt(dateRange);
    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(now, i), "yyyy-MM-dd");
      dailyMap[date] = 0;
    }
    viewsData.forEach(v => {
      const date = format(new Date(v.viewed_at), "yyyy-MM-dd");
      if (dailyMap[date] !== undefined) {
        dailyMap[date]++;
      }
    });
    const dailyViews = Object.entries(dailyMap).map(([date, views]) => ({
      date: format(new Date(date), "d MMM", { locale: fr }),
      views
    }));

    // Views per property
    const propertyViewCounts: Record<string, number> = {};
    viewsData.forEach(v => {
      propertyViewCounts[v.property_id] = (propertyViewCounts[v.property_id] || 0) + 1;
    });
    const propertyViews = properties
      .map(p => ({
        id: p.id,
        name: p.title.length > 25 ? p.title.substring(0, 25) + "..." : p.title,
        views: propertyViewCounts[p.id] || 0
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    setStats({
      totalViews,
      viewsThisWeek,
      avgViewDuration,
      topSources,
      dailyViews,
      propertyViews
    });
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <Card className="p-12 text-center">
        <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          Aucune donnée disponible
        </h3>
        <p className="text-muted-foreground">
          Publiez des annonces pour commencer à suivre vos statistiques
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-end">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 derniers jours</SelectItem>
            <SelectItem value="30">30 derniers jours</SelectItem>
            <SelectItem value="90">90 derniers jours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalViews}</p>
                <p className="text-xs text-muted-foreground">Vues totales</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.viewsThisWeek}</p>
                <p className="text-xs text-muted-foreground">Cette semaine</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{formatDuration(stats.avgViewDuration)}</p>
                <p className="text-xs text-muted-foreground">Durée moyenne</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <MapPin className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{properties.length}</p>
                <p className="text-xs text-muted-foreground">Annonces actives</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily Views Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Évolution des vues</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.dailyViews.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.dailyViews}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="views" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                    name="Vues"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Aucune donnée pour cette période
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Properties */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 annonces</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.propertyViews.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.propertyViews} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                    width={120}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar 
                    dataKey="views" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 4, 4, 0]}
                    name="Vues"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sources de trafic</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div>
              {stats.topSources.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={stats.topSources}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {stats.topSources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  Aucune donnée disponible
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-col justify-center gap-3">
              {stats.topSources.map((source, index) => (
                <div key={source.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-foreground">{source.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{source.value}</span>
                    <Badge variant="secondary" className="text-xs">
                      {stats.totalViews > 0 
                        ? Math.round((source.value / stats.totalViews) * 100) 
                        : 0}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
