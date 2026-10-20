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

/**
 * Input data, keys and presentation options for the chart wrapper.
 * @see StackedBarChart
 */
interface StackedBarChartProps {
  /**
   * Already-loaded records in plot order; required numeric values and category keys must be present.
   */
  data: Array<Record<string, unknown>>;
  /**
   * Record key used for the horizontal axis; category charts format ticks to the first five characters.
   */
  xAxisKey: string;
  /**
   * Record keys for numeric series stacked together in declared order.
   */
  barKeys: string[];
  /**
   * Visible card heading.
   */
  title: string;
  /**
   * Optional supporting card text; omitted means no description.
   */
  description?: string;
  /**
   * Optional ChartConfig replacing the generated config; keys should match plotted series. The wrapper does not merge missing entries.
   */
  config?: ChartConfig;
  /**
   * Requested chart height/minimum height. See the owning component: only SimpleBarChart applies inline style; other wrappers build a dynamic min-height utility class.
   */
  height?: number | string;
}

/**
 * Renders numeric series in one shared stacked-bar group.
 * @param props - Loaded chart data, series/axis keys and card/presentation settings; see StackedBarChartProps. Wrapper defaults: height='300px'.
 * @returns The rendered StackedBarChart composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Import Appkit CSS and install the optional recharts peer. The wrapper supplies ChartContainer context; no external query or chart provider is required. The host supplies already-loaded numeric data and a container with measurable dimensions. config replaces the generated series config rather than merging it. Series configuration emits --color-KEY variables; provide valid CSS colors when overriding defaults. This component does not fetch, aggregate or persist data. height defaults to 300px. All bars share stack ID a; values are not normalized into percentages by this wrapper. height is interpolated into a dynamic min-h-[VALUE] utility class, not an inline pixel height; matching CSS must exist in the host build for that minimum height to take effect.
 * @example
 * ```tsx
 * import { StackedBarChart } from '@alneas/appkit-react/tools/chart';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<StackedBarChart title="Monthly sales" data={[{ month: "January", sales: 100, x: 1, size: 60, fill: "#2563eb" }, { month: "February", sales: 150, x: 2, size: 90, fill: "#7c3aed" }]} barKeys={["sales"]} xAxisKey="month" config={{ sales: { label: "Sales", color: "#2563eb" } }} />);
 * }
 * ```
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
