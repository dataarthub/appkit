import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart';

/**
 * Input data, keys and presentation options for the chart wrapper.
 * @see SimpleBarChart
 */
interface SimpleBarChartProps {
  /**
   * Already-loaded records in plot order; required numeric values and category keys must be present.
   */
  data: Array<Record<string, unknown>>;
  /**
   * Record key used for the horizontal axis; category charts format ticks to the first five characters.
   */
  xAxisKey: string;
  /**
   * Record key containing the single numeric bar metric.
   */
  barKey: string;
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
  /**
   * Bar fill CSS color; defaults to var(--color-bar), independently of barKey.
   */
  barColor?: string;
}

/**
 * Renders one numeric series as a rounded bar chart.
 * @param props - Loaded chart data, series/axis keys and card/presentation settings; see SimpleBarChartProps. Wrapper defaults: height='200px', barColor='var(--color-bar)'.
 * @returns The rendered SimpleBarChart composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Import Appkit CSS and install the optional recharts peer. The wrapper supplies ChartContainer context; no external query or chart provider is required. The host supplies already-loaded numeric data and a container with measurable dimensions. config replaces the generated series config rather than merging it. Series configuration emits --color-KEY variables; provide valid CSS colors when overriding defaults. This component does not fetch, aggregate or persist data. height defaults to 200px and is applied as an inline style (numbers are React CSS pixel values). barColor defaults to var(--color-bar), which does not automatically match a differently named barKey; provide a matching variable or literal color.
 * @example
 * ```tsx
 * import { SimpleBarChart } from '@alneas/appkit-react/tools/chart';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<SimpleBarChart title="Monthly sales" data={[{ month: "January", sales: 100, x: 1, size: 60, fill: "#2563eb" }, { month: "February", sales: 150, x: 2, size: 90, fill: "#7c3aed" }]} barKey="sales" xAxisKey="month" barColor="var(--color-sales)" config={{ sales: { label: "Sales", color: "#2563eb" } }} />);
 * }
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
