'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, Trophy, LogIn,
  RefreshCw, Newspaper, AlertCircle, CheckCircle2,
  CircleDollarSign, Banknote, ChevronUp, ChevronDown,
} from 'lucide-react';
import type { GameState, Portfolio, LeaderboardEntry, Currency, Countdown } from '@/types';
import { BASE_RATES, INITIAL_BOB, SCENARIOS } from '@/lib/scenarios';
import { pctChange } from '@/lib/game-logic';

/* ─── helpers ─────────────────────────────────────────────── */
const fmt = (n: number, dec = 2) =>
  new Intl.NumberFormat('es-BO', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);

const fmtTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const CURRENCY_META: Record<Currency, { label: string; flag: string; color: string; textColor: string }> = {
  usd: { label: 'Dólar EE.UU.', flag: '🇺🇸', color: 'sky', textColor: 'text-sky-400' },
  eur: { label: 'Euro',         flag: '🇪🇺', color: 'violet', textColor: 'text-violet-400' },
  cny: { label: 'Yuan Chino',   flag: '🇨🇳', color: 'amber', textColor: 'text-amber-400' },
};

/* ─── sub-components ───────────────────────────────────────── */
function CurrencyCard({
  currency, rate, flash,
}: {
  currency: Currency;
  rate: number;
  flash: 'up' | 'down' | null;
}) {
  const meta = CURRENCY_META[currency];
  const pct = pctChange(rate, BASE_RATES[currency]);
  const up = pct >= 0;

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col gap-1 transition-all ${
        flash === 'up' ? 'flash-up' : flash === 'down' ? 'flash-down' : ''
      }`}
    >
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <span>{meta.flag}</span>
        <span className="font-medium">{currency.toUpperCase()}</span>
        <span className="text-slate-600">/BOB</span>
      </div>
      <div className={`text-2xl font-bold ${meta.textColor}`}>Bs {fmt(rate, 4)}</div>
      <div className={`flex items-center gap-1 text-sm font-semibold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
        {up ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {up ? '+' : ''}{fmt(pct, 2)}%
        <span className="text-slate-500 font-normal ml-1">desde inicio</span>
      </div>
      <div className="text-xs text-slate-500 mt-1">{meta.label}</div>
    </div>
  );
}


