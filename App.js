import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet, Alert, Modal, FlatList,
  useColorScheme, Vibration, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import Svg, { Path, Circle, Line, Rect, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import {
  useFonts, Archivo_400Regular, Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold,
} from '@expo-google-fonts/archivo';
import { ArchivoNarrow_600SemiBold, ArchivoNarrow_700Bold } from '@expo-google-fonts/archivo-narrow';

/* ---------------- Ficha inicial (só usada para criar o banco) ---------------- */
const SEED = {
  Upper: { f: 'Peito, costas, ombros e braços', ex: [
    ['Supino reto com barra', 4, '8-10', 90, 'Escápulas retraídas, desça a barra até o peito com controle'],
    ['T-Bar Row', 3, '8-10', 90, 'Tronco inclinado, coluna neutra e peito firme; puxe em direção ao abdômen'],
    ['Desenvolvimento Maquina', 3, '10-12', 75, 'Costas apoiadas no encosto; não trave os cotovelos no topo'],
    ['Puxada frontal (pulldown)', 3, '10-12', 75, 'Puxe até o queixo, peito para cima'],
    ['Rosca direta com barra', 2, '10-12', 60, 'Cotovelos fixos ao lado do corpo'],
    ['Tríceps na polia (corda)', 2, '10-12', 60, 'Abra a corda no final do movimento'],
  ] },
  Lower: { f: 'Quadríceps, posterior, glúteos e panturrilha', ex: [
    ['Agachamento Pendulo', 3, '8-10', 120, 'Costas e quadril colados no encosto; desça controlado o mais fundo que conseguir'],
    ['Levantamento terra romeno', 3, '8-10', 90, 'Quadril para trás, barra rente às pernas'],
    ['Mesa flexora', 3, '10-12', 60, 'Controle a volta (2–3 s)'],
    ['Cadeira extensora', 2, '12-15', 60, 'Segure 1 s no topo'],
    ['Panturrilha em pé', 3, '12-15', 45, 'Amplitude completa, pausa embaixo'],
  ] },
  Push: { f: 'Peito, ombros e tríceps', ex: [
    ['Supino inclinado com halteres', 3, '8-10', 90, 'Banco a 30–45°'],
    ['Desenvolvimento Maquina', 3, '8-10', 90, 'Costas apoiadas no encosto; não trave os cotovelos no topo'],
    ['Crucifixo na máquina (peck deck)', 3, '10-12', 60, 'Cotovelos levemente flexionados'],
    ['Elevação lateral com halteres', 3, '12-15', 60, 'Carga leve, suba até a altura dos ombros'],
    ['Tríceps francês polia', 3, '10-12', 60, 'De costas para a polia, cotovelos parados apontando para cima'],
    ['Tríceps na polia (barra reta)', 2, '12-15', 60, 'Só o antebraço se move'],
  ] },
  Pull: { f: 'Costas, bíceps e posterior de ombro', ex: [
    ['Puxada frontal Articulada', 3, '8-10', 90, 'Peito para cima; puxe com as costas, levando os cotovelos para baixo'],
    ['Remada baixa sentada (polia)', 3, '10-12', 75, 'Junte as escápulas no final'],
    ['T-Bar Row', 3, '10-12', 75, 'Tronco inclinado, coluna neutra e peito firme; puxe em direção ao abdômen'],
    ['Voador Inverso', 3, '12-15', 60, 'Peito apoiado, braços quase estendidos; abra até a linha dos ombros'],
    ['Rosca alternada com halteres', 3, '10-12', 60, 'Gire o punho na subida'],
    ['Rosca martelo', 2, '10-12', 60, 'Pegada neutra, sem balançar o corpo'],
  ] },
  Legs: { f: 'Pernas completas', ex: [
    ['Agachamento Pendulo', 3, '10-12', 90, 'Costas e quadril colados no encosto; desça controlado o mais fundo que conseguir'],
    ['Stiff', 3, '10-12', 90, 'Joelhos levemente flexionados, quadril para trás, barra rente às pernas'],
    ['Cadeira extensora', 3, '10-12', 60, 'Segure 1 s no topo e desça controlado'],
    ['Elevação pélvica (hip thrust)', 3, '10-12', 75, 'Contraia os glúteos 1 s no topo'],
    ['Mesa flexora', 2, '12-15', 60, 'Quadril colado no banco; controle a volta (2–3 s)'],
    ['Panturrilha sentada', 3, '12-15', 45, 'Pausa de 1 s embaixo'],
  ] },
  'Abdômen': { f: 'Core · calistenia', ex: [
    ['Elevação de pernas (barra ou chão)', 3, '10-15', 60, 'Sem balançar; suba as pernas com o abdômen e desça devagar'],
    ['Prancha', 3, '30-60 s', 45, 'Corpo reto, contraia abdômen e glúteos'],
    ['Hollow hold', 3, '20-30 s', 45, 'Lombar colada no chão; se ficar difícil, dobre os joelhos'],
  ] },
};
const SEED_DAY = { Upper: 1, Lower: 2, Push: 4, Pull: 5, Legs: 6 }; // getDay(): 0 = domingo
const DL = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const WD_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const K_WORKOUTS = 'meu-treino:workouts:v1';
const K_DRAFT = 'meu-treino:draft:v1';

/* ---------------- Helpers ---------------- */
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const pad2 = (n) => String(n).padStart(2, '0');
const fmtT = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h}:${pad2(m)}:${pad2(x)}` : `${m}:${pad2(x)}`; };
const fmtN = (n) => { const r = Math.round((n || 0) * 10) / 10; const [i, d] = String(Math.abs(r)).split('.'); return (r < 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (d ? ',' + d : ''); };
const dayKey = (d) => { d = new Date(d); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const ddmm = (iso) => { const d = new Date(iso); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`; };
const isTime = (r) => /s$/.test(r);
const firstNum = (r) => (String(r).match(/\d+/) || [''])[0];
const restTxt = (s) => (s >= 60 ? `${Math.floor(s / 60)}:${pad2(s % 60)}` : `${s}s`);
const est = (rt) => Math.round(rt.ex.reduce((a, e) => a + e.sets * (e.rest + 40), 0) / 60);
const nSets = (rt) => rt.ex.reduce((a, e) => a + e.sets, 0);
const ago = (iso) => { const d = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 864e5); return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`; };
const volOf = (d) => { let v = 0; for (const e of d.ex) for (const s of e.sets) if (s.done) v += (num(s.kg) || 0) * (num(s.reps) || 0); return v; };
const doneOf = (d) => d.ex.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
const totalOf = (d) => d.ex.reduce((a, e) => a + e.sets.length, 0);
const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const tap = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); };
// Confirmação nativa no celular; window.confirm na web (o Alert do RN Web não tem botões)
const ask = (title, msg, okText, onOk, opts = {}) => {
  if (Platform.OS === 'web') { if (window.confirm(`${title}\n\n${msg}`)) onOk(); return; }
  Alert.alert(title, msg, [{ text: opts.cancelText || 'Cancelar', style: 'cancel' }, { text: okText, style: opts.destructive ? 'destructive' : 'default', onPress: onOk }]);
};
const info = (title, msg) => { if (Platform.OS === 'web') window.alert(`${title}\n\n${msg}`); else Alert.alert(title, msg); };

/* ---------------- Theme ---------------- */
const palette = (dark) => dark ? {
  bg: '#0a0a0b', s1: '#151517', s2: '#222226', ink: '#f4f4f2', mut: '#8e8e93', hair: '#26262a',
  acc: '#4f7fff', accS: '#141d36', ok: '#0f2717', okD: '#1fae58', red: '#ff453a', inv: '#0a0a0b',
} : {
  bg: '#f4f4f1', s1: '#ffffff', s2: '#eaeae6', ink: '#0d0d0e', mut: '#6c6c70', hair: '#e1e1dc',
  acc: '#1f56f5', accS: '#e7edff', ok: '#e2f4e8', okD: '#1fae58', red: '#e5352b', inv: '#f4f4f1',
};
const F = { r: 'Archivo_400Regular', m: 'Archivo_500Medium', sb: 'Archivo_600SemiBold', b: 'Archivo_700Bold', xb: 'Archivo_800ExtraBold', n: 'ArchivoNarrow_700Bold', ns: 'ArchivoNarrow_600SemiBold' };

/* ---------------- Icons ---------------- */
const Ico = {
  check: (c, s = 20) => <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><Path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>,
  down: (c) => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><Path d="M6 9l6 6 6-6" /></Svg>,
  chev: (c, open) => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}><Path d="M9 6l6 6-6 6" /></Svg>,
  lift: (c) => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round"><Path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11" /></Svg>,
  cal: (c) => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round"><Rect x={4} y={5} width={16} height={15} rx={2} /><Path d="M4 10h16M9 3v4M15 3v4" /></Svg>,
  chart: (c) => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M4 19h16M5 15l4-4 3 3 7-8" /></Svg>,
  list: (c) => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round"><Path d="M9 6h11M9 12h11M9 18h11" /><Circle cx={4.5} cy={6} r={1.2} fill={c} /><Circle cx={4.5} cy={12} r={1.2} fill={c} /><Circle cx={4.5} cy={18} r={1.2} fill={c} /></Svg>,
  up: (c) => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><Path d="M6 15l6-6 6 6" /></Svg>,
  dn: (c) => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><Path d="M6 9l6 6 6-6" /></Svg>,
  bar: (c) => <Svg width={170} height={170} viewBox="0 0 100 100"><Rect x={8} y={30} width={12} height={40} rx={3} fill={c} /><Rect x={22} y={22} width={12} height={56} rx={3} fill={c} /><Rect x={34} y={46} width={32} height={8} fill={c} /><Rect x={66} y={22} width={12} height={56} rx={3} fill={c} /><Rect x={80} y={30} width={12} height={40} rx={3} fill={c} /></Svg>,
};

/* ---------------- Banco (SQLite) ---------------- */
const DB_VERSION = 1;
async function migrate(db) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync('PRAGMA user_version');
  const v = row?.user_version ?? 0;
  if (v >= DB_VERSION) return;
  if (v < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS routines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        focus TEXT NOT NULL DEFAULT '',
        weekday INTEGER,
        position INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
        position INTEGER NOT NULL DEFAULT 0,
        name TEXT NOT NULL,
        sets INTEGER NOT NULL DEFAULT 3,
        reps TEXT NOT NULL DEFAULT '10-12',
        rest INTEGER NOT NULL DEFAULT 60,
        tip TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        routine TEXT NOT NULL,
        date TEXT NOT NULL,
        dur INTEGER NOT NULL DEFAULT 0,
        vol REAL NOT NULL DEFAULT 0,
        sets INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS workout_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        ex_ord INTEGER NOT NULL,
        exercise TEXT NOT NULL,
        set_ord INTEGER NOT NULL,
        kg REAL NOT NULL DEFAULT 0,
        reps REAL NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_ex_routine ON exercises(routine_id, position);
      CREATE INDEX IF NOT EXISTS idx_sets_workout ON workout_sets(workout_id);
      CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
    `);
    await db.withTransactionAsync(async () => {
      let p = 0;
      for (const [name, r] of Object.entries(SEED)) {
        const res = await db.runAsync('INSERT INTO routines (name, focus, weekday, position) VALUES (?, ?, ?, ?)', name, r.f, SEED_DAY[name] ?? null, p++);
        let q = 0;
        for (const [en, sets, reps, rest, tip] of r.ex) {
          await db.runAsync('INSERT INTO exercises (routine_id, position, name, sets, reps, rest, tip) VALUES (?, ?, ?, ?, ?, ?, ?)', res.lastInsertRowId, q++, en, sets, reps, rest, tip);
        }
      }
      // Traz treinos da versão anterior (AsyncStorage), se houver
      try {
        const old = JSON.parse((await AsyncStorage.getItem(K_WORKOUTS)) || '[]');
        for (const w of old) await insertWorkout(db, w);
      } catch (e) {}
    });
  }
  await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}
