import { useEffect, useRef, useState } from 'react'
import './App.css'

const COINS = [
  { symbol: 'BTC', name: 'Bitcoin', pair: 'BTCUSDT' },
  { symbol: 'ETH', name: 'Ethereum', pair: 'ETHUSDT' },
  { symbol: 'SOL', name: 'Solana', pair: 'SOLUSDT' },
  { symbol: 'PEPE', name: 'Pepe', pair: 'PEPEUSDT' },
  { symbol: 'TRUMP', name: 'Official Trump', pair: 'TRUMPUSDT' },
  { symbol: 'XRP', name: 'XRP', pair: 'XRPUSDT' },
  { symbol: 'DOGE', name: 'Dogecoin', pair: 'DOGEUSDT' },
  { symbol: 'BNB', name: 'BNB', pair: 'BNBUSDT' },
]

const SUPPORTED_EXCHANGES = [
  'binance.com', 'coinbase.com', 'kraken.com', 'okx.com', 'bybit.com',
  'kucoin.com', 'gate.io', 'mexc.com', 'bitget.com', 'upbit.com',
  'crypto.com', 'mercadobitcoin.com.br', 'mercadobitcoin.com',
]

const IGNORED_URL_PARTS = new Set([
  'pt', 'pt-br', 'br', 'en', 'en-us', 'price', 'prices', 'criptomoedas',
  'cryptocurrencies', 'crypto', 'markets', 'market', 'trade', 'spot',
  'exchange', 'asset', 'assets', 'coin', 'coins', 'buy', 'sell', 'crix',
])

const DEFAULT_ADS = {
  zones: {
    top: { label: 'Publicidade', title: 'Espaço para anúncio premium', body: 'Use este banner para afiliados, exchange parceira ou campanha própria.', url: '' },
    panel: { label: 'Patrocinado', title: 'Oferta cripto', body: 'Controle este bloco online pelo GitHub Gist.', url: '' },
    empty: { label: 'Publicidade', title: 'Espaço reservado', body: 'Seus anúncios aparecerão aqui.', url: '' },
  },
}

const SOUND_URLS = {
  high: `${import.meta.env.BASE_URL}sounds/high.mp3`,
  low: `${import.meta.env.BASE_URL}sounds/low.mp3`,
}

// ==========================================
// 🔗 URL DO SEU GITHUB GIST
// ==========================================
const GIST_ML_ADS_URL = 'https://gist.githubusercontent.com/Jbispo22/d2a2c4c19b3909f9837f7c95d4b7dadd/raw/16b3a3ebd69d42cd88fb8ad2a946d4d310d79162/gistfile1.txt'

const FALLBACK_ML_ADS = [
  { label: 'OFERTA ML', title: 'Confira as Melhores Ofertas', body: 'Descontos exclusivos e frete grátis!', url: 'https://meli.la/2FS7j6R' }
]

const FIXED_MAIN_AD = {
  label: 'PARCEIRO OFICIAL',
  title: 'VENHA PARA O MERCADO BITCOIN',
  body: 'Abra sua conta na maior plataforma da América Latina com segurança!',
  url: 'https://conta.mercadobitcoin.com.br/cadastro?mgm_token=487dc09f688f516609caef36f821bbb143763f6bccfecfaa649a0cad6c48449a&utm_campaign=mgm&utm_source=link-copy&utm_medium=web'
}

