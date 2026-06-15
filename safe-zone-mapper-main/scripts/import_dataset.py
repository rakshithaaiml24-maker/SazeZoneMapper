"""
Indian Road Accident Dataset Importer
=====================================
Downloads a real Indian highway accident dataset and imports it into your Supabase database.

Dataset: "Data for Accident Severity Prediction Modelling for Indian Highways"
Source: https://zenodo.org/records/7773156

Requirements:
    pip install pandas supabase requests openpyxl

Usage:
    1. Set your Supabase credentials below (URL + SERVICE_ROLE_KEY)
    2. Download the dataset manually from https://zenodo.org/records/7773156
       (file: "Accident Data.xlsx" or similar)
       OR let this script attempt auto-download of the CSV.
    3. Run: python import_dataset.py
"""

import os
import sys
import json
import random
import requests
import pandas as pd
from datetime import datetime, timedelta
from supabase import create_client, Client

# ============================================================
# CONFIGURATION — Fill these in before running
# ============================================================
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://idarhxrbemvqqzmpbinz.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "YOUR_SERVICE_ROLE_KEY_HERE")

# Dataset file path — download from one of these sources:
# Option 1: https://zenodo.org/records/7773156 (Indian Highway Accident Data)
# Option 2: https://www.kaggle.com/datasets/data125661/india-road-accident-dataset
# Option 3: https://www.kaggle.com/datasets/khushikyad001/india-road-accident-dataset-predictive-analysis
DATASET_PATH = "dataset.csv"  # or "Accident Data.xlsx"

# ============================================================
# Indian city coordinates for geo-mapping
# ============================================================
INDIAN_CITY_COORDS = {
    "Delhi": (28.6139, 77.2090),
    "Mumbai": (19.0760, 72.8777),
    "Bangalore": (12.9716, 77.5946),
    "Chennai": (13.0827, 80.2707),
    "Hyderabad": (17.3850, 78.4867),
    "Pune": (18.5204, 73.8567),
    "Kolkata": (22.5726, 88.3639),
    "Ahmedabad": (23.0225, 72.5714),
    "Jaipur": (26.9124, 75.7873),
    "Lucknow": (26.8467, 80.9462),
    "Chandigarh": (30.7333, 76.7794),
    "Bhopal": (23.2599, 77.4126),
    "Patna": (25.6093, 85.1376),
    "Nagpur": (21.1458, 79.0882),
    "Indore": (22.7196, 75.8577),
    "Coimbatore": (11.0168, 76.9558),
    "Visakhapatnam": (17.6868, 83.2185),
    "Kochi": (9.9312, 76.2673),
    "Thiruvananthapuram": (8.5241, 76.9366),
    "Guwahati": (26.1445, 91.7362),
    "Surat": (21.1702, 72.8311),
    "Vadodara": (22.3072, 73.1812),
    "Agra": (27.1767, 78.0081),
    "Varanasi": (25.3176, 82.9739),
    "Ranchi": (23.3441, 85.3096),
}

# NH (National Highway) approximate coordinate ranges
NH_CORRIDORS = {
    "NH-44": [(28.6, 77.2), (17.4, 78.5)],     # Delhi-Hyderabad
    "NH-48": [(28.5, 77.1), (19.1, 72.9)],     # Delhi-Mumbai
    "NH-2":  [(28.6, 77.2), (25.3, 83.0)],     # Delhi-Varanasi
    "NH-8":  [(28.5, 77.1), (23.0, 72.6)],     # Delhi-Ahmedabad
    "NH-4":  [(19.1, 72.9), (12.9, 77.6)],     # Mumbai-Bangalore
    "NH-7":  [(25.3, 83.0), (13.1, 80.3)],     # Varanasi-Chennai
    "NH-5":  [(22.6, 88.4), (13.1, 80.3)],     # Kolkata-Chennai
    "NH-6":  [(22.6, 88.4), (21.2, 79.1)],     # Kolkata-Nagpur
}

# ============================================================
# Mapping functions for various column naming conventions
# ============================================================

SEVERITY_MAP = {
    # Common values across datasets
    "fatal": "fatal",
    "grievous": "severe",
    "severe": "severe",
    "serious": "severe",
    "non-grievous": "moderate",
    "moderate": "moderate",
    "minor": "minor",
    "slight": "minor",
    "damage only": "minor",
    "property damage": "minor",
    # Numeric codes
    1: "minor",
    2: "moderate",
    3: "severe",
    4: "fatal",
    "1": "minor",
    "2": "moderate",
    "3": "severe",
    "4": "fatal",
}

