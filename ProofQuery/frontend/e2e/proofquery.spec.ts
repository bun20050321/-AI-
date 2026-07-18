import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const sampleCsv = fileURLToPath(
  new URL('../../sample-data/sales.csv', import.meta.url),
)

test('upload, analyze, chart, and inspect evidence', async ({ page }, testInfo) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.goto('/')
  await page.getByLabel('选择 CSV 文件').setInputFiles(sampleCsv)
  await expect(page.getByText('6 行')).toBeVisible()
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('tab', { name: '分析' }).click()
  }

  await page.getByRole('textbox', { name: '分析问题' }).fill('按地区比较收入')
  await page.getByRole('button', { name: '发送问题' }).click()

  await expect(page.getByText('已验证')).toBeVisible()
  await expect(page.getByText('East revenue was 300.')).toBeVisible()
  await expect(page.getByRole('img', { name: /Revenue by region/ })).toBeVisible()
  await page.getByRole('button', { name: '查看证据' }).click()

  await expect(page.getByRole('heading', { name: '验证查询' })).toBeVisible()
  await expect(page.getByText(/where region = 'East'/i)).toBeVisible()

  if (testInfo.project.name === 'mobile') {
    await expect(page.getByRole('tab', { name: '证据' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  }
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(hasOverflow).toBe(false)
  expect(consoleErrors).toEqual([])
})
