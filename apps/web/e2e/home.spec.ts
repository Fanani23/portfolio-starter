import { expect, test } from '@playwright/test';

test.describe('home page', () => {
  test('renders the heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Portfolio Starter' })).toBeVisible();
  });

  test('shows the error state when the API is unreachable', async ({ page }) => {
    await page.route('**/examples*', (route) => route.abort('failed'));
    await page.goto('/');
    await expect(page.getByRole('status')).toHaveText(/could not load/i);
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('shows the empty state when the API returns no rows', async ({ page }) => {
    await page.route('**/examples*', (route) =>
      route.fulfill({ json: { items: [], nextCursor: null } }),
    );
    await page.goto('/');
    await expect(page.getByRole('status')).toHaveText(/no examples yet/i);
  });

  test('renders rows on success', async ({ page }) => {
    await page.route('**/examples*', (route) =>
      route.fulfill({
        json: {
          items: [
            { id: '11111111-1111-4111-8111-111111111111', name: 'alpha', createdAt: '2026-01-01T00:00:00.000Z' },
          ],
          nextCursor: null,
        },
      }),
    );
    await page.goto('/');
    await expect(page.getByRole('listitem')).toContainText('alpha');
  });

  test('debounces typing into a single request', async ({ page }) => {
    let calls = 0;
    await page.route('**/examples*', (route) => {
      calls += 1;
      return route.fulfill({ json: { items: [], nextCursor: null } });
    });
    await page.goto('/');
    await expect(page.getByRole('status')).toHaveText(/no examples yet/i);

    const before = calls;
    await page.getByLabel('Search examples').pressSequentially('alpha', { delay: 30 });
    await page.waitForTimeout(700);
    // Five keystrokes inside the debounce window must collapse into one request.
    expect(calls - before).toBe(1);
  });

  test('search input is reachable by keyboard and labelled', async ({ page }) => {
    await page.goto('/');
    const search = page.getByLabel('Search examples');
    await search.focus();
    await expect(search).toBeFocused();
  });
});
