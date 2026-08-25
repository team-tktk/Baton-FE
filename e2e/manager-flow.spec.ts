import { expect, test } from '@playwright/test'

test('comments, approves, and sees the updated review list', async ({ page }) => {
  await page.goto('/reviews')
  await expect(page.getByRole('article')).toHaveCount(3)
  await page.getByRole('button', { name: /모아스토어 운영팀 업무 인수인계/ }).click()
  await page.getByLabel('검토 코멘트').fill('다음 행동과 담당자가 명확합니다.')
  await page.getByRole('button', { name: '코멘트 남기기' }).click()
  await expect(page.getByText('다음 행동과 담당자가 명확합니다.')).toBeVisible()
  await page.getByRole('button', { name: '승인하기' }).click()
  await expect(page.getByRole('status')).toContainText('인수인계를 승인했어요')
  await page.getByRole('button', { name: /검토 목록/ }).click()
  await expect(page.getByRole('button', { name: /모아스토어 운영팀 업무 인수인계/ })).toContainText('승인 완료')
})
