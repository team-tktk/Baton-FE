import { expect, test } from './support/backend'

test('guards create routes and maps unknown paths to 404', async ({ page }) => {
  await page.goto('/handovers/new/upload')
  await expect(page).toHaveURL(/\/handovers\/new\/setup$/)
  await page.goto('/handovers/unknown/arrival')
  await expect(page).toHaveURL(/\/404$/)
  await expect(page.getByRole('heading', { name: '페이지를 찾을 수 없습니다.' })).toBeVisible()
  await page.goto('/not-a-real-route')
  await expect(page.getByRole('heading', { name: '페이지를 찾을 수 없습니다.' })).toBeVisible()
})

test('keeps the app within the viewport and the workspace columns on desktop', async ({ page, viewport }) => {
  await page.goto('/handovers/handover-moastore-operations')
  await expect(page.getByRole('heading', { name: '업무 인수인계' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport?.width ?? 1440)
  if ((viewport?.width ?? 0) >= 900) {
    const documentBox = await page.getByRole('heading', { name: '업무 인수인계' }).boundingBox()
    const chatBox = await page.getByText('인수인계 AI', { exact: true }).boundingBox()
    expect(documentBox?.x).toBeLessThan(chatBox?.x ?? 0)
  }
})

test('matches the setup flow layout and recipient interaction', async ({ page, viewport }) => {
  await page.goto('/handovers/new/setup')

  await expect(page.getByRole('button', { name: '홈으로' })).toBeVisible()
  await expect(page.getByText('1 / 5')).toBeVisible()
  await expect(page.getByRole('listbox', { name: '업무를 받는 사람 목록' })).toBeHidden()

  const recipientCombobox = page.getByRole('combobox', { name: '업무를 받는 사람 검색' })
  await recipientCombobox.click()
  await expect(page.getByRole('listbox', { name: '업무를 받는 사람 목록' })).toBeVisible()
  await expect(page.getByRole('option')).toHaveCount(8)
  await page.getByRole('option', { name: /정하늘/ }).click()

  if ((viewport?.width ?? 0) >= 1200) {
    const setupCard = await page.getByRole('region', { name: '인수인계 기본 정보' }).boundingBox()
    expect(setupCard?.width).toBeGreaterThan(1000)

    const setupHeading = page.getByRole('heading', { name: '누구에게 어떤 업무를 넘기나요?' })
    const setupHeadingStyle = await setupHeading.evaluate((element) => {
      const style = getComputedStyle(element)

      return {
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
      }
    })

    expect(setupHeadingStyle).toEqual({
      fontSize: '54px',
      fontWeight: '700',
      lineHeight: '62.64px',
    })
    await expect(page.getByRole('heading', { name: '업무를 받는 사람' })).toHaveCSS('font-weight', '700')
    await expect(page.getByRole('heading', { name: '넘길 업무' })).toHaveCSS('font-weight', '700')

    const progressbar = page.getByRole('progressbar', { name: '기본 정보 단계' })
    const trackBox = await progressbar.locator('span').boundingBox()
    const fillBox = await progressbar.locator('i').boundingBox()

    expect(trackBox?.width).toBeCloseTo(440, 0)
    expect(trackBox?.height).toBe(2)
    expect(fillBox?.width).toBeCloseTo(440 / 5, 0)

    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: '업무 자료 올리기' }).click()
    await expect(page).toHaveURL(/\/handovers\/new\/upload$/)
    const uploadHeadingSize = await page.getByRole('heading', { name: /업무 파일을 올려주세요/ }).evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))
    expect(Number.parseFloat(setupHeadingStyle.fontSize)).toBeGreaterThan(uploadHeadingSize)
    expect(uploadHeadingSize).toBeLessThanOrEqual(46)
    return
  }

  while (await page.locator('[role="option"][aria-selected="false"]').count()) {
    await page.locator('[role="option"][aria-selected="false"]').first().click()
  }
  await expect(page.getByText('8명 선택')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport?.width ?? 390)
})

test('matches the DEMO upload layout and file metadata', async ({ page, viewport }) => {
  await page.goto('/handovers/new/setup')
  await page.getByRole('combobox', { name: '업무를 받는 사람 검색' }).click()
  await page.getByRole('option', { name: /정하늘/ }).click()
  await page.getByRole('button', { name: '업무 자료 올리기' }).click()
  await expect(page).toHaveURL(/\/handovers\/new\/upload$/)

  await expect(page.getByRole('button', { name: '홈으로' })).toBeVisible()
  await expect(page.getByText('2 / 5')).toBeVisible()
  await expect(page.getByRole('link', { name: 'BATON 홈' })).toHaveCount(0)
  await expect(page.getByText('DOCX · 2.4MB')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport?.width ?? 390)

  if ((viewport?.width ?? 0) < 1200) return

  const mainBox = await page.locator('main').boundingBox()
  const uploadButton = page.getByRole('button', { name: /파일을 여기에 끌어다 놓으세요/ })
  const uploadBox = await uploadButton.boundingBox()
  const uploadIconBox = await uploadButton.locator(':scope > span').first().boundingBox()
  const uploadTitleBox = await uploadButton.locator('strong').boundingBox()
  const uploadDescriptionBox = await uploadButton.locator('small').boundingBox()
  const fileRowBox = await page.getByRole('article').first().boundingBox()
  const headingStyle = await page.getByRole('heading', { name: '최서윤님의 업무 파일을 올려주세요' }).evaluate((element) => {
    const style = getComputedStyle(element)
    return { fontSize: style.fontSize, fontWeight: style.fontWeight }
  })

  expect(mainBox?.width).toBeCloseTo(900, 0)
  expect(uploadBox?.width).toBeCloseTo(900, 0)
  expect(uploadBox?.height).toBe(190)
  expect(uploadIconBox?.width).toBe(64)
  expect(uploadIconBox?.height).toBe(64)
  expect((uploadDescriptionBox?.y ?? 0) - ((uploadTitleBox?.y ?? 0) + (uploadTitleBox?.height ?? 0))).toBeCloseTo(8, 0)
  expect(Math.abs((fileRowBox?.height ?? 0) - 66)).toBeLessThanOrEqual(2)
  expect(headingStyle).toEqual({ fontSize: '42px', fontWeight: '700' })
})
