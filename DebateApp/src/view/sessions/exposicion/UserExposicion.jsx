import React, { useState, useEffect } from 'react';
import { socket } from '../../../socket';

const CriterioSlider = ({ criterio, value, onChange }) => (
  <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
    <div className="flex justify-between items-center mb-4">
      <label className="font-black uppercase text-sm tracking-wide">{criterio.nombre}</label>
      <span className="text-4xl font-black text-indigo-400 tabular-nums">{value}</span>
    </div>
    <input
      type="range"
      min="1"
      max="10"
      value={value}
      onChange={(e) => onChange(criterio.id, Number(e.target.value))}
      className="w-full accent-indigo-500 cursor-pointer"
    />
    <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-bold">
      <span>1</span>
      <span>5</span>
      <span>10</span>
    </div>
  </div>
);

const UserExposicion = () => {
  const [nombre, setNombre] = useState(() => localStorage.getItem('expo_nombre') || '');
  const [tempNombre, setTempNombre] = useState('');

  const [actividadIniciada, setActividadIniciada] = useState(false);
  const [criterios, setCriterios] = useState([]);
  const [expositorActual, setExpositorActual] = useState(null);
  const [votacionActiva, setVotacionActiva] = useState(false);
  const [votos, setVotos] = useState({});
  const [votoEnviado, setVotoEnviado] = useState(false);
  const [voteProgress, setVoteProgress] = useState({ votaron: 0, total: 0 });
  const [ranking, setRanking] = useState([]);
  const [fin, setFin] = useState(false);

  const soyExpositor = nombre && expositorActual?.nombre === nombre;

  useEffect(() => {
    if (nombre) localStorage.setItem('expo_nombre', nombre);
  }, [nombre]);

  useEffect(() => {
    socket.connect();
    socket.emit('join_room', { role: 'viewer', nombre });

    socket.on('expo_actividad_iniciada', ({ criterios: c }) => {
      setCriterios(c);
      setActividadIniciada(true);
      // Si ya tiene nombre (recarga), auto-registrarse
      const nombreGuardado = localStorage.getItem('expo_nombre');
      if (nombreGuardado) {
        socket.emit('expo_register', { nombre: nombreGuardado });
      }
    });

    socket.on('expo_state_sync', (state) => {
      if (state.criteriosActivos?.length > 0) {
        setCriterios(state.criteriosActivos);
        setActividadIniciada(true);
      }
      if (state.expositorActual) setExpositorActual(state.expositorActual);
      if (state.votacionActiva) setVotacionActiva(true);
      if (state.hasVoted) setVotoEnviado(true);
      if (state.resultados?.length > 0) setRanking(state.resultados);
    });

    socket.on('expo_expositor_seleccionado', ({ expositor }) => {
      setExpositorActual(expositor);
      setVotacionActiva(false);
      setVotoEnviado(false);
      setVotos({});
    });

    socket.on('expo_vote_started', ({ criterios: c }) => {
      setCriterios(c);
      setVotacionActiva(true);
      setVotoEnviado(false);
      // Inicializar todos los sliders en 5 (punto medio)
      const defaults = {};
      c.forEach(crit => { defaults[crit.id] = 5; });
      setVotos(defaults);
    });

    socket.on('expo_vote_progress', (data) => setVoteProgress(data));

    socket.on('expo_vote_ended', ({ ranking: r }) => {
      setRanking(r);
      setVotacionActiva(false);
      setExpositorActual(null);
    });

    socket.on('expo_actividad_terminada', ({ ranking: r }) => {
      setRanking(r);
      setFin(true);
    });

    socket.on('expo_reset', () => {
      localStorage.removeItem('expo_nombre');
      window.location.reload();
    });

    socket.on('clear_cache', () => {
      localStorage.removeItem('expo_nombre');
      window.location.reload();
    });

    return () => {
      socket.off('expo_actividad_iniciada');
      socket.off('expo_state_sync');
      socket.off('expo_expositor_seleccionado');
      socket.off('expo_vote_started');
      socket.off('expo_vote_progress');
      socket.off('expo_vote_ended');
      socket.off('expo_actividad_terminada');
      socket.off('expo_reset');
      socket.off('clear_cache');
    };
  }, []);

  const registrarse = (e) => {
    e.preventDefault();
    if (!tempNombre.trim()) return;
    const nuevoNombre = tempNombre.trim();
    setNombre(nuevoNombre);
    socket.emit('expo_register', { nombre: nuevoNombre });
  };

  const handleSlider = (criterioId, value) => {
    setVotos(prev => ({ ...prev, [criterioId]: value }));
  };

  const enviarVotos = () => {
    setVotoEnviado(true);
    socket.emit('expo_submit_vote', { nombre, criterios: votos });
  };

  const getBadge = (i) => ['👑', '🥈', '🥉'][i] ?? `#${i + 1}`;

  // ── Fin de actividad ──────────────────────────────────────────────────────
  if (fin) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 text-center overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-yellow-500/20 via-slate-900 to-slate-900" />
        <div className="z-10 animate-in slide-in-from-bottom duration-1000 w-full max-w-lg">
          <h1 className="text-5xl font-black italic tracking-tighter mb-4 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">
            🏆 RESULTADOS FINALES
          </h1>
          <p className="text-slate-400 mb-12 uppercase tracking-[0.3em] text-sm">Fin de la Actividad</p>

          <div className="space-y-3">
            {ranking.map((r, idx) => (
              <div
                key={r.expositor}
                className={`flex items-center justify-between p-5 rounded-2xl border ${
                  idx === 0
                    ? 'border-yellow-500/30 bg-yellow-500/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`text-2xl font-black w-8 ${idx === 0 ? 'text-yellow-500' : 'text-slate-500'}`}>
                    {getBadge(idx)}
                  </span>
                  <span className={`font-black uppercase ${idx === 0 ? 'text-yellow-400' : 'text-white'}`}>
                    {r.expositor}
                    {r.expositor === nombre && (
                      <span className="ml-2 text-indigo-400 text-xs font-bold normal-case">(Tú)</span>
                    )}
                  </span>
                </div>
                <span className={`font-black text-xl px-4 py-2 rounded-xl ${
                  idx === 0 ? 'bg-yellow-500 text-yellow-900' : 'bg-white/10 text-indigo-300'
                }`}>
                  {r.scoreGeneral.toFixed(1)}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="mt-12 text-slate-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-colors"
          >
            ← Salir al Inicio
          </button>
        </div>
      </div>
    );
  }

  // ── Siendo evaluado (expositor durante votación) ──────────────────────────
  if (soyExpositor && votacionActiva) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-6 animate-spin">⏳</div>
        <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-4 text-indigo-400">¡Gran Exposición!</h2>
        <p className="text-slate-400 mb-6">El público está evaluando tu presentación.</p>
        <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-full text-sm font-black text-slate-400">
          {voteProgress.votaron} / {voteProgress.total} han evaluado
        </div>
      </div>
    );
  }

  // ── Votando (participante evaluando al expositor) ─────────────────────────
  if (votacionActiva && !soyExpositor && nombre) {
    if (votoEnviado) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-emerald-500/20 border border-emerald-500 p-10 rounded-[3rem] backdrop-blur-md animate-in zoom-in duration-500 max-w-md w-full">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-3xl font-black text-emerald-400 uppercase tracking-widest">¡Evaluación Enviada!</p>
            <p className="text-emerald-100 text-sm mt-4">Tu puntaje fue registrado. Espera los resultados.</p>
            <div className="mt-6 text-slate-400 text-xs font-bold">
              {voteProgress.votaron} / {voteProgress.total} participantes han evaluado
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-900 text-white p-6 pb-32">
        <div className="max-w-lg mx-auto pt-10 space-y-4 animate-in slide-in-from-bottom duration-500">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black italic tracking-tighter text-indigo-400 mb-1">EVALÚA LA EXPOSICIÓN</h1>
            <p className="text-slate-400 text-sm uppercase tracking-widest">
              Evaluando a: <span className="text-white font-black">{expositorActual?.nombre}</span>
            </p>
          </div>

          {criterios.map(c => (
            <CriterioSlider
              key={c.id}
              criterio={c}
              value={votos[c.id] ?? 5}
              onChange={handleSlider}
            />
          ))}
        </div>

        <div className="fixed bottom-6 left-0 w-full px-6 pointer-events-none z-50">
          <button
            onClick={enviarVotos}
            className="pointer-events-auto w-full max-w-lg mx-auto block bg-indigo-600 hover:bg-indigo-500 text-white py-6 rounded-3xl font-black text-xl shadow-2xl transition-all active:scale-[0.98] uppercase tracking-widest"
          >
            Enviar Evaluación
          </button>
        </div>
      </div>
    );
  }

  // ── Expositor seleccionado (todos ven quién expone) ───────────────────────
  if (expositorActual && !votacionActiva) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-slate-900" />
        <div className="z-10 text-center w-full max-w-xl animate-in slide-in-from-bottom duration-700">
          <p className="text-indigo-400 text-sm font-black uppercase tracking-widest mb-6">Le toca exponer a</p>
          <div className={`p-12 rounded-[3rem] border mb-8 ${
            soyExpositor
              ? 'bg-indigo-500/20 border-indigo-500/40 shadow-[0_0_60px_rgba(99,102,241,0.2)]'
              : 'bg-white/5 border-white/10'
          }`}>
            <h2 className={`text-6xl font-black uppercase tracking-tighter ${soyExpositor ? 'text-indigo-300' : 'text-white'}`}>
              {expositorActual.nombre}
            </h2>
            {soyExpositor && (
              <p className="text-indigo-400 font-black uppercase tracking-widest text-sm mt-4 animate-pulse">
                ¡Eres tú! Prepárate para exponer
              </p>
            )}
          </div>
          {!soyExpositor && (
            <p className="text-slate-400 text-sm tracking-widest uppercase">Presta atención a la exposición</p>
          )}
        </div>
      </div>
    );
  }

  // ── Registrado, esperando siguiente ronda ─────────────────────────────────
  if (nombre && actividadIniciada) {
    return (
      <div className="min-h-screen bg-indigo-600 text-white p-6 flex flex-col items-center justify-center text-center">
        <div className="bg-white/10 p-10 rounded-[3rem] backdrop-blur-md border border-white/20 shadow-2xl max-w-sm w-full">
          <div className="text-5xl mb-6 animate-bounce">📡</div>
          <h2 className="text-3xl font-black mb-2 uppercase italic tracking-tighter">¡Registrado!</h2>
          <p className="text-indigo-100 mb-6 max-w-xs mx-auto text-sm">
            Atento a la pantalla. El anfitrión seleccionará al próximo expositor.
          </p>
          <div className="bg-white/20 text-white text-sm font-black py-2 px-6 rounded-full inline-block uppercase tracking-widest">
            {nombre}
          </div>

          {ranking.length > 0 && (
            <div className="mt-8 space-y-2 text-left">
              <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-3 text-center">
                Ranking actual
              </p>
              {ranking.slice(0, 3).map((r, idx) => (
                <div key={r.expositor} className="flex items-center justify-between bg-white/10 px-4 py-3 rounded-xl text-sm">
                  <span className="font-bold">
                    {['👑', '🥈', '🥉'][idx]} {r.expositor}
                    {r.expositor === nombre && (
                      <span className="ml-1 text-indigo-200 text-xs">(Tú)</span>
                    )}
                  </span>
                  <span className="font-black text-indigo-200">{r.scoreGeneral.toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Registro ──────────────────────────────────────────────────────────────
  if (actividadIniciada && !nombre) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
        <form onSubmit={registrarse} className="max-w-md w-full space-y-6 animate-in zoom-in duration-300">
          <h1 className="text-4xl font-black italic tracking-tighter text-center">EXPOSICIONES</h1>
          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-xl text-center shadow-xl">
            <label className="block text-xs font-bold uppercase tracking-widest text-indigo-400 mb-4">
              Tu nombre o Alias
            </label>
            <input
              autoFocus
              className="w-full bg-transparent border-b-2 border-white/20 text-3xl font-bold py-4 outline-none focus:border-indigo-500 transition-all text-center"
              value={tempNombre}
              onChange={(e) => setTempNombre(e.target.value)}
              placeholder="Escribe aquí..."
              required
            />
            <button className="w-full mt-8 bg-indigo-600 py-4 rounded-2xl font-black hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 uppercase tracking-widest text-sm">
              Unirse a la Actividad
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Esperando que el admin inicie la actividad ────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-6 animate-pulse">🎤</div>
      <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-4 text-indigo-400">Preparando la Sala</h2>
      <p className="text-slate-400 text-sm tracking-widest uppercase">El anfitrión está configurando la actividad...</p>
    </div>
  );
};

export default UserExposicion;
