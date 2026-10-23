import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface IsolatedPrintPortalProps {
  children: React.ReactNode;
  pageSize?: string;
  pageMargin?: string;
  isThermal?: boolean;
}

// Keep a stack of mounted portal elements so the top-most one (e.g. a modal over a view) is active
const portalStack: HTMLElement[] = [];

function syncActivePortalState() {
  if (typeof document === 'undefined') return;

  portalStack.forEach((el, idx) => {
    const isTop = idx === portalStack.length - 1;
    if (isTop) {
      el.setAttribute('data-active-print-portal', 'true');
      const isThermal = el.getAttribute('data-thermal-portal') === 'true';
      if (isThermal) {
        document.body.setAttribute('data-thermal', 'true');
      } else {
        document.body.removeAttribute('data-thermal');
      }
    } else {
      el.removeAttribute('data-active-print-portal');
    }
  });

  if (portalStack.length > 0) {
    document.body.classList.add('has-isolated-print-target');
  } else {
    document.body.classList.remove('has-isolated-print-target');
    document.body.removeAttribute('data-thermal');
  }
}

export const IsolatedPrintPortal: React.FC<IsolatedPrintPortalProps> = ({
  children,
  pageSize = 'A4 portrait',
  pageMargin = '6mm 8mm',
  isThermal = false,
}) => {
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const el = document.createElement('div');
    el.setAttribute('data-isolated-print-portal', 'true');
    el.setAttribute('data-thermal-portal', isThermal ? 'true' : 'false');
    document.body.appendChild(el);

    portalStack.push(el);
    syncActivePortalState();
    setPortalEl(el);

    return () => {
      const idx = portalStack.indexOf(el);
      if (idx !== -1) {
        portalStack.splice(idx, 1);
      }
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
      syncActivePortalState();
    };
  }, []);

  useEffect(() => {
    if (!portalEl) return;
    portalEl.setAttribute('data-thermal-portal', isThermal ? 'true' : 'false');
    syncActivePortalState();
  }, [portalEl, isThermal]);

  if (!portalEl) return null;

  return createPortal(
    <>
      <style>{`
        @media print {
          @page {
            size: ${pageSize} !important;
            margin: ${pageMargin} !important;
          }
        }
      `}</style>
      <div className="isolated-print-content w-full bg-white text-slate-900">
        {children}
      </div>
    </>,
    portalEl
  );
};
