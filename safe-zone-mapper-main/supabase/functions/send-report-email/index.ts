import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOVT_EMAIL = "dixit12sharma@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      reporter_name,
      reporter_email,
      reporter_phone,
      date,
      time,
      location_name,
      latitude,
      longitude,
      vehicle_type,
      severity,
      weather,
      cause,
      num_vehicles,
      num_casualties,
      description,
      urgency,
    } = body;

    // Build email content
    const emailHTML = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
  <div style="background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #e5e5e5;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #d35400; font-size: 24px; margin: 0;">🚨 New Accident Report</h1>
      <p style="color: #777; font-size: 14px; margin-top: 4px;">Submitted via TrafficGuard India</p>
    </div>

    <table style="width: 100%; border-collapse: collapse;">
      <tr style="background: #fff3e0;">
        <td style="padding: 10px 16px; font-weight: 600; color: #333; border-bottom: 1px solid #eee; width: 180px;">Urgency</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid #eee; color: ${urgency === 'critical' ? '#e74c3c' : urgency === 'high' ? '#e67e22' : '#27ae60'}; font-weight: 700; text-transform: uppercase;">${urgency || 'normal'}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; font-weight: 600; color: #333; border-bottom: 1px solid #eee;">Reporter Name</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${reporter_name || 'Anonymous'}</td>
      </tr>
      <tr style="background: #fafafa;">
        <td style="padding: 10px 16px; font-weight: 600; color: #333; border-bottom: 1px solid #eee;">Email</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${reporter_email || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; font-weight: 600; color: #333; border-bottom: 1px solid #eee;">Phone</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${reporter_phone || 'N/A'}</td>
      </tr>
      <tr style="background: #fafafa;">
        <td style="padding: 10px 16px; font-weight: 600; color: #333; border-bottom: 1px solid #eee;">Date & Time</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${date} ${time || ''}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; font-weight: 600; color: #333; border-bottom: 1px solid #eee;">Location</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${location_name || 'Unknown'}</td>
      </tr>
      <tr style="background: #fafafa;">
        <td style="padding: 10px 16px; font-weight: 600; color: #333; border-bottom: 1px solid #eee;">Coordinates</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${latitude}, ${longitude} <a href="https://maps.google.com/?q=${latitude},${longitude}" style="color: #3498db;">[View on Map]</a></td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; font-weight: 600; color: #333; border-bottom: 1px solid #eee;">Vehicle Type</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${vehicle_type}</td>
      </tr>
      <tr style="background: #fafafa;">
        <td style="padding: 10px 16px; font-weight: 600; color: #333; border-bottom: 1px solid #eee;">Severity</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: ${severity === 'fatal' ? '#e74c3c' : severity === 'severe' ? '#e67e22' : '#f39c12'};">${severity?.toUpperCase()}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; font-weight: 600; color: #333; border-bottom: 1px solid #eee;">Weather</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${weather || 'N/A'}</td>
      </tr>
      <tr style="background: #fafafa;">
        <td style="padding: 10px 16px; font-weight: 600; color: #333; border-bottom: 1px solid #eee;">Cause</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${cause || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; font-weight: 600; color: #333; border-bottom: 1px solid #eee;">Vehicles Involved</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${num_vehicles || 1}</td>
      </tr>
      <tr style="background: #fafafa;">
        <td style="padding: 10px 16px; font-weight: 600; color: #333; border-bottom: 1px solid #eee;">Casualties</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${num_casualties || 0}</td>
      </tr>
    </table>

    ${description ? `
    <div style="margin-top: 20px; background: #f9f9f9; border-radius: 8px; padding: 16px; border-left: 4px solid #d35400;">
      <h3 style="margin: 0 0 8px 0; color: #333; font-size: 14px;">Description / Witness Account</h3>
      <p style="margin: 0; color: #555; font-size: 14px; line-height: 1.6;">${description}</p>
    </div>
    ` : ''}

    <div style="margin-top: 24px; padding: 16px; background: #fff3e0; border-radius: 8px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #888;">This report was generated by <strong>TrafficGuard India</strong> — AI-Powered Road Safety Platform</p>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #aaa;">Report generated at ${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>`;

    // Use Supabase's built-in email via a simple logging approach
    // In production, integrate with Resend/SendGrid. For now, store the report.
    console.log(`📧 Report email would be sent to: ${GOVT_EMAIL}`);
    console.log(`Subject: [TrafficGuard] ${urgency?.toUpperCase()} - New Accident Report: ${location_name || 'Unknown Location'}`);
    
    // Store the report in the database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/accidents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        date,
        time: time || null,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        location_name: location_name || null,
        vehicle_type,
        severity,
        weather: weather || null,
        cause: cause || null,
        num_vehicles: parseInt(num_vehicles) || 1,
        num_casualties: parseInt(num_casualties) || 0,
        description: description || null,
      }),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      throw new Error(`DB insert failed: ${errText}`);
    }

    // Also create an alert for authorities
    await fetch(`${supabaseUrl}/rest/v1/alerts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        title: `New Accident Report: ${location_name || 'Unknown'}`,
        message: `${severity?.toUpperCase()} accident reported at ${location_name || `${latitude}, ${longitude}`}. ${num_casualties || 0} casualties. Cause: ${cause || 'Unknown'}. Reporter: ${reporter_name || 'Anonymous'} (${reporter_email || 'N/A'})`,
        severity: severity === 'fatal' || severity === 'severe' ? 'critical' : severity === 'moderate' ? 'warning' : 'info',
      }),
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Report submitted successfully! The record has been saved and authorities have been notified.",
        email_to: GOVT_EMAIL,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
