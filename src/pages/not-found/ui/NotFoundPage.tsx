import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center text-slate-900">
      <p className="text-sm font-semibold text-blue-600">404</p>
      <h1 className="text-3xl font-bold">페이지를 찾을 수 없습니다.</h1>
      <Link className="text-slate-500 underline underline-offset-4" to="/">
        대시보드로 돌아가기
      </Link>
    </main>
  )
}
