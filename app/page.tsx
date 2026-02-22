'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import {
  listSchedules,
  getSchedule,
  getScheduleLogs,
  pauseSchedule,
  resumeSchedule,
  cronToHuman,
  type Schedule,
  type ExecutionLog,
} from '@/lib/scheduler'
import { useLyzrAgentEvents } from '@/lib/lyzrAgentEvents'
import { AgentActivityPanel } from '@/components/AgentActivityPanel'
import {
  FiTrendingUp,
  FiClock,
  FiMail,
  FiPlus,
  FiX,
  FiPlay,
  FiPause,
  FiRefreshCw,
  FiSettings,
  FiBarChart2,
  FiCalendar,
  FiChevronDown,
  FiChevronUp,
  FiAlertCircle,
  FiCheckCircle,
  FiSearch,
  FiActivity,
  FiList,
  FiStar,
  FiArrowRight,
  FiEye,
  FiGlobe,
} from 'react-icons/fi'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MANAGER_AGENT_ID = '69975ad74244c70789da262a'
const SCHEDULE_ID = '69975adc399dfadeac37bac4'

const AGENTS = [
  { id: '69975ad74244c70789da262a', name: 'Stock Analysis Coordinator', role: 'Manager' },
  { id: '69975ab100057fe9f1918d4b', name: 'Stock Research Agent', role: 'Sub-Agent' },
  { id: '69975ac60e98ba5c96c4669a', name: 'Analysis & Delivery Agent', role: 'Sub-Agent' },
]

const THEME_VARS = {
  '--background': '0 0% 99%',
  '--foreground': '30 5% 15%',
  '--card': '0 0% 100%',
  '--card-foreground': '30 5% 15%',
  '--primary': '40 30% 45%',
  '--primary-foreground': '0 0% 100%',
  '--secondary': '30 10% 95%',
  '--secondary-foreground': '30 5% 20%',
  '--accent': '40 40% 50%',
  '--muted': '30 8% 92%',
  '--muted-foreground': '30 5% 50%',
  '--border': '30 10% 88%',
  '--destructive': '0 50% 45%',
} as React.CSSProperties

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ManagerResponse {
  status?: string
  stocks_analyzed?: string[]
  report_date?: string
  email_sent?: string
  email_recipient?: string
  portfolio_summary?: string
  key_highlights?: string[]
  errors?: string[]
}

interface StoredReport {
  id: string
  date: string
  stocks_analyzed: string[]
  portfolio_summary: string
  key_highlights: string[]
  email_sent: string
  email_recipient: string
  status: string
  errors: string[]
}

// ---------------------------------------------------------------------------
// Markdown Renderer
// ---------------------------------------------------------------------------

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-medium">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-medium text-sm mt-3 mb-1 font-serif tracking-wide" style={{ color: 'hsl(var(--foreground))' }}>
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-medium text-base mt-3 mb-1 font-serif tracking-wide" style={{ color: 'hsl(var(--foreground))' }}>
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-medium text-lg mt-4 mb-2 font-serif tracking-wide" style={{ color: 'hsl(var(--foreground))' }}>
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground))' }}>
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground))' }}>
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground))' }}>
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sample Data
// ---------------------------------------------------------------------------

const SAMPLE_WATCHLIST = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA']
const SAMPLE_REPORTS: StoredReport[] = [
  {
    id: 'sample-1',
    date: '2026-02-19',
    stocks_analyzed: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'],
    portfolio_summary:
      'Your portfolio shows strong momentum heading into Q1. Tech sector continues to outperform with AI-driven growth. NVDA leads with exceptional earnings beat, while AAPL shows steady consumer demand. MSFT cloud revenue acceleration provides stability. Overall portfolio rating: **Strong Buy** with a weighted upside of 18.4% over the next 12 months.',
    key_highlights: [
      'NVDA reported record quarterly revenue of $22.1B, beating estimates by 12%. AI chip demand continues to surge with data center revenue up 279% YoY.',
      'AAPL iPhone 16 Pro sales exceeded expectations in key markets. Services revenue hit an all-time high of $23.1B.',
      'MSFT Azure growth accelerated to 29% driven by AI workload migration. Copilot enterprise adoption doubled quarter-over-quarter.',
      'GOOGL Cloud division achieved profitability milestone with $9.1B quarterly revenue. Gemini AI integration boosting search monetization.',
      'AMZN AWS showing resilient growth at 13% despite enterprise spending pullback. Advertising segment now a $44B annual run rate business.',
    ],
    email_sent: 'true',
    email_recipient: 'investor@example.com',
    status: 'completed',
    errors: [],
  },
  {
    id: 'sample-2',
    date: '2026-02-18',
    stocks_analyzed: ['AAPL', 'MSFT', 'GOOGL'],
    portfolio_summary:
      'Markets showed mixed signals today. AAPL dipped 1.2% on supply chain concerns, but fundamentals remain intact. MSFT continues its steady climb on enterprise AI adoption. GOOGL antitrust ruling creates near-term uncertainty but long-term business remains strong.',
    key_highlights: [
      'AAPL faces temporary supply chain disruptions in key component sourcing. Analyst consensus remains Buy with $245 average price target.',
      'MSFT Teams platform surpassed 400M monthly active users. Enterprise AI suite driving significant upselling opportunities.',
      'GOOGL regulatory environment remains a key risk factor. Diversification into cloud and AI infrastructure provides resilience.',
    ],
    email_sent: 'true',
    email_recipient: 'investor@example.com',
    status: 'completed',
    errors: [],
  },
  {
    id: 'sample-3',
    date: '2026-02-17',
    stocks_analyzed: ['NVDA', 'AMZN'],
    portfolio_summary:
      'Focused analysis on AI infrastructure and e-commerce leaders. Both stocks show compelling valuations relative to growth trajectories. NVDA remains the dominant force in AI compute, while AMZN logistics optimization is driving margin expansion.',
    key_highlights: [
      'NVDA Blackwell GPU architecture receiving overwhelming demand. Backlog extends through next 3 quarters.',
      'AMZN same-day delivery expansion reducing cost-per-package by 15%. Prime membership at record 220M subscribers globally.',
    ],
    email_sent: 'true',
    email_recipient: 'investor@example.com',
    status: 'completed',
    errors: [],
  },
]

