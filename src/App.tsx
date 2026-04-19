import { useState, useEffect } from 'react'

type Step = 'start' | 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'result'

interface Answers {
  panelKw: string
  batteryKwh: string
  annualGen: string
  monthlyBill: string
  selfConsume: string
}

const DEFAULT_ANSWERS: Answers = {
  panelKw: '',
  batteryKwh: '',
  annualGen: '',
  monthlyBill: '',
  selfConsume: '100',
}

const BUY_PRICE = 30
const FIT_1_4   = 24
const FIT_5_10  = 8.3
const FIT_11_30 = 7

interface YearRow {
  year: number
  annualSaving: number
  cumReduction: number
  cumSell: number
  cumTotal: number
}

interface CalcResult {
  monthlyBillNum: number; afterBill: number
  monthlyReduction: number; monthlyIncome: number
  monthlySaving: number; annualSaving: number
  savings30: number; annualGenNum: number; selfTotal: number
  monthlySell: number; yearRows: YearRow[]
}

function calcResult(answers: Answers): CalcResult {
  const monthlyBillNum = parseFloat(answers.monthlyBill) || 14000
  const batteryKwhNum  = parseFloat(answers.batteryKwh)  || 0
  const annualGenNum   = parseFloat(answers.annualGen)   || 8862
  const selfConsumeNum = parseFloat(answers.selfConsume) || 100

  const monthlyGen       = annualGenNum / 12
  const selfTotal        = selfConsumeNum + batteryKwhNum * 30
  const monthlyReduction = Math.round(selfTotal * BUY_PRICE)
  const afterBill        = Math.max(monthlyBillNum - monthlyReduction, 0)
  const monthlySell      = Math.max(monthlyGen - selfTotal, 0)
  const monthlyIncome    = Math.round(monthlySell * FIT_1_4)

  const cumSell = (yr: number) =>
    Math.round(
      Math.min(yr, 4)                    * 12 * monthlySell * FIT_1_4   +
      Math.max(0, Math.min(yr, 10) - 4)  * 12 * monthlySell * FIT_5_10  +
      Math.max(0, Math.min(yr, 30) - 10) * 12 * monthlySell * FIT_11_30
    )

  const annualSavingForYear = (yr: number) => {
    const rate = yr <= 4 ? FIT_1_4 : yr <= 10 ? FIT_5_10 : FIT_11_30
    return Math.round(monthlyReduction * 12 + monthlySell * rate * 12)
  }

  const targetYears = [1,2,3,4,5,6,7,8,9,10,20,30]
  const yearRows: YearRow[] = targetYears.map(yr => {
    const cumRed = monthlyReduction * 12 * yr
    const cumS   = cumSell(yr)
    return { year: yr, annualSaving: annualSavingForYear(yr), cumReduction: cumRed, cumSell: cumS, cumTotal: cumRed + cumS }
  })

  return {
    monthlyBillNum, afterBill, monthlyReduction, monthlyIncome,
    monthlySaving: monthlyReduction + monthlyIncome,
    annualSaving: annualSavingForYear(1),
    savings30: yearRows[yearRows.length - 1].cumTotal,
    annualGenNum, selfTotal, monthlySell, yearRows,
  }
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
  const pct = ((idx + 1) / Q_STEPS.length) * 100
  return (
    <div className="px-4 pt-4 pb-1">
      <div className="flex justify-between text-xs text-gray-400 mb-1.5">
        <span>項目 {idx + 1} / {Q_STEPS.length}</span>
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

function NextBtn({ active, onClick, label = '次へ →' }: {
  active: boolean; onClick: () => void; label?: string
}) {
  return (
    <button onClick={onClick} disabled={!active}
      className={`w-full py-4 rounded-xl font-bold text-base transition-all mt-5 ${
        active
          ? 'text-white shadow-md active:scale-[0.98] bg-[#1C3B44] hover:bg-[#162e35]'
          : 'bg-gray-100 text-gray-300 cursor-not-allowed'
      }`}>
      {label}
    </button>
  )
}

function QWrap({ children }: { children: React.ReactNode }) {
  return <div className="px-4 pt-4 pb-4 space-y-3">{children}</div>
}

function QTitle({ n, title, sub }: { n: string; title: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 mb-5 pt-1">
      <span className="bg-black text-white text-xs w-7 h-7 rounded-full flex items-center justify-center font-bold shrink-0 mt-0.5">{n}</span>
      <div>
        <p className="font-bold text-gray-800 text-base leading-snug">{title}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function NumInput({ value, onChange, unit, hint, min, step, placeholder }: {
  value: string; onChange: (v: string) => void
  unit: string; hint?: string; min?: number; step?: number; placeholder?: string
}) {
  return (
    <div className="bg-gray-50 rounded-2xl px-5 py-5">
      <div className="flex items-end gap-3">
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          min={min} step={step}
          placeholder={placeholder}
          className="flex-1 text-4xl font-bold text-gray-800 bg-transparent border-b-2 border-gray-300 focus:border-[#1E5C14] outline-none pb-1 text-right tabular-nums"
          style={{ minWidth: 0 }}
        />
        <span className="text-lg text-gray-500 pb-1 shrink-0">{unit}</span>
      </div>
      {hint && <p className="text-xs text-gray-400 mt-3">{hint}</p>}
    </div>
  )
}


// ── animated chart bar (year chart) ───────────────────────────────────
function ChartBar({ year, heightPct, isHighFit, animated, delay }: {
  year: number; heightPct: number; isHighFit: boolean; animated: boolean; delay: number
}) {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    if (!animated) { setPct(0); return }
    const t = setTimeout(() => setPct(heightPct), delay)
    return () => clearTimeout(t)
  }, [animated, heightPct, delay])
  return (
    <div className="flex-1 flex flex-col items-center gap-1">
      <div className="w-full flex items-end" style={{ height: '96px' }}>
        <div className="w-full rounded-t-sm transition-all duration-700"
          style={{ height: `${pct}%`, background: isHighFit ? '#2B6CB0' : '#90A8C8', transitionDelay: `${delay}ms` }} />
      </div>
      <span className="text-[9px] text-gray-400">{year}年</span>
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
  const [answers, setAnswers] = useState<Answers>(DEFAULT_ANSWERS)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    if (step === 'result') setTimeout(() => setAnimated(true), 200)
    else setAnimated(false)
  }, [step])

  const r = calcResult(answers)

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

  const reset = () => { setStep('start'); setAnswers(DEFAULT_ANSWERS) }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100 py-1 px-5 shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex justify-center">
          <button onClick={reset}>
            <img src="/logo.png" alt="株式会社FORLIFE"
              className="w-auto"
              style={{ height: '52px', objectFit: 'cover', objectPosition: 'center', marginTop: '-8px', marginBottom: '-8px' }} />
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
              太陽光発電シミュレーション
            </div>
            <h1 className="text-2xl font-bold mb-2">電気代、もっと<br />下げられます。</h1>
          </div>
        </div>
      )}

      <main className="max-w-lg mx-auto pb-10">

        {/* ── スタート ── */}
        {step === 'start' && (
          <div className="bg-white shadow-sm mt-4 p-6">
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              現在の電気ご利用状況を入力するだけで、30年分の節約額を試算します。<br />※試算結果は目安です。
            </p>
            <button onClick={() => setStep('q1')}
              className="w-full text-white font-bold py-4 rounded-xl text-base transition-colors shadow" style={{ background: '#1C3B44' }}>
              試算を開始する →
            </button>
          </div>
        )}

        {/* ── Q1 パネル容量 ── */}
        {step === 'q1' && (
          <div className="bg-white rounded-2xl shadow-sm mx-4 mt-4">
            <BackButton onClick={() => setStep('start')} />
            <ProgressBar step="q1" />
            <QWrap>
              <QTitle n="01" title="パネル容量" sub="実際のシステム容量を入力してください" />
              <NumInput value={answers.panelKw} onChange={set('panelKw')}
                unit="kW" min={0} step={0.01} placeholder="例: 5.0"
                hint="一般的な住宅用は3〜10kW程度です" />
              <NextBtn active={parseFloat(answers.panelKw) > 0} onClick={goNext} />
            </QWrap>
          </div>
        )}

        {/* ── Q2 蓄電池容量 ── */}
        {step === 'q2' && (
          <div className="bg-white rounded-2xl shadow-sm mx-4 mt-4">
            <BackButton onClick={goBack} />
            <ProgressBar step="q2" />
            <QWrap>
              <QTitle n="02" title="蓄電池容量" sub="蓄電池なしの場合は 0 を入力してください" />
              <NumInput value={answers.batteryKwh} onChange={set('batteryKwh')}
                unit="kWh" min={0} step={0.1} placeholder="例: 7.0"
                hint="主流は5〜16kWhです。なしの場合は0" />
              <NextBtn active={answers.batteryKwh !== '' && parseFloat(answers.batteryKwh) >= 0} onClick={goNext} />
            </QWrap>
          </div>
        )}

        {/* ── Q3 年間発電量 ── */}
        {step === 'q3' && (
          <div className="bg-white rounded-2xl shadow-sm mx-4 mt-4">
            <BackButton onClick={goBack} />
            <ProgressBar step="q3" />
            <QWrap>
              <QTitle n="03" title="年間発電量" sub="見積書や設計書に記載されている予測発電量" />
              <NumInput value={answers.annualGen} onChange={set('annualGen')}
                unit="kWh/年" min={0} step={1} placeholder="例: 5500"
                hint="1kWあたり約1,000〜1,200kWh/年が目安です" />
              <NextBtn active={parseFloat(answers.annualGen) > 0} onClick={goNext} />
            </QWrap>
          </div>
        )}

        {/* ── Q4 電気代 ── */}
        {step === 'q4' && (
          <div className="bg-white rounded-2xl shadow-sm mx-4 mt-4">
            <BackButton onClick={goBack} />
            <ProgressBar step="q4" />
            <QWrap>
              <QTitle n="04" title="お客様の電気代（月）" sub="現在の月々の電気代を入力してください" />
              <NumInput value={answers.monthlyBill} onChange={set('monthlyBill')}
                unit="円/月" min={0} step={100} placeholder="例: 12000"
                hint="直近の電気代明細を参考にしてください" />
              <NextBtn active={parseFloat(answers.monthlyBill) > 0} onClick={goNext} />
            </QWrap>
          </div>
        )}

        {/* ── Q5 太陽光自家消費量 ── */}
        {step === 'q5' && (
          <div className="bg-white rounded-2xl shadow-sm mx-4 mt-4">
            <BackButton onClick={goBack} />
            <ProgressBar step="q5" />
            <QWrap>
              <QTitle n="05" title="太陽光自家消費量" sub="太陽光で直接まかなえる月間消費量（デフォルト100kWh）" />
              <NumInput value={answers.selfConsume} onChange={set('selfConsume')}
                unit="kWh/月" min={0} step={1} placeholder="100"
                hint="目安：50〜150kWh/月。特に指定がなければ100のままでOK" />
              <NextBtn active={parseFloat(answers.selfConsume) >= 0} onClick={goNext} label="結果を見る →" />
            </QWrap>
          </div>
        )}

        {/* ── 結果 ── */}
        {step === 'result' && (() => {
          const chartRows = r.yearRows.filter(row => row.year <= 10)
          const maxAnnual = Math.max(...chartRows.map(row => row.annualSaving))
          return (
          <div className="space-y-4 mx-4 mt-4">

            {/* 条件変更ボタン */}
            <div className="flex justify-end">
              <button onClick={() => setStep('q1')} className="text-xs text-[#4A8A1A] font-semibold border border-[#4A8A1A] px-3 py-1.5 rounded-lg bg-white">
                条件を変える
              </button>
            </div>

            {/* ① 30年累計ヒーロー */}
            <div className="rounded-2xl overflow-hidden shadow-lg text-white"
              style={{ background: 'linear-gradient(135deg,#8FAA00 0%,#1E5C14 100%)' }}>
              <div className="px-6 pt-7 pb-3 text-center">
                <p className="text-sm font-medium opacity-90 mb-1">30年間で節約できる金額</p>
                <p className="text-5xl font-bold tracking-tight my-3 tabular-nums">
                  {Math.round(savings30Count / 10000).toLocaleString()}
                  <span className="text-2xl font-semibold ml-1">万円</span>
                </p>
                <p className="text-xs opacity-65">※電気代削減＋売電収入（FIT含む）の30年累計試算</p>
              </div>
              <div className="grid grid-cols-3 gap-px bg-white/20 mt-3">
                <div className="bg-white/10 px-3 py-3 text-center">
                  <p className="text-[10px] opacity-75">月間節約</p>
                  <p className="text-base font-bold mt-0.5">約{Math.round(r.monthlySaving / 1000)}千円</p>
                </div>
                <div className="bg-white/10 px-3 py-3 text-center">
                  <p className="text-[10px] opacity-75">初年度 年間</p>
                  <p className="text-base font-bold mt-0.5">約{Math.round(r.annualSaving / 10000)}万円</p>
                </div>
                <div className="bg-white/10 px-3 py-3 text-center">
                  <p className="text-[10px] opacity-75">10年累計</p>
                  <p className="text-base font-bold mt-0.5">約{Math.round(r.yearRows[9].cumTotal / 10000)}万円</p>
                </div>
              </div>
            </div>

            {/* ② 月間収支内訳 */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4">月間の収支内訳</h2>
              <BarRow label="設置前" value={r.monthlyBillNum} max={r.monthlyBillNum}
                color="bg-gray-300" amount={fmtM(r.monthlyBillNum)} active={animated} delay={0} />
              <BarRow label="設置後" value={r.afterBill} max={r.monthlyBillNum}
                color="bg-[#2B6CB0]" amount={fmtM(r.afterBill)} active={animated} delay={200} />
              <BarRow label="売電収入" value={r.monthlyIncome} max={r.monthlyBillNum}
                color="bg-[#E8730A]" amount={fmtM(r.monthlyIncome)} active={animated} delay={400} />
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">電気代削減（月）</p>
                  <p className="text-lg font-bold text-[#2B6CB0]">{fmtM(r.monthlyReduction)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">自家消費 {r.selfTotal}kWh/月</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">売電収入（月）</p>
                  <p className="text-lg font-bold text-[#E8730A]">{fmtM(r.monthlyIncome)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">売電 {Math.round(r.monthlySell)}kWh/月</p>
                </div>
              </div>
            </div>

            {/* ③ 年間節約額グラフ（1〜10年目） */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-1">年間節約額の推移</h2>
              <p className="text-xs text-gray-400 mb-4">FIT単価の変化により4年目以降は変動します</p>
              <div className="flex gap-4 mb-3 justify-end">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#2B6CB0' }} />
                  FIT期間（1〜4年目）
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#90A8C8' }} />
                  卒FIT期（5年目〜）
                </div>
              </div>
              <div className="flex items-end gap-1.5" style={{ height: '120px' }}>
                {chartRows.map((row, i) => (
                  <ChartBar key={row.year}
                    year={row.year}
                    heightPct={maxAnnual > 0 ? (row.annualSaving / maxAnnual) * 100 : 0}
                    isHighFit={row.year <= 4}
                    animated={animated}
                    delay={i * 80}
                  />
                ))}
              </div>
            </div>

            {/* ④ 年別累積テーブル */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-700">累積節約額シミュレーション</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500">
                      <th className="px-3 py-2.5 text-left font-medium">年目</th>
                      <th className="px-3 py-2.5 text-right font-medium">電気代削減</th>
                      <th className="px-3 py-2.5 text-right font-medium">売電収入</th>
                      <th className="px-3 py-2.5 text-right font-medium text-[#1E5C14]">累積合計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.yearRows.map((row, i) => {
                      const isHighlight = row.year === 10 || row.year === 20 || row.year === 30
                      return (
                        <tr key={row.year}
                          className={`border-t border-gray-50 ${isHighlight ? 'bg-green-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          <td className={`px-3 py-2.5 font-semibold ${isHighlight ? 'text-[#1E5C14]' : 'text-gray-600'}`}>
                            {row.year}年目
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums">
                            {Math.round(row.cumReduction / 10000)}万円
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums">
                            {Math.round(row.cumSell / 10000)}万円
                          </td>
                          <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${isHighlight ? 'text-[#1E5C14]' : 'text-gray-700'}`}>
                            {Math.round(row.cumTotal / 10000)}万円
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                <p className="text-[10px] text-gray-400">※地域・日射量・設備仕様により実際の効果は異なります</p>
              </div>
            </div>

            {/* ⑤ 入力内容サマリー */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3">入力内容</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ['パネル容量', `${answers.panelKw} kW`],
                  ['蓄電池容量', `${answers.batteryKwh} kWh`],
                  ['年間発電量', `${parseInt(answers.annualGen).toLocaleString()} kWh`],
                  ['電気代', `${parseInt(answers.monthlyBill).toLocaleString()} 円/月`],
                  ['太陽光自家消費', `${answers.selfConsume} kWh/月`],
                  ['月間売電量', `約 ${Math.round(r.monthlySell)} kWh`],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-gray-400">{label}</p>
                    <p className="font-semibold text-gray-700 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ⑦ CTA */}
            <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
              <p className="text-sm text-gray-600 mb-1 font-semibold">
                あなたの家に合った正確な金額を無料でご提案
              </p>
              <p className="text-xs text-gray-400 mb-4">専門スタッフが現地調査のうえ、設置費用・回収期間まで丁寧にご説明します</p>
              <button className="w-full text-white font-bold py-4 rounded-xl text-base transition-colors shadow-md" style={{ background: '#1C3B44' }}>
                無料で詳しく試算してもらう →
              </button>
            </div>

            <button onClick={reset}
              className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 text-center">
              ← もう一度入力し直す
            </button>
          </div>
          )
        })()}
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
