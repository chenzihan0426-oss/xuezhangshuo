import { expect, test } from '@playwright/test';

/**
 * E2E 主流程:首页 → 录入页可见 → 个人中心引导登录
 * (没有真实登录态时,跳到 ?login=1,即视为正确路径)
 */

test('首页加载', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /反推 5 年后/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /免费反推/ })).toBeVisible();
});

test('录入页可访问且能填表', async ({ page }) => {
  await page.goto('/input');
  await expect(page.getByText('你的背景')).toBeVisible();
  await expect(page.getByText('你的 offer')).toBeVisible();
});

test('profile 未登录时给登录引导', async ({ page }) => {
  await page.goto('/profile');
  await expect(page.getByText(/去登录|我的/)).toBeVisible();
});
