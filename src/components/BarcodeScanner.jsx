import { useEffect, useRef, useState } from 'react';
import { X, Camera } from 'lucide-react';

const SUPPORTED_FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
];

// Full-screen barcode scanner. Uses native BarcodeDetector if available,
// falls back to @zxing/browser dynamic import on Safari/iOS.
export const BarcodeScanner = ({ onDetect, onClose }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const readerRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);
  const doneRef = useRef(false);

  const [stage, setStage] = useState('prompt'); // prompt | starting | scanning | error
  const [errorMsg, setErrorMsg] = useState('');

  const stopAll = () => {
    doneRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch {}
      readerRef.current = null;
    }
  };

  useEffect(() => () => stopAll(), []);

  const handleDetected = (code) => {
    if (doneRef.current) return;
    doneRef.current = true;
    stopAll();
    onDetect(code);
  };

  const start = async () => {
    setStage('starting');
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (!videoRef.current) throw new Error('video element missing');
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStage('scanning');

      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: SUPPORTED_FORMATS });
        detectorRef.current = detector;
        const tick = async () => {
          if (doneRef.current || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length) {
              handleDetected(codes[0].rawValue);
              return;
            }
          } catch {}
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } else {
        const mod = await import('@zxing/browser');
        const reader = new mod.BrowserMultiFormatReader();
        readerRef.current = reader;
        await reader.decodeFromVideoElement(videoRef.current, (result, err) => {
          if (result && !doneRef.current) {
            handleDetected(result.getText());
          }
        });
      }
    } catch (err) {
      console.error('Scanner failed:', err);
      setErrorMsg(
        err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Enable it in browser settings.'
          : 'Camera unavailable. Try manual entry.'
      );
      setStage('error');
      stopAll();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-ink flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-gold/15 shrink-0">
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-gold">
          Scan barcode
        </div>
        <button
          onClick={() => {
            stopAll();
            onClose();
          }}
          className="w-10 h-10 flex items-center justify-center text-stone hover:text-bone active:scale-95"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {/* Video always rendered so ref is available when start() runs */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover ${
            stage === 'scanning' ? 'opacity-100' : 'opacity-0'
          }`}
          playsInline
          muted
        />

        {stage === 'prompt' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-6">
            <div className="w-14 h-14 border border-gold/50 flex items-center justify-center">
              <Camera size={22} className="text-gold" />
            </div>
            <div className="max-w-xs">
              <div className="font-display italic text-gold text-lg mb-2">Camera access</div>
              <p className="text-sm text-stone leading-relaxed">
                We&rsquo;ll open your camera to scan a UPC/EAN barcode. Nothing leaves your device
                except the barcode lookup to OpenFoodFacts.
              </p>
            </div>
            <button
              onClick={start}
              className="px-6 py-3 bg-gold text-ink font-mono text-[11px] uppercase tracking-[0.22em] hover:bg-gold/90 active:scale-[0.98] min-h-[44px]"
            >
              Start camera
            </button>
          </div>
        )}

        {stage === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-stone">
              Starting camera…
            </div>
          </div>
        )}

        {stage === 'scanning' && (
          <>
            {/* Reticle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-64 h-40">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-gold" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-gold" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-gold" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-gold" />
                <div className="absolute inset-x-4 top-1/2 h-px bg-gold/60" />
              </div>
            </div>
            <div className="absolute bottom-6 inset-x-0 text-center text-[10px] font-mono uppercase tracking-[0.22em] text-bone/70">
              Align barcode inside frame
            </div>
          </>
        )}

        {stage === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-4">
            <div className="text-sm text-vermillion max-w-xs">{errorMsg}</div>
            <button
              onClick={() => {
                stopAll();
                onClose();
              }}
              className="px-4 py-2 border border-bone/20 text-bone/80 font-mono text-[11px] uppercase tracking-[0.22em] min-h-[44px]"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
