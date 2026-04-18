import { useState, useEffect } from 'react'

type Step = 'start' | 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'result'

interface Answers {
  area: string
  electricBill: string
  roofDirection: string
  kw: string
  battery: string
}

const AREAS = ['福岡県', '佐賀県', '熊本県', '長崎県', '大分県', '宮崎県', '鹿児島県']

const AREA_FACTOR: Record<string, number> = {
  '福岡県': 1.00, '佐賀県': 1.03, '熊本県': 1.05,
  '長崎県': 1.02, '大分県': 0.98, '宮崎県': 1.10, '鹿児島県': 1.08,
}
const DIRECTION_FACTOR: Record<string, number> = {
  '西': 0.85, '南西': 0.93, '南': 1.00, '東南': 0.93, '東': 0.85,
}
const BILL_MONTHLY: Record<string, number> = {
  '1万円': 10000, '1.5万円': 15000, '2万円以上': 20000,
}
const KW_VALUE:      Record<string, number> = { '3kW': 3, '6kW': 6, '9kW': 9 }
const BATTERY_KWH:   Record<string, number> = { 'なし': 0, '5kWh': 5, '10kWh': 10, '15kWh': 15 }

const BUY_PRICE = 30
const FIT_1_4   = 24
const FIT_5_10  = 8.3
const FIT_11_30 = 7
const SOLAR_SELF = 100

interface CalcResult {
  monthlyBill: number; afterBill: number
  monthlyReduction: number; monthlyIncome: number
  monthlySaving: number; annualSaving: number
  savings30: number; annualGen: number; selfTotal: number
}

function calcResult(answers: Answers): CalcResult {
  const monthlyBill = BILL_MONTHLY[answers.electricBill] ?? 15000
  const kw          = KW_VALUE[answers.kw] ?? 6
  const batteryKwh  = BATTERY_KWH[answers.battery] ?? 0
  const areaF       = AREA_FACTOR[answers.area] ?? 1.0
  const dirF        = DIRECTION_FACTOR[answers.roofDirection] ?? 1.0

  const annualGen  = Math.round(kw * 1000 * areaF * dirF)
  const monthlyGen = annualGen / 12

  const batterySelf = batteryKwh * 30
  const selfTotal   = SOLAR_SELF + batterySelf

  const monthlyReduction = Math.round(selfTotal * BUY_PRICE)
  const afterBill        = Math.max(monthlyBill - monthlyReduction, 0)

  const monthlySell   = Math.max(monthlyGen - selfTotal, 0)
  const monthlyIncome = Math.round(monthlySell * FIT_1_4)

  const sellIncome30 = Math.round(
    monthlySell * FIT_1_4   * 48  +
    monthlySell * FIT_5_10  * 72  +
    monthlySell * FIT_11_30 * 240
  )
  const savings30    = monthlyReduction * 360 + sellIncome30
  const annualSaving = monthlyReduction * 12 + monthlyIncome * 12

  return { monthlyBill, afterBill, monthlyReduction, monthlyIncome,
           monthlySaving: monthlyReduction + monthlyIncome,
           annualSaving, savings30, annualGen, selfTotal }
}

// ── hooks ──────────────────────────────────────────────────────────────
function useCountUp(target: number, active: boolean, duration = 1800) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active) { setValue(0); return }
    let t0: number | null = null
    const frame = (ts: number) => {
      if (!t0) t0 = ts
      const p = Math.min((ts - t0) / duration, 1)
      setValue(Math.floor((1 - Math.pow(1 - p, 4)) * target))
      if (p < 1) requestAnimationFrame(frame)
    }
    const id = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(id)
  }, [target, active, duration])
  return value
}

// ── small components ───────────────────────────────────────────────────
const Q_STEPS: Step[] = ['q1', 'q2', 'q3', 'q4', 'q5']

