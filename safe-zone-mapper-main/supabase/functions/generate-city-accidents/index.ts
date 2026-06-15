// v2 - Extended to 200+ cities across all Indian states
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CITIES = [
  // South India
  { name: "Kochi, Kerala", lat: 9.9312, lng: 76.2673, weight: 30 },
  { name: "Thiruvananthapuram, Kerala", lat: 8.5241, lng: 76.9366, weight: 25 },
  { name: "Kozhikode, Kerala", lat: 11.2588, lng: 75.7804, weight: 20 },
  { name: "Thrissur, Kerala", lat: 10.5276, lng: 76.2144, weight: 15 },
  { name: "Salem, Tamil Nadu", lat: 11.6643, lng: 78.146, weight: 20 },
  { name: "Tiruchirappalli, Tamil Nadu", lat: 10.7905, lng: 78.7047, weight: 20 },
  { name: "Tirunelveli, Tamil Nadu", lat: 8.7139, lng: 77.7567, weight: 15 },
  { name: "Erode, Tamil Nadu", lat: 11.341, lng: 77.7172, weight: 15 },
  { name: "Tiruppur, Tamil Nadu", lat: 11.1085, lng: 77.3411, weight: 15 },
  { name: "Vellore, Tamil Nadu", lat: 12.9165, lng: 79.1325, weight: 15 },
  { name: "Hubli-Dharwad, Karnataka", lat: 15.3647, lng: 75.124, weight: 20 },
  { name: "Belgaum, Karnataka", lat: 15.8497, lng: 74.4977, weight: 15 },
  { name: "Gulbarga, Karnataka", lat: 17.3297, lng: 76.8343, weight: 15 },
  { name: "Davangere, Karnataka", lat: 14.4644, lng: 75.9218, weight: 12 },
  { name: "Bellary, Karnataka", lat: 15.1394, lng: 76.9214, weight: 12 },
  { name: "Guntur, Andhra Pradesh", lat: 16.3067, lng: 80.4365, weight: 20 },
  { name: "Nellore, Andhra Pradesh", lat: 14.4426, lng: 79.9865, weight: 15 },
  { name: "Kurnool, Andhra Pradesh", lat: 15.8281, lng: 78.0373, weight: 15 },
  { name: "Rajahmundry, Andhra Pradesh", lat: 17.0005, lng: 81.8040, weight: 15 },
  { name: "Warangal, Telangana", lat: 17.9784, lng: 79.5941, weight: 18 },
  { name: "Karimnagar, Telangana", lat: 18.4386, lng: 79.1288, weight: 12 },

  // West India
  { name: "Rajkot, Gujarat", lat: 22.3039, lng: 70.8022, weight: 25 },
  { name: "Bhavnagar, Gujarat", lat: 21.7645, lng: 72.1519, weight: 15 },
  { name: "Jamnagar, Gujarat", lat: 22.4707, lng: 70.0577, weight: 15 },
  { name: "Gandhinagar, Gujarat", lat: 23.2156, lng: 72.6369, weight: 12 },
  { name: "Nashik, Maharashtra", lat: 19.9975, lng: 73.7898, weight: 25 },
  { name: "Aurangabad, Maharashtra", lat: 19.8762, lng: 75.3433, weight: 22 },
  { name: "Solapur, Maharashtra", lat: 17.6599, lng: 75.9064, weight: 18 },
  { name: "Kolhapur, Maharashtra", lat: 16.705, lng: 74.2433, weight: 18 },
  { name: "Nanded, Maharashtra", lat: 19.1383, lng: 77.321, weight: 15 },
  { name: "Sangli, Maharashtra", lat: 16.8524, lng: 74.5815, weight: 12 },
  { name: "Latur, Maharashtra", lat: 18.4088, lng: 76.5604, weight: 12 },
  { name: "Thane, Maharashtra", lat: 19.2183, lng: 72.9781, weight: 30 },
  { name: "Navi Mumbai, Maharashtra", lat: 19.033, lng: 73.0297, weight: 28 },

  // North India
  { name: "Agra, Uttar Pradesh", lat: 27.1767, lng: 78.0081, weight: 30 },
  { name: "Allahabad, Uttar Pradesh", lat: 25.4358, lng: 81.8463, weight: 25 },
  { name: "Meerut, Uttar Pradesh", lat: 28.9845, lng: 77.7064, weight: 25 },
  { name: "Ghaziabad, Uttar Pradesh", lat: 28.6692, lng: 77.4538, weight: 28 },
  { name: "Noida, Uttar Pradesh", lat: 28.5355, lng: 77.391, weight: 25 },
  { name: "Bareilly, Uttar Pradesh", lat: 28.367, lng: 79.4304, weight: 20 },
  { name: "Moradabad, Uttar Pradesh", lat: 28.8386, lng: 78.7733, weight: 18 },
  { name: "Aligarh, Uttar Pradesh", lat: 27.8974, lng: 78.088, weight: 18 },
  { name: "Gorakhpur, Uttar Pradesh", lat: 26.7606, lng: 83.3732, weight: 20 },
  { name: "Mathura, Uttar Pradesh", lat: 27.4924, lng: 77.6737, weight: 15 },
  { name: "Jhansi, Uttar Pradesh", lat: 25.4484, lng: 78.5685, weight: 15 },
  { name: "Firozabad, Uttar Pradesh", lat: 27.1591, lng: 78.3957, weight: 12 },
  { name: "Faridabad, Haryana", lat: 28.4089, lng: 77.3178, weight: 25 },
  { name: "Gurgaon, Haryana", lat: 28.4595, lng: 77.0266, weight: 28 },
  { name: "Karnal, Haryana", lat: 29.6857, lng: 76.9905, weight: 15 },
  { name: "Rohtak, Haryana", lat: 28.8955, lng: 76.6066, weight: 15 },
  { name: "Panipat, Haryana", lat: 29.3909, lng: 76.9635, weight: 15 },
  { name: "Ludhiana, Punjab", lat: 30.901, lng: 75.8573, weight: 28 },
  { name: "Amritsar, Punjab", lat: 31.634, lng: 74.8723, weight: 22 },
  { name: "Jalandhar, Punjab", lat: 31.326, lng: 75.5762, weight: 20 },
  { name: "Patiala, Punjab", lat: 30.3398, lng: 76.3869, weight: 15 },
  { name: "Dehradun, Uttarakhand", lat: 30.3165, lng: 78.0322, weight: 20 },
  { name: "Haridwar, Uttarakhand", lat: 29.9457, lng: 78.1642, weight: 15 },
  { name: "Jammu, Jammu & Kashmir", lat: 32.7266, lng: 74.857, weight: 18 },
  { name: "Shimla, Himachal Pradesh", lat: 31.1048, lng: 77.1734, weight: 12 },

  // Central India  
  { name: "Indore, Madhya Pradesh", lat: 22.7196, lng: 75.8577, weight: 30 },
  { name: "Bhopal, Madhya Pradesh", lat: 23.2599, lng: 77.4126, weight: 28 },
  { name: "Jabalpur, Madhya Pradesh", lat: 23.1815, lng: 79.9864, weight: 22 },
  { name: "Gwalior, Madhya Pradesh", lat: 26.2183, lng: 78.1828, weight: 20 },
  { name: "Ujjain, Madhya Pradesh", lat: 23.1765, lng: 75.7885, weight: 15 },
  { name: "Raipur, Chhattisgarh", lat: 21.2514, lng: 81.6296, weight: 22 },
  { name: "Bilaspur, Chhattisgarh", lat: 22.0796, lng: 82.1391, weight: 15 },

  // East India
  { name: "Patna, Bihar", lat: 25.6093, lng: 85.1376, weight: 30 },
  { name: "Gaya, Bihar", lat: 24.7955, lng: 84.9994, weight: 18 },
  { name: "Muzaffarpur, Bihar", lat: 26.1225, lng: 85.3906, weight: 15 },
  { name: "Ranchi, Jharkhand", lat: 23.3441, lng: 85.3096, weight: 22 },
  { name: "Jamshedpur, Jharkhand", lat: 22.8046, lng: 86.2029, weight: 20 },
  { name: "Dhanbad, Jharkhand", lat: 23.7957, lng: 86.4304, weight: 18 },
  { name: "Bokaro, Jharkhand", lat: 23.6693, lng: 86.1511, weight: 12 },
  { name: "Bhubaneswar, Odisha", lat: 20.2961, lng: 85.8245, weight: 22 },
  { name: "Cuttack, Odisha", lat: 20.4625, lng: 85.883, weight: 18 },
  { name: "Howrah, West Bengal", lat: 22.5958, lng: 88.2636, weight: 22 },
  { name: "Asansol, West Bengal", lat: 23.6739, lng: 86.9524, weight: 18 },

  // Northeast
  { name: "Guwahati, Assam", lat: 26.1445, lng: 91.7362, weight: 22 },
  { name: "Imphal, Manipur", lat: 24.817, lng: 93.9368, weight: 10 },
  { name: "Shillong, Meghalaya", lat: 25.5788, lng: 91.8933, weight: 10 },
  { name: "Agartala, Tripura", lat: 23.8315, lng: 91.2868, weight: 10 },
  { name: "Aizawl, Mizoram", lat: 23.7271, lng: 92.7176, weight: 8 },
  { name: "Dimapur, Nagaland", lat: 25.9065, lng: 93.7272, weight: 8 },
  { name: "Gangtok, Sikkim", lat: 27.3389, lng: 88.6065, weight: 6 },
  { name: "Itanagar, Arunachal Pradesh", lat: 27.0844, lng: 93.6053, weight: 6 },

  // Rajasthan
  { name: "Kota, Rajasthan", lat: 25.2138, lng: 75.8648, weight: 20 },
  { name: "Ajmer, Rajasthan", lat: 26.4499, lng: 74.6399, weight: 18 },
  { name: "Bikaner, Rajasthan", lat: 28.0229, lng: 73.3119, weight: 15 },
  { name: "Alwar, Rajasthan", lat: 27.5530, lng: 76.6346, weight: 12 },

  // Others
  { name: "Panaji, Goa", lat: 15.4909, lng: 73.8278, weight: 12 },
  { name: "Margao, Goa", lat: 15.2832, lng: 73.9862, weight: 10 },

  // Additional cities - Uttar Pradesh
  { name: "Saharanpur, Uttar Pradesh", lat: 29.9680, lng: 77.5510, weight: 15 },
  { name: "Muzaffarnagar, Uttar Pradesh", lat: 29.4727, lng: 77.7085, weight: 12 },
  { name: "Etawah, Uttar Pradesh", lat: 26.7855, lng: 79.0158, weight: 10 },
  { name: "Rampur, Uttar Pradesh", lat: 28.7930, lng: 79.0266, weight: 12 },
  { name: "Shahjahanpur, Uttar Pradesh", lat: 27.8836, lng: 79.9108, weight: 10 },
  { name: "Unnao, Uttar Pradesh", lat: 26.5479, lng: 80.4879, weight: 8 },
  { name: "Rae Bareli, Uttar Pradesh", lat: 26.2179, lng: 81.2404, weight: 8 },
  { name: "Sultanpur, Uttar Pradesh", lat: 26.2648, lng: 82.0727, weight: 8 },
  { name: "Ayodhya, Uttar Pradesh", lat: 26.7922, lng: 82.1998, weight: 10 },
  { name: "Mirzapur, Uttar Pradesh", lat: 25.1337, lng: 82.5650, weight: 8 },

  // Additional cities - Maharashtra
  { name: "Amravati, Maharashtra", lat: 20.9374, lng: 77.7796, weight: 15 },
  { name: "Akola, Maharashtra", lat: 20.7002, lng: 77.0082, weight: 12 },
  { name: "Jalgaon, Maharashtra", lat: 21.0077, lng: 75.5626, weight: 12 },
  { name: "Dhule, Maharashtra", lat: 20.9042, lng: 74.7749, weight: 10 },
  { name: "Parbhani, Maharashtra", lat: 19.2636, lng: 76.7715, weight: 10 },
  { name: "Chandrapur, Maharashtra", lat: 19.9709, lng: 79.2962, weight: 10 },
  { name: "Satara, Maharashtra", lat: 17.6805, lng: 74.0183, weight: 10 },
  { name: "Ratnagiri, Maharashtra", lat: 16.9902, lng: 73.3120, weight: 8 },

  // Additional cities - Tamil Nadu
  { name: "Thanjavur, Tamil Nadu", lat: 10.7870, lng: 79.1378, weight: 12 },
  { name: "Dindigul, Tamil Nadu", lat: 10.3624, lng: 77.9695, weight: 10 },
  { name: "Cuddalore, Tamil Nadu", lat: 11.7564, lng: 79.7613, weight: 10 },
  { name: "Nagercoil, Tamil Nadu", lat: 8.1833, lng: 77.4119, weight: 10 },
  { name: "Karur, Tamil Nadu", lat: 10.9601, lng: 78.0766, weight: 8 },
  { name: "Hosur, Tamil Nadu", lat: 12.7409, lng: 77.8253, weight: 10 },
  { name: "Kanchipuram, Tamil Nadu", lat: 12.8185, lng: 79.6947, weight: 10 },

  // Additional cities - Karnataka
  { name: "Shimoga, Karnataka", lat: 13.9299, lng: 75.5681, weight: 12 },
  { name: "Tumkur, Karnataka", lat: 13.3379, lng: 77.1173, weight: 10 },
  { name: "Raichur, Karnataka", lat: 16.2120, lng: 77.3439, weight: 10 },
  { name: "Bijapur, Karnataka", lat: 16.8302, lng: 75.7100, weight: 10 },
  { name: "Hassan, Karnataka", lat: 13.0068, lng: 76.0996, weight: 8 },
  { name: "Mandya, Karnataka", lat: 12.5244, lng: 76.8958, weight: 8 },

  // Additional cities - Gujarat
  { name: "Junagadh, Gujarat", lat: 21.5222, lng: 70.4579, weight: 12 },
  { name: "Anand, Gujarat", lat: 22.5645, lng: 72.9289, weight: 10 },
  { name: "Navsari, Gujarat", lat: 20.9467, lng: 72.9520, weight: 8 },
  { name: "Porbandar, Gujarat", lat: 21.6417, lng: 69.6293, weight: 8 },
  { name: "Morbi, Gujarat", lat: 22.8173, lng: 70.8370, weight: 8 },
  { name: "Mehsana, Gujarat", lat: 23.5880, lng: 72.3693, weight: 8 },
  { name: "Bharuch, Gujarat", lat: 21.6947, lng: 73.0024, weight: 8 },

  // Additional cities - Rajasthan
  { name: "Sikar, Rajasthan", lat: 27.6094, lng: 75.1399, weight: 10 },
  { name: "Bhilwara, Rajasthan", lat: 25.3407, lng: 74.6313, weight: 10 },
  { name: "Pali, Rajasthan", lat: 25.7711, lng: 73.3234, weight: 8 },
  { name: "Tonk, Rajasthan", lat: 26.1662, lng: 75.7876, weight: 8 },
  { name: "Sri Ganganagar, Rajasthan", lat: 29.9038, lng: 73.8772, weight: 10 },
  { name: "Chittorgarh, Rajasthan", lat: 24.8887, lng: 74.6269, weight: 8 },

  // Additional cities - Madhya Pradesh
  { name: "Sagar, Madhya Pradesh", lat: 23.8388, lng: 78.7378, weight: 12 },
  { name: "Satna, Madhya Pradesh", lat: 24.5800, lng: 80.8322, weight: 10 },
  { name: "Rewa, Madhya Pradesh", lat: 24.5365, lng: 81.2963, weight: 10 },
  { name: "Dewas, Madhya Pradesh", lat: 22.9623, lng: 76.0508, weight: 8 },
  { name: "Ratlam, Madhya Pradesh", lat: 23.3315, lng: 75.0367, weight: 8 },

  // Additional cities - Bihar
  { name: "Bhagalpur, Bihar", lat: 25.2425, lng: 86.9842, weight: 15 },
  { name: "Darbhanga, Bihar", lat: 26.1542, lng: 85.8918, weight: 12 },
  { name: "Arrah, Bihar", lat: 25.5541, lng: 84.6681, weight: 10 },
  { name: "Begusarai, Bihar", lat: 25.4182, lng: 86.1272, weight: 10 },
  { name: "Purnia, Bihar", lat: 25.7771, lng: 87.4753, weight: 10 },
  { name: "Chapra, Bihar", lat: 25.7848, lng: 84.7439, weight: 8 },

  // Additional cities - West Bengal
  { name: "Kharagpur, West Bengal", lat: 22.3460, lng: 87.3119, weight: 12 },
  { name: "Burdwan, West Bengal", lat: 23.2324, lng: 87.8615, weight: 12 },
  { name: "Haldia, West Bengal", lat: 22.0667, lng: 88.0698, weight: 10 },
  { name: "Malda, West Bengal", lat: 25.0108, lng: 88.1411, weight: 10 },
  { name: "Baharampur, West Bengal", lat: 24.1000, lng: 88.2500, weight: 8 },

  // Additional cities - Andhra Pradesh
  { name: "Anantapur, Andhra Pradesh", lat: 14.6819, lng: 77.6006, weight: 12 },
  { name: "Kakinada, Andhra Pradesh", lat: 16.9891, lng: 82.2475, weight: 12 },
  { name: "Ongole, Andhra Pradesh", lat: 15.5057, lng: 80.0499, weight: 10 },
  { name: "Eluru, Andhra Pradesh", lat: 16.7107, lng: 81.0952, weight: 10 },
  { name: "Srikakulam, Andhra Pradesh", lat: 18.2949, lng: 83.8938, weight: 8 },
  { name: "Kadapa, Andhra Pradesh", lat: 14.4674, lng: 78.8241, weight: 10 },
  { name: "Chittoor, Andhra Pradesh", lat: 13.2172, lng: 79.1003, weight: 8 },

  // Additional cities - Telangana
  { name: "Nizamabad, Telangana", lat: 18.6725, lng: 78.0941, weight: 12 },
  { name: "Khammam, Telangana", lat: 17.2473, lng: 80.1514, weight: 10 },
  { name: "Mahbubnagar, Telangana", lat: 16.7488, lng: 77.9855, weight: 10 },
  { name: "Adilabad, Telangana", lat: 19.6641, lng: 78.5320, weight: 8 },
  { name: "Nalgonda, Telangana", lat: 17.0500, lng: 79.2667, weight: 8 },

  // Additional cities - Kerala
  { name: "Kollam, Kerala", lat: 8.8932, lng: 76.6141, weight: 12 },
  { name: "Alappuzha, Kerala", lat: 9.4981, lng: 76.3388, weight: 10 },
  { name: "Palakkad, Kerala", lat: 10.7867, lng: 76.6548, weight: 10 },
  { name: "Kannur, Kerala", lat: 11.8745, lng: 75.3704, weight: 10 },
  { name: "Kasaragod, Kerala", lat: 12.4996, lng: 74.9869, weight: 8 },
  { name: "Malappuram, Kerala", lat: 11.0510, lng: 76.0711, weight: 10 },

  // Additional cities - Odisha
  { name: "Rourkela, Odisha", lat: 22.2604, lng: 84.8536, weight: 15 },
  { name: "Berhampur, Odisha", lat: 19.3149, lng: 84.7941, weight: 12 },
  { name: "Sambalpur, Odisha", lat: 21.4669, lng: 83.9756, weight: 10 },
  { name: "Balasore, Odisha", lat: 21.4934, lng: 86.9337, weight: 10 },
  { name: "Puri, Odisha", lat: 19.8135, lng: 85.8312, weight: 8 },

  // Additional cities - Assam
  { name: "Silchar, Assam", lat: 24.8333, lng: 92.7789, weight: 10 },
  { name: "Dibrugarh, Assam", lat: 27.4728, lng: 94.9120, weight: 10 },
  { name: "Nagaon, Assam", lat: 26.3500, lng: 92.6833, weight: 8 },
  { name: "Jorhat, Assam", lat: 26.7509, lng: 94.2037, weight: 8 },
  { name: "Tinsukia, Assam", lat: 27.4922, lng: 95.3547, weight: 8 },
  { name: "Tezpur, Assam", lat: 26.6338, lng: 92.7926, weight: 8 },

  // Additional cities - Punjab
  { name: "Bathinda, Punjab", lat: 30.2110, lng: 74.9455, weight: 12 },
  { name: "Pathankot, Punjab", lat: 32.2746, lng: 75.6421, weight: 10 },
  { name: "Hoshiarpur, Punjab", lat: 31.5143, lng: 75.9115, weight: 10 },
  { name: "Moga, Punjab", lat: 30.8020, lng: 75.1700, weight: 8 },
  { name: "Firozpur, Punjab", lat: 30.9295, lng: 74.6239, weight: 8 },

  // Additional cities - Haryana
  { name: "Hisar, Haryana", lat: 29.1492, lng: 75.7217, weight: 15 },
  { name: "Ambala, Haryana", lat: 30.3782, lng: 76.7767, weight: 12 },
  { name: "Yamuna Nagar, Haryana", lat: 30.1290, lng: 77.2874, weight: 10 },
  { name: "Sonipat, Haryana", lat: 28.9931, lng: 77.0151, weight: 12 },
  { name: "Bhiwani, Haryana", lat: 28.7881, lng: 76.1322, weight: 10 },
  { name: "Sirsa, Haryana", lat: 29.5339, lng: 75.0285, weight: 8 },

  // Additional cities - Chhattisgarh
  { name: "Durg, Chhattisgarh", lat: 21.1904, lng: 81.2849, weight: 12 },
  { name: "Bhilai, Chhattisgarh", lat: 21.2093, lng: 81.3787, weight: 15 },
  { name: "Korba, Chhattisgarh", lat: 22.3595, lng: 82.7501, weight: 10 },
  { name: "Rajnandgaon, Chhattisgarh", lat: 21.0966, lng: 81.0319, weight: 8 },

  // Additional cities - Jharkhand
  { name: "Hazaribagh, Jharkhand", lat: 23.9925, lng: 85.3637, weight: 10 },
  { name: "Deoghar, Jharkhand", lat: 24.4764, lng: 86.6942, weight: 10 },
  { name: "Giridih, Jharkhand", lat: 24.1854, lng: 86.3006, weight: 8 },

  // Additional cities - Uttarakhand
  { name: "Haldwani, Uttarakhand", lat: 29.2183, lng: 79.5130, weight: 12 },
  { name: "Roorkee, Uttarakhand", lat: 29.8543, lng: 77.8880, weight: 10 },
  { name: "Rudrapur, Uttarakhand", lat: 28.9740, lng: 79.4040, weight: 10 },
  { name: "Rishikesh, Uttarakhand", lat: 30.0869, lng: 78.2676, weight: 8 },
  { name: "Kashipur, Uttarakhand", lat: 29.2104, lng: 78.9612, weight: 8 },
];

