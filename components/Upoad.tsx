import { CheckCircle2, ImageIcon, UploadIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router";
import {
  PROGRESS_INTERVAL_MS,
  PROGRESS_STEP,
  REDIRECT_DELAY_MS,
} from "../lib/constants";

type Props = {
  onComplete?: (base64: string) => void;
};

const Upoad = ({ onComplete }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  const { isSignedIn } = useOutletContext<AuthContext>();

  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const base64Ref = useRef<string | null>(null);
  const completedRef = useRef(false);

  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const scheduleComplete = () => {
    if (timeoutRef.current || !onComplete || !base64Ref.current) return;
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      if (onComplete && base64Ref.current) onComplete(base64Ref.current);
    }, REDIRECT_DELAY_MS) as unknown as number;
  };

  const startProgress = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    completedRef.current = false;

    intervalRef.current = window.setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(100, prev + PROGRESS_STEP);

        if (next >= 100 && intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
          completedRef.current = true;
          scheduleComplete();
        }

        return next;
      });
    }, PROGRESS_INTERVAL_MS) as unknown as number;
  };

  const processFile = (f: File) => {
    if (!isSignedIn) return;

    setFile(f);
    setProgress(0);
    base64Ref.current = null;

    const reader = new FileReader();
    reader.onerror = () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      completedRef.current = false;

      setFile(null);
      setProgress(0);
      base64Ref.current = null;
    };

    reader.onload = () => {
      const result = reader.result as string | null;
      if (result) base64Ref.current = result;
      if (completedRef.current) {
        scheduleComplete();
      }
    };

    reader.readAsDataURL(f);
    startProgress();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isSignedIn) return;
    const dropped = e.dataTransfer?.files[0];

    if (dropped && ALLOWED_IMAGE_TYPES.includes(dropped.type))
      processFile(dropped);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isSignedIn) return;
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isSignedIn) return;
    const selected = e.target.files?.[0];

    if (selected && ALLOWED_IMAGE_TYPES.includes(selected.type)) {
      processFile(selected);
    } else {
      e.target.value = "";
    }
  };

  return (
    <div className="upload">
      {!file ? (
        <div
          role="button"
          tabIndex={0}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`dropzone ${isDragging ? "is-dragging" : ""}`}
        >
          <input
            type="file"
            className="drop-input"
            accept=".jpeg,.jpg,.png"
            disabled={!isSignedIn}
            onChange={handleInputChange}
          />

          <div className="drop-content">
            <div className="drop-icon">
              <UploadIcon size={20} />
            </div>

            <p>
              {isSignedIn
                ? "Click to upload or just drag and drop"
                : "Sign in or sign up with Puter to upload"}
            </p>
            <p className="help">Maximum file size is 50MB</p>
          </div>
        </div>
      ) : (
        <div className="upload-status">
          <div className="status-content">
            <div className="status-icon">
              {progress === 100 ? (
                <CheckCircle2 className="check" />
              ) : (
                <ImageIcon className="image" />
              )}
            </div>

            <h3>{file.name}</h3>

            <div className="progress">
              <div className="bar" style={{ width: `${progress}%` }} />

              <p className="status-text">
                {progress < 100 ? "Analyzing Floor Plan..." : "Redirecting..."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Upoad;