function ProgressBar({ step }: { step: Step }) {
  const idx = Q_STEPS.indexOf(step)
  if (idx === -1) return null
  const pct = ((idx + 1) / 5) * 100
  return (
    <div className="px-4 pt-4 pb-1">
      <div className="flex justify-between text-xs text-gray-400 mb-1.5">
        <span>質問 {idx + 1} / 5</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#8FAA00,#1E5C14)' }} />
      </div>
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 px-4 pt-3 pb-0">
      ← 戻る
    </button>
  )
}

function NextBtn({ active, onClick, label = '次の質問へ →' }: {
  active: boolean; onClick: () => void; label?: string
}) {
  return (
    <button onClick={onClick} disabled={!active}
      className={`w-full py-4 rounded-xl font-bold text-base transition-all mt-5 ${
        active
          ? 'bg-black hover:bg-gray-800 text-white shadow-md active:scale-[0.98]'
          : 'bg-gray-100 text-gray-300 cursor-not-allowed'
      }`}>
      {label}
    </button>
  )
}

function BigCard({ label, desc, icon, selected, onClick, badge }: {
  label: string; desc?: string; icon?: string; selected: boolean; onClick: () => void; badge?: string
}) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-4 py-4 rounded-xl border-2 transition-all duration-150 flex items-center gap-3 relative active:scale-[0.98] ${
        selected
          ? 'bg-[#1E5C14] border-[#1E5C14] text-white shadow-lg'
          : 'bg-white border-gray-200 text-gray-800 hover:border-[#4A8A1A] hover:bg-green-50'
      }`}>
      {icon && <span className="text-2xl shrink-0 leading-none">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-base leading-tight">{label}</div>
        {desc && <div className={`text-xs mt-0.5 ${selected ? 'text-white/75' : 'text-gray-400'}`}>{desc}</div>}
      </div>
      {badge && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
          selected ? 'bg-white/25 text-white' : 'bg-[#9EC200] text-white'
        }`}>{badge}</span>
      )}
      {selected && <span className="text-lg shrink-0">✓</span>}
    </button>
  )
}

function QWrap({ children }: { children: React.ReactNode }) {
  return <div className="px-4 pt-4 pb-2 space-y-3">{children}</div>
}

