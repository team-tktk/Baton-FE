import { expect, test } from '@playwright/test'

test('creates, confirms, and delivers a handover', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /인수인계 하기/ }).click()
  await expect(page).toHaveURL(/\/handovers\/new\/setup$/)

  await page.getByRole('button', { name: '정하늘 선택 해제' }).click()
  await page.getByRole('button', { name: /업무 자료 올리기/ }).click()
  await expect(page.getByRole('status')).toContainText('받는 사람과 업무를 한 개 이상')
  await page.getByRole('combobox', { name: '이름 또는 팀 검색' }).click()
  await page.getByRole('option', { name: /정하늘/ }).click()
  await page.getByRole('button', { name: /업무 자료 올리기/ }).click()
  await expect(page).toHaveURL(/\/handovers\/new\/upload$/)

  await page.getByLabel('가을_할인전_준비_메모.docx 삭제').click()
  await page.locator('input[type="file"]').setInputFiles({ name: '새_운영_메모.pdf', mimeType: 'application/pdf', buffer: Buffer.from('mock') })
  await expect(page.getByText('새_운영_메모.pdf')).toBeVisible()
  await page.getByRole('button', { name: /인수인계 초안 만들기/ }).click()
  await expect(page).toHaveURL(/\/handovers\/new\/interview\/1$/, { timeout: 10_000 })

  await page.getByRole('radio', { name: /주문·쿠폰 오류/ }).click()
  await page.getByRole('button', { name: /다음 질문/ }).click()
  await page.getByRole('radio', { name: /진행 중인 행사 확인/ }).click()
  await page.getByRole('button', { name: /다음 질문/ }).click()
  await page.getByRole('radio', { name: /쿠폰 변경 전 팀장 확인/ }).click()
  await page.getByRole('button', { name: /답변 반영하고 초안 보기/ }).click()

  await expect(page.getByRole('button', { name: 'Markdown 복사' })).toBeVisible()
  await page.getByRole('button', { name: '마케팅 담당자 확인 후 운영 팀장 마지막 확인' }).click()
  await page.getByRole('button', { name: '오늘 오후 3시' }).click()
  await page.getByRole('button', { name: '화요일' }).click()
  await page.getByRole('button', { name: '인수인계 전달하기' }).click()
  await expect(page).toHaveURL(/\/handovers\/new\/complete$/)
  await expect(page.getByRole('heading', { name: /정하늘님에게/ })).toBeVisible()
})
