'use client';

import * as React from 'react';
import * as RechartsPrimitive from 'recharts';

import { cn } from '../../lib/utils';

// Format: { group: { theme: { light: "...", dark: "..." }, label: "..." } }
export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
    theme?: Record<'light' | 'dark', string>;
  } & (
    | { color?: never; theme: Record<'light' | 'dark', string> }
    | { color: string; theme?: never }
  );
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />');
  }

  return context;
}

function ChartContainer({
  ref,
  id,
  className,
  children,
  config,
  ...props
}: React.PropsWithoutRef<
  React.HTMLAttributes<HTMLDivElement> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
  }
> &
  React.RefAttributes<HTMLDivElement>) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}
ChartContainer.displayName = 'Chart';

// Hex escapes work in both quoted CSS strings and identifiers (keys have a
// --color- prefix). Preserve the original value instead of changing its identity.
// Escaping '<' also prevents closing the raw-text <style> element during SSR.
const escapeCssToken = (value: string) => Array.from(value, char =>
  /[a-zA-Z0-9_-]/.test(char) ? char : `\\${char.codePointAt(0)!.toString(16)} `,
).join('');

// Reject declaration/HTML breakouts rather than rewriting a possibly valid color.
// In particular '/' is required by modern rgb/hsl/oklch alpha syntax.
const safeCssColor = (value: string) =>
  /[<>{};\\"'\p{Cc}]|\/\*|\*\//u.test(value) ? '' : value.trim();

/**
 * チャートの設定（テーマごとの配色等）に基づいて動的にCSS変数を適用するためのスタイルコンポーネント。
 */
const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([_, config]) => config.theme || config.color);

  if (!colorConfig.length) {
    return null;
  }

  const safeId = escapeCssToken(id);

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
        [data-chart="${safeId}"] {
          ${colorConfig
            .map(([key, item]) => {
              const color = item.theme?.[item.theme.dark ? 'dark' : 'light'] || item.color;
              const safeKey = escapeCssToken(key);
              const safeColor = color ? safeCssColor(String(color)) : '';
              return safeKey && safeColor ? `--color-${safeKey}: ${safeColor};` : '';
            })
            .filter(Boolean)
            .join('\n')}
        }
      `,
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

type TooltipPayloadItem = {
  dataKey?: string | number;
  name?: string;
  value?: number | string;
  color?: string;
  payload?: { fill?: string } & Record<string, unknown>;
};

type ChartTooltipContentProps = React.ComponentProps<'div'> & {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: 'line' | 'dot' | 'dashed';
  nameKey?: string;
  labelKey?: string;
  label?: React.ReactNode;
  labelClassName?: string;
  labelFormatter?: (value: React.ReactNode, payload: TooltipPayloadItem[]) => React.ReactNode;
  formatter?: (
    value: number | string,
    name: string,
    item: TooltipPayloadItem,
    index: number,
    payload?: TooltipPayloadItem['payload'],
  ) => React.ReactNode;
  color?: string;
};

function ChartTooltipContent({
  ref,
  active,
  payload,
  className,
  indicator = 'dot',
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.PropsWithoutRef<ChartTooltipContentProps> & React.RefAttributes<HTMLDivElement>) {
  const { config } = useChart();

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null;
    }

    const [item] = payload;
    const key = `${labelKey || item.dataKey || item.name || 'value'}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value =
      !labelKey && typeof label === 'string'
        ? config[label as keyof typeof config]?.label || label
        : itemConfig?.label;

    if (labelFormatter) {
      return (
        <div className={cn('font-medium', labelClassName)}>{labelFormatter(value, payload)}</div>
      );
    }

    if (!value) {
      return null;
    }

    return <div className={cn('font-medium', labelClassName)}>{value}</div>;
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

  if (!active || !payload?.length) {
    return null;
  }

  const nestLabel = payload.length === 1 && indicator !== 'dot';
  const tooltipPayload = payload ?? [];

  return (
    <div
      ref={ref}
      className={cn(
        'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
        className,
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className='grid gap-1.5'>
        {tooltipPayload.map((item, index: number) => {
          const key = `${nameKey || item.name || item.dataKey || 'value'}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          const indicatorColor = color || item.payload?.fill || item.color;

          return (
            <div
              key={item.dataKey}
              className={cn(
                'flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground',
                indicator === 'dot' && 'items-center',
              )}
            >
              {formatter && item?.value !== undefined && item.name ? (
                formatter(item.value, item.name, item, index, item.payload)
              ) : (
                <>
                  {itemConfig?.icon ? (
                    <itemConfig.icon />
                  ) : (
                    !hideIndicator && (
                      <div
                        className={cn(
                          'shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]',
                          {
                            'h-2.5 w-2.5': indicator === 'dot',
                            'w-1': indicator === 'line',
                            'w-0 border-[1.5px] border-dashed bg-transparent':
                              indicator === 'dashed',
                            'my-0.5': nestLabel && indicator === 'dashed',
                          },
                        )}
                        style={
                          {
                            '--color-bg': indicatorColor,
                            '--color-border': indicatorColor,
                          } as React.CSSProperties
                        }
                      />
                    )
                  )}
                  <div
                    className={cn(
                      'flex flex-1 justify-between leading-none',
                      nestLabel ? 'items-end' : 'items-center',
                    )}
                  >
                    <div className='grid gap-1.5'>
                      {nestLabel ? tooltipLabel : null}
                      <span className='text-muted-foreground'>
                        {itemConfig?.label || item.name}
                      </span>
                    </div>
                    {item.value && (
                      <span className='font-mono font-medium tabular-nums text-foreground'>
                        {item.value.toLocaleString()}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
ChartTooltipContent.displayName = 'ChartTooltip';

const ChartLegend = RechartsPrimitive.Legend;
function ChartLegendContent({
  ref,
  className,
  hideIcon = false,
  payload,
  verticalAlign = 'bottom',
  nameKey,
}: React.PropsWithoutRef<
  React.ComponentProps<'div'> &
    Pick<RechartsPrimitive.LegendProps, 'verticalAlign'> & {
      hideIcon?: boolean;
      nameKey?: string;
      payload?: unknown[];
    }
> &
  React.RefAttributes<HTMLDivElement>) {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }
  const legendPayload = payload as Array<{
    dataKey?: string | number;
    value?: string | number;
    color?: string;
  }>;

  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-center gap-4',
        verticalAlign === 'top' ? 'pb-3' : 'pt-3',
        className,
      )}
    >
      {legendPayload.map((item) => {
        const key = `${nameKey || item.dataKey || 'value'}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);

        return (
          <div
            key={item.value}
            className={cn(
              'flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground',
            )}
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className='h-2 w-2 shrink-0 rounded-[2px]'
                style={{
                  backgroundColor: item.color,
                }}
              />
            )}
            {itemConfig?.label}
          </div>
        );
      })}
    </div>
  );
}
ChartLegendContent.displayName = 'ChartLegend';

// Helper to extract config from payload
function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== 'object' || payload === null) {
    return undefined;
  }

  const payloadPayload =
    'payload' in payload && typeof payload.payload === 'object' && payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (key in payload && typeof payload[key as keyof typeof payload] === 'string') {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === 'string'
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
  }

  return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config];
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
};
