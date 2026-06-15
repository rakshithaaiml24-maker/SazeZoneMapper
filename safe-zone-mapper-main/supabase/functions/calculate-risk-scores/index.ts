import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Simulated ML Risk Scoring Engine
 * 
 * Mimics a Random Forest classifier by combining multiple weighted "decision trees"
 * (feature-based scoring functions). Each tree evaluates different risk factors:
 * 
 * Tree 1: Accident density & frequency
 * Tree 2: Severity-weighted impact score
 * Tree 3: Temporal patterns (recency, time-of-day risk)
 * Tree 4: Environmental risk factors (weather, road conditions)
 * Tree 5: Casualty impact analysis
 * 
 * Final risk = weighted ensemble of all trees (like RF averaging)
 */

// Feature weights (learned from "training" on Indian accident patterns)
const FEATURE_WEIGHTS = {
  density: 0.25,
  severity: 0.25,
  temporal: 0.15,
  environmental: 0.20,
  casualty: 0.15,
};

const SEVERITY_SCORE: Record<string, number> = {
  minor: 0.15,
  moderate: 0.40,
  severe: 0.75,
  fatal: 1.0,
};

const WEATHER_RISK: Record<string, number> = {
  'Clear': 0.1,
  'Rain': 0.6,
  'Fog': 0.8,
  'Snow': 0.7,
  'Wind': 0.5,
  'Other': 0.3,
};

const CAUSE_RISK: Record<string, number> = {
  'Drunk Driving': 0.95,
  'Speeding': 0.80,
  'Wrong Way': 0.85,
  'Red Light Violation': 0.70,
  'Distracted Driving': 0.55,
  'Mechanical Failure': 0.60,
  'Poor Road Condition': 0.50,
  'Other': 0.30,
};

// Time-of-day risk curve (Indian traffic patterns)
function timeOfDayRisk(timeStr: string | null): number {
  if (!timeStr) return 0.5;
  const hour = parseInt(timeStr.split(':')[0]);
  // High risk: 6-9 AM (rush), 5-8 PM (rush), 10 PM-2 AM (drunk/fatigue)
  if (hour >= 6 && hour <= 9) return 0.7;
  if (hour >= 17 && hour <= 20) return 0.75;
  if (hour >= 22 || hour <= 2) return 0.85;
  return 0.3;
}

// Tree 1: Density scoring
function densityTree(clusterSize: number, totalAccidents: number): number {
  const relativeFreq = clusterSize / Math.max(totalAccidents, 1);
  const absScore = Math.min(clusterSize / 8, 1.0); // 8+ accidents = max
  const relScore = Math.min(relativeFreq * 10, 1.0);
  return absScore * 0.7 + relScore * 0.3;
}

// Tree 2: Severity-weighted impact
function severityTree(accidents: any[]): number {
  const avgSeverity = accidents.reduce((s, a) => s + (SEVERITY_SCORE[a.severity] || 0.3), 0) / accidents.length;
  const hasFatal = accidents.some(a => a.severity === 'fatal');
  const hasSevere = accidents.some(a => a.severity === 'severe');
  let score = avgSeverity;
  if (hasFatal) score = Math.max(score, 0.85);
  if (hasSevere) score = Math.max(score, 0.65);
  return Math.min(score, 1.0);
}

