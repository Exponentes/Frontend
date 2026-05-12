import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../../../socket';

const AdminExposicion = () => {
  const navigate = useNavigate();

  const [fase, setFase] = useState('configuracion');
  // configuracion | sala | presentando | votacion | resultados

  const [criterios, setCriterios] = useState([{ id: Date.now(), nombre: '' }]);
  const [showSaveMsg, setShowSaveMsg] = useState(false);

  const [ideas, setIdeas] = useState([{ id: Date.now(), texto: '' }]);
  const [showIdeasSaveMsg, setShowIdeasSaveMsg] = useState(false);
  const [ideaActual, setIdeaActual] = useState(null);

  const [disponibles, setDisponibles] = useState([]);
  const [expuestos, setExpuestos] = useState([]);
  const [expositorActual, setExpositorActual] = useState(null);
  const [rondaActual, setRondaActual] = useState(0);

  const [voteProgress, setVoteProgress] = useState({ votaron: 0, total: 0 });

  const [ranking, setRanking] = useState([]);
  const [usuarioDetalle, setUsuarioDetalle] = useState(null);
  const [actividadTerminada, setActividadTerminada] = useState(false);

  useEffect(() => {
    socket.connect();
    socket.emit('join_room', { role: 'admin' });
    socket.emit('expo_get_criterios');
    socket.emit('expo_get_ideas');

    socket.on('expo_criterios', (data) => {
      if (data && data.length > 0) setCriterios(data.map(c => ({ ...c })));
    });

    socket.on('expo_criterios_saved', () => {
      setShowSaveMsg(true);
      setTimeout(() => setShowSaveMsg(false), 3000);
    });

    socket.on('expo_ideas', (data) => {
      if (data && data.length > 0) setIdeas(data.map((texto, idx) => ({ id: idx + 1, texto })));
    });

    socket.on('expo_ideas_saved', () => {
      setShowIdeasSaveMsg(true);
      setTimeout(() => setShowIdeasSaveMsg(false), 3000);
    });

    socket.on('expo_update_users', ({ disponibles: d, expuestos: e }) => {
      setDisponibles(d);
      setExpuestos(e);
    });

    socket.on('expo_expositor_seleccionado', ({ expositor, ronda, idea }) => {
      setExpositorActual(expositor);
      setRondaActual(ronda);
      setIdeaActual(idea || null);
      setFase('presentando');
    });

    socket.on('expo_vote_progress', (data) => setVoteProgress(data));

    socket.on('expo_vote_ended', ({ resultado, ranking: r }) => {
      setRanking(r);
      setUsuarioDetalle(resultado);
      setFase('resultados');
    });

    socket.on('expo_user_detail', (resultado) => setUsuarioDetalle(resultado));

    socket.on('expo_actividad_terminada', ({ ranking: r }) => {
      setRanking(r);
      setActividadTerminada(true);
      setFase('resultados');
    });

    socket.on('expo_reset', () => {
      setCriterios([{ id: Date.now(), nombre: '' }]);
      setIdeas([{ id: Date.now(), texto: '' }]);
      setIdeaActual(null);
      setDisponibles([]);
      setExpuestos([]);
      setExpositorActual(null);
      setRondaActual(0);
      setVoteProgress({ votaron: 0, total: 0 });
      setRanking([]);
      setUsuarioDetalle(null);
      setActividadTerminada(false);
      setFase('configuracion');
    });

    return () => {
      socket.off('expo_criterios');
      socket.off('expo_criterios_saved');
      socket.off('expo_ideas');
      socket.off('expo_ideas_saved');
      socket.off('expo_update_users');
      socket.off('expo_expositor_seleccionado');
      socket.off('expo_vote_progress');
      socket.off('expo_vote_ended');
      socket.off('expo_user_detail');
      socket.off('expo_actividad_terminada');
      socket.off('expo_reset');
    };
  }, []);

  const guardarCriterios = () => {
    const validos = criterios.filter(c => c.nombre.trim());
    if (validos.length === 0) return alert('Agrega al menos un criterio de evaluación.');
    socket.emit('expo_save_criterios', validos);
  };

  const iniciarActividad = () => {
    const validos = criterios.filter(c => c.nombre.trim());
    if (validos.length === 0) return alert('Agrega al menos un criterio de evaluación.');
    socket.emit('expo_iniciar_actividad', { criterios: validos });
    setFase('sala');
  };

  const seleccionarExpositor = () => socket.emit('expo_seleccionar_expositor', {});

  const iniciarVotacion = () => {
    setVoteProgress({ votaron: 0, total: 0 });
    socket.emit('expo_start_vote', {});
    setFase('votacion');
  };

  const cerrarVotacion = () => socket.emit('expo_end_vote', {});

  const nuevaRonda = () => {
    socket.emit('expo_nueva_ronda', {});
    setExpositorActual(null);
    setUsuarioDetalle(null);
    setIdeaActual(null);
    setFase('sala');
  };

  const guardarIdeas = () => {
    const validas = ideas.filter(i => i.texto.trim()).map(i => i.texto.trim());
    socket.emit('expo_save_ideas', validas);
  };

  const verDetalle = (nombre) => socket.emit('expo_select_user_detail', { nombre });

  const getBadge = (i) => ['👑', '🥈', '🥉'][i] ?? `#${i + 1}`;

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans overflow-hidden">

      {/* ── Overlay superior ─────────────────────────────────────────────────── */}
      <div className="absolute top-0 w-full p-8 flex justify-between items-start pointer-events-none z-50">

        {/* SIDEBAR IZQUIERDO */}
        {fase !== 'configuracion' && (
          <div className="flex flex-col gap-4 pointer-events-auto w-72">

            {/* Ronda */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Ronda</p>
              <span className="text-4xl font-black">{rondaActual}</span>
            </div>

            {/* Contadores + progreso votación */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl">
              <div className="flex justify-between mb-3">
                <div>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Disponibles</p>
                  <span className="text-3xl font-black">{disponibles.length}</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Expuestos</p>
                  <span className="text-3xl font-black text-slate-500">{expuestos.length}</span>
                </div>
              </div>
              {fase === 'votacion' && (
                <div className="border-t border-white/10 pt-3 mt-1">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Votos Recibidos</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: voteProgress.total > 0 ? `${(voteProgress.votaron / voteProgress.total) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-sm font-black text-emerald-400 tabular-nums">
                      {voteProgress.votaron}/{voteProgress.total}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Botones de control por fase */}
            {fase === 'presentando' && (
              <button
                onClick={iniciarVotacion}
                className="bg-indigo-600 hover:bg-indigo-500 py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20"
              >
                Iniciar Votación 🗳️
              </button>
            )}
            {fase === 'votacion' && (
              <button
                onClick={cerrarVotacion}
                className="bg-red-500 hover:bg-red-400 py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all animate-pulse shadow-xl shadow-red-500/20"
              >
                Cerrar Votación
              </button>
            )}
            {fase === 'resultados' && !actividadTerminada && (
              <button
                onClick={nuevaRonda}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20"
              >
                Nueva Ronda →
              </button>
            )}
            {fase === 'resultados' && (
              <button
                onClick={() => socket.emit('expo_mostrar_resultados', {})}
                className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-yellow-500/20"
              >
                Mostrar Resultados 🏆
              </button>
            )}
          </div>
        )}

        {/* Título top-right */}
        <div className="text-right pointer-events-auto absolute top-8 right-8">
          <h1 className="text-5xl font-black italic tracking-tighter leading-none">EXPO<br/>SICIONES</h1>
          <p className="text-indigo-400 font-bold text-[10px] mt-2 uppercase tracking-widest">Panel de Host</p>
        </div>
      </div>

      {/* ── Contenido principal ──────────────────────────────────────────────── */}
      <div className={`min-h-screen flex justify-center p-20 overflow-y-auto ${fase !== 'configuracion' ? 'items-center pl-96 pt-32' : 'items-start pt-24'}`}>
        <div className="w-full max-w-5xl">

          {/* ── CONFIGURACIÓN ─────────────────────────────────────────────────── */}
          {fase === 'configuracion' && (
            <div className="space-y-6 w-full animate-in slide-in-from-bottom duration-500 pb-10">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[3rem] p-12 w-full">
              <h2 className="text-4xl font-black mb-2 uppercase">Criterios de Evaluación</h2>
              <p className="text-slate-400 font-medium mb-8">Define los aspectos que los participantes evaluarán durante cada exposición.</p>

              <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-4 custom-scrollbar mb-8">
                {criterios.map((c, idx) => (
                  <div key={c.id} className="bg-white/5 border border-white/10 p-5 rounded-3xl flex items-center gap-4">
                    <span className="text-slate-500 font-black text-sm w-6 text-center shrink-0">{idx + 1}</span>
                    <input
                      value={c.nombre}
                      onChange={(e) => {
                        const next = [...criterios];
                        next[idx] = { ...next[idx], nombre: e.target.value };
                        setCriterios(next);
                      }}
                      className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl p-4 text-white placeholder-slate-600 focus:border-indigo-500 outline-none transition-colors font-bold text-lg"
                      placeholder="Ej: Contacto visual"
                    />
                    {criterios.length > 1 && (
                      <button
                        onClick={() => setCriterios(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-500 hover:text-red-500 font-bold text-[10px] uppercase tracking-widest transition-colors shrink-0"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setCriterios(prev => [...prev, { id: Date.now(), nombre: '' }])}
                  className="w-1/4 bg-white/5 hover:bg-white/10 border border-white/10 py-5 rounded-3xl font-black uppercase tracking-widest text-sm transition-all text-slate-300"
                >
                  + Criterio
                </button>
                <div className="flex-1 flex gap-4 relative">
                  <button
                    onClick={guardarCriterios}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 py-5 rounded-3xl font-black uppercase tracking-widest text-sm transition-all text-white border border-slate-600"
                  >
                    💾 Guardar en Disco
                  </button>
                  <button
                    onClick={iniciarActividad}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-5 rounded-3xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-indigo-600/20 text-white"
                  >
                    Iniciar Actividad 🚀
                  </button>
                  {showSaveMsg && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-black px-4 py-2 rounded-lg animate-bounce shadow-lg shadow-emerald-500/50">
                      ¡Criterios Guardados!
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── PANEL DE IDEAS ──────────────────────────────────────────────── */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[3rem] p-12 w-full">
              <h2 className="text-4xl font-black mb-2 uppercase">Ideas / Temas</h2>
              <p className="text-slate-400 font-medium mb-8">
                Temas asignados al azar a cada expositor. Se agotan antes de repetirse.
              </p>

              <div className="space-y-4 max-h-[35vh] overflow-y-auto pr-4 custom-scrollbar mb-8">
                {ideas.map((idea, idx) => (
                  <div key={idea.id} className="bg-white/5 border border-white/10 p-5 rounded-3xl flex items-center gap-4">
                    <span className="text-slate-500 font-black text-sm w-6 text-center shrink-0">{idx + 1}</span>
                    <input
                      value={idea.texto}
                      onChange={(e) => {
                        const next = [...ideas];
                        next[idx] = { ...next[idx], texto: e.target.value };
                        setIdeas(next);
                      }}
                      className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl p-4 text-white placeholder-slate-600 focus:border-indigo-500 outline-none transition-colors font-bold text-lg"
                      placeholder="Ej: La inteligencia artificial en la educación"
                    />
                    {ideas.length > 1 && (
                      <button
                        onClick={() => setIdeas(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-500 hover:text-red-500 font-bold text-[10px] uppercase tracking-widest transition-colors shrink-0"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-4 relative">
                <button
                  onClick={() => setIdeas(prev => [...prev, { id: Date.now(), texto: '' }])}
                  className="w-1/4 bg-white/5 hover:bg-white/10 border border-white/10 py-5 rounded-3xl font-black uppercase tracking-widest text-sm transition-all text-slate-300"
                >
                  + Idea
                </button>
                <div className="flex-1 relative">
                  <button
                    onClick={guardarIdeas}
                    className="w-full bg-slate-700 hover:bg-slate-600 py-5 rounded-3xl font-black uppercase tracking-widest text-sm transition-all text-white border border-slate-600"
                  >
                    💾 Guardar Ideas
                  </button>
                  {showIdeasSaveMsg && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-black px-4 py-2 rounded-lg animate-bounce shadow-lg shadow-emerald-500/50 whitespace-nowrap">
                      ¡Ideas Guardadas!
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>
          )}

          {/* ── SALA ──────────────────────────────────────────────────────────── */}
          {fase === 'sala' && (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[3rem] p-12 animate-in slide-in-from-bottom duration-500">
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h2 className="text-4xl font-black mb-2">PARTICIPANTES</h2>
                  <p className="text-slate-400 font-medium">Usuarios registrados en la actividad</p>
                </div>
                <span className="text-5xl font-black text-indigo-500">{disponibles.length}</span>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-12 max-h-[25vh] overflow-y-auto pr-4 custom-scrollbar">
                {disponibles.map((nombre, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-2xl animate-in zoom-in duration-300">
                    <p className="text-xs text-indigo-400 font-black mb-1 uppercase tracking-tighter">Disponible</p>
                    <p className="font-bold truncate text-lg uppercase">{nombre}</p>
                  </div>
                ))}
                {disponibles.length === 0 && (
                  <p className="col-span-4 text-center text-slate-500 text-sm py-8">Esperando participantes...</p>
                )}
              </div>

              <button
                onClick={seleccionarExpositor}
                disabled={disponibles.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-500 py-8 rounded-[2rem] text-2xl font-black uppercase tracking-widest transition-all shadow-2xl shadow-indigo-600/20 disabled:opacity-20 transform active:scale-[0.98]"
              >
                🎲 Seleccionar Expositor al Azar
              </button>
            </div>
          )}

          {/* ── PRESENTANDO ───────────────────────────────────────────────────── */}
          {fase === 'presentando' && expositorActual && (
            <div className="animate-in slide-in-from-bottom duration-700 w-full max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <span className="bg-white/10 text-white/50 px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest border border-white/10">
                  Ronda {rondaActual}
                </span>
              </div>
              <div className="text-center p-16 bg-gradient-to-b from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-[3rem]">
                <p className="text-indigo-400 text-xs font-black mb-4 uppercase tracking-widest">Le toca exponer a</p>
                <h3 className="text-7xl font-black uppercase tracking-tighter mb-8">{expositorActual.nombre}</h3>
                {ideaActual && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl px-8 py-5 mb-6 inline-block">
                    <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-2">Tema Asignado</p>
                    <p className="text-xl font-bold text-white">{ideaActual}</p>
                  </div>
                )}
                <p className="text-slate-400 text-sm tracking-widest uppercase">
                  Presiona "Iniciar Votación" en el panel izquierdo cuando termine
                </p>
              </div>
            </div>
          )}

          {/* ── VOTACIÓN ACTIVA ────────────────────────────────────────────────── */}
          {fase === 'votacion' && expositorActual && (
            <div className="animate-in slide-in-from-bottom duration-500 w-full max-w-3xl mx-auto text-center">
              <p className="text-indigo-400 text-xs font-black mb-4 uppercase tracking-widest">Evaluando a</p>
              <h3 className="text-6xl font-black uppercase tracking-tighter mb-4">{expositorActual.nombre}</h3>
              {ideaActual && (
                <p className="text-slate-400 text-sm mb-12">
                  Tema: <span className="text-white font-bold">{ideaActual}</span>
                </p>
              )}
              {!ideaActual && <div className="mb-12" />}

              <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem]">
                <p className="text-slate-400 font-black text-sm uppercase tracking-widest mb-6">Progreso de votación</p>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex-1 bg-white/10 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-4 rounded-full transition-all duration-500 shadow-lg shadow-emerald-400/30"
                      style={{ width: voteProgress.total > 0 ? `${(voteProgress.votaron / voteProgress.total) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-3xl font-black text-emerald-400 tabular-nums w-24 text-right">
                    {voteProgress.votaron}/{voteProgress.total}
                  </span>
                </div>
                <p className="text-slate-500 text-xs uppercase tracking-widest">participantes han evaluado</p>
              </div>
            </div>
          )}

          {/* ── RESULTADOS ────────────────────────────────────────────────────── */}
          {fase === 'resultados' && (
            <div className="animate-in slide-in-from-bottom duration-500 w-full">
              <div className="flex gap-6 items-start">

                {/* Ranking */}
                <div className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-[3rem] p-8">
                  <h2 className="text-3xl font-black uppercase mb-1">
                    {actividadTerminada ? '🏆 Resultados Finales' : 'Ranking Actual'}
                  </h2>
                  <p className="text-slate-400 text-sm mb-6">Haz clic en un participante para ver su desglose</p>

                  <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                    {ranking.map((r, idx) => (
                      <div
                        key={r.expositor}
                        onClick={() => verDetalle(r.expositor)}
                        className={`flex items-center justify-between p-5 rounded-2xl border cursor-pointer transition-all ${
                          usuarioDetalle?.expositor === r.expositor
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : idx === 0
                            ? 'border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10'
                            : 'border-white/5 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span className={`text-2xl w-8 text-center font-black ${idx === 0 ? 'text-yellow-500' : 'text-slate-500'}`}>
                            {getBadge(idx)}
                          </span>
                          <div>
                            <p className={`font-black uppercase text-base ${idx === 0 ? 'text-yellow-400' : 'text-white'}`}>
                              {r.expositor}
                            </p>
                            <p className="text-slate-500 text-xs">Ronda {r.ronda} · {r.totalVotantes} votos</p>
                          </div>
                        </div>
                        <span className={`font-black text-2xl px-4 py-2 rounded-xl ${
                          idx === 0 ? 'bg-yellow-500 text-yellow-900' : 'bg-white/10 text-indigo-300'
                        }`}>
                          {r.scoreGeneral.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Panel de detalle */}
                {usuarioDetalle && (
                  <div className="w-80 shrink-0 bg-white/5 backdrop-blur-md border border-white/10 rounded-[3rem] p-8 animate-in slide-in-from-right duration-300">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Desglose</p>
                        <h3 className="text-xl font-black uppercase">{usuarioDetalle.expositor}</h3>
                      </div>
                      <button
                        onClick={() => setUsuarioDetalle(null)}
                        className="text-slate-500 hover:text-white font-black text-xs transition-colors"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-5">
                      {Object.values(usuarioDetalle.promedios).map((criterio) => (
                        <div key={criterio.nombre}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-slate-300">{criterio.nombre}</span>
                            <span className="text-xl font-black text-indigo-400">{criterio.promedio.toFixed(1)}</span>
                          </div>
                          <div className="bg-white/10 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-indigo-500 h-2 rounded-full transition-all duration-700"
                              style={{ width: `${(criterio.promedio / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 pt-5 border-t border-white/10 text-center">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Promedio General</p>
                      <span className="text-5xl font-black">{usuarioDetalle.scoreGeneral.toFixed(1)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      <button
        onClick={() => navigate('/host')}
        className="fixed bottom-10 right-10 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-xl text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors z-50"
      >
        Salir al Panel Principal
      </button>
    </div>
  );
};

export default AdminExposicion;
