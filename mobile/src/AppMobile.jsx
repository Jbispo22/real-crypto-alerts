import React, { useEffect, useRef, useState } from 'react'
import {
  SafeAreaView,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  Alert,
  Animated,
  Modal,
  AppState,
  FlatList,
  Switch,
} from 'react-native'
import { Audio } from 'expo-av'
import * as Clipboard from 'expo-clipboard'
import * as Linking from 'expo-linking'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { useKeepAwake } from 'expo-keep-awake'

const SCREEN_WIDTH = Dimensions.get('window').width
const SCREEN_HEIGHT = Dimensions.get('window').height

const COINS_AVAILABLE = [
  { symbol: 'BTC', name: 'Bitcoin', coingeckoId: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', coingeckoId: 'ethereum' },
  { symbol: 'SOL', name: 'Solana', coingeckoId: 'solana' },
  { symbol: 'PEPE', name: 'Pepe', coingeckoId: 'pepe' },
  { symbol: 'TRUMP', name: 'Official Trump', coingeckoId: 'official-trump' },
  { symbol: 'XMR', name: 'Monero', coingeckoId: 'monero' },
  { symbol: 'DOGE', name: 'Dogecoin', coingeckoId: 'dogecoin' },
  { symbol: 'BNB', name: 'BNB', coingeckoId: 'binancecoin' },
  { symbol: 'ADA', name: 'Cardano', coingeckoId: 'cardano' },
  { symbol: 'DOT', name: 'Polkadot', coingeckoId: 'polkadot' },
  { symbol: 'AVAX', name: 'Avalanche', coingeckoId: 'avalanche-2' },
  { symbol: 'LINK', name: 'Chainlink', coingeckoId: 'chainlink' },
  { symbol: 'LTC', name: 'Litecoin', coingeckoId: 'litecoin' },
  { symbol: 'MATIC', name: 'Polygon', coingeckoId: 'matic-network' },
  { symbol: 'UNI', name: 'Uniswap', coingeckoId: 'uniswap' },
  { symbol: 'XLM', name: 'Stellar', coingeckoId: 'stellar' },
  { symbol: 'TRX', name: 'TRON', coingeckoId: 'tron' },
  { symbol: 'ARB', name: 'Arbitrum', coingeckoId: 'arbitrum' },
  { symbol: 'OP', name: 'Optimism', coingeckoId: 'optimism' },
  { symbol: 'ATOM', name: 'Cosmos', coingeckoId: 'cosmos' },
  { symbol: 'NEAR', name: 'Near Protocol', coingeckoId: 'near' },
  { symbol: 'FIL', name: 'Filecoin', coingeckoId: 'filecoin' },
  { symbol: 'AAVE', name: 'Aave', coingeckoId: 'aave' },
  { symbol: 'GRT', name: 'The Graph', coingeckoId: 'the-graph' },
  { symbol: 'ALGO', name: 'Algorand', coingeckoId: 'algorand' },
  { symbol: 'SHIB', name: 'Shiba Inu', coingeckoId: 'shiba-inu' },
]

const ADS_JSON_URL = 'https://raw.githubusercontent.com/Jbispo22/real-crypto-alert/main/ads.json'
const FALLBACK_ML_ADS = [
  { label: 'OFERTA ML', title: 'Confira as Melhores Ofertas', body: 'Descontos exclusivos!', url: 'https://meli.la/2FS7j6R' }
]
const FIXED_MAIN_AD = {
  label: 'PARCEIRO OFICIAL',
  title: 'VENHA PARA O MERCADO BITCOIN',
  body: 'Abra sua conta na maior plataforma da América Latina com segurança!',
  url: 'https://conta.mercadobitcoin.com.br/cadastro?mgm_token=487dc09f688f516609caef36f821bbb143763f6bccfecfaa649a0cad6c48449a&utm_campaign=mgm&utm_source=link-copy&utm_medium=web'
}

const SOUND_DURATION_MS = 4000
const SOUND_PAUSE_MS = 2000

// Configurar notificações para funcionar com tela bloqueada
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

function AppMobile() {
  useKeepAwake()

  const [selectedCoins, setSelectedCoins] = useState(() => loadLocal('selectedCoins', []))
  const [prices, setPrices] = useState({})
  const [alerts, setAlerts] = useState(() => sanitizeAlerts(loadLocal('alerts', {})))
  const [currency, setCurrency] = useState(() => loadLocal('currency', 'USD'))
  const [usdBrl, setUsdBrl] = useState(5.4)
  const [alertVolume, setAlertVolume] = useState(() => loadLocal('alertVolume', 85))
  const [linkInput, setLinkInput] = useState('')
  const [status, setStatus] = useState('Atualizado 17:40')
  const [mlAds, setMlAds] = useState(FALLBACK_ML_ADS)
  const [currentAd, setCurrentAd] = useState(FALLBACK_ML_ADS[0])
  const [alertingCoins, setAlertingCoins] = useState([])
  const [jumpAnimation] = useState(new Animated.Value(0))
  const [showNotificationPermission, setShowNotificationPermission] = useState(false)
  const [notificationStep, setNotificationStep] = useState('initial')
  const [appState, setAppState] = useState(AppState.currentState)
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => loadLocal('notificationsEnabled', false))
  
  // Settings
  const [showSettings, setShowSettings] = useState(false)
  const [showCoinSelector, setShowCoinSelector] = useState(false)
  const [searchCoin, setSearchCoin] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(() => loadLocal('soundEnabled', true))
  const [vibrationEnabled, setVibrationEnabled] = useState(() => loadLocal('vibrationEnabled', true))
  const [alertHistory, setAlertHistory] = useState(() => loadLocal('alertHistory', []))
  const [showAlertHistory, setShowAlertHistory] = useState(false)

  const volumeRef = useRef(alertVolume)
  const latestPricesRef = useRef({})
  const usdBrlRef = useRef(usdBrl)
  const currencyRef = useRef(currency)
  const alertsRef = useRef(alerts)
  const coinSourcesRef = useRef({})

  const audioPool = useRef({ high: null, low: null })
  const alertLoops = useRef({})

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange)
    return () => subscription.remove()
  }, [notificationsEnabled])

  const handleAppStateChange = async state => {
    setAppState(state)
    if (notificationsEnabled && state !== 'active') {
      await enableGodMode()
    }
  }

  const enableGodMode = async () => {
    try {
      if (Device.platformApiLevel >= 29) {
        Linking.openURL('android-app://com.android.settings/category/android.intent.category.SETTINGS')
      }
    } catch (err) {
      console.warn('Erro ao ativar modo deus:', err)
    }
  }

  useEffect(() => {
    const checkNotificationPermission = async () => {
      if (!loadLocal('notificationPermissionAsked', false)) {
        setShowNotificationPermission(true)
      }
    }
    setTimeout(checkNotificationPermission, 1000)
  }, [])

  const requestNotificationPermission = async () => {
    try {
      if (!Device.isDevice) {
        alert('Deve ser executado em dispositivo real')
        return
      }

      const { status } = await Notifications.getPermissionsAsync()
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync({
          ios: {
            scopes: ['alert', 'sound', 'badge'],
          },
        })

        if (newStatus !== 'granted') {
          setStatus('❌ Permissão de notificação recusada')
          setShowNotificationPermission(false)
          saveLocal('notificationPermissionAsked', true)
          return
        }
      }

      setNotificationStep('confirm')
    } catch (err) {
      console.error('Erro ao solicitar permissão:', err)
      setStatus('❌ Erro ao solicitar permissão')
    }
  }

  const handleNotificationConfirm = () => {
    setNotificationsEnabled(true)
    saveLocal('notificationsEnabled', true)
    saveLocal('notificationPermissionAsked', true)
    setNotificationStep('confirmed')
    setStatus('✅ Notificações ativadas com sucesso!')
    setShowNotificationPermission(false)
    sendTestNotification()
  }

  const handleNotificationDecline = () => {
    setNotificationsEnabled(false)
    saveLocal('notificationsEnabled', false)
    saveLocal('notificationPermissionAsked', true)
    setStatus('❌ Notificações desativadas')
    setShowNotificationPermission(false)
  }

  const handleNotificationCancel = () => {
    setNotificationStep('initial')
  }

  const sendTestNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Notificações Ativas',
          body: 'Você receberá alertas mesmo com a tela bloqueada',
          sound: 'default',
          badge: 1,
          data: { test: true },
        },
        trigger: { seconds: 1 },
      })
    } catch (err) {
      console.error('Erro ao enviar notificação de teste:', err)
    }
  }

  useEffect(() => {
    usdBrlRef.current = usdBrl
  }, [usdBrl])

  useEffect(() => {
    currencyRef.current = currency
  }, [currency])

  useEffect(() => {
    alertsRef.current = alerts
  }, [alerts])

  useEffect(() => {
    saveLocal('selectedCoins', selectedCoins)
  }, [selectedCoins])

  useEffect(() => {
    saveLocal('alerts', alerts)
  }, [alerts])

  useEffect(() => {
    saveLocal('currency', currency)
  }, [currency])

  useEffect(() => {
    volumeRef.current = alertVolume
    saveLocal('alertVolume', alertVolume)
  }, [alertVolume])

  useEffect(() => {
    saveLocal('soundEnabled', soundEnabled)
  }, [soundEnabled])

  useEffect(() => {
    saveLocal('vibrationEnabled', vibrationEnabled)
  }, [vibrationEnabled])

  useEffect(() => {
    async function initAudio() {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
        })
        audioPool.current.high = new Audio.Sound()
        audioPool.current.low = new Audio.Sound()
      } catch (err) {
        console.error('Erro ao inicializar audio:', err)
      }
    }
    initAudio()
  }, [])

  useEffect(() => {
    async function loadMlAds() {
      try {
        const response = await fetch(`${ADS_JSON_URL}?t=${Date.now()}`, { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data) && data.length > 0) {
            setMlAds(data)
            setCurrentAd(prev => data.find(ad => ad.title === prev.title) || data[0])
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar anúncios:', err)
      }
    }
    loadMlAds()
    const iv = setInterval(loadMlAds, 300000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (mlAds.length > 0) {
      const iv = setInterval(() => {
        setCurrentAd(prev => {
          const idx = mlAds.findIndex(ad => ad.title === prev.title)
          return mlAds[(idx + 1) % mlAds.length]
        })
      }, 22000)
      return () => clearInterval(iv)
    }
  }, [mlAds])

  useEffect(() => {
    async function loadDollar() {
      try {
        const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')
        const data = await response.json()
        setUsdBrl(Number(data.USDBRL.bid))
      } catch (err) {
        console.warn('Erro ao carregar taxa:', err)
      }
    }
    loadDollar()
    const iv = setInterval(loadDollar, 10000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    async function loadPrices() {
      if (selectedCoins.length === 0) return
      const results = await Promise.all(
        selectedCoins.map(async coin => {
          if (!coin.coingeckoId) return { coin, price: null }
          let price = await getCoinGeckoPrice(coin.coingeckoId)
          return { coin, price }
        })
      )

      setPrices(prev => {
        const next = { ...prev }
        for (const { coin, price } of results) {
          const k = `${coin.symbol}__${coin.coingeckoId}`
          if (price !== null) {
            latestPricesRef.current[k] = price
            next[k] = currencyRef.current === 'BRL' ? price * usdBrlRef.current : price
          }
        }
        return next
      })
      setStatus(`Atualizado ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`)
    }
    loadPrices()
    const iv = setInterval(loadPrices, 3000)
    return () => clearInterval(iv)
  }, [selectedCoins])

  useEffect(() => {
    function checkAlertConditions() {
      const newAlerting = []

      for (const coin of selectedCoins) {
        const coinAlerts = alertsRef.current[coin.symbol]
        const k = `${coin.symbol}__${coin.coingeckoId}`
        const usdPrice = latestPricesRef.current[k]

        if (!usdPrice || !Number.isFinite(usdPrice)) {
          stopAlertLoop(coin.symbol, 'high')
          stopAlertLoop(coin.symbol, 'low')
          continue
        }

        const currentPrice = currencyRef.current === 'BRL' ? usdPrice * usdBrlRef.current : usdPrice

        const highRaw = String(coinAlerts?.high ?? '').trim()
        const highTarget = parseMoneyValue(highRaw, currencyRef.current)
        const shouldHigh =
          volumeRef.current > 0 &&
          highRaw !== '' &&
          coinAlerts?.highEnabled !== false &&
          Number.isFinite(highTarget) &&
          highTarget > 0 &&
          currentPrice >= highTarget

        if (shouldHigh) {
          startAlertLoop(coin.symbol, 'high')
          newAlerting.push({ symbol: coin.symbol, type: 'high' })
          triggerJumpAnimation()
          addAlertToHistory(coin.name, currentPrice, 'ALTA')
          sendAlertNotification(coin.name, currentPrice, 'ALTA', 'high')
        } else {
          stopAlertLoop(coin.symbol, 'high')
        }

        const lowRaw = String(coinAlerts?.low ?? '').trim()
        const lowTarget = parseMoneyValue(lowRaw, currencyRef.current)
        const shouldLow =
          volumeRef.current > 0 &&
          lowRaw !== '' &&
          coinAlerts?.lowEnabled !== false &&
          Number.isFinite(lowTarget) &&
          lowTarget > 0 &&
          currentPrice <= lowTarget

        if (shouldLow) {
          startAlertLoop(coin.symbol, 'low')
          newAlerting.push({ symbol: coin.symbol, type: 'low' })
          triggerJumpAnimation()
          addAlertToHistory(coin.name, currentPrice, 'BAIXA')
          sendAlertNotification(coin.name, currentPrice, 'BAIXA', 'low')
        } else {
          stopAlertLoop(coin.symbol, 'low')
        }
      }

      setAlertingCoins(prev => {
        const prevStr = JSON.stringify(prev.sort((a, b) => a.symbol.localeCompare(b.symbol)))
        const nextStr = JSON.stringify(newAlerting.sort((a, b) => a.symbol.localeCompare(b.symbol)))
        return prevStr !== nextStr ? newAlerting : prev
      })
    }

    const iv = setInterval(checkAlertConditions, 1000)
    return () => clearInterval(iv)
  }, [selectedCoins])

  const addAlertToHistory = (coinName, price, type) => {
    const newAlert = {
      id: Date.now(),
      coinName,
      price: price.toFixed(2),
      type,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }
    setAlertHistory(prev => [newAlert, ...prev.slice(0, 49)]) // Mantém últimos 50
    saveLocal('alertHistory', [newAlert, ...loadLocal('alertHistory', []).slice(0, 49)])
  }

  const sendAlertNotification = async (coinName, price, type, alertType) => {
    if (!notificationsEnabled) return

    try {
      const priceFormatted = price.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      })

      const emoji = alertType === 'high' ? '📈' : '📉'
      const currencySymbol = currency === 'BRL' ? 'R$' : '$'

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${emoji} Alerta ${type}`,
          body: `${coinName} atingiu ${currencySymbol} ${priceFormatted}`,
          sound: soundEnabled ? 'default' : null,
          badge: 1,
          priority: 'max',
          data: {
            coinName,
            price,
            type: alertType,
          },
        },
        trigger: { seconds: 1 },
      })
    } catch (err) {
      console.error('Erro ao enviar notificação de alerta:', err)
    }
  }

  function triggerJumpAnimation() {
    Animated.sequence([
      Animated.timing(jumpAnimation, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(jumpAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()
  }

  function startAlertLoop(symbol, type) {
    const key = `${symbol}-${type}`
    if (alertLoops.current[key]?.running) return
    const loop = { running: true, soundTimeout: null, pauseTimeout: null }
    alertLoops.current[key] = loop

    function tick() {
      if (!loop.running) return
      playAlertSound(type)
      loop.soundTimeout = setTimeout(() => {
        if (!loop.running) return
        loop.pauseTimeout = setTimeout(() => {
          if (loop.running) tick()
        }, SOUND_PAUSE_MS)
      }, SOUND_DURATION_MS)
    }
    tick()
  }

  function stopAlertLoop(symbol, type) {
    const key = `${symbol}-${type}`
    const loop = alertLoops.current[key]
    if (!loop) return
    loop.running = false
    clearTimeout(loop.soundTimeout)
    clearTimeout(loop.pauseTimeout)
    delete alertLoops.current[key]
  }

  function playAlertSound(type) {
    if (!soundEnabled) return
    try {
      const audio = audioPool.current[type]
      if (audio) {
        audio.playAsync().catch(err => console.warn(`Erro ao tocar ${type}:`, err))
      }
    } catch (err) {
      console.error('Erro ao reproduzir som:', err)
    }
  }

  function updateAlert(symbol, key, value) {
    setAlerts(prev => ({ ...prev, [symbol]: { ...prev[symbol], [key]: value } }))
  }

  function handleAlertBlur(symbol, key, value) {
    const next = String(filterNumeric(value) ?? '')
    setAlerts(prev => ({
      ...prev,
      [symbol]: { ...prev[symbol], [key]: next, [`${key}Enabled`]: Boolean(next) },
    }))
  }

  function formatPrice(value) {
    if (value === undefined || value === null) return '...'
    return value.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    })
  }

  function toggleCoin(coin) {
    const k = `${coin.symbol}__${coin.coingeckoId}`
    const isSelected = selectedCoins.some(c => `${c.symbol}__${c.coingeckoId}` === k)

    if (isSelected) {
      stopAlertLoop(coin.symbol, 'high')
      stopAlertLoop(coin.symbol, 'low')
      delete coinSourcesRef.current[k]
      setSelectedCoins(prev => prev.filter(c => !(c.symbol === coin.symbol && c.coingeckoId === coin.coingeckoId)))
      setPrices(prev => {
        const n = { ...prev }
        delete n[k]
        return n
      })
      delete latestPricesRef.current[k]
      setStatus(`❌ ${coin.symbol} removido.`)
    } else {
      if (!coin.coingeckoId) {
        setStatus(`❌ ${coin.symbol} não identificada.`)
        return
      }
      if (selectedCoins.length >= 8) {
        setStatus('⚠️ Máximo de 8 ativos.')
        return
      }
      coinSourcesRef.current[k] = 'coingecko'
      setSelectedCoins(prev => [...prev, coin])
      setStatus(`✅ ${coin.name} adicionado!`)
    }
  }

  async function pasteAndAdd() {
    try {
      const text = await Clipboard.getStringAsync()
      if (!text?.trim()) {
        setStatus('⚠️ Área de transferência vazia.')
        return
      }
      setLinkInput(text)
      setStatus('🔍 Identificando moeda...')
      await new Promise(r => setTimeout(r, 100))
      const resolved = await resolveExchangeLink(text)
      if (!resolved?.coin?.coingeckoId) {
        setStatus('❌ Moeda não encontrada.')
        return
      }

      const k = `${resolved.coin.symbol}__${resolved.coin.coingeckoId}`
      if (selectedCoins.some(c => `${c.symbol}__${c.coingeckoId}` === k)) {
        toggleCoin(resolved.coin)
      } else {
        if (selectedCoins.length < 8) {
          coinSourcesRef.current[k] = resolved.source
          setSelectedCoins(prev => [...prev, resolved.coin])
          setStatus(`✅ ${resolved.coin.name} adicionada!`)
        } else {
          setStatus('⚠️ Limite de 8 ativos atingido.')
        }
      }
      setLinkInput('')
    } catch (err) {
      console.error('Erro ao colar:', err)
      setStatus('❌ Erro ao colar.')
    }
  }

  function switchCurrency(next) {
    if (next === currency) return
    setAlerts(prev => {
      const out = {}
      for (const [symbol, ca] of Object.entries(prev)) {
        out[symbol] = { ...ca }
        for (const k of ['high', 'low']) {
          const raw = String(ca?.[k] ?? '')
          if (!raw) continue
          const num = parseMoneyValue(raw, currency)
          if (!Number.isFinite(num) || num <= 0) continue
          const converted = next === 'BRL' ? num * usdBrl : num / usdBrl
          out[symbol][k] = converted.toLocaleString(next === 'BRL' ? 'pt-BR' : 'en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
          })
        }
      }
      return out
    })
    setCurrency(next)
  }

  const jumpTranslateY = jumpAnimation.interpolate({
    inputRange: [-50, 0],
    outputRange: [-50, 0],
  })

  const filteredCoins = COINS_AVAILABLE.filter(coin =>
    coin.name.toLowerCase().includes(searchCoin.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(searchCoin.toLowerCase())
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* MODAL NOTIFICAÇÕES */}
      <Modal
        visible={showNotificationPermission}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          {notificationStep === 'initial' && (
            <View style={styles.modalContent}>
              <Text style={styles.modalIcon}>🔔</Text>
              <Text style={styles.modalTitle}>Ativar Notificações?</Text>
              <Text style={styles.modalDescription}>
                Receba alertas de preço mesmo com a tela bloqueada
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnNo]}
                  onPress={() => handleNotificationDecline()}
                >
                  <Text style={styles.modalBtnText}>Não</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnYes]}
                  onPress={requestNotificationPermission}
                >
                  <Text style={styles.modalBtnText}>Sim</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {notificationStep === 'confirm' && (
            <View style={styles.modalContent}>
              <Text style={styles.modalIcon}>✅</Text>
              <Text style={styles.modalTitle}>Tem certeza?</Text>
              <Text style={styles.modalDescription}>
                Você receberá notificações com tela bloqueada e vibrações nos alertas. O app funcionará em "modo deus" para processos contínuos.
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnBack]}
                  onPress={handleNotificationCancel}
                >
                  <Text style={styles.modalBtnText}>Voltar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnConfirm]}
                  onPress={handleNotificationConfirm}
                >
                  <Text style={styles.modalBtnText}>Aceitar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* MODAL SELECIONADOR DE CRYPTOS */}
      <Modal
        visible={showCoinSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCoinSelector(false)}
      >
        <SafeAreaView style={styles.coinSelectorContainer}>
          <View style={styles.coinSelectorHeader}>
            <Text style={styles.coinSelectorTitle}>Selecionar Criptomoedas</Text>
            <TouchableOpacity onPress={() => setShowCoinSelector(false)}>
              <Text style={styles.coinSelectorClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.coinSearchInput}
            placeholder="Buscar cripto..."
            placeholderTextColor="#64748b"
            value={searchCoin}
            onChangeText={setSearchCoin}
          />

          <FlatList
            data={filteredCoins}
            keyExtractor={item => item.coingeckoId}
            renderItem={({ item }) => {
              const k = `${item.symbol}__${item.coingeckoId}`
              const isSelected = selectedCoins.some(c => `${c.symbol}__${c.coingeckoId}` === k)
              return (
                <TouchableOpacity
                  style={[styles.coinSelectorItem, isSelected && styles.coinSelectorItemSelected]}
                  onPress={() => toggleCoin(item)}
                >
                  <View style={styles.coinSelectorItemContent}>
                    <Text style={styles.coinSelectorSymbol}>{item.symbol}</Text>
                    <Text style={styles.coinSelectorName}>{item.name}</Text>
                  </View>
                  <View style={[styles.coinSelectorCheckbox, isSelected && styles.coinSelectorCheckboxChecked]}>
                    {isSelected && <Text style={styles.coinSelectorCheckmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              )
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* MODAL HISTÓRICO DE ALERTAS */}
      <Modal
        visible={showAlertHistory}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAlertHistory(false)}
      >
        <SafeAreaView style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Histórico de Alertas</Text>
            <TouchableOpacity onPress={() => setShowAlertHistory(false)}>
              <Text style={styles.historyClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {alertHistory.length === 0 ? (
            <View style={styles.historyEmpty}>
              <Text style={styles.historyEmptyText}>Nenhum alerta ainda 📭</Text>
            </View>
          ) : (
            <FlatList
              data={alertHistory}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.historyItem}>
                  <View style={styles.historyItemLeft}>
                    <Text style={styles.historyItemTime}>{item.timestamp}</Text>
                    <Text style={styles.historyItemCoin}>{item.coinName}</Text>
                  </View>
                  <View style={[styles.historyItemRight, item.type === 'ALTA' ? styles.historyItemHigh : styles.historyItemLow]}>
                    <Text style={styles.historyItemType}>{item.type}</Text>
                    <Text style={styles.historyItemPrice}>${item.price}</Text>
                  </View>
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* MODAL CONFIGURAÇÕES */}
      <Modal
        visible={showSettings}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <SafeAreaView style={styles.settingsContainer}>
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsTitle}>⚙️ Configurações</Text>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Text style={styles.settingsClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.settingsContent}>
            {/* Som */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>🔊 Som</Text>
              <View style={styles.settingsItem}>
                <Text style={styles.settingsItemLabel}>Som dos Alertas</Text>
                <Switch
                  value={soundEnabled}
                  onValueChange={setSoundEnabled}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                  thumbColor={soundEnabled ? '#10b981' : '#64748b'}
                />
              </View>
            </View>

            {/* Vibração */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>📳 Vibração</Text>
              <View style={styles.settingsItem}>
                <Text style={styles.settingsItemLabel}>Vibração nos Alertas</Text>
                <Switch
                  value={vibrationEnabled}
                  onValueChange={setVibrationEnabled}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                  thumbColor={vibrationEnabled ? '#10b981' : '#64748b'}
                />
              </View>
            </View>

            {/* Notificações */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>🔔 Notificações</Text>
              <View style={styles.settingsItem}>
                <Text style={styles.settingsItemLabel}>Notificações com Tela Bloqueada</Text>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={flag => {
                    setNotificationsEnabled(flag)
                    saveLocal('notificationsEnabled', flag)
                  }}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                  thumbColor={notificationsEnabled ? '#10b981' : '#64748b'}
                />
              </View>
            </View>

            {/* Limite de Moedas */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>📊 Limite de Moedas</Text>
              <View style={styles.settingsInfo}>
                <Text style={styles.settingsInfoText}>
                  Moedas Monitoradas: {selectedCoins.length} / 8
                </Text>
              </View>
            </View>

            {/* Histórico */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>📜 Histórico</Text>
              <View style={styles.settingsInfo}>
                <Text style={styles.settingsInfoText}>
                  Total de Alertas: {alertHistory.length}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.settingsBtn}
                onPress={() => {
                  setShowAlertHistory(true)
                  setShowSettings(false)
                }}
              >
                <Text style={styles.settingsBtnText}>Ver Histórico</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.settingsBtn, styles.settingsBtnDanger]}
                onPress={() => {
                  setAlertHistory([])
                  saveLocal('alertHistory', [])
                  setStatus('✅ Histórico limpo')
                }}
              >
                <Text style={styles.settingsBtnText}>Limpar Histórico</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* HEADER COM VOLUME */}
      <View style={styles.mobileHeader}>
        <Text style={styles.headerTitle}>⚡ Crypto Alerts</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowSettings(true)}
          >
            <Text style={styles.headerBtnText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowCoinSelector(true)}
          >
            <Text style={styles.headerBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.volumeContainer}>
        <Text style={styles.volumeLabel}>🔊 {alertVolume}%</Text>
        <View style={styles.volumeSlider}>
          <TouchableOpacity
            style={[styles.volumeButton, alertVolume <= 50 && styles.volumeButtonActive]}
            onPress={() => setAlertVolume(Math.max(0, alertVolume - 10))}
          >
            <Text style={styles.volumeButtonText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.volumeButton, alertVolume >= 50 && styles.volumeButtonActive]}
            onPress={() => setAlertVolume(Math.min(100, alertVolume + 10))}
          >
            <Text style={styles.volumeButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* STATUS */}
        <View style={styles.statusSection}>
          <Text style={styles.statusText}>{status}</Text>
        </View>

        {/* CURRENCY SWITCH */}
        <View style={styles.currencySwitch}>
          <TouchableOpacity
            style={[styles.currencyBtn, currency === 'USD' && styles.currencyBtnActive]}
            onPress={() => switchCurrency('USD')}
          >
            <Text style={styles.currencyBtnText}>USD</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.currencyBtn, currency === 'BRL' && styles.currencyBtnActive]}
            onPress={() => switchCurrency('BRL')}
          >
            <Text style={styles.currencyBtnText}>BRL</Text>
          </TouchableOpacity>
        </View>

        {/* PARTNER AD */}
        <TouchableOpacity
          style={styles.partnerAd}
          onPress={() => Linking.openURL(FIXED_MAIN_AD.url)}
        >
          <Text style={styles.partnerLabel}>{FIXED_MAIN_AD.label}</Text>
          <Text style={styles.partnerTitle}>{FIXED_MAIN_AD.title}</Text>
          <Text style={styles.partnerBody}>{FIXED_MAIN_AD.body}</Text>
        </TouchableOpacity>

        {/* INPUT AREA */}
        <View style={styles.inputPanel}>
          <TextInput
            style={styles.linkInput}
            value={linkInput}
            onChangeText={setLinkInput}
            placeholder="Cole link da moeda..."
            placeholderTextColor="#64748b"
          />
          <TouchableOpacity style={styles.pasteBtn} onPress={pasteAndAdd}>
            <Text style={styles.pasteBtnText}>📋 Colar</Text>
          </TouchableOpacity>
        </View>

        {/* SELECTED COINS CARDS */}
        <Animated.View style={[styles.cardsListContainer, { transform: [{ translateY: jumpTranslateY }] }]}>
          {selectedCoins.map(coin => {
            const k = `${coin.symbol}__${coin.coingeckoId}`
            const alertState = alertingCoins.find(a => a.symbol === coin.symbol)
            const isAlerting = !!alertState

            return (
              <View key={k} style={styles.cardWrapper}>
                <View
                  style={[
                    styles.coinCard,
                    isAlerting && alertState.type === 'high' && styles.cardPulseHigh,
                    isAlerting && alertState.type === 'low' && styles.cardPulseLow,
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.coinName}>{coin.name}</Text>
                      <Text style={styles.coinSymbol}>{coin.symbol}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => toggleCoin(coin)}
                    >
                      <Text style={styles.removeBtnText}>×</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.priceDisplay}>
                    {currency === 'BRL' ? 'R$ ' : '$ '}{formatPrice(prices[k])}
                  </Text>

                  <View style={styles.alertInputs}>
                    <TextInput
                      style={styles.alertInput}
                      value={alerts[coin.symbol]?.high || ''}
                      onChangeText={e => updateAlert(coin.symbol, 'high', e)}
                      onBlur={e => handleAlertBlur(coin.symbol, 'high', e.nativeEvent.text)}
                      placeholder={`Alta em ${currency === 'BRL' ? 'R$' : '$'}`}
                      placeholderTextColor="#475569"
                      keyboardType="decimal-pad"
                    />
                    <TextInput
                      style={styles.alertInput}
                      value={alerts[coin.symbol]?.low || ''}
                      onChangeText={e => updateAlert(coin.symbol, 'low', e)}
                      onBlur={e => handleAlertBlur(coin.symbol, 'low', e.nativeEvent.text)}
                      placeholder={`Baixa em ${currency === 'BRL' ? 'R$' : '$'}`}
                      placeholderTextColor="#475569"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>
            )
          })}

          {selectedCoins.length === 0 && (
            <TouchableOpacity
              style={styles.emptyAd}
              onPress={() => Linking.openURL(currentAd.url)}
            >
              <Text style={styles.adLabel}>{currentAd.label}</Text>
              <Text style={styles.adTitle}>{currentAd.title}</Text>
              {currentAd.body && <Text style={styles.adBody}>{currentAd.body}</Text>}
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#7c3aed',
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
  },
  modalBtnNo: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
  },
  modalBtnYes: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10b981',
  },
  modalBtnBack: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderColor: '#7c3aed',
  },
  modalBtnConfirm: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10b981',
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  coinSelectorContainer: {
    flex: 1,
    backgroundColor: '#050816',
  },
  coinSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0b0f19',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 58, 237, 0.25)',
  },
  coinSelectorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fbbf24',
  },
  coinSelectorClose: {
    fontSize: 24,
    color: '#ef4444',
    fontWeight: '700',
  },
  coinSearchInput: {
    marginHorizontal: 12,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
  },
  coinSelectorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  coinSelectorItemSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
  },
  coinSelectorItemContent: {
    flex: 1,
  },
  coinSelectorSymbol: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10b981',
  },
  coinSelectorName: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 2,
  },
  coinSelectorCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinSelectorCheckboxChecked: {
    borderColor: '#10b981',
    backgroundColor: '#10b981',
  },
  coinSelectorCheckmark: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '800',
  },
  historyContainer: {
    flex: 1,
    backgroundColor: '#050816',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0b0f19',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 58, 237, 0.25)',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fbbf24',
  },
  historyClose: {
    fontSize: 24,
    color: '#ef4444',
    fontWeight: '700',
  },
  historyEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyEmptyText: {
    fontSize: 16,
    color: '#64748b',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#7c3aed',
  },
  historyItemLeft: {
    flex: 1,
  },
  historyItemTime: {
    fontSize: 11,
    color: '#64748b',
  },
  historyItemCoin: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  historyItemRight: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  historyItemHigh: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  historyItemLow: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  historyItemType: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  historyItemPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  settingsContainer: {
    flex: 1,
    backgroundColor: '#050816',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0b0f19',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 58, 237, 0.25)',
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fbbf24',
  },
  settingsClose: {
    fontSize: 24,
    color: '#ef4444',
    fontWeight: '700',
  },
  settingsContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  settingsSection: {
    marginBottom: 20,
  },
  settingsSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7c3aed',
    marginBottom: 12,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  settingsItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  settingsInfo: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  settingsInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  settingsBtn: {
    paddingVertical: 12,
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 6,
  },
  settingsBtnDanger: {
    backgroundColor: '#ef4444',
  },
  settingsBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  mobileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0b0f19',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 58, 237, 0.25)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fbbf24',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.5)',
  },
  headerBtnText: {
    fontSize: 18,
    fontWeight: '700',
  },
  volumeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  volumeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  volumeSlider: {
    flexDirection: 'row',
    gap: 8,
  },
  volumeButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  volumeButtonActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    borderColor: 'rgba(124, 58, 237, 0.6)',
  },
  volumeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  statusSection: {
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  currencySwitch: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  currencyBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  currencyBtnActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  currencyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  partnerAd: {
    backgroundColor: '#1e3a8a',
    borderWidth: 2,
    borderColor: '#fbbf24',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  partnerLabel: {
    fontSize: 10,
    color: '#fbbf24',
    fontWeight: '700',
    marginBottom: 4,
  },
  partnerTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '900',
    marginBottom: 4,
  },
  partnerBody: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  inputPanel: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  linkInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    backgroundColor: '#1e293b',
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
  },
  pasteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#10b981',
    borderRadius: 6,
    justifyContent: 'center',
  },
  pasteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  cardsListContainer: {
    marginBottom: 20,
  },
  cardWrapper: {
    marginBottom: 12,
  },
  coinCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardPulseHigh: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  cardPulseLow: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  coinName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  coinSymbol: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    fontSize: 20,
    color: '#ef4444',
  },
  priceDisplay: {
    fontSize: 24,
    fontWeight: '900',
    color: '#10b981',
    marginVertical: 8,
  },
  alertInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  alertInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 11,
    backgroundColor: '#0f172a',
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    textAlign: 'center',
  },
  emptyAd: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  adLabel: {
    fontSize: 10,
    color: '#7c3aed',
    fontWeight: '700',
    marginBottom: 4,
  },
  adTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  adBody: {
    fontSize: 11,
    color: '#94a3b8',
  },
})

function filterNumeric(value) {
  return value.replace(/[^\d.,]/g, '')
}

function parseMoneyValue(value, currency = 'USD') {
  const raw = String(value ?? '').replace(/[^\d.,]/g, '')
  if (!raw) return NaN
  if (raw.includes(',') && raw.includes('.')) {
    const lastComma = raw.lastIndexOf(',')
    const lastDot = raw.lastIndexOf('.')
    if (lastComma > lastDot) return Number(raw.replaceAll('.', '').replace(',', '.'))
    else return Number(raw.replaceAll(',', ''))
  }
  if (raw.includes(',')) {
    if (currency === 'BRL') return Number(raw.replaceAll('.', '').replace(',', '.'))
    return Number(raw.replaceAll(',', ''))
  }
  if (raw.includes('.')) {
    if (currency === 'USD') return Number(raw.replaceAll(',', ''))
    const parts = raw.split('.')
    if (parts[parts.length - 1].length !== 3) return Number(raw)
    return Number(raw.replaceAll('.', ''))
  }
  return Number(raw)
}

async function resolveExchangeLink(value) {
  let raw = value.trim().split('#')[0]
  if (!raw) return null

  const pathParts = raw.split('/').filter(Boolean).map(decodeURIComponent)
  let candidates = [...pathParts.reverse()]

  candidates = [...new Set(candidates)].filter(c => c && c.length >= 2)
  for (const c of candidates) {
    const coin = await searchCoinGeckoExact(c)
    if (coin) return { coin, source: 'coingecko' }
  }
  return null
}

async function searchCoinGeckoExact(term) {
  if (!term || term.length < 2) return null
  let clean = String(term)
    .replace(/\.(html?|php)$/i, '')
    .replace(/_(usdt|usd|brl|btc|eth)$/i, '')
    .replace(/(usdt|usd|brl|btc|eth)$/i, '')
    .trim()
    .toLowerCase()

  if (clean.length < 2) return null
  const withoutNumericSuffix = clean.replace(/-[0-9]+$/, '')
  const variations = [
    clean,
    withoutNumericSuffix,
    clean.replace(/-/g, ' '),
    withoutNumericSuffix.replace(/-/g, ' '),
    clean.split('-').pop(),
    clean.split('-')[0],
    clean.replace(/[^a-z0-9]/g, ''),
  ].filter(v => v && v.length >= 2)

  const unique = [...new Set(variations)]
  for (const attempt of unique) {
    try {
      const r = await fetch(`https://api.coingecko.com/api/v3/search?query=${attempt}`)
      if (!r.ok) continue
      const data = await r.json()
      const coins = Array.isArray(data.coins) ? data.coins : []
      if (!coins.length) continue

      const norm = clean.replace(/[-_\s]+/g, '')
      const normWithoutSuffix = withoutNumericSuffix.replace(/[-_\s]+/g, '')

      const match =
        coins.find(c => c.id?.toLowerCase() === withoutNumericSuffix) ||
        coins.find(c => c.id?.toLowerCase() === clean) ||
        coins.find(c => c.symbol?.toLowerCase() === clean) ||
        coins.find(c => c.symbol?.toLowerCase() === withoutNumericSuffix) ||
        coins.find(c => c.symbol?.toLowerCase() === clean.split('-').pop()) ||
        coins.find(c => c.id?.toLowerCase().replace(/[-_]/g, '') === normWithoutSuffix) ||
        coins.find(c => c.id?.toLowerCase().replace(/[-_]/g, '') === norm) ||
        coins.find(c => c.name?.toLowerCase().replace(/[-_\s]/g, '') === normWithoutSuffix) ||
        coins.find(c => c.name?.toLowerCase().replace(/[-_\s]/g, '') === norm)

      if (match?.id) {
        return {
          symbol: String(match.symbol).toUpperCase(),
          name: match.name,
          source: 'coingecko',
          coingeckoId: match.id,
        }
      }
    } catch {
      continue
    }
  }
  return null
}

async function getCoinGeckoPrice(coingeckoId) {
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`
    )
    if (!r.ok) return null
    const data = await r.json()
    const p = Number(data[coingeckoId]?.usd)
    return Number.isFinite(p) && p > 0 ? p : null
  } catch {
    return null
  }
}

function loadLocal(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

function saveLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function sanitizeAlerts(alerts) {
  const out = {}
  for (const [symbol, ca] of Object.entries(alerts || {})) {
    out[symbol] = { ...ca }
    for (const key of ['high', 'low']) {
      const v = String(ca?.[key] ?? '')
      const num = parseMoneyValue(v)
      if (!v || !Number.isFinite(num) || num <= 0) {
        out[symbol][key] = ''
        out[symbol][`${key}Enabled`] = false
      } else {
        out[symbol][key] = v
        out[symbol][`${key}Enabled`] = Boolean(ca?.[`${key}Enabled`])
      }
    }
  }
  return out
}

export default AppMobile
