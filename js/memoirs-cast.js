(() => {
	'use strict';

	/**
	 * Memoirs of Amorous Gentlemen
	 * Cast Module
	 *
	 * Requires:
	 * memoirs-core.js
	 */

	// Prevent duplicate initialization.
	if (window.MemoirsCast?.initialized) {
		return;
	}

	const Cast = {

		initialized: false,

		config: {
			sheetName: 'Cast'
		},

		/**
		 * Initialize Cast module.
		 */
		async init() {

			if (!window.Memoirs) {
				console.error('[Memoirs Cast] Core is not available.');
				return;
			}

			this.initialized = true;

			try {

				const rows = await Memoirs.getSheet(this.config.sheetName);

				const cast = this.parseRows(rows);

				console.log('[Memoirs Cast] Cast data:', cast);

			} catch (error) {

				console.error(
					'[Memoirs Cast] Unable to load Cast data.',
					error
				);

			}

		},

		/**
		 * Convert Google Sheet rows into Cast objects.
		 */
		parseRows(rows) {

			if (!Array.isArray(rows) || rows.length < 2) {
				return [];
			}

			const headers = rows[0].map(header =>
				String(header)
					.trim()
					.toLowerCase()
					.replace(/\s+/g, '_')
					.replace(/[()]/g, '')
			);

			return rows
				.slice(1)
				.filter(row => row.some(cell => String(cell).trim()))
				.map(row => {

					const item = {};

					headers.forEach((header, index) => {
						item[header] = row[index] ?? '';
					});

					return item;

				});

		}

	};

	window.MemoirsCast = Cast;

	// Initialize after DOM is available.
	if (document.readyState === 'loading') {

		document.addEventListener(
			'DOMContentLoaded',
			() => Cast.init(),
			{ once: true }
		);

	} else {

		Cast.init();

	}

})();