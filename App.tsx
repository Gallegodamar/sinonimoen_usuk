
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { LEVEL_DATA } from './data';
import { WordData, Player, Question, GameStatus, DifficultyLevel } from './types';

const QUESTIONS_PER_PLAYER = 10;

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const getWordType = (word: string): string => {
  const normalized = word.toLowerCase().trim();
  if (normalized.endsWith('tu') || normalized.endsWith('du') || normalized.endsWith('ten') || normalized.endsWith('tzen')) return 'verb';
  if (normalized.endsWith('ak') || normalized.endsWith('ek')) return 'plural';
  if (normalized.endsWith('era') || normalized.endsWith('ura') || normalized.endsWith('tasun')) return 'abstract';
  return 'other';
};

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.SETUP);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(1);
  const [numPlayers, setNumPlayers] = useState(2);
  const [players, setPlayers] = useState<Player[]>([]);
  
  const [questionPool, setQuestionPool] = useState<Question[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  
  const [currentTurnPenalties, setCurrentTurnPenalties] = useState(0);
  const turnStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (status === GameStatus.SETUP) {
      setPlayers(Array.from({ length: numPlayers }, (_, i) => ({ 
        id: i, 
        name: `Jokalaria ${i + 1}`, 
        score: 0, 
        time: 0 
      })));
    }
  }, [numPlayers, status]);

  const generatePool = (needed: number, level: DifficultyLevel) => {
    const poolSource = LEVEL_DATA[level];
    let gameData = [...poolSource];
    while (gameData.length < needed) {
      gameData = [...gameData, ...poolSource];
    }
    gameData = shuffleArray(gameData).slice(0, needed);
    const allWordsInPool = poolSource.flatMap(d => [d.hitza, ...d.sinonimoak]);

    return gameData.map((data) => {
      const correctAnswer = data.sinonimoak[Math.floor(Math.random() * data.sinonimoak.length)];
      const targetType = getWordType(data.hitza);
      let distractorsPool = allWordsInPool.filter(w => w !== data.hitza && !data.sinonimoak.includes(w));
      const sameTypeDistractors = distractorsPool.filter(w => getWordType(w) === targetType);
      const finalDistractorsSource = sameTypeDistractors.length >= 10 ? sameTypeDistractors : distractorsPool;
      const shuffledDistractors = shuffleArray(Array.from(new Set(finalDistractorsSource))).slice(0, 3);
      const options = shuffleArray([correctAnswer, ...shuffledDistractors]);
      return { wordData: data, correctAnswer, options };
    });
  };

  const startNewGame = useCallback(() => {
    const totalNeeded = players.length * QUESTIONS_PER_PLAYER;
    const newPool = generatePool(totalNeeded, difficulty);
    setQuestionPool(newPool);
    setCurrentPlayerIndex(0);
    setCurrentQuestionIndex(0);
    setStatus(GameStatus.INTERMISSION);
  }, [players.length, difficulty]);

  const startPlayerTurn = () => {
    turnStartTimeRef.current = Date.now();
    setCurrentTurnPenalties(0);
    setStatus(GameStatus.PLAYING);
    setCurrentQuestionIndex(0);
    setIsAnswered(false);
    setSelectedAnswer(null);
  };

  const handlePlayerNameChange = (id: number, name: string) => {
    setPlayers(prev => prev.map(p => (p.id === id ? { ...p, name } : p)));
  };

  const handleAnswer = (answer: string) => {
    if (isAnswered) return;
    const poolIdx = (currentPlayerIndex * QUESTIONS_PER_PLAYER + currentQuestionIndex);
    const currentQuestion = poolIdx >= 0 && poolIdx < questionPool.length ? questionPool[poolIdx] : null;
    if (!currentQuestion) return;
    const isCorrect = answer === currentQuestion.correctAnswer;
    setSelectedAnswer(answer);
    setIsAnswered(true);
    if (isCorrect) {
      setPlayers(prev => prev.map((p, idx) => idx === currentPlayerIndex ? { ...p, score: p.score + 1 } : p));
    } else {
      setCurrentTurnPenalties(prev => prev + 10);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < QUESTIONS_PER_PLAYER - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setIsAnswered(false);
      setSelectedAnswer(null);
    } else {
      finishPlayerTurn();
    }
  };

  const finishPlayerTurn = () => {
    const endTime = Date.now();
    const realSeconds = (endTime - turnStartTimeRef.current) / 1000;
    const totalSecondsWithPenalty = realSeconds + currentTurnPenalties;
    setPlayers(prev => prev.map((p, idx) => idx === currentPlayerIndex ? { ...p, time: totalSecondsWithPenalty } : p));
    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(prev => prev + 1);
      setStatus(GameStatus.INTERMISSION);
    } else {
      setStatus(GameStatus.SUMMARY);
    }
  };

  const playedWordData = useMemo(() => {
    return Array.from(new Map<string, WordData>(questionPool.map(q => [q.wordData.hitza, q.wordData])).values())
      .sort((a, b) => a.hitza.localeCompare(b.hitza));
  }, [questionPool]);

  if (status === GameStatus.SETUP) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center bg-gradient-to-br from-indigo-900 via-indigo-950 to-black overflow-hidden safe-pt safe-px">
        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl flex flex-col h-full max-h-[92dvh] border-2 border-white/20 p-6 mt-2 mb-4">
          <div className="text-center mb-6 shrink-0">
            <h1 className="text-3xl font-black text-indigo-950 tracking-tighter uppercase leading-none">Sinonimoak</h1>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Konfigurazioa</p>
          </div>
          
          <div className="flex flex-col gap-4 mb-4 shrink-0">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <label className="flex justify-between text-xs font-black text-indigo-900 uppercase mb-2">
                 Jokalariak: <span className="text-indigo-600 text-xl">{numPlayers}</span>
               </label>
               <input type="range" min="1" max="10" value={numPlayers} onChange={(e) => setNumPlayers(parseInt(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
            </div>
            
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <label className="block text-xs font-black text-indigo-900 uppercase mb-2">Zailtasuna</label>
               <div className="grid grid-cols-4 gap-2 h-12">
                 {([1, 2, 3, 4] as DifficultyLevel[]).map(d => (
                   <button key={d} onClick={() => setDifficulty(d)} className={`rounded-xl transition-all text-base font-black ${difficulty === d ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>
                     {d}
                   </button>
                 ))}
               </div>
            </div>
          </div>

          <div className="grow overflow-y-auto pr-1 custom-scrollbar mb-4 min-h-0 bg-slate-50/50 rounded-2xl p-2 border border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {players.map((p) => (
                <div key={p.id} className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col focus-within:ring-2 focus-within:ring-indigo-500 transition-all shadow-sm">
                  <label className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Jokalaria {p.id + 1}</label>
                  <input type="text" value={p.name} onChange={(e) => handlePlayerNameChange(p.id, e.target.value)} className="p-0 bg-transparent border-none focus:ring-0 font-bold text-slate-800 text-base" placeholder="Izena..." />
                </div>
              ))}
            </div>
          </div>

          <div className="shrink-0 pb-2">
            <button onClick={startNewGame} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-3xl transition-all shadow-lg active:scale-95 text-xl uppercase tracking-widest">HASI JOKOA</button>
          </div>
        </div>
      </div>
    );
  }

  if (status === GameStatus.INTERMISSION) {
    const player = players[currentPlayerIndex];
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-indigo-950 overflow-hidden safe-pt safe-px">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl text-center max-w-sm w-full border-b-[12px] border-indigo-600 mx-4">
          <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center text-4xl font-black mx-auto mb-6 shadow-xl">{currentPlayerIndex + 1}</div>
          <p className="text-xs text-slate-400 font-black mb-1 uppercase tracking-widest">Prest?</p>
          <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">{player.name}</h2>
          <button onClick={startPlayerTurn} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl transition-all shadow-lg active:scale-95 text-xl uppercase tracking-widest">HASI</button>
        </div>
      </div>
    );
  }

  if (status === GameStatus.PLAYING) {
    const poolIdx = (currentPlayerIndex * QUESTIONS_PER_PLAYER + currentQuestionIndex);
    const currentQuestion = poolIdx >= 0 && poolIdx < questionPool.length ? questionPool[poolIdx] : null;
    const currentPlayer = players[currentPlayerIndex];
    if (!currentQuestion) return null;

    return (
      <div className="h-[100dvh] w-full flex flex-col items-center bg-indigo-900 overflow-hidden safe-pt safe-px">
        <div className="w-full max-w-2xl flex justify-between items-center mb-4 gap-2 shrink-0 px-2">
          <div className="flex items-center space-x-2">
             <div className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-[12px] font-black shadow-lg uppercase tracking-tight">{currentPlayer.name}</div>
             <div className="bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/20 flex items-center gap-2">
               <span className="text-[10px] font-black text-rose-400 uppercase leading-none">+{currentTurnPenalties}s</span>
             </div>
          </div>
          <div className="flex gap-2 items-center">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-white font-black text-xs">
              {currentQuestionIndex + 1}/10
            </div>
            <button onClick={() => setStatus(GameStatus.SUMMARY)} className="bg-rose-500 text-white font-black px-5 py-2.5 rounded-2xl text-[11px] uppercase shadow-lg active:scale-95 transition-transform">Amaitu</button>
          </div>
        </div>

        <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-6 border border-slate-200 relative overflow-hidden flex flex-col h-full max-h-[85dvh] mb-6">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
            <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${((currentQuestionIndex + (isAnswered ? 1 : 0)) / QUESTIONS_PER_PLAYER) * 100}%` }} />
          </div>
          
          <div className="text-center my-6 md:my-10 shrink-0">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-2">Sinonimoa aukeratu</p>
            <h3 className="text-5xl md:text-7xl font-black text-slate-900 break-words leading-tight uppercase tracking-tighter">{currentQuestion.wordData.hitza}</h3>
          </div>

          <div className="grid grid-cols-1 gap-3 grow min-h-0">
            {currentQuestion.options.map((opt, i) => {
              let buttonStyle = "w-full rounded-2xl border-2 font-black text-3xl md:text-5xl transition-all duration-200 flex items-center justify-center text-center p-4 h-full ";
              if (!isAnswered) buttonStyle += "bg-white border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 text-slate-700 shadow-md active:translate-y-1";
              else {
                if (opt === currentQuestion.correctAnswer) buttonStyle += "bg-emerald-500 border-emerald-300 text-white shadow-xl scale-[1.02]";
                else if (opt === selectedAnswer) buttonStyle += "bg-rose-500 border-rose-300 text-white opacity-90";
                else buttonStyle += "bg-slate-50 border-slate-50 text-slate-300 opacity-40";
              }
              return (
                <button key={i} disabled={isAnswered} onClick={() => handleAnswer(opt)} className={buttonStyle}>{opt}</button>
              );
            })}
          </div>

          <div className="mt-8 shrink-0">
            <div className="h-20 flex items-center justify-center">
              {isAnswered ? (
                 <button onClick={nextQuestion} className="w-full bg-indigo-950 text-white font-black h-full rounded-2xl shadow-xl active:scale-95 text-2xl uppercase tracking-widest">
                   {currentQuestionIndex < 9 ? "Hurrengoa" : "Bukatu"}
                 </button>
              ) : (
                 <div className="flex items-center gap-3 text-[11px] font-black text-slate-300 uppercase tracking-widest">
                   <span className="w-2.5 h-2.5 bg-indigo-300 rounded-full animate-ping"></span>
                   Erantzunaren zain...
                 </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === GameStatus.SUMMARY) {
    const sortedPlayers = [...players].filter(p => p.time > 0).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.time - b.time;
      });

    return (
      <div className="h-[100dvh] w-full flex flex-col items-center bg-indigo-950 overflow-hidden safe-pt safe-px">
        <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-6 md:p-10 flex flex-col h-full max-h-[92dvh] border-t-[12px] border-indigo-600 mt-2 mb-6">
          <div className="mb-8 shrink-0 text-center pt-2">
            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Sailkapena</h2>
            <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] mt-2">{difficulty}. Maila</p>
          </div>
          
          <div className="grow overflow-hidden rounded-[2rem] border border-slate-200 shadow-inner bg-slate-50/50 mb-8 flex flex-col">
            <div className="overflow-y-auto custom-scrollbar grow p-2">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 z-10">
                  <tr>
                    <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">#</th>
                    <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nor</th>
                    <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Pts</th>
                    <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">S.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sortedPlayers.map((p, idx) => (
                    <tr key={p.id} className={idx === 0 ? "bg-amber-50" : ""}>
                      <td className="px-5 py-5 font-black text-2xl">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`}</td>
                      <td className="px-5 py-5 font-black text-slate-800 text-sm uppercase">{p.name}</td>
                      <td className="px-5 py-5 text-center">
                        <span className="bg-indigo-600 text-white px-3 py-1 rounded-xl font-black text-xs shadow-sm">{p.score}</span>
                      </td>
                      <td className="px-5 py-5 text-right font-mono text-slate-500 text-xs">{p.time.toFixed(1)}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 shrink-0 pb-2 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setPlayers(players.map(p => ({...p, score: 0, time: 0}))); startNewGame(); }} className="bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-lg text-sm uppercase tracking-widest active:scale-95">BERRIRO</button>
              <button onClick={() => setStatus(GameStatus.REVIEW)} className="bg-white text-indigo-600 font-black py-5 rounded-2xl shadow-md text-sm uppercase tracking-widest border border-indigo-100 active:scale-95">HITZAK</button>
            </div>
            <button onClick={() => setStatus(GameStatus.SETUP)} className="w-full bg-slate-100 text-slate-500 font-black py-4 rounded-xl text-[11px] uppercase active:scale-95">HASIERA</button>
          </div>
        </div>
      </div>
    );
  }

  if (status === GameStatus.REVIEW) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center bg-slate-900 overflow-hidden safe-pt safe-px">
        <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-6 md:p-10 flex flex-col h-full max-h-[92dvh] border-t-[12px] border-indigo-600 mt-2 mb-6">
          <div className="flex justify-between items-center mb-6 shrink-0 pt-2">
            <button onClick={() => setStatus(GameStatus.SUMMARY)} className="bg-slate-100 text-slate-600 px-5 py-2.5 rounded-2xl font-black text-[11px] uppercase active:scale-95 transition-transform shadow-sm">
              Atzera
            </button>
            <h2 className="text-lg font-black text-indigo-950 uppercase tracking-tight">Hiztegia</h2>
            <div className="w-16"></div>
          </div>

          <div className="grow overflow-y-auto pr-1 custom-scrollbar min-h-0 mb-6 bg-slate-50/50 rounded-3xl p-3 border border-slate-100">
            <div className="grid grid-cols-1 gap-3">
              {playedWordData.map((data, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-indigo-50 flex flex-col gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black bg-indigo-50 text-indigo-500 px-2 py-1 rounded-lg border border-indigo-100">#{idx + 1}</span>
                    <a href={`https://hiztegiak.elhuyar.eus/eu/${data.hitza}`} target="_blank" rel="noopener noreferrer" className="text-indigo-950 font-black text-base uppercase hover:text-indigo-600 transition-colors">
                      {data.hitza}
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.sinonimoak.map((sin, sIdx) => (
                      <span key={sIdx} className="bg-indigo-600/5 text-indigo-600 px-3 py-1.5 rounded-xl font-bold text-xs border border-indigo-600/10">
                        {sin}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="shrink-0 pb-2 mb-4">
            <button onClick={() => setStatus(GameStatus.SUMMARY)} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-lg uppercase tracking-widest text-sm active:scale-95 transition-transform">ITXI</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default App;
