import { Pie, PieChart as RechartsPieChart } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '../ui/chart';

/**
 * シンプルな円グラフのプロップス
 */
interface SimplePieChartProps {
  /** グラフデータ配列 */
  data: Array<Record<string, unknown>>;
  /** 値として使用するデータキー */
  dataKey: string;
  /** ラベルとして使用するデータキー */
  nameKey: string;
  /** カードのタイトル */
  title: string;
  /** カードの説明（オプション） */
  description?: string;
  /** チャート設定 */
  config?: ChartConfig;
}

/**
 * シンプルな円グラフ
 *
 * 割合や構成比を視覚化するためのドーナツ型円グラフ。
 *
 * @example
 * ```tsx
 * import { SimplePieChart } from '@alneas/appkit-react/tools/chart';
 *
 * const data = [
 *   { category: '製品A', value: 300, fill: 'var(--color-chart-1)' },
 *   { category: '製品B', value: 200, fill: 'var(--color-chart-2)' },
 * ];
 *
 * <SimplePieChart
 *   data={data}
 *   dataKey="value"
 *   nameKey="category"
 *   title="製品別売上"
 * />
 * ```
 */
export function SimplePieChart({
  data,
  dataKey,
  nameKey,
  title,
  description,
  config,
}: SimplePieChartProps) {
  // Generate specific colors if not provided in data
  // Ideally data should have 'fill' property or config should handle it

  // Default config fallback if none provided
  const defaultConfig = {
    [dataKey]: {
      label: dataKey,
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig;

  const finalConfig = config || defaultConfig;

  return (
    <Card className='w-full h-full flex flex-col'>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className='flex-1 pb-0'>
        <ChartContainer config={finalConfig} className='mx-auto aspect-square max-h-[250px]'>
          <RechartsPieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie data={data} dataKey={dataKey} nameKey={nameKey} innerRadius={60} strokeWidth={5} />
            <ChartLegend
              content={
                <ChartLegendContent
                  nameKey={nameKey}
                  className='-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center'
                />
              }
            />
          </RechartsPieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
