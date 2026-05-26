'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Trophy, LogIn,
  RefreshCw, Newspaper, AlertCircle, CheckCircle2,
  CircleDollarSign, Banknote, ChevronUp, ChevronDown,
} from 'lucide-react';
import type { GameState, Portfolio, LeaderboardEntry, Currency, Countdown } from '@/types';
import { BASE_RATES, INITIAL_BOB, SCENARIOS } from '@/lib/scenarios';
import { pctChange } from '@/lib/game-logic';

const fmt = (n: number, dec = 2) =>
  new Intl.NumberFormat('es-BO', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);

const fmtTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const CURRENCY_META: Record<Currency, {
  label: string; flag: string; textColor: string;
  tint: string; activeBorder: string; tabActive: string;
}> = {
  usd: {
    label: 'Dólar EE.UU.', flag: '🇺🇸', textColor: 'text-sky-300',
    tint: 'bg-sky-500/[0.07] border-sky-400/20',
    activeBorder: 'border-sky-400/40',
    tabActive: 'bg-sky-500/20 border-sky-400/40 text-sky-300',
  },
  eur: {
    label: 'Euro', flag: '🇪🇺', textColor: 'text-violet-300',
    tint: 'bg-violet-500/[0.07] border-violet-400/20',
    activeBorder: 'border-violet-400/40',
    tabActive: 'bg-violet-500/20 border-violet-400/40 text-violet-300',
  },
  cny: {
    label: 'Yuan Chino', flag: '🇨🇳', textColor: 'text-amber-300',
    tint: 'bg-amber-500/[0.07] border-amber-400/20',
    activeBorder: 'border-amber-400/40',
    tabActive: 'bg-amber-500/20 border-amber-400/40 text-amber-300',
  },
};

