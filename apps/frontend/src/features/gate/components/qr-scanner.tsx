import { useEffect, useRef } from 'react';
import {
  Html5QrcodeScanner,
  Html5QrcodeScanType,
  Html5QrcodeSupportedFormats,
} from 'html5-qrcode';
import { ScanLine } from 'lucide-react';

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
        qrbox: { width: 200, height: 200 },
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
    <div className='relative w-full h-[420px] overflow-hidden bg-[#1A0A0F]'>
      <div id='qr-scanner-container' ref={containerRef} />
      <div className='pointer-events-none absolute inset-0 flex flex-col'>
        <ScanLine className='absolute left-0 top-0 size-12 text-white/67' />
        <div className='absolute left-1/2 top-[130px] -translate-x-1/2 w-[200px] h-[200px] rounded-xl border-2 border-white' />
        <div className='absolute bottom-[68px] left-0 w-full flex justify-center'>
          <p className='text-center text-[14px] text-white/80'>
            Aponte para o QR code do ingresso
          </p>
        </div>
      </div>
    </div>
  );
}