const SEVERITIES = ['minor', 'moderate', 'severe', 'fatal'];
const VEHICLE_TYPES = ['Car', 'Motorcycle', 'Two Wheeler', 'Auto Rickshaw', 'Bus', 'Truck', 'Bicycle', 'Pedestrian'];
const CAUSES = ['Speeding', 'Drunk Driving', 'Distracted Driving', 'Red Light Violation', 'Wrong Way', 'Poor Road Condition', 'Mechanical Failure', 'Overloading', 'Overtaking', 'Weather Conditions'];
const WEATHERS = ['Clear', 'Rain', 'Fog', 'Wind'];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateAccident(city: typeof CITIES[0]) {
  const date = new Date(2024, Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28));
  const hour = Math.floor(Math.random() * 24);
  const minute = Math.floor(Math.random() * 60);

  const sevWeights = [0.4, 0.3, 0.2, 0.1];
  const r = Math.random();
  let sevIdx = 0;
  let cumulative = 0;
  for (let i = 0; i < sevWeights.length; i++) {
    cumulative += sevWeights[i];
    if (r < cumulative) { sevIdx = i; break; }
  }

  return {
    latitude: city.lat + (Math.random() - 0.5) * 0.06,
    longitude: city.lng + (Math.random() - 0.5) * 0.06,
    location_name: city.name,
    date: date.toISOString().split('T')[0],
    time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    severity: SEVERITIES[sevIdx],
    vehicle_type: randomElement(VEHICLE_TYPES),
    cause: randomElement(CAUSES),
    weather: randomElement(WEATHERS),
    num_casualties: sevIdx >= 2 ? 1 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 2),
    num_vehicles: 1 + Math.floor(Math.random() * 3),
    description: `Road accident reported near ${city.name}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { batch_start = 0, batch_size = 10 } = await req.json().catch(() => ({}));
    const batch = CITIES.slice(batch_start, batch_start + batch_size);

    if (batch.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'All cities done', total: CITIES.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalInserted = 0;

    for (const city of batch) {
      const count = city.weight;
      const records = Array.from({ length: count }, () => generateAccident(city));

      // Insert in chunks of 50
      for (let i = 0; i < records.length; i += 50) {
        const chunk = records.slice(i, i + 50);
        const res = await fetch(`${supabaseUrl}/rest/v1/accidents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(chunk),
        });

        if (res.ok) {
          totalInserted += chunk.length;
        } else {
          console.error(`Failed inserting for ${city.name}: ${await res.text()}`);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      inserted: totalInserted,
      cities_processed: batch.map(c => c.name),
      next_batch: batch_start + batch_size < CITIES.length ? batch_start + batch_size : null,
      total_cities: CITIES.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
