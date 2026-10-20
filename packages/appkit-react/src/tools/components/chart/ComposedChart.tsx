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

/**
 * One numeric series and its rendering/stacking choice.
 * @see ComposedChart
 */
export interface ComposedChartSeries {
  /**
   * Record key and CSS color-variable suffix for this series.
   */
  key: string;
  /**
   * Rendering primitive for the series: bar, line or area.
   */
  type: 'bar' | 'line' | 'area';
  /**
   * Optional literal CSS color used only when generating the default config; a supplied config replaces that generation.
   */
  color?: string;
  /**
   * Optional shared stack identifier for bar/area series; line series ignore it.
   */
  stackId?: string;
}

/**
 * Input data, keys and presentation options for the chart wrapper.
 * @see ComposedChart
 */
interface ComposedChartProps {
  /**
   * Already-loaded records in plot order; required numeric values and category keys must be present.
   */
  data: Array<Record<string, unknown>>;
  /**
   * Record key used for the horizontal axis; category charts format ticks to the first five characters.
   */
  xAxisKey: string;
  /**
   * Series definitions in render order; each key identifies a numeric record property.
   */
  series: ComposedChartSeries[];
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
 * Renders caller-selected bar, line and area series in one chart.
 * @param props - Loaded chart data, series/axis keys and card/presentation settings; see ComposedChartProps. Wrapper defaults: height='300px'.
 * @returns The rendered ComposedChart composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Import Appkit CSS and install the optional recharts peer. The wrapper supplies ChartContainer context; no external query or chart provider is required. The host supplies already-loaded numeric data and a container with measurable dimensions. config replaces the generated series config rather than merging it. Series configuration emits --color-KEY variables; provide valid CSS colors when overriding defaults. This component does not fetch, aggregate or persist data. height defaults to 300px. Bar/area series forward stackId; lines do not. Line interpolation is monotone; area interpolation is natural. height is interpolated into a dynamic min-h-[VALUE] utility class, not an inline pixel height; matching CSS must exist in the host build for that minimum height to take effect.
 * @example
 * ```tsx
 * import { ComposedChart } from '@alneas/appkit-react/tools/chart';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ComposedChart title="Monthly sales" data={[{ month: "January", sales: 100, x: 1, size: 60, fill: "#2563eb" }, { month: "February", sales: 150, x: 2, size: 90, fill: "#7c3aed" }]} series={[{ key: "sales", type: "bar" }]} xAxisKey="month" config={{ sales: { label: "Sales", color: "#2563eb" } }} />);
 * }
 * ```
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
