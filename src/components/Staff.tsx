import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";

type CursorStyle = {
  color: string;
  alpha: number;
};

type StaffProps = {
  scoreXml: string;
  cursorStyle: CursorStyle;
};

export type StaffHandle = {
  nextCursor: () => void;
  resetCursor: () => void;
};

const DEFAULT_ZOOM = 2;

const Staff = forwardRef<StaffHandle, StaffProps>(function Staff(
  { scoreXml, cursorStyle },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const cursorStyleRef = useRef<CursorStyle>(cursorStyle);

  const applyCursorStyle = useCallback((style?: CursorStyle) => {
    const cursor = osmdRef.current?.cursor;
    if (!cursor) return;
    const nextStyle = style ?? cursorStyleRef.current;
    cursor.CursorOptions = {
      ...cursor.CursorOptions,
      color: nextStyle.color,
      alpha: nextStyle.alpha,
    };
    cursor.show();
  }, []);

  const ensureOsmd = useCallback(() => {
    if (!containerRef.current) return null;
    if (!osmdRef.current) {
      osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, {
        drawTitle: false,
        drawPartNames: false,
        drawMeasureNumbers: false,
        autoResize: true,
        followCursor: true,
      });
    }
    return osmdRef.current;
  }, []);

  const renderScore = useCallback(async () => {
    const osmd = ensureOsmd();
    if (!osmd) return;

    await osmd.load(scoreXml);
    osmd.zoom = DEFAULT_ZOOM;
    osmd.render();

    applyCursorStyle();
    osmd.cursor?.reset();
  }, [applyCursorStyle, ensureOsmd, scoreXml]);

  useImperativeHandle(
    ref,
    () => ({
      nextCursor: () => {
        osmdRef.current?.cursor?.next();
      },
      resetCursor: () => {
        osmdRef.current?.cursor?.reset();
      },
    }),
    []
  );

  useEffect(() => {
    void renderScore();
  }, [renderScore]);

  useEffect(() => {
    cursorStyleRef.current = cursorStyle;
    applyCursorStyle(cursorStyle);
  }, [applyCursorStyle, cursorStyle]);

  return <div id="osmd" className="osmd" ref={containerRef}></div>;
});

export default Staff;