function CurrencyCard({ currency, rate, flash }: { currency: Currency; rate: number; flash: 'up' | 'down' | null }) {
  const meta = CURRENCY_META[currency];
  const pct = pctChange(rate, BASE_RATES[currency]);
  const up = pct >= 0;

  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-4 flex flex-col gap-2.5 transition-all shadow-xl shadow-black/30 ${meta.tint} ${
      flash === 'up' ? 'flash-up' : flash === 'down' ? 'flash-down' : ''
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.flag}</span>
          <span className="text-[11px] font-bold tracking-widest text-white/40 uppercase">{currency}/BOB</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${up ? 'bg-emerald-400/15 text-emerald-400' : 'bg-red-400/15 text-red-400'}`}>
          {up ? '+' : ''}{fmt(pct, 2)}%
        </span>
      </div>
      <div className={`text-[1.6rem] font-bold leading-none ${meta.textColor}`}>
        Bs {fmt(rate, 4)}
      </div>
      <div className="flex items-center gap-1 text-xs text-white/35">
        {up ? <ChevronUp size={12} className="text-emerald-400" /> : <ChevronDown size={12} className="text-red-400" />}
        {meta.label}
      </div>
    </div>
  );
}

export default function StudentPage() {
  const [token, setToken] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const [game, setGame] = useState<GameState | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerCount, setPlayerCount] = useState(0);

  const [tradeCurrency, setTradeCurrency] = useState<Currency>('usd');
  const [tradeAmount, setTradeAmount] = useState('');
  const [trading, setTrading] = useState(false);
  const [tradeMsg, setTradeMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [countdownSecs, setCountdownSecs] = useState(0);
  const cdRef = useRef<{ startedAt: string; duration: number; scenarioId: number } | null>(null);
  const prevRates = useRef<{ usd: number; eur: number; cny: number } | null>(null);
  const [flash, setFlash] = useState<Partial<Record<Currency, 'up' | 'down'>>>({});

  useEffect(() => {
    const t = localStorage.getItem('divisas_token');
    const n = localStorage.getItem('divisas_name');
    if (t) setToken(t);
    if (n) setPlayerName(n);
  }, []);

  const poll = useCallback(async () => {
    const t = token ?? localStorage.getItem('divisas_token');
    const url = t ? `/api/game-state?token=${t}` : '/api/game-state';
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();

      if (prevRates.current && data.game) {
        const f: typeof flash = {};
        for (const c of ['usd', 'eur', 'cny'] as Currency[]) {
          if (data.game.rates[c] !== prevRates.current[c]) {
            f[c] = data.game.rates[c] > prevRates.current[c] ? 'up' : 'down';
          }
        }
        if (Object.keys(f).length) {
          setFlash(f);
          setTimeout(() => setFlash({}), 1400);
        }
      }
      prevRates.current = data.game?.rates ?? null;

      setGame(data.game);
      setLeaderboard(data.leaderboard ?? []);
      setPlayerCount(data.playerCount ?? 0);

      if (data.player) {
        setPortfolio(data.player.portfolio);
      } else if (t) {
        localStorage.removeItem('divisas_token');
        localStorage.removeItem('divisas_name');
        setToken(null);
        setPlayerName('');
        setPortfolio(null);
      }

      const cd = data.game?.countdown as Countdown | null;
      if (cd && !cd.applied) {
        cdRef.current = { startedAt: cd.startedAt, duration: cd.duration, scenarioId: cd.scenarioId };
      } else {
        cdRef.current = null;
      }
    } catch { /* network error */ }
  }, [token]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [poll]);

  useEffect(() => {
    const tick = () => {
      if (!cdRef.current) { setCountdownSecs(0); return; }
      const elapsed = (Date.now() - new Date(cdRef.current.startedAt).getTime()) / 1000;
      setCountdownSecs(Math.max(0, cdRef.current.duration - elapsed));
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, []);

  const handleJoin = async () => {
    if (!nameInput.trim()) return;
    setJoining(true);
    setJoinError('');
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('divisas_token', data.token);
        localStorage.setItem('divisas_name', data.name);
        setToken(data.token);
        setPlayerName(data.name);
        setPortfolio(data.portfolio);
      } else {
        setJoinError(data.error ?? 'Error al unirse');
      }
    } catch { setJoinError('Error de conexión'); }
    finally { setJoining(false); }
  };

  const handleTrade = async (action: 'buy' | 'sell') => {
    if (!token || !tradeAmount) return;
    const qty = parseFloat(tradeAmount);
    if (isNaN(qty) || qty <= 0) return;
    setTrading(true);
    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currency: tradeCurrency, action, quantity: qty }),
      });
      const data = await res.json();
      if (data.success) {
        setPortfolio(data.portfolio);
        setTradeMsg({ ok: true, text: data.message });
        setTradeAmount('');
      } else {
        setTradeMsg({ ok: false, text: data.error });
      }
    } catch { setTradeMsg({ ok: false, text: 'Error de conexión' }); }
    finally {
      setTrading(false);
      setTimeout(() => setTradeMsg(null), 4000);
    }
  };

  const isLoggedIn = !!token && !!portfolio;
  const phase =
    !game ? 'loading'
    : game.status === 'ended' ? 'ended'
    : !isLoggedIn ? 'login'
    : game.status === 'waiting' ? 'waiting'
    : 'trading';

  const rates = game?.rates ?? BASE_RATES;
  const totalBob = portfolio
    ? portfolio.bob + portfolio.usd * rates.usd + portfolio.eur * rates.eur + portfolio.cny * rates.cny
    : 0;
  const pl = totalBob - INITIAL_BOB;

  const qty = parseFloat(tradeAmount) || 0;
  const tradeCost = qty * (rates[tradeCurrency] ?? 0);

  const chartData = (game?.rateHistory ?? []).map((s) => ({
    label: s.label,
    USD: parseFloat(pctChange(s.usd, BASE_RATES.usd).toFixed(2)),
    EUR: parseFloat(pctChange(s.eur, BASE_RATES.eur).toFixed(2)),
    CNY: parseFloat(pctChange(s.cny, BASE_RATES.cny).toFixed(2)),
  }));

  const activeNewsScenario = cdRef.current
    ? SCENARIOS.find((s) => s.id === cdRef.current!.scenarioId)
    : null;

  const myRank = leaderboard.findIndex((e) => e.name === playerName) + 1;

  /* ── LOADING ── */
  if (phase === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={28} className="animate-spin text-sky-400" />
          <span className="text-white/40 text-sm">Conectando...</span>
        </div>
      </div>
    );
  }

  /* ── LOGIN ── */
  if (phase === 'login') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">💱</div>
          <h1 className="text-4xl font-bold gradient-text">DivisasBO</h1>
          <p className="text-white/40 mt-2 text-sm">Simulador de Mercado de Divisas</p>
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-white/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {playerCount} jugador{playerCount !== 1 ? 'es' : ''} conectado{playerCount !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="glass w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-white/80">Ingresa tu nombre para jugar</h2>
          <input
            className="w-full bg-white/[0.06] border border-white/[0.12] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-sky-400/60 focus:bg-white/[0.08] transition-all"
            placeholder="Ej: María García"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            maxLength={30}
          />
          {joinError && (
            <p className="text-red-400 text-sm flex items-center gap-1.5">
              <AlertCircle size={14} /> {joinError}
            </p>
          )}
          <button
            onClick={handleJoin}
            disabled={joining || !nameInput.trim()}
            className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-500/25"
          >
            {joining ? <RefreshCw size={16} className="animate-spin" /> : <LogIn size={16} />}
            Unirse a la partida
          </button>
        </div>

        <p className="text-xs text-white/25">Capital inicial: Bs {fmt(INITIAL_BOB)} · Moneda base: Boliviano (BOB)</p>
      </div>
    );
  }

  /* ── WAITING ── */
  if (phase === 'waiting') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <div className="w-full max-w-md rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.07] backdrop-blur-xl p-6 text-center shadow-xl shadow-black/30">
          <div className="text-3xl mb-3">✅</div>
          <h2 className="text-xl font-bold text-emerald-400">¡Ingresaste exitosamente!</h2>
          <p className="text-white/80 mt-1.5 font-semibold text-lg">{playerName}</p>
          <p className="text-white/40 text-sm mt-1">Capital inicial asignado</p>
          <p className="text-3xl font-bold text-white mt-2">Bs {fmt(INITIAL_BOB)}</p>
        </div>

        <div className="glass w-full max-w-md rounded-2xl p-5 flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 text-yellow-400 text-sm font-semibold">
            <RefreshCw size={16} className="animate-spin" />
            Esperando que el docente inicie la partida...
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-sky-300">{playerCount}</div>
            <div className="text-white/40 text-xs mt-0.5">jugador{playerCount !== 1 ? 'es' : ''} listo{playerCount !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <div className="glass w-full max-w-md rounded-2xl p-5">
          <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-3">¿Cómo funciona?</p>
          <div className="flex flex-col gap-3 text-sm text-white/50">
            {[
              'El docente activará un evento económico con información de contexto.',
              'Tendrás 1 minuto para leer, analizar y decidir qué divisas comprar o vender.',
              'El precio cambiará según el evento. Quien acumule más Bolivianos al final, ¡gana!',
            ].map((txt, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-sky-400 font-bold shrink-0">{i + 1}.</span>
                <span>{txt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── ENDED ── */
  if (phase === 'ended') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-12">
        <div className="text-center">
          <div className="text-5xl mb-3">🏁</div>
          <h1 className="text-3xl font-bold gradient-text">¡Partida finalizada!</h1>
          {leaderboard[0] && (
            <p className="text-white/50 mt-2 text-sm">
              Ganador: <span className="text-yellow-400 font-bold">{leaderboard[0].name}</span> con{' '}
              <span className="text-emerald-400 font-bold">Bs {fmt(leaderboard[0].totalBob)}</span>
            </p>
          )}
        </div>
        <div className="glass w-full max-w-lg rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-white/[0.04] border-b border-white/[0.08] flex items-center gap-2 font-semibold text-white/80 text-sm">
            <Trophy size={15} className="text-yellow-400" /> Clasificación Final
          </div>
          {leaderboard.map((e, i) => (
            <div
              key={e.name}
              className={`flex items-center gap-3 px-4 py-3 border-t border-white/[0.06] ${
                e.name === playerName ? 'bg-sky-500/[0.08]' : ''
              }`}
            >
              <span className={`w-7 text-center font-bold text-sm ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-600' : 'text-white/30'}`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <span className="flex-1 text-white/80">{e.name}</span>
              <span className="font-bold text-white">Bs {fmt(e.totalBob)}</span>
              <span className={`text-xs font-semibold ${e.totalBob >= INITIAL_BOB ? 'text-emerald-400' : 'text-red-400'}`}>
                {e.totalBob >= INITIAL_BOB ? '+' : ''}Bs {fmt(e.totalBob - INITIAL_BOB)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── TRADING ── */
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/40 backdrop-blur-2xl border-b border-white/[0.07] px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2 font-bold text-lg text-white/90">
          <span>💱</span> DivisasBO
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-xs text-white/40">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {playerCount} jugadores
        </div>
        <div className="glass rounded-xl px-3 py-1.5 text-center">
          <div className="text-[10px] text-white/35">{playerName}</div>
          <div className={`text-sm font-bold ${pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            Bs {fmt(totalBob)}
          </div>
        </div>
        {myRank > 0 && (
          <div className="glass rounded-xl px-3 py-1.5 text-center">
            <div className="text-[10px] text-white/35">Posición</div>
            <div className="text-sm font-bold text-yellow-400">#{myRank}</div>
          </div>
        )}
      </header>

      {/* Breaking news banner */}
      {countdownSecs > 0 && activeNewsScenario && (
        <div className="pulse-border border-2 border-red-500/60 bg-red-500/[0.08] backdrop-blur-xl px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 text-red-400 font-bold text-xs shrink-0">
            <span className="animate-ping w-2 h-2 rounded-full bg-red-500 inline-block" />
            NOTICIA
          </div>
          <div className="flex-1 text-sm font-semibold text-white/90">
            {activeNewsScenario.icon} {activeNewsScenario.title}
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[10px] text-white/40">Tiempo para decidir</div>
            <div className={`text-2xl font-mono font-bold ${countdownSecs < 15 ? 'text-red-400' : 'text-yellow-400'}`}>
              {fmtTime(countdownSecs)}
            </div>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4 p-4 max-w-screen-2xl mx-auto w-full">
        {/* LEFT */}
        <div className="flex flex-col gap-4">
          {/* Currency cards */}
          <div className="grid grid-cols-3 gap-3">
            {(['usd', 'eur', 'cny'] as Currency[]).map((c) => (
              <CurrencyCard key={c} currency={c} rate={rates[c]} flash={flash[c] ?? null} />
            ))}
          </div>

          {/* Chart */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-white/50 uppercase tracking-wider">
              <TrendingUp size={14} className="text-sky-400" />
              Variación vs. inicio (%)
            </div>
            {chartData.length < 2 ? (
              <div className="h-48 flex items-center justify-center text-white/25 text-sm">
                El gráfico se actualizará en el primer evento
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" stroke="transparent" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                  <YAxis
                    stroke="transparent"
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                    tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`}
                  />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.10)" strokeDasharray="4 4" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(3,7,18,0.85)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, backdropFilter: 'blur(20px)' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                    formatter={(v: number, name: string) => [`${v > 0 ? '+' : ''}${v}%`, name]}
                  />
                  <Legend formatter={(v) => v} wrapperStyle={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }} />
                  <Line type="monotone" dataKey="USD" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="EUR" stroke="#a78bfa" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="CNY" stroke="#fbbf24" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Trade panel */}
          <div className={`rounded-2xl border backdrop-blur-xl p-4 flex flex-col gap-4 shadow-xl shadow-black/30 ${CURRENCY_META[tradeCurrency].tint}`}>
            <div className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
              <CircleDollarSign size={14} className="text-sky-400" /> Panel de Trading
            </div>

            {/* Currency tabs */}
            <div className="flex gap-2">
              {(['usd', 'eur', 'cny'] as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setTradeCurrency(c)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                    tradeCurrency === c
                      ? CURRENCY_META[c].tabActive
                      : 'bg-white/[0.04] border-white/[0.08] text-white/40 hover:bg-white/[0.07]'
                  }`}
                >
                  {CURRENCY_META[c].flag} {c.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Amount input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-white/35 font-medium uppercase tracking-wider">
                Cantidad ({tradeCurrency.toUpperCase()})
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-2.5 text-white placeholder-white/25 focus:outline-none focus:border-white/25 transition-all"
                />
                {[10, 50, 100].map((n) => (
                  <button
                    key={n}
                    onClick={() => setTradeAmount(String(n))}
                    className="px-3 py-2.5 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-white/50 text-xs rounded-xl transition-colors"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Cost preview */}
            {qty > 0 && (
              <div className="bg-white/[0.04] rounded-xl px-4 py-3 grid grid-cols-2 gap-2 text-sm border border-white/[0.06]">
                <div className="text-white/40 text-xs">Tipo de cambio</div>
                <div className="text-right text-white/70 font-medium text-xs">Bs {fmt(rates[tradeCurrency], 4)}</div>
                <div className="text-white/40 text-xs">Costo / Ingreso</div>
                <div className={`text-right font-bold text-sm ${CURRENCY_META[tradeCurrency].textColor}`}>Bs {fmt(tradeCost)}</div>
                <div className="text-white/40 text-xs">Disponible (BOB)</div>
                <div className="text-right text-white/60 text-xs">Bs {portfolio ? fmt(portfolio.bob) : '—'}</div>
              </div>
            )}

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleTrade('buy')}
                disabled={trading || !qty || !portfolio || portfolio.bob < tradeCost}
                className="py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
              >
                <TrendingUp size={15} /> COMPRAR
              </button>
              <button
                onClick={() => handleTrade('sell')}
                disabled={trading || !qty || !portfolio || portfolio[tradeCurrency] < qty}
                className="py-3 bg-red-500 hover:bg-red-400 disabled:opacity-30 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/20"
              >
                <TrendingDown size={15} /> VENDER
              </button>
            </div>

            {tradeMsg && (
              <div className={`flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl border ${
                tradeMsg.ok
                  ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-400'
                  : 'bg-red-500/10 border-red-400/20 text-red-400'
              }`}>
                {tradeMsg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {tradeMsg.text}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-4">
          {/* Portfolio */}
          {portfolio && (
            <div className="glass rounded-2xl p-4 flex flex-col gap-3">
              <div className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
                <Banknote size={14} className="text-sky-400" /> Mi Portafolio
              </div>
              <div className="flex items-center justify-between text-sm py-2 border-b border-white/[0.07]">
                <span className="text-white/50 text-xs">🇧🇴 Bolivianos (BOB)</span>
                <span className="text-white/80 font-semibold">Bs {fmt(portfolio.bob)}</span>
              </div>
              {(['usd', 'eur', 'cny'] as Currency[]).map((c) => {
                const val = portfolio[c] * rates[c];
                const meta = CURRENCY_META[c];
                return (
                  <div key={c} className="flex items-center justify-between text-sm py-1.5 border-b border-white/[0.07]">
                    <div className="flex items-center gap-2">
                      <span className="text-white/50 text-xs">{meta.flag} {c.toUpperCase()}</span>
                      <span className={`font-mono text-xs ${meta.textColor}`}>{fmt(portfolio[c], 4)}</span>
                    </div>
                    <span className="text-white/60 text-xs">≈ Bs {fmt(val)}</span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-1">
                <span className="font-semibold text-white/70 text-sm">Total en BOB</span>
                <span className="font-bold text-xl text-white">Bs {fmt(totalBob)}</span>
              </div>
              <div className={`text-sm text-right font-bold ${pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {pl >= 0 ? '▲ +' : '▼ '}Bs {fmt(Math.abs(pl))} vs. inicio
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-white/[0.04] border-b border-white/[0.07] flex items-center gap-2 text-xs font-bold text-white/60 uppercase tracking-wider">
              <Trophy size={13} className="text-yellow-400" /> Clasificación en Vivo
            </div>
            <div className="max-h-56 overflow-y-auto">
              {leaderboard.map((e, i) => (
                <div
                  key={e.name}
                  className={`flex items-center gap-2 px-4 py-2.5 border-t border-white/[0.05] text-sm ${
                    e.name === playerName ? 'bg-sky-500/[0.08]' : ''
                  }`}
                >
                  <span className={`w-6 text-center text-xs font-bold ${
                    i === 0 ? 'text-yellow-400' : i < 3 ? 'text-white/40' : 'text-white/20'
                  }`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </span>
                  <span className={`flex-1 truncate text-xs ${e.name === playerName ? 'text-sky-300 font-semibold' : 'text-white/60'}`}>
                    {e.name}
                  </span>
                  <span className="font-semibold text-white/80 text-xs">Bs {fmt(e.totalBob)}</span>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <div className="px-4 py-4 text-xs text-white/25 text-center">Sin jugadores aún</div>
              )}
            </div>
          </div>

          {/* Active scenario card */}
          {activeNewsScenario && countdownSecs > 0 && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/[0.07] backdrop-blur-xl p-4 flex flex-col gap-3 shadow-xl shadow-black/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
                  <Newspaper size={12} /> Evento Activo
                </div>
                <div className={`font-mono text-lg font-bold ${countdownSecs < 15 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {fmtTime(countdownSecs)}
                </div>
              </div>
              <div className="text-sm font-semibold text-white/90">
                {activeNewsScenario.icon} {activeNewsScenario.title}
              </div>
              <span className="self-start text-[11px] bg-white/[0.07] text-white/50 px-2 py-0.5 rounded-full border border-white/[0.08]">
                {activeNewsScenario.concept}
              </span>
              <p className="text-xs text-white/50 leading-relaxed">{activeNewsScenario.description}</p>
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-xs text-sky-300 leading-relaxed italic border-l-2 border-sky-400/50">
                💭 {activeNewsScenario.question}
              </div>
            </div>
          )}

          {/* Previous news */}
          {(game?.news ?? []).length > 0 && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-white/[0.04] border-b border-white/[0.07] text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
                <Newspaper size={12} /> Eventos Anteriores
              </div>
              <div className="max-h-48 overflow-y-auto">
                {(game?.news ?? []).map((n) => (
                  <div key={n.id} className="px-4 py-3 border-t border-white/[0.05]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{n.icon}</span>
                      <span className="text-xs font-semibold text-white/70 flex-1">{n.title}</span>
                      <span className="text-[10px] text-white/25 shrink-0">{n.time}</span>
                    </div>
                    <span className="text-[11px] text-white/35 bg-white/[0.05] px-2 py-0.5 rounded-full border border-white/[0.06]">
                      {n.concept}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
