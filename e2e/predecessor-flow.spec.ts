import { expect, test } from './support/backend'

test('creates, confirms, and delivers a handover', async ({ isMobile, page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /인수인계 하기/ }).click()
  await expect(page).toHaveURL(/\/handovers\/new\/setup$/)

  await page.getByRole('button', { name: /업무 자료 올리기/ }).click()
  await expect(page.getByRole('status')).toContainText('받는 사람과 업무를 한 개 이상')
  await page.getByRole('combobox', { name: '업무를 받는 사람 검색' }).click()
  await page.getByRole('option', { name: /정하늘/ }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('combobox', { name: '검토하는 사람 검색' }).click()
  await page.getByRole('option', { name: /이도현/ }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('textbox', { name: '1번 업무' }).fill('프로모션 운영')
  await page.getByRole('button', { name: /업무 자료 올리기/ }).click()
  await expect(page).toHaveURL(/\/handovers\/new\/upload$/)

  await page.getByLabel('가을_할인전_준비_메모.docx 삭제').click()
  await page.locator('input[type="file"]').setInputFiles({ name: '새_운영_메모.pdf', mimeType: 'application/pdf', buffer: Buffer.from('mock') })
  await expect(page.getByText('새_운영_메모.pdf')).toBeVisible()
  // 좁은 화면은 상태 배지를 숨기므로 존재만 확인한다.
  await expect(page.getByText('민감정보 확인 필요')).toHaveCount(1)
  await page.getByRole('button', { name: /민감정보 확인하기/ }).click()
  await expect(page).toHaveURL(/\/handovers\/new\/masking$/)

  // 확인이 필요한 계좌번호를 체크해야 확정할 수 있다.
  await expect(page.locator('[aria-current="step"]')).toContainText('민감정보 확인')
  await expect(page.getByRole('region', { name: '새_운영_메모.pdf 추출 텍스트' })).toContainText('min***@example.com')
  const confirm = page.getByRole('button', { name: '확정하고 AI 분석 시작' })
  await expect(confirm).toBeDisabled()
  await page.getByRole('checkbox', { name: '계좌번호 110-***-***789 가리기' }).check()
  await expect(confirm).toBeEnabled()

  // 자동으로 못 찾은 "지급 계좌"를 직접 가린다.
  // 데스크톱은 실제 마우스로 드래그하고, 휴대폰은 길게 눌러 고른 결과처럼 선택 영역만 만든다.
  const region = page.getByRole('region', { name: '새_운영_메모.pdf 추출 텍스트' })
  const drag = await region.evaluate((root, selectOnly) => {
    const node = root.querySelectorAll('[data-text-segment]')[1].firstChild!
    const range = document.createRange()
    range.setStart(node, 1)
    range.setEnd(node, 6)
    if (selectOnly) {
      window.getSelection()!.removeAllRanges()
      window.getSelection()!.addRange(range)
      return null
    }
    const rects = range.getClientRects()
    const first = rects[0]
    const last = rects[rects.length - 1]
    return { from: first.left + 1, to: last.right - 1, y: first.top + first.height / 2 }
  }, isMobile)
  if (drag) {
    await page.mouse.move(drag.from, drag.y)
    await page.mouse.down()
    await page.mouse.move(drag.to, drag.y, { steps: 5 })
    await page.mouse.up()
  }
  await page.getByRole('button', { name: '이 부분 가리기' }).click()
  await expect(page.getByText('직접 추가')).toBeVisible()
  await expect(region.getByRole('button', { name: /^직접 마스킹 지\*\*\*, 가림$/ })).toBeVisible()

  await confirm.click()
  await expect(page.getByRole('dialog', { name: '민감정보 검수를 확정할까요?' })).toContainText('가려질 항목 3개')
  await page.getByRole('button', { name: '확정하고 분석 시작' }).click()
  await expect(page).toHaveURL(/\/handovers\/new\/interview\/1$/, { timeout: 10_000 })

  await page.getByRole('radio', { name: /주문·쿠폰 오류/ }).click()
  await page.getByRole('button', { name: /다음 질문/ }).click()
  await page.getByRole('radio', { name: /진행 중인 행사 확인/ }).click()
  await page.getByRole('button', { name: /다음 질문/ }).click()
  await page.getByRole('radio', { name: /쿠폰 변경 전 팀장 확인/ }).click()
  await page.getByRole('button', { name: /답변 반영하고 초안 보기/ }).click()

  await expect(page.getByRole('button', { name: 'Markdown 복사' })).toBeVisible()
  // 서버가 만든 초안이 그대로 보여야 한다.
  await expect(page.getByText('가을 정기 할인전 준비')).toBeVisible()
  await expect(page.getByText('주간 주문 현황 정리')).toBeVisible()
  // 처음 들어오면 바로 준비도를 점검한다. 점수 대신 확인할 항목을 보여 주고, 아직 준비가 덜 돼 제출 전에 한 번 확인받는다.
  const readiness = page.getByRole('region', { name: '인수인계 준비도' })
  await expect(readiness).toContainText('확인할 항목 3개')
  await expect(readiness).not.toContainText('75')
  await page.getByRole('button', { name: '제출하기' }).click()
  await expect(page.getByRole('dialog', { name: '확인할 항목 3개가 남아 있어요' })).toBeVisible()
  await page.getByRole('button', { name: '그래도 제출하기' }).click()
  await expect(page).toHaveURL(/\/handovers\/new\/complete$/)
  await expect(page.getByRole('heading', { name: /정하늘님에게/ })).toBeVisible()
})
