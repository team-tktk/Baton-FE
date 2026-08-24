import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-white">
      <p className="text-sm font-semibold text-indigo-300">404</p>
      <h1 className="text-3xl font-bold">페이지를 찾을 수 없습니다.</h1>
      <Link className="text-slate-300 underline underline-offset-4" to="/">
        대시보드로 돌아가기
      </Link>
    </main>
  )
}
