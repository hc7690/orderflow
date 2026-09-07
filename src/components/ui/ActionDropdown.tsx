"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ActionDropdownProps {
  /** The trigger button element */
  trigger: ReactNode;
  /** Whether the dropdown is open */
  isOpen: boolean;
  /** Called when the dropdown needs to toggle */
  onToggle: () => void;
  /** Called when the dropdown should close */
  onClose: () => void;
  /** Dropdown content */
  children: ReactNode;
  /** Width of the dropdown (default: 9rem / w-36) */
  width?: number;
  /** Alignment: 'right' (default) or 'left' */
  align?: "right" | "left";
}

export default function ActionDropdown({
  trigger,
  isOpen,
  onToggle,
  onClose,
  children,
  width = 144,
  align = "right",
}: ActionDropdownProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; above: boolean }>({
    top: 0,
    left: 0,
    above: false,
  });

  // ─── Calculate position relative to viewport ──────────────
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const dropdownHeight = dropdownRef.current?.offsetHeight || 120;
    const gap = 4; // gap between trigger and dropdown

    // Vertical: check if there's enough space below
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    let above = false;
    let top: number;

    if (spaceBelow < dropdownHeight + gap && spaceAbove > spaceBelow) {
      // Open upward
      above = true;
      top = triggerRect.top - dropdownHeight - gap;
    } else {
      // Open downward
      top = triggerRect.bottom + gap;
    }

    // Prevent going above viewport
    if (top < 4) top = 4;

    // Horizontal: align right or left
    let left: number;
    if (align === "right") {
      left = triggerRect.right - width;
    } else {
      left = triggerRect.left;
    }

    // Prevent going off the right edge
    if (left + width > viewportWidth - 4) {
      left = viewportWidth - width - 4;
    }

    // Prevent going off the left edge
    if (left < 4) left = 4;

    setPosition({ top, left, above });
  }, [width, align]);

  // ─── Update position on open, scroll, and resize ─────────
  useEffect(() => {
    if (!isOpen) return;

    // Initial calculation (with a small delay to measure dropdown height)
    const raf = requestAnimationFrame(() => calculatePosition());

    const handleUpdate = () => calculatePosition();

    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [isOpen, calculatePosition]);

  // ─── Click outside to close ──────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // ─── Keyboard: Escape to close ───────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Trigger */}
      <div ref={triggerRef} className="inline-block">
        <div onClick={onToggle}>{trigger}</div>
      </div>

      {/* Portal-rendered dropdown */}
      {isOpen &&
        createPortal(
          <>
            {/* Invisible backdrop for click-outside detection */}
            <div className="fixed inset-0 z-[9998]" />
            {/* Dropdown menu */}
            <div
              ref={dropdownRef}
              className="fixed z-[9999] w-36 bg-white rounded-lg shadow-lg border border-slate-200 py-1 animate-in"
              style={{
                top: position.top,
                left: position.left,
                width,
              }}
            >
              {children}
            </div>
          </>,
          document.body
        )}
    </>
  );
}
