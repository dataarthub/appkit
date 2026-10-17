import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '../ui/chart';

interface SimpleRadarChartProps {
  data: Array<Record<string, unknown>>;
  dataKey: string; // The metric value
  angleKey: string; // The category/axis label
  title: string;
  description?: string;
  config?: ChartConfig;
  height?: number | string;
}

/**
 * 複数項目のバランスや特性を比較するために多角形で描画するレーダーチャートコンポーネント。
 */
export function SimpleRadarChart({
  data,
  dataKey,
  angleKey,
  title,
  description,
  config,
  height = '300px',
}: SimpleRadarChartProps) {
  const defaultConfig: ChartConfig = {
    [dataKey]: {
      label: dataKey,
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
        <ChartContainer
          config={finalConfig}
          className={`w-full min-h-[${height}] mx-auto aspect-square`}
        >
          <RadarChart data={data}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarAngleAxis dataKey={angleKey} tick={{ fill: 'var(--color-muted-foreground)' }} />
            <PolarGrid stroke='var(--color-border)' />
            <Radar
              dataKey={dataKey}
              fill={`var(--color-${dataKey})`}
              fillOpacity={0.6}
              dot={{
                r: 4,
                fillOpacity: 1,
              }}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
