'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Square, RotateCcw, Users, TrendingUp, TrendingDown,
  RefreshCw, LogIn, CheckCircle2, AlertCircle, Trophy, ChevronUp, ChevronDown,
} from 'lucide-react';
import type { GameState, LeaderboardEntry, Currency, Countdown } from '@/types';
import { SCENARIOS, BASE_RATES, INITIAL_BOB } from '@/lib/scenarios';
import { pctChange } from '@/lib/game-logic';

/* ─── helpers ─────────────────────────────────────────────── */
const fmt = (n: number, dec = 2) =>
  new Intl.NumberFormat('es-BO', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);

const fmtTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

function EffectBadge({ currency, value }: { currency: string; value: number }) {
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
      up ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'
    }`}>
      {up ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      {up ? '+' : ''}{value}% {currency.toUpperCase()}
    </span>
  );
}

/* ─── main ─────────────────────────────────────────────────── */
export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [adminPw, setAdminPw] = useState<string | null>(null);
  const [loginError, setLoginError] = useState('');
  const [logging, setLogging] = useState(false);

  const [game, setGame] = useState<GameState | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [actionMsg, setActionMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [countdownSecs, setCountdownSecs] = useState(0);
  const cdRef = useRef<{ startedAt: string; duration: number; scenarioId: number } | null>(null);

  /* init */
  useEffect(() => {
    const pw = localStorage.getItem('divisas_admin_pw');
    if (pw) setAdminPw(pw);
  }, []);

  /* poll */
  const poll = useCallback(async () => {
    if (!adminPw) return;
    try {
      const res = await fetch('/api/game-state');
      if (!res.ok) return;
      const data = await res.json();
      setGame(data.game);
      setLeaderboard(data.leaderboard ?? []);
      setPlayerCount(data.playerCount ?? 0);

      const cd = data.game?.countdown as Countdown | null;
      if (cd && !cd.applied) {
        cdRef.current = { startedAt: cd.startedAt, duration: cd.duration, scenarioId: cd.scenarioId };
      } else {
        cdRef.current = null;
      }
    } catch { /* ignore */ }
  }, [adminPw]);

  useEffect(() => {
    if (!adminPw) return;
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [poll, adminPw]);

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

  /* login */
  const handleLogin = async () => {
    if (!password.trim()) return;
    setLogging(true);
    setLoginError('');
    try {
      const res = await fetch('/api/game', {
        headers: { 'x-admin-password': password },
      });
      if (res.ok) {
        localStorage.setItem('divisas_admin_pw', password);
        setAdminPw(password);
      } else {
        setLoginError('Contraseña incorrecta');
      }
    } catch { setLoginError('Error de conexión'); }
    finally { setLogging(false); }
  };

  /* game controls */
  const gameAction = async (action: 'start' | 'end' | 'reset') => {
    if (!adminPw) return;
    const confirmMsg: Record<string, string> = {
      end: '¿Finalizar la partida? Los estudiantes verán el resultado final.',
      reset: '¿Reiniciar? Se borrará la partida actual y todos deberán volver a unirse.',
    };
    if (confirmMsg[action] && !confirm(confirmMsg[action])) return;

    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPw },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.ok) {
        setActionMsg({ ok: true, text: action === 'start' ? '¡Partida iniciada!' : action === 'end' ? 'Partida finalizada' : 'Partida reiniciada' });
        await poll();
      } else {
        setActionMsg({ ok: false, text: data.error });
      }
    } catch { setActionMsg({ ok: false, text: 'Error de conexión' }); }
    finally { setTimeout(() => setActionMsg(null), 3000); }
  };

  /* scenario actions */
  const scenarioAction = async (id: number, action: 'activate' | 'deactivate') => {
    if (!adminPw) return;
    try {
      const res = await fetch('/api/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPw },
        body: JSON.stringify({ scenarioId: id, action }),
      });
      const data = await res.json();
      if (!data.ok) {
        setActionMsg({ ok: false, text: data.error });
        setTimeout(() => setActionMsg(null), 4000);
      } else {
        await poll();
      }
    } catch { /* ignore */ }
  };

  const rates = game?.rates ?? BASE_RATES;
  const activeScenarios = (game?.activeScenarios ?? []) as number[];
  const cd = game?.countdown as Countdown | null;
  const pendingScenarioId = cd && !cd.applied ? cd.scenarioId : null;
  const countdownActive = countdownSecs > 0 && pendingScenarioId !== null;

  /* ── LOGIN ──────────────────────────────────────────────── */
  if (!adminPw) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <div className="text-center">
          <div className="text-4xl mb-2">🎓</div>
          <h1 className="text-2xl font-bold text-slate-100">Panel del Docente</h1>
          <p className="text-slate-400 text-sm mt-1">DivisasBO — Mercado de Divisas</p>
        </div>
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
          <input
            type="password"
            placeholder="Contraseña del docente"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          {loginError && (
            <p className="text-red-400 text-sm flex items-center gap-1">
              <AlertCircle size={14} /> {loginError}
            </p>
          )}
          <button
            onClick={handleLogin}
            disabled={logging || !password.trim()}
            className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {logging ? <RefreshCw size={16} className="animate-spin" /> : <LogIn size={16} />}
            Ingresar
          </button>
        </div>
      </div>
    );
  }

  /* ── DASHBOARD ──────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-4">
        <div className="font-bold text-lg text-slate-100">🎓 Panel del Docente</div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-sm">
          <Users size={14} className="text-slate-400" />
          <span className="text-slate-300 font-semibold">{playerCount}</span>
          <span className="text-slate-500">jugadores</span>
        </div>
        <div className={`text-xs font-bold px-3 py-1 rounded-full border ${
          !game ? 'border-slate-700 text-slate-500'
          : game.status === 'waiting' ? 'border-yellow-700 text-yellow-400 bg-yellow-950/40'
          : game.status === 'running' ? 'border-emerald-700 text-emerald-400 bg-emerald-950/40'
          : 'border-slate-700 text-slate-500'
        }`}>
          {!game ? 'Sin partida' : game.status === 'waiting' ? 'En espera' : game.status === 'running' ? '● En curso' : 'Finalizada'}
        </div>
        <button
          onClick={() => { localStorage.removeItem('divisas_admin_pw'); setAdminPw(null); }}
          className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
        >
          Salir
        </button>
      </header>

      <div className="flex-1 p-4 max-w-screen-xl mx-auto w-full flex flex-col gap-4">

        {/* Action message */}
        {actionMsg && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold ${
            actionMsg.ok ? 'bg-emerald-900/40 border border-emerald-800 text-emerald-400'
                         : 'bg-red-900/40 border border-red-800 text-red-400'
          }`}>
            {actionMsg.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {actionMsg.text}
          </div>
        )}

        {/* ── PASO 1: Iniciar partida (solo visible si no ha iniciado) ── */}
        {game && game.status === 'waiting' && (
          <div className="bg-emerald-950 border-2 border-emerald-600 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-base mb-1">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                PASO 1 — Iniciar la partida
              </div>
              <p className="text-slate-300 text-sm">
                {playerCount > 0
                  ? `${playerCount} estudiante${playerCount !== 1 ? 's' : ''} ya se unió. Cuando todos estén listos, inicia la partida.`
                  : 'Comparte la URL a tus compañeros y cuando estén listos, inicia la partida.'}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                Los estudiantes ingresan en: <strong className="text-slate-300">localhost:3000</strong>
              </p>
            </div>
            <button
              onClick={() => gameAction('start')}
              disabled={!game}
              className="shrink-0 flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg rounded-xl transition-colors shadow-lg shadow-emerald-900/50"
            >
              <Play size={22} /> INICIAR PARTIDA
            </button>
          </div>
        )}

        {/* ── PASO 2: Partida en curso ── */}
        {game && game.status === 'running' && (
          <div className="bg-sky-950 border border-sky-700 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-base mb-1">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse inline-block" />
                PARTIDA EN CURSO — {playerCount} jugadores activos
              </div>
              <p className="text-slate-400 text-sm">
                Activa los eventos de abajo uno por uno. Los estudiantes tienen <strong className="text-slate-300">1 minuto</strong> para decidir antes de que el precio cambie.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => gameAction('end')}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                <Square size={16} /> Finalizar
              </button>
              <button
                onClick={() => gameAction('reset')}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                <RotateCcw size={16} /> Reiniciar
              </button>
            </div>
          </div>
        )}

        {/* Controls + Rates row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Game controls secondary (only show reset if game ended) */}
          {game?.status === 'ended' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="text-sm font-semibold text-slate-300">La partida ha finalizado</div>
              <button
                onClick={() => gameAction('reset')}
                className="flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-bold"
              >
                <RotateCcw size={16} /> Nueva Partida
              </button>
            </div>
          )}

          {/* Current rates */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-sm font-semibold text-slate-300 mb-3">Tipos de Cambio Actuales</div>
            <div className="grid grid-cols-3 gap-3">
              {(['usd', 'eur', 'cny'] as Currency[]).map((c) => {
                const pct = pctChange(rates[c], BASE_RATES[c]);
                const up = pct >= 0;
                const flags: Record<Currency, string> = { usd: '🇺🇸', eur: '🇪🇺', cny: '🇨🇳' };
                return (
                  <div key={c} className="text-center">
                    <div className="text-xs text-slate-500 mb-1">{flags[c]} {c.toUpperCase()}</div>
                    <div className="text-lg font-bold text-slate-100">Bs {fmt(rates[c], 4)}</div>
                    <div className={`text-xs font-semibold flex items-center justify-center gap-0.5 ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                      {up ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {up ? '+' : ''}{fmt(pct, 2)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Countdown banner */}
        {countdownActive && (
          <div className="pulse-border border-2 border-red-600 bg-red-950/30 rounded-xl px-4 py-3 flex items-center gap-4">
            <div className="text-red-400 font-bold text-sm flex items-center gap-2">
              <span className="animate-ping w-2 h-2 rounded-full bg-red-500 inline-block" />
              EVENTO EN CURSO
            </div>
            <div className="flex-1 text-sm text-slate-200">
              {SCENARIOS.find((s) => s.id === pendingScenarioId)?.title}
            </div>
            <div className={`font-mono text-2xl font-bold ${countdownSecs < 15 ? 'text-red-400' : 'text-yellow-400'}`}>
              {fmtTime(countdownSecs)}
            </div>
          </div>
        )}

        {/* Scenarios grid */}
        <div className="flex items-center gap-3 mt-1">
          <div className="text-sm font-semibold text-slate-300">
            {game?.status === 'waiting'
              ? '⚠️ Primero inicia la partida (arriba) para poder activar eventos'
              : game?.status === 'running'
              ? '✅ PASO 2 — Activa los eventos uno por uno (los estudiantes tienen 1 min para decidir)'
              : 'Eventos del Mercado'}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {SCENARIOS.map((s) => {
            const isApplied = activeScenarios.includes(s.id);
            const isPending = pendingScenarioId === s.id;
            const isBlocked = countdownActive && !isPending;
            const isGameRunning = game?.status === 'running';

            return (
              <div
                key={s.id}
                className={`bg-slate-900 rounded-xl border p-4 flex flex-col gap-3 transition-all ${
                  isPending ? 'border-yellow-600'
                  : isApplied ? 'border-emerald-700'
                  : 'border-slate-800'
                }`}
              >
                {/* Title row */}
                <div className="flex items-start gap-2">
                  <span className="text-2xl mt-0.5">{s.icon}</span>
                  <div className="flex-1">
                    <div className="font-bold text-slate-100 text-sm leading-tight">{s.title}</div>
                    <span className="inline-block mt-1 text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                      {s.concept}
                    </span>
                  </div>
                  {(isApplied || isPending) && (
                    <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
                      isPending ? 'bg-yellow-900/50 text-yellow-400' : 'bg-emerald-900/50 text-emerald-400'
                    }`}>
                      {isPending ? '⏳ En curso' : '✓ Aplicado'}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 leading-relaxed">{s.description}</p>

                {/* Reflection question */}
                <div className="bg-slate-800 rounded-lg p-3 text-xs text-sky-300 italic leading-relaxed border-l-2 border-sky-600">
                  💭 {s.question}
                </div>

                {/* Market indicators */}
                <div className="grid grid-cols-3 gap-1 text-center">
                  {s.indicators.map((ind) => {
                    const arrows = ind.direction === 'up' ? '↑'.repeat(ind.intensity)
                      : ind.direction === 'down' ? '↓'.repeat(ind.intensity) : '→';
                    const color = ind.direction === 'up' ? 'text-emerald-400'
                      : ind.direction === 'down' ? 'text-red-400' : 'text-slate-500';
                    return (
                      <div key={ind.currency} className="bg-slate-800 rounded-lg py-2">
                        <div className="text-xs text-slate-500">{ind.currency.toUpperCase()}</div>
                        <div className={`text-sm font-bold ${color}`}>{arrows}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Effect badges (only for admin) */}
                <div className="flex flex-wrap gap-1">
                  {Object.entries(s.effects).map(([c, v]) => (
                    <EffectBadge key={c} currency={c} value={v} />
                  ))}
                  <span className="text-xs text-slate-600 ml-1 self-center">(efecto real)</span>
                </div>

                {/* Action button */}
                {isApplied ? (
                  <button
                    onClick={() => scenarioAction(s.id, 'deactivate')}
                    disabled={!isGameRunning || isPending}
                    className="w-full py-2.5 bg-red-900/50 hover:bg-red-900 border border-red-800 text-red-400 font-semibold text-sm rounded-lg disabled:opacity-40 transition-colors"
                  >
                    Desactivar evento
                  </button>
                ) : isPending ? (
                  <div className="w-full py-2.5 bg-yellow-900/30 border border-yellow-800 text-yellow-400 font-semibold text-sm rounded-lg text-center">
                    {fmtTime(countdownSecs)} — Los estudiantes están decidiendo
                  </div>
                ) : (
                  <button
                    onClick={() => scenarioAction(s.id, 'activate')}
                    disabled={!isGameRunning || isBlocked}
                    className={`w-full py-2.5 font-semibold text-sm rounded-lg transition-colors border ${
                      !isGameRunning
                        ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                        : isBlocked
                        ? 'bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-sky-700 hover:bg-sky-600 border-sky-600 text-white'
                    }`}
                  >
                    {!isGameRunning
                      ? '🔒 Inicia la partida primero'
                      : isBlocked
                      ? '⏳ Espera al evento actual...'
                      : '▶ Activar este evento'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Live leaderboard */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-800 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Trophy size={14} className="text-yellow-400" /> Clasificación en Vivo ({leaderboard.length} jugadores)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-800">
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Nombre</th>
                  <th className="px-4 py-2 text-right">BOB</th>
                  <th className="px-4 py-2 text-right">USD</th>
                  <th className="px-4 py-2 text-right">EUR</th>
                  <th className="px-4 py-2 text-right">CNY</th>
                  <th className="px-4 py-2 text-right font-bold">Total BOB</th>
                  <th className="px-4 py-2 text-right">G/P</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((e, i) => {
                  const pl = e.totalBob - INITIAL_BOB;
                  return (
                    <tr key={e.name} className="border-t border-slate-800 hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 text-slate-500 text-xs font-mono">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </td>
                      <td className="px-4 py-2.5 text-slate-200 font-medium">{e.name}</td>
                      <td className="px-4 py-2.5 text-right text-slate-400 font-mono text-xs">{fmt(e.portfolio.bob)}</td>
                      <td className="px-4 py-2.5 text-right text-sky-400 font-mono text-xs">{fmt(e.portfolio.usd, 4)}</td>
                      <td className="px-4 py-2.5 text-right text-violet-400 font-mono text-xs">{fmt(e.portfolio.eur, 4)}</td>
                      <td className="px-4 py-2.5 text-right text-amber-400 font-mono text-xs">{fmt(e.portfolio.cny, 4)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-100 font-bold">Bs {fmt(e.totalBob)}</td>
                      <td className={`px-4 py-2.5 text-right text-xs font-bold ${pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {pl >= 0 ? '+' : ''}Bs {fmt(pl)}
                      </td>
                    </tr>
                  );
                })}
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-600 text-sm">
                      Ningún estudiante se ha unido aún
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
