import React, { useState } from 'react';

import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Host inputs and presentation settings for QRCodeScanner.
 * @see QRCodeScanner
 */
interface QRCodeScannerProps {
  /**
   * Called and awaited for the first decoded nonempty raw value; rejection is caught into the error alert. The host owns authorization and processing.
   * @param text - Host callback input described above.
   * @returns No value after host processing completes; reject or throw to show an error alert.
   */
  onScan: (text: string) => Promise<void> | void;
  /**
   * Card heading.
   * @defaultValue QR Scanner
   */
  title?: string;
  /**
   * Optional success text replacing Processed code: VALUE.
   */
  successMessage?: string;
  /**
   * Shows the success alert and Scan Next reset button; defaults to true. false removes that successful reset path.
   */
  showSuccess?: boolean;
}

interface ScanResult {
  rawValue: string;
}

interface ScannerComponentProps {
  onScan: (result: ScanResult[]) => void;
  onError: (error: unknown) => void;
  components?: {
    finder?: boolean;
  };
}

/**
 * Loads the camera scanner, processes the first decoded value and pauses until its local reset action.
 * @param props - Scan handler, card heading and success-display settings; see QRCodeScannerProps. Wrapper defaults: title='QR Scanner', showSuccess=true.
 * @returns The rendered QRCodeScanner composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Import Appkit CSS and install the optional @yudiel/react-qr-scanner peer. Camera access requires a supporting browser, secure context and permission; upstream owns camera setup/teardown. Only the first result is processed. The scanner unmounts after a result, and success content appears before onScan settles. onScan rejection is caught and displayed; camera errors are only logged and dynamic-import rejection is not caught. With showSuccess=false, successful scans offer no local reset button and remain paused; remount or use the error retry path. This component neither verifies identity nor persists decoded data.
 * @example
 * ```tsx
 * import { QRCodeScanner } from '@alneas/appkit-react/tools/barcode';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example({ handleCode }: { handleCode: (text: string) => Promise<void> }) {
 *   return (<QRCodeScanner onScan={handleCode} title="Scan document code" />);
 * }
 * ```
 */
export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
  onScan,
  title = 'QR Scanner',
  successMessage,
  showSuccess = true,
}) => {
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [ScannerComponent, setScannerComponent] =
    useState<React.ComponentType<ScannerComponentProps> | null>(null);

  React.useEffect(() => {
    import('@yudiel/react-qr-scanner').then((m) => setScannerComponent(() => m.Scanner));
  }, []);

  const handleScan = async (text: string) => {
    if (paused || !text) return;

    setPaused(true);
    setScannedResult(text);
    setError(null);

    try {
      await onScan(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed');
    }
  };

  const reset = () => {
    setScannedResult(null);
    setError(null);
    setPaused(false);
  };

  return (
    <Card className='max-w-md mx-auto'>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {!scannedResult && (
          <div className='aspect-square overflow-hidden rounded-lg border bg-black flex items-center justify-center'>
            {ScannerComponent ? (
              <ScannerComponent
                onScan={(result: ScanResult[]) => result[0] && handleScan(result[0].rawValue)}
                onError={(scanError: unknown) => console.error(scanError)}
                components={{ finder: true }}
              />
            ) : (
              <div className='text-white'>Loading scanner...</div>
            )}
          </div>
        )}

        {showSuccess && scannedResult && !error && (
          <Alert className='border-primary bg-primary/10 text-primary'>
            <CheckCircle2 className='h-4 w-4' />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              {successMessage ? (
                successMessage
              ) : (
                <>
                  Processed code: <span className='font-mono text-foreground'>{scannedResult}</span>
                </>
              )}
            </AlertDescription>
            <Button onClick={reset} className='mt-2' variant='outline' size='sm'>
              Scan Next
            </Button>
          </Alert>
        )}

        {error && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button onClick={reset} className='mt-2' variant='outline' size='sm'>
              Try Again
            </Button>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
