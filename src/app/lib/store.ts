import { Trade, TradeStats } from './types';

const STORAGE_KEY = 'cypher_trades';

export function getTrades(): Trade[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveTrades(trades: Trade[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

export function addTrade(trade: Trade) {
  const trades = getTrades();
  trades.push(trade);
  saveTrades(trades);
  return trades;
}

export function deleteTrade(id: string) {
  const trades = getTrades().filter(t => t.id !== id);
  saveTrades(trades);
  return trades;
}

export function updateTrade(updated: Trade) {
  const trades = getTrades().map(t => t.id === updated.id ? updated : t);
  saveTrades(trades);
  return trades;
}

export function calculateStats(trades: Trade[]): TradeStats {
  if (trades.length === 0) {
    return {
      totalTrades: 0, winRate: 0, totalPnl: 0, avgWin: 0, avgLoss: 0,
      profitFactor: 0, largestWin: 0, largestLoss: 0, avgHoldTime: '0h',
      consecutiveWins: 0, consecutiveLosses: 0, sharpeRatio: 0,
    };
  }

  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl <= 0);
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const grossWins = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLosses = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

  let maxConsWins = 0, maxConsLosses = 0, cw = 0, cl = 0;
  const sorted = [...trades].sort((a, b) => new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime());
  for (const t of sorted) {
    if (t.pnl > 0) { cw++; cl = 0; maxConsWins = Math.max(maxConsWins, cw); }
    else { cl++; cw = 0; maxConsLosses = Math.max(maxConsLosses, cl); }
  }

  const holdTimes = trades.map(t => {
    const entry = new Date(t.entryDate).getTime();
    const exit = new Date(t.exitDate).getTime();
    return (exit - entry) / (1000 * 60 * 60);
  });
  const avgHoldHours = holdTimes.length > 0 ? holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length : 0;

  const pnls = trades.map(t => t.pnl);
  const avgPnl = pnls.reduce((a, b) => a + b, 0) / pnls.length;
  const stdDev = Math.sqrt(pnls.reduce((sum, p) => sum + Math.pow(p - avgPnl, 2), 0) / pnls.length);

  return {
    totalTrades: trades.length,
    winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
    totalPnl: totalPnl,
    avgWin: wins.length > 0 ? grossWins / wins.length : 0,
    avgLoss: losses.length > 0 ? grossLosses / losses.length : 0,
    profitFactor: grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0,
    largestWin: wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0,
    largestLoss: losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0,
    avgHoldTime: avgHoldHours < 1 ? `${Math.round(avgHoldHours * 60)}m` : `${avgHoldHours.toFixed(1)}h`,
    consecutiveWins: maxConsWins,
    consecutiveLosses: maxConsLosses,
    sharpeRatio: stdDev > 0 ? avgPnl / stdDev : 0,
  };
}