import { expect, test } from './support/backend'

test('opens a received handover and asks the sourced AI', async ({ page }) => {
  await page.goto('/handovers/received')
  await page.getByRole('button', { name: /최서윤님에게 받은 인수인계/ }).click()
  await expect(page).toHaveURL(/\/handovers\/handover-moastore-operations$/)

  await page.goto('/handovers/handover-moastore-operations/arrival')
  await expect(page.getByText('가을 할인전 내부 미팅')).toBeVisible()
  await page.getByRole('button', { name: /먼저 할 일 확인하기/ }).click()
  await page.getByRole('button', { name: /전체 문서 보기/ }).click()
  await expect(page.getByRole('heading', { name: '업무 인수인계' })).toBeVisible()

  await page.getByRole('button', { name: 'AI에게 질문' }).click()
  await page.getByRole('button', { name: '배송 답변이 늦으면 누구에게 물어봐요?' }).click()
  await expect(page.getByText('문제 상황 대응 방법 · 할 일 목록')).toBeVisible()
})
