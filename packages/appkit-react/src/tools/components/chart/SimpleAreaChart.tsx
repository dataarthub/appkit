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

/**
 * Input data, keys and presentation options for the chart wrapper.
 * @see SimpleAreaChart
 */
interface SimpleAreaChartProps {
  /**
   * Already-loaded records in plot order; required numeric values and category keys must be present.
   */
  data: Array<Record<string, unknown>>;
  /**
   * Record key used for the horizontal axis; category charts format ticks to the first five characters.
   */
  xAxisKey: string;
  /**
   * Record keys for numeric area series in declared order.
   */
  areaKeys: string[];
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
   * Stacks area series under shared ID a when true; defaults to false.
   */
  stacked?: boolean;
}

/**
 * Renders one or more numeric series as natural area curves with optional stacking.
 * @param props - Loaded chart data, series/axis keys and card/presentation settings; see SimpleAreaChartProps. Wrapper defaults: height='250px', stacked=false.
 * @returns The rendered SimpleAreaChart composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Import Appkit CSS and install the optional recharts peer. The wrapper supplies ChartContainer context; no external query or chart provider is required. The host supplies already-loaded numeric data and a container with measurable dimensions. config replaces the generated series config rather than merging it. Series configuration emits --color-KEY variables; provide valid CSS colors when overriding defaults. This component does not fetch, aggregate or persist data. height defaults to 250px and stacked to false. Stacking uses shared stack ID a. height is interpolated into a dynamic min-h-[VALUE] utility class, not an inline pixel height; matching CSS must exist in the host build for that minimum height to take effect.
 * @example
 * ```tsx
 * import { SimpleAreaChart } from '@alneas/appkit-react/tools/chart';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<SimpleAreaChart title="Monthly sales" data={[{ month: "January", sales: 100, x: 1, size: 60, fill: "#2563eb" }, { month: "February", sales: 150, x: 2, size: 90, fill: "#7c3aed" }]} areaKeys={["sales"]} xAxisKey="month" config={{ sales: { label: "Sales", color: "#2563eb" } }} />);
 * }
 * ```
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