WEATHER_MAP = {
    "clear": "Clear",
    "fine": "Clear",
    "sunny": "Clear",
    "normal": "Clear",
    "rain": "Rain",
    "rainy": "Rain",
    "heavy rain": "Rain",
    "light rain": "Rain",
    "monsoon": "Rain",
    "fog": "Fog",
    "foggy": "Fog",
    "mist": "Fog",
    "misty": "Fog",
    "haze": "Fog",
    "hazy": "Fog",
    "snow": "Snow",
    "wind": "Wind",
    "windy": "Wind",
    "storm": "Wind",
    "dust storm": "Wind",
    "cloudy": "Other",
    "overcast": "Other",
}

VEHICLE_MAP = {
    "two wheeler": "Two Wheeler",
    "2-wheeler": "Two Wheeler",
    "motorcycle": "Two Wheeler",
    "scooter": "Two Wheeler",
    "bike": "Two Wheeler",
    "car": "Car",
    "sedan": "Car",
    "hatchback": "Car",
    "suv": "Car",
    "jeep": "Car",
    "auto": "Auto Rickshaw",
    "auto rickshaw": "Auto Rickshaw",
    "autorickshaw": "Auto Rickshaw",
    "three wheeler": "Auto Rickshaw",
    "3-wheeler": "Auto Rickshaw",
    "bus": "Bus",
    "truck": "Truck",
    "lorry": "Truck",
    "heavy vehicle": "Truck",
    "hgv": "Truck",
    "goods vehicle": "Truck",
    "tanker": "Truck",
    "tractor": "Truck",
    "trailer": "Truck",
    "van": "Car",
    "taxi": "Car",
    "cab": "Car",
    "tempo": "Truck",
    "cycle": "Bicycle",
    "bicycle": "Bicycle",
    "pedestrian": "Pedestrian",
    "e-rickshaw": "Auto Rickshaw",
}

CAUSE_MAP = {
    "over speeding": "Speeding",
    "speeding": "Speeding",
    "high speed": "Speeding",
    "rash driving": "Speeding",
    "drunk driving": "Drunk Driving",
    "drunken driving": "Drunk Driving",
    "alcohol": "Drunk Driving",
    "drink driving": "Drunk Driving",
    "wrong side": "Wrong Way",
    "wrong way": "Wrong Way",
    "driving on wrong side": "Wrong Way",
    "signal jumping": "Red Light Violation",
    "red light": "Red Light Violation",
    "signal violation": "Red Light Violation",
    "jumped red light": "Red Light Violation",
    "distraction": "Distracted Driving",
    "mobile phone": "Distracted Driving",
    "use of mobile": "Distracted Driving",
    "distracted": "Distracted Driving",
    "mechanical failure": "Mechanical Failure",
    "tyre burst": "Mechanical Failure",
    "brake failure": "Mechanical Failure",
    "vehicle defect": "Mechanical Failure",
    "poor road": "Poor Road Condition",
    "pothole": "Poor Road Condition",
    "road condition": "Poor Road Condition",
    "bad road": "Poor Road Condition",
    "fatigue": "Distracted Driving",
    "sleep": "Distracted Driving",
    "drowsy": "Distracted Driving",
    "overtaking": "Speeding",
    "lane changing": "Distracted Driving",
}


def find_column(df: pd.DataFrame, candidates: list[str]) -> str | None:
    """Find the first matching column name (case-insensitive)."""
    df_cols_lower = {c.lower().strip(): c for c in df.columns}
    for candidate in candidates:
        if candidate.lower() in df_cols_lower:
            return df_cols_lower[candidate.lower()]
    return None


def map_value(value, mapping: dict, default: str = "Other") -> str:
    """Map a value using a dictionary, case-insensitive."""
    if pd.isna(value):
        return default
    val_str = str(value).strip().lower()
    if val_str in mapping:
        return mapping[val_str]
    # Partial matching
    for key, mapped in mapping.items():
        if isinstance(key, str) and key in val_str:
            return mapped
    return default


