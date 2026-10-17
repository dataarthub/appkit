import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '../ui/chart';

interface SimpleAreaChartProps {
  data: Array<Record<string, unknown>>;
  xAxisKey: string;
  areaKeys: string[];
  title: string;
  description?: string;
  config?: ChartConfig;
  height?: number | string;
  stacked?: boolean;
}

/**
 * データをエリアで塗りつぶして表現するエリアチャート（面積グラフ）コンポーネント。
 */
export function SimpleAreaChart({
  data,
  xAxisKey,
  areaKeys,
  title,
  description,
  config,
  height = '250px',
  stacked = false,
}: SimpleAreaChartProps) {
  const defaultConfig: ChartConfig = {};
  areaKeys.forEach((key, index) => {
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
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
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
            {areaKeys.map((key) => (
              <Area
                key={key}
                dataKey={key}
                type='natural'
                fill={`var(--color-${key})`}
                fillOpacity={0.4}
                stroke={`var(--color-${key})`}
                stackId={stacked ? 'a' : undefined}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
