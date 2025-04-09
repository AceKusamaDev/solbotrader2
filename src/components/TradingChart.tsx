'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export default function TradingChart({ symbol = 'SOLUSD' }: { symbol?: string }) {
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch SOL price data
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        setLoading(true);
        
        // Fetch current price from CoinGecko
        const priceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true');
        const priceData = await priceResponse.json();
        
        if (priceData && priceData.solana) {
          setCurrentPrice(priceData.solana.usd);
          setPriceChangePercent(priceData.solana.usd_24h_change || 0);
          
          // Calculate absolute price change
          const change = (priceData.solana.usd * priceData.solana.usd_24h_change / 100);
          setPriceChange(change);
        }
        
        // Fetch historical data for chart
        const historyResponse = await fetch('https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=1&interval=hourly');
        const historyData = await historyResponse.json();
        
        if (historyData && historyData.prices) {
          // Format data for chart
          const formattedData = historyData.prices.map((item: [number, number], index: number) => {
            const date = new Date(item[0]);
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            
            // Get volume if available
            const volume = historyData.total_volumes && historyData.total_volumes[index] ? 
                          historyData.total_volumes[index][1] : 0;
            
            // For candlestick simulation (we don't have OHLC data from this API)
            // So we'll create simulated candle data based on the price point
            const price = item[1];
            const volatility = price * 0.005; // 0.5% volatility for simulation
            
            return {
              time: formattedTime,
              price: price,
              open: price - (Math.random() * volatility),
              high: price + (Math.random() * volatility),
              low: price - (Math.random() * volatility),
              close: price,
              volume: volume
            };
          });
          
          setChartData(formattedData);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching price data:', err);
        setError('Failed to load chart data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchSolPrice();
    
    // Refresh data every minute
    const intervalId = setInterval(fetchSolPrice, 60000);
    
    return () => clearInterval(intervalId);
  }, [symbol]);
  
  // Calculate candle colors
  const getCandleColor = (data: CandleData) => {
    return data.close >= data.open ? '#10B981' : '#EF4444';
  };
  
  // Format price with 2 decimal places
  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  return (
    <div className="h-[500px] w-full bg-gray-800 rounded-lg overflow-hidden flex flex-col">
      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-4">Trading Chart</h3>
        
        {error ? (
          <div className="bg-red-900/50 p-4 rounded-md mb-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span className="text-red-300">{error}</span>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="bg-gray-700 p-4 rounded-lg mb-4">
              <div className="text-sm text-gray-400">Symbol</div>
              <div className="text-xl font-bold text-white">{symbol}</div>
            </div>
            
            <div className="flex justify-between mb-4">
              <span className={`text-xl font-bold ${currentPrice && currentPrice > 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${currentPrice ? formatPrice(currentPrice) : '0.00'}
              </span>
              <span className={`text-sm ${priceChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                24h: {priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
                ({priceChange >= 0 ? '+' : ''}${Math.abs(priceChange).toFixed(2)})
              </span>
            </div>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#9CA3AF"
                    tickFormatter={(value) => value}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(value) => `$${formatPrice(value)}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                    labelStyle={{ color: '#F9FAFB' }}
                    formatter={(value: number) => [`$${formatPrice(value)}`, 'Price']}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#10B981" 
                    dot={false}
                    activeDot={{ r: 8 }} 
                    name="SOL/USD"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4">
              <h4 className="text-md font-bold text-white mb-2">Volume</h4>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#9CA3AF"
                      tickFormatter={(value) => value}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                      labelStyle={{ color: '#F9FAFB' }}
                      formatter={(value: number) => [`${(value / 1000000).toFixed(2)}M`, 'Volume']}
                    />
                    <Bar 
                      dataKey="volume" 
                      fill="#3B82F6" 
                      name="Volume"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="mt-auto p-4 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          Data provided by CoinGecko API • Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
