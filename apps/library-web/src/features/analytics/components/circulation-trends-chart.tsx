import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { CirculationTrendPoint } from '@/types/analytics'

function formatDateLabel(date: string) {
  const d = new Date(`${date}T00:00:00`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function CirculationTrendsChart({ data }: { data: CirculationTrendPoint[] }) {
  const chartData = data.map((point) => ({
    ...point,
    label: formatDateLabel(point.date),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Circulation trends</CardTitle>
        <CardDescription>Checkouts, returns, and reservations over time</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-500">
            No circulation activity in this period yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dde1f5" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9aa0c3" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#9aa0c3" />
              <Tooltip
                contentStyle={{ borderRadius: 16, border: '1px solid #dde1f5' }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend />
              <Bar dataKey="checkouts" name="Checkouts" fill="#635bff" radius={[6, 6, 0, 0]} />
              <Bar dataKey="returns" name="Returns" fill="#9a93ff" radius={[6, 6, 0, 0]} />
              <Bar dataKey="reservations" name="Reservations" fill="#2f2a6b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
