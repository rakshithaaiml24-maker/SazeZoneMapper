import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, Car, Eye, Phone, Heart, CloudRain, Moon, Users, Bike, Truck, Footprints, BookOpen, CheckCircle, XCircle, Award, ChevronRight, Scale, Construction, Siren, Info, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ===== SAFETY TIPS =====
const tips = [
  { icon: Car, title: 'Always Wear Seatbelts', desc: 'Seatbelts reduce the risk of fatal injury by 45% for front-seat passengers and 60% for rear-seat passengers. In India, not wearing a seatbelt attracts a ₹1,000 fine.', category: 'Vehicle Safety' },
  { icon: Bike, title: 'Helmet for Two-Wheelers', desc: 'Wearing a helmet reduces the risk of head injury by 69% and death by 42%. Both rider and pillion must wear ISI-certified helmets (IS 4151). Fine: ₹1,000 + 3-month license suspension.', category: 'Two-Wheeler Safety' },
  { icon: Eye, title: 'Avoid Distracted Driving', desc: 'Using a mobile phone while driving increases accident risk by 4x. Fine: ₹1,000-₹5,000. Pull over to use your phone. Hands-free devices are also risky.', category: 'Driver Safety' },
  { icon: Moon, title: 'Extra Caution at Night', desc: '60% of fatal accidents occur between 6PM-6AM despite lower traffic. Use high-beam on open roads, dip for oncoming traffic. Watch for pedestrians and animals.', category: 'Night Safety' },
  { icon: CloudRain, title: 'Driving in Rain & Fog', desc: 'Reduce speed by 30%, increase following distance to 6 seconds. Use headlights (not hazard lights) while moving. Aquaplaning starts at 60 km/h on wet roads.', category: 'Weather Safety' },
  { icon: AlertTriangle, title: 'Never Drink & Drive', desc: 'Legal BAC limit in India: 0.03%. Alcohol is a factor in 4.5% of reported crashes but estimated 40% of fatal ones. Fine: ₹10,000 and/or 6 months imprisonment.', category: 'Impairment' },
  { icon: Users, title: 'Protect Pedestrians', desc: 'Pedestrians account for 22% of road deaths in India. Always stop at zebra crossings. Speed limit near schools: 25 km/h. Watch for children and elderly.', category: 'Pedestrian Safety' },
  { icon: Truck, title: 'Truck & Bus Blind Spots', desc: 'Heavy vehicles have 4 major blind spots. Never overtake from the left. Maintain 3-second gap. 15% of fatalities involve trucks.', category: 'Heavy Vehicle Safety' },
  { icon: Footprints, title: 'Pedestrian Rules', desc: 'Always use sidewalks and designated crosswalks. Make eye contact with drivers. Wear reflective clothing at night. Walk facing traffic on roads without sidewalks.', category: 'Pedestrian Safety' },
  { icon: Heart, title: 'Basic First Aid at Scenes', desc: 'Call 112 immediately. Don\'t move the injured (spinal risk). Apply pressure on bleeding. Keep the person warm and conscious. You\'re protected by Good Samaritan Law.', category: 'Emergency' },
  { icon: Shield, title: 'Child Safety in Cars', desc: 'Children under 12 must sit in rear seats. Use age-appropriate child restraints. Never leave children unattended in vehicles, especially in Indian summers (60°C inside).', category: 'Child Safety' },
  { icon: Construction, title: 'Construction Zone Safety', desc: 'Reduce speed to 30 km/h in construction zones. Follow diversion signs. Be alert for workers and machinery. Many Indian highways have ongoing expansion work.', category: 'Infrastructure' },
];

