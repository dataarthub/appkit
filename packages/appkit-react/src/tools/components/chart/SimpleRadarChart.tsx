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

/**
 * Input data, keys and presentation options for the chart wrapper.
 * @see SimpleRadarChart
 */
interface SimpleRadarChartProps {
  /**
   * Already-loaded records in plot order; required numeric values and category keys must be present.
   */
  data: Array<Record<string, unknown>>;
  /**
   * Record key containing the numeric metric.
   */
  dataKey: string; // The metric value
  /**
   * Record key for radar category/spoke labels.
   */
  angleKey: string; // The category/axis label
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
 * Renders a numeric metric across category spokes in a radar chart.
 * @param props - Loaded chart data, series/axis keys and card/presentation settings; see SimpleRadarChartProps. Wrapper defaults: height='300px'.
 * @returns The rendered SimpleRadarChart composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Import Appkit CSS and install the optional recharts peer. The wrapper supplies ChartContainer context; no external query or chart provider is required. The host supplies already-loaded numeric data and a container with measurable dimensions. config replaces the generated series config rather than merging it. Series configuration emits --color-KEY variables; provide valid CSS colors when overriding defaults. This component does not fetch, aggregate or persist data. height defaults to 300px. The metric uses --color-dataKey with 0.6 fill opacity and visible points. height is interpolated into a dynamic min-h-[VALUE] utility class, not an inline pixel height; matching CSS must exist in the host build for that minimum height to take effect.
 * @example
 * ```tsx
 * import { SimpleRadarChart } from '@alneas/appkit-react/tools/chart';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<SimpleRadarChart title="Monthly sales" data={[{ month: "January", sales: 100, x: 1, size: 60, fill: "#2563eb" }, { month: "February", sales: 150, x: 2, size: 90, fill: "#7c3aed" }]} dataKey="sales" angleKey="month" config={{ sales: { label: "Sales", color: "#2563eb" } }} />);
 * }
 * ```
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
