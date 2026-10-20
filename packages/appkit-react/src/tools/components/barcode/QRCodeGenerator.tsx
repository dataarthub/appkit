import React from 'react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';

/**
 * Host inputs and presentation settings for QRCodeGenerator.
 * @see QRCodeGenerator
 */
interface QRCodeGeneratorProps {
  /**
   * Text passed unchanged to the encoder; format/value validity is determined by the optional encoding library.
   */
  value: string;
  /**
   * Card heading.
   * @defaultValue Scan to Check In
   */
  title?: string;
  /**
   * Optional supporting card text; omitted means no description.
   */
  description?: string;
}

/**
 * Loads react-qr-code on the client and renders a fixed-size QR code inside a card.
 * @param props - Encoded value and optional card heading/description; see QRCodeGeneratorProps. Wrapper defaults: title='Scan to Check In'.
 * @returns The rendered QRCodeGenerator composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Import Appkit CSS and install the optional react-qr-code peer. The client effect loads the QR component; SSR and initial render show Loading QR.... The inner QR size is 200 with a 256 viewBox and responsive styling. Dynamic-import rejection is not caught or displayed by this wrapper. There is no download/export API or callback.
 * @example
 * ```tsx
 * import { QRCodeGenerator } from '@alneas/appkit-react/tools/barcode';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<QRCodeGenerator value="https://example.com/document" title="Open document" />);
 * }
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
        {/* Keep the QR and loading label on the same scanner-friendly white surface. */}
        <div className='bg-white p-4 rounded-lg flex items-center justify-center min-h-[200px]'>
          {QRCodeComponent ? (
            <QRCodeComponent
              value={value}
              size={200}
              style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
              viewBox={`0 0 256 256`}
            />
          ) : (
            <div className='text-neutral-700 italic'>Loading QR...</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