function QTitle({ n, title, sub }: { n: string; title: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 mb-4 pt-1">
      <span className="bg-black text-white text-xs w-7 h-7 rounded-full flex items-center justify-center font-bold shrink-0 mt-0.5">{n}</span>
      <div>
        <p className="font-bold text-gray-800 text-base leading-snug">{title}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Kyushu SVG map ─────────────────────────────────────────────────────
// viewBox 0 0 305 415  (x:west→east, y:north→south)
const PREF_PATHS: { id: string; d: string; lx: number; ly: number }[] = [
  {
    id: '福岡県',
    // top, wide — 北九州 bulges NE
    d: 'M 14,24 L 46,8 L 158,2 L 240,6 L 278,18 L 288,52 L 275,80 L 248,94 L 215,100 L 168,114 L 138,116 L 108,102 L 80,92 L 54,82 L 35,72 L 15,80 Z',
    lx: 155, ly: 58,
  },
  {
    id: '佐賀県',
    // NW center, small — between 福岡/長崎/熊本
    d: 'M 15,80 L 35,72 L 54,82 L 80,92 L 108,102 L 116,126 L 96,152 L 68,162 L 44,155 L 24,138 L 14,118 Z',
    lx: 58, ly: 116,
  },
  {
    id: '長崎県',
    // west + 島原半島 jutting east (Ariake Sea bay between peninsula and 熊本)
    d: 'M 14,118 L 24,138 L 44,155 L 68,162 L 96,152 L 112,162 L 118,182 L 122,202 L 112,222 L 95,232 L 78,220 L 70,232 L 56,222 L 38,234 L 18,238 L 4,220 L 2,194 L 5,162 L 10,138 Z',
    lx: 36, ly: 178,
  },
  {
    id: '大分県',
    // NE — irregular east coastline
    d: 'M 215,100 L 248,94 L 275,80 L 288,52 L 278,18 L 295,42 L 299,82 L 290,120 L 270,150 L 244,162 L 222,166 L 210,142 L 205,120 Z',
    lx: 258, ly: 110,
  },
  {
    id: '熊本県',
    // center — west side concave (有明海 bay)
    d: 'M 108,102 L 138,116 L 168,114 L 215,100 L 205,120 L 210,142 L 222,166 L 218,200 L 208,234 L 186,254 L 158,262 L 128,262 L 100,256 L 80,248 L 74,232 L 82,212 L 88,192 L 92,170 L 96,152 L 116,126 Z',
    lx: 162, ly: 188,
  },
  {
    id: '宮崎県',
    // SE — tall, east coast strip
    d: 'M 222,166 L 244,162 L 270,150 L 282,178 L 275,222 L 260,262 L 248,290 L 234,306 L 220,308 L 205,290 L 198,266 L 200,248 L 208,234 L 218,200 Z',
    lx: 245, ly: 228,
  },
  {
    id: '鹿児島県',
    // south — double peninsula (薩摩 + 大隅) with 錦江湾 bay
    d: 'M 100,256 L 128,262 L 158,262 L 186,254 L 208,234 L 200,248 L 198,266 L 205,290 L 220,308 L 216,334 L 202,348 L 182,355 L 162,330 L 152,362 L 138,362 L 118,354 L 104,330 L 88,358 L 72,348 L 70,322 L 76,298 L 74,270 L 80,248 Z',
    lx: 150, ly: 300,
  },
]

function KyushuMap({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-xs text-gray-400 text-center mb-1">県をタップして選択</p>
      <svg viewBox="0 0 305 415" className="w-full" style={{ maxHeight: '340px' }}>
        {/* sea background */}
        <rect width="305" height="415" fill="#D6EAF8" rx="8" />
        {PREF_PATHS.map(p => (
          <g key={p.id} onClick={() => onChange(p.id)} style={{ cursor: 'pointer' }}>
            <path
              d={p.d}
              fill={value === p.id ? '#1E5C14' : '#C8E6A0'}
              stroke="#fff"
              strokeWidth="1.8"
              opacity={value && value !== p.id ? 0.72 : 1}
            />
            <text
              x={p.lx} y={p.ly}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="11" fontWeight="bold"
              fill={value === p.id ? '#fff' : '#1a4010'}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {p.id.replace('県', '')}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 text-center min-h-[32px]">
        {value ? (
          <span className="inline-block bg-[#1E5C14] text-white text-sm font-bold px-4 py-1.5 rounded-full">
            ✓ {value}
          </span>
        ) : (
          <span className="text-xs text-gray-300">選択してください</span>
        )}
      </div>
    </div>
  )
}

// ── direction compass ──────────────────────────────────────────────────
const DIR_DATA = [
  { label: '西',  arrow: '←', col: 'col-start-1' },
  { label: '南西', arrow: '↙', col: 'col-start-2' },
  { label: '南',  arrow: '↓', col: 'col-start-3', badge: '最多' },
  { label: '東南', arrow: '↘', col: 'col-start-4' },
  { label: '東',  arrow: '→', col: 'col-start-5' },
]

function DirectionPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-center justify-center gap-6 text-center">
        <div className="text-xs text-gray-400 leading-relaxed">屋根が一番<br/>向いている方角</div>
        <div className="relative w-20 h-20 rounded-full border-2 border-gray-200 bg-white flex items-center justify-center">
          <span className="text-2xl">🏠</span>
          <span className="absolute top-0.5 text-[9px] text-gray-400">北</span>
          <span className="absolute bottom-0.5 text-[9px] text-[#1E5C14] font-bold">南</span>
          <span className="absolute left-0.5 text-[9px] text-gray-400">西</span>
          <span className="absolute right-0.5 text-[9px] text-gray-400">東</span>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {DIR_DATA.map(d => (
          <button key={d.label} onClick={() => onChange(d.label)}
            className={`py-3 rounded-xl border-2 text-center transition-all relative active:scale-[0.96] ${
              value === d.label
                ? 'bg-[#1E5C14] border-[#1E5C14] text-white shadow-md'
                : 'bg-white border-gray-200 text-gray-700 hover:border-[#4A8A1A]'
            }`}>
            {d.badge && (
              <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold px-1 py-0.5 rounded-full whitespace-nowrap ${
                value === d.label ? 'bg-white/25 text-white' : 'bg-[#9EC200] text-white'
              }`}>{d.badge}</span>
            )}
            <div className="text-base leading-none mb-0.5">{d.arrow}</div>
            <div className="text-xs font-semibold">{d.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── animated bar row ───────────────────────────────────────────────────
function BarRow({ label, value, max, color, amount, delay = 0, active }: {
  label: string; value: number; max: number; color: string; amount: string; delay?: number; active: boolean
}) {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    if (!active) { setPct(0); return }
    const t = setTimeout(() => setPct(Math.min((value / max) * 100, 100)), delay)
    return () => clearTimeout(t)
  }, [active, value, max, delay])
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-16 text-right text-xs text-gray-500 shrink-0">{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${color}`}
          style={{ width: `${pct}%` }} />
      </div>
      <div className="w-28 text-right text-sm font-semibold text-gray-700 shrink-0">{amount}</div>
    </div>
  )
}

// ── main app ───────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep]       = useState<Step>('start')
  const [answers, setAnswers] = useState<Answers>({
    area: '', electricBill: '', roofDirection: '南', kw: '6kW', battery: 'なし',
  })
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    if (step === 'result') setTimeout(() => setAnimated(true), 200)
    else setAnimated(false)
  }, [step])

  const r = calcResult(answers.area
    ? answers
    : { ...answers, area: '福岡県', electricBill: '1.5万円' })

  const savings30Count = useCountUp(r.savings30, animated)
  const fmt  = (n: number) => `約 ${n.toLocaleString()}円`
  const fmtM = (n: number) => `約 ${n.toLocaleString()}円/月`

  const goBack = () => {
    const idx = Q_STEPS.indexOf(step)
    if (idx > 0) setStep(Q_STEPS[idx - 1])
    else setStep('start')
  }
  const goNext = () => {
    const idx = Q_STEPS.indexOf(step)
    if (idx < Q_STEPS.length - 1) setStep(Q_STEPS[idx + 1])
    else setStep('result')
  }
  const set = (key: keyof Answers) => (v: string) =>
    setAnswers(p => ({ ...p, [key]: v }))

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100 py-3 px-5 shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex justify-center">
          <button onClick={() => { setStep('start'); setAnswers({ area: '', electricBill: '', roofDirection: '南', kw: '6kW', battery: 'なし' }) }}>
            <img src="/logo.png" alt="株式会社FORLIFE" className="h-8 w-auto" />
          </button>
        </div>
      </header>

      {/* ヒーロー（スタートのみ） */}
      {step === 'start' && (
        <div className="text-white py-10 px-5 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#8FAA00 0%,#4A8A1A 50%,#1E5C14 100%)' }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '20px 20px' }} />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 bg-black/40 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
              ☀ 無料シミュレーション
            </div>
            <h1 className="text-2xl font-bold mb-2">電気代、もっと<br />下げられます。</h1>
            <p className="text-sm opacity-90">太陽光＋蓄電池で月々の光熱費をシミュレーション</p>
            <p className="text-xs opacity-70 mt-1">5つの質問に答えるだけ・所要1分</p>
          </div>
        </div>
      )}

      <main className="max-w-lg mx-auto pb-10">

        {/* ── スタート ── */}
        {step === 'start' && (
          <div className="bg-white rounded-2xl shadow-sm mx-4 mt-4 p-6">
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              お住まいの条件を入力するだけで、太陽光発電・蓄電池を導入した場合の節約額を簡単に試算できます。※試算結果は目安です。地域・日射量・設備仕様により実際の効果は異なります。
            </p>
            <button onClick={() => setStep('q1')}
              className="w-full bg-black hover:bg-gray-800 text-white font-bold py-4 rounded-xl text-base transition-colors shadow">
              いますぐ試算する →
            </button>
          </div>
        )}

        {/* ── Q1 エリア ── */}
        {step === 'q1' && (
          <div className="bg-white rounded-2xl shadow-sm mx-4 mt-4">
            <BackButton onClick={() => setStep('start')} />
            <ProgressBar step="q1" />
            <QWrap>
              <QTitle n="01" title="お住まいのエリアを選択してください" />
              <div className="grid grid-cols-2 gap-2">
                {AREAS.map(a => (
                  <button key={a} onClick={() => set('area')(a)}
                    className={`py-3.5 px-3 rounded-xl border-2 text-sm font-semibold transition-all active:scale-[0.97] ${
                      answers.area === a
                        ? 'bg-[#1E5C14] border-[#1E5C14] text-white shadow-md'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-[#4A8A1A]'
                    }`}>
                    {answers.area === a ? '✓ ' : ''}{a}
                  </button>
                ))}
              </div>
              <NextBtn active={!!answers.area} onClick={goNext} />
            </QWrap>
          </div>
        )}

        {/* ── Q2 電気代 ── */}
        {step === 'q2' && (
          <div className="bg-white rounded-2xl shadow-sm mx-4 mt-4">
            <BackButton onClick={goBack} />
            <ProgressBar step="q2" />
            <QWrap>
              <QTitle n="02" title="月々の電気代（目安）を教えてください"
                sub="わからなければ平均的な金額を選んでください" />
              <BigCard label="1万円前後" desc="〜10,000円/月"
                selected={answers.electricBill === '1万円'}
                onClick={() => set('electricBill')('1万円')} />
              <BigCard label="1.5万円前後" desc="〜15,000円/月"
                selected={answers.electricBill === '1.5万円'}
                onClick={() => set('electricBill')('1.5万円')} badge="平均的" />
              <BigCard label="2万円以上" desc="20,000円〜/月"
                selected={answers.electricBill === '2万円以上'}
                onClick={() => set('electricBill')('2万円以上')} />
              <NextBtn active={!!answers.electricBill} onClick={goNext} />
            </QWrap>
          </div>
        )}

        {/* ── Q3 屋根の向き ── */}
        {step === 'q3' && (
          <div className="bg-white rounded-2xl shadow-sm mx-4 mt-4">
            <BackButton onClick={goBack} />
            <ProgressBar step="q3" />
            <QWrap>
              <QTitle n="03" title="家（屋根）の向きを選択してください"
                sub="太陽光パネルを設置する屋根が向いている方角" />
              <DirectionPicker value={answers.roofDirection} onChange={set('roofDirection')} />
              <NextBtn active={!!answers.roofDirection} onClick={goNext} />
            </QWrap>
          </div>
        )}

        {/* ── Q4 kW ── */}
        {step === 'q4' && (
          <div className="bg-white rounded-2xl shadow-sm mx-4 mt-4">
            <BackButton onClick={goBack} />
            <ProgressBar step="q4" />
            <QWrap>
              <QTitle n="04" title="設置するパネルの規模を選んでください"
                sub="屋根の広さや家族構成の目安です。迷ったら6kWが標準的です" />
              <BigCard label="3kW" desc="小さめ｜1〜2人暮らし向け"
                selected={answers.kw === '3kW'} onClick={() => set('kw')('3kW')} />
              <BigCard label="6kW" desc="標準｜3〜4人家族向け"
                selected={answers.kw === '6kW'} onClick={() => set('kw')('6kW')} badge="人気" />
              <BigCard label="9kW" desc="大きめ｜5人以上・売電重視"
                selected={answers.kw === '9kW'} onClick={() => set('kw')('9kW')} />
              <p className="text-xs text-gray-400 pt-1">※10kW以上は全量売電となります</p>
              <NextBtn active={!!answers.kw} onClick={goNext} />
            </QWrap>
          </div>
        )}

        {/* ── Q5 蓄電池 ── */}
        {step === 'q5' && (
          <div className="bg-white rounded-2xl shadow-sm mx-4 mt-4">
            <BackButton onClick={goBack} />
            <ProgressBar step="q5" />
            <QWrap>
              <QTitle n="05" title="蓄電池はご検討ですか？"
                sub="夜間も自家消費でき節約効果UP。停電時の備えとしても注目されています" />
              <BigCard label="蓄電池なし" desc="太陽光のみ設置"
                selected={answers.battery === 'なし'} onClick={() => set('battery')('なし')} />
              <BigCard label="5kWh" desc="停電対策・基本モデル｜約5時間分"
                selected={answers.battery === '5kWh'} onClick={() => set('battery')('5kWh')} />
              <BigCard label="10kWh" desc="バランス型・最も人気｜約10時間分"
                selected={answers.battery === '10kWh'} onClick={() => set('battery')('10kWh')} badge="人気" />
              <BigCard label="15kWh" desc="大容量・長期停電にも安心｜約15時間分"
                selected={answers.battery === '15kWh'} onClick={() => set('battery')('15kWh')} />
              <NextBtn active={!!answers.battery} onClick={goNext} label="結果を見る 🎉" />
            </QWrap>
          </div>
        )}

        {/* ── 結果 ── */}
        {step === 'result' && (
          <div className="space-y-4 mx-4 mt-4">

            {/* 30年ヒーロー */}
            <div className="rounded-2xl overflow-hidden shadow-lg text-white"
              style={{ background: 'linear-gradient(135deg,#8FAA00 0%,#1E5C14 100%)' }}>
              <div className="px-6 pt-7 pb-3 text-center">
                <p className="text-sm font-medium opacity-90 mb-1">30年間で節約できる金額</p>
                <p className="text-5xl font-bold tracking-tight my-3 tabular-nums">
                  {Math.round(savings30Count / 10000).toLocaleString()}<span className="text-2xl font-semibold ml-1">万円</span>
                </p>
                <p className="text-xs opacity-65">※売電収入（FIT含む）を合わせた30年間の累計試算</p>
              </div>
              <div className="grid grid-cols-2 gap-px bg-white/20 mt-3">
                <div className="bg-white/10 px-4 py-3.5 text-center">
                  <p className="text-xs opacity-75">月間節約合計</p>
                  <p className="text-xl font-bold mt-0.5">{fmtM(r.monthlySaving)}</p>
                </div>
                <div className="bg-white/10 px-4 py-3.5 text-center">
                  <p className="text-xs opacity-75">初年度 年間節約</p>
                  <p className="text-xl font-bold mt-0.5">{fmt(r.annualSaving)}</p>
                </div>
              </div>
            </div>

            {/* 電気代比較 */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4">📊 電気代シミュレーション（月間）</h2>
              <BarRow label="設置前" value={r.monthlyBill} max={r.monthlyBill}
                color="bg-gray-400" amount={fmtM(r.monthlyBill)} active={animated} delay={0} />
              <BarRow label="設置後" value={r.afterBill} max={r.monthlyBill}
                color="bg-[#1E5C14]" amount={fmtM(r.afterBill)} active={animated} delay={300} />
              <BarRow label="売電収入" value={r.monthlyIncome} max={r.monthlyBill}
                color="bg-[#9EC200]" amount={fmtM(r.monthlyIncome)} active={animated} delay={600} />
              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
                  <p className="text-xs text-gray-500 mb-1">電気代削減（月）</p>
                  <p className="text-lg font-bold text-[#1E5C14]">{fmtM(r.monthlyReduction)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">自家消費 {r.selfTotal}kWh/月</p>
                </div>
                <div className="bg-lime-50 rounded-xl p-3 text-center border border-lime-100">
                  <p className="text-xs text-gray-500 mb-1">売電収入（月）</p>
                  <p className="text-lg font-bold text-[#4A8A1A]">{fmtM(r.monthlyIncome)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">FIT単価 {FIT_1_4}円/kWh</p>
                </div>
              </div>
            </div>

            {/* 入力内容サマリー */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700">📋 あなたの入力内容</h3>
                <button onClick={() => setStep('q1')}
                  className="text-xs text-[#4A8A1A] font-semibold hover:underline">
                  条件を変える
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ['エリア', answers.area],
                  ['電気代', answers.electricBill + '/月'],
                  ['屋根の向き', answers.roofDirection],
                  ['パネル容量', answers.kw],
                  ['蓄電池', answers.battery],
                  ['年間発電量', `約 ${r.annualGen.toLocaleString()} kWh`],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-gray-400">{label}</p>
                    <p className="font-semibold text-gray-700 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 試算根拠 */}
            <details className="bg-white rounded-2xl shadow-sm p-4">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                試算の根拠を見る ▾
              </summary>
              <div className="mt-3 bg-gray-50 rounded-lg p-3 space-y-1 text-xs text-gray-500">
                <p>エリア係数：{AREA_FACTOR[answers.area]} ／ 向き係数：{DIRECTION_FACTOR[answers.roofDirection]}</p>
                <p>自家消費：太陽光 100kWh ＋ 蓄電池 {BATTERY_KWH[answers.battery] * 30}kWh ＝ {r.selfTotal}kWh/月</p>
                <p>買電単価：{BUY_PRICE}円/kWh</p>
                <p>売電単価：年1〜4年目 {FIT_1_4}円 ／ 年5〜10年目 {FIT_5_10}円 ／ 年11〜30年目 {FIT_11_30}円</p>
              </div>
            </details>

            {/* CTA */}
            <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
              <p className="text-sm text-gray-600 mb-1 font-semibold">
                あなたの家に合った正確な金額を無料でご提案
              </p>
              <p className="text-xs text-gray-400 mb-4">専門スタッフが現地調査のうえ、設置費用・回収期間まで丁寧にご説明します</p>
              <button className="w-full bg-black hover:bg-gray-800 text-white font-bold py-4 rounded-xl text-base transition-colors shadow-md">
                無料で詳しく試算してもらう →
              </button>
            </div>

            <button onClick={() => { setStep('q1'); setAnswers({ area: '', electricBill: '', roofDirection: '南', kw: '6kW', battery: 'なし' }) }}
              className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 text-center">
              ← もう一度入力し直す
            </button>
          </div>
        )}
      </main>

      <footer className="bg-[#3D3D3D] text-white mt-6 py-8 px-5 text-center">
        <div className="max-w-lg mx-auto">
          <a href="https://forlife04.jp" target="_blank" rel="noopener noreferrer">
            <img src="/logo.png" alt="株式会社FORLIFE" className="h-8 w-auto mx-auto brightness-0 invert mb-3" />
          </a>
          <p className="text-xs text-gray-400">太陽光発電・蓄電池・EV充電設備・電気工事</p>
          <p className="text-xs text-gray-500 mt-1">福岡県大野城市仲畑3丁目2-10 / 東京都西東京市中町2丁目4-1</p>
          <p className="text-xs text-gray-600 mt-3">© 2025 株式会社FORLIFE</p>
        </div>
      </footer>
    </div>
  )
}
