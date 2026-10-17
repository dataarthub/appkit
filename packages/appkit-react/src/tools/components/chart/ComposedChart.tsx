import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart as RechartsComposedChart,
  Line,
  XAxis,
} from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '../ui/chart';

export interface ComposedChartSeries {
  key: string;
  type: 'bar' | 'line' | 'area';
  color?: string;
  stackId?: string;
}

interface ComposedChartProps {
  data: Array<Record<string, unknown>>;
  xAxisKey: string;
  series: ComposedChartSeries[];
  title: string;
  description?: string;
  config?: ChartConfig;
  height?: number | string;
}

/**
 * 棒、折れ線、エリアチャートを組み合わせて1つのグラフに描画する複合チャートコンポーネント。
 */
export function ComposedChart({
  data,
  xAxisKey,
  series,
  title,
  description,
  config,
  height = '300px',
}: ComposedChartProps) {
  const defaultConfig: ChartConfig = {};
  series.forEach((s, index) => {
    defaultConfig[s.key] = {
      label: s.key,
      color: s.color || `hsl(var(--chart-${(index % 5) + 1}))`,
    };
  });

  const finalConfig = config || defaultConfig;

  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={finalConfig} className={`w-full min-h-[${height}]`}>
          <RechartsComposedChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} stroke='var(--color-border)' />
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => String(value).slice(0, 5)}
              tick={{ fill: 'var(--color-muted-foreground)' }}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />

            {series.map((s) => {
              const colorVar = `var(--color-${s.key})`;

              if (s.type === 'bar') {
                return (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    fill={colorVar}
                    stackId={s.stackId}
                    radius={[4, 4, 0, 0]}
                  />
                );
              }
              if (s.type === 'line') {
                return (
                  <Line
                    key={s.key}
                    dataKey={s.key}
                    type='monotone'
                    stroke={colorVar}
                    strokeWidth={2}
                    dot={false}
                  />
                );
              }
              if (s.type === 'area') {
                return (
                  <Area
                    key={s.key}
                    dataKey={s.key}
                    type='natural'
                    fill={colorVar}
                    fillOpacity={0.4}
                    stroke={colorVar}
                    stackId={s.stackId}
                  />
                );
              }
              return null;
            })}
          </RechartsComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
