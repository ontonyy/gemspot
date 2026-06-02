import { Icon, Ic } from './Icon'

/* transient confirmation toast (ink bg, fresh tick). Caller controls mount. */
export function Toast({ message }: { message: string }) {
  return (
    <div className="fg-toast" role="status">
      <span className="fg-toast-tick"><Icon d={Ic.check} size={12} sw={2.4} /></span>
      {message}
    </div>
  )
}
