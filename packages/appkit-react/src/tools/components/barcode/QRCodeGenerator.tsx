import React from 'react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';

/**
 * QRコード生成器のプロップス
 */
interface QRCodeGeneratorProps {
  /** エンコードする値（URL、テキスト等） */
  value: string;
  /** カードのタイトル */
  title?: string;
  /** カードの説明 */
  description?: string;
}

/**
 * QRコード生成コンポーネント
 *
 * URLやテキストからQRコードを生成して表示します。
 *
 * @example
 * ```tsx
 * import { QRCodeGenerator } from '@alneas/appkit-react/tools/barcode';
 *
 * <QRCodeGenerator
 *   value="https://example.com"
 *   title="サイトにアクセス"
 *   description="スキャンしてサイトを開く"
 * />
 * ```
 */
export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  value,
  title = 'Scan to Check In',
  description,
}) => {
  const [QRCodeComponent, setQRCodeComponent] = React.useState<React.ComponentType<{
    value: string;
    size?: number;
    style?: React.CSSProperties;
    viewBox?: string;
  }> | null>(null);

  React.useEffect(() => {
    import('react-qr-code').then((m) => setQRCodeComponent(() => m.default));
  }, []);

  return (
    <Card className='w-[300px] mx-auto text-center'>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className='flex justify-center p-6 rounded-b-lg'>
        <div className='bg-white p-4 rounded-lg flex items-center justify-center min-h-[200px]'>
          {QRCodeComponent ? (
            <QRCodeComponent
              value={value}
              size={200}
              style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
              viewBox={`0 0 256 256`}
            />
          ) : (
            <div className='text-muted-foreground italic'>Loading QR...</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
