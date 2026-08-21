import { Check, X } from 'lucide-react';
import { toast } from 'sonner';

type ToastContentProps = {
  message: string;
  onDismiss: () => void;
};

const toastBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: 380,
  padding: '14px 16px',
  background: '#FFFFFF',
  borderRadius: 12,
  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  fontFamily: 'IBM Plex Sans, sans-serif',
};

const iconCircle = (bg: string): React.CSSProperties => ({
  width: 24,
  height: 24,
  borderRadius: 12,
  background: bg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

const messageStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 14,
  fontWeight: 500,
  color: '#221F1C',
  lineHeight: 1.4,
};

const wrapperReset: React.CSSProperties = {
  padding: 0,
  background: 'transparent',
  border: 'none',
  borderRadius: 12,
  width: 'auto',
  maxWidth: '100%',
};

const closeBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

function renderToast(
  { message, onDismiss }: ToastContentProps,
  border: string,
  iconBg: string,
  Icon: typeof Check | typeof X,
) {
  return (
    <div style={{ ...toastBase, border }}>
      <div style={iconCircle(iconBg)}>
        <Icon size={14} color='#FFFFFF' />
      </div>
      <span style={messageStyle}>{message}</span>
      <button type='button' onClick={onDismiss} style={closeBtn}>
        <X size={16} color='#746B5E' />
      </button>
    </div>
  );
}

export function toastSuccess(message: string) {
  toast.custom(
    (id: number | string) =>
      renderToast(
        { message, onDismiss: () => toast.dismiss(id) },
        '#B9AFA0',
        '#2F7A3D',
        Check,
      ),
    { duration: 5000, style: wrapperReset },
  );
}

export function toastError(message: string) {
  toast.custom(
    (id: number | string) =>
      renderToast(
        { message, onDismiss: () => toast.dismiss(id) },
        'none',
        '#9B2531',
        X,
      ),
    { duration: 5000, style: wrapperReset },
  );
}
