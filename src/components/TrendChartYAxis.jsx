// Two numbers next to the bar area so the chart's scale isn't a guess:
// the max value at the top, zero at the bottom.
export default function TrendChartYAxis({ maxValue, formatValue }) {
  return (
    <div className="trend-chart__yaxis">
      <span>{formatValue(maxValue)}</span>
      <span>0</span>
    </div>
  )
}
