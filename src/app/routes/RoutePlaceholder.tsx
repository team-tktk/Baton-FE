import { useLocation } from 'react-router-dom'

export function RoutePlaceholder() {
  const location = useLocation()
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-6 text-center text-slate-900">
      <div>
        <strong className="text-lg">BATON TOUCH</strong>
        <p className="mt-3 text-slate-500">{location.pathname}</p>
      </div>
    </main>
  )
}