function App() {
  const [selectedCoins, setSelectedCoins] = useState(() => loadLocal('selectedCoins', []))
  const [prices, setPrices] = useState({})
  const [alerts, setAlerts] = useState(() => sanitizeAlerts(loadLocal('alerts', {})))
  const [currency, setCurrency] = useState(() => loadLocal('currency', 'USD'))
  const [usdBrl, setUsdBrl] = useState(5.4)
  const [alertVolume, setAlertVolume] = useState(() => loadLocal('alertVolume', 85))
  const [linkInput, setLinkInput] = useState('')
  const [status, setStatus] = useState('Pronto')
  const [mlAds, setMlAds] = useState(FALLBACK_ML_ADS)
  const [alwaysOnTop, setAlwaysOnTop] = useState(false)
  const [launchAtLogin, setLaunchAtLogin] = useState(false)

  const alertLastPlayed = useRef({})
  const typingTimeouts = useRef({})
  const latestPrices = useRef({})
  const audioRefs = useRef({})
  const volumeRef = useRef(alertVolume)

  useEffect(() => saveLocal('selectedCoins', selectedCoins), [selectedCoins])
  useEffect(() => saveLocal('alerts', alerts), [alerts])
  useEffect(() => saveLocal('currency', currency), [currency])
  useEffect(() => {
    volumeRef.current = alertVolume
    saveLocal('alertVolume', alertVolume)
  }, [alertVolume])

  useEffect(() => {
    window.electronAPI?.getLaunchAtLogin?.()
      .then((enabled) => setLaunchAtLogin(Boolean(enabled)))
      .catch(() => setLaunchAtLogin(false))
  }, [])

  // CARREGA ANÚNCIOS DO GITHUB GIST
  useEffect(() => {
    async function loadMlAds() {
      try {
        const response = await fetch(GIST_ML_ADS_URL, { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data) && data.length > 0) {
            setMlAds(data)
            console.log('✅ Anúncios carregados do Gist:', data.length, 'itens')
          }
        }
      } catch (error) {
        console.warn('⚠️ Falha ao carregar anúncios do Gist, usando fallback.', error)
      }
    }
    loadMlAds()
    const interval = setInterval(loadMlAds, 300000) // 5 minutos
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function loadDollar() {
      try {
        const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')
        const data = await response.json()
        setUsdBrl(Number(data.USDBRL.bid))
      } catch { /* ignora */ }
    }
    loadDollar()
    const interval = setInterval(loadDollar, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function loadPrices() {
      const updated = { ...latestPrices.current }
      for (const coin of selectedCoins) {
        try {
          const usdPrice = await fetchUsdPrice(coin)
          const finalPrice = currency === 'BRL' ? usdPrice * usdBrl : usdPrice
          updated[coin.symbol] = finalPrice
          latestPrices.current[coin.symbol] = finalPrice
          checkAlerts(coin, finalPrice)
        } catch {
          updated[coin.symbol] = latestPrices.current[coin.symbol]
        }
      }
      setPrices(updated)
      setStatus(`Atualizado ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`)
    }
    loadPrices()
    const interval = setInterval(loadPrices, 3500)
    return () => clearInterval(interval)
  }, [selectedCoins, alerts, currency, usdBrl])

  useEffect(() => {
    audioRefs.current.high = new Audio(SOUND_URLS.high)
    audioRefs.current.low = new Audio(SOUND_URLS.low)
    audioRefs.current.high.preload = 'auto'
    audioRefs.current.low.preload = 'auto'
  }, [])

  async function fetchUsdPrice(coin) {
    if (coin.source === 'mercado-bitcoin') {
      const response = await fetch(`https://www.mercadobitcoin.net/api/${coin.symbol}/ticker/`)
      const data = await response.json()
      return Number(data.ticker.last) / usdBrl
    }
    if (coin.source === 'coingecko' && coin.coingeckoId) {
      const params = new URLSearchParams({ ids: coin.coingeckoId, vs_currencies: 'usd' })
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?${params}`)
      const data = await response.json()
      const price = Number(data[coin.coingeckoId]?.usd)
      if (!Number.isFinite(price)) throw new Error('Preco indisponivel')
      return price
    }
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${coin.pair || `${coin.symbol}USDT`}`)
    const data = await response.json()
    const price = Number(data.price)
    if (!Number.isFinite(price)) throw new Error('Preco indisponivel')
    return price
  }

  function checkAlerts(coin, finalPrice) {
    if (volumeRef.current <= 0) return
    const coinAlerts = alerts[coin.symbol]
    if (!coinAlerts) return
    const highTarget = parseMoneyValue(coinAlerts.high, currency)
    const lowTarget = parseMoneyValue(coinAlerts.low, currency)
    if (coinAlerts.highEnabled !== false && coinAlerts.high && highTarget > 0 && finalPrice >= highTarget) {
      playAlertForCoin(coin.symbol, 'high')
    }
    if (coinAlerts.lowEnabled !== false && coinAlerts.low && lowTarget > 0 && finalPrice <= lowTarget) {
      playAlertForCoin(coin.symbol, 'low')
    }
  }

  function playAlertForCoin(symbol, type) {
    const key = `${symbol}-${type}`
    const now = Date.now()
    if (alertLastPlayed.current[key] && now - alertLastPlayed.current[key] < 4500) return
    alertLastPlayed.current[key] = now
    playAlert(type)
  }

  function playAlert(type) {
    const audio = audioRefs.current[type] || new Audio(SOUND_URLS[type])
    audio.pause()
    audio.currentTime = 0
    audio.volume = Math.max(0, Math.min(1, volumeRef.current / 100))
    audio.play().catch(() => {
      setStatus('Clique no app uma vez para liberar o som do alerta.')
    })
    setTimeout(() => {
      audio.pause()
      audio.currentTime = 0
    }, 4000)
  }

  function unlockAudio() {
    for (const audio of Object.values(audioRefs.current)) {
      if (!audio) continue
      audio.load()
      audio.muted = true
      audio.play()
        .then(() => { audio.pause(); audio.currentTime = 0; audio.muted = false })
        .catch(() => { audio.muted = false })
    }
  }

  function addCoin(coin) {
    if (selectedCoins.some((item) => item.symbol === coin.symbol)) return false
    if (selectedCoins.length >= 3) {
      setStatus('Máximo de 3 ativos.')
      return false
    }
    setSelectedCoins([...selectedCoins, coin])
    return true
  }

  async function addFromLink() {
    setStatus('Identificando moeda...')
    const resolved = await resolveExchangeLink(linkInput)
    if (!resolved) {
      setStatus('Cole um link de exchange ou par tipo BTCUSDT.')
      return
    }
    const wasAdded = addCoin(resolved)
    if (wasAdded) {
      setLinkInput('')
      setStatus(`${resolved.symbol} adicionado pelo link.`)
    }
  }

  function removeCoin(symbol) {
    setSelectedCoins(selectedCoins.filter((item) => item.symbol !== symbol))
  }

  function switchCurrency(nextCurrency) {
    if (nextCurrency === currency) return
    alertLastPlayed.current = {}
    setAlerts((prev) => {
      const converted = {}
      for (const [symbol, coinAlerts] of Object.entries(prev)) {
        converted[symbol] = { ...coinAlerts }
        for (const key of ['high', 'low']) {
          const raw = String(coinAlerts?.[key] ?? '')
          if (!raw) continue
          const numericValue = parseMoneyValue(raw, currency)
          if (!Number.isFinite(numericValue) || numericValue <= 0) continue
          let newValue = nextCurrency === 'BRL' ? numericValue * usdBrl : numericValue / usdBrl
          const locale = nextCurrency === 'BRL' ? 'pt-BR' : 'en-US'
          converted[symbol][key] = newValue.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 6 })
        }
      }
      return converted
    })
    setCurrency(nextCurrency)
  }

  function updateAlert(symbol, key, value) {
    const nextValue = String(value ?? '')
    clearTimeout(typingTimeouts.current[`${symbol}-${key}`])
    alertLastPlayed.current[`${symbol}-${key}`] = 0
    setAlerts((prev) => ({
      ...prev,
      [symbol]: { ...prev[symbol], [key]: nextValue, [`${key}Enabled`]: Boolean(nextValue) },
    }))
    typingTimeouts.current[`${symbol}-${key}`] = setTimeout(() => {
      checkAlertImmediately(symbol, key, nextValue)
    }, 900)
  }

  function handleAlertBlur(symbol, key, value) {
    const nextValue = String(value ?? '')
    clearTimeout(typingTimeouts.current[`${symbol}-${key}`])
    alertLastPlayed.current[`${symbol}-${key}`] = 0
    setAlerts((prev) => ({
      ...prev,
      [symbol]: { ...prev[symbol], [key]: nextValue, [`${key}Enabled`]: Boolean(nextValue) },
    }))
    checkAlertImmediately(symbol, key, nextValue)
  }

  function checkAlertImmediately(symbol, key, value) {
    if (volumeRef.current <= 0) return
    const target = parseMoneyValue(value, currency)
    const currentPrice = latestPrices.current[symbol]
    if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(currentPrice)) return
    if (key === 'high' && currentPrice >= target) playAlertForCoin(symbol, 'high')
    if (key === 'low' && currentPrice <= target) playAlertForCoin(symbol, 'low')
  }

  function formatPrice(value) {
    if (value === undefined) return '...'
    return value.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
  }

  async function toggleTop() {
    const result = await window.electronAPI?.toggleAlwaysOnTop?.(!alwaysOnTop)
    setAlwaysOnTop(Boolean(result))
  }
  
  async function toggleLaunchAtLogin() {
    const result = await window.electronAPI?.setLaunchAtLogin?.(!launchAtLogin)
    setLaunchAtLogin(Boolean(result))
  }

  function getRandomMLAd() {
    if (!mlAds || mlAds.length === 0) return FALLBACK_ML_ADS[0]
    return mlAds[Math.floor(Math.random() * mlAds.length)]
  }

  return (
    <div className="app-shell" onPointerDown={unlockAudio}>
      <header className="titlebar" onDoubleClick={() => window.electronAPI?.toggleWindowSize?.()}>
        <div className="brand">
          <span className="brand-dot" />
          <span>REAL CRYPTO ALERT</span>
        </div>
        <div className="window-actions">
          <button className={launchAtLogin ? 'startup-toggle active' : 'startup-toggle'} onClick={toggleLaunchAtLogin} title="Iniciar com o Windows">WIN</button>
          <label className="volume-control" title="Volume dos alertas">
            <span>{alertVolume === 0 ? 'MUTE' : 'VOL'}</span>
            <input type="range" min="0" max="100" value={alertVolume} onChange={(event) => setAlertVolume(Number(event.target.value))} style={{ '--volume': `${alertVolume}%` }} />
          </label>
          <button className={alwaysOnTop ? 'tool active' : 'tool'} onClick={toggleTop} title="Sempre no topo">TOP</button>
          <button className="round" onClick={() => window.electronAPI?.minimizeApp?.()} title="Minimizar">-</button>
          <button className="round close" onClick={() => window.electronAPI?.closeApp?.()} title="Fechar">x</button>
        </div>
      </header>

      <main className="content">
        <section className="hero-panel">
          <div>
            <h1>Crypto Alerts</h1>
            <p>{status}</p>
          </div>
          <div className="currency-switch">
            <button className={currency === 'USD' ? 'active' : ''} onClick={() => switchCurrency('USD')}>USD</button>
            <button className={currency === 'BRL' ? 'active' : ''} onClick={() => switchCurrency('BRL')}>BRL</button>
          </div>
        </section>

        <section className="controls-bar"></section>

        <section style={{ margin: '8px 0', display: 'flex', justifyContent: 'center' }}>
          <a href={FIXED_MAIN_AD.url} target="_blank" rel="noreferrer" className="ad-link" style={{ textDecoration: 'none', width: '100%', maxWidth: '800px' }}>
            <div className="ad-slot" style={{ background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)', border: '2px solid #ffca28', padding: '10px 14px', textAlign: 'center' }}>
              <span>{FIXED_MAIN_AD.label}</span>
              <strong style={{ color: '#ffca28', fontSize: '15px' }}>{FIXED_MAIN_AD.title}</strong>
              <p style={{ margin: '2px 0 0' }}>{FIXED_MAIN_AD.body}</p>
            </div>
          </a>
        </section>

        <section className="link-panel">
          <input value={linkInput} onChange={(event) => setLinkInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addFromLink()} placeholder="Cole link da exchange ou par (ex: BTCUSDT)" />
          <button onClick={addFromLink}>Colar ativo</button>
        </section>

        <section className="coin-picker">
          {COINS.map((coin) => (
            <button key={coin.symbol} onClick={() => addCoin(coin)}>{coin.symbol}</button>
          ))}
        </section>

        <section className="monitor-scroll">
          <div className="cards">
            {selectedCoins.map((coin) => (
              <div className="coin-with-ad" key={coin.symbol}>
                <article className="coin-card">
                  <div className="coin-head">
                    <div>
                      <h2>{coin.name}</h2>
                      <span>
                        {coin.symbol}
                        {coin.source === 'mercado-bitcoin' ? ' - Mercado Bitcoin' : ''}
                        {coin.source === 'coingecko' ? ' - CoinGecko' : ''}
                      </span>
                    </div>
                    <button onClick={() => removeCoin(coin.symbol)}>x</button>
                  </div>

                  <strong className="price">
                    {currency === 'BRL' ? 'R$ ' : '$ '}
                    {formatPrice(prices[coin.symbol])}
                  </strong>

                  <div className="alert-grid">
                    <input type="text" inputMode="decimal" value={alerts[coin.symbol]?.high || ''} placeholder={currency === 'BRL' ? 'Alta em R$' : 'High em USD'} onBlur={(event) => handleAlertBlur(coin.symbol, 'high', event.target.value)} onChange={(event) => updateAlert(coin.symbol, 'high', event.target.value)} />
                    <input type="text" inputMode="decimal" value={alerts[coin.symbol]?.low || ''} placeholder={currency === 'BRL' ? 'Baixa em R$' : 'Low em USD'} onBlur={(event) => handleAlertBlur(coin.symbol, 'low', event.target.value)} onChange={(event) => updateAlert(coin.symbol, 'low', event.target.value)} />
                  </div>
                </article>
                <AdSlot ad={getRandomMLAd()} zone="panel" compact />
              </div>
            ))}

            {selectedCoins.length === 0 ? (
              <AdSlot ad={getRandomMLAd()} zone="empty" large />
            ) : null}
          </div>
        </section>
      </main>
    </div>
  )
}

