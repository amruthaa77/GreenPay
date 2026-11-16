import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { TrendingUp, AlertCircle, Info, Calendar, ChevronRight } from 'lucide-react';

export const PredictiveForecastPage: React.FC = () => {
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [forecastData, setForecastData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForecast();
  }, [selectedWard]);

  const loadForecast = async () => {
    setLoading(true);
    try {
      const data = await adminApi.admin.getForecast(selectedWard || undefined);
      setForecastData(data);
    } finally {
      setLoading(false);
    }
  };

  // Combine historical and forecast for Recharts chart
  const chartData = React.useMemo(() => {
    if (!forecastData || forecastData.status !== 'OK') return [];

    const list: any[] = [];
    forecastData.historical.forEach((h: any) => {
      list.push({
        month: h.month,
        actual: h.actual_kg,
        trend: h.fitted_trend_kg,
        lower_bound: null,
        upper_bound: null,
        type: 'historical',
      });
    });

    forecastData.forecast.forEach((f: any) => {
      list.push({
        month: `${f.month} (Est.)`,
        actual: null,
        trend: f.predicted_kg,
        lower_bound: f.lower_bound_95,
        upper_bound: f.upper_bound_95,
        type: 'forecast',
      });
    });

    return list;
  }, [forecastData]);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="micro-label text-blue-600 dark:text-blue-400">OLS LINEAR REGRESSION ENGINE</span>
          <h1 className="text-2xl sm:text-4xl font-light text-slate-900 dark:text-white tracking-tight">
            Waste Generation Forecast
          </h1>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1 max-w-2xl">
            Ordinary Least Squares (OLS) regression with 95% prediction intervals.
            Requires at least 6 months of historical data (Amendment #7).
          </p>
        </div>

        {/* Ward Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="forecast-ward" className="text-xs text-slate-700 dark:text-[#A7B9A8]">Ward:</label>
          <select
            id="forecast-ward"
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
          >
            <option value="">All Bengaluru Pilot Wards</option>
            <option value="Koramangala">Koramangala</option>
            <option value="Indiranagar">Indiranagar</option>
            <option value="Jayanagar">Jayanagar</option>
            <option value="Whitefield">Whitefield</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-20 text-center text-slate-600 dark:text-[#A7B9A8]">
          <div className="w-8 h-8 border-2 border-emerald-600 dark:border-[#D7FF35] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-mono">Calculating regression line and prediction intervals...</p>
        </div>
      ) : forecastData?.status === 'INSUFFICIENT_DATA' ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 text-center space-y-3 shadow-sm dark:shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center mx-auto text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-light text-slate-900 dark:text-white">Insufficient Historical Observations</h2>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8] max-w-md mx-auto leading-relaxed">
            {forecastData.message || 'OLS regression requires at least 6 months of verified collections to calculate statistically meaningful trends.'}
          </p>
        </div>
      ) : (
        <>
          {/* Statistical Metrics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 space-y-1 shadow-sm dark:shadow-xl">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] tracking-wider">
                Monthly Trend (Slope)
              </span>
              <div className="text-2xl font-light text-slate-900 dark:text-white font-mono flex items-baseline gap-1">
                <span>{forecastData?.slope > 0 ? `+${forecastData?.slope}` : forecastData?.slope}</span>
                <span className="text-xs text-emerald-700 dark:text-[#D7FF35]">kg/mo</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-[#A7B9A8]/70">Rate of volume change</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 space-y-1 shadow-sm dark:shadow-xl">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] tracking-wider">
                Goodness of Fit (R²)
              </span>
              <div className="text-2xl font-light text-slate-900 dark:text-white font-mono">
                {forecastData?.r_squared?.toFixed(3)}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-[#A7B9A8]/70">Linear variance explained</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 space-y-1 shadow-sm dark:shadow-xl">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] tracking-wider">
                Next Month Forecast
              </span>
              <div className="text-2xl font-light text-blue-600 dark:text-blue-400 font-mono">
                {Math.round(forecastData?.next_month_prediction || 0).toLocaleString()} kg
              </div>
              <p className="text-[10px] text-slate-500 dark:text-[#A7B9A8]/70">Point estimate</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 space-y-1 shadow-sm dark:shadow-xl">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] tracking-wider">
                Confidence Level
              </span>
              <div className="text-2xl font-light text-emerald-700 dark:text-[#D7FF35] font-mono">
                95%
              </div>
              <p className="text-[10px] text-slate-500 dark:text-[#A7B9A8]/70">t-distribution interval</p>
            </div>
          </div>

          {/* Forecast Chart */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 space-y-4 shadow-sm dark:shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-light text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Historical Volume & 3-Month Projection
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30">
                ESTIMATE
              </span>
            </div>

            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />
                  <XAxis dataKey="month" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#062B20', borderColor: 'rgba(215, 255, 53, 0.2)', borderRadius: '12px', color: '#F4F7F0' }}
                    itemStyle={{ fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {/* Shaded 95% Confidence Band */}
                  <Area
                    type="monotone"
                    dataKey="upper_bound"
                    stroke="none"
                    fill="#3B82F6"
                    fillOpacity={0.15}
                    name="95% Upper Bound"
                  />
                  <Area
                    type="monotone"
                    dataKey="lower_bound"
                    stroke="none"
                    fill="#3B82F6"
                    fillOpacity={0.15}
                    name="95% Lower Bound"
                  />
                  {/* Actual Recorded Volume */}
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: '#10B981', r: 4 }}
                    name="Actual Verified (kg)"
                  />
                  {/* Fitted & Forecasted Trend */}
                  <Line
                    type="monotone"
                    dataKey="trend"
                    stroke="#60A5FA"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    dot={{ fill: '#60A5FA', r: 3 }}
                    name="Fitted OLS Trend"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-[#A7B9A8] text-center leading-relaxed">
              Shaded blue band illustrates the 95% prediction interval based on residual standard error.
              Forecasts are planning estimates and do not guarantee future waste tonnage.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
