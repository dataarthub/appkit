import React, { useState } from 'react';

import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface QRCodeScannerProps {
  onScan: (text: string) => Promise<void> | void;
  title?: string;
  successMessage?: string;
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
 * デバイスのカメラを使用してQRコードを読み取り、スキャンイベントをハンドリングする汎用QRコードスキャナーコンポーネント。
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
