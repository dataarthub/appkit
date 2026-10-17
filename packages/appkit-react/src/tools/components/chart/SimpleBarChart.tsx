import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart';

/**
 * シンプルな棒グラフのプロップス
 */
interface SimpleBarChartProps {
  /** グラフデータ配列 */
  data: Array<Record<string, unknown>>;
  /** X軸に使用するデータキー */
  xAxisKey: string;
  /** 棒グラフとして表示するデータキー */
  barKey: string;
  /** カードのタイトル */
  title: string;
  /** カードの説明（オプション） */
  description?: string;
  /** チャート設定 */
  config?: ChartConfig;
  /** グラフの高さ */
  height?: number | string;
  /** 棒グラフの色 */
  barColor?: string;
}

/**
 * シンプルな棒グラフ
 *
 * カテゴリ別の値を比較するための棒グラフコンポーネント。
 *
 * @example
 * ```tsx
 * import { SimpleBarChart } from '@alneas/appkit-react/tools/chart';
 *
 * const data = [
 *   { month: '1月', sales: 100 },
 *   { month: '2月', sales: 150 },
 * ];
 *
 * <SimpleBarChart
 *   data={data}
 *   xAxisKey="month"
 *   barKey="sales"
 *   title="月別売上"
 * />
 * ```
 */
export function SimpleBarChart({
  data,
  xAxisKey,
  barKey,
  title,
  description,
  config,
  height = '200px',
  barColor = 'var(--color-bar)',
}: SimpleBarChartProps) {
  const defaultConfig = {
    [barKey]: {
      label: barKey,
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig;

  const finalConfig = config || defaultConfig;

  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className='pl-2'>
        <ChartContainer config={finalConfig} className="w-full aspect-auto" style={{ height }}>
          <RechartsBarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} stroke='var(--color-border)' />
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => String(value).slice(0, 5)}
              tick={{ fill: 'var(--color-muted-foreground)' }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey={barKey} fill={barColor} radius={4} />
          </RechartsBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
