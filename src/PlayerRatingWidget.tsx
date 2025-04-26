import { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue } from 'firebase/database';
import { motion } from 'framer-motion';

const firebaseConfig = {
  apiKey: "AIzaSyB-r-eVWdM7wE5B2NYCemZo1Yx7waUSoeY",
  authDomain: "player-rating-widget.firebaseapp.com",
  projectId: "player-rating-widget",
  storageBucket: "player-rating-widget.appspot.com",
  messagingSenderId: "1063336242963",
  appId: "1:1063336242963:web:03a14c9b7b31477c36c22f",
  databaseURL: "https://player-rating-widget-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const initialPlayers = [
  { id: 1, name: 'Franco Armani' },
  { id: 2, name: 'Enzo Díaz' },
  { id: 3, name: 'Ignacio Fernández' }
];

const initialMatches = [
  { id: 1, name: 'River vs Boca', tournament: 'Copa de la Liga' },
  { id: 2, name: 'River vs Racing', tournament: 'Liga Profesional' }
];

const getColor = (value) => {
  if (value >= 9) return '#4caf50';
  if (value >= 7) return '#8bc34a';
  if (value >= 5) return '#ffeb3b';
  if (value >= 3) return '#ff9800';
  return '#f44336';
};

export default function PlayerRatingWidget() {
  const [players, setPlayers] = useState(initialPlayers);
  const [matches, setMatches] = useState(initialMatches);
  const [newPlayer, setNewPlayer] = useState('');
  const [newMatch, setNewMatch] = useState({ name: '', tournament: '' });
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [ratings, setRatings] = useState({});
  const [view, setView] = useState('vote');
  const [history, setHistory] = useState([]);
  const [isVoting, setIsVoting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const selectedMatch = matches.find((m) => m.id.toString() === selectedMatchId);

  useEffect(() => {
    if (selectedMatchId) {
      const votesRef = ref(database, `votes/${selectedMatchId}`);
      onValue(votesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const loadedHistory = Object.values(data);
          setHistory(loadedHistory);
        } else {
          setHistory([]);
        }
      });
    }
  }, [selectedMatchId]);

  const submitVote = () => {
    if (selectedMatch) {
      const votesRef = ref(database, `votes/${selectedMatch.id}`);
      push(votesRef, { ratings }).then(() => {
        setHistory((prevHistory) => [...prevHistory, { ratings }]);
        setRatings({});
        setIsVoting(false);
        setSuccessMessage('¡Gracias por votar! 🎉');
        setTimeout(() => setSuccessMessage(''), 3000);
      });
    }
  };

  const handleRate = (playerId, value) => {
    const updatedRatings = { ...ratings, [playerId]: value };
    setRatings(updatedRatings);
    setIsVoting(true);
  };

  const addPlayer = () => {
    if (newPlayer.trim()) {
      setPlayers([...players, { id: Date.now(), name: newPlayer.trim() }]);
      setNewPlayer('');
    }
  };

  const addMatch = () => {
    if (newMatch.name && newMatch.tournament) {
      setMatches([...matches, { id: Date.now(), ...newMatch }]);
      setNewMatch({ name: '', tournament: '' });
    }
  };

  const getAverage = (playerId) => {
    const relevant = history.filter((h) => h.ratings[playerId]);
    if (!relevant.length) return null;
    const sum = relevant.reduce((acc, curr) => acc + curr.ratings[playerId], 0);
    return (sum / relevant.length).toFixed(1);
  };

  const getRanking = () => {
    if (!selectedMatch) return [];
    const playerAverages = players.map((p) => {
      const avg = parseFloat(getAverage(p.id));
      return isNaN(avg) ? null : { ...p, avg };
    }).filter(Boolean);
    return playerAverages.sort((a, b) => b.avg - a.avg);
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', fontFamily: 'sans-serif', padding: 16 }}>
      <div style={{ marginBottom: 16, textAlign: 'center' }}>
        <button onClick={() => setView('vote')} style={{ marginRight: 8 }}>Votar</button>
        <button onClick={() => setView('admin')}>ABM</button>
      </div>

      {successMessage && (
        <div style={{ backgroundColor: '#4caf50', color: 'white', padding: 10, marginBottom: 16, borderRadius: 4, textAlign: 'center' }}>
          {successMessage}
        </div>
      )}

      {view === 'vote' && (
        <div>
          <select value={selectedMatchId} onChange={(e) => setSelectedMatchId(e.target.value)} style={{ width: '100%', padding: 8 }}>
            <option value="">Elegí un partido</option>
            {matches.map((match) => (
              <option key={match.id} value={match.id}>{match.name} ({match.tournament})</option>
            ))}
          </select>

          {selectedMatch && (
            <div style={{ marginTop: 16 }}>
              {players.map((player) => {
                const value = ratings[player.id] || 5;
                const color = getColor(value);
                const avg = getAverage(player.id);
                return (
                  <motion.div key={player.id} layout style={{ marginBottom: 16, padding: 8, border: '1px solid #ccc', borderRadius: 4 }}>
                    <div style={{ marginBottom: 8, fontWeight: 'bold' }}>{player.name}</div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={value}
                      onChange={(e) => handleRate(player.id, parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: color }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 4 }}>
                      <span style={{ color }}>Puntaje: {'★'.repeat(value)} {value}/10</span>
                      {avg && <span style={{ color: '#555' }}>Promedio: {avg}</span>}
                    </div>
                  </motion.div>
                );
              })}
              {isVoting && (
                <button onClick={submitVote} style={{ marginTop: 16, width: '100%', backgroundColor: '#4caf50', color: 'white', padding: 10, border: 'none', borderRadius: 4 }}>Enviar Votación</button>
              )}
              {getRanking().length > 0 && (
                <motion.div layout style={{ marginTop: 32 }}>
                  <h3 style={{ textAlign: 'center' }}>Ranking del Partido</h3>
                  {getRanking().map((p, i) => (
                    <motion.div layout key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #ccc' }}>
                      <span>{i + 1}. {p.name}</span>
                      <span style={{ fontWeight: 'bold', color: getColor(p.avg) }}>{p.avg}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          )}
        </div>
      )}

      {view === 'admin' && (
        <div style={{ marginTop: 16 }}>
          <h3>Agregar jugador</h3>
          <input
            type="text"
            placeholder="Nombre del jugador"
            value={newPlayer}
            onChange={(e) => setNewPlayer(e.target.value)}
            style={{ width: '100%', padding: 8, marginBottom: 8 }}
          />
          <button onClick={addPlayer} style={{ marginBottom: 16, width: '100%', backgroundColor: '#c00', color: 'white', padding: 10, border: 'none', borderRadius: 4 }}>Agregar jugador</button>

          <h3>Agregar partido</h3>
          <input
            type="text"
            placeholder="Nombre del partido"
            value={newMatch.name}
            onChange={(e) => setNewMatch({ ...newMatch, name: e.target.value })}
            style={{ width: '100%', padding: 8, marginBottom: 8 }}
          />
          <input
            type="text"
            placeholder="Nombre del torneo"
            value={newMatch.tournament}
            onChange={(e) => setNewMatch({ ...newMatch, tournament: e.target.value })}
            style={{ width: '100%', padding: 8, marginBottom: 8 }}
          />
          <button onClick={addMatch} style={{ width: '100%', backgroundColor: '#c00', color: 'white', padding: 10, border: 'none', borderRadius: 4 }}>Agregar partido</button>
        </div>
      )}
    </div>
  );
}
