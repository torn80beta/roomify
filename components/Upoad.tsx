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

  const inputRef = useRef<HTMLInputElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const base64Ref = useRef<string | null>(null);

  //
  const completedRef = useRef(false);
  //

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const startProgress = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);

    //
    completedRef.current = false;
    //

    intervalRef.current = window.setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(100, prev + PROGRESS_STEP);

        if (next === 100 && intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
          //
          completedRef.current = true;
          //

          // After reaching 100, wait REDIRECT_DELAY_MS then call onComplete
          timeoutRef.current = window.setTimeout(() => {
            if (onComplete && base64Ref.current) onComplete(base64Ref.current);
          }, REDIRECT_DELAY_MS) as unknown as number;
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
    reader.onload = () => {
      const result = reader.result as string | null;
      if (result) base64Ref.current = result;
      // If progress already reached 100, ensure we still call onComplete after delay
      // if (progress === 100 && onComplete && base64Ref.current) {
      if (completedRef.current && onComplete && base64Ref.current) {
        timeoutRef.current = window.setTimeout(() => {
          if (onComplete && base64Ref.current)
            onComplete(base64Ref.current as string);
        }, REDIRECT_DELAY_MS) as unknown as number;
      }
    };

    reader.readAsDataURL(f);
    startProgress();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isSignedIn) return;
    const dropped = e.dataTransfer?.files;
    if (dropped && dropped.length > 0) processFile(dropped[0]);
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
    if (selected) processFile(selected);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isSignedIn) return;
    const target = e.target as HTMLElement | null;
    // If the native click originated from the input itself, don't trigger
    // a programmatic click to avoid opening the file dialog twice.
    if (target && target.tagName === "INPUT") return;
    inputRef.current?.click();
  };

  return (
    <div className="upload">
      {!file ? (
        <div
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`dropzone ${isDragging ? "is-dragging" : ""}`}
        >
          <input
            ref={inputRef}
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
