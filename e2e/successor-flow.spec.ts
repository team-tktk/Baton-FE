import { expect, test } from './support/backend'

test('opens a received handover and asks the sourced AI', async ({ page }) => {
  await page.goto('/handovers/received')
  await page.getByRole('button', { name: /최서윤님에게 받은 인수인계/ }).click()
  await expect(page).toHaveURL(/\/handovers\/[0-9a-f-]{36}$/)

  await page.goto('/handovers/00000000-0000-0000-0000-0000000000bb/arrival')
  await expect(page.getByText('주문·배송 이상 확인')).toBeVisible()
  await page.getByRole('button', { name: /먼저 할 일 확인하기/ }).click()
  await page.getByRole('button', { name: /전체 문서 보기/ }).click()
  await expect(page.getByRole('heading', { name: '프로모션 운영' })).toBeVisible()

  await page.getByRole('button', { name: 'AI에게 질문' }).click()
  await page.getByRole('button', { name: '배송 답변이 늦으면 누구에게 물어봐요?' }).click()
  await expect(page.getByText('문제 상황 대응 방법 · 할 일 목록')).toBeVisible()
})
