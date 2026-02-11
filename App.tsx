
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
      <div className="h-[100dvh] w-full flex flex-col items-center bg-gradient-to-br from-indigo-900 via-indigo-950 to-black overflow-hidden safe-pt safe-pb safe-px">
        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl flex flex-col h-full max-h-[85dvh] border-2 border-white/20 p-6">
          <div className="text-center mb-6 shrink-0 pt-2">
            <h1 className="text-2xl md:text-3xl font-black text-indigo-950 tracking-tighter uppercase leading-none">Sinonimoen Erronka</h1>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Konfiguratu jokoa</p>
          </div>
          
          <div className="flex flex-col gap-4 mb-4 shrink-0">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <label className="flex justify-between text-xs font-black text-indigo-900 uppercase mb-2">
                 Jokalariak: <span className="text-indigo-600 text-base">{numPlayers}</span>
               </label>
               <input type="range" min="1" max="10" value={numPlayers} onChange={(e) => setNumPlayers(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
            </div>
            
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <label className="block text-xs font-black text-indigo-900 uppercase mb-2">Zailtasun Maila</label>
               <div className="grid grid-cols-4 gap-2 h-10">
                 {([1, 2, 3, 4] as DifficultyLevel[]).map(d => (
                   <button key={d} onClick={() => setDifficulty(d)} className={`rounded-xl transition-all text-sm font-black ${difficulty === d ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>
                     {d}
                   </button>
                 ))}
               </div>
            </div>
          </div>

          <div className="grow overflow-y-auto pr-1 custom-scrollbar mb-4 min-h-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {players.map((p) => (
                <div key={p.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                  <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Jokalaria {p.id + 1}</label>
                  <input type="text" value={p.name} onChange={(e) => handlePlayerNameChange(p.id, e.target.value)} className="p-0 bg-transparent border-none focus:ring-0 font-bold text-slate-800 text-sm" placeholder="Izena idatzi..." />
                </div>
              ))}
            </div>
          </div>

          <button onClick={startNewGame} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95 text-lg uppercase tracking-widest shrink-0 mb-2">HASI JOKOA</button>
        </div>
      </div>
    );
  }

  if (status === GameStatus.INTERMISSION) {
    const player = players[currentPlayerIndex];
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-slate-950 overflow-hidden safe-pt safe-pb safe-px">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center max-w-sm w-full border-b-[8px] border-indigo-600">
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center text-3xl font-black mx-auto mb-4 shadow-lg">{currentPlayerIndex + 1}</div>
          <h2 className="text-2xl font-black text-slate-900 mb-1">{player.name}</h2>
          <p className="text-[10px] text-indigo-400 font-black mb-8 uppercase tracking-[0.3em]">{difficulty}. Maila • 10 Galdera</p>
          <button onClick={startPlayerTurn} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg active:scale-95 text-lg uppercase tracking-widest">HASI TXANDA</button>
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
      <div className="h-[100dvh] w-full flex flex-col items-center bg-slate-50 overflow-hidden safe-pt safe-pb safe-px">
        {/* Barra superior con margen extra para evitar la zona de status */}
        <div className="w-full max-w-2xl flex justify-between items-center mb-6 gap-2 shrink-0 px-2 pt-2">
          <div className="flex items-center space-x-2">
             <div className="bg-indigo-600 text-white px-4 py-2 rounded-2xl text-[11px] font-black shadow-md uppercase tracking-tight">{currentPlayer.name}</div>
             <div className="bg-white px-2.5 py-1.5 rounded-xl border border-slate-100 flex items-center gap-2 shadow-sm">
               <span className="text-[9px] font-black text-rose-500 uppercase leading-none">+{currentTurnPenalties}s</span>
             </div>
          </div>
          <div className="flex gap-2 items-center">
            <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-indigo-600 font-black text-xs shadow-sm">
              {currentQuestionIndex + 1}/10
            </div>
            <button onClick={() => setStatus(GameStatus.SUMMARY)} className="bg-rose-50 text-rose-700 font-black px-4 py-2 rounded-2xl text-[11px] uppercase shadow-sm active:scale-95 transition-transform">Amaitu</button>
          </div>
        </div>

        <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-xl p-6 mb-4 border border-slate-100 relative overflow-hidden flex flex-col grow min-h-0">
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
            <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${((currentQuestionIndex + (isAnswered ? 1 : 0)) / QUESTIONS_PER_PLAYER) * 100}%` }} />
          </div>
          
          <div className="text-center my-6 shrink-0">
            <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">Sinonimoa aukeratu</p>
            <h3 className="text-3xl md:text-5xl font-black text-slate-900 break-words leading-tight uppercase tracking-tighter">{currentQuestion.wordData.hitza}</h3>
          </div>

          <div className="grid grid-cols-1 gap-2.5 grow min-h-0">
            {currentQuestion.options.map((opt, i) => {
              let buttonStyle = "w-full rounded-2xl border-2 font-black text-base md:text-xl transition-all duration-200 flex items-center justify-center text-center p-4 ";
              if (!isAnswered) buttonStyle += "bg-white border-slate-50 hover:border-indigo-500 hover:bg-indigo-50 text-slate-700 shadow-sm active:translate-y-1";
              else {
                if (opt === currentQuestion.correctAnswer) buttonStyle += "bg-emerald-500 border-emerald-300 text-white shadow-lg";
                else if (opt === selectedAnswer) buttonStyle += "bg-rose-500 border-rose-300 text-white opacity-90";
                else buttonStyle += "bg-slate-50 border-slate-50 text-slate-300 grayscale opacity-40";
              }
              return (
                <button key={i} disabled={isAnswered} onClick={() => handleAnswer(opt)} className={buttonStyle}>{opt}</button>
              );
            })}
          </div>

          <div className="mt-6 shrink-0 h-14 flex items-center justify-center">
            {isAnswered ? (
               <button onClick={nextQuestion} className="w-full bg-indigo-950 text-white font-black py-3.5 rounded-2xl shadow-lg active:scale-95 text-base uppercase tracking-widest">
                 {currentQuestionIndex < 9 ? "Hurrengoa" : "Txanda bukatu"}
               </button>
            ) : (
               <div className="flex items-center gap-2 text-[9px] font-black text-slate-300 uppercase tracking-widest">
                 <span className="w-1.5 h-1.5 bg-indigo-200 rounded-full animate-pulse"></span>
                 Erantzunaren zain...
               </div>
            )}
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
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-indigo-950 overflow-hidden safe-pt safe-pb safe-px">
        <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-6 md:p-8 flex flex-col h-full max-h-[88dvh] border-t-4 border-indigo-600">
          <div className="mb-6 shrink-0 text-center pt-2">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase">Sailkapena</h2>
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1">{difficulty}. Maila</p>
          </div>
          
          <div className="grow overflow-hidden rounded-2xl border border-slate-100 shadow-inner bg-slate-50 mb-6 flex flex-col">
            <div className="overflow-y-auto custom-scrollbar grow">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 z-10">
                  <tr>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase">P.</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase">Jokalaria</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase text-center">Pts</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase text-right">Denb.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {sortedPlayers.map((p, idx) => (
                    <tr key={p.id} className={idx === 0 ? "bg-amber-50" : ""}>
                      <td className="px-4 py-3.5 font-black text-lg">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-800 text-xs uppercase tracking-tight">{p.name}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-lg font-black text-[10px]">{p.score}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-slate-500 text-[10px]">{p.time.toFixed(1)}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setPlayers(players.map(p => ({...p, score: 0, time: 0}))); startNewGame(); }} className="bg-indigo-600 text-white font-black py-4 rounded-xl shadow-md text-xs uppercase tracking-widest active:scale-95">BERRIRO</button>
              <button onClick={() => setStatus(GameStatus.REVIEW)} className="bg-white text-indigo-600 font-black py-4 rounded-xl shadow-sm text-xs uppercase tracking-widest border border-indigo-100 active:scale-95">HITZAK</button>
            </div>
            <button onClick={() => setStatus(GameStatus.SETUP)} className="w-full bg-slate-100 text-slate-500 font-black py-3 rounded-xl text-[10px] uppercase tracking-widest mt-2">HASIERA</button>
          </div>
        </div>
      </div>
    );
  }

  if (status === GameStatus.REVIEW) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-slate-900 overflow-hidden safe-pt safe-pb safe-px">
        <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-6 flex flex-col h-full max-h-[88dvh] border-t-4 border-indigo-600">
          <div className="flex justify-between items-center mb-6 shrink-0 pt-2">
            <button onClick={() => setStatus(GameStatus.SUMMARY)} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase active:scale-95 transition-transform">
              Atzera
            </button>
            <h2 className="text-sm md:text-lg font-black text-indigo-950 uppercase">Agertutako Hitzak</h2>
            <div className="w-12"></div>
          </div>

          <div className="grow overflow-y-auto pr-1 custom-scrollbar min-h-0 mb-6">
            <div className="grid grid-cols-1 gap-2">
              {playedWordData.map((data, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-indigo-50 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black bg-white text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-50">#{idx + 1}</span>
                    <a href={`https://hiztegiak.elhuyar.eus/eu/${data.hitza}`} target="_blank" rel="noopener noreferrer" className="text-indigo-950 font-black text-sm uppercase hover:underline decoration-2">
                      {data.hitza}
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.sinonimoak.map((sin, sIdx) => (
                      <span key={sIdx} className="bg-white text-indigo-600 px-2.5 py-1.5 rounded-xl font-bold text-[10px] border border-indigo-100 shadow-sm">
                        {sin}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <button onClick={() => setStatus(GameStatus.SUMMARY)} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg uppercase tracking-widest text-xs shrink-0 active:scale-95 transition-transform mb-2">Itzuli</button>
        </div>
      </div>
    );
  }

  return null;
};

export default App;