function AdSlot({ ad, zone, compact = false, large = false }) {
  const content = ad || DEFAULT_ADS.zones[zone]
  if (!content) return null
  const className = ['ad-slot', compact ? 'compact' : '', large ? 'large' : ''].filter(Boolean).join(' ')
  const body = (
    <div className={className}>
      <span>{content.label || 'Publicidade'}</span>
      <strong>{content.title}</strong>
      <p>{content.body}</p>
    </div>
  )
  if (!content.url) return body
  return <a className="ad-link" href={content.url} target="_blank" rel="noreferrer">{body}</a>
}

function parseMoneyValue(value, currency = 'USD') {
  const raw = String(value ?? '').replace(/[^\d.,]/g, '')
  if (!raw) return NaN
  if (raw.includes(',') && raw.includes('.')) {
    const decimalSeparator = raw.lastIndexOf(',') > raw.lastIndexOf('.') ? ',' : '.'
    const thousandSeparator = decimalSeparator === ',' ? '.' : ','
    return Number(raw.replaceAll(thousandSeparator, '').replace(decimalSeparator, '.'))
  }
  const decimalSeparator = currency === 'BRL' ? ',' : '.'
  const groupSeparator = currency === 'BRL' ? '.' : ','
  if (raw.includes(decimalSeparator)) {
    const parts = raw.split(decimalSeparator)
    const fractionDigits = parts.pop()
    const integerDigits = parts.join('').replace(/\D/g, '')
    return Number(`${integerDigits || 0}.${fractionDigits}`)
  }
  if (raw.includes(groupSeparator)) return Number(raw.replaceAll(groupSeparator, ''))
  const digits = raw.replace(/\D/g, '')
  if (!digits) return NaN
  return Number(digits)
}

