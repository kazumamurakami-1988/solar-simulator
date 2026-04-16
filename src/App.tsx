import { useState } from 'react'

type Step = 'start' | 'questions' | 'result'

interface Answers {
  area: string
  electricBill: string
  roofDirection: string
  kw: string
}

const AREAS = ['福岡県', '佐賀県', '熊本県', '長崎県', '大分県', '宮崎県', '鹿児島県']
const BILLS = ['1万円', '1.5万円', '2万円以上']
const DIRECTIONS = ['西', '南西', '南', '東南', '東']
const KW_OPTIONS = ['3kW', '6kW', '9kW']

const AREA_FACTOR: Record<string, number> = {
  '福岡県': 1.00, '佐賀県': 1.03, '熊本県': 1.05,
  '長崎県': 1.02, '大分県': 0.98, '宮崎県': 1.10, '鹿児島県': 1.08
}
const DIRECTION_FACTOR: Record<string, number> = {
  '西': 0.85, '南西': 0.93, '南': 1.00, '東南': 0.93, '東': 0.85
}
const BILL_ANNUAL: Record<string, number> = {
  '1万円': 120000, '1.5万円': 180000, '2万円以上': 240000
}
const KW_VALUE: Record<string, number> = {
  '3kW': 3, '6kW': 6, '9kW': 9
}

function calcResult(answers: Answers, kw: string) {
  const annualBill = BILL_ANNUAL[answers.electricBill] || 180000
  const kwVal = KW_VALUE[kw] || 6
  const areaF = AREA_FACTOR[answers.area] || 1.0
  const dirF = DIRECTION_FACTOR[answers.roofDirection] || 1.0

  const annualGen = kwVal * 1000 * areaF * dirF
  const selfRate = kwVal === 3 ? 0.60 : kwVal === 6 ? 0.45 : 0.35
  const buyPrice = 27
  const selfConsume = annualGen * selfRate
  const selfSaving = selfConsume * buyPrice
  const fitPrice = 16
  const sellGen = annualGen * (1 - selfRate)
  const sellIncome = Math.round(sellGen * fitPrice)
  const afterBill = Math.round(annualBill - selfSaving)
  const totalSaving = Math.round(annualBill - afterBill + sellIncome)

  return {
    beforeBill: annualBill,
    afterBill: Math.max(afterBill, 0),
    sellIncome,
    totalSaving
  }
}

function ChoiceButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
        selected
          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
          : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
      }`}
    >
      {label}
    </button>
  )
}

function BarRow({ label, value, max, color, amount }: {
  label: string; value: number; max: number; color: string; amount: string
}) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-16 text-right text-sm text-gray-600 shrink-0">{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-28 text-right text-sm font-semibold text-gray-700 shrink-0">{amount}</div>
    </div>
  )
}

export default function App() {
  const [step, setStep] = useState<Step>('start')
  const [answers, setAnswers] = useState<Answers>({
    area: '', electricBill: '', roofDirection: '南', kw: '6kW'
  })
  const [resultKw, setResultKw] = useState('6kW')

  const canShowResult = !!(answers.area && answers.electricBill && answers.roofDirection && answers.kw)
  const result = calcResult(answers.area ? answers : { ...answers, area: '福岡県', electricBill: '1.5万円' }, resultKw)
  const maxBar = result.beforeBill
  const fmt = (n: number) => `約 ${n.toLocaleString()}円`

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 py-3 px-6 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center gap-2">
          <span className="text-blue-600 font-black text-xl tracking-tight">FOR</span>
          <span className="text-orange-500 font-black text-xl tracking-tight">LIFE</span>
          <span className="text-gray-400 text-xs ml-2 hidden sm:inline">太陽光・蓄電池・EV充電設備</span>
        </div>
      </header>

      {/* ヒーロー */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 text-white py-10 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
        <div className="relative">
          <div className="inline-flex items-center gap-1 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
            ☀ 無料シミュレーション
          </div>
          <h1 className="text-2xl font-bold mb-2">あなたの家はどのくらいおトクになる？</h1>
          <p className="text-sm opacity-90">太陽光発電の電気代削減シミュレーション</p>
          <p className="text-xs opacity-75 mt-1">たった4つの質問で、年間の節約額を試算します</p>
        </div>
      </div>

      <main className="max-w-xl mx-auto px-4 py-6">

        {/* スタート画面 */}
        {step === 'start' && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mt-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded font-bold">START</span>
              <span className="font-semibold text-gray-800">シミュレーション開始前に</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              本シミュレーションは、一般的なデータや仮定の入力情報に基づいて、予想年間電力削減額を計算するものです。
              実際と異なる場合があることをあらかじめご了承ください。
            </p>
            <button
              onClick={() => setStep('questions')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-base transition-colors shadow"
            >
              シミュレーションを開始
            </button>
          </div>
        )}

        {/* 質問画面 */}
        {step === 'questions' && (
          <div className="space-y-5 mt-2">
            {/* Q1 エリア */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-blue-600 text-white text-xs w-7 h-7 rounded-full flex items-center justify-center font-bold shrink-0">01</span>
                <span className="font-semibold text-gray-800">お住まいのエリアを選択してください</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {AREAS.map(a => (
                  <ChoiceButton key={a} label={a} selected={answers.area === a}
                    onClick={() => setAnswers(p => ({ ...p, area: a }))} />
                ))}
              </div>
            </div>

            {/* Q2 電気代 */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-blue-600 text-white text-xs w-7 h-7 rounded-full flex items-center justify-center font-bold shrink-0">02</span>
                <span className="font-semibold text-gray-800">月々の電気代はいくらですか？</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {BILLS.map(b => (
                  <ChoiceButton key={b} label={b} selected={answers.electricBill === b}
                    onClick={() => setAnswers(p => ({ ...p, electricBill: b }))} />
                ))}
              </div>
            </div>

            {/* Q3 屋根の向き */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-blue-600 text-white text-xs w-7 h-7 rounded-full flex items-center justify-center font-bold shrink-0">03</span>
                <span className="font-semibold text-gray-800">家（屋根）の向きを選択してください</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {DIRECTIONS.map(d => (
                  <ChoiceButton key={d} label={d} selected={answers.roofDirection === d}
                    onClick={() => setAnswers(p => ({ ...p, roofDirection: d }))} />
                ))}
              </div>
            </div>

            {/* Q4 kW */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-blue-600 text-white text-xs w-7 h-7 rounded-full flex items-center justify-center font-bold shrink-0">04</span>
                <span className="font-semibold text-gray-800">何kWを載せたいですか？</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {KW_OPTIONS.map(k => (
                  <ChoiceButton key={k} label={k} selected={answers.kw === k}
                    onClick={() => setAnswers(p => ({ ...p, kw: k }))} />
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                ※6kWは一般住宅の設置容量目安です（10kW以上は全量売電となります）
              </p>
            </div>

            <button
              disabled={!canShowResult}
              onClick={() => { setResultKw(answers.kw); setStep('result') }}
              className={`w-full font-bold py-3 rounded-lg text-base transition-colors shadow mt-2 ${
                canShowResult
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              シミュレーション結果を見る
            </button>
          </div>
        )}

        {/* 結果画面 */}
        {step === 'result' && (
          <div className="space-y-5 mt-2">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-center text-xl font-bold text-gray-800 mb-5">電気料金シミュレーション結果</h2>

              {/* kW切り替え */}
              <div className="flex justify-center gap-2 mb-6">
                {KW_OPTIONS.map(k => (
                  <button
                    key={k}
                    onClick={() => setResultKw(k)}
                    className={`px-5 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                      resultKw === k
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-blue-400'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>

              <p className="text-center text-sm text-gray-600 mb-6">
                太陽光発電（{resultKw}）を導入すると、年間の電気代は…
              </p>

              <BarRow label="設置前" value={result.beforeBill} max={maxBar} color="bg-gray-400" amount={fmt(result.beforeBill)} />
              <BarRow label="設置後" value={result.afterBill} max={maxBar} color="bg-blue-500" amount={fmt(result.afterBill)} />
              <BarRow label="売電収入" value={result.sellIncome} max={maxBar} color="bg-sky-400" amount={fmt(result.sellIncome)} />

              <div className="mt-6 bg-orange-50 border-2 border-orange-300 rounded-xl p-5 text-center">
                <p className="text-sm text-gray-600 mb-1">年間でこれだけおトクに！</p>
                <p className="text-4xl font-bold text-orange-500 my-2">
                  約 {result.totalSaving.toLocaleString()}円
                </p>
                <p className="text-xs text-gray-400">※売電収入を合わせて</p>
              </div>

              <details className="mt-4 text-xs text-gray-400">
                <summary className="cursor-pointer text-right hover:text-gray-600">試算の根拠を見る</summary>
                <div className="mt-2 bg-gray-50 rounded-lg p-3 space-y-1 text-left">
                  <p>エリア：{answers.area}（係数 {AREA_FACTOR[answers.area]}）</p>
                  <p>屋根の向き：{answers.roofDirection}（係数 {DIRECTION_FACTOR[answers.roofDirection]}）</p>
                  <p>月々の電気代：{answers.electricBill}（年間 {BILL_ANNUAL[answers.electricBill]?.toLocaleString()}円）</p>
                  <p>設備容量：{resultKw}</p>
                  <p>電気単価：27円/kWh、売電単価：16円/kWh（FIT）</p>
                </div>
              </details>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
              <p className="text-sm text-gray-600 mb-4">
                詳細なお見積りを実施する場合は、以下よりお問い合わせください。
              </p>
              <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg text-base transition-colors shadow">
                無料お見積りはこちら →
              </button>
            </div>

            <button
              onClick={() => { setStep('questions'); setAnswers({ area: '', electricBill: '', roofDirection: '南', kw: '6kW' }) }}
              className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 text-center"
            >
              ← もう一度入力し直す
            </button>
          </div>
        )}
      </main>

      <footer className="bg-gray-800 text-white mt-8 py-8 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-center gap-1 mb-2">
            <span className="font-black text-lg tracking-tight text-blue-400">FOR</span>
            <span className="font-black text-lg tracking-tight text-orange-400">LIFE</span>
          </div>
          <p className="text-xs text-gray-400">太陽光発電・蓄電池・EV充電設備・電気工事</p>
          <p className="text-xs text-gray-500 mt-1">福岡県大野城市仲畑3丁目2-10 / 東京都西東京市中町2丁目4-1</p>
          <p className="text-xs text-gray-600 mt-3">© 2025 株式会社FORLIFE</p>
        </div>
      </footer>
    </div>
  )
}
