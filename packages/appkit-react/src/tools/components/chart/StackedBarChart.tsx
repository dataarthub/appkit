import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '../ui/chart';

interface StackedBarChartProps {
  data: Array<Record<string, unknown>>;
  xAxisKey: string;
  barKeys: string[];
  title: string;
  description?: string;
  config?: ChartConfig;
  height?: number | string;
}

/**
 * 複数のカテゴリデータを1本の棒に積み上げて全体の割合や構成比を表示する積層棒グラフコンポーネント。
 */
export function StackedBarChart({
  data,
  xAxisKey,
  barKeys,
  title,
  description,
  config,
  height = '300px',
}: StackedBarChartProps) {
  const defaultConfig: ChartConfig = {};
  barKeys.forEach((key, index) => {
    defaultConfig[key] = {
      label: key,
      color: `hsl(var(--chart-${(index % 5) + 1}))`,
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
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} stroke='var(--color-border)' />
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => String(value).slice(0, 5)}
              tick={{ fill: 'var(--color-muted-foreground)' }}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <ChartLegend content={<ChartLegendContent />} />
            {barKeys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                stackId='a'
                fill={`var(--color-${key})`}
                radius={[0, 0, 4, 4]}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
