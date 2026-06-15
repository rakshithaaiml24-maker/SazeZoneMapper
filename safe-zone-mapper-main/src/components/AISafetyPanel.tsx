import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, X, Loader2, Route, Radar, MessageCircle, Sparkles, ArrowRight, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-safety-analysis`;
const AUTH_HEADER = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;

type Msg = { role: 'user' | 'assistant'; content: string };

async function streamAI(body: object, onDelta: (t: string) => void, onDone: () => void) {
  const resp = await fetch(FUNC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: AUTH_HEADER },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'AI request failed' }));
    throw new Error(err.error || `Error ${resp.status}`);
  }

  if (!resp.body) throw new Error('No response body');
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf('\n')) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch { buf = line + '\n' + buf; break; }
    }
  }
  onDone();
}

export default function AISafetyPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState('chatbot');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed bottom-4 right-4 z-[1000] w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col"
      style={{ maxHeight: '75vh' }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/15 via-primary/10 to-transparent px-5 py-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-foreground leading-tight">AI Safety Intelligence</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Powered by complete dataset • All cities</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-3 pt-3">
          <TabsList className="w-full grid grid-cols-3 h-10 rounded-xl bg-muted/20 p-1">
            <TabsTrigger value="chatbot" className="text-xs gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all">
              <MessageCircle className="w-3.5 h-3.5" /> Chat
            </TabsTrigger>
            <TabsTrigger value="route" className="text-xs gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all">
              <Route className="w-3.5 h-3.5" /> Route
            </TabsTrigger>
            <TabsTrigger value="anomaly" className="text-xs gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all">
              <Radar className="w-3.5 h-3.5" /> Anomaly
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chatbot" className="flex-1 flex flex-col min-h-0 mt-0 px-3 pb-3"><ChatbotTab /></TabsContent>
        <TabsContent value="route" className="flex-1 flex flex-col min-h-0 mt-0 px-3 pb-3"><RouteTab /></TabsContent>
        <TabsContent value="anomaly" className="flex-1 flex flex-col min-h-0 mt-0 px-3 pb-3"><AnomalyTab /></TabsContent>
      </Tabs>
    </motion.div>
  );
}

function ChatbotTab() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    let assistantText = '';

    try {
      await streamAI(
        { type: 'chatbot', payload: { messages: [...messages, userMsg] } },
        (chunk) => {
          assistantText += chunk;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
            return [...prev, { role: 'assistant', content: assistantText }];
          });
        },
        () => setLoading(false),
      );
    } catch (e: any) {
      toast.error(e.message);
      setLoading(false);
    }
  };

  const suggestions = [
    'Which city has the most fatal accidents?',
    'Top causes of accidents in India?',
    'Compare Mumbai vs Delhi safety',
  ];

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1 mt-3" style={{ maxHeight: '42vh' }}>
        {messages.length === 0 && (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <Bot className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Ask SafetyAI anything</p>
              <p className="text-xs text-muted-foreground mt-1">Trained on complete accident data across all Indian cities</p>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              {suggestions.map(q => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs text-left px-3 py-2.5 rounded-xl border border-border/50 bg-muted/10 text-foreground hover:bg-primary/10 hover:border-primary/30 transition-all flex items-center gap-2 group"
                >
                  <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
              m.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-muted/20 border border-border/30 text-foreground rounded-bl-md'
            }`}>
              {m.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-1.5 [&_ul]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : m.content}
            </div>
          </motion.div>
        ))}
        {loading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-muted/20 border border-border/30 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-muted-foreground">Analyzing data...</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-3 pt-3 border-t border-border/30">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about safety data..."
          className="flex-1 rounded-xl bg-muted/10 border-border/30 h-10"
          disabled={loading}
        />
        <Button size="icon" onClick={send} disabled={loading || !input.trim()} className="h-10 w-10 rounded-xl shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </>
  );
}

function RouteTab() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!origin.trim() || !destination.trim() || loading) return;
    setResult('');
    setLoading(true);
    try {
      await streamAI(
        { type: 'route-safety', payload: { origin: origin.trim(), destination: destination.trim() } },
        (chunk) => setResult(prev => prev + chunk),
        () => setLoading(false),
      );
    } catch (e: any) { toast.error(e.message); setLoading(false); }
  };

  return (
    <>
      <div className="mt-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Origin</label>
            <Input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="e.g. Mumbai" disabled={loading} className="rounded-xl bg-muted/10 border-border/30 h-9" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Destination</label>
            <Input value={destination} onChange={e => setDestination(e.target.value)} placeholder="e.g. Pune" disabled={loading} className="rounded-xl bg-muted/10 border-border/30 h-9" />
          </div>
        </div>
        <Button size="sm" onClick={analyze} disabled={loading || !origin.trim() || !destination.trim()} className="w-full h-10 rounded-xl font-medium">
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analyzing route...</>
          ) : (
            <><Shield className="w-4 h-4 mr-2" /> Analyze Route Safety</>
          )}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 pr-1 mt-3" style={{ maxHeight: '38vh' }}>
        {result ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-1.5 [&_ul]:my-1 [&_li]:my-0.5 text-sm bg-muted/10 rounded-xl border border-border/30 p-4">
            <ReactMarkdown>{result}</ReactMarkdown>
          </motion.div>
        ) : !loading && (
          <div className="text-center py-8 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <Route className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Route Safety Analysis</p>
              <p className="text-xs text-muted-foreground mt-1">Enter origin and destination for AI-powered safety insights</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function AnomalyTab() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const detect = async () => {
    if (loading) return;
    setResult('');
    setLoading(true);
    try {
      await streamAI(
        { type: 'anomaly-detection', payload: {} },
        (chunk) => setResult(prev => prev + chunk),
        () => setLoading(false),
      );
    } catch (e: any) { toast.error(e.message); setLoading(false); }
  };

  return (
    <>
      <div className="mt-3">
        <Button size="sm" onClick={detect} disabled={loading} className="w-full h-10 rounded-xl font-medium">
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Scanning all cities...</>
          ) : (
            <><Zap className="w-4 h-4 mr-2" /> Run Anomaly Detection</>
          )}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 pr-1 mt-3" style={{ maxHeight: '42vh' }}>
        {result ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-1.5 [&_ul]:my-1 [&_li]:my-0.5 text-sm bg-muted/10 rounded-xl border border-border/30 p-4">
            <ReactMarkdown>{result}</ReactMarkdown>
          </motion.div>
        ) : !loading && (
          <div className="text-center py-8 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <Radar className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Anomaly Detection</p>
              <p className="text-xs text-muted-foreground mt-1">Detect unusual accident spikes across all cities using AI</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
