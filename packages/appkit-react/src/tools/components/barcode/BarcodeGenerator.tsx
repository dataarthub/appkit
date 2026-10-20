import React, { useEffect, useRef } from 'react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';

/**
 * Host inputs and presentation settings for BarcodeGenerator.
 * @see BarcodeGenerator
 */
interface BarcodeGeneratorProps {
  /**
   * Text passed unchanged to the encoder; format/value validity is determined by the optional encoding library.
   */
  value: string;
  /**
   * jsbarcode format name; defaults to CODE128. Supply values valid for that format; errors are logged, not returned.
   */
  format?: string;
  /**
   * Card heading.
   * @defaultValue Barcode
   */
  title?: string;
  /**
   * Optional supporting card text; omitted means no description.
   */
  description?: string;
  /**
   * Width of each barcode bar in jsbarcode pixel units; defaults to 2.
   */
  width?: number;
  /**
   * Barcode height in jsbarcode pixel units; defaults to 100.
   */
  height?: number;
  /**
   * Displays encoded text below the bars; defaults to true.
   */
  displayValue?: boolean;
}

/**
 * Draws a barcode onto a canvas after loading jsbarcode in the client effect.
 * @param props - Encoded value, barcode format and card/drawing settings; see BarcodeGeneratorProps. Wrapper defaults: format='CODE128', title='Barcode', width=2, height=100, displayValue=true.
 * @returns The rendered BarcodeGenerator composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Import Appkit CSS and install the optional jsbarcode peer. Rendering requires a browser canvas; server rendering produces the card/canvas without drawing. Supported format/value constraints come from jsbarcode and are not validated here. Drawing/import failures are caught and logged, with no error UI or completion callback. No cleanup cancels an in-flight dynamic import.
 * @example
 * ```tsx
 * import { BarcodeGenerator } from '@alneas/appkit-react/tools/barcode';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<BarcodeGenerator value="APPKIT-001" format="CODE128" title="Document barcode" />);
 * }
 * ```
 */
export const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({
  value,
  format = 'CODE128',
  title = 'Barcode',
  description,
  width = 2,
  height = 100,
  displayValue = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generate = async () => {
      if (canvasRef.current) {
        try {
          const { default: JsBarcode } = await import('jsbarcode');
          JsBarcode(canvasRef.current, value, {
            format: format,
            width: width,
            height: height,
            displayValue: displayValue,
          });
        } catch (e) {
          console.error('Barcode generation failed', e);
        }
      }
    };
    generate();
  }, [value, format, width, height, displayValue]);

  return (
    <Card className='w-fit mx-auto text-center min-w-[300px]'>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className='flex justify-center p-6 rounded-b-lg'>
        <div className='bg-white p-4 rounded-lg'>
          <canvas ref={canvasRef} />
        </div>
      </CardContent>
    </Card>
  );
};