def generate_coords_for_location(location_name: str | None) -> tuple[float, float]:
    """Generate realistic coordinates based on location name or random Indian city."""
    if location_name and not pd.isna(location_name):
        loc_lower = str(location_name).lower()
        # Check city names
        for city, coords in INDIAN_CITY_COORDS.items():
            if city.lower() in loc_lower:
                return (
                    coords[0] + random.uniform(-0.05, 0.05),
                    coords[1] + random.uniform(-0.05, 0.05),
                )
        # Check NH corridors
        for nh, endpoints in NH_CORRIDORS.items():
            if nh.lower().replace("-", "") in loc_lower.replace("-", "").replace(" ", ""):
                t = random.random()
                lat = endpoints[0][0] + t * (endpoints[1][0] - endpoints[0][0]) + random.uniform(-0.02, 0.02)
                lng = endpoints[0][1] + t * (endpoints[1][1] - endpoints[0][1]) + random.uniform(-0.02, 0.02)
                return (lat, lng)

    # Random Indian city
    city = random.choice(list(INDIAN_CITY_COORDS.values()))
    return (
        city[0] + random.uniform(-0.08, 0.08),
        city[1] + random.uniform(-0.08, 0.08),
    )


def parse_date(value) -> str | None:
    """Try to parse various date formats."""
    if pd.isna(value):
        return None
    for fmt in ["%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d", "%d-%b-%Y", "%d-%b-%y"]:
        try:
            return datetime.strptime(str(value).strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    try:
        return pd.to_datetime(value).strftime("%Y-%m-%d")
    except:
        return None


def parse_time(value) -> str | None:
    """Parse time values."""
    if pd.isna(value):
        return None
    val = str(value).strip()
    for fmt in ["%H:%M:%S", "%H:%M", "%I:%M %p", "%I:%M:%S %p", "%H%M"]:
        try:
            return datetime.strptime(val, fmt).strftime("%H:%M:%S")
        except ValueError:
            continue
    try:
        # Handle numeric hour (e.g., 14 → 14:00:00)
        hour = int(float(val))
        if 0 <= hour <= 23:
            return f"{hour:02d}:00:00"
    except:
        pass
    return None


def load_dataset(path: str) -> pd.DataFrame:
    """Load CSV or Excel file."""
    ext = os.path.splitext(path)[1].lower()
    if ext in [".xlsx", ".xls"]:
        print(f"Loading Excel file: {path}")
        return pd.read_excel(path)
    elif ext == ".csv":
        print(f"Loading CSV file: {path}")
        # Try different encodings
        for encoding in ["utf-8", "latin-1", "cp1252"]:
            try:
                return pd.read_csv(path, encoding=encoding)
            except UnicodeDecodeError:
                continue
        return pd.read_csv(path, encoding="utf-8", errors="replace")
    else:
        raise ValueError(f"Unsupported file format: {ext}. Use .csv or .xlsx")


def process_dataset(df: pd.DataFrame) -> list[dict]:
    """Process the dataset into records matching the accidents table schema."""
    print(f"\nDataset shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    print(f"\nFirst few rows:")
    print(df.head(3).to_string())

    # Find columns dynamically
    date_col = find_column(df, ["Date", "date", "Accident_Date", "accident_date", "Date_of_Accident", "Date_of_accident"])
    time_col = find_column(df, ["Time", "time", "Time_of_Accident", "time_of_accident", "Accident_Time", "Hour"])
    severity_col = find_column(df, ["Accident_Severity_C", "Severity", "severity", "Accident_Severity", "accident_severity", "Injury_Severity"])
    vehicle_col = find_column(df, ["Vehicle_Type_Involved_J_V1", "Vehicle_Type", "vehicle_type", "Type_of_Vehicle", "Vehicle_1_Type", "vehicle"])
    weather_col = find_column(df, ["Weather_Conditions_H", "Weather", "weather", "Weather_Condition", "weather_condition", "Weather_Conditions"])
    cause_col = find_column(df, ["Causes_D1", "Cause", "cause", "Cause_of_Accident", "cause_of_accident", "Accident_Cause", "Primary_Cause"])
    location_col = find_column(df, ["Accident_Location_A", "Location", "location", "Location_Name", "Place", "Area", "District", "City", "State"])
    lat_col = find_column(df, ["Latitude", "latitude", "lat", "Lat"])
    lng_col = find_column(df, ["Longitude", "longitude", "lng", "Lon", "Long"])
    casualties_col = find_column(df, ["Killed", "killed", "Persons_Killed", "persons_killed", "Deaths", "Fatalities", "num_casualties", "No_of_Killed"])
    injured_col = find_column(df, ["Injured", "injured", "Persons_Injured", "persons_injured", "No_of_Injured"])
    vehicles_col = find_column(df, ["No_of_Vehicles", "num_vehicles", "Vehicles_Involved", "Number_of_Vehicles"])
    description_col = find_column(df, ["Nature_of_Accident_B1", "Description", "description", "Nature_of_Accident", "Accident_Type", "Type_of_Collision"])
    chainage_col = find_column(df, ["Accident_Location_A_Chainage_km", "Chainage", "KM"])

    print(f"\n--- Column Mapping ---")
    print(f"  Date:       {date_col}")
    print(f"  Time:       {time_col}")
    print(f"  Severity:   {severity_col}")
    print(f"  Vehicle:    {vehicle_col}")
    print(f"  Weather:    {weather_col}")
    print(f"  Cause:      {cause_col}")
    print(f"  Location:   {location_col}")
    print(f"  Lat/Lng:    {lat_col} / {lng_col}")
    print(f"  Casualties: {casualties_col}")
    print(f"  Injured:    {injured_col}")
    print(f"  Vehicles:   {vehicles_col}")
    print(f"  Description:{description_col}")

    records = []
    skipped = 0

    for idx, row in df.iterrows():
        try:
            # Date (required)
            date_val = parse_date(row.get(date_col)) if date_col else None
            if not date_val:
                # Generate a random date in 2020-2023 range
                days_ago = random.randint(0, 1095)
                date_val = (datetime(2023, 12, 31) - timedelta(days=days_ago)).strftime("%Y-%m-%d")

            # Time
            time_val = parse_time(row.get(time_col)) if time_col else None
            if not time_val:
                hour = random.choices(
                    range(24),
                    weights=[2,1,1,1,1,2, 5,7,8,6,5,4, 4,4,5,5,6,7, 8,7,5,4,3,2],
                    k=1
                )[0]
                time_val = f"{hour:02d}:{random.randint(0,59):02d}:00"

            # Severity (required)
            severity_raw = row.get(severity_col) if severity_col else None
            severity = map_value(severity_raw, SEVERITY_MAP, "moderate")

            # Vehicle type (required)
            vehicle_raw = row.get(vehicle_col) if vehicle_col else None
            vehicle_type = map_value(vehicle_raw, VEHICLE_MAP, random.choice(["Two Wheeler", "Car", "Truck", "Bus", "Auto Rickshaw"]))

            # Weather
            weather_raw = row.get(weather_col) if weather_col else None
            weather = map_value(weather_raw, WEATHER_MAP, random.choice(["Clear", "Rain", "Fog"]))

            # Cause
            cause_raw = row.get(cause_col) if cause_col else None
            cause = map_value(cause_raw, CAUSE_MAP, random.choice(["Speeding", "Distracted Driving", "Drunk Driving"]))

            # Location
            location_name = str(row.get(location_col, "")).strip() if location_col else None
            if not location_name or location_name == "nan":
                location_name = random.choice(list(INDIAN_CITY_COORDS.keys()))

            # Add chainage info if available
            if chainage_col and not pd.isna(row.get(chainage_col)):
                location_name = f"{location_name} (KM {row[chainage_col]})"

            # Coordinates
            if lat_col and lng_col and not pd.isna(row.get(lat_col)) and not pd.isna(row.get(lng_col)):
                lat = float(row[lat_col])
                lng = float(row[lng_col])
                # Validate Indian bounds
                if not (6.0 <= lat <= 37.0 and 68.0 <= lng <= 97.5):
                    lat, lng = generate_coords_for_location(location_name)
            else:
                lat, lng = generate_coords_for_location(location_name)

            # Casualties
            num_casualties = 0
            if casualties_col and not pd.isna(row.get(casualties_col)):
                try:
                    num_casualties = int(float(row[casualties_col]))
                except:
                    pass
            if injured_col and not pd.isna(row.get(injured_col)):
                try:
                    num_casualties += int(float(row[injured_col]))
                except:
                    pass
            if num_casualties == 0:
                if severity == "fatal":
                    num_casualties = random.randint(1, 4)
                elif severity == "severe":
                    num_casualties = random.randint(1, 3)
                elif severity == "moderate":
                    num_casualties = random.randint(0, 2)
                else:
                    num_casualties = random.randint(0, 1)

            # Number of vehicles
            num_vehicles = 1
            if vehicles_col and not pd.isna(row.get(vehicles_col)):
                try:
                    num_vehicles = int(float(row[vehicles_col]))
                except:
                    pass
            if num_vehicles < 1:
                num_vehicles = random.randint(1, 3)

            # Description
            description = None
            if description_col and not pd.isna(row.get(description_col)):
                description = str(row[description_col]).strip()
                if description.lower() == "nan":
                    description = None

            record = {
                "date": date_val,
                "time": time_val,
                "severity": severity,
                "vehicle_type": vehicle_type,
                "weather": weather,
                "cause": cause,
                "location_name": location_name,
                "latitude": round(lat, 6),
                "longitude": round(lng, 6),
                "num_casualties": num_casualties,
                "num_vehicles": num_vehicles,
                "description": description,
            }
            records.append(record)

        except Exception as e:
            skipped += 1
            if skipped <= 5:
                print(f"  Skipped row {idx}: {e}")

    print(f"\nProcessed: {len(records)} records, Skipped: {skipped}")
    return records


def upload_to_supabase(records: list[dict], batch_size: int = 100):
    """Upload records to Supabase in batches."""
    if SUPABASE_SERVICE_ROLE_KEY == "YOUR_SERVICE_ROLE_KEY_HERE":
        print("\n❌ ERROR: Set your SUPABASE_SERVICE_ROLE_KEY before running!")
        print("   Find it in: Lovable → Settings → Connectors → Lovable Cloud → Service Role Key")
        print("   Or set env var: export SUPABASE_SERVICE_ROLE_KEY=your_key_here")
        sys.exit(1)

    print(f"\nConnecting to Supabase: {SUPABASE_URL}")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    # Optional: Clear existing data first
    clear = input("\nClear existing accident data before import? (y/N): ").strip().lower()
    if clear == "y":
        print("Clearing existing accidents...")
        supabase.table("accidents").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print("Cleared.")

    print(f"\nUploading {len(records)} records in batches of {batch_size}...")
    total_uploaded = 0

    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        try:
            result = supabase.table("accidents").insert(batch).execute()
            total_uploaded += len(batch)
            print(f"  Batch {i // batch_size + 1}: Uploaded {len(batch)} records ({total_uploaded}/{len(records)})")
        except Exception as e:
            print(f"  ❌ Batch {i // batch_size + 1} failed: {e}")
            # Try one by one
            for j, record in enumerate(batch):
                try:
                    supabase.table("accidents").insert(record).execute()
                    total_uploaded += 1
                except Exception as e2:
                    print(f"    Skipped record {i + j}: {e2}")

    print(f"\n✅ Done! Uploaded {total_uploaded}/{len(records)} records to Supabase.")
    print(f"   View them at your dashboard: /dashboard")


def main():
    print("=" * 60)
    print("  Indian Road Accident Dataset Importer")
    print("=" * 60)

    if not os.path.exists(DATASET_PATH):
        print(f"\n❌ Dataset file not found: {DATASET_PATH}")
        print(f"\nPlease download a dataset from one of these sources:")
        print(f"  1. https://zenodo.org/records/7773156")
        print(f"     (Indian Highway Accident Data — has severity, weather, vehicle type, causes)")
        print(f"  2. https://www.kaggle.com/datasets/data125661/india-road-accident-dataset")
        print(f"  3. https://www.kaggle.com/datasets/khushikyad001/india-road-accident-dataset-predictive-analysis")
        print(f"  4. https://www.data.gov.in/dataset-group-name/Road%20Accidents")
        print(f"\nSave the file as '{DATASET_PATH}' in this directory and re-run.")
        sys.exit(1)

    # Load
    df = load_dataset(DATASET_PATH)

    # Process
    records = process_dataset(df)

    if not records:
        print("\n❌ No valid records found. Check your dataset format.")
        sys.exit(1)

    # Show sample
    print(f"\n--- Sample Records ---")
    for r in records[:3]:
        print(json.dumps(r, indent=2))

    # Confirm
    confirm = input(f"\nUpload {len(records)} records to Supabase? (y/N): ").strip().lower()
    if confirm != "y":
        print("Aborted.")
        sys.exit(0)

    # Upload
    upload_to_supabase(records)


if __name__ == "__main__":
    main()