function sanitizeAlerts(alerts) {
  const cleaned = {}
  for (const [symbol, coinAlerts] of Object.entries(alerts || {})) {
    cleaned[symbol] = { ...coinAlerts }
    for (const key of ['high', 'low']) {
      const value = String(coinAlerts?.[key] ?? '')
      const numericValue = parseMoneyValue(value)
      if (!value || !Number.isFinite(numericValue) || numericValue <= 0) {
        cleaned[symbol][key] = ''
        cleaned[symbol][`${key}Enabled`] = false
      } else {
        cleaned[symbol][key] = value
        cleaned[symbol][`${key}Enabled`] = Boolean(coinAlerts?.[`${key}Enabled`])
      }
    }
  }
  return cleaned
}

async function resolveExchangeLink(value) {
  const raw = value.trim()
  if (!raw) return null
  let host = ''
  let candidates = [raw]
  let isUrl = false
  try {
    const url = new URL(raw)
    isUrl = true
    host = url.hostname.replace(/^www./, '').toLowerCase()
    candidates = [
      url.searchParams.get('symbol'), url.searchParams.get('pair'), url.searchParams.get('market'),
      url.searchParams.get('baseAsset'), url.searchParams.get('product_id'), url.searchParams.get('instId'),
      url.searchParams.get('code'),
      ...url.pathname.split('/').filter(Boolean).map(decodeURIComponent).reverse(),
    ].filter(Boolean).filter((part) => !IGNORED_URL_PARTS.has(String(part).toLowerCase()))
  } catch {
    candidates = [raw]
  }
  for (const candidate of candidates) {
    const looksLikePair = isPairLike(candidate)
    if (isUrl && !looksLikePair) {
      const coinGeckoCoin = await searchCoinGecko(candidate)
      if (coinGeckoCoin) return coinGeckoCoin
    }
    const symbol = normalizeSymbol(candidate)
    if (!symbol) continue
    const known = COINS.find((coin) => coin.symbol === symbol)
    const isMercadoBitcoin = host.includes('mercadobitcoin')
    if (isMercadoBitcoin && (looksLikePair || known)) {
      return known ? { ...known, source: 'mercado-bitcoin' } : { symbol, name: symbol, source: 'mercado-bitcoin' }
    }
    if (known) return known
    const coinGeckoCoin = await searchCoinGecko(symbol)
    if (coinGeckoCoin) return coinGeckoCoin
    return { symbol, name: symbol, pair: `${symbol}USDT`, source: 'binance' }
  }
  return null
}

