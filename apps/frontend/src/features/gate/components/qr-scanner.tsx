import { useEffect, useRef } from 'react';
import {
  Html5QrcodeScanner,
  Html5QrcodeScanType,
  Html5QrcodeSupportedFormats,
} from 'html5-qrcode';
import { CameraOff } from 'lucide-react';

interface QrScannerProps {
  onScan: (id: string, sig: string) => void;
  enabled: boolean;
}

export function QrScanner({ onScan, enabled }: QrScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scanner = new Html5QrcodeScanner(
      'qr-scanner-container',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        rememberLastUsedCamera: true,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      },
      false,
    );

    scanner.render(
      (decodedText) => {
        if (!enabledRef.current) return;
        try {
          const parsed = JSON.parse(decodedText) as {
            v: number;
            id: string;
            sig: string;
          };
          if (parsed.id && parsed.sig) {
            onScan(parsed.id, parsed.sig);
          }
        } catch {
          // Invalid QR content, ignore
        }
      },
      () => {
        // Scan failure on each frame, ignore
      },
    );

    scannerRef.current = scanner;

    return () => {
      scannerRef.current?.clear().catch(() => {
        // Ignore cleanup errors
      });
      scannerRef.current = null;
    };
  }, [onScan]);

  useEffect(() => {
    if (!scannerRef.current) return;
    if (enabled) {
      scannerRef.current.resume();
    } else {
      scannerRef.current.pause(true);
    }
  }, [enabled]);

  return (
    <div className='relative w-full overflow-hidden bg-[#1A0A0F]'>
      <div id='qr-scanner-container' ref={containerRef} />
      <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'>
        <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-white/10'>
          <CameraOff className='size-6 text-white/70' />
        </div>
        <p className='text-center text-[14px] text-white/80'>
          Aponte para o QR code do ingresso
        </p>
      </div>
    </div>
  );
}
