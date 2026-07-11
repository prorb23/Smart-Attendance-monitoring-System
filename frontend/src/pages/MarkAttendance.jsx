import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWebcam } from '@/hooks/useWebcam';
import { attendanceAPI } from '@/services/api';
import {
  ScanFace, Video, VideoOff, Camera,
  CheckCircle2, XCircle, AlertCircle, UserCheck, Clock
} from 'lucide-react';

/**
 * Synthesises a short two-tone success chime using the Web Audio API.
 * Returns a play() function — no audio files required.
 */
function useSuccessSound() {
  return function play() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();

      const playTone = (freq, startTime, duration, gainValue = 0.35) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      playTone(880, now, 0.18);          // A5 — first note
      playTone(1174.66, now + 0.15, 0.28); // D6 — second note (higher, resolving)

      // Close the context after playback finishes
      setTimeout(() => ctx.close(), 700);
    } catch {
      // Silently ignore if audio is unavailable (e.g. SSR or restricted browser)
    }
  };
}

export default function MarkAttendance() {
  const { videoRef, canvasRef, isActive, error: camError, startCamera, stopCamera, captureFrame } = useWebcam();
  const [recognizing, setRecognizing] = useState(false);
  const [autoDetect, setAutoDetect] = useState(false);
  const [result, setResult] = useState(null);
  const [sessionLog, setSessionLog] = useState([]);
  const intervalRef = useRef(null);
  const handleRecognizeRef = useRef(null);
  const playSuccessSound = useSuccessSound();

  useEffect(() => {
    return () => {
      stopCamera();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoDetect && isActive) {
      intervalRef.current = setInterval(() => {
        handleRecognizeRef.current?.();
      }, 3000);
    } else {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => clearInterval(intervalRef.current);
  }, [autoDetect, isActive]);

  const handleRecognize = async () => {
    if (recognizing || !isActive) return;

    const frame = captureFrame();
    if (!frame) return;

    setRecognizing(true);

    try {
      const response = await attendanceAPI.mark({ image: frame });
      const data = response.data;

      setResult(data);

      if (data.success) {
        playSuccessSound();
        setSessionLog(prev => [{
          student_name: data.student_name,
          student_id: data.student_id,
          confidence: data.confidence,
          timestamp: data.timestamp,
          status: 'success',
        }, ...prev]);
      } else if (data.already_marked) {
        setResult(data);
      }
    } catch (error) {
      setResult({
        success: false,
        message: error.response?.data?.detail || 'Recognition failed',
      });
    } finally {
      setRecognizing(false);
    }
  };

  // Keep the ref current so the auto-detect interval always calls the latest version
  handleRecognizeRef.current = handleRecognize;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mark Attendance</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Use facial recognition to mark student attendance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Webcam Feed */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative bg-black aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ display: isActive ? 'block' : 'none', transform: 'scaleX(-1)' }}
                />
                <canvas ref={canvasRef} className="hidden" />

                {!isActive && (
                  <div className="flex flex-col items-center gap-3 text-white/40">
                    <ScanFace className="w-16 h-16" />
                    <p className="text-sm">Start camera to begin attendance</p>
                  </div>
                )}

                {/* Scanning overlay */}
                {isActive && recognizing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-48 h-48 border-4 border-primary rounded-2xl animate-pulse" />
                  </div>
                )}

                {/* Status indicators */}
                {isActive && (
                  <>
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-red-500 text-white border-0 gap-1.5 animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-white" />
                        LIVE
                      </Badge>
                    </div>

                    {autoDetect && (
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-primary text-white border-0 gap-1.5">
                          <ScanFace className="w-3 h-3" />
                          Auto-Detect ON
                        </Badge>
                      </div>
                    )}
                  </>
                )}

                {/* Recognition result overlay */}
                {result && isActive && (
                  <div className={`absolute bottom-4 left-4 right-4 p-4 rounded-xl backdrop-blur-md animate-fade-in ${
                    result.success
                      ? 'bg-emerald-500/20 border border-emerald-500/30'
                      : result.already_marked
                        ? 'bg-amber-500/20 border border-amber-500/30'
                        : 'bg-red-500/20 border border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-3">
                      {result.success ? (
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                      ) : result.already_marked ? (
                        <AlertCircle className="w-8 h-8 text-amber-400 shrink-0" />
                      ) : (
                        <XCircle className="w-8 h-8 text-red-400 shrink-0" />
                      )}
                      <div>
                        <p className="font-semibold text-white text-sm">{result.message}</p>
                        {(result.student_name) && (
                          <p className="text-white/70 text-xs mt-0.5">
                            {result.student_name} • {result.student_id}
                            {result.confidence && ` • ${result.confidence}% confidence`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="p-4 flex flex-wrap gap-2">
                {!isActive ? (
                  <Button onClick={startCamera} className="gap-2">
                    <Video className="w-4 h-4" />
                    Start Camera
                  </Button>
                ) : (
                  <>
                    <Button onClick={stopCamera} variant="outline" className="gap-2">
                      <VideoOff className="w-4 h-4" />
                      Stop
                    </Button>
                    <Button
                      onClick={handleRecognize}
                      disabled={recognizing}
                      className="gap-2"
                    >
                      {recognizing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Recognizing...
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          Capture & Recognize
                        </>
                      )}
                    </Button>
                    <Button
                      variant={autoDetect ? 'default' : 'outline'}
                      onClick={() => setAutoDetect(!autoDetect)}
                      className="gap-2"
                    >
                      <ScanFace className="w-4 h-4" />
                      {autoDetect ? 'Stop Auto-Detect' : 'Auto-Detect'}
                    </Button>
                  </>
                )}
              </div>

              {camError && (
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {camError}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Session Log */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" />
                Session Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessionLog.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {sessionLog.map((entry, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 animate-fade-in"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{entry.student_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.student_id} • {entry.confidence}%
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {entry.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ScanFace className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No attendance marked yet</p>
                  <p className="text-xs mt-1">Start the camera to begin</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