async function searchCoinGecko(term) {
  const query = String(term).replace(/[-_]/g, ' ').replace(/.(html?|php)$/i, '').trim()
  if (!query || query.length < 2) return null
  try {
    const params = new URLSearchParams({ query })
    const response = await fetch(`https://api.coingecko.com/api/v3/search?${params}`)
    if (!response.ok) return null
    const data = await response.json()
    const coins = Array.isArray(data.coins) ? data.coins : []
    const normalizedQuery = query.toLowerCase().replace(/\s+/g, '-')
    const found =
      coins.find((coin) => coin.id?.toLowerCase() === normalizedQuery) ||
      coins.find((coin) => coin.name?.toLowerCase() === query.toLowerCase()) ||
      coins.find((coin) => coin.symbol?.toLowerCase() === query.toLowerCase()) ||
      coins[0]
    if (!found?.id) return null
    return {
      symbol: String(found.symbol || query).toUpperCase(),
      name: found.name || query,
      source: 'coingecko',
      coingeckoId: found.id,
    }
  } catch {
    return null
  }
}

function isPairLike(value) {
  return /(USDT|USDC|USD|BRL|EUR|BTC|ETH|BNB|TRY|FDUSD|PERP|SWAP|SPOT)$/i.test(
    String(value).replace(/[^a-zA-Z0-9]/g, '')
  )
}

