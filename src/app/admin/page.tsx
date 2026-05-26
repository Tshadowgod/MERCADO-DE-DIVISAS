'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Square, RotateCcw, Users, TrendingUp, TrendingDown,
  RefreshCw, LogIn, CheckCircle2, AlertCircle, Trophy, ChevronUp, ChevronDown, UserX,
} from 'lucide-react';
import type { GameState, LeaderboardEntry, Currency, Countdown } from '@/types';
import { SCENARIOS, BASE_RATES, INITIAL_BOB } from '@/lib/scenarios';
import { pctChange } from '@/lib/game-logic';

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
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full border ${
      up ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400'
         : 'bg-red-400/10 border-red-400/20 text-red-400'
    }`}>
      {up ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      {up ? '+' : ''}{value}% {currency.toUpperCase()}
    </span>
  );
}

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

  useEffect(() => {
    const pw = localStorage.getItem('divisas_admin_pw');
    if (pw) setAdminPw(pw);
  }, []);

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

  const handleLogin = async () => {
    if (!password.trim()) return;
    setLogging(true);
    setLoginError('');
    try {
      const res = await fetch('/api/game', { headers: { 'x-admin-password': password } });
      if (res.ok) {
        localStorage.setItem('divisas_admin_pw', password);
        setAdminPw(password);
      } else {
        setLoginError('Contraseña incorrecta');
      }
    } catch { setLoginError('Error de conexión'); }
    finally { setLogging(false); }
  };

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

  const kickPlayer = async (playerId: number, playerName: string) => {
    if (!adminPw) return;
    if (!confirm(`¿Sacar a "${playerName}" de la partida?`)) return;
    try {
      const res = await fetch('/api/player', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPw },
        body: JSON.stringify({ playerId }),
      });
      const data = await res.json();
      if (data.ok) {
        setActionMsg({ ok: true, text: `"${playerName}" fue removido de la partida.` });
        setTimeout(() => setActionMsg(null), 3000);
        await poll();
      }
    } catch { /* ignore */ }
  };

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

  /* ── LOGIN ── */
  if (!adminPw) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <div className="text-center">
          <div className="text-4xl mb-3">🎓</div>
          <h1 className="text-2xl font-bold gradient-text">Panel del Docente</h1>
          <p className="text-white/35 text-sm mt-1">DivisasBO — Mercado de Divisas</p>
        </div>
        <div className="glass w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4">
          <input
            type="password"
            placeholder="Contraseña del docente"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full bg-white/[0.06] border border-white/[0.12] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-sky-400/60 transition-all"
          />
          {loginError && (
            <p className="text-red-400 text-sm flex items-center gap-1.5">
              <AlertCircle size={14} /> {loginError}
            </p>
          )}
          <button
            onClick={handleLogin}
            disabled={logging || !password.trim()}
            className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-500/25"
          >
            {logging ? <RefreshCw size={16} className="animate-spin" /> : <LogIn size={16} />}
            Ingresar
          </button>
        </div>
      </div>
    );
  }

  /* ── DASHBOARD ── */
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/40 backdrop-blur-2xl border-b border-white/[0.07] px-4 py-3 flex items-center gap-4">
        <div className="font-bold text-base text-white/90">🎓 Panel del Docente</div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Users size={13} />
          <span className="text-white/70 font-semibold">{playerCount}</span>
          <span>jugadores</span>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
          !game ? 'border-white/[0.10] text-white/30'
          : game.status === 'waiting' ? 'border-yellow-400/30 text-yellow-400 bg-yellow-400/10'
          : game.status === 'running' ? 'border-emerald-400/30 text-emerald-400 bg-emerald-400/10'
          : 'border-white/[0.10] text-white/30'
        }`}>
          {!game ? 'Sin partida' : game.status === 'waiting' ? 'En espera' : game.status === 'running' ? '● En curso' : 'Finalizada'}
        </span>
        <button
          onClick={() => { localStorage.removeItem('divisas_admin_pw'); setAdminPw(null); }}
          className="text-xs text-white/25 hover:text-white/50 transition-colors"
        >
          Salir
        </button>
      </header>

      <div className="flex-1 p-4 max-w-screen-xl mx-auto w-full flex flex-col gap-4">

        {/* Action message */}
        {actionMsg && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border ${
            actionMsg.ok
              ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400'
              : 'bg-red-400/10 border-red-400/20 text-red-400'
          }`}>
            {actionMsg.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {actionMsg.text}
          </div>
        )}

        {/* PASO 1 — Iniciar */}
        {game && game.status === 'waiting' && (
          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.07] backdrop-blur-xl p-5 flex flex-col sm:flex-row items-center gap-4 shadow-xl shadow-black/30">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-400 text-black text-xs flex items-center justify-center font-black">1</span>
                PASO 1 — Iniciar la partida
              </div>
              <p className="text-white/60 text-sm">
                {playerCount > 0
                  ? `${playerCount} estudiante${playerCount !== 1 ? 's' : ''} ya se unió. Cuando todos estén listos, inicia la partida.`
                  : 'Comparte la URL a tus compañeros y cuando estén listos, inicia la partida.'}
              </p>
            </div>
            <button
              onClick={() => gameAction('start')}
              className="shrink-0 flex items-center gap-2 px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-base rounded-xl transition-all shadow-lg shadow-emerald-500/25"
            >
              <Play size={20} /> INICIAR PARTIDA
            </button>
          </div>
        )}

        {/* PASO 2 — En curso */}
        {game && game.status === 'running' && (
          <div className="rounded-2xl border border-sky-400/20 bg-sky-500/[0.07] backdrop-blur-xl p-4 flex flex-col sm:flex-row items-center gap-4 shadow-xl shadow-black/30">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm mb-1">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse inline-block" />
                PARTIDA EN CURSO — {playerCount} jugadores activos
              </div>
              <p className="text-white/50 text-xs">
                Activa los eventos uno por uno. Los estudiantes tienen <strong className="text-white/70">1 minuto</strong> para decidir antes de que el precio cambie.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => gameAction('end')}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500/80 hover:bg-red-500 text-white font-semibold rounded-xl transition-all text-sm shadow-lg shadow-red-500/20"
              >
                <Square size={14} /> Finalizar
              </button>
              <button
                onClick={() => gameAction('reset')}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.08] hover:bg-white/[0.13] border border-white/[0.10] text-white/70 font-semibold rounded-xl transition-all text-sm"
              >
                <RotateCcw size={14} /> Reiniciar
              </button>
            </div>
          </div>
        )}

        {/* Rates + ended controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {game?.status === 'ended' && (
            <div className="glass rounded-2xl p-4 flex flex-col gap-3">
              <div className="text-sm font-semibold text-white/60">La partida ha finalizado</div>
              <button
                onClick={() => gameAction('reset')}
                className="flex items-center justify-center gap-2 py-3 bg-white/[0.08] hover:bg-white/[0.13] border border-white/[0.10] text-white font-bold rounded-xl transition-all"
              >
                <RotateCcw size={15} /> Nueva Partida
              </button>
            </div>
          )}
          <div className={`glass rounded-2xl p-4 ${game?.status === 'ended' ? '' : 'md:col-span-2'}`}>
            <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Tipos de Cambio Actuales</div>
            <div className="grid grid-cols-3 gap-4">
              {(['usd', 'eur', 'cny'] as Currency[]).map((c) => {
                const pct = pctChange(rates[c], BASE_RATES[c]);
                const up = pct >= 0;
                const flags: Record<Currency, string> = { usd: '🇺🇸', eur: '🇪🇺', cny: '🇨🇳' };
                const colors: Record<Currency, string> = { usd: 'text-sky-300', eur: 'text-violet-300', cny: 'text-amber-300' };
                return (
                  <div key={c} className="text-center">
                    <div className="text-xs text-white/35 mb-1">{flags[c]} {c.toUpperCase()}</div>
                    <div className={`text-xl font-bold ${colors[c]}`}>Bs {fmt(rates[c], 4)}</div>
                    <div className={`text-xs font-bold flex items-center justify-center gap-0.5 mt-0.5 ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                      {up ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
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
          <div className="pulse-border border-2 border-red-400/50 bg-red-500/[0.08] backdrop-blur-xl rounded-2xl px-4 py-3 flex items-center gap-4">
            <div className="text-red-400 font-bold text-xs flex items-center gap-2 uppercase tracking-wider">
              <span className="animate-ping w-2 h-2 rounded-full bg-red-500 inline-block" />
              Evento en curso
            </div>
            <div className="flex-1 text-sm text-white/80">
              {SCENARIOS.find((s) => s.id === pendingScenarioId)?.title}
            </div>
            <div className={`font-mono text-2xl font-bold ${countdownSecs < 15 ? 'text-red-400' : 'text-yellow-400'}`}>
              {fmtTime(countdownSecs)}
            </div>
          </div>
        )}

        {/* Scenarios header */}
        <div className="text-xs font-bold text-white/40 uppercase tracking-wider">
          {game?.status === 'waiting'
            ? '⚠️  Primero inicia la partida para poder activar eventos'
            : game?.status === 'running'
            ? '✅  PASO 2 — Activa los eventos uno por uno'
            : 'Eventos del Mercado'}
        </div>

        {/* Scenarios grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {SCENARIOS.map((s) => {
            const isApplied = activeScenarios.includes(s.id);
            const isPending = pendingScenarioId === s.id;
            const isBlocked = countdownActive && !isPending;
            const isGameRunning = game?.status === 'running';

            return (
              <div
                key={s.id}
                className={`rounded-2xl border backdrop-blur-xl p-4 flex flex-col gap-3 transition-all shadow-xl shadow-black/25 ${
                  isPending ? 'bg-yellow-500/[0.07] border-yellow-400/25'
                  : isApplied ? 'bg-emerald-500/[0.07] border-emerald-400/20'
                  : 'bg-white/[0.04] border-white/[0.08]'
                }`}
              >
                {/* Title */}
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{s.icon}</span>
                  <div className="flex-1">
                    <div className="font-bold text-white/90 text-sm leading-tight">{s.title}</div>
                    <span className="inline-block mt-1.5 text-[11px] bg-white/[0.06] border border-white/[0.08] text-white/45 px-2 py-0.5 rounded-full">
                      {s.concept}
                    </span>
                  </div>
                  {(isApplied || isPending) && (
                    <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full border ${
                      isPending
                        ? 'bg-yellow-400/10 border-yellow-400/25 text-yellow-400'
                        : 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400'
                    }`}>
                      {isPending ? '⏳ En curso' : '✓ Aplicado'}
                    </span>
                  )}
                </div>

                <p className="text-xs text-white/45 leading-relaxed">{s.description}</p>

                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-xs text-sky-300 italic leading-relaxed border-l-2 border-sky-400/40">
                  💭 {s.question}
                </div>

                {/* Indicators (admin only) */}
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  {s.indicators.map((ind) => {
                    const arrows = ind.direction === 'up' ? '↑'.repeat(ind.intensity)
                      : ind.direction === 'down' ? '↓'.repeat(ind.intensity) : '→';
                    const color = ind.direction === 'up' ? 'text-emerald-400'
                      : ind.direction === 'down' ? 'text-red-400' : 'text-white/30';
                    return (
                      <div key={ind.currency} className="bg-white/[0.04] border border-white/[0.07] rounded-xl py-2">
                        <div className="text-[10px] text-white/35 uppercase tracking-wider">{ind.currency}</div>
                        <div className={`text-sm font-bold ${color}`}>{arrows}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Effect badges */}
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(s.effects).map(([c, v]) => (
                    <EffectBadge key={c} currency={c} value={v} />
                  ))}
                  <span className="text-[11px] text-white/25 self-center ml-1">efecto real</span>
                </div>

                {/* Action button */}
                {isApplied ? (
                  <button
                    onClick={() => scenarioAction(s.id, 'deactivate')}
                    disabled={!isGameRunning || isPending}
                    className="w-full py-2.5 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 text-red-400 font-semibold text-sm rounded-xl disabled:opacity-40 transition-all"
                  >
                    Desactivar evento
                  </button>
                ) : isPending ? (
                  <div className="w-full py-2.5 bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 font-semibold text-sm rounded-xl text-center">
                    {fmtTime(countdownSecs)} — Estudiantes decidiendo...
                  </div>
                ) : (
                  <button
                    onClick={() => scenarioAction(s.id, 'activate')}
                    disabled={!isGameRunning || isBlocked}
                    className={`w-full py-2.5 font-semibold text-sm rounded-xl transition-all border ${
                      !isGameRunning
                        ? 'bg-white/[0.03] border-white/[0.07] text-white/25 cursor-not-allowed'
                        : isBlocked
                        ? 'bg-white/[0.03] border-white/[0.07] text-white/30 cursor-not-allowed'
                        : 'bg-sky-500/80 hover:bg-sky-500 border-sky-400/40 text-white shadow-lg shadow-sky-500/20'
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
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-white/[0.04] border-b border-white/[0.07] flex items-center gap-2 text-xs font-bold text-white/50 uppercase tracking-wider">
            <Trophy size={13} className="text-yellow-400" /> Clasificación en Vivo ({leaderboard.length} jugadores)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/25 border-b border-white/[0.06] uppercase tracking-wider">
                  <th className="px-4 py-2.5 text-left">#</th>
                  <th className="px-4 py-2.5 text-left">Nombre</th>
                  <th className="px-4 py-2.5 text-right">BOB</th>
                  <th className="px-4 py-2.5 text-right">USD</th>
                  <th className="px-4 py-2.5 text-right">EUR</th>
                  <th className="px-4 py-2.5 text-right">CNY</th>
                  <th className="px-4 py-2.5 text-right font-bold">Total BOB</th>
                  <th className="px-4 py-2.5 text-right">G/P</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((e, i) => {
                  const pl = e.totalBob - INITIAL_BOB;
                  return (
                    <tr key={e.name} className="border-t border-white/[0.05] hover:bg-white/[0.03] transition-colors group">
                      <td className="px-4 py-2.5 text-white/30 font-mono">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </td>
                      <td className="px-4 py-2.5 text-white/75 font-medium">{e.name}</td>
                      <td className="px-4 py-2.5 text-right text-white/40 font-mono">{fmt(e.portfolio.bob)}</td>
                      <td className="px-4 py-2.5 text-right text-sky-400 font-mono">{fmt(e.portfolio.usd, 4)}</td>
                      <td className="px-4 py-2.5 text-right text-violet-400 font-mono">{fmt(e.portfolio.eur, 4)}</td>
                      <td className="px-4 py-2.5 text-right text-amber-400 font-mono">{fmt(e.portfolio.cny, 4)}</td>
                      <td className="px-4 py-2.5 text-right text-white font-bold">Bs {fmt(e.totalBob)}</td>
                      <td className={`px-4 py-2.5 text-right font-bold ${pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {pl >= 0 ? '+' : ''}Bs {fmt(pl)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => kickPlayer(e.id, e.name)}
                          title={`Sacar a ${e.name}`}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-400/10 hover:bg-red-400/25 border border-red-400/20 text-red-400 transition-all"
                        >
                          <UserX size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-white/25">
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
