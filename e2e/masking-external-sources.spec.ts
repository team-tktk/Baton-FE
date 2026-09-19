import { expect, test } from './support/backend'

test('reviews a web link for sensitive data before analysis even without files', async ({ page }) => {
  await page.goto('/handovers/new/setup')
  await page.getByRole('combobox', { name: '업무를 받는 사람 검색' }).click()
  await page.getByRole('option', { name: /정하늘/ }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('textbox', { name: '1번 업무' }).fill('프로모션 운영')
  await page.getByRole('button', { name: /업무 자료 올리기/ }).click()
  await expect(page).toHaveURL(/\/handovers\/new\/upload$/)

  // 파일 없이 웹 링크만 둔다. 마스킹이 켜진 서버처럼 링크는 민감정보 확인을 기다린다.
  await page.getByLabel('가을_할인전_준비_메모.docx 삭제').click()
  const collector = page.getByRole('region', { name: '외부 업무 자료' })
  await collector.getByLabel('URL').fill('https://wiki.example.com/settlement')
  await collector.getByLabel(/제목/).fill('정산 위키')
  await collector.getByLabel(/설명/).fill('매월 15일 정산 등록 상태를 점검한다.')
  await collector.getByRole('button', { name: '링크 추가' }).click()
  // 좁은 화면은 상태 배지를 숨기므로 존재만 확인한다.
  await expect(collector.getByText('민감정보 확인 필요')).toHaveCount(1)

  await page.getByRole('button', { name: /민감정보 확인하기/ }).click()
  await expect(page).toHaveURL(/\/handovers\/new\/masking$/)
  // 찾은 민감정보가 없는 외부 자료는 한 건씩이 아니라 묶어서 보여 준다.
  const bundle = page.getByRole('region', { name: '민감정보를 찾지 못한 자료' })
  await expect(bundle).toContainText('정산 위키')
  await bundle.getByText('정산 위키').click()
  await expect(bundle).toContainText('매월 15일 정산 등록 상태를 점검한다.')

  await page.getByRole('button', { name: '확정하고 AI 분석 시작' }).click()
  await expect(page.getByRole('dialog', { name: '민감정보 검수를 확정할까요?' })).toContainText('자료 1개')
  await page.getByRole('button', { name: '확정하고 분석 시작' }).click()
  await expect(page).toHaveURL(/\/handovers\/new\/interview\/1$/, { timeout: 10_000 })
})