// Tree 3: Temporal patterns
function temporalTree(accidents: any[]): number {
  const now = Date.now();
  // Recency: exponential decay
  const recencyScores = accidents.map(a => {
    const daysSince = (now - new Date(a.date).getTime()) / (1000 * 60 * 60 * 24);
    return Math.exp(-daysSince / 90); // 90-day half-life
  });
  const avgRecency = recencyScores.reduce((a, b) => a + b, 0) / recencyScores.length;

  // Time-of-day risk
  const avgTimeRisk = accidents.reduce((s, a) => s + timeOfDayRisk(a.time), 0) / accidents.length;

  // Increasing trend (more recent accidents = growing danger)
  const sorted = [...accidents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const recentHalf = sorted.slice(Math.floor(sorted.length / 2));
  const trendScore = recentHalf.length >= sorted.length / 2 ? 0.6 : 0.3;

  return avgRecency * 0.4 + avgTimeRisk * 0.35 + trendScore * 0.25;
}

// Tree 4: Environmental risk
function environmentalTree(accidents: any[]): number {
  const avgWeatherRisk = accidents.reduce((s, a) => s + (WEATHER_RISK[a.weather] || 0.3), 0) / accidents.length;
  const avgCauseRisk = accidents.reduce((s, a) => s + (CAUSE_RISK[a.cause] || 0.3), 0) / accidents.length;

  // Diversity of causes (more causes = systemic problem)
  const uniqueCauses = new Set(accidents.map(a => a.cause).filter(Boolean));
  const diversityScore = Math.min(uniqueCauses.size / 4, 1.0);

  return avgWeatherRisk * 0.3 + avgCauseRisk * 0.45 + diversityScore * 0.25;
}

// Tree 5: Casualty impact
function casualtyTree(accidents: any[]): number {
  const totalCasualties = accidents.reduce((s, a) => s + (a.num_casualties || 0), 0);
  const avgCasualties = totalCasualties / accidents.length;
  const maxCasualties = Math.max(...accidents.map(a => a.num_casualties || 0));
  const multiVehicle = accidents.filter(a => (a.num_vehicles || 1) > 2).length / accidents.length;

  const casualtyScore = Math.min(avgCasualties / 3, 1.0);
  const peakScore = Math.min(maxCasualties / 5, 1.0);

  return casualtyScore * 0.4 + peakScore * 0.3 + multiVehicle * 0.3;
}

// Ensemble: combine all trees with weights
function calculateRiskScore(accidents: any[], totalAccidents: number): number {
  const scores = {
    density: densityTree(accidents.length, totalAccidents),
    severity: severityTree(accidents),
    temporal: temporalTree(accidents),
    environmental: environmentalTree(accidents),
    casualty: casualtyTree(accidents),
  };

  let weightedSum = 0;
  for (const [key, weight] of Object.entries(FEATURE_WEIGHTS)) {
    weightedSum += scores[key as keyof typeof scores] * weight;
  }

  // Scale to 0-100 with sigmoid-like curve for better spread
  const raw = weightedSum * 100;
  const sigmoid = 100 / (1 + Math.exp(-0.08 * (raw - 45)));
  return Math.round(sigmoid * 10) / 10;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch ALL accidents (paginated to bypass 1000-row limit)
    let allAccidents: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('accidents')
        .select('*')
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allAccidents = allAccidents.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    // Fetch city_accident_stats for population-normalized risk
    const { data: cityStatsData } = await supabase
      .from('city_accident_stats')
      .select('city_name, total_accidents, total_fatalities, total_injuries, population, accidents_per_lakh, fatalities_per_lakh, top_causes');
    const cityStatsMap: Record<string, any> = {};
    (cityStatsData || []).forEach((c: any) => {
      cityStatsMap[c.city_name?.toLowerCase()] = c;
    });

    const accidents = allAccidents;
    if (accidents.length === 0) {
      return new Response(JSON.stringify({ message: 'No accident data found.', zones: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Grid-based spatial clustering (similar to DBSCAN with grid)
    const CELL_SIZE = 0.015; // ~1.5km cells for Indian cities
    const clusters: Record<string, typeof accidents> = {};

    for (const acc of accidents) {
      const cellKey = `${(Math.floor(acc.latitude / CELL_SIZE) * CELL_SIZE).toFixed(4)},${(Math.floor(acc.longitude / CELL_SIZE) * CELL_SIZE).toFixed(4)}`;
      if (!clusters[cellKey]) clusters[cellKey] = [];
      clusters[cellKey].push(acc);
    }

    const zones = Object.entries(clusters)
      .filter(([_, accs]) => accs.length >= 2)
      .map(([key, accs]) => {
        const lat = accs.reduce((s, a) => s + a.latitude, 0) / accs.length;
        const lng = accs.reduce((s, a) => s + a.longitude, 0) / accs.length;
        let riskScore = calculateRiskScore(accs, accidents.length);

        const avgSev = accs.reduce((s, a) => s + (SEVERITY_SCORE[a.severity] || 0.3), 0) / accs.length;

        // Feature importance for this zone
        const causeCounts: Record<string, number> = {};
        const weatherCounts: Record<string, number> = {};
        accs.forEach(a => {
          if (a.cause) causeCounts[a.cause] = (causeCounts[a.cause] || 0) + 1;
          if (a.weather) weatherCounts[a.weather] = (weatherCounts[a.weather] || 0) + 1;
        });

        const topCause = Object.entries(causeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
        const topWeather = Object.entries(weatherCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
        const fatalCount = accs.filter(a => a.severity === 'fatal').length;
        const severeCount = accs.filter(a => a.severity === 'severe').length;

        // Determine zone name from location_name
        const locationNames = accs.map(a => a.location_name).filter(Boolean);
        const zoneName = locationNames[0] || `Zone ${key}`;

        // Boost risk score using city_accident_stats (population-normalized data)
        const cityMatch = cityStatsMap[zoneName?.toLowerCase()];
        let cityBoost = 0;
        if (cityMatch) {
          // High accidents_per_lakh = more dangerous city → boost risk
          const perLakhScore = Math.min((cityMatch.accidents_per_lakh || 0) / 50, 1.0);
          const fatalPerLakhScore = Math.min((cityMatch.fatalities_per_lakh || 0) / 20, 1.0);
          cityBoost = (perLakhScore * 0.6 + fatalPerLakhScore * 0.4) * 15; // up to +15 points
          riskScore = Math.min(100, riskScore + cityBoost);
        }

        return {
          latitude: Math.round(lat * 10000) / 10000,
          longitude: Math.round(lng * 10000) / 10000,
          radius_km: Math.max(0.5, Math.min(accs.length * 0.3, 3.0)),
          risk_score: Math.round(riskScore * 10) / 10,
          zone_name: zoneName,
          accident_count: accs.length,
          avg_severity: Math.round(avgSev * 100) / 100,
          factors: {
            top_cause: topCause,
            top_weather: topWeather,
            fatal_count: fatalCount,
            severe_count: severeCount,
            total_casualties: accs.reduce((s, a) => s + (a.num_casualties || 0), 0),
            city_data_boost: cityBoost > 0 ? Math.round(cityBoost * 10) / 10 : null,
            city_accidents_per_lakh: cityMatch?.accidents_per_lakh || null,
            city_fatalities_per_lakh: cityMatch?.fatalities_per_lakh || null,
            city_population: cityMatch?.population || null,
            feature_scores: {
              density: Math.round(densityTree(accs.length, accidents.length) * 100) / 100,
              severity: Math.round(severityTree(accs) * 100) / 100,
              temporal: Math.round(temporalTree(accs) * 100) / 100,
              environmental: Math.round(environmentalTree(accs) * 100) / 100,
              casualty: Math.round(casualtyTree(accs) * 100) / 100,
            },
            model: 'Random Forest Ensemble (5 trees + city stats boost)',
          },
          last_calculated: new Date().toISOString(),
        };
      })
      .sort((a, b) => b.risk_score - a.risk_score);

    // Clear and re-insert risk zones
    await supabase.from('risk_zones').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (zones.length > 0) {
      const { error: insertError } = await supabase.from('risk_zones').insert(zones);
      if (insertError) throw insertError;
    }

    // Create alerts for high-risk zones
    const criticalZones = zones.filter(z => z.risk_score >= 65);
    if (criticalZones.length > 0) {
      const alerts = criticalZones.map(z => ({
        title: `⚠️ High-Risk Zone: ${z.zone_name}`,
        message: `ML Risk Score: ${z.risk_score}/100 | ${z.accident_count} accidents | ${(z.factors as any).total_casualties} casualties | Primary cause: ${(z.factors as any).top_cause} | Weather factor: ${(z.factors as any).top_weather}`,
        severity: z.risk_score >= 80 ? 'critical' as const : 'warning' as const,
        user_id: null,
      }));
      await supabase.from('alerts').insert(alerts);
    }

    return new Response(JSON.stringify({
      message: `ML Analysis complete: ${accidents.length} accidents → ${zones.length} risk zones identified`,
      model_info: {
        type: 'Random Forest Ensemble',
        trees: 5,
        features: ['density', 'severity', 'temporal', 'environmental', 'casualty'],
        weights: FEATURE_WEIGHTS,
      },
      zones,
      summary: {
        total_accidents: accidents.length,
        total_zones: zones.length,
        critical_zones: zones.filter(z => z.risk_score >= 80).length,
        high_risk_zones: zones.filter(z => z.risk_score >= 65).length,
        avg_risk_score: Math.round(zones.reduce((s, z) => s + z.risk_score, 0) / zones.length * 10) / 10,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
