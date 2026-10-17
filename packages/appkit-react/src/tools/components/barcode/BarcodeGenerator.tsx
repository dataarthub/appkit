import React, { useEffect, useRef } from 'react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';

/**
 * バーコード生成器のプロップス
 */
interface BarcodeGeneratorProps {
  /** エンコードする値 */
  value: string;
  /** バーコードフォーマット（CODE128, EAN13, UPC等） */
  format?: string;
  /** カードのタイトル */
  title?: string;
  /** カードの説明 */
  description?: string;
  /** バーの幅（ピクセル） */
  width?: number;
  /** バーコードの高さ */
  height?: number;
  /** 値を下部に表示するか */
  displayValue?: boolean;
}

/**
 * バーコード生成コンポーネント
 *
 * 商品コードなどのバーコードを生成して表示します。
 * CODE128、EAN13、UPC、CODE39などの形式に対応。
 *
 * @example
 * ```tsx
 * import { BarcodeGenerator } from '@alneas/appkit-react/tools/barcode';
 *
 * <BarcodeGenerator
 *   value="4901234567890"
 *   format="EAN13"
 *   title="商品バーコード"
 * />
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
