import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";

interface StaffProps {
  scoreXml: string;
  cursorStyle: CursorStyle;
}

interface CursorStyle {
  color: string;
  alpha: number;
}

export interface StaffHandle {
  nextCursor(): void;
  resetCursor(): void;
}

const SCORE_ZOOM = 1.5;

const Staff = forwardRef<StaffHandle, StaffProps>(function Staff(
  { scoreXml, cursorStyle },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);

  const cursorStyleRef = useRef(cursorStyle);
  cursorStyleRef.current = cursorStyle;

  const applyCursorStyle = useCallback((style: CursorStyle) => {
    const cursor = osmdRef.current?.cursor;
    if (!cursor) return;
    cursor.CursorOptions = {
      ...cursor.CursorOptions,
      color: style.color,
      alpha: style.alpha,
    };
    cursor.show();
  }, []);

  const getScrollContainer = useCallback((): HTMLElement | null => {
    const root = containerRef.current;
    if (!root) return null;

    const practiceScore = root.closest(".practice-score");
    if (practiceScore instanceof HTMLElement) {
      return practiceScore;
    }

    return root.parentElement instanceof HTMLElement ? root.parentElement : null;
  }, []);

  const scrollCursorIntoView = useCallback(
    (behavior: ScrollBehavior) => {
      const scrollContainer = getScrollContainer();
      const cursorElement = osmdRef.current?.cursor?.cursorElement;
      if (!scrollContainer || !cursorElement) return;

      const containerRect = scrollContainer.getBoundingClientRect();
      const cursorRect = cursorElement.getBoundingClientRect();
      const currentLeft = scrollContainer.scrollLeft;

      const leftPadding = 72;
      const rightPadding = Math.max(120, Math.round(scrollContainer.clientWidth * 0.26));

      const cursorLeft = cursorRect.left - containerRect.left + currentLeft;
      const cursorRight = cursorRect.right - containerRect.left + currentLeft;

      const visibleLeft = currentLeft + leftPadding;
      const visibleRight = currentLeft + scrollContainer.clientWidth - rightPadding;

      let targetLeft = currentLeft;
      if (cursorLeft < visibleLeft) {
        targetLeft = Math.max(0, cursorLeft - leftPadding);
      } else if (cursorRight > visibleRight) {
        targetLeft = cursorRight - scrollContainer.clientWidth + rightPadding;
      }

      if (Math.abs(targetLeft - currentLeft) < 1) return;
      scrollContainer.scrollTo({ left: targetLeft, behavior });
    },
    [getScrollContainer],
  );

  const getOrCreateOsmd = useCallback((): OpenSheetMusicDisplay | null => {
    if (osmdRef.current) return osmdRef.current;
    if (!containerRef.current) return null;

    osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, {
      drawMetronomeMarks: false,
      drawTitle: false,
      drawPartNames: false,
      drawMeasureNumbers: false,
      followCursor: true,
      renderSingleHorizontalStaffline: true,
      spacingFactorSoftmax: 100,
      autoResize: true,
    });

    return osmdRef.current;
  }, []);

  useImperativeHandle(ref, () => ({
    nextCursor: () => {
      osmdRef.current?.cursor?.next();
      window.requestAnimationFrame(() => {
        scrollCursorIntoView("smooth");
      });
    },
    resetCursor: () => {
      osmdRef.current?.cursor?.reset();
      const scrollContainer = getScrollContainer();
      scrollContainer?.scrollTo({ left: 0, behavior: "auto" });
      window.requestAnimationFrame(() => {
        scrollCursorIntoView("auto");
      });
    },
  }), [getScrollContainer, scrollCursorIntoView]);

  useEffect(() => {
    const osmd = getOrCreateOsmd();
    if (!osmd) return;

    let cancelled = false;

    (async () => {
      await osmd.load(scoreXml);
      if (cancelled) return;

      osmd.zoom = SCORE_ZOOM;
      osmd.render();
      applyCursorStyle(cursorStyleRef.current);
      osmd.cursor?.reset();
      const scrollContainer = getScrollContainer();
      scrollContainer?.scrollTo({ left: 0, behavior: "auto" });
    })();

    return () => {
      cancelled = true;
    };
  }, [scoreXml, getOrCreateOsmd, applyCursorStyle, getScrollContainer]);

  useEffect(() => {
    applyCursorStyle(cursorStyle);
  }, [cursorStyle, applyCursorStyle]);

  return <div id="osmd" className="osmd" ref={containerRef} />;
});

export default Staff;