// ---------------------------------------------------------------------------
// Inline Helper Components
// ---------------------------------------------------------------------------

function TickerBadge({
  ticker,
  onRemove,
}: {
  ticker: string
  onRemove?: () => void
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium tracking-widest border"
      style={{
        borderColor: 'hsl(var(--border))',
        backgroundColor: 'hsl(var(--secondary))',
        color: 'hsl(var(--secondary-foreground))',
      }}
    >
      {ticker}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:opacity-70 transition-opacity"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          <FiX className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}

function StatusIndicator({
  active,
  label,
}: {
  active: boolean
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-2 text-xs tracking-wider uppercase">
      <span
        className="w-2 h-2 rounded-full"
        style={{
          backgroundColor: active ? 'hsl(120 40% 50%)' : 'hsl(var(--muted-foreground))',
        }}
      />
      {label}
    </span>
  )
}

function SkeletonLoader({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded"
          style={{
            backgroundColor: 'hsl(var(--muted))',
            width: i === lines - 1 ? '60%' : '100%',
          }}
        />
      ))}
    </div>
  )
}

function InlineMessage({
  type,
  message,
}: {
  type: 'success' | 'error' | 'info'
  message: string
}) {
  const icons = {
    success: <FiCheckCircle className="w-4 h-4 flex-shrink-0" />,
    error: <FiAlertCircle className="w-4 h-4 flex-shrink-0" />,
    info: <FiActivity className="w-4 h-4 flex-shrink-0" />,
  }
  const colors = {
    success: { bg: 'hsl(120 30% 96%)', border: 'hsl(120 30% 80%)', text: 'hsl(120 40% 30%)' },
    error: { bg: 'hsl(0 30% 96%)', border: 'hsl(0 30% 80%)', text: 'hsl(var(--destructive))' },
    info: { bg: 'hsl(var(--secondary))', border: 'hsl(var(--border))', text: 'hsl(var(--foreground))' },
  }
  const c = colors[type]
  return (
    <div
      className="flex items-center gap-2 px-4 py-3 text-sm border"
      style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
    >
      {icons[type]}
      <span>{message}</span>
    </div>
  )
}

