import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useWebcam } from '@/hooks/useWebcam';
import { studentsAPI, facesAPI } from '@/services/api';
import {
  Camera, Video, VideoOff, Upload, CheckCircle2,
  AlertCircle, XCircle, Zap, User
} from 'lucide-react';

const TOTAL_IMAGES = 20;

export default function FaceRegistration() {
  const { videoRef, canvasRef, isActive, error: camError, startCamera, stopCamera, captureFrame } = useWebcam();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [capturedImages, setCapturedImages] = useState([]);
  const [capturing, setCapturing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [training, setTraining] = useState(false);
  const [message, setMessage] = useState(null);
  const [trainMessage, setTrainMessage] = useState(null);

  useEffect(() => {
    fetchStudents();
    return () => stopCamera();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStudents = async () => {
    try {
      const response = await studentsAPI.list();
      setStudents(response.data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const handleCapture = async () => {
    if (!selectedStudent) {
      setMessage({ type: 'error', text: 'Please select a student first.' });
      return;
    }

    if (!isActive) {
      await startCamera();
      return;
    }

    setCapturing(true);
    setMessage(null);
    const images = [];

    for (let i = 0; i < TOTAL_IMAGES; i++) {
      const frame = captureFrame();
      if (frame) {
        images.push(frame);
        setCapturedImages([...images]);
      }
      // Small delay between captures for variation
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setCapturedImages(images);
    setCapturing(false);

    if (images.length > 0) {
      await uploadImages(images);
    }
  };

  const uploadImages = async (images) => {
    setUploading(true);
    setMessage(null);

    try {
      const response = await facesAPI.register({
        student_id: selectedStudent,
        images: images,
      });

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: response.data.message,
        });
      } else {
        setMessage({
          type: 'error',
          text: response.data.message,
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to register face images.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleTrain = async () => {
    setTraining(true);
    setTrainMessage(null);

    try {
      const response = await facesAPI.train();

      if (response.data.success) {
        setTrainMessage({
          type: 'success',
          text: response.data.message,
        });
      } else {
        setTrainMessage({
          type: 'error',
          text: response.data.message,
        });
      }
    } catch (error) {
      setTrainMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Training failed.',
      });
    } finally {
      setTraining(false);
    }
  };

  const progress = (capturedImages.length / TOTAL_IMAGES) * 100;

  const selectedStudentInfo = students.find(s => s.student_id === selectedStudent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Face Registration</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Capture and register facial data for students
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Student Selection & Controls */}
        <div className="space-y-4">
          {/* Student Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Select Student
              </CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={selectedStudent}
                onChange={(e) => {
                  setSelectedStudent(e.target.value);
                  setCapturedImages([]);
                  setMessage(null);
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Choose a student...</option>
                {students.map((student) => (
                  <option key={student.student_id} value={student.student_id}>
                    {student.name} ({student.student_id})
                  </option>
                ))}
              </select>

              {selectedStudentInfo && (
                <div className="mt-3 p-3 rounded-lg bg-muted/50 space-y-1">
                  <p className="text-sm font-medium">{selectedStudentInfo.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedStudentInfo.department} • Sem {selectedStudentInfo.semester}
                  </p>
                  <div className="pt-1">
                    {selectedStudentInfo.has_face_data ? (
                      <Badge variant="success" className="text-xs gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Face Data Exists
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        No Face Data
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Capture Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                Capture Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                {!isActive ? (
                  <Button onClick={startCamera} className="flex-1 gap-2">
                    <Video className="w-4 h-4" />
                    Start Camera
                  </Button>
                ) : (
                  <Button onClick={stopCamera} variant="outline" className="flex-1 gap-2">
                    <VideoOff className="w-4 h-4" />
                    Stop Camera
                  </Button>
                )}
              </div>

              <Button
                onClick={handleCapture}
                disabled={!isActive || !selectedStudent || capturing || uploading}
                className="w-full gap-2"
                variant={capturing ? 'outline' : 'default'}
              >
                {capturing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Capturing... ({capturedImages.length}/{TOTAL_IMAGES})
                  </>
                ) : uploading ? (
                  <>
                    <Upload className="w-4 h-4 animate-bounce" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    Capture {TOTAL_IMAGES} Images
                  </>
                )}
              </Button>

              {/* Progress */}
              {(capturing || capturedImages.length > 0) && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{capturedImages.length} / {TOTAL_IMAGES}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Train Database */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Train Face Database
              </CardTitle>
              <CardDescription className="text-xs">
                Generate face encodings from all registered images
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleTrain}
                disabled={training}
                className="w-full gap-2"
                variant="default"
              >
                {training ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Training...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Train Face Database
                  </>
                )}
              </Button>

              {trainMessage && (
                <div className={`mt-3 p-3 rounded-lg text-sm flex items-start gap-2 ${
                  trainMessage.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-destructive/10 text-destructive'
                }`}>
                  {trainMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  {trainMessage.text}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Webcam Preview */}
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
                    <Camera className="w-16 h-16" />
                    <p className="text-sm">Camera is off</p>
                    <p className="text-xs">Select a student and start the camera to begin</p>
                  </div>
                )}

                {/* Overlay indicators */}
                {isActive && (
                  <>
                    {/* Face guide overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-60 border-2 border-dashed border-white/30 rounded-3xl" />
                    </div>

                    {/* Status badge */}
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-red-500 text-white border-0 gap-1.5 animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-white" />
                        LIVE
                      </Badge>
                    </div>

                    {capturing && (
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-primary text-white border-0">
                          {capturedImages.length}/{TOTAL_IMAGES}
                        </Badge>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Messages */}
              {(camError || message) && (
                <div className="p-4">
                  {camError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {camError}
                    </div>
                  )}
                  {message && (
                    <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                      message.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {message.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      {message.text}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
