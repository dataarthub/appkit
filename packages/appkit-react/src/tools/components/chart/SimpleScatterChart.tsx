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

/**
 * Input data, keys and presentation options for the chart wrapper.
 * @see SimpleScatterChart
 */
interface SimpleScatterChartProps {
  /**
   * Already-loaded records in plot order; required numeric values and category keys must be present.
   */
  data: Array<Record<string, unknown>>;
  /**
   * Record key used for the horizontal axis; category charts format ticks to the first five characters.
   */
  xAxisKey: string;
  /**
   * Record key containing numeric vertical-axis values.
   */
  yAxisKey: string;
  /**
   * Optional numeric record key controlling scatter bubble size; omitted uses ordinary scatter points.
   */
  zAxisKey?: string; // Optional for bubble size
  /**
   * Constant Scatter series name (fallback title); this is not a per-row key lookup.
   */
  nameKey?: string; // For tooltip label
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
 * Renders numeric X/Y observations with optional Z-driven bubble sizes.
 * @param props - Loaded chart data, series/axis keys and card/presentation settings; see SimpleScatterChartProps. Wrapper defaults: height='300px'.
 * @returns The rendered SimpleScatterChart composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Import Appkit CSS and install the optional recharts peer. The wrapper supplies ChartContainer context; no external query or chart provider is required. The host supplies already-loaded numeric data and a container with measurable dimensions. config replaces the generated series config rather than merging it. Series configuration emits --color-KEY variables; provide valid CSS colors when overriding defaults. This component does not fetch, aggregate or persist data. height defaults to 300px. nameKey supplies the constant Scatter series name (fallback title), rather than selecting a per-row tooltip label. Z bubbles use range [60, 400]. height is interpolated into a dynamic min-h-[VALUE] utility class, not an inline pixel height; matching CSS must exist in the host build for that minimum height to take effect.
 * @example
 * ```tsx
 * import { SimpleScatterChart } from '@alneas/appkit-react/tools/chart';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<SimpleScatterChart title="Monthly sales" data={[{ month: "January", sales: 100, x: 1, size: 60, fill: "#2563eb" }, { month: "February", sales: 150, x: 2, size: 90, fill: "#7c3aed" }]} xAxisKey="x" yAxisKey="sales" zAxisKey="size" config={{ sales: { label: "Sales", color: "#2563eb" } }} />);
 * }
 * ```
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
