import { useToastStore } from '../../stores/toastStore'
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
}

const colorMap = {
  success: 'var(--color-success)',
  error: 'var(--color-danger)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)'
}

export default function Toast(): JSX.Element {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return <></>

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type]
        return (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <Icon size={18} color={colorMap[toast.type]} />
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
