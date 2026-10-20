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
 * Input data, keys and presentation options for the chart wrapper.
 * @see SimplePieChart
 */
interface SimplePieChartProps {
  /**
   * Already-loaded records in plot order; required numeric values and category keys must be present.
   */
  data: Array<Record<string, unknown>>;
  /**
   * Record key containing the numeric metric.
   */
  dataKey: string;
  /**
   * Record key used for slice labels; see the specific chart for any differing series-name behavior.
   */
  nameKey: string;
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
}

/**
 * Renders a donut chart with a fixed inner radius and legend.
 * @param props - Loaded chart data, series/axis keys and card/presentation settings; see SimplePieChartProps.
 * @returns The rendered SimplePieChart composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Import Appkit CSS and install the optional recharts peer. The wrapper supplies ChartContainer context; no external query or chart provider is required. The host supplies already-loaded numeric data and a container with measurable dimensions. config replaces the generated series config rather than merging it. Series configuration emits --color-KEY variables; provide valid CSS colors when overriding defaults. This component does not fetch, aggregate or persist data. The donut uses innerRadius=60 and strokeWidth=5 in Recharts units. The plot is aspect-square with max-height 250px; there is no height prop. Per-slice colors should be supplied as row fill values; the default series config does not assign each slice a distinct fill.
 * @example
 * ```tsx
 * import { SimplePieChart } from '@alneas/appkit-react/tools/chart';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<SimplePieChart title="Monthly sales" data={[{ month: "January", sales: 100, x: 1, size: 60, fill: "#2563eb" }, { month: "February", sales: 150, x: 2, size: 90, fill: "#7c3aed" }]} dataKey="sales" nameKey="month" config={{ sales: { label: "Sales", color: "#2563eb" } }} />);
 * }
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
