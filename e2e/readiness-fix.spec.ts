import { expect, test } from './support/backend'

test('fixes every item at once and submits without the readiness warning', async ({ page }) => {
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
  await expect(panel).toContainText('확인할 항목 3개')
  await panel.getByRole('button', { name: '확인할 항목 3개 AI로 보완하기' }).click()

  // 자료끼리 다른 담당자는 사람이 골라야 한다. 나머지 두 항목은 자료로 채운다.
  const dialog = page.getByRole('dialog', { name: '항목 3개 보완' })
  const contacts = dialog.getByRole('region', { name: '담당자 질문' })
  await expect(contacts).toContainText('맞는 값을 골라야')
  await contacts.getByText('윤예린 · 마케팅팀').click()
  await dialog.getByRole('button', { name: /AI로 수정안 만들기/ }).click()

  await expect(dialog).toContainText('항목 3개 중 3개의 수정안을 만들었어요')
  await expect(dialog.getByRole('region', { name: '업무 기준과 예외 수정 후' })).toContainText('환불 오류는 고객지원팀 윤예린님에게 넘깁니다.')
  await expect(dialog.getByRole('region', { name: '주요 관계자 수정 후' })).toContainText('윤예린')
  await dialog.getByRole('button', { name: '문서에 적용' }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByLabel('업무 기준 2 내용 편집')).toHaveText('환불 오류는 고객지원팀 윤예린님에게 넘깁니다.')
  await expect(page.getByRole('status').filter({ hasText: '확인할 항목 3개 → 0개' })).toBeVisible()
  await expect(panel).toContainText('모든 영역이 충분해요')

  // 인수인계 가능 등급이고 점검도 최신이라 확인 없이 전달된다.
  await page.getByRole('button', { name: '제출하기' }).click()
  await expect(page).toHaveURL(/\/handovers\/new\/complete$/)
})
