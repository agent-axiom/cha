import { expect, test } from '@playwright/test'

test('switches from Sheng to Shou and keeps source navigation intact', async ({ page }) => {
  await page.goto('./')

  await expect(page.getByRole('heading', { level: 1, name: 'Две судьбы одного листа' })).toBeVisible()
  const heroImage = page.getByRole('img', {
    name: 'Старинное чайное дерево над туманными горными склонами Юньнани',
  })
  await expect(heroImage).toBeVisible()
  await expect.poll(() => heroImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)

  const shou = page.getByRole('button', { name: 'Шу водуй · влажное кучевание' })
  await shou.click()
  await expect(shou).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.app')).toHaveAttribute('data-tea', 'shou')
  await expect(page.locator('.process-path')).toHaveCount(2)
  await expect(page.locator('.process-path--sheng')).toBeAttached()
  await expect(page.locator('.process-path--shou')).toHaveAttribute('data-highlighted', 'true')

  await page.getByRole('link', { name: 'Медицина', exact: true }).click()
  await expect(page).toHaveURL(/#medicine$/)
  await expect(page.getByRole('heading', { level: 2, name: 'Что изучают — и чего ещё не знают' })).toBeVisible()
})

test('supports keyboard entry and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')

  await page.locator('body').press('Tab')
  const skipLink = page.getByRole('link', { name: 'Перейти к основному содержанию' })
  await expect(skipLink).toBeFocused()
  await expect(skipLink).toBeVisible()
  const animationDuration = await page
    .locator('.hero__image')
    .evaluate((image) => Number.parseFloat(getComputedStyle(image).animationDuration))
  expect(animationDuration).toBeLessThanOrEqual(0.001)
})

test('fits a narrow screen without document-level horizontal movement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')

  const geometry = await page.evaluate(() => {
    window.scrollTo(1000, 0)
    const title = document.querySelector('.hero h1') as HTMLElement
    return {
      scrollX: window.scrollX,
      titleLeft: title.getBoundingClientRect().left,
      titleRight: title.getBoundingClientRect().right,
      viewport: document.documentElement.clientWidth,
    }
  })

  expect(geometry.scrollX).toBe(0)
  expect(geometry.titleLeft).toBeGreaterThanOrEqual(0)
  expect(geometry.titleRight).toBeLessThanOrEqual(geometry.viewport)
  await expect(page.getByRole('button', { name: 'Шэн сырой · меняется медленно' })).toBeVisible()

  const contents = page.getByRole('button', { name: 'Содержание' })
  await expect(contents).toBeVisible()
  const contentsBox = await contents.boundingBox()
  expect(contentsBox?.width).toBeGreaterThanOrEqual(24)
  expect(contentsBox?.height).toBeGreaterThanOrEqual(24)
  await contents.click()
  await expect(contents).toHaveAttribute('aria-expanded', 'true')
  const navigation = page.getByRole('navigation', { name: 'Разделы' })
  await expect(navigation).toBeVisible()
  const medicine = navigation.getByRole('link', { name: 'Медицина', exact: true })
  await expect(medicine).toBeVisible()
  await medicine.click()
  await expect(page).toHaveURL(/#medicine$/)
  await expect(contents).toHaveAttribute('aria-expanded', 'false')
})
