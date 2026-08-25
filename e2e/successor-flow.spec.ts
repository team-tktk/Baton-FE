import { expect, test } from '@playwright/test'

test('opens a received handover and asks the sourced AI', async ({ page }) => {
  await page.goto('/handovers/received')
  await page.getByRole('button', { name: '최서윤님의 인수인계 열기' }).click()
  await expect(page.getByText('가을 할인전 내부 미팅')).toBeVisible()
  await page.getByRole('button', { name: /먼저 할 일 확인하기/ }).click()
  await page.getByRole('button', { name: /전체 문서 보기/ }).click()
  await expect(page.getByRole('heading', { name: '업무 인수인계' })).toBeVisible()
  await page.getByRole('button', { name: '배송이 늦어지면 누구에게 알려야 하나요?' }).click()
  await expect(page.getByText('문제 상황 대응 방법 · 할 일 목록')).toBeVisible()
})