// ===== TRAFFIC RULES & FINES =====
const trafficFines = [
  { violation: 'Driving without license', fine: '₹5,000', section: 'Sec 181 MVA' },
  { violation: 'Driving without insurance', fine: '₹2,000 / ₹4,000', section: 'Sec 196 MVA' },
  { violation: 'Over-speeding', fine: '₹1,000 - ₹2,000', section: 'Sec 183 MVA' },
  { violation: 'Drunk driving', fine: '₹10,000 / 6 months jail', section: 'Sec 185 MVA' },
  { violation: 'Not wearing seatbelt', fine: '₹1,000', section: 'Sec 194B MVA' },
  { violation: 'Not wearing helmet', fine: '₹1,000 + 3-month suspension', section: 'Sec 194D MVA' },
  { violation: 'Using mobile while driving', fine: '₹1,000 - ₹5,000', section: 'Sec 184 MVA' },
  { violation: 'Signal violation / red light', fine: '₹1,000 - ₹5,000', section: 'Sec 184 MVA' },
  { violation: 'Dangerous driving', fine: '₹1,000 - ₹5,000 / 6 months-1 year jail', section: 'Sec 184 MVA' },
  { violation: 'Driving underage', fine: '₹25,000 + 3-year jail for guardian', section: 'Sec 199A MVA' },
  { violation: 'No PUC certificate', fine: '₹10,000', section: 'Sec 190(2) MVA' },
  { violation: 'Overloading (passengers)', fine: '₹1,000 per extra person', section: 'Sec 194A MVA' },
  { violation: 'Not giving way to emergency vehicles', fine: '₹10,000', section: 'Sec 194E MVA' },
  { violation: 'Hit and run', fine: '₹2,00,000 + 6 months jail (if death)', section: 'Sec 161 MVA' },
];

// ===== QUIZ =====
const quizQuestions = [
  { q: 'What is the legal Blood Alcohol Content (BAC) limit for driving in India?', options: ['0.08%', '0.05%', '0.03%', '0.00%'], answer: 2, explain: 'In India, the legal BAC limit is 0.03% (30 mg per 100 ml of blood), one of the strictest in the world.' },
  { q: 'What is the minimum fine for drunk driving under the amended Motor Vehicles Act?', options: ['₹2,000', '₹5,000', '₹10,000', '₹15,000'], answer: 2, explain: 'Under Section 185 of the amended MVA, first-time drunk driving offense carries ₹10,000 fine and/or 6 months imprisonment.' },
  { q: 'What percentage of road fatalities in India involve two-wheelers?', options: ['25%', '33%', '44.5%', '55%'], answer: 2, explain: 'Two-wheelers account for 44.5% of all road fatalities in India (MoRTH 2021 data), making them the most vulnerable road user category.' },
  { q: 'What is the speed limit near schools in urban areas?', options: ['15 km/h', '25 km/h', '30 km/h', '40 km/h'], answer: 1, explain: 'The speed limit near schools is 25 km/h to protect children. Many states are implementing school zone speed cameras.' },
  { q: 'Which Indian state has the highest number of road accidents?', options: ['Maharashtra', 'Tamil Nadu', 'Uttar Pradesh', 'Karnataka'], answer: 1, explain: 'Tamil Nadu consistently reports the highest number of road accidents, followed by Madhya Pradesh and Uttar Pradesh (NCRB data).' },
  { q: 'What is the Good Samaritan Law in India?', options: ['Mandatory helmet law', 'Protection for bystanders who help accident victims', 'Speed limit regulation', 'Insurance requirement'], answer: 1, explain: 'The Good Samaritan Law (Motor Vehicles Amendment Act, 2019) protects bystanders from legal liability when they help accident victims in good faith.' },
  { q: 'How many people die in road accidents daily in India?', options: ['150', '250', '422', '550'], answer: 2, explain: 'Approximately 422 people die every day in road accidents in India — that\'s about 1.54 lakh deaths per year (MoRTH 2021).' },
  { q: 'What is the penalty for driving without a valid license?', options: ['₹500', '₹1,000', '₹2,000', '₹5,000'], answer: 3, explain: 'Under Section 181 of the amended MVA, driving without a valid license carries a fine of ₹5,000.' },
];