async function insertWorkout(db, w) {
  const res = await db.runAsync('INSERT INTO workouts (routine, date, dur, vol, sets) VALUES (?, ?, ?, ?, ?)', w.routine, w.date, w.dur || 0, w.vol || 0, w.sets || 0);
  let k = 0;
  for (const e of w.ex || []) {
    let j = 0;
    for (const x of e.sets || []) await db.runAsync('INSERT INTO workout_sets (workout_id, ex_ord, exercise, set_ord, kg, reps) VALUES (?, ?, ?, ?, ?, ?)', res.lastInsertRowId, k, e.name, j++, num(x.kg) || 0, num(x.reps) || 0);
    k++;
  }
  return res.lastInsertRowId;
}

/* ---------------- App ---------------- */
export default function App() {
  const [loaded] = useFonts({ Archivo_400Regular, Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold, ArchivoNarrow_600SemiBold, ArchivoNarrow_700Bold });
  const dark = useColorScheme() === 'dark';
  if (!loaded) return <View style={{ flex: 1, backgroundColor: palette(dark).bg }} />;
  return (
    <SafeAreaProvider>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <SQLiteProvider databaseName="meutreino.db" onInit={migrate}>
        <Main dark={dark} />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

function Main({ dark }) {
  const c = palette(dark);
  const s = useMemo(() => makeStyles(c), [dark]);
  const ins = useSafeAreaInsets();
  const db = useSQLiteContext();
  const [routines, setRoutines] = useState([]);
  const [W, setW] = useState([]); // treinos, mais novo primeiro
  const [draft, setDraft] = useState(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('home');
  const [view, setView] = useState('home'); // home | workout | done
  const [result, setResult] = useState(null);
  const [rest, setRest] = useState(null); // {end,total}
  const [now, setNow] = useState(Date.now());

  const loadRoutines = useCallback(async () => {
    const rs = await db.getAllAsync('SELECT * FROM routines ORDER BY position, id');
    const es = await db.getAllAsync('SELECT * FROM exercises ORDER BY position, id');
    setRoutines(rs.map((r) => ({ ...r, ex: es.filter((e) => e.routine_id === r.id) })));
  }, [db]);
  const loadWorkouts = useCallback(async () => {
    const ws = await db.getAllAsync('SELECT * FROM workouts ORDER BY date DESC, id DESC');
    const ss = await db.getAllAsync('SELECT * FROM workout_sets ORDER BY workout_id, ex_ord, set_ord');
    const by = new Map();
    for (const x of ss) {
      if (!by.has(x.workout_id)) by.set(x.workout_id, []);
      const list = by.get(x.workout_id);
      let e = list[list.length - 1];
      if (!e || e.ord !== x.ex_ord) { e = { ord: x.ex_ord, name: x.exercise, sets: [] }; list.push(e); }
      e.sets.push({ kg: x.kg, reps: x.reps });
    }
    setW(ws.map((w) => ({ ...w, id: String(w.id), ex: by.get(w.id) || [] })));
  }, [db]);

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([loadRoutines(), loadWorkouts()]);
        const d = await AsyncStorage.getItem(K_DRAFT);
        if (d) { setDraft(JSON.parse(d)); setView('workout'); }
      } catch (e) { info('Erro', 'Não consegui abrir o banco de dados.'); }
      setReady(true);
    })();
  }, []);

  // Rascunho do treino em andamento fica no AsyncStorage (sobrevive a fechar o app)
  const firstDraft = useRef(true);
  useEffect(() => {
    if (!ready) return;
    if (firstDraft.current) { firstDraft.current = false; return; }
    (draft ? AsyncStorage.setItem(K_DRAFT, JSON.stringify(draft)) : AsyncStorage.removeItem(K_DRAFT)).catch(() => {});
  }, [draft, ready]);

  // Relógio
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (rest && now >= rest.end) {
      setRest(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Vibration.vibrate(Platform.OS === 'android' ? [0, 250, 120, 250] : 400);
    }
  }, [now, rest]);

  const prevSets = useCallback((name) => { for (const w of W) { const e = (w.ex || []).find((x) => x.name === name); if (e) return e.sets || []; } return []; }, [W]);

  const start = (rt) => {
    if (!rt.ex.length) { info('Rotina vazia', `Adicione exercícios em ${rt.name} na aba Ficha.`); return; }
    const go = () => {
      setDraft({ routine: rt.name, start: Date.now(), ex: rt.ex.map((e) => ({ name: e.name, n: e.sets, reps: e.reps, rest: e.rest, tip: e.tip, sets: Array.from({ length: e.sets }, () => ({ kg: '', reps: '', done: false })) })) });
      setRest(null); setTab('home'); setView('workout'); tap();
    };
    if (draft) ask('Treino em andamento', `Descartar o treino de ${draft.routine} e começar ${rt.name}?`, 'Descartar', go, { destructive: true });
    else go();
  };

  const finish = () => {
    if (!doneOf(draft)) { info('Nenhuma série feita', 'Marque pelo menos uma série com ✓ antes de finalizar.'); return; }
    ask('Finalizar treino?', `${doneOf(draft)} de ${totalOf(draft)} séries feitas.`, 'Finalizar', async () => {
      const ex = draft.ex.map((e) => ({ name: e.name, sets: e.sets.filter((x) => x.done).map((x) => ({ kg: num(x.kg) || 0, reps: num(x.reps) || 0 })) })).filter((e) => e.sets.length);
      const prs = [];
      for (const e of ex) {
        const top = Math.max(...e.sets.map((x) => x.kg)); if (top <= 0) continue;
        let prev = -1, seen = false;
        for (const w of W) for (const x of w.ex || []) if (x.name === e.name) { seen = true; for (const y of x.sets || []) prev = Math.max(prev, num(y.kg) || 0); }
        if (seen && top > prev) prs.push({ name: e.name, kg: top });
      }
      const doc = { routine: draft.routine, date: new Date(draft.start).toISOString(), dur: Math.round((Date.now() - draft.start) / 1000), ex, vol: Math.round(volOf(draft) * 10) / 10, sets: doneOf(draft) };
      try {
        await db.withTransactionAsync(async () => { await insertWorkout(db, doc); });
        await loadWorkouts();
      } catch (e) { info('Erro', 'Não consegui salvar o treino. Tente de novo.'); return; }
      setResult({ ...doc, prs }); setDraft(null); setRest(null); setView('done');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }, { cancelText: 'Continuar treinando' });
  };

  const discard = () => ask('Descartar treino?', 'As séries marcadas serão perdidas.', 'Descartar', () => { setDraft(null); setRest(null); setView('home'); }, { destructive: true });

  const del = (id) => ask('Excluir treino?', 'Ele sai do histórico e do progresso.', 'Excluir', async () => {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM workout_sets WHERE workout_id = ?', Number(id));
      await db.runAsync('DELETE FROM workouts WHERE id = ?', Number(id));
    });
    loadWorkouts();
  }, { destructive: true });

  /* CRUD de exercícios */
  const saveEx = async (routineId, e) => {
    if (e.id) {
      await db.runAsync('UPDATE exercises SET name = ?, sets = ?, reps = ?, rest = ?, tip = ? WHERE id = ?', e.name, e.sets, e.reps, e.rest, e.tip, e.id);
    } else {
      const m = await db.getFirstAsync('SELECT COALESCE(MAX(position), -1) AS m FROM exercises WHERE routine_id = ?', routineId);
      await db.runAsync('INSERT INTO exercises (routine_id, position, name, sets, reps, rest, tip) VALUES (?, ?, ?, ?, ?, ?, ?)', routineId, (m?.m ?? -1) + 1, e.name, e.sets, e.reps, e.rest, e.tip);
    }
    await loadRoutines();
  };
  const delEx = async (id) => { await db.runAsync('DELETE FROM exercises WHERE id = ?', id); await loadRoutines(); };
  const moveEx = async (rt, idx, dir) => {
    const a = rt.ex[idx], b = rt.ex[idx + dir]; if (!a || !b) return;
    await db.withTransactionAsync(async () => {
      // reescreve as posições em sequência para nunca haver empate
      const order = rt.ex.map((e) => e.id);
      [order[idx], order[idx + dir]] = [order[idx + dir], order[idx]];
      for (let k = 0; k < order.length; k++) await db.runAsync('UPDATE exercises SET position = ? WHERE id = ?', k, order[k]);
    });
    tap();
    await loadRoutines();
  };

  const updSet = (i, j, patch) => setDraft((d) => ({ ...d, ex: d.ex.map((e, a) => a !== i ? e : { ...e, sets: e.sets.map((x, b) => b !== j ? x : { ...x, ...patch }) }) }));
  const toggle = (i, j) => {
    const e = draft.ex[i], x = e.sets[j], q = prevSets(e.name)[j];
    if (!x.done) {
      updSet(i, j, { done: true, kg: x.kg === '' ? (q ? String(q.kg) : '') : x.kg, reps: x.reps === '' ? (q ? String(q.reps) : firstNum(e.reps)) : x.reps });
      setRest({ end: Date.now() + e.rest * 1000, total: e.rest });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } else updSet(i, j, { done: false });
  };
  const addSet = (i) => setDraft((d) => ({ ...d, ex: d.ex.map((e, a) => a !== i ? e : { ...e, sets: [...e.sets, { kg: e.sets.length ? e.sets[e.sets.length - 1].kg : '', reps: '', done: false }] }) }));
  const rmSet = (i) => setDraft((d) => ({ ...d, ex: d.ex.map((e, a) => a !== i || e.sets.length < 2 ? e : { ...e, sets: e.sets.slice(0, -1) }) }));

  const showWorkout = view === 'workout' && draft && tab === 'home';
  const showDone = view === 'done' && result && tab === 'home';
  const tabBarH = 62 + ins.bottom;
  const allEx = useMemo(() => [...new Set([...routines.flatMap((r) => r.ex.map((e) => e.name)), ...W.flatMap((w) => w.ex.map((e) => e.name))])], [routines, W]);

  return (
    <View style={[s.root, { paddingTop: showWorkout ? 0 : ins.top }]}>
      {!ready ? null : showWorkout ? (
        <WorkoutScreen {...{ c, s, ins, draft, now, prevSets, updSet, toggle, addSet, rmSet, finish, discard, bottom: tabBarH + (rest ? 84 : 0) }} onMin={() => setView('home')} />
      ) : showDone ? (
        <DoneScreen {...{ c, s, r: result, bottom: tabBarH }} onClose={() => { setResult(null); setView('home'); }} />
      ) : tab === 'home' ? (
        <HomeScreen {...{ c, s, W, routines, draft, now, start, bottom: tabBarH }} onResume={() => setView('workout')} />
      ) : tab === 'hist' ? (
        <HistoryScreen {...{ c, s, W, del, bottom: tabBarH }} />
      ) : tab === 'prog' ? (
        <ProgressScreen {...{ c, s, W, allEx, bottom: tabBarH }} />
      ) : (
        <FichaScreen {...{ c, s, routines, saveEx, delEx, moveEx, bottom: tabBarH }} />
      )}
      {rest && <RestBar {...{ c, s, rest, now, bottom: tabBarH + 10 }} onAdj={(d) => setRest((r) => r && { end: Math.max(Date.now() + 1000, r.end + d * 1000), total: Math.max(r.total, r.total + d) })} onSkip={() => setRest(null)} />}
      <View style={[s.tabbar, { paddingBottom: ins.bottom, height: tabBarH }]}>
        {[['home', 'Treinar', Ico.lift], ['hist', 'Histórico', Ico.cal], ['prog', 'Progresso', Ico.chart], ['ficha', 'Ficha', Ico.list]].map(([k, label, ic]) => {
          const on = tab === k;
          return (
            <Pressable key={k} style={s.tab} onPress={() => { tap(); setTab(k); if (k === 'home' && view === 'done') { setResult(null); setView(draft ? 'workout' : 'home'); } }} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              {ic(on ? c.ink : c.mut)}
              <Text style={[s.tabTx, { color: on ? c.ink : c.mut }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ---------------- Screens ---------------- */
function Header({ s, small, title }) {
  return (
    <View style={s.hd}>
      <Text style={s.hdSmall}>{small}</Text>
      <Text style={s.hdTitle}>{title}</Text>
    </View>
  );
}

function HomeScreen({ c, s, W, routines, draft, now, start, onResume, bottom }) {
  const byDay = (g) => routines.find((r) => r.weekday === g);
  const d = new Date(now), dow = d.getDay();
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((dow + 6) % 7));
  const trained = new Set(W.map((w) => dayKey(w.date)));
  const today = byDay(dow), doneToday = trained.has(dayKey(d));
  const dateTxt = `${WEEKDAYS[dow][0].toUpperCase()}${WEEKDAYS[dow].slice(1)}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
  return (
    <ScrollView contentContainerStyle={[s.pad, { paddingBottom: bottom + 24 }]} showsVerticalScrollIndicator={false}>
      <Header s={s} small={dateTxt} title="Treinar" />
      <View style={s.week}>
        {[1, 2, 3, 4, 5, 6, 0].map((g, i) => {
          const day = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
          const isToday = g === dow, done = trained.has(dayKey(day));
          return (
            <View key={g} style={[s.wd, isToday && s.wdToday]}>
              <Text style={s.wdL}>{DL[g]}</Text>
              <Text style={s.wdR} numberOfLines={1}>{byDay(g)?.name || '—'}</Text>
              <View style={[s.dot, done && { backgroundColor: c.okD }]} />
            </View>
          );
        })}
      </View>

      <View style={s.hero}>
        <View style={s.heroBg} pointerEvents="none">{Ico.bar(c.inv)}</View>
        {draft ? (
          <>
            <Text style={s.heroK}>Treino em andamento · {fmtT((now - draft.start) / 1000)}</Text>
            <Text style={s.heroT}>{draft.routine}</Text>
            <Text style={s.heroP}>{doneOf(draft)} de {totalOf(draft)} séries feitas</Text>
            <Btn s={s} label="Continuar treino" onPress={onResume} />
          </>
        ) : today ? (
          <>
            <Text style={s.heroK}>{doneToday ? 'Treino de hoje concluído' : 'Treino de hoje'}</Text>
            <Text style={s.heroT}>{today.name}</Text>
            <Text style={s.heroP}>{today.focus}</Text>
            <View style={s.meta}>
              <Meta s={s} v={today.ex.length} l="exercícios" />
              <Meta s={s} v={nSets(today)} l="séries" />
              <Meta s={s} v={`~${est(today)}`} l="minutos" />
            </View>
            <Btn s={s} alt={doneToday} label={doneToday ? 'Treinar de novo' : 'Começar treino'} onPress={() => start(today)} />
          </>
        ) : (
          <>
            <Text style={s.heroK}>Hoje</Text>
            <Text style={s.heroT}>Descanso</Text>
            <Text style={s.heroP}>Dia de recuperação. Se quiser, faça o abdômen ou uma caminhada leve.</Text>
            {routines.find((r) => r.weekday == null) ? <Btn s={s} alt label={`Treinar ${routines.find((r) => r.weekday == null).name}`} onPress={() => start(routines.find((r) => r.weekday == null))} /> : null}
          </>
        )}
      </View>

      <View style={s.sec}><Text style={s.secT}>Rotinas</Text><Text style={s.secS}>{W.length} treinos registrados</Text></View>
      <View style={s.list}>
        {routines.map((rt) => {
          const l = W.find((w) => w.routine === rt.name);
          return (
            <Pressable key={rt.id} style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]} onPress={() => start(rt)}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowT}>{rt.name}</Text>
                <Text style={s.rowS}>{rt.ex.length} exercícios · {nSets(rt)} séries · ~{est(rt)} min</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.rowGo}>Iniciar</Text>
                <Text style={s.rowR}>{l ? ago(l.date) : 'nunca feito'}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function Meta({ s, v, l }) {
  return <View style={{ marginRight: 26 }}><Text style={s.metaV}>{v}</Text><Text style={s.metaL}>{l}</Text></View>;
}
function Btn({ s, label, onPress, alt, ghost, style }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.btn, alt && s.btnAlt, ghost && s.btnGhost, pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] }, style]}>
      <Text style={[s.btnTx, alt && s.btnAltTx, ghost && s.btnGhostTx]}>{label}</Text>
    </Pressable>
  );
}

function WorkoutScreen({ c, s, ins, draft, now, prevSets, updSet, toggle, addSet, rmSet, finish, discard, onMin, bottom }) {
  useKeepAwake();
  const el = fmtT((now - draft.start) / 1000);
  return (
    <View style={{ flex: 1 }}>
      <View style={[s.bar, { paddingTop: ins.top + 6 }]}>
        <Pressable style={s.ib} onPress={onMin} accessibilityLabel="Minimizar treino">{Ico.down(c.ink)}</Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.barT}>{draft.routine}</Text>
          <Text style={s.barS}>{el}</Text>
        </View>
        <Pressable style={({ pressed }) => [s.fin, pressed && { opacity: 0.8 }]} onPress={finish}><Text style={s.finTx}>Finalizar</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={[s.pad, { paddingBottom: bottom + 24 }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="on-drag">
        <View style={s.sum}>
          <Stat s={s} l="Duração" v={el} />
          <Stat s={s} l="Volume" v={`${fmtN(volOf(draft))} kg`} />
          <Stat s={s} l="Séries" v={`${doneOf(draft)}`} sub={`/${totalOf(draft)}`} />
        </View>
        {draft.ex.map((e, i) => {
          const p = prevSets(e.name), t = isTime(e.reps);
          return (
            <View key={e.name + i} style={s.ex}>
              <Text style={s.exT}>{e.name}</Text>
              <Text style={s.exS}>{e.n} séries · {e.reps}{t ? '' : ' reps'} · descanso {restTxt(e.rest)}</Text>
              <View style={s.tip}><Text style={s.tipTx}>{e.tip}</Text></View>
              <View style={[s.sg, { paddingVertical: 2 }]}>
                <Text style={[s.th, { width: 30 }]}>Série</Text>
                <Text style={[s.th, { flex: 1, textAlign: 'left', paddingLeft: 6 }]}>Anterior</Text>
                <Text style={[s.th, { width: 68 }]}>kg</Text>
                <Text style={[s.th, { width: 60 }]}>{t ? 'Seg' : 'Reps'}</Text>
                <View style={{ width: 44 }} />
              </View>
              {e.sets.map((x, j) => {
                const q = p[j];
                return (
                  <View key={j} style={[s.sg, x.done && { backgroundColor: c.ok }]}>
                    <Text style={[s.sn, { width: 30 }]}>{j + 1}</Text>
                    <Text style={s.prev} numberOfLines={1}>{q ? `${fmtN(q.kg)} kg × ${q.reps}` : '—'}</Text>
                    <TextInput style={[s.inp, { width: 68 }, x.done && { backgroundColor: 'transparent' }]} value={String(x.kg)} onChangeText={(v) => updSet(i, j, { kg: v })} keyboardType="decimal-pad" placeholder={q ? fmtN(q.kg) : '0'} placeholderTextColor={c.mut} selectTextOnFocus accessibilityLabel={`Carga, série ${j + 1}`} />
                    <TextInput style={[s.inp, { width: 60 }, x.done && { backgroundColor: 'transparent' }]} value={String(x.reps)} onChangeText={(v) => updSet(i, j, { reps: v })} keyboardType="number-pad" placeholder={q ? String(q.reps) : firstNum(e.reps)} placeholderTextColor={c.mut} selectTextOnFocus accessibilityLabel={`${t ? 'Segundos' : 'Repetições'}, série ${j + 1}`} />
                    <Pressable onPress={() => toggle(i, j)} style={[s.ck, x.done && { backgroundColor: c.okD }]} hitSlop={6} accessibilityLabel={`Concluir série ${j + 1}`}>
                      {Ico.check(x.done ? '#fff' : c.mut)}
                    </Pressable>
                  </View>
                );
              })}
              <Pressable style={({ pressed }) => [s.add, pressed && { opacity: 0.7 }]} onPress={() => { tap(); addSet(i); }}><Text style={s.addTx}>+ Adicionar série</Text></Pressable>
              {e.sets.length > 1 && <Pressable style={s.lk} onPress={() => rmSet(i)}><Text style={s.lkTx}>Remover última série</Text></Pressable>}
            </View>
          );
        })}
        <View style={{ gap: 10, marginTop: 22 }}>
          <Btn s={s} label="Finalizar treino" onPress={finish} />
          <Btn s={s} ghost label="Descartar treino" onPress={discard} />
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ s, l, v, sub }) {
  return <View style={{ flex: 1 }}><Text style={s.statL}>{l}</Text><Text style={s.statV}>{v}{sub ? <Text style={s.statSub}>{sub}</Text> : null}</Text></View>;
}

function RestBar({ c, s, rest, now, bottom, onAdj, onSkip }) {
  const left = Math.max(0, (rest.end - now) / 1000);
  const C = 2 * Math.PI * 22, frac = Math.min(1, left / rest.total);
  return (
    <View style={[s.rest, { bottom }]}>
      <Svg width={52} height={52} viewBox="0 0 52 52" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={26} cy={26} r={22} fill="none" stroke={c.inv} strokeOpacity={0.18} strokeWidth={4} />
        <Circle cx={26} cy={26} r={22} fill="none" stroke={c.acc} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${C}`} strokeDashoffset={C * (1 - frac)} />
      </Svg>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={s.restT}>{fmtT(left)}</Text>
        <Text style={s.restS}>descanso</Text>
      </View>
      <Pressable style={s.restB} onPress={() => { tap(); onAdj(-15); }}><Text style={s.restBTx}>−15</Text></Pressable>
      <Pressable style={s.restB} onPress={() => { tap(); onAdj(15); }}><Text style={s.restBTx}>+15</Text></Pressable>
      <Pressable style={[s.restB, { backgroundColor: c.acc }]} onPress={onSkip}><Text style={[s.restBTx, { color: '#fff' }]}>Pular</Text></Pressable>
    </View>
  );
}

function DoneScreen({ c, s, r, onClose, bottom }) {
  const d = new Date(r.date);
  return (
    <ScrollView contentContainerStyle={[s.pad, { paddingBottom: bottom + 24 }]}>
      <View style={{ alignItems: 'center', paddingTop: 30, paddingBottom: 18 }}>
        <View style={s.badge}>{Ico.check('#fff', 38)}</View>
        <Text style={s.doneT}>Treino concluído</Text>
        <Text style={s.doneS}>{r.routine} · {WEEKDAYS[d.getDay()]}, {d.getDate()} de {MONTHS[d.getMonth()]}</Text>
      </View>
      <View style={[s.sum, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hair }]}>
        <Stat s={s} l="Duração" v={`${Math.max(1, Math.round(r.dur / 60))} min`} />
        <Stat s={s} l="Volume" v={`${fmtN(r.vol)} kg`} />
        <Stat s={s} l="Séries" v={`${r.sets}`} />
      </View>
      {r.prs.length ? (
        <>
          <View style={[s.sec, { marginTop: 22 }]}><Text style={s.secT}>Recordes pessoais</Text><Text style={s.secS}>{r.prs.length}</Text></View>
          {r.prs.map((p) => (
            <View key={p.name} style={s.pr}><Text style={s.prN}>{p.name}</Text><Text style={s.prV}>{fmtN(p.kg)} kg</Text></View>
          ))}
        </>
      ) : <Text style={[s.doneS, { marginTop: 20, textAlign: 'left' }]}>Nenhum recorde novo desta vez. Constância é o que traz resultado.</Text>}
      <Btn s={s} label="Fechar" onPress={onClose} style={{ marginTop: 24 }} />
    </ScrollView>
  );
}

function HistoryScreen({ c, s, W, del, bottom }) {
  const [open, setOpen] = useState(null);
  const items = [];
  let month = '';
  for (const w of W) {
    const d = new Date(w.date), m = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (m !== month) { month = m; items.push({ t: 'm', k: 'm' + m, m }); }
    items.push({ t: 'w', k: w.id, w, d });
  }
  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.k}
      contentContainerStyle={[s.pad, { paddingBottom: bottom + 24 }]}
      ListHeaderComponent={<Header s={s} small={`${W.length} treinos`} title="Histórico" />}
      ListEmptyComponent={<View style={s.empty}><Text style={s.emptyT}>Nenhum treino ainda</Text><Text style={s.emptyS}>Comece um treino em Treinar e ele aparece aqui.</Text></View>}
      renderItem={({ item }) => {
        if (item.t === 'm') return <Text style={s.mh}>{item.m[0].toUpperCase() + item.m.slice(1)}</Text>;
        const { w, d } = item, on = open === w.id;
        return (
          <View style={s.hw}>
            <Pressable style={s.hwRow} onPress={() => { tap(); setOpen(on ? null : w.id); }}>
              <View style={s.dt}><Text style={s.dtN}>{d.getDate()}</Text><Text style={s.dtW}>{WD_SHORT[d.getDay()]}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowT}>{w.routine}</Text>
                <Text style={s.rowS}>{Math.max(1, Math.round((w.dur || 0) / 60))} min · {fmtN(w.vol)} kg · {pl(w.sets, 'série', 'séries')}</Text>
              </View>
              {Ico.chev(c.mut, on)}
            </Pressable>
            {on && (
              <View style={{ paddingLeft: 58, paddingBottom: 10 }}>
                {(w.ex || []).map((e) => {
                  const b = (e.sets || []).reduce((a, x) => ((x.kg || 0) >= (a ? a.kg : -1) ? x : a), null);
                  return (
                    <View key={e.name} style={s.hx}>
                      <Text style={s.hxN} numberOfLines={1}>{e.sets.length} × {e.name}</Text>
                      <Text style={s.hxV}>{b ? `${fmtN(b.kg)} kg × ${b.reps}` : ''}</Text>
                    </View>
                  );
                })}
                <Pressable onPress={() => del(w.id)} style={{ paddingVertical: 10 }}><Text style={{ color: c.red, fontFamily: F.sb, fontSize: 14 }}>Excluir treino</Text></Pressable>
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

const MET = { best: 'Carga máx', e1: '1RM est.', vol: 'Volume' };
function progData(W, name) {
  const pts = [];
  for (const w of W.slice().reverse()) {
    const e = (w.ex || []).find((x) => x.name === name); if (!e) continue;
    let best = 0, e1 = 0, v = 0, bs = null;
    for (const x of e.sets || []) { const k = num(x.kg) || 0, r = num(x.reps) || 0; if (k >= best) { best = k; bs = x; } e1 = Math.max(e1, k * (1 + r / 30)); v += k * r; }
    pts.push({ date: w.date, best, e1: Math.round(e1 * 10) / 10, vol: v, bs, n: (e.sets || []).length });
  }
  return pts;
}

function ProgressScreen({ c, s, W, allEx, bottom }) {
  const [prog, setProg] = useState(() => allEx.find((n) => W.some((w) => (w.ex || []).some((e) => e.name === n))) || allEx[0] || '');
  const [metric, setMetric] = useState('best');
  const [pick, setPick] = useState(false);
  const [cw, setCw] = useState(0);
  const pts = progData(W, prog);
  const cur = pts.length ? pts[pts.length - 1][metric] : 0, dl = pts.length ? cur - pts[0][metric] : 0;
  return (
    <ScrollView contentContainerStyle={[s.pad, { paddingBottom: bottom + 24 }]}>
      <Header s={s} small="Evolução por exercício" title="Progresso" />
      <Pressable style={s.sel} onPress={() => setPick(true)}>
        <Text style={s.selTx} numberOfLines={1}>{prog}</Text>
        {Ico.down(c.mut)}
      </Pressable>
      <View style={s.seg}>
        {Object.entries(MET).map(([k, l]) => (
          <Pressable key={k} style={[s.segB, metric === k && s.segOn]} onPress={() => { tap(); setMetric(k); }}>
            <Text style={[s.segTx, metric === k && { color: c.ink }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
      {pts.length > 0 && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={s.big}>{fmtN(cur)}</Text>
            <Text style={s.bigS}>  kg · último treino</Text>
          </View>
          <Text style={[s.delta, !(pts.length > 1 && dl > 0) && { color: c.mut }]}>{pts.length > 1 && dl > 0 ? `+${fmtN(dl)} kg desde ${ddmm(pts[0].date)}` : ' '}</Text>
        </>
      )}
      {pts.length > 1 ? (
        <View style={{ height: 230, marginVertical: 8 }} onLayout={(e) => setCw(e.nativeEvent.layout.width)}>
          {cw > 0 && <Chart c={c} pts={pts} metric={metric} w={cw} h={230} />}
        </View>
      ) : (
        <View style={s.empty}>
          <Text style={s.emptyT}>{pts.length ? 'Quase lá' : 'Sem registros'}</Text>
          <Text style={s.emptyS}>{pts.length ? 'Faça este exercício mais uma vez para ver a curva.' : 'Registre este exercício num treino para acompanhar a evolução.'}</Text>
        </View>
      )}
      {pts.length > 0 && (
        <>
          <View style={[s.sec, { marginTop: 12 }]}><Text style={s.secT}>Sessões</Text><Text style={s.secS}>{pts.length}</Text></View>
          <View style={s.list}>
            {pts.slice().reverse().slice(0, 15).map((p) => (
              <View key={p.date} style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowT, { fontSize: 17 }]}>{ddmm(p.date)}</Text>
                  <Text style={s.rowS}>{pl(p.n, 'série', 'séries')} · volume {fmtN(p.vol)} kg</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.rowGo}>{p.bs ? `${fmtN(p.bs.kg)} kg × ${p.bs.reps}` : ''}</Text>
                  <Text style={s.rowR}>melhor série</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
      <Modal visible={pick} animationType="slide" transparent onRequestClose={() => setPick(false)}>
        <Pressable style={s.modalBg} onPress={() => setPick(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <Text style={[s.secT, { marginBottom: 8 }]}>Escolha o exercício</Text>
            <FlatList data={allEx} keyExtractor={(n) => n} style={{ maxHeight: 460 }} renderItem={({ item }) => (
              <Pressable style={s.opt} onPress={() => { setProg(item); setPick(false); }}>
                <Text style={[s.optTx, item === prog && { color: c.acc, fontFamily: F.b }]}>{item}</Text>
                {item === prog && Ico.check(c.acc, 18)}
              </Pressable>
            )} />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function Chart({ c, pts, metric, w, h }) {
  const pad = { l: 34, r: 10, t: 12, b: 24 };
  const vals = pts.map((p) => p[metric]);
  const mn = Math.min(...vals), mx = Math.max(...vals), sp = (mx - mn) || Math.max(5, mx * 0.1);
  const lo = Math.max(0, mn - sp * 0.35), hi = mx + sp * 0.35;
  const X = (i) => pad.l + (i * (w - pad.l - pad.r)) / (pts.length - 1);
  const Y = (v) => pad.t + ((hi - v) * (h - pad.t - pad.b)) / (hi - lo);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p[metric]).toFixed(1)}`).join('');
  return (
    <Svg width={w} height={h}>
      <Defs>
        <LinearGradient id="gf" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.acc} stopOpacity={0.22} />
          <Stop offset="1" stopColor={c.acc} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {[lo, (lo + hi) / 2, hi].map((v, i) => (
        <Line key={'g' + i} x1={pad.l} x2={w - pad.r} y1={Y(v)} y2={Y(v)} stroke={c.hair} strokeWidth={1} />
      ))}
      {[lo, (lo + hi) / 2, hi].map((v, i) => (
        <SvgText key={'t' + i} x={pad.l - 8} y={Y(v) + 4} fontSize={11} fill={c.mut} textAnchor="end">{Math.round(v)}</SvgText>
      ))}
      <Path d={`${line}L${X(pts.length - 1)},${h - pad.b}L${pad.l},${h - pad.b}Z`} fill="url(#gf)" />
      <Path d={line} fill="none" stroke={c.acc} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => i === pts.length - 1
        ? <Circle key={i} cx={X(i)} cy={Y(p[metric])} r={5.5} fill={c.acc} stroke={c.bg} strokeWidth={3} />
        : <Circle key={i} cx={X(i)} cy={Y(p[metric])} r={3} fill={c.acc} />)}
      <SvgText x={pad.l} y={h - 4} fontSize={11} fill={c.mut}>{ddmm(pts[0].date)}</SvgText>
      <SvgText x={w - pad.r} y={h - 4} fontSize={11} fill={c.mut} textAnchor="end">{ddmm(pts[pts.length - 1].date)}</SvgText>
    </Svg>
  );
}

/* ---------------- Ficha (CRUD de exercícios) ---------------- */
function FichaScreen({ c, s, routines, saveEx, delEx, moveEx, bottom }) {
  const [sel, setSel] = useState(routines[0]?.id);
  const [edit, setEdit] = useState(null); // {routineId, ex}
  const rt = routines.find((r) => r.id === sel) || routines[0];
  if (!rt) return null;
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[s.pad, { paddingBottom: bottom + 24 }]}>
        <Header s={s} small="Monte e ajuste suas rotinas" title="Ficha" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
          {routines.map((r) => {
            const on = r.id === rt.id;
            return (
              <Pressable key={r.id} onPress={() => { tap(); setSel(r.id); }} style={[s.chip, on && { backgroundColor: c.ink, borderColor: c.ink }]}>
                <Text style={[s.chipTx, on && { color: c.inv }]}>{r.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={s.sec}><Text style={s.secT}>{rt.name}</Text><Text style={s.secS}>{rt.ex.length} exercícios · {nSets(rt)} séries</Text></View>
        {rt.focus ? <Text style={[s.rowS, { marginBottom: 10 }]}>{rt.focus}</Text> : null}
        <View style={s.list}>
          {rt.ex.map((e, i) => (
            <View key={e.id} style={s.fx}>
              <Pressable style={({ pressed }) => [{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }, pressed && { opacity: 0.6 }]} onPress={() => setEdit({ routineId: rt.id, ex: e })}>
                <Text style={s.fxN}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowT, { fontSize: 18 }]} numberOfLines={2}>{e.name}</Text>
                  <Text style={s.rowS}>{e.sets} × {e.reps} · descanso {restTxt(e.rest)}</Text>
                </View>
              </Pressable>
              <View style={s.fxMv}>
                <Pressable style={[s.mv, i === 0 && { opacity: 0.25 }]} disabled={i === 0} onPress={() => moveEx(rt, i, -1)} accessibilityLabel={`Subir ${e.name}`}>{Ico.up(c.ink)}</Pressable>
                <Pressable style={[s.mv, i === rt.ex.length - 1 && { opacity: 0.25 }]} disabled={i === rt.ex.length - 1} onPress={() => moveEx(rt, i, 1)} accessibilityLabel={`Descer ${e.name}`}>{Ico.dn(c.ink)}</Pressable>
              </View>
            </View>
          ))}
        </View>
        {!rt.ex.length && <View style={s.empty}><Text style={s.emptyT}>Rotina vazia</Text><Text style={s.emptyS}>Adicione o primeiro exercício.</Text></View>}
        <Btn s={s} label="+ Adicionar exercício" onPress={() => setEdit({ routineId: rt.id, ex: null })} style={{ marginTop: 16 }} />
        <Text style={[s.rowS, { marginTop: 14 }]}>Toque num exercício para editar ou excluir. As mudanças valem para os próximos treinos; o histórico não muda.</Text>
      </ScrollView>
      {edit && <ExEditor {...{ c, s, edit, saveEx, delEx }} onClose={() => setEdit(null)} />}
    </View>
  );
}

function ExEditor({ c, s, edit, saveEx, delEx, onClose }) {
  const e = edit.ex;
  const [name, setName] = useState(e?.name ?? '');
  const [sets, setSets] = useState(String(e?.sets ?? 3));
  const [reps, setReps] = useState(e?.reps ?? '10-12');
  const [rest, setRestS] = useState(String(e?.rest ?? 60));
  const [tip, setTip] = useState(e?.tip ?? '');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const n = name.trim(), st = parseInt(sets, 10), rs = parseInt(rest, 10), rp = reps.trim();
    if (!n) return info('Falta o nome', 'Dê um nome ao exercício.');
    if (!(st >= 1 && st <= 10)) return info('Séries inválidas', 'Use um número de 1 a 10.');
    if (!rp) return info('Faltam as repetições', 'Ex.: 8-10, 12 ou 30-60 s.');
    if (!(rs >= 0 && rs <= 600)) return info('Descanso inválido', 'Use segundos, de 0 a 600.');
    setBusy(true);
    try { await saveEx(edit.routineId, { id: e?.id, name: n, sets: st, reps: rp, rest: rs, tip: tip.trim() }); onClose(); }
    catch (err) { info('Erro', 'Não consegui salvar.'); setBusy(false); }
  };
  const remove = () => ask('Excluir exercício?', `${e.name} sai desta rotina. O histórico continua.`, 'Excluir', async () => { await delEx(e.id); onClose(); }, { destructive: true });
  const Field = ({ label, children }) => <View style={{ marginBottom: 12 }}><Text style={s.fl}>{label}</Text>{children}</View>;
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={s.modalBg} onPress={onClose}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[s.secT, { marginBottom: 14 }]}>{e ? 'Editar exercício' : 'Novo exercício'}</Text>
              {Field({ label: 'Nome', children: <TextInput style={s.fi} value={name} onChangeText={setName} placeholder="Ex.: Supino reto com barra" placeholderTextColor={c.mut} autoFocus={!e} /> })}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>{Field({ label: 'Séries', children: <TextInput style={s.fi} value={sets} onChangeText={setSets} keyboardType="number-pad" /> })}</View>
                <View style={{ flex: 1.3 }}>{Field({ label: 'Repetições', children: <TextInput style={s.fi} value={reps} onChangeText={setReps} placeholder="8-10 ou 30-60 s" placeholderTextColor={c.mut} /> })}</View>
                <View style={{ flex: 1.2 }}>{Field({ label: 'Descanso (s)', children: <TextInput style={s.fi} value={rest} onChangeText={setRestS} keyboardType="number-pad" /> })}</View>
              </View>
              {Field({ label: 'Dica de execução', children: <TextInput style={[s.fi, { height: 84, paddingTop: 12, textAlignVertical: 'top' }]} value={tip} onChangeText={setTip} multiline placeholder="Opcional" placeholderTextColor={c.mut} /> })}
              <Btn s={s} label={busy ? 'Salvando…' : 'Salvar'} onPress={busy ? undefined : save} style={{ marginTop: 4 }} />
              {e && <Btn s={s} ghost label="Excluir exercício" onPress={remove} style={{ marginTop: 10 }} />}
              <Pressable onPress={onClose} style={{ alignItems: 'center', paddingVertical: 14 }}><Text style={{ color: c.mut, fontFamily: F.sb, fontSize: 15 }}>Cancelar</Text></Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ---------------- Styles ---------------- */
function makeStyles(c) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    pad: { paddingHorizontal: 18 },
    hd: { paddingTop: 14, paddingBottom: 14 },
    hdSmall: { color: c.mut, fontSize: 15, fontFamily: F.r },
    hdTitle: { color: c.ink, fontSize: 40, fontFamily: F.xb, letterSpacing: -0.8, marginTop: 2 },
    week: { flexDirection: 'row', gap: 6, marginBottom: 14 },
    wd: { flex: 1, alignItems: 'center', paddingTop: 8, paddingBottom: 10, borderRadius: 12, gap: 4 },
    wdToday: { backgroundColor: c.s1, borderWidth: 1.5, borderColor: c.ink },
    wdL: { fontSize: 12, color: c.mut, fontFamily: F.m },
    wdR: { fontSize: 13, color: c.ink, fontFamily: F.n },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.hair },
    hero: { backgroundColor: c.ink, borderRadius: 22, padding: 20, paddingTop: 22, marginBottom: 26, overflow: 'hidden' },
    heroBg: { position: 'absolute', right: -18, top: -14, opacity: 0.09 },
    heroK: { color: c.inv, opacity: 0.65, fontSize: 14, fontFamily: F.m },
    heroT: { color: c.inv, fontSize: 62, lineHeight: 64, fontFamily: F.n, letterSpacing: -1.2, marginTop: 4 },
    heroP: { color: c.inv, opacity: 0.7, fontSize: 15, fontFamily: F.r, marginBottom: 16 },
    meta: { flexDirection: 'row', marginBottom: 18 },
    metaV: { color: c.inv, fontSize: 26, fontFamily: F.n },
    metaL: { color: c.inv, opacity: 0.6, fontSize: 13, fontFamily: F.r },
    btn: { height: 52, borderRadius: 14, backgroundColor: c.acc, alignItems: 'center', justifyContent: 'center' },
    btnTx: { color: '#fff', fontSize: 17, fontFamily: F.b },
    btnAlt: { backgroundColor: c.bg },
    btnAltTx: { color: c.ink },
    btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.hair },
    btnGhostTx: { color: c.red },
    sec: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
    secT: { color: c.ink, fontSize: 22, fontFamily: F.n },
    secS: { color: c.mut, fontSize: 14, fontFamily: F.r },
    list: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hair },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.hair, gap: 12 },
    rowT: { color: c.ink, fontSize: 20, fontFamily: F.n },
    rowS: { color: c.mut, fontSize: 14, fontFamily: F.r, marginTop: 2 },
    rowGo: { color: c.acc, fontSize: 15, fontFamily: F.sb },
    rowR: { color: c.mut, fontSize: 13, fontFamily: F.r },
    bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 10, backgroundColor: c.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.hair, gap: 8 },
    ib: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    barT: { color: c.ink, fontSize: 19, fontFamily: F.n },
    barS: { color: c.mut, fontSize: 13, fontFamily: F.m, fontVariant: ['tabular-nums'] },
    fin: { height: 40, paddingHorizontal: 16, borderRadius: 11, backgroundColor: c.okD, justifyContent: 'center' },
    finTx: { color: '#fff', fontFamily: F.b, fontSize: 15 },
    sum: { flexDirection: 'row', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.hair },
    statL: { color: c.mut, fontSize: 13, fontFamily: F.r },
    statV: { color: c.ink, fontSize: 28, fontFamily: F.n, fontVariant: ['tabular-nums'] },
    statSub: { color: c.mut, fontSize: 17 },
    ex: { paddingTop: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.hair },
    exT: { color: c.acc, fontSize: 22, fontFamily: F.n },
    exS: { color: c.mut, fontSize: 14, fontFamily: F.r, marginTop: 3 },
    tip: { borderLeftWidth: 2, borderLeftColor: c.hair, paddingLeft: 10, marginVertical: 10 },
    tipTx: { color: c.mut, fontSize: 14, fontFamily: F.r, lineHeight: 19 },
    sg: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingVertical: 4, borderRadius: 10 },
    th: { color: c.mut, fontSize: 12, fontFamily: F.sb, textAlign: 'center' },
    sn: { color: c.ink, fontSize: 17, fontFamily: F.n, textAlign: 'center' },
    prev: { flex: 1, color: c.mut, fontSize: 14, fontFamily: F.r, paddingLeft: 6 },
    inp: { height: 40, borderRadius: 9, backgroundColor: c.s2, color: c.ink, fontSize: 18, fontFamily: F.n, textAlign: 'center', padding: 0 },
    ck: { width: 44, height: 40, borderRadius: 9, backgroundColor: c.s2, alignItems: 'center', justifyContent: 'center' },
    add: { height: 42, borderRadius: 10, backgroundColor: c.s2, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    addTx: { color: c.ink, fontFamily: F.sb, fontSize: 15 },
    lk: { alignSelf: 'flex-end', paddingVertical: 10, paddingHorizontal: 4 },
    lkTx: { color: c.mut, fontSize: 14, fontFamily: F.r },
    rest: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.ink, borderRadius: 18, padding: 10, paddingLeft: 12, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
    restT: { color: c.inv, fontSize: 30, fontFamily: F.n, fontVariant: ['tabular-nums'] },
    restS: { color: c.inv, opacity: 0.6, fontSize: 12, fontFamily: F.r },
    restB: { height: 40, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.mut + '40', justifyContent: 'center' },
    restBTx: { color: c.inv, fontFamily: F.b, fontSize: 14 },
    tabbar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', backgroundColor: c.s1, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hair },
    tab: { flex: 1, height: 62, alignItems: 'center', justifyContent: 'center', gap: 3 },
    tabTx: { fontSize: 12, fontFamily: F.sb },
    badge: { width: 76, height: 76, borderRadius: 38, backgroundColor: c.okD, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    doneT: { color: c.ink, fontSize: 42, fontFamily: F.n },
    doneS: { color: c.mut, fontSize: 15, fontFamily: F.r, textAlign: 'center', marginTop: 4 },
    pr: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.hair },
    prN: { color: c.ink, fontSize: 15, fontFamily: F.r, flex: 1 },
    prV: { color: c.acc, fontSize: 18, fontFamily: F.n },
    mh: { color: c.mut, fontSize: 15, fontFamily: F.n, paddingTop: 18, paddingBottom: 4 },
    hw: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.hair },
    hwRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    dt: { width: 46, alignItems: 'center' },
    dtN: { color: c.ink, fontSize: 28, fontFamily: F.n, lineHeight: 30 },
    dtW: { color: c.mut, fontSize: 12, fontFamily: F.r },
    hx: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, gap: 10 },
    hxN: { color: c.ink, fontSize: 15, fontFamily: F.r, flex: 1 },
    hxV: { color: c.mut, fontSize: 15, fontFamily: F.r },
    sel: { height: 50, borderRadius: 12, backgroundColor: c.s1, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hair, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 },
    selTx: { flex: 1, color: c.ink, fontSize: 16, fontFamily: F.sb },
    seg: { flexDirection: 'row', backgroundColor: c.s2, borderRadius: 11, padding: 3, marginTop: 12, marginBottom: 18 },
    segB: { flex: 1, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    segOn: { backgroundColor: c.s1, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
    segTx: { color: c.mut, fontSize: 14, fontFamily: F.sb },
    big: { color: c.ink, fontSize: 60, fontFamily: F.n, letterSpacing: -1.2, fontVariant: ['tabular-nums'] },
    bigS: { color: c.mut, fontSize: 15, fontFamily: F.r },
    delta: { color: c.okD, fontSize: 14, fontFamily: F.sb, marginTop: 2, marginBottom: 6 },
    empty: { paddingVertical: 44, alignItems: 'center' },
    emptyT: { color: c.ink, fontSize: 22, fontFamily: F.n, marginBottom: 4 },
    emptyS: { color: c.mut, fontSize: 15, fontFamily: F.r, textAlign: 'center' },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.s1, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 34 },
    opt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.hair },
    optTx: { color: c.ink, fontSize: 16, fontFamily: F.r, flex: 1 },
    chip: { height: 38, paddingHorizontal: 16, borderRadius: 19, borderWidth: 1, borderColor: c.hair, backgroundColor: c.s1, justifyContent: 'center' },
    chipTx: { color: c.ink, fontSize: 15, fontFamily: F.sb },
    fx: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.hair },
    fxN: { width: 22, color: c.mut, fontSize: 16, fontFamily: F.n, textAlign: 'center' },
    fxMv: { flexDirection: 'row', gap: 4 },
    mv: { width: 38, height: 38, borderRadius: 10, backgroundColor: c.s2, alignItems: 'center', justifyContent: 'center' },
    fl: { color: c.mut, fontSize: 13, fontFamily: F.sb, marginBottom: 6 },
    fi: { height: 48, borderRadius: 12, backgroundColor: c.s2, color: c.ink, fontSize: 16, fontFamily: F.m, paddingHorizontal: 14 },
  });
}
