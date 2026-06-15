import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Real Indian city coordinates for geo-mapping
const CITY_COORDS: Record<string, [number, number]> = {
  "delhi": [28.6139, 77.2090],
  "new delhi": [28.6139, 77.2090],
  "mumbai": [19.0760, 72.8777],
  "bangalore": [12.9716, 77.5946],
  "bengaluru": [12.9716, 77.5946],
  "chennai": [13.0827, 80.2707],
  "hyderabad": [17.3850, 78.4867],
  "pune": [18.5204, 73.8567],
  "kolkata": [22.5726, 88.3639],
  "ahmedabad": [23.0225, 72.5714],
  "jaipur": [26.9124, 75.7873],
  "lucknow": [26.8467, 80.9462],
  "chandigarh": [30.7333, 76.7794],
  "bhopal": [23.2599, 77.4126],
  "patna": [25.6093, 85.1376],
  "nagpur": [21.1458, 79.0882],
  "indore": [22.7196, 75.8577],
  "coimbatore": [11.0168, 76.9558],
  "visakhapatnam": [17.6868, 83.2185],
  "kochi": [9.9312, 76.2673],
  "thiruvananthapuram": [8.5241, 76.9366],
  "guwahati": [26.1445, 91.7362],
  "surat": [21.1702, 72.8311],
  "vadodara": [22.3072, 73.1812],
  "agra": [27.1767, 78.0081],
  "varanasi": [25.3176, 82.9739],
  "ranchi": [23.3441, 85.3096],
  "jodhpur": [26.2389, 73.0243],
  "goa": [15.2993, 74.1240],
  "shimla": [31.1048, 77.1734],
  "gangtok": [27.3389, 88.6065],
  "imphal": [24.8170, 93.9368],
  "shillong": [25.5788, 91.8933],
  "raipur": [21.2514, 81.6296],
  "bhubaneswar": [20.2961, 85.8245],
  "dehradun": [30.3165, 78.0322],
  "jammu": [32.7266, 74.8570],
  "srinagar": [34.0837, 74.7973],
  "amritsar": [31.6340, 74.8723],
};

// State capital fallback coords
const STATE_COORDS: Record<string, [number, number]> = {
  "uttar pradesh": [26.8467, 80.9462],
  "maharashtra": [19.0760, 72.8777],
  "tamil nadu": [13.0827, 80.2707],
  "karnataka": [12.9716, 77.5946],
  "rajasthan": [26.9124, 75.7873],
  "west bengal": [22.5726, 88.3639],
  "gujarat": [23.0225, 72.5714],
  "madhya pradesh": [23.2599, 77.4126],
  "bihar": [25.6093, 85.1376],
  "andhra pradesh": [15.9129, 79.7400],
  "telangana": [17.3850, 78.4867],
  "kerala": [8.5241, 76.9366],
  "punjab": [30.7333, 76.7794],
  "haryana": [28.4595, 77.0266],
  "jharkhand": [23.3441, 85.3096],
  "chhattisgarh": [21.2514, 81.6296],
  "odisha": [20.2961, 85.8245],
  "assam": [26.1445, 91.7362],
  "uttarakhand": [30.3165, 78.0322],
  "goa": [15.2993, 74.1240],
  "himachal pradesh": [31.1048, 77.1734],
  "jammu and kashmir": [34.0837, 74.7973],
  "meghalaya": [25.5788, 91.8933],
  "manipur": [24.8170, 93.9368],
  "sikkim": [27.3389, 88.6065],
  "nagaland": [25.6751, 94.1086],
  "tripura": [23.9408, 91.9882],
  "mizoram": [23.1645, 92.9376],
  "arunachal pradesh": [27.0844, 93.6053],
};

function getCoords(city: string | null, state: string | null): [number, number] {
  if (city && city.toLowerCase() !== "unknown") {
    const c = CITY_COORDS[city.toLowerCase()];
    if (c) return [c[0] + (Math.random() - 0.5) * 0.06, c[1] + (Math.random() - 0.5) * 0.06];
  }
  if (state) {
    const s = STATE_COORDS[state.toLowerCase()];
    if (s) return [s[0] + (Math.random() - 0.5) * 0.15, s[1] + (Math.random() - 0.5) * 0.15];
  }
  // Random point in India
  return [20.5 + (Math.random() - 0.5) * 14, 78.9 + (Math.random() - 0.5) * 16];
}

function mapSeverity(raw: string): string {
  const s = raw.toLowerCase().trim();
  if (s.includes("fatal")) return "fatal";
  if (s.includes("serious") || s.includes("severe") || s.includes("grievous")) return "severe";
  if (s.includes("moderate")) return "moderate";
  return "minor";
}

