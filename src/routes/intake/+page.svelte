<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	export let form: ActionData;
</script>

<svelte:head>
	<title>Driver Intake | Revenue Engine</title>
</svelte:head>

<div class="container">
	<div class="card">
		<h1>Driver Intake</h1>
		<p class="subtitle">Securely register driver identifiers (OBT-20 Compliant)</p>

		<form method="POST" use:enhance>
			<div class="input-group">
				<label for="ssn">Social Security Number</label>
				<input type="password" id="ssn" name="ssn" placeholder="000-00-0000" required />
			</div>

			<div class="input-group">
				<label for="dob">Date of Birth</label>
				<input type="date" id="dob" name="dob" required />
			</div>

			<div class="input-group">
				<label for="licenseNumber">Driver's License Number</label>
				<input
					type="text"
					id="licenseNumber"
					name="licenseNumber"
					placeholder="DL-123456"
					required
				/>
			</div>

			<button type="submit">Submit Securely</button>
		</form>

		{#if form?.success}
			<div class="alert success">
				Registration Successful! Record ID: <code>{form.id}</code>
			</div>
		{/if}

		{#if form?.error}
			<div class="alert error">
				{form.message}
			</div>
		{/if}

		{#if form?.missing}
			<div class="alert error">All fields are required for secure registration.</div>
		{/if}
	</div>
</div>

<style>
	/* Premium Styling */
	:global(body) {
		background: radial-gradient(circle at top left, #0f172a, #1fbde1);
		background-attachment: fixed;
		color: #f8fafc;
		font-family: 'Outfit', 'Inter', sans-serif;
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		margin: 0;
	}

	.container {
		width: 100%;
		max-width: 480px;
		padding: 2rem;
		animation: fadeIn 0.6s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.card {
		background: rgba(255, 255, 255, 0.03);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 24px;
		padding: 3rem;
		box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.4);
	}

	h1 {
		margin: 0;
		font-size: 2rem;
		font-weight: 700;
		color: #fff;
		text-align: center;
		letter-spacing: -0.025em;
	}

	.subtitle {
		text-align: center;
		color: #94a3b8;
		font-size: 0.95rem;
		margin-top: 0.5rem;
		margin-bottom: 2.5rem;
	}

	.input-group {
		margin-bottom: 2rem;
	}

	label {
		display: block;
		margin-bottom: 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #cbd5e1;
		transition: color 0.2s ease;
	}

	input {
		width: 100%;
		padding: 1rem 1.25rem;
		background: rgba(15, 23, 42, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		color: #fff;
		font-size: 1rem;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-sizing: border-box;
	}

	input:focus {
		outline: none;
		border-color: #38bdf8;
		background: rgba(15, 23, 42, 0.8);
		box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.15);
		transform: scale(1.01);
	}

	button {
		width: 100%;
		padding: 1.125rem;
		background: linear-gradient(135deg, #0ea5e9, #2563eb);
		color: #fff;
		border: none;
		border-radius: 12px;
		font-weight: 700;
		font-size: 1.1rem;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		margin-top: 1rem;
		box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
	}

	button:hover {
		transform: translateY(-3px);
		box-shadow: 0 20px 25px -5px rgba(37, 99, 235, 0.4);
		filter: brightness(1.1);
	}

	button:active {
		transform: translateY(0);
	}

	.alert {
		margin-top: 2rem;
		padding: 1.25rem;
		border-radius: 16px;
		font-size: 0.95rem;
		text-align: center;
		animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	@keyframes scaleIn {
		from {
			opacity: 0;
			transform: scale(0.9);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.success {
		background: rgba(16, 185, 129, 0.1);
		color: #10b981;
		border: 1px solid rgba(16, 185, 129, 0.2);
	}

	.error {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		border: 1px solid rgba(239, 68, 68, 0.2);
	}

	code {
		background: rgba(0, 0, 0, 0.3);
		padding: 0.2rem 0.4rem;
		border-radius: 4px;
		font-family: monospace;
	}
</style>
