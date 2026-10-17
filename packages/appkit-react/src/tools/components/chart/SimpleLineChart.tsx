import { CartesianGrid, Line, LineChart, XAxis } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart';

/**
 * シンプルな折れ線グラフのプロップス
 */
interface SimpleLineChartProps {
  /** グラフデータ配列 */
  data: Array<Record<string, unknown>>;
  /** X軸に使用するデータキー */
  xAxisKey: string;
  /** 折れ線として表示するデータキーの配列 */
  lineKeys: string[];
  /** カードのタイトル */
  title: string;
  /** カードの説明（オプション） */
  description?: string;
  /** チャート設定（色やラベル等） */
  config?: ChartConfig;
  /** グラフの高さ */
  height?: number | string;
}

/**
 * シンプルな折れ線グラフ
 *
 * 時系列データや傾向を視覚化するための折れ線グラフコンポーネント。
 * Recharts を使用し、自動的にテーマカラーを適用します。
 *
 * @param props - コンポーネントのプロップス
 *
 * @example
 * ```tsx
 * import { SimpleLineChart } from '@alneas/appkit-react/tools/chart';
 *
 * const data = [
 *   { month: '1月', sales: 100, profit: 40 },
 *   { month: '2月', sales: 150, profit: 60 },
 *   { month: '3月', sales: 200, profit: 80 },
 * ];
 *
 * <SimpleLineChart
 *   data={data}
 *   xAxisKey="month"
 *   lineKeys={['sales', 'profit']}
 *   title="売上推移"
 *   description="月別売上と利益"
 * />
 * ```
 */
export function SimpleLineChart({
  data,
  xAxisKey,
  lineKeys,
  title,
  description,
  config,
  height = '250px',
}: SimpleLineChartProps) {
  // Default config generation if not provided
  const defaultConfig: ChartConfig = {};
  lineKeys.forEach((key, index) => {
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
          <LineChart
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
              tickFormatter={(value) => value.slice(0, 5)}
              tick={{ fill: 'var(--color-muted-foreground)' }}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            {lineKeys.map((key) => (
              <Line
                key={key}
                dataKey={key}
                type='monotone'
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
