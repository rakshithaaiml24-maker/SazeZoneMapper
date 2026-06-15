import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { type, payload } = await req.json();

    // Fetch ALL accident data (paginated to bypass 1000 row limit)
    const fetchAllAccidents = async (select: string) => {
      const PAGE = 1000;
      let all: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("accidents")
          .select(select)
          .order("date", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all;
    };

    // Fetch city_accident_stats for enriched context
    const fetchCityStats = async () => {
      const { data } = await supabase
        .from("city_accident_stats")
        .select("city_name, state, total_accidents, total_fatalities, total_injuries, population, accidents_per_lakh, fatalities_per_lakh")
        .order("total_accidents", { ascending: false });
      return data || [];
    };

    // Build comprehensive summary from ALL data
    const fetchAccidentSummary = async (cityFilter?: string) => {
      let data: any[];
      if (cityFilter) {
        const { data: filtered } = await supabase
          .from("accidents")
          .select("severity, cause, weather, vehicle_type, location_name, num_casualties, date, time, latitude, longitude")
          .eq("location_name", cityFilter)
          .limit(5000);
        data = filtered || [];
      } else {
        data = await fetchAllAccidents("severity, cause, weather, vehicle_type, location_name, num_casualties, date, time");
      }

      const cityStats = await fetchCityStats();

      if (data.length === 0 && cityStats.length === 0) return "No accident data available.";

      const total = data.length;
      const sevCounts: Record<string, number> = {};
      const causeCounts: Record<string, number> = {};
      const weatherCounts: Record<string, number> = {};
      const vehicleCounts: Record<string, number> = {};
      const cityCounts: Record<string, number> = {};
      let totalCasualties = 0;

      data.forEach((a: any) => {
        sevCounts[a.severity] = (sevCounts[a.severity] || 0) + 1;
        if (a.cause) causeCounts[a.cause] = (causeCounts[a.cause] || 0) + 1;
        if (a.weather) weatherCounts[a.weather] = (weatherCounts[a.weather] || 0) + 1;
        vehicleCounts[a.vehicle_type] = (vehicleCounts[a.vehicle_type] || 0) + 1;
        if (a.location_name) cityCounts[a.location_name] = (cityCounts[a.location_name] || 0) + 1;
        totalCasualties += a.num_casualties || 0;
      });

      const topCauses = Object.entries(causeCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);
      const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 50);
      const topWeather = Object.entries(weatherCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
      const topVehicles = Object.entries(vehicleCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

      // City stats summary from government data
      const cityStatsSummary = cityStats.length > 0
        ? `\n\nGovernment/MoRTH City Data (${cityStats.length} cities):
Total city-level accidents: ${cityStats.reduce((s, c) => s + (c.total_accidents || 0), 0)}
Total city fatalities: ${cityStats.reduce((s, c) => s + (c.total_fatalities || 0), 0)}
Total city injuries: ${cityStats.reduce((s, c) => s + (c.total_injuries || 0), 0)}
Top 20 cities by accidents per lakh: ${[...cityStats].sort((a, b) => (b.accidents_per_lakh || 0) - (a.accidents_per_lakh || 0)).slice(0, 20).map(c => `${c.city_name}(${c.accidents_per_lakh?.toFixed(1)}/lakh, pop:${((c.population || 0) / 100000).toFixed(0)}L)`).join(", ")}
Top 20 cities by fatalities per lakh: ${[...cityStats].sort((a, b) => (b.fatalities_per_lakh || 0) - (a.fatalities_per_lakh || 0)).slice(0, 20).map(c => `${c.city_name}(${c.fatalities_per_lakh?.toFixed(1)}/lakh)`).join(", ")}`
        : "";

      return `Complete Dataset: ${total} total accidents across ${Object.keys(cityCounts).length} cities, ${totalCasualties} total casualties.
Severity breakdown: ${JSON.stringify(sevCounts)}
Top 15 causes: ${topCauses.map(([k, v]) => `${k}(${v})`).join(", ")}
All ${Object.keys(cityCounts).length} cities: ${topCities.map(([k, v]) => `${k}(${v})`).join(", ")}${topCities.length < Object.keys(cityCounts).length ? ` ... and ${Object.keys(cityCounts).length - topCities.length} more cities` : ""}
Weather conditions: ${topWeather.map(([k, v]) => `${k}(${v})`).join(", ")}
Vehicle types: ${topVehicles.map(([k, v]) => `${k}(${v})`).join(", ")}${cityStatsSummary}`;
    };

    const callAI = async (systemPrompt: string, userPrompt: string) => {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    };

    if (type === "route-safety") {
      const { origin, destination } = payload;
      const summary = await fetchAccidentSummary();

      return await callAI(
        `You are an Indian road safety AI analyst with access to a comprehensive accident dataset covering ALL cities in India. Analyze route safety between two locations using the complete dataset.

Accident data (COMPLETE dataset):
${summary}

Provide a structured safety analysis with:
1. 🛡️ Overall Risk Rating (Low/Medium/High/Critical) with score out of 100
2. ⚠️ Key Hazards along the route (reference actual data)
3. 🕐 Dangerous Time Periods to avoid
4. 🌧️ Weather-Related Risks
5. 🚗 Vehicle-Specific Risks
6. ✅ Safety Recommendations
7. 🗺️ Alternative safer suggestions if applicable

Be specific, data-driven, and reference actual patterns. Use emojis and markdown formatting for clarity.`,
        `Analyze the road safety for traveling from "${origin}" to "${destination}" in India. Provide detailed safety analysis based on the complete accident dataset.`
      );
    }

    if (type === "anomaly-detection") {
      const accidents = await fetchAllAccidents("*");
      if (accidents.length === 0) {
        return new Response(JSON.stringify({ error: "No accident data" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const cityStats: Record<string, { count: number; fatal: number; severe: number; casualties: number; dates: string[] }> = {};
      accidents.forEach((a: any) => {
        const city = a.location_name || "Unknown";
        if (!cityStats[city]) cityStats[city] = { count: 0, fatal: 0, severe: 0, casualties: 0, dates: [] };
        cityStats[city].count++;
        if (a.severity === "fatal") cityStats[city].fatal++;
        if (a.severity === "severe") cityStats[city].severe++;
        cityStats[city].casualties += a.num_casualties || 0;
        cityStats[city].dates.push(a.date);
      });

      const avgCount = Object.values(cityStats).reduce((s, c) => s + c.count, 0) / Object.keys(cityStats).length;
      const anomalies = Object.entries(cityStats)
        .filter(([_, s]) => s.count > avgCount * 1.5 || s.fatal > 3 || (s.casualties / s.count) > 2)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([city, s]) => ({ city, ...s, anomaly_score: ((s.count / avgCount) * 40 + (s.fatal * 15) + (s.casualties / s.count) * 10).toFixed(1) }));

      return await callAI(
        `You are an AI road safety anomaly detection system analyzing the COMPLETE Indian accident dataset.

Anomaly data from ALL ${Object.keys(cityStats).length} cities:
${JSON.stringify(anomalies, null, 2)}

Total accidents analyzed: ${accidents.length}
Average accidents per city: ${avgCount.toFixed(1)}
Total cities analyzed: ${Object.keys(cityStats).length}

Provide:
1. 🔴 Top Anomalous Cities with risk explanations
2. 📊 Pattern Analysis (why these cities are anomalous)
3. 📅 Temporal Patterns if visible
4. ⚡ Severity Concentration Analysis
5. 🎯 Actionable Recommendations for authorities

Use emojis, markdown headers, bold text, and bullet points. Be data-driven and reference actual numbers.`,
        "Detect anomalies across ALL cities in the Indian road accident dataset and provide a comprehensive analysis."
      );
    }

    if (type === "chatbot") {
      const { messages } = payload;
      const summary = await fetchAccidentSummary();

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are SafetyAI 🛡️, an expert Indian road safety analyst chatbot. You have access to the COMPLETE accident dataset covering ALL cities across India.

Complete dataset summary:
${summary}

Answer user questions about road safety, accident patterns, city comparisons, causes, weather impacts, vehicle types, and safety recommendations.
Be specific, reference actual data patterns, and provide actionable insights.
Use emojis, markdown formatting, bold text, and bullet points for clarity.
Keep responses concise but informative. If asked about something not in the data, say so clearly.`
            },
            ...messages,
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    return new Response(JSON.stringify({ error: "Invalid type. Use: route-safety, anomaly-detection, chatbot" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-safety-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