function ReportCard({
  report,
  expanded,
  onToggle,
}: {
  report: StoredReport
  expanded: boolean
  onToggle: () => void
}) {
  const stockCount = Array.isArray(report.stocks_analyzed) ? report.stocks_analyzed.length : 0
  const highlights = Array.isArray(report.key_highlights) ? report.key_highlights : []
  const firstHighlight = highlights[0] ?? ''

  return (
    <div
      className="border transition-all duration-200"
      style={{
        backgroundColor: 'hsl(var(--card))',
        borderColor: 'hsl(var(--border))',
      }}
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-6 flex items-start justify-between gap-4"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span
              className="text-xs font-medium tracking-widest uppercase"
              style={{ color: 'hsl(var(--primary))' }}
            >
              {report.date}
            </span>
            <span
              className="text-xs tracking-wider uppercase"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              {stockCount} {stockCount === 1 ? 'stock' : 'stocks'} analyzed
            </span>
          </div>
          {!expanded && (
            <p
              className="text-sm leading-relaxed line-clamp-2"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              {firstHighlight || report.portfolio_summary || 'No summary available'}
            </p>
          )}
        </div>
        <span style={{ color: 'hsl(var(--muted-foreground))' }}>
          {expanded ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {expanded && (
        <div className="px-6 pb-6 space-y-6">
          {/* Stocks Analyzed */}
          <div>
            <h4
              className="text-xs tracking-widest uppercase mb-3 font-medium"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              Stocks Analyzed
            </h4>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(report.stocks_analyzed) &&
                report.stocks_analyzed.map((t) => <TickerBadge key={t} ticker={t} />)}
            </div>
          </div>

          {/* Portfolio Summary */}
          {report.portfolio_summary && (
            <div>
              <h4
                className="text-xs tracking-widest uppercase mb-3 font-medium"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                Portfolio Summary
              </h4>
              <div
                className="p-4 border"
                style={{
                  borderColor: 'hsl(var(--border))',
                  backgroundColor: 'hsl(var(--secondary))',
                }}
              >
                {renderMarkdown(report.portfolio_summary)}
              </div>
            </div>
          )}

          {/* Key Highlights */}
          {highlights.length > 0 && (
            <div>
              <h4
                className="text-xs tracking-widest uppercase mb-3 font-medium"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                Key Highlights
              </h4>
              <div className="space-y-3">
                {highlights.map((h, i) => (
                  <div
                    key={i}
                    className="flex gap-3 p-4 border"
                    style={{
                      borderColor: 'hsl(var(--border))',
                      backgroundColor: 'hsl(var(--secondary))',
                    }}
                  >
                    <FiStar
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      style={{ color: 'hsl(var(--primary))' }}
                    />
                    <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground))' }}>
                      {formatInline(h)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivery Info */}
          <div className="flex items-center gap-4 pt-2">
            {report.email_sent === 'true' && (
              <span
                className="inline-flex items-center gap-1.5 text-xs tracking-wider"
                style={{ color: 'hsl(120 40% 35%)' }}
              >
                <FiCheckCircle className="w-3.5 h-3.5" />
                Delivered to {report.email_recipient}
              </span>
            )}
            {Array.isArray(report.errors) && report.errors.length > 0 && (
              <span
                className="inline-flex items-center gap-1.5 text-xs tracking-wider"
                style={{ color: 'hsl(var(--destructive))' }}
              >
                <FiAlertCircle className="w-3.5 h-3.5" />
                {report.errors.length} {report.errors.length === 1 ? 'error' : 'errors'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ErrorBoundary
// ---------------------------------------------------------------------------

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'hsl(0 0% 99%)', color: 'hsl(30 5% 15%)' }}>
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-serif tracking-wide mb-2">Something went wrong</h2>
            <p className="text-sm mb-4" style={{ color: 'hsl(30 5% 50%)' }}>
              {this.state.error}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-6 py-2 text-sm tracking-wider uppercase border"
              style={{
                backgroundColor: 'hsl(40 30% 45%)',
                color: 'hsl(0 0% 100%)',
                borderColor: 'hsl(40 30% 45%)',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function Page() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings'>('dashboard')

  // Sample data toggle
  const [showSampleData, setShowSampleData] = useState(false)

  // Watchlist
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [tickerInput, setTickerInput] = useState('')

  // Email
  const [email, setEmail] = useState('')

  // Reports
  const [reports, setReports] = useState<StoredReport[]>([])
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisMessage, setAnalysisMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Schedule state
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [scheduleLogs, setScheduleLogs] = useState<ExecutionLog[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [scheduleMessage, setScheduleMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Settings
  const [settingsEmail, setSettingsEmail] = useState('')
  const [settingsTimezone, setSettingsTimezone] = useState('America/New_York')
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // History filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Dashboard report expansion
  const [dashboardReportExpanded, setDashboardReportExpanded] = useState(false)

  // Agent events
  const [sessionId, setSessionId] = useState<string | null>(null)
  const agentActivity = useLyzrAgentEvents(sessionId)

  // ---------------------------------------------------------------------------
  // localStorage persistence
  // ---------------------------------------------------------------------------

  useEffect(() => {
    try {
      const savedWatchlist = localStorage.getItem('stockpulse_watchlist')
      if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist))

      const savedEmail = localStorage.getItem('stockpulse_email')
      if (savedEmail) {
        setEmail(savedEmail)
        setSettingsEmail(savedEmail)
      }

      const savedReports = localStorage.getItem('stockpulse_reports')
      if (savedReports) setReports(JSON.parse(savedReports))

      const savedTimezone = localStorage.getItem('stockpulse_timezone')
      if (savedTimezone) setSettingsTimezone(savedTimezone)
    } catch {
      // Ignore parse errors
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('stockpulse_watchlist', JSON.stringify(watchlist))
    } catch {
      // Ignore
    }
  }, [watchlist])

  useEffect(() => {
    try {
      localStorage.setItem('stockpulse_email', email)
    } catch {
      // Ignore
    }
  }, [email])

  useEffect(() => {
    try {
      localStorage.setItem('stockpulse_reports', JSON.stringify(reports))
    } catch {
      // Ignore
    }
  }, [reports])

  useEffect(() => {
    try {
      localStorage.setItem('stockpulse_timezone', settingsTimezone)
    } catch {
      // Ignore
    }
  }, [settingsTimezone])

  // ---------------------------------------------------------------------------
  // Schedule loading
  // ---------------------------------------------------------------------------

  const loadSchedule = useCallback(async () => {
    setScheduleLoading(true)
    setScheduleError(null)
    try {
      const result = await getSchedule(SCHEDULE_ID)
      if (result.success && result.schedule) {
        setSchedule(result.schedule)
      } else {
        setScheduleError(result.error ?? 'Failed to load schedule')
      }
    } catch {
      setScheduleError('Failed to load schedule')
    }
    setScheduleLoading(false)
  }, [])

  const loadScheduleLogs = useCallback(async () => {
    try {
      const result = await getScheduleLogs(SCHEDULE_ID, { limit: 10 })
      if (result.success) {
        setScheduleLogs(Array.isArray(result.executions) ? result.executions : [])
      }
    } catch {
      // Silently handle
    }
  }, [])

  const refreshScheduleList = useCallback(async () => {
    const result = await listSchedules({ agentId: MANAGER_AGENT_ID })
    if (result.success && Array.isArray(result.schedules)) {
      const found = result.schedules.find((s) => s.id === SCHEDULE_ID)
      if (found) setSchedule(found)
    }
  }, [])

  useEffect(() => {
    loadSchedule()
    loadScheduleLogs()
  }, [loadSchedule, loadScheduleLogs])

  // ---------------------------------------------------------------------------
  // Toggle schedule active/paused
  // ---------------------------------------------------------------------------

  const handleToggleSchedule = useCallback(async () => {
    if (!schedule) return
    setScheduleLoading(true)
    setScheduleMessage(null)

    if (schedule.is_active) {
      const result = await pauseSchedule(SCHEDULE_ID)
      if (result.success) {
        setScheduleMessage({ type: 'success', text: 'Schedule paused successfully' })
      } else {
        setScheduleMessage({ type: 'error', text: result.error ?? 'Failed to pause schedule' })
      }
    } else {
      const result = await resumeSchedule(SCHEDULE_ID)
      if (result.success) {
        setScheduleMessage({ type: 'success', text: 'Schedule resumed successfully' })
      } else {
        setScheduleMessage({ type: 'error', text: result.error ?? 'Failed to resume schedule' })
      }
    }

    await refreshScheduleList()
    setScheduleLoading(false)
  }, [schedule, refreshScheduleList])

  // ---------------------------------------------------------------------------
  // Add / remove tickers
  // ---------------------------------------------------------------------------

  const addTicker = useCallback(() => {
    const t = tickerInput.trim().toUpperCase()
    if (t && !watchlist.includes(t)) {
      setWatchlist((prev) => [...prev, t])
    }
    setTickerInput('')
  }, [tickerInput, watchlist])

  const removeTicker = useCallback((t: string) => {
    setWatchlist((prev) => prev.filter((x) => x !== t))
  }, [])

  // ---------------------------------------------------------------------------
  // Run Analysis
  // ---------------------------------------------------------------------------

  const runAnalysis = useCallback(async () => {
    const tickers = showSampleData ? SAMPLE_WATCHLIST : watchlist
    const recipientEmail = showSampleData ? 'investor@example.com' : email

    if (tickers.length === 0) {
      setAnalysisMessage({ type: 'error', text: 'Add at least one stock ticker to your watchlist before running analysis.' })
      return
    }

    if (!recipientEmail) {
      setAnalysisMessage({ type: 'error', text: 'Please set a delivery email address in Settings before running analysis.' })
      return
    }

    setAnalyzing(true)
    setAnalysisMessage({ type: 'info', text: 'Analyzing your portfolio... This may take a moment.' })
    setActiveAgentId(MANAGER_AGENT_ID)
    agentActivity.setProcessing(true)

    try {
      const message = `Analyze the following stocks and send the report to ${recipientEmail}: ${tickers.join(', ')}`
      const result = await callAIAgent(message, MANAGER_AGENT_ID)

      if (result?.session_id) {
        setSessionId(result.session_id)
      }

      if (result?.success) {
        const data: ManagerResponse = result?.response?.result ?? {}

        const newReport: StoredReport = {
          id: `report-${Date.now()}`,
          date: data.report_date ?? new Date().toISOString().split('T')[0],
          stocks_analyzed: Array.isArray(data.stocks_analyzed) ? data.stocks_analyzed : tickers,
          portfolio_summary: data.portfolio_summary ?? '',
          key_highlights: Array.isArray(data.key_highlights) ? data.key_highlights : [],
          email_sent: data.email_sent ?? 'false',
          email_recipient: data.email_recipient ?? recipientEmail,
          status: data.status ?? 'completed',
          errors: Array.isArray(data.errors) ? data.errors : [],
        }

        setReports((prev) => [newReport, ...prev])

        const hasErrors = Array.isArray(data.errors) && data.errors.length > 0
        if (hasErrors) {
          setAnalysisMessage({
            type: 'error',
            text: `Analysis completed with errors: ${(data.errors ?? []).join(', ')}`,
          })
        } else if (data.email_sent === 'true') {
          setAnalysisMessage({
            type: 'success',
            text: `Report sent to ${data.email_recipient ?? recipientEmail}. View your latest report below.`,
          })
        } else {
          setAnalysisMessage({
            type: 'success',
            text: 'Analysis complete. View your latest report below.',
          })
        }
      } else {
        setAnalysisMessage({
          type: 'error',
          text: result?.error ?? 'Analysis failed. Please try again.',
        })
      }
    } catch {
      setAnalysisMessage({ type: 'error', text: 'Network error. Please check your connection and try again.' })
    }

    setAnalyzing(false)
    setActiveAgentId(null)
    agentActivity.setProcessing(false)
  }, [watchlist, email, showSampleData, agentActivity])

  // ---------------------------------------------------------------------------
  // Settings save
  // ---------------------------------------------------------------------------

  const saveSettings = useCallback(() => {
    setEmail(settingsEmail)
    setSettingsMessage({ type: 'success', text: 'Settings saved successfully.' })
    const timer = setTimeout(() => setSettingsMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [settingsEmail])

  // ---------------------------------------------------------------------------
  // Filtered reports for history
  // ---------------------------------------------------------------------------

  const displayReports = showSampleData && reports.length === 0 ? SAMPLE_REPORTS : reports
  const filteredReports = displayReports.filter((r) => {
    if (dateFrom && r.date < dateFrom) return false
    if (dateTo && r.date > dateTo) return false
    return true
  })

  // Latest report for dashboard
  const latestReport = displayReports.length > 0 ? displayReports[0] : null

  // Active watchlist (sample or real)
  const activeWatchlist = showSampleData ? SAMPLE_WATCHLIST : watchlist

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <ErrorBoundary>
      <div style={THEME_VARS}>
        <div style={{ backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))', minHeight: '100vh' }}>
          {/* ============================================================= */}
          {/* Top Navigation */}
          {/* ============================================================= */}
          <header
            className="border-b"
            style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
          >
            <div className="max-w-6xl mx-auto px-6">
              <div className="flex items-center justify-between h-16">
                {/* Logo */}
                <div className="flex items-center gap-3">
                  <FiTrendingUp className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
                  <span className="font-serif text-lg tracking-widest font-medium uppercase" style={{ color: 'hsl(var(--foreground))' }}>
                    GameStock
                  </span>
                </div>

                {/* Nav Tabs */}
                <nav className="hidden md:flex items-center gap-8">
                  {([
                    { key: 'dashboard' as const, label: 'Dashboard', icon: FiBarChart2 },
                    { key: 'history' as const, label: 'Report History', icon: FiList },
                    { key: 'settings' as const, label: 'Settings', icon: FiSettings },
                  ]).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className="flex items-center gap-2 py-5 text-xs tracking-widest uppercase border-b-2 transition-colors duration-200"
                      style={{
                        borderColor: activeTab === tab.key ? 'hsl(var(--primary))' : 'transparent',
                        color: activeTab === tab.key ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                      }}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </nav>

                {/* Sample Data Toggle */}
                <div className="flex items-center gap-3">
                  <span className="text-xs tracking-wider uppercase hidden sm:inline" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Sample Data
                  </span>
                  <button
                    onClick={() => setShowSampleData((p) => !p)}
                    className="relative w-10 h-5 border transition-colors duration-200"
                    style={{
                      backgroundColor: showSampleData ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                      borderColor: showSampleData ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                    }}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 transition-all duration-200"
                      style={{
                        backgroundColor: 'hsl(var(--card))',
                        left: showSampleData ? '20px' : '2px',
                      }}
                    />
                  </button>
                </div>
              </div>

              {/* Mobile Nav */}
              <div className="flex md:hidden items-center gap-4 pb-3 overflow-x-auto">
                {([
                  { key: 'dashboard' as const, label: 'Dashboard', icon: FiBarChart2 },
                  { key: 'history' as const, label: 'History', icon: FiList },
                  { key: 'settings' as const, label: 'Settings', icon: FiSettings },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="flex items-center gap-1.5 py-2 px-3 text-xs tracking-widest uppercase border-b-2 whitespace-nowrap"
                    style={{
                      borderColor: activeTab === tab.key ? 'hsl(var(--primary))' : 'transparent',
                      color: activeTab === tab.key ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                    }}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {/* ============================================================= */}
          {/* Content */}
          {/* ============================================================= */}
          <main className="max-w-6xl mx-auto px-6 py-8">
            {/* =========================================================== */}
            {/* DASHBOARD */}
            {/* =========================================================== */}
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* LEFT COLUMN: Latest Report (3/5 = 60%) */}
                <div className="lg:col-span-3 space-y-6">
                  <h2
                    className="font-serif text-xl tracking-wide font-medium"
                    style={{ color: 'hsl(var(--foreground))' }}
                  >
                    Latest Report
                  </h2>

                  {/* Analysis Status Messages */}
                  {analysisMessage && (
                    <InlineMessage type={analysisMessage.type} message={analysisMessage.text} />
                  )}

                  {latestReport ? (
                    <div
                      className="border"
                      style={{
                        borderColor: 'hsl(var(--border))',
                        backgroundColor: 'hsl(var(--card))',
                      }}
                    >
                      {/* Report Header */}
                      <div className="p-6 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <FiCalendar className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
                            <span
                              className="text-xs tracking-widest uppercase font-medium"
                              style={{ color: 'hsl(var(--primary))' }}
                            >
                              {latestReport.date}
                            </span>
                          </div>
                          <StatusIndicator
                            active={latestReport.status === 'completed'}
                            label={latestReport.status}
                          />
                        </div>

                        {/* Tickers */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {Array.isArray(latestReport.stocks_analyzed) &&
                            latestReport.stocks_analyzed.map((t) => (
                              <TickerBadge key={t} ticker={t} />
                            ))}
                        </div>

                        {/* Summary */}
                        {latestReport.portfolio_summary && (
                          <div className="mt-4">
                            {renderMarkdown(latestReport.portfolio_summary)}
                          </div>
                        )}
                      </div>

                      {/* Expandable Highlights */}
                      <div>
                        <button
                          onClick={() => setDashboardReportExpanded((p) => !p)}
                          className="w-full flex items-center justify-between px-6 py-4 text-xs tracking-widest uppercase hover:opacity-80 transition-opacity"
                          style={{ color: 'hsl(var(--primary))' }}
                        >
                          <span className="flex items-center gap-2">
                            <FiEye className="w-3.5 h-3.5" />
                            {dashboardReportExpanded ? 'Hide Details' : 'View Full Report'}
                          </span>
                          {dashboardReportExpanded ? (
                            <FiChevronUp className="w-4 h-4" />
                          ) : (
                            <FiChevronDown className="w-4 h-4" />
                          )}
                        </button>

                        {dashboardReportExpanded && (
                          <div className="px-6 pb-6 space-y-4">
                            <h4
                              className="text-xs tracking-widest uppercase font-medium"
                              style={{ color: 'hsl(var(--muted-foreground))' }}
                            >
                              Key Highlights
                            </h4>
                            {Array.isArray(latestReport.key_highlights) &&
                              latestReport.key_highlights.map((h, i) => (
                                <div
                                  key={i}
                                  className="flex gap-3 p-4 border"
                                  style={{
                                    borderColor: 'hsl(var(--border))',
                                    backgroundColor: 'hsl(var(--secondary))',
                                  }}
                                >
                                  <FiStar
                                    className="w-4 h-4 flex-shrink-0 mt-0.5"
                                    style={{ color: 'hsl(var(--primary))' }}
                                  />
                                  <p
                                    className="text-sm leading-relaxed"
                                    style={{ color: 'hsl(var(--foreground))' }}
                                  >
                                    {formatInline(h)}
                                  </p>
                                </div>
                              ))}

                            {/* Delivery info */}
                            {latestReport.email_sent === 'true' && (
                              <div className="flex items-center gap-2 pt-2">
                                <FiMail className="w-3.5 h-3.5" style={{ color: 'hsl(var(--muted-foreground))' }} />
                                <span className="text-xs tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                  Delivered to {latestReport.email_recipient}
                                </span>
                              </div>
                            )}

                            {/* Errors */}
                            {Array.isArray(latestReport.errors) && latestReport.errors.length > 0 && (
                              <div className="space-y-2 pt-2">
                                {latestReport.errors.map((err, i) => (
                                  <InlineMessage key={i} type="error" message={err} />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="border p-12 text-center"
                      style={{
                        borderColor: 'hsl(var(--border))',
                        backgroundColor: 'hsl(var(--card))',
                      }}
                    >
                      <FiBarChart2
                        className="w-8 h-8 mx-auto mb-4"
                        style={{ color: 'hsl(var(--muted-foreground))' }}
                      />
                      <h3
                        className="font-serif text-base tracking-wide mb-2"
                        style={{ color: 'hsl(var(--foreground))' }}
                      >
                        No Reports Yet
                      </h3>
                      <p
                        className="text-sm leading-relaxed max-w-sm mx-auto"
                        style={{ color: 'hsl(var(--muted-foreground))' }}
                      >
                        Add tickers to your watchlist and run your first analysis. Reports will be delivered to your email daily at 7:00 AM ET.
                      </p>
                    </div>
                  )}

                  {/* Agent Activity Panel */}
                  <AgentActivityPanel
                    isConnected={agentActivity.isConnected}
                    events={agentActivity.events}
                    thinkingEvents={agentActivity.thinkingEvents}
                    lastThinkingMessage={agentActivity.lastThinkingMessage}
                    activeAgentId={agentActivity.activeAgentId}
                    activeAgentName={agentActivity.activeAgentName}
                    isProcessing={agentActivity.isProcessing}
                  />
                </div>

                {/* RIGHT COLUMN: Watchlist + Schedule + CTA (2/5 = 40%) */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Watchlist Manager */}
                  <div
                    className="border"
                    style={{
                      borderColor: 'hsl(var(--border))',
                      backgroundColor: 'hsl(var(--card))',
                    }}
                  >
                    <div className="p-6">
                      <h3
                        className="font-serif text-sm tracking-widest uppercase mb-4 font-medium"
                        style={{ color: 'hsl(var(--foreground))' }}
                      >
                        Watchlist
                      </h3>

                      {/* Ticker Badges */}
                      <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
                        {activeWatchlist.length > 0 ? (
                          activeWatchlist.map((t) => (
                            <TickerBadge
                              key={t}
                              ticker={t}
                              onRemove={showSampleData ? undefined : () => removeTicker(t)}
                            />
                          ))
                        ) : (
                          <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            No tickers added yet
                          </span>
                        )}
                      </div>

                      {/* Add Ticker */}
                      {!showSampleData && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={tickerInput}
                            onChange={(e) => setTickerInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addTicker()}
                            placeholder="AAPL"
                            className="flex-1 px-3 py-2 text-sm border bg-transparent outline-none"
                            style={{
                              borderColor: 'hsl(var(--border))',
                              color: 'hsl(var(--foreground))',
                            }}
                          />
                          <button
                            onClick={addTicker}
                            className="px-3 py-2 border text-sm flex items-center gap-1.5 transition-opacity hover:opacity-80"
                            style={{
                              borderColor: 'hsl(var(--primary))',
                              color: 'hsl(var(--primary))',
                            }}
                          >
                            <FiPlus className="w-3.5 h-3.5" />
                            Add
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Schedule Status */}
                  <div
                    className="border"
                    style={{
                      borderColor: 'hsl(var(--border))',
                      backgroundColor: 'hsl(var(--card))',
                    }}
                  >
                    <div className="p-6">
                      <h3
                        className="font-serif text-sm tracking-widest uppercase mb-4 font-medium"
                        style={{ color: 'hsl(var(--foreground))' }}
                      >
                        Daily Schedule
                      </h3>

                      {scheduleLoading && !schedule ? (
                        <SkeletonLoader lines={3} />
                      ) : scheduleError && !schedule ? (
                        <InlineMessage type="error" message={scheduleError} />
                      ) : schedule ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <StatusIndicator
                              active={schedule.is_active}
                              label={schedule.is_active ? 'Active' : 'Paused'}
                            />
                            <button
                              onClick={handleToggleSchedule}
                              disabled={scheduleLoading}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs tracking-wider uppercase border transition-opacity hover:opacity-80 disabled:opacity-50"
                              style={{
                                borderColor: 'hsl(var(--border))',
                                color: 'hsl(var(--foreground))',
                              }}
                            >
                              {scheduleLoading ? (
                                <FiRefreshCw className="w-3 h-3 animate-spin" />
                              ) : schedule.is_active ? (
                                <FiPause className="w-3 h-3" />
                              ) : (
                                <FiPlay className="w-3 h-3" />
                              )}
                              {schedule.is_active ? 'Pause' : 'Resume'}
                            </button>
                          </div>

                          {scheduleMessage && (
                            <InlineMessage type={scheduleMessage.type} message={scheduleMessage.text} />
                          )}

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                              <FiClock className="w-3.5 h-3.5" />
                              <span className="tracking-wider">
                                {schedule.cron_expression ? cronToHuman(schedule.cron_expression) : 'Not set'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                              <FiGlobe className="w-3.5 h-3.5" />
                              <span className="tracking-wider">{schedule.timezone}</span>
                            </div>
                            {schedule.next_run_time && (
                              <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                <FiArrowRight className="w-3.5 h-3.5" />
                                <span className="tracking-wider">
                                  Next: {new Date(schedule.next_run_time).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {schedule.last_run_at && (
                              <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                <FiCalendar className="w-3.5 h-3.5" />
                                <span className="tracking-wider">
                                  Last: {new Date(schedule.last_run_at).toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          Schedule information unavailable.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Run Analysis Now CTA */}
                  <button
                    onClick={runAnalysis}
                    disabled={analyzing}
                    className="w-full py-4 text-sm tracking-widest uppercase border flex items-center justify-center gap-3 transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{
                      backgroundColor: 'hsl(var(--primary))',
                      color: 'hsl(var(--primary-foreground))',
                      borderColor: 'hsl(var(--primary))',
                    }}
                  >
                    {analyzing ? (
                      <>
                        <FiRefreshCw className="w-4 h-4 animate-spin" />
                        Analyzing your portfolio...
                      </>
                    ) : (
                      <>
                        <FiPlay className="w-4 h-4" />
                        Run Analysis Now
                      </>
                    )}
                  </button>

                  {/* Agent Info */}
                  <div
                    className="border"
                    style={{
                      borderColor: 'hsl(var(--border))',
                      backgroundColor: 'hsl(var(--card))',
                    }}
                  >
                    <div className="p-6">
                      <h3
                        className="font-serif text-sm tracking-widest uppercase mb-4 font-medium"
                        style={{ color: 'hsl(var(--foreground))' }}
                      >
                        Agent Network
                      </h3>
                      <div className="space-y-3">
                        {AGENTS.map((agent) => (
                          <div key={agent.id} className="flex items-center gap-3">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor:
                                  activeAgentId === agent.id
                                    ? 'hsl(var(--primary))'
                                    : 'hsl(var(--muted))',
                              }}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>
                                {agent.name}
                              </p>
                              <p className="text-xs tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                {agent.role}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================== */}
            {/* REPORT HISTORY */}
            {/* =========================================================== */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2
                    className="font-serif text-xl tracking-wide font-medium"
                    style={{ color: 'hsl(var(--foreground))' }}
                  >
                    Report History
                  </h2>
                  <span className="text-xs tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'}
                  </span>
                </div>

                {/* Date Filters */}
                <div
                  className="border p-4 flex flex-wrap items-center gap-4"
                  style={{
                    borderColor: 'hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))',
                  }}
                >
                  <FiSearch className="w-4 h-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
                  <div className="flex items-center gap-2">
                    <label className="text-xs tracking-wider uppercase" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      From
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="px-3 py-1.5 text-xs border bg-transparent outline-none"
                      style={{
                        borderColor: 'hsl(var(--border))',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs tracking-wider uppercase" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      To
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="px-3 py-1.5 text-xs border bg-transparent outline-none"
                      style={{
                        borderColor: 'hsl(var(--border))',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                  </div>
                  {(dateFrom || dateTo) && (
                    <button
                      onClick={() => {
                        setDateFrom('')
                        setDateTo('')
                      }}
                      className="text-xs tracking-wider underline"
                      style={{ color: 'hsl(var(--primary))' }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>

                {/* Report List */}
                {filteredReports.length > 0 ? (
                  <div className="space-y-3">
                    {filteredReports.map((report) => (
                      <ReportCard
                        key={report.id}
                        report={report}
                        expanded={expandedReportId === report.id}
                        onToggle={() =>
                          setExpandedReportId((prev) =>
                            prev === report.id ? null : report.id
                          )
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    className="border p-12 text-center"
                    style={{
                      borderColor: 'hsl(var(--border))',
                      backgroundColor: 'hsl(var(--card))',
                    }}
                  >
                    <FiList
                      className="w-8 h-8 mx-auto mb-4"
                      style={{ color: 'hsl(var(--muted-foreground))' }}
                    />
                    <h3
                      className="font-serif text-base tracking-wide mb-2"
                      style={{ color: 'hsl(var(--foreground))' }}
                    >
                      No Reports Yet
                    </h3>
                    <p
                      className="text-sm leading-relaxed max-w-sm mx-auto"
                      style={{ color: 'hsl(var(--muted-foreground))' }}
                    >
                      Your first analysis will appear here after the morning run. Enable sample data to preview the report format.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* =========================================================== */}
            {/* SETTINGS */}
            {/* =========================================================== */}
            {activeTab === 'settings' && (
              <div className="max-w-2xl space-y-8">
                <h2
                  className="font-serif text-xl tracking-wide font-medium"
                  style={{ color: 'hsl(var(--foreground))' }}
                >
                  Settings
                </h2>

                {settingsMessage && (
                  <InlineMessage type={settingsMessage.type} message={settingsMessage.text} />
                )}

                {/* Delivery Email */}
                <div
                  className="border"
                  style={{
                    borderColor: 'hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))',
                  }}
                >
                  <div className="p-6 space-y-4">
                    <h3
                      className="font-serif text-sm tracking-widest uppercase font-medium"
                      style={{ color: 'hsl(var(--foreground))' }}
                    >
                      Delivery Email
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Reports will be delivered to this email address after each analysis.
                    </p>
                    <div className="flex items-center gap-2">
                      <FiMail className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }} />
                      <input
                        type="email"
                        value={settingsEmail}
                        onChange={(e) => setSettingsEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="flex-1 px-3 py-2 text-sm border bg-transparent outline-none"
                        style={{
                          borderColor: 'hsl(var(--border))',
                          color: 'hsl(var(--foreground))',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Timezone */}
                <div
                  className="border"
                  style={{
                    borderColor: 'hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))',
                  }}
                >
                  <div className="p-6 space-y-4">
                    <h3
                      className="font-serif text-sm tracking-widest uppercase font-medium"
                      style={{ color: 'hsl(var(--foreground))' }}
                    >
                      Timezone
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Daily reports are delivered at 7:00 AM in your selected timezone.
                    </p>
                    <div className="flex items-center gap-2">
                      <FiGlobe className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }} />
                      <select
                        value={settingsTimezone}
                        onChange={(e) => setSettingsTimezone(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border bg-transparent outline-none"
                        style={{
                          borderColor: 'hsl(var(--border))',
                          color: 'hsl(var(--foreground))',
                        }}
                      >
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="America/Anchorage">Alaska Time (AKT)</option>
                        <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                        <option value="Europe/London">London (GMT/BST)</option>
                        <option value="Europe/Berlin">Central Europe (CET)</option>
                        <option value="Asia/Tokyo">Japan (JST)</option>
                        <option value="Asia/Shanghai">China (CST)</option>
                        <option value="Asia/Kolkata">India (IST)</option>
                        <option value="Australia/Sydney">Sydney (AEST)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Watchlist Configuration */}
                <div
                  className="border"
                  style={{
                    borderColor: 'hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))',
                  }}
                >
                  <div className="p-6 space-y-4">
                    <h3
                      className="font-serif text-sm tracking-widest uppercase font-medium"
                      style={{ color: 'hsl(var(--foreground))' }}
                    >
                      Watchlist
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Add stock tickers to track. These will be analyzed in your daily reports.
                    </p>

                    <div className="flex flex-wrap gap-2 min-h-[32px]">
                      {watchlist.length > 0 ? (
                        watchlist.map((t) => (
                          <TickerBadge key={t} ticker={t} onRemove={() => removeTicker(t)} />
                        ))
                      ) : (
                        <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          No tickers added yet
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tickerInput}
                        onChange={(e) => setTickerInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTicker()}
                        placeholder="e.g. AAPL"
                        className="flex-1 px-3 py-2 text-sm border bg-transparent outline-none"
                        style={{
                          borderColor: 'hsl(var(--border))',
                          color: 'hsl(var(--foreground))',
                        }}
                      />
                      <button
                        onClick={addTicker}
                        className="px-3 py-2 border text-sm flex items-center gap-1.5 transition-opacity hover:opacity-80"
                        style={{
                          borderColor: 'hsl(var(--primary))',
                          color: 'hsl(var(--primary))',
                        }}
                      >
                        <FiPlus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Schedule Management */}
                <div
                  className="border"
                  style={{
                    borderColor: 'hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))',
                  }}
                >
                  <div className="p-6 space-y-4">
                    <h3
                      className="font-serif text-sm tracking-widest uppercase font-medium"
                      style={{ color: 'hsl(var(--foreground))' }}
                    >
                      Schedule Management
                    </h3>

                    {scheduleLoading && !schedule ? (
                      <SkeletonLoader lines={4} />
                    ) : schedule ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <StatusIndicator
                            active={schedule.is_active}
                            label={schedule.is_active ? 'Active' : 'Paused'}
                          />
                          <button
                            onClick={handleToggleSchedule}
                            disabled={scheduleLoading}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs tracking-wider uppercase border transition-opacity hover:opacity-80 disabled:opacity-50"
                            style={{
                              borderColor: schedule.is_active ? 'hsl(var(--destructive))' : 'hsl(120 40% 40%)',
                              color: schedule.is_active ? 'hsl(var(--destructive))' : 'hsl(120 40% 35%)',
                            }}
                          >
                            {scheduleLoading ? (
                              <FiRefreshCw className="w-3 h-3 animate-spin" />
                            ) : schedule.is_active ? (
                              <FiPause className="w-3 h-3" />
                            ) : (
                              <FiPlay className="w-3 h-3" />
                            )}
                            {schedule.is_active ? 'Pause Schedule' : 'Resume Schedule'}
                          </button>
                        </div>

                        {scheduleMessage && (
                          <InlineMessage type={scheduleMessage.type} message={scheduleMessage.text} />
                        )}

                        <div
                          className="p-4 border space-y-3"
                          style={{
                            borderColor: 'hsl(var(--border))',
                            backgroundColor: 'hsl(var(--secondary))',
                          }}
                        >
                          <div className="flex justify-between text-xs">
                            <span style={{ color: 'hsl(var(--muted-foreground))' }}>Frequency</span>
                            <span style={{ color: 'hsl(var(--foreground))' }}>
                              {schedule.cron_expression ? cronToHuman(schedule.cron_expression) : 'Not set'}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span style={{ color: 'hsl(var(--muted-foreground))' }}>Timezone</span>
                            <span style={{ color: 'hsl(var(--foreground))' }}>{schedule.timezone}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span style={{ color: 'hsl(var(--muted-foreground))' }}>Cron Expression</span>
                            <span className="font-mono text-xs" style={{ color: 'hsl(var(--foreground))' }}>
                              {schedule.cron_expression}
                            </span>
                          </div>
                          {schedule.next_run_time && (
                            <div className="flex justify-between text-xs">
                              <span style={{ color: 'hsl(var(--muted-foreground))' }}>Next Run</span>
                              <span style={{ color: 'hsl(var(--foreground))' }}>
                                {new Date(schedule.next_run_time).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {schedule.last_run_at && (
                            <div className="flex justify-between text-xs">
                              <span style={{ color: 'hsl(var(--muted-foreground))' }}>Last Run</span>
                              <span style={{ color: 'hsl(var(--foreground))' }}>
                                {new Date(schedule.last_run_at).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Run History */}
                        <div className="pt-2">
                          <div className="flex items-center justify-between mb-3">
                            <h4
                              className="text-xs tracking-widest uppercase font-medium"
                              style={{ color: 'hsl(var(--muted-foreground))' }}
                            >
                              Run History
                            </h4>
                            <button
                              onClick={loadScheduleLogs}
                              className="text-xs tracking-wider flex items-center gap-1 transition-opacity hover:opacity-70"
                              style={{ color: 'hsl(var(--primary))' }}
                            >
                              <FiRefreshCw className="w-3 h-3" />
                              Refresh
                            </button>
                          </div>

                          {Array.isArray(scheduleLogs) && scheduleLogs.length > 0 ? (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {scheduleLogs.map((log) => (
                                <div
                                  key={log.id}
                                  className="flex items-center justify-between p-3 border text-xs"
                                  style={{
                                    borderColor: 'hsl(var(--border))',
                                    backgroundColor: 'hsl(var(--secondary))',
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    {log.success ? (
                                      <FiCheckCircle className="w-3.5 h-3.5" style={{ color: 'hsl(120 40% 35%)' }} />
                                    ) : (
                                      <FiAlertCircle className="w-3.5 h-3.5" style={{ color: 'hsl(var(--destructive))' }} />
                                    )}
                                    <span style={{ color: 'hsl(var(--foreground))' }}>
                                      {log.success ? 'Success' : 'Failed'}
                                    </span>
                                  </div>
                                  <span style={{ color: 'hsl(var(--muted-foreground))' }}>
                                    {new Date(log.executed_at).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs py-4 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
                              No execution history available.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <InlineMessage type="error" message={scheduleError ?? 'Schedule not found'} />
                    )}
                  </div>
                </div>

                {/* Save Settings Button */}
                <button
                  onClick={saveSettings}
                  className="w-full py-3 text-sm tracking-widest uppercase border flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                    borderColor: 'hsl(var(--primary))',
                  }}
                >
                  <FiCheckCircle className="w-4 h-4" />
                  Save Settings
                </button>
              </div>
            )}
          </main>

          {/* ============================================================= */}
          {/* Footer */}
          {/* ============================================================= */}
          <footer
            className="border-t mt-12"
            style={{ borderColor: 'hsl(var(--border))' }}
          >
            <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-xs tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>
                GameStock -- Daily Stock Analysis
              </span>
              <span className="text-xs tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Powered by Lyzr AI Agent Network
              </span>
            </div>
          </footer>
        </div>
      </div>
    </ErrorBoundary>
  )
}
