import { CartesianGrid, Scatter, ScatterChart, XAxis, YAxis, ZAxis } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '../ui/chart';

interface SimpleScatterChartProps {
  data: Array<Record<string, unknown>>;
  xAxisKey: string;
  yAxisKey: string;
  zAxisKey?: string; // Optional for bubble size
  nameKey?: string; // For tooltip label
  title: string;
  description?: string;
  config?: ChartConfig;
  height?: number | string;
}

/**
 * 2つの変数間の関係性をプロットして表現する散布図コンポーネント。Z軸を使用したバブルチャート表示も可能です。
 */
export function SimpleScatterChart({
  data,
  xAxisKey,
  yAxisKey,
  zAxisKey,
  nameKey,
  title,
  description,
  config,
  height = '300px',
}: SimpleScatterChartProps) {
  // Scatter usually needs manual config since it doesn't just iterate keys
  const defaultConfig: ChartConfig = {
    [yAxisKey]: {
      label: yAxisKey,
      color: 'hsl(var(--chart-1))',
    },
  };

  const finalConfig = config || defaultConfig;

  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={finalConfig} className={`w-full min-h-[${height}]`}>
          <ScatterChart
            accessibilityLayer
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} stroke='var(--color-border)' />
            <XAxis
              type='number'
              dataKey={xAxisKey}
              name={xAxisKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: 'var(--color-muted-foreground)' }}
            />
            <YAxis
              type='number'
              dataKey={yAxisKey}
              name={yAxisKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: 'var(--color-muted-foreground)' }}
            />
            {zAxisKey && (
              <ZAxis type='number' dataKey={zAxisKey} range={[60, 400]} name={zAxisKey} />
            )}

            <ChartTooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />

            <Scatter name={nameKey || title} data={data} fill={`var(--color-${yAxisKey})`} />
          </ScatterChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
