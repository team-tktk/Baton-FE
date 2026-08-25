import { expect, test } from '@playwright/test'

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
