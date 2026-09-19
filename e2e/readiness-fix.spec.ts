import { expect, test } from './support/backend'

test('fixes a weak area with AI and submits without the readiness warning', async ({ page }) => {
  await page.goto('/handovers/new/setup')
  await page.getByRole('combobox', { name: '업무를 받는 사람 검색' }).click()
  await page.getByRole('option', { name: /정하늘/ }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('textbox', { name: '1번 업무' }).fill('프로모션 운영')
  await page.getByRole('button', { name: /업무 자료 올리기/ }).click()
  await expect(page).toHaveURL(/\/handovers\/new\/upload$/)
  // 업로드·검수·분석은 다른 e2e가 다룬다. 앱 안 이동으로 초안 확인 단계에 바로 들어간다.
  await page.evaluate(() => { history.pushState({}, '', '/handovers/new/document'); dispatchEvent(new PopStateEvent('popstate')) })

  const panel = page.getByRole('region', { name: '인수인계 준비도' })
  await expect(panel.getByRole('heading', { name: '중요한 확인 3건' })).toBeVisible()
  await expect(panel).toContainText('75')

  await panel.getByRole('region', { name: '중요한 확인' }).getByRole('button', { name: /예외 대응/ }).click()
  await panel.getByRole('article', { name: '예외 대응 자세히' }).getByRole('button', { name: 'AI로 보완하기' }).click()
  const dialog = page.getByRole('dialog', { name: '예외 대응 보완' })
  await expect(dialog.getByRole('region', { name: '수정 후' })).toContainText('환불 오류는 고객지원팀 윤예린님에게 넘깁니다.')
  await expect(dialog.getByText('새로 추가')).toBeVisible()
  await dialog.getByRole('button', { name: '문서에 적용' }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByLabel('업무 기준 2 내용 편집')).toHaveText('환불 오류는 고객지원팀 윤예린님에게 넘깁니다.')
  await expect(panel).toContainText('83')
  await expect(panel.getByRole('heading', { name: '중요한 확인 2건' })).toBeVisible()

  // 80점을 넘었고 평가도 최신이라 확인 없이 전달된다.
  await page.getByRole('button', { name: '제출하기' }).click()
  await expect(page).toHaveURL(/\/handovers\/new\/complete$/)
})