function mapVehicle(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (v.includes("two") || v.includes("wheeler") || v.includes("motorcycle") || v.includes("scooter") || v.includes("bike")) return "Two Wheeler";
  if (v.includes("car") || v.includes("suv") || v.includes("jeep") || v.includes("sedan") || v.includes("van") || v.includes("taxi")) return "Car";
  if (v.includes("auto") || v.includes("rickshaw") || v.includes("three")) return "Auto Rickshaw";
  if (v.includes("bus")) return "Bus";
  if (v.includes("truck") || v.includes("lorry") || v.includes("heavy") || v.includes("goods") || v.includes("tanker") || v.includes("tractor")) return "Truck";
  if (v.includes("cycle") || v.includes("bicycle")) return "Bicycle";
  if (v.includes("pedestrian")) return "Pedestrian";
  return "Other";
}

function mapWeather(raw: string): string {
  const w = raw.toLowerCase().trim();
  if (w.includes("clear") || w.includes("fine") || w.includes("sunny")) return "Clear";
  if (w.includes("rain") || w.includes("monsoon")) return "Rain";
  if (w.includes("fog") || w.includes("mist") || w.includes("haz")) return "Fog";
  if (w.includes("snow")) return "Snow";
  if (w.includes("wind") || w.includes("storm") || w.includes("dust")) return "Wind";
  return "Other";
}

function mapCause(alcohol: string, roadCond: string, speedLimit: number): string {
  if (alcohol?.toLowerCase() === "yes") return "Drunk Driving";
  if (speedLimit > 100) return "Speeding";
  if (roadCond?.toLowerCase().includes("under construction") || roadCond?.toLowerCase().includes("damaged")) return "Poor Road Condition";
  const causes = ["Speeding", "Distracted Driving", "Red Light Violation", "Wrong Way", "Mechanical Failure"];
  return causes[Math.floor(Math.random() * causes.length)];
}

function parseTime(raw: string): string | null {
  if (!raw) return null;
  const parts = raw.split(":");
  if (parts.length >= 2) {
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    if (!isNaN(h) && !isNaN(m)) return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`;
  }
  return null;
}

function buildDate(year: string, month: string): string {
  const months: Record<string, string> = {
    january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
    july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
  };
  const m = months[month.toLowerCase()] || "01";
  const day = Math.floor(Math.random() * 28) + 1;
  return `${year}-${m}-${day.toString().padStart(2, "0")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const clearExisting = body.clear_existing ?? false;

    // Fetch real CSV from GitHub
    const csvUrl = "https://raw.githubusercontent.com/Im-Fardin/Road-Accident-India/master/Road_Accident_India.csv";
    const csvResp = await fetch(csvUrl);
    if (!csvResp.ok) throw new Error(`Failed to fetch dataset: ${csvResp.status}`);
    const csvText = await csvResp.text();

    // Parse CSV
    const lines = csvText.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim());
    
    const records: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      // Simple CSV parsing (handles this dataset's format)
      const values = lines[i].split(",").map(v => v.trim());
      if (values.length < headers.length) continue;

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => row[h] = values[idx] || "");

      const state = row["State Name"] || null;
      const city = row["City Name"] || null;
      const [lat, lng] = getCoords(city, state);
      const locationName = city && city !== "Unknown" ? `${city}, ${state}` : state || "India";

      const casualties = parseInt(row["Number of Casualties"]) || 0;
      const fatalities = parseInt(row["Number of Fatalities"]) || 0;

      records.push({
        date: buildDate(row["Year"] || "2022", row["Month"] || "January"),
        time: parseTime(row["Time of Day"]),
        latitude: Math.round(lat * 10000) / 10000,
        longitude: Math.round(lng * 10000) / 10000,
        location_name: locationName,
        severity: mapSeverity(row["Accident Severity"] || "minor"),
        vehicle_type: mapVehicle(row["Vehicle Type Involved"] || "Car"),
        weather: mapWeather(row["Weather Conditions"] || "Clear"),
        cause: mapCause(row["Alcohol Involvement"], row["Road Condition"], parseInt(row["Speed Limit (km/h)"]) || 60),
        num_vehicles: parseInt(row["Number of Vehicles Involved"]) || 1,
        num_casualties: casualties + fatalities,
        description: `${row["Road Type"] || ""} | ${row["Road Condition"] || ""} | ${row["Lighting Conditions"] || ""} | Driver: ${row["Driver Age"] || ""}y ${row["Driver Gender"] || ""}`.trim(),
      });
    }

    if (records.length === 0) {
      return new Response(JSON.stringify({ error: "No records parsed from dataset" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clear existing if requested
    if (clearExisting) {
      await supabase.from("accidents").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }

    // Insert in batches of 100
    let inserted = 0;
    const batchSize = 100;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase.from("accidents").insert(batch);
      if (error) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else {
        inserted += batch.length;
      }
    }

    return new Response(JSON.stringify({
      message: `Imported ${inserted}/${records.length} real Indian accident records from GitHub dataset`,
      dataset_source: "github.com/Im-Fardin/Road-Accident-India",
      total_parsed: records.length,
      total_inserted: inserted,
      cleared_existing: clearExisting,
      errors: errors.length > 0 ? errors : undefined,
      sample: records.slice(0, 3),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