/* ─── main page ────────────────────────────────────────────── */
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

  /* init from localStorage */
  useEffect(() => {
    const t = localStorage.getItem('divisas_token');
    const n = localStorage.getItem('divisas_name');
    if (t) setToken(t);
    if (n) setPlayerName(n);
  }, []);

  /* polling */
  const poll = useCallback(async () => {
    const t = token ?? localStorage.getItem('divisas_token');
    const url = t ? `/api/game-state?token=${t}` : '/api/game-state';
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();

      // Flash animation on price change
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

      // Countdown ref
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

  /* countdown tick */
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

  /* join */
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

  /* trade */
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

  /* derived */
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

  /* ── LOADING ──────────────────────────────────────────────── */
  if (phase === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-sky-400" />
      </div>
    );
  }

  /* ── LOGIN ────────────────────────────────────────────────── */
  if (phase === 'login') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
        <div className="text-center">
          <div className="text-5xl mb-3">💱</div>
          <h1 className="text-3xl font-bold text-slate-100">DivisasBO</h1>
          <p className="text-slate-400 mt-1">Simulador de Mercado de Divisas</p>
          <div className="mt-2 flex items-center justify-center gap-2 text-sm text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {playerCount} jugador{playerCount !== 1 ? 'es' : ''} conectado{playerCount !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-slate-200">Ingresa tu nombre</h2>
          <input
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            placeholder="Ej: María García"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            maxLength={30}
          />
          {joinError && (
            <p className="text-red-400 text-sm flex items-center gap-1">
              <AlertCircle size={14} /> {joinError}
            </p>
          )}
          <button
            onClick={handleJoin}
            disabled={joining || !nameInput.trim()}
            className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {joining ? <RefreshCw size={16} className="animate-spin" /> : <LogIn size={16} />}
            Unirse a la partida
          </button>
        </div>

        <p className="text-xs text-slate-600">Capital inicial: Bs {fmt(INITIAL_BOB)} | Moneda base: Boliviano (BOB)</p>
      </div>
    );
  }

  /* ── WAITING ──────────────────────────────────────────────── */
  if (phase === 'waiting') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4">
        {/* Confirmación de ingreso */}
        <div className="w-full max-w-md bg-emerald-950 border-2 border-emerald-600 rounded-2xl p-5 text-center">
          <div className="text-3xl mb-2">✅</div>
          <h2 className="text-xl font-bold text-emerald-400">¡Ingresaste exitosamente!</h2>
          <p className="text-slate-300 mt-1 font-semibold text-lg">{playerName}</p>
          <p className="text-slate-400 text-sm mt-1">Tu cuenta está lista con capital inicial</p>
          <p className="text-2xl font-bold text-slate-100 mt-2">Bs {fmt(INITIAL_BOB)}</p>
        </div>

        {/* Estado de espera */}
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 text-yellow-400">
            <RefreshCw size={18} className="animate-spin" />
            <span className="font-semibold">Esperando que el docente inicie la partida...</span>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-sky-400">{playerCount}</div>
            <div className="text-slate-400 text-sm">jugador{playerCount !== 1 ? 'es' : ''} listo{playerCount !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {/* Instrucciones */}
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <p className="text-slate-400 text-sm font-semibold mb-3">¿Cómo funciona?</p>
          <div className="flex flex-col gap-3 text-sm text-slate-400">
            <div className="flex gap-3">
              <span className="text-sky-400 font-bold shrink-0">1.</span>
              El docente activará un evento económico con información de contexto
            </div>
            <div className="flex gap-3">
              <span className="text-sky-400 font-bold shrink-0">2.</span>
              Tendrás <strong className="text-slate-200">1 minuto</strong> para leer, analizar y decidir qué divisas comprar o vender
            </div>
            <div className="flex gap-3">
              <span className="text-sky-400 font-bold shrink-0">3.</span>
              El precio cambiará según el evento. Quien acumule más bolivianos al final, ¡gana!
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── ENDED ────────────────────────────────────────────────── */
  if (phase === 'ended') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-12">
        <div className="text-center">
          <div className="text-5xl mb-3">🏁</div>
          <h1 className="text-3xl font-bold text-slate-100">¡Partida finalizada!</h1>
          {leaderboard[0] && (
            <p className="text-slate-400 mt-2">
              Ganador: <span className="text-yellow-400 font-bold">{leaderboard[0].name}</span> con{' '}
              <span className="text-emerald-400 font-bold">Bs {fmt(leaderboard[0].totalBob)}</span>
            </p>
          )}
        </div>
        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-800 flex items-center gap-2 font-semibold text-slate-200">
            <Trophy size={16} className="text-yellow-400" /> Clasificación Final
          </div>
          {leaderboard.map((e, i) => (
            <div
              key={e.name}
              className={`flex items-center gap-3 px-4 py-3 border-t border-slate-800 ${
                e.name === playerName ? 'bg-slate-800/60' : ''
              }`}
            >
              <span className={`w-7 text-center font-bold text-sm ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-600' : 'text-slate-600'}`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <span className="flex-1 text-slate-200">{e.name}</span>
              <span className="font-bold text-slate-100">Bs {fmt(e.totalBob)}</span>
              <span className={`text-xs font-semibold ${e.totalBob >= INITIAL_BOB ? 'text-emerald-400' : 'text-red-400'}`}>
                {e.totalBob >= INITIAL_BOB ? '+' : ''}
                {fmt(e.totalBob - INITIAL_BOB)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── TRADING ──────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2 font-bold text-lg text-slate-100">
          <span>💱</span> DivisasBO
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          {playerCount} jugadores
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-center">
          <div className="text-xs text-slate-500">{playerName}</div>
          <div className={`text-base font-bold ${pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            Bs {fmt(totalBob)}
          </div>
        </div>
        {myRank > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-center">
            <div className="text-xs text-slate-500">Posición</div>
            <div className="text-base font-bold text-yellow-400">#{myRank}</div>
          </div>
        )}
      </header>

      {/* Breaking news banner */}
      {countdownSecs > 0 && activeNewsScenario && (
        <div className="pulse-border border-2 border-red-500 bg-red-950/40 px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 text-red-400 font-bold text-sm shrink-0">
            <span className="animate-ping w-2 h-2 rounded-full bg-red-500 inline-block" />
            NOTICIA
          </div>
          <div className="flex-1 text-sm font-semibold text-slate-100">
            {activeNewsScenario.icon} {activeNewsScenario.title}
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs text-slate-400">Tiempo para decidir</div>
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
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-300">
              <TrendingUp size={16} className="text-sky-400" />
              Variación de divisas (% respecto al inicio)
            </div>
            {chartData.length < 2 ? (
              <div className="h-48 flex items-center justify-center text-slate-600 text-sm">
                El gráfico se actualizará cuando ocurra el primer evento
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#334155" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis
                    stroke="#334155"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`}
                  />
                  <ReferenceLine y={0} stroke="#334155" strokeDasharray="4 4" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(v: number, name: string) => [`${v > 0 ? '+' : ''}${v}%`, name]}
                  />
                  <Legend formatter={(v) => v} />
                  <Line type="monotone" dataKey="USD" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="EUR" stroke="#a78bfa" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="CNY" stroke="#fbbf24" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Trade panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
            <div className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <CircleDollarSign size={16} className="text-sky-400" /> Panel de Trading
            </div>

            {/* Currency tabs */}
            <div className="flex gap-2">
              {(['usd', 'eur', 'cny'] as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setTradeCurrency(c)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors border ${
                    tradeCurrency === c
                      ? 'bg-sky-900 border-sky-600 text-sky-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {CURRENCY_META[c].flag} {c.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Amount input */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">Cantidad ({tradeCurrency.toUpperCase()})</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
                {/* Quick amounts */}
                {[10, 50, 100].map((n) => (
                  <button
                    key={n}
                    onClick={() => setTradeAmount(String(n))}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 text-xs rounded-lg transition-colors"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Cost preview */}
            {qty > 0 && (
              <div className="bg-slate-800 rounded-lg px-4 py-3 grid grid-cols-2 gap-2 text-sm">
                <div className="text-slate-400">Tipo de cambio</div>
                <div className="text-right text-slate-200 font-medium">Bs {fmt(rates[tradeCurrency], 4)}</div>
                <div className="text-slate-400">Costo / Ingreso</div>
                <div className="text-right font-bold text-sky-400">Bs {fmt(tradeCost)}</div>
                <div className="text-slate-400">Disponible (BOB)</div>
                <div className="text-right text-slate-200">Bs {portfolio ? fmt(portfolio.bob) : '—'}</div>
              </div>
            )}

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleTrade('buy')}
                disabled={trading || !qty || !portfolio || portfolio.bob < tradeCost}
                className="py-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <TrendingUp size={16} /> COMPRAR
              </button>
              <button
                onClick={() => handleTrade('sell')}
                disabled={trading || !qty || !portfolio || portfolio[tradeCurrency] < qty}
                className="py-3 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <TrendingDown size={16} /> VENDER
              </button>
            </div>

            {tradeMsg && (
              <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                tradeMsg.ok ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'
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
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Banknote size={16} className="text-sky-400" /> Mi Portafolio
              </div>
              {/* BOB */}
              <div className="flex items-center justify-between text-sm py-1 border-b border-slate-800">
                <span className="text-slate-400">🇧🇴 Bolivianos (BOB)</span>
                <span className="text-slate-200 font-medium">Bs {fmt(portfolio.bob)}</span>
              </div>
              {/* Currencies */}
              {(['usd', 'eur', 'cny'] as Currency[]).map((c) => {
                const val = portfolio[c] * rates[c];
                const meta = CURRENCY_META[c];
                return (
                  <div key={c} className="flex items-center justify-between text-sm py-1 border-b border-slate-800">
                    <div>
                      <span className="text-slate-400">{meta.flag} {c.toUpperCase()}</span>
                      <span className={`ml-2 font-mono text-xs ${meta.textColor}`}>{fmt(portfolio[c], 4)}</span>
                    </div>
                    <span className="text-slate-300">≈ Bs {fmt(val)}</span>
                  </div>
                );
              })}
              {/* Total */}
              <div className="flex items-center justify-between pt-1">
                <span className="font-semibold text-slate-200">Total en BOB</span>
                <span className="font-bold text-xl text-slate-100">Bs {fmt(totalBob)}</span>
              </div>
              <div className={`text-sm text-right font-semibold ${pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {pl >= 0 ? '▲' : '▼'} {pl >= 0 ? '+' : ''}Bs {fmt(pl)} vs. inicio
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-800 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Trophy size={14} className="text-yellow-400" /> Clasificación en Vivo
            </div>
            <div className="max-h-56 overflow-y-auto">
              {leaderboard.map((e, i) => (
                <div
                  key={e.name}
                  className={`flex items-center gap-2 px-4 py-2.5 border-t border-slate-800 text-sm ${
                    e.name === playerName ? 'bg-sky-950/40' : ''
                  }`}
                >
                  <span className={`w-6 text-center text-xs font-bold ${
                    i === 0 ? 'text-yellow-400' : i < 3 ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </span>
                  <span className={`flex-1 truncate ${e.name === playerName ? 'text-sky-300 font-semibold' : 'text-slate-300'}`}>
                    {e.name}
                  </span>
                  <span className="font-semibold text-slate-200 text-xs">Bs {fmt(e.totalBob)}</span>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <div className="px-4 py-4 text-sm text-slate-600 text-center">Sin jugadores aún</div>
              )}
            </div>
          </div>

          {/* Active scenario news card */}
          {activeNewsScenario && countdownSecs > 0 && (
            <div className="bg-slate-900 border border-red-900 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-red-400">
                  <Newspaper size={14} /> EVENTO ACTIVO
                </div>
                <div className={`font-mono text-lg font-bold ${countdownSecs < 15 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {fmtTime(countdownSecs)}
                </div>
              </div>
              <div className="text-sm font-semibold text-slate-100">
                {activeNewsScenario.icon} {activeNewsScenario.title}
              </div>
              <span className="self-start text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                {activeNewsScenario.concept}
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">{activeNewsScenario.description}</p>
              <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-300 leading-relaxed italic border-l-2 border-sky-500">
                💭 {activeNewsScenario.question}
              </div>
            </div>
          )}

          {/* Previous news */}
          {(game?.news ?? []).length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-800 text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Newspaper size={14} /> Eventos Anteriores
              </div>
              <div className="max-h-48 overflow-y-auto">
                {(game?.news ?? []).map((n) => (
                  <div key={n.id} className="px-4 py-3 border-t border-slate-800">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{n.icon}</span>
                      <span className="text-xs font-semibold text-slate-300 flex-1">{n.title}</span>
                      <span className="text-xs text-slate-600 shrink-0">{n.time}</span>
                    </div>
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
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
