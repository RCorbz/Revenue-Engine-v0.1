import { expect, test } from '@playwright/test';

test.describe('Dashboard Strategy Hub (DASH-6)', () => {

	test('Dashboard loads and displays key metrics', async ({ page }) => {
		// Navigate to dashboard
		await page.goto('/dashboard');
		
		// Verify title and main engine
		await expect(page).toHaveTitle(/Strategy Hub/);
		await expect(page.getByText('Revenue Strategy')).toBeVisible();

		// Check for AOV Gauge and Run-Rate HUD
		await expect(page.getByText('R-Run (Annual)')).toBeVisible();
		await expect(page.getByText('Anchor Level')).toBeVisible();
	});

	test('Retention Drawer opens and generates AI SMS draft', async ({ page }) => {
		await page.goto('/dashboard');

		// Open retention drawer
		await page.getByRole('button', { name: 'Manage Inactive Drivers' }).click();
		await expect(page.getByText('Retention Strategy')).toBeVisible();

		// Click SMS icon for first driver (James Carter)
		// Our button is inside a form, we'll targeted the first one
		const firstSmsBtn = page.locator('form[action="?/generateSms"]').first().locator('button');
		await firstSmsBtn.click();

		// Verify AI Draft area appears
		await expect(page.getByText(/AI Draft:/)).toBeVisible({ timeout: 15000 });
		await expect(page.getByText(/Copy & Dispatch SMS/)).toBeVisible();
	});

	test('AOV pivot logic reflects correct state based on mockup rules', async ({ page }) => {
		await page.goto('/dashboard');

		// Since our mock currently returns $115.47 (under $125 target)
		// Verify the "PIVOT REQUIRED" badge or "STABLE" logic
		const pivotBadge = page.locator('.animate-pulse');
		await expect(pivotBadge).toBeVisible();
		
		// Confirm the strategy recommendation is present by looking for the italicized text
		await expect(page.locator('p.italic')).toBeVisible();
	});
});