function normalizeSymbol(value) {
  const parts = String(value)
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
    .filter((part) => !IGNORED_URL_PARTS.has(part.toLowerCase()))
  const quoteTokens = new Set(['USDT', 'USDC', 'USD', 'BRL', 'EUR', 'BTC', 'ETH', 'BNB', 'TRY', 'KRW', 'FDUSD', 'PERP', 'SWAP', 'SPOT'])
  const fiatFirstTokens = new Set(['KRW', 'BRL', 'USD', 'EUR', 'TRY'])
  if (parts.length === 2 && fiatFirstTokens.has(parts[0])) return parts[1]
  if (parts.length === 2 && quoteTokens.has(parts[1])) return parts[0]
  const nonQuoteParts = parts.filter((part) => !quoteTokens.has(part))
  if (nonQuoteParts.length === 1 && parts.length > 1) return nonQuoteParts[0]
  
  const upper = String(value)
    .toUpperCase()
    .replace(/^SPOT[:/-]/, '')
    .replace(/^TRADE[:/-]/, '')
    .replace(/^CRIX.UPBIT./, '')
    .replace(/[^A-Z0-9_-]/g, '')
    .replace(/_/g, '-')
    
  const symbol = upper
    .replace(/[-]?(USDT|USDC|USD|BRL|EUR|BTC|ETH|BNB|TRY|FDUSD|PERP|SWAP|SPOT)$/, '')
    .replace(/[-]+$/, '')
    
  if (!symbol || symbol.length > 16) return null
  if (SUPPORTED_EXCHANGES.includes(symbol.toLowerCase())) return null
  return symbol
}

function loadLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

function saveLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export default App