// ===== INDIA ROAD STATS =====
const indiaStats = [
  { label: 'Annual road deaths', value: '1,53,972', sub: '(2021 MoRTH data)' },
  { label: 'Deaths per day', value: '422', sub: 'Average' },
  { label: 'Accidents per day', value: '1,210', sub: '4,41,661 total in 2021' },
  { label: 'Two-wheeler fatalities', value: '44.5%', sub: 'of all road deaths' },
  { label: 'Speeding-related', value: '69.3%', sub: 'of total accidents' },
  { label: 'Night accidents (6PM-6AM)', value: '60%', sub: 'of fatal crashes' },
  { label: 'Economic loss', value: '3-5% GDP', sub: '~₹3.6 lakh crore/year' },
  { label: 'Male fatalities', value: '85.2%', sub: 'of road deaths' },
];

export default function SafetyTips() {
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  function handleQuizAnswer(idx: number) {
    setSelectedAnswer(idx);
    setShowExplanation(true);
    if (idx === quizQuestions[quizIdx].answer) {
      setQuizScore(s => s + 1);
    }
  }

  function nextQuestion() {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setQuizIdx(i => i + 1);
  }

  function resetQuiz() {
    setQuizStarted(false);
    setQuizIdx(0);
    setQuizScore(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Road Safety Guide — India</h1>
        <p className="text-muted-foreground mt-1">Life-saving tips, traffic laws, emergency info, and road safety quiz for every Indian citizen</p>
      </div>

      {/* India stats banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {indiaStats.slice(0, 4).map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card text-center">
            <p className="font-display text-2xl font-bold text-destructive">{s.value}</p>
            <p className="text-xs text-foreground font-medium mt-1">{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tips" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="tips">Safety Tips</TabsTrigger>
          <TabsTrigger value="laws">Traffic Laws</TabsTrigger>
          <TabsTrigger value="quiz">Safety Quiz</TabsTrigger>
          <TabsTrigger value="stats">India Data</TabsTrigger>
        </TabsList>

        {/* SAFETY TIPS TAB */}
        <TabsContent value="tips" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tips.map((tip, i) => {
              const Icon = tip.icon;
              return (
                <motion.div key={tip.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="stat-card hover:ring-2 ring-primary/20 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <span className="text-xs text-primary font-medium">{tip.category}</span>
                      <h3 className="font-display font-semibold text-foreground mt-0.5">{tip.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{tip.desc}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Emergency contacts */}
          <div className="stat-card border-l-4 border-l-destructive">
            <h3 className="font-display font-semibold text-foreground mb-2 flex items-center gap-2"><Phone className="w-5 h-5 text-destructive" /> National Emergency Numbers</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
              {[
                { name: 'National Emergency', number: '112' },
                { name: 'Police', number: '100' },
                { name: 'Ambulance', number: '108' },
                { name: 'Fire', number: '101' },
                { name: 'Highway Helpline', number: '1033' },
              ].map(e => (
                <a key={e.number} href={`tel:${e.number}`} className="text-center bg-muted/20 rounded-lg p-3 hover:bg-muted/40 transition-colors">
                  <p className="font-display text-xl font-bold text-foreground">{e.number}</p>
                  <p className="text-xs text-muted-foreground">{e.name}</p>
                </a>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TRAFFIC LAWS TAB */}
        <TabsContent value="laws" className="space-y-4">
          <div className="stat-card">
            <h3 className="font-display font-semibold text-foreground mb-1 flex items-center gap-2"><Scale className="w-5 h-5 text-primary" /> Motor Vehicles (Amendment) Act, 2019 — Fines & Penalties</h3>
            <p className="text-xs text-muted-foreground mb-4">Updated penalties as per the 2019 amendment. Fines may vary by state.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium">Violation</th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium">Fine / Penalty</th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium">Section</th>
                  </tr>
                </thead>
                <tbody>
                  {trafficFines.map((f, i) => (
                    <tr key={f.violation} className={`border-b border-border/50 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      <td className="py-3 px-3 text-foreground font-medium">{f.violation}</td>
                      <td className="py-3 px-3 text-destructive font-semibold">{f.fine}</td>
                      <td className="py-3 px-3 text-muted-foreground text-xs">{f.section}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Good Samaritan Law */}
          <div className="stat-card border-l-4 border-l-success">
            <h3 className="font-display font-semibold text-foreground mb-2 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-success" /> Good Samaritan Law — India</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">Under the Motor Vehicles (Amendment) Act, 2019, any person who helps an accident victim in good faith is protected from civil or criminal liability. You cannot be questioned, detained, or harassed by police or hospital staff. Hospitals must provide initial treatment without demanding payment or police report. <strong className="text-foreground">Your help can save lives — don't hesitate.</strong></p>
          </div>

          {/* Key rules */}
          <div className="stat-card">
            <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2"><Info className="w-5 h-5 text-primary" /> Key Traffic Rules to Remember</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                'Always drive on the LEFT side of the road',
                'Give way to emergency vehicles (ambulance, fire)',
                'Use indicators at least 30 meters before turning',
                'Maintain safe following distance (2-second rule)',
                'Speed limits: 50 km/h in cities, 80-100 km/h on highways',
                'Minors (under 18) cannot drive any motor vehicle',
                'All vehicles must have valid insurance and PUC',
                'Overloading passengers is a criminal offense',
              ].map((rule, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">{rule}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* QUIZ TAB */}
        <TabsContent value="quiz" className="space-y-4">
          {!quizStarted ? (
            <div className="stat-card text-center py-12">
              <HelpCircle className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">Road Safety Quiz</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">Test your knowledge of Indian road safety rules, traffic laws, and accident statistics. {quizQuestions.length} questions.</p>
              <Button onClick={() => setQuizStarted(true)} size="lg"><BookOpen className="w-5 h-5 mr-2" /> Start Quiz</Button>
            </div>
          ) : quizIdx >= quizQuestions.length ? (
            <div className="stat-card text-center py-12">
              <Award className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">Quiz Complete!</h2>
              <p className="text-4xl font-display font-bold text-primary mb-2">{quizScore}/{quizQuestions.length}</p>
              <p className="text-muted-foreground mb-1">
                {quizScore === quizQuestions.length ? '🏆 Perfect! You\'re a road safety expert!' :
                 quizScore >= quizQuestions.length * 0.7 ? '🎉 Great job! You know your traffic rules well.' :
                 quizScore >= quizQuestions.length * 0.4 ? '📚 Good effort. Review the safety tips to improve!' :
                 '⚠️ Please study the safety guide and traffic laws carefully.'}
              </p>
              <Button onClick={resetQuiz} className="mt-4">Try Again</Button>
            </div>
          ) : (
            <motion.div key={quizIdx} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="stat-card max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <Badge variant="outline">Question {quizIdx + 1}/{quizQuestions.length}</Badge>
                <span className="text-sm text-muted-foreground">Score: {quizScore}</span>
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-6">{quizQuestions[quizIdx].q}</h3>
              <div className="space-y-3">
                {quizQuestions[quizIdx].options.map((opt, idx) => {
                  const isCorrect = idx === quizQuestions[quizIdx].answer;
                  const isSelected = idx === selectedAnswer;
                  let cls = 'border border-border hover:border-primary/50 hover:bg-primary/5';
                  if (showExplanation) {
                    if (isCorrect) cls = 'border-2 border-success bg-success/10';
                    else if (isSelected && !isCorrect) cls = 'border-2 border-destructive bg-destructive/10';
                    else cls = 'border border-border opacity-50';
                  }
                  return (
                    <button
                      key={idx}
                      onClick={() => !showExplanation && handleQuizAnswer(idx)}
                      disabled={showExplanation}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${cls}`}
                    >
                      <span className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center text-sm font-medium text-foreground shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-foreground text-sm">{opt}</span>
                      {showExplanation && isCorrect && <CheckCircle className="w-5 h-5 text-success ml-auto shrink-0" />}
                      {showExplanation && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-destructive ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {showExplanation && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-4 bg-muted/20 rounded-lg border border-border">
                  <p className="text-sm text-foreground leading-relaxed">{quizQuestions[quizIdx].explain}</p>
                  <Button onClick={nextQuestion} className="mt-3" size="sm">
                    {quizIdx < quizQuestions.length - 1 ? 'Next Question →' : 'See Results'}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </TabsContent>

        {/* INDIA DATA TAB */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {indiaStats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card text-center">
                <p className="font-display text-2xl font-bold text-destructive">{s.value}</p>
                <p className="text-xs text-foreground font-medium mt-1">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* State-wise data */}
          <div className="stat-card">
            <h3 className="font-display font-semibold text-foreground mb-3">Top 10 States by Road Accidents (2021)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground">#</th>
                  <th className="text-left py-2 px-3 text-muted-foreground">State</th>
                  <th className="text-left py-2 px-3 text-muted-foreground">Accidents</th>
                  <th className="text-left py-2 px-3 text-muted-foreground">Deaths</th>
                  <th className="text-left py-2 px-3 text-muted-foreground">Severity</th>
                </tr></thead>
                <tbody>
                  {[
                    { state: 'Tamil Nadu', accidents: '57,090', deaths: '14,756' },
                    { state: 'Madhya Pradesh', accidents: '51,665', deaths: '12,350' },
                    { state: 'Uttar Pradesh', accidents: '38,397', deaths: '21,792' },
                    { state: 'Karnataka', accidents: '38,291', deaths: '10,308' },
                    { state: 'Maharashtra', accidents: '29,214', deaths: '13,330' },
                    { state: 'Rajasthan', accidents: '23,621', deaths: '11,075' },
                    { state: 'Andhra Pradesh', accidents: '22,311', deaths: '8,946' },
                    { state: 'Gujarat', accidents: '18,704', deaths: '7,781' },
                    { state: 'Telangana', accidents: '19,293', deaths: '6,795' },
                    { state: 'Kerala', accidents: '39,013', deaths: '4,392' },
                  ].map((s, i) => (
                    <tr key={s.state} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                      <td className="py-2 px-3 text-foreground font-medium">{s.state}</td>
                      <td className="py-2 px-3 text-foreground">{s.accidents}</td>
                      <td className="py-2 px-3 severity-fatal font-medium">{s.deaths}</td>
                      <td className="py-2 px-3">
                        <div className="h-2 bg-muted rounded-full overflow-hidden w-20">
                          <div className="h-full rounded-full bg-destructive" style={{ width: `${(parseInt(s.deaths.replace(/,/g, '')) / 22000) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Age group data */}
          <div className="stat-card">
            <h3 className="font-display font-semibold text-foreground mb-3">Road Deaths by Age Group</h3>
            <div className="space-y-3">
              {[
                { age: '18-25 years', pct: 28, label: 'Young adults — highest risk group' },
                { age: '25-35 years', pct: 25, label: 'Working professionals' },
                { age: '35-45 years', pct: 18, label: 'Middle-aged drivers' },
                { age: '45-60 years', pct: 15, label: 'Experienced drivers' },
                { age: 'Under 18', pct: 8, label: 'Minors (often without license)' },
                { age: 'Over 60', pct: 6, label: 'Senior citizens' },
              ].map(ag => (
                <div key={ag.age} className="flex items-center gap-3">
                  <span className="text-sm text-foreground font-medium w-28 shrink-0">{ag.age}</span>
                  <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${ag.pct * 3}%` }} transition={{ delay: 0.3 }} className="h-full bg-primary rounded-full" />
                  </div>
                  <span className="text-sm font-bold text-foreground w-10">{ag.pct}%</span>
                  <span className="text-xs text-muted-foreground hidden md:inline">{ag.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Vehicle type data */}
          <div className="stat-card">
            <h3 className="font-display font-semibold text-foreground mb-3">Fatalities by Vehicle Type</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { type: 'Two-Wheelers', pct: '44.5%', icon: Bike },
                { type: 'Cars/Jeeps/Taxis', pct: '15.1%', icon: Car },
                { type: 'Trucks/Lorries', pct: '14.8%', icon: Truck },
                { type: 'Pedestrians', pct: '22.0%', icon: Footprints },
              ].map(v => {
                const Icon = v.icon;
                return (
                  <div key={v.type} className="stat-card text-center">
                    <Icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="font-display text-xl font-bold text-foreground">{v.pct}</p>
                    <p className="text-xs text-muted-foreground">{v.type}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